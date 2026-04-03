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
  success: props => <BaseToast {...props} {...toastTextStyles} />,
  error: props => <ErrorToast {...props} {...toastTextStyles} />,
  info: props => <InfoToast {...props} {...toastTextStyles} />,
};

const ToastComponent = forwardRef((props, ref) => {
  return <Toast {...props} config={toastConfig} ref={ref} />;
});

export default ToastComponent;
