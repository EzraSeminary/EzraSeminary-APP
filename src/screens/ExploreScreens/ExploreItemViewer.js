import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import {ArrowLeft, Download, FilePdf, Presentation} from 'phosphor-react-native';
import tw from './../../../tailwind';
import {useSelector} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import {WebView} from 'react-native-webview';
import RNFS from 'react-native-fs';
import {PermissionsAndroid} from 'react-native';
import Toast from 'react-native-toast-message';
import Share from 'react-native-share';
import ProgressBar from '../../components/ProgressBar';
import AndroidStatusBarSpacer from '../../components/AndroidStatusBarSpacer';

const ExploreItemViewer = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {item} = route.params;
  const darkMode = useSelector(state => state.ui.darkMode);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const downloadInProgressRef = useRef(false);
  const webViewRef = useRef(null);
  const loadTimeoutRef = useRef(null);

  // Reset state when item changes
  useEffect(() => {
    downloadInProgressRef.current = false;
    setIsDownloading(false);
    setDownloadProgress(0);
    setLoading(true);

    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // Set a timeout to hide loading if it takes too long
    loadTimeoutRef.current = setTimeout(() => {
      setLoading(false);
    }, 20000); // 20 seconds

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [item._id]);

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // For Android 10+ (API 29+), we might not need WRITE_EXTERNAL_STORAGE
        const androidVersion = Platform.Version;
        if (androidVersion >= 29) {
          // Android 10+ uses scoped storage, we can use app's directory
          return true;
        }
        
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to storage to download files',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else {
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleDownload = async () => {
    // Prevent multiple simultaneous downloads
    if (downloadInProgressRef.current || isDownloading) {
      return;
    }

    if (!item.fileUrl) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'File URL not available',
      });
      return;
    }

    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Toast.show({
        type: 'error',
        text1: 'Permission Denied',
        text2: 'Storage permission is required to download files',
      });
      return;
    }

    downloadInProgressRef.current = true;
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const fileName = item.fileName || `file.${item.fileType || 'pdf'}`;
      
      let downloadPath;
      if (Platform.OS === 'ios') {
        // iOS: Download to a temporary file, then hand off to the Files save sheet.
        downloadPath = `${RNFS.TemporaryDirectoryPath}${fileName}`;
      } else {
        // Android: Use Downloads directory or fallback to app directory
        const androidVersion = Platform.Version;
        if (androidVersion >= 29) {
          // Android 10+: Use app's external directory
          downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
        } else {
          // Android < 10: Use Downloads folder
          downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
        }
      }

      // Ensure directory exists
      const dirPath = downloadPath.substring(0, downloadPath.lastIndexOf('/'));
      const dirExists = await RNFS.exists(dirPath);
      if (!dirExists) {
        await RNFS.mkdir(dirPath);
      }

      const downloadResult = await RNFS.downloadFile({
        fromUrl: item.fileUrl,
        toFile: downloadPath,
        progress: res => {
          const totalBytes = Number(res.contentLength) || 0;
          const progress =
            totalBytes > 0 ? res.bytesWritten / totalBytes : 0;
          setDownloadProgress(progress);
          console.log(`Download progress: ${(progress * 100).toFixed(2)}%`);
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        const fileExists = await RNFS.exists(downloadPath);
        const fileStats = fileExists ? await RNFS.stat(downloadPath) : null;
        const hasDownloadedFile = fileExists && Number(fileStats?.size || 0) > 0;

        if (!hasDownloadedFile) {
          throw new Error('The file could not be saved to your device.');
        }

        setDownloadProgress(1);

        if (Platform.OS === 'ios') {
          const mimeType =
            item.fileType === 'pdf'
              ? 'application/pdf'
              : item.fileType === 'ppt'
              ? 'application/vnd.ms-powerpoint'
              : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          const shareResult = await Share.open({
            url: `file://${downloadPath}`,
            type: mimeType,
            saveToFiles: true,
            failOnCancel: false,
            title: item.title || fileName,
          });

          const wasDismissed = Boolean(
            shareResult?.dismissedAction || shareResult?.success === false,
          );

          if (wasDismissed) {
            try {
              await RNFS.unlink(downloadPath);
            } catch (cleanupError) {
              console.warn(
                'Failed to remove temporary iOS download file after cancel:',
                cleanupError,
              );
            }
            Toast.show({
              type: 'info',
              text1: 'Save Cancelled',
              text2: 'The file was downloaded temporarily but not saved to Files.',
            });
            return;
          }

          Toast.show({
            type: 'success',
            text1: 'Download Complete',
            text2: 'File saved using the Files save sheet.',
          });

          try {
            await RNFS.unlink(downloadPath);
          } catch (cleanupError) {
            console.warn('Failed to remove temporary iOS download file:', cleanupError);
          }
        } else {
          Toast.show({
            type: 'success',
            text1: 'Download Complete',
            text2: 'File saved to Downloads',
          });
        }
      } else {
        throw new Error(`Download failed with status: ${downloadResult.statusCode}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: error.message || 'Unable to download file',
      });
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadProgress(0), 400);
      downloadInProgressRef.current = false;
    }
  };

  const getFileIcon = () => {
    if (item.fileType === 'pdf') {
      return <FilePdf size={48} color="#EA9215" weight="bold" />;
    } else if (item.fileType === 'ppt' || item.fileType === 'pptx') {
      return <Presentation size={48} color="#EA9215" weight="bold" />;
    }
    return <FilePdf size={48} color="#EA9215" weight="bold" />;
  };

  const renderContent = () => {
    if (item.fileType === 'pdf') {
      // Use Google Docs Viewer for reliable PDF viewing on Android
      const pdfUrl = item.fileUrl;
      const viewerUrl = Platform.OS === 'android'
        ? `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(pdfUrl)}`
        : pdfUrl;

      return (
        <WebView
          ref={webViewRef}
          source={{uri: viewerUrl}}
          style={{flex: 1}}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => {
            setLoading(false);
            if (loadTimeoutRef.current) {
              clearTimeout(loadTimeoutRef.current);
            }
          }}
          onError={syntheticEvent => {
            setLoading(false);
            if (loadTimeoutRef.current) {
              clearTimeout(loadTimeoutRef.current);
            }
            const {nativeEvent} = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
            Alert.alert(
              'Error',
              'Unable to load PDF. You can download it instead.',
              [
                {text: 'OK'},
                {
                  text: 'Download',
                  onPress: handleDownload,
                },
              ],
            );
          }}
          // Prevent automatic downloads
          setSupportMultipleWindows={false}
          // Enable zoom and scrolling
          scalesPageToFit={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          showsHorizontalScrollIndicator={true}
          showsVerticalScrollIndicator={true}
          // Android specific props
          androidHardwareAccelerationDisabled={false}
          mixedContentMode="always"
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          originWhitelist={['*']}
          // Prevent new window opening
          onShouldStartLoadWithRequest={(request) => {
            // Allow the viewer and PDF URLs
            if (request.url.includes('docs.google.com/viewer') || 
                request.url === pdfUrl || 
                request.url === viewerUrl ||
                request.url.includes(pdfUrl)) {
              return true;
            }
            // Block downloads
            if (request.url.includes('download')) {
              console.log('Blocked download:', request.url);
              return false;
            }
            return true;
          }}
          // iOS specific - use native rendering
          {...(Platform.OS === 'ios' && {
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
          })}
        />
      );
    } else {
      // For PPT files, show a message and download option
      return (
        <View
          style={[
            tw`flex-1 items-center justify-center p-8`,
            {backgroundColor: darkMode ? '#1F2937' : '#F9FAFB'},
          ]}>
          {getFileIcon()}
          <Text
            style={[
              tw`font-nokia-bold text-xl mt-6 mb-4 text-center`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            PowerPoint Presentation
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-base text-center mb-6 opacity-70`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            Please download the file to view it
          </Text>
          <TouchableOpacity
            onPress={handleDownload}
            disabled={isDownloading}
            style={[
              tw`px-8 py-4 rounded-full`,
              {
                backgroundColor: '#EA9215',
                opacity: isDownloading ? 0.6 : 1,
              },
            ]}>
            {isDownloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={tw`flex-row items-center`}>
                <Download size={20} color="#FFFFFF" weight="bold" />
                <Text style={tw`text-white font-nokia-bold text-lg ml-2`}>
                  Download
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <SafeAreaView
      style={[
        tw`flex-1`,
        {backgroundColor: darkMode ? '#111827' : '#FFFFFF'},
      ]}>
      <AndroidStatusBarSpacer minHeight={4} />
      {/* Header */}
      <View
        style={[
          tw`flex-row items-center justify-between p-4 border-b`,
          {
            backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
            borderBottomColor: darkMode ? '#374151' : '#E5E7EB',
          },
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`p-2`}>
          <ArrowLeft size={24} color={darkMode ? '#FFFFFF' : '#374151'} weight="bold" />
        </TouchableOpacity>
        <Text
          style={[
            tw`font-nokia-bold text-lg flex-1 mx-4`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
          ]}
          numberOfLines={1}>
          {item.title}
        </Text>
        <TouchableOpacity
          onPress={handleDownload}
          disabled={isDownloading}
          style={[
            tw`p-2`,
            {opacity: isDownloading ? 0.6 : 1},
          ]}>
          {isDownloading ? (
            <ActivityIndicator size="small" color="#EA9215" />
          ) : (
            <Download size={24} color="#EA9215" weight="bold" />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={tw`flex-1`}>
        {isDownloading ? (
          <View
            style={[
              tw`px-4 py-3 border-b`,
              {
                backgroundColor: darkMode ? '#1F2937' : '#FFF7ED',
                borderBottomColor: darkMode ? '#374151' : '#FED7AA',
              },
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-sm mb-2`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Downloading... {Math.round(downloadProgress * 100)}%
            </Text>
            <ProgressBar
              progress={downloadProgress}
              trackColor={darkMode ? '#374151' : '#FDE7C2'}
              fillColor="#EA9215"
            />
          </View>
        ) : null}
        {loading && (
          <View
            style={[
              tw`absolute inset-0 items-center justify-center z-10`,
              {backgroundColor: darkMode ? '#111827' : '#FFFFFF'},
            ]}>
            <ActivityIndicator size="large" color="#EA9215" />
            <Text
              style={[
                tw`font-nokia-bold text-base mt-4`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Loading PDF...
            </Text>
          </View>
        )}
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

export default ExploreItemViewer;
