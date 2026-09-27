import {Platform} from 'react-native';

const getFloatingTabBarBottomOffset = (insets = {}) => {
  const bottomInset = insets.bottom || 0;

  if (Platform.OS === 'ios') {
    return Math.max(bottomInset - 26, 6);
  }

  return Math.max(bottomInset + 8, 12);
};

const getFloatingTabBarHeight = () => (Platform.OS === 'ios' ? 76 : 72);

export const getFloatingTabBarStyle = (darkMode, insets = {}) => ({
  position: 'absolute',
  left: 18,
  right: 18,
  bottom: getFloatingTabBarBottomOffset(insets),
  height: getFloatingTabBarHeight(),
  paddingTop: 8,
  paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  borderTopWidth: 0,
  borderWidth: darkMode ? 1 : 0,
  borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'transparent',
  borderRadius: 38,
  backgroundColor: darkMode ? '#293239' : '#FFFFFF',
  shadowColor: '#000',
  shadowOffset: {width: 0, height: 8},
  shadowOpacity: darkMode ? 0.34 : 0.16,
  shadowRadius: 18,
  elevation: 14,
});

export const getFloatingTabScenePadding = (insets = {}) =>
  getFloatingTabBarHeight() +
  getFloatingTabBarBottomOffset(insets) +
  (Platform.OS === 'android' ? 56 : 32);

export const floatingTabBarItemStyle = {
  height: 58,
  paddingVertical: 4,
  borderRadius: 30,
};

export const floatingTabBarLabelStyle = {
  fontSize: 12,
  fontWeight: '700',
  marginTop: -2,
  marginBottom: 4,
};

export const floatingTabBarIconStyle = {
  marginTop: 4,
};

export const getFloatingTabInactiveColor = darkMode =>
  darkMode ? '#D3D3D3' : '#7A6848';
