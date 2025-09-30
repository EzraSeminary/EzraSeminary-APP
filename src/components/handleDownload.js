import {Platform} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Toast from 'react-native-toast-message';
import RNFS from 'react-native-fs';

const handleDownload = async (setIsDownloading, imgUrl) => {
  setIsDownloading(true);

  if (Platform.OS === 'android') {
    try {
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
