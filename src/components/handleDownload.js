import {PermissionsAndroid, Platform, ToastAndroid} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Toast from 'react-native-toast-message';
import RNFS from 'react-native-fs';

const hasAndroidPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    // For Android 13+ (API 33+), we need READ_MEDIA_IMAGES
    // For Android 10-12 (API 29-32), we need READ_EXTERNAL_STORAGE
    // For Android 9 and below, we need both READ and WRITE permissions

    const apiLevel = Platform.Version;
    console.log('Android API Level:', apiLevel);

    if (apiLevel >= 33) {
      // Android 13+ - Use READ_MEDIA_IMAGES
      const permission = 'android.permission.READ_MEDIA_IMAGES';
      const hasPermission = await PermissionsAndroid.check(permission);

      if (hasPermission) {
        return true;
      }

      const granted = await PermissionsAndroid.request(permission, {
        title: 'Storage Permission',
        message: 'This app needs access to your photos to download images.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      });

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else if (apiLevel >= 29) {
      // Android 10-12 - Use READ_EXTERNAL_STORAGE
      const permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const hasPermission = await PermissionsAndroid.check(permission);

      if (hasPermission) {
        return true;
      }

      const granted = await PermissionsAndroid.request(permission, {
        title: 'Storage Permission',
        message: 'This app needs access to storage to download images.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      });

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      // Android 9 and below - Use both READ and WRITE permissions
      const readPermission =
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const writePermission =
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;

      const hasReadPermission = await PermissionsAndroid.check(readPermission);
      const hasWritePermission = await PermissionsAndroid.check(
        writePermission,
      );

      if (hasReadPermission && hasWritePermission) {
        return true;
      }

      const grantedPermissions = await PermissionsAndroid.requestMultiple([
        readPermission,
        writePermission,
      ]);

      const readGranted = grantedPermissions[readPermission] === 'granted';
      const writeGranted = grantedPermissions[writePermission] === 'granted';

      return readGranted && writeGranted;
    }
  } catch (err) {
    console.warn('Permission error:', err);
    return false;
  }
};

const handleDownload = async (setIsDownloading, imgUrl) => {
  setIsDownloading(true);

  if (Platform.OS === 'android') {
    try {
      // Check permissions first
      const hasPermission = await hasAndroidPermission();
      if (!hasPermission) {
        Toast.show({
          type: 'error',
          text1: 'Permission Required',
          text2: 'Please grant storage permission to download images.',
        });
        setIsDownloading(false);
        return;
      }

      // Create temporary file path
      const timestamp = Date.now();
      const fileExtension = imgUrl.split('.').pop().split('?')[0] || 'jpg'; // Get extension from URL
      const filename = `devotional_image_${timestamp}.${fileExtension}`;
      const localFile = `${RNFS.TemporaryDirectoryPath}/${filename}`;

      console.log('Downloading from:', imgUrl);
      console.log('Saving to:', localFile);

      // Download the image using RNFS
      const downloadResult = await RNFS.downloadFile({
        fromUrl: imgUrl,
        toFile: localFile,
        background: true,
        discretionary: true,
        cacheable: false,
      }).promise;

      console.log('Download result:', downloadResult);

      if (downloadResult.statusCode === 200) {
        // Save to camera roll using local file path
        const result = await CameraRoll.save(`file://${localFile}`, {
          type: 'photo',
        });

        console.log('Camera roll save result:', result);

        // Clean up temporary file
        try {
          await RNFS.unlink(localFile);
        } catch (cleanupError) {
          console.log('Cleanup error (non-critical):', cleanupError);
        }

        if (result) {
          Toast.show({
            type: 'success',
            text1: 'Image downloaded successfully!',
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Unable to save image. Try again later.',
          });
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to download image from server.',
          text2: `Server responded with status: ${downloadResult.statusCode}`,
        });
      }
    } catch (error) {
      console.error('Error during download/save:', error);
      let errorMessage =
        'Error downloading image. Please check your internet connection.';

      if (error.message && error.message.includes('HTTP')) {
        errorMessage = 'Failed to download image from server.';
      } else if (error.message && error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message && error.message.includes('Permission')) {
        errorMessage = 'Storage permission required to download images.';
      }

      Toast.show({
        type: 'error',
        text1: errorMessage,
        text2: error.message,
      });
    } finally {
      setIsDownloading(false);
    }
  } else {
    // iOS can handle URLs directly
    try {
      const result = await CameraRoll.save(imgUrl, {type: 'photo'});
      if (result) {
        Toast.show({
          type: 'success',
          text1: 'Image downloaded successfully!',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Unable to download image. Try again later.',
        });
      }
    } catch (error) {
      console.error('Error during save to camera roll:', error);
      Toast.show({
        type: 'error',
        text1:
          'Error downloading image. Please check your internet connection.',
      });
    } finally {
      setIsDownloading(false);
    }
  }
};

export default handleDownload;
