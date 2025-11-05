import React, {Component} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {navigate} from '../navigation/NavigationRef';
import tw from './../../tailwind';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return {hasError: true, error};
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({hasError: false});
    // Call the refetch function passed down as a prop
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleGoHome = () => {
    try {
      navigate('MainTab', {screen: 'Home'});
    } catch (e) {
      console.warn('Navigation failed from ErrorBoundary:', e);
    }
  };

  render() {
    const {hasError, error} = this.state;
    if (hasError) {
      // You can render any custom fallback UI
      return (
        <View style={tw`flex-1 justify-center items-center bg-primary-1`}>
          <Text style={tw`text-2xl font-nokia-bold text-accent-6 mb-6`}>
            An error occurred: {error ? error.toString() : null}
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-5 rounded-lg py-3 px-6 mb-4`}
            onPress={this.handleRetry}>
            <Text style={tw`text-lg font-nokia-bold text-primary-1`}>
              Retry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={tw`bg-accent-6 rounded-lg py-3 px-6`}
            onPress={this.handleGoHome}>
            <Text style={tw`text-lg font-nokia-bold text-primary-1`}>
              Go to Home
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
