import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
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

const ExploreItemViewer = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {item} = route.params;
  const darkMode = useSelector(state => state.ui.darkMode);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(true);

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

    setIsDownloading(true);

    try {
      const fileName = item.fileName || `file.${item.fileType || 'pdf'}`;
      
      let downloadPath;
      if (Platform.OS === 'ios') {
        // iOS: Save to Documents directory
        downloadPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
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
          const progress = (res.bytesWritten / res.contentLength) * 100;
          console.log(`Download progress: ${progress.toFixed(2)}%`);
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        Toast.show({
          type: 'success',
          text1: 'Download Complete',
          text2: `File saved to ${Platform.OS === 'ios' ? 'Documents' : 'Downloads'}`,
        });
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
      // Enhanced PDF viewer with zoom and landscape support
      const pdfUrl = item.fileUrl;

      return (
        <WebView
          source={{uri: pdfUrl}}
          style={{flex: 1}}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={syntheticEvent => {
            setLoading(false);
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
          // Enable zoom and pinch gestures
          scalesPageToFit={true}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          // Enable zoom
          showsHorizontalScrollIndicator={true}
          showsVerticalScrollIndicator={true}
          // Support landscape - WebView automatically handles orientation
          automaticallyAdjustContentInsets={false}
          // Allow user interaction for zoom
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          // Additional props for better PDF rendering
          originWhitelist={['*']}
          mixedContentMode="always"
          // Enable pinch to zoom
          bounces={false}
          // Inject JavaScript to enable zoom and viewport meta tag
          injectedJavaScript={`
            (function() {
              var meta = document.createElement('meta');
              meta.name = 'viewport';
              meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
              var head = document.getElementsByTagName('head')[0];
              if (head) {
                head.appendChild(meta);
              }
            })();
            true;
          `}
          // Allow zoom gestures
          allowsBackForwardNavigationGestures={false}
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
              Loading...
            </Text>
          </View>
        )}
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

export default ExploreItemViewer;
