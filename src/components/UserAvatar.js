import React, {useState} from 'react';
import {Image, View} from 'react-native';
import tw from './../../tailwind';

const UserAvatar = ({
  avatarUri,
  size = 96,
  style,
  defaultSource = require('../assets/default-avatar.png'),
}) => {
  const [imageError, setImageError] = useState(false);

  // Simple validation to check if we have a valid URI
  const hasValidUri =
    avatarUri &&
    typeof avatarUri === 'string' &&
    avatarUri.trim() !== '' &&
    !imageError &&
    (avatarUri.startsWith('http') ||
      avatarUri.startsWith('file://') ||
      avatarUri.startsWith('content://') ||
      avatarUri.startsWith('data:'));

  const handleImageError = () => {
    console.log('Failed to load user avatar:', avatarUri);
    setImageError(true);
  };

  // Reset error state when avatarUri changes
  React.useEffect(() => {
    setImageError(false);
  }, [avatarUri]);

  return (
    <View style={[{width: size, height: size}, style]}>
      {hasValidUri ? (
        // Show user's image
        <Image
          source={{uri: avatarUri}}
          style={[
            tw`rounded-full border-2 border-accent-6`,
            {width: size, height: size},
          ]}
          resizeMode="cover"
          onError={handleImageError}
        />
      ) : (
        // Show default avatar when no valid URI or error occurred
        <Image
          source={defaultSource}
          style={[
            tw`rounded-full border-2 border-accent-6`,
            {width: size, height: size},
          ]}
          resizeMode="cover"
        />
      )}
    </View>
  );
};

export default UserAvatar;
