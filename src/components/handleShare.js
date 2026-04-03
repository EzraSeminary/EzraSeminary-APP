import Share from 'react-native-share';
import RNFS from 'react-native-fs';

export const handleShare = async (setIsSharing, imageURI, options = {}) => {
  setIsSharing(true);
  try {
    const message =
      typeof options.message === 'string' ? options.message : '';
    const title =
      typeof options.title === 'string' && options.title.trim()
        ? options.title
        : 'Share Devotional';

    if (!imageURI && !message) {
      throw new Error('No shareable image or text provided');
    }

    if (imageURI) {
      const filename = `devotional_image_${Date.now()}.jpg`;
      const localFile = `${RNFS.CachesDirectoryPath}/${filename}`;

      // Download the image file using native fetch API
      const response = await fetch(imageURI);
      if (!response.ok) {
        throw new Error(`Network response was not ok for URI: ${imageURI}`);
      }
      const imageBlob = await response.blob();

      // Process the image blob and write to local file system
      const base64data = await blobToBase64(imageBlob);
      await RNFS.writeFile(localFile, base64data, 'base64');

      await Share.open({
        title,
        message,
        url: `file://${localFile}`,
        type: 'image/jpeg',
      });
      return true;
    }

    await Share.open({
      title,
      message,
    });
    return true;
  } catch (error) {
    const lowerMessage = `${error?.message || ''}`.toLowerCase();
    const isCancelled =
      lowerMessage.includes('cancel') ||
      lowerMessage.includes('dismiss') ||
      lowerMessage.includes('did not share');
    if (!isCancelled) {
      console.error('Error during sharing:', error);
    }
    return false;
  } finally {
    setIsSharing(false);
  }
};

const blobToBase64 = blob => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Strip off the first part of the data URL
      const base64data = reader.result.split(',')[[1]];
      resolve(base64data);
    };
    reader.onerror = () => reject(new Error('Failed to read blob as base64'));
    reader.readAsDataURL(blob);
  });
};
