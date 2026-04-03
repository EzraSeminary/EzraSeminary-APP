import React, {forwardRef} from 'react';
import {BaseToast, ErrorToast, InfoToast} from 'react-native-toast-message';
import Toast from 'react-native-toast-message';

const toastTextStyles = {
  text1Style: {
    fontSize: 15,
    fontFamily: 'Nokia Pure Headline Bold',
  },
  text2Style: {
    fontSize: 13,
    fontFamily: 'Nokia Pure Headline Bold',
  },
};

const toastConfig = {
  success: props => (
    <BaseToast
      {...props}
      {...toastTextStyles}
      text1NumberOfLines={2}
      text2NumberOfLines={2}
    />
  ),
  error: props => (
    <ErrorToast
      {...props}
      {...toastTextStyles}
      text1NumberOfLines={2}
      text2NumberOfLines={2}
    />
  ),
  info: props => (
    <InfoToast
      {...props}
      {...toastTextStyles}
      text1NumberOfLines={2}
      text2NumberOfLines={2}
    />
  ),
};

const ToastComponent = forwardRef((props, ref) => {
  return (
    <Toast
      {...props}
      config={toastConfig}
      ref={ref}
      autoHide={true}
      visibilityTime={2800}
      topOffset={60}
      bottomOffset={40}
      position="top"
      swipeable={true}
    />
  );
});

export default ToastComponent;
