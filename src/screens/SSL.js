import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import React, {useState, useCallback} from 'react';
import tw from './../../tailwind';
import {useSelector, useDispatch} from 'react-redux';
import {setLanguage} from '../redux/languageSlice';
import SSLHome from './SSLScreens/SSLHome';
import InVerseHome from './InVerseScreens/InVerseHome'; // Import the InVerseHome component
import {Globe} from 'phosphor-react-native';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import {saveHomeScreenToCache, getCachedHomeScreen} from '../utils/homeScreenCache';
import networkManager from '../utils/networkManager';
import AndroidStatusBarSpacer from '../components/AndroidStatusBarSpacer';

const SSL = ({navigation}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const language = useSelector(state => state.language.language);
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState('SSL'); // State to toggle between SSL and InVerse
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);

  React.useEffect(() => {
    const loadCachedSSLScreen = async () => {
      const cached = await getCachedHomeScreen('SSLScreen');
      if (cached?.activeTab) {
        setActiveTab(cached.activeTab);
      }
    };

    loadCachedSSLScreen();
  }, []);

  React.useEffect(() => {
    if (!networkManager.isOnline) {
      return;
    }

    saveHomeScreenToCache('SSLScreen', {
      activeTab,
      language,
      lastCacheTime: new Date().toISOString(),
    });
  }, [activeTab, language]);

  const handleLanguageChange = selectedLanguage => {
    dispatch(setLanguage(selectedLanguage));
    setIsLanguageModalVisible(false);
    Toast.show({
      type: 'success',
      text1: 'Language Changed',
      text2: `Language changed to ${
        selectedLanguage === 'am' ? 'Amharic' : 'English'
      }`,
    });
  };

  const onRefresh = useCallback(async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Toast.show({
        type: 'info',
        text1: 'Internet Connection Required',
        text2: 'Please connect to the internet to reload data.',
      });
      setIsRefreshing(false);
      return;
    }

    try {
      setIsRefreshing(true);
      // Add a small delay to show the refresh animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Force re-render of the active component
      setActiveTab(prev => (prev === 'SSL' ? 'InVerse' : 'SSL'));
      setActiveTab(prev => (prev === 'InVerse' ? 'SSL' : 'InVerse'));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleReload = async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Toast.show({
        type: 'info',
        text1: 'Internet Connection Required',
        text2: 'Please connect to the internet to reload data.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Add a small delay to show the loading animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Force re-render of the active component
      setActiveTab(prev => (prev === 'SSL' ? 'InVerse' : 'SSL'));
      setActiveTab(prev => (prev === 'InVerse' ? 'SSL' : 'InVerse'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[tw`flex-1`, darkMode ? tw`bg-secondary-9` : null]}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#EA9215" />
          <Text
            style={[
              tw`font-nokia-bold text-lg text-accent-6 mt-4`,
              darkMode ? tw`text-primary-1` : null,
            ]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[tw`flex-1`, darkMode ? tw`bg-secondary-9` : null]}>
      <View style={tw`flex-1  mx-auto w-[92%]`}>
        <AndroidStatusBarSpacer minHeight={4} />
        {/* Header Section */}
        <View style={tw`flex flex-row justify-between my-4 px-4`}>
          <View style={tw`border-b border-accent-6`}>
            <Text
              style={[
                tw`font-nokia-bold text-xl text-secondary-6 text-center`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              Sabbath School
            </Text>
          </View>
          <TouchableOpacity onPress={() => setIsLanguageModalVisible(true)}>
            <Globe
              size={32}
              weight="bold"
              style={[
                tw`text-secondary-6`,
                darkMode ? tw`text-primary-1` : null,
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* Switch Button */}
        <View style={tw`flex flex-row justify-center gap-4 my-2`}>
          <TouchableOpacity
            style={[
              tw`px-4 py-2 rounded-full`,
              activeTab === 'SSL'
                ? tw`bg-accent-6`
                : tw`border border-accent-6`,
            ]}
            onPress={() => setActiveTab('SSL')}>
            <Text
              style={[
                tw`font-nokia-bold`,
                activeTab === 'SSL'
                  ? tw`text-primary-1`
                  : darkMode
                  ? tw`text-accent-6`
                  : tw`text-secondary-6`,
              ]}>
              SSL
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              tw`px-4 py-2 rounded-full`,
              activeTab === 'InVerse'
                ? tw`bg-accent-6`
                : tw`border border-accent-6`,
            ]}
            onPress={() => setActiveTab('InVerse')}>
            <Text
              style={[
                tw`font-nokia-bold`,
                activeTab === 'InVerse'
                  ? tw`text-primary-1`
                  : darkMode
                  ? tw`text-accent-6`
                  : tw`text-secondary-6`,
              ]}>
              InVerse
            </Text>
          </TouchableOpacity>
        </View>

        {/* Render Active Component */}
        <ScrollView
          contentContainerStyle={{flexGrow: 1}}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }>
          {activeTab === 'SSL' ? (
            <SSLHome onReload={handleReload} />
          ) : (
            <InVerseHome onReload={handleReload} />
          )}
        </ScrollView>
      </View>

      {/* Language Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isLanguageModalVisible}
        onRequestClose={() => setIsLanguageModalVisible(false)}>
        <View
          style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
          <View
            style={[
              tw`w-80 p-6 rounded-2xl mx-4`,
              darkMode ? tw`bg-secondary-8` : tw`bg-primary-1`,
            ]}>
            {/* Header */}
            <View style={tw`items-center mb-6`}>
              <View
                style={tw`w-12 h-12 bg-accent-6 rounded-full items-center justify-center mb-3`}>
                <Globe size={28} color="#FFFFFF" weight="bold" />
              </View>
              <Text
                style={[
                  tw`text-xl font-nokia-bold text-center`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}>
                Select Language
              </Text>
            </View>

            {/* Language Options */}
            <View style={tw`gap-2 mb-6`}>
              <TouchableOpacity
                style={[
                  tw`flex-row items-center p-4 rounded-xl border-2`,
                  language === 'en'
                    ? tw`bg-accent-6 bg-opacity-10 border-accent-6`
                    : tw`border-gray-300`,
                  darkMode && language !== 'en' ? tw`border-secondary-6` : null,
                ]}
                onPress={() => handleLanguageChange('en')}>
                <View
                  style={tw`w-8 h-8 rounded-full bg-primary-1 items-center justify-center mr-3`}>
                  <Text style={tw`text-secondary-8 font-nokia-bold text-sm`}>
                    A
                  </Text>
                </View>
                <Text
                  style={[
                    tw`text-lg font-nokia-bold flex-1`,
                    language === 'en'
                      ? tw`text-accent-6`
                      : darkMode
                      ? tw`text-primary-1`
                      : tw`text-secondary-8`,
                  ]}>
                  English
                </Text>
                <View
                  style={[
                    tw`w-5 h-5 rounded-full border-2`,
                    language === 'en'
                      ? tw`border-accent-6 bg-accent-6`
                      : tw`border-gray-400`,
                  ]}>
                  {language === 'en' && (
                    <View
                      style={tw`w-2 h-2 bg-primary-1 rounded-full m-auto`}
                    />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  tw`flex-row items-center p-4 rounded-xl border-2`,
                  language === 'am'
                    ? tw`bg-accent-6 bg-opacity-10 border-accent-6`
                    : tw`border-gray-300`,
                  darkMode && language !== 'am' ? tw`border-secondary-6` : null,
                ]}
                onPress={() => handleLanguageChange('am')}>
                <View
                  style={tw`w-8 h-8 rounded-full bg-primary-1 items-center justify-center mr-3`}>
                  <Text style={tw`text-secondary-8 font-nokia-bold text-sm`}>
                    አ
                  </Text>
                </View>
                <Text
                  style={[
                    tw`text-lg font-nokia-bold flex-1`,
                    language === 'am'
                      ? tw`text-accent-6`
                      : darkMode
                      ? tw`text-primary-1`
                      : tw`text-secondary-8`,
                  ]}>
                  አማርኛ
                </Text>
                <View
                  style={[
                    tw`w-5 h-5 rounded-full border-2`,
                    language === 'am'
                      ? tw`border-accent-6 bg-accent-6`
                      : tw`border-gray-400`,
                  ]}>
                  {language === 'am' && (
                    <View
                      style={tw`w-2 h-2 bg-primary-1 rounded-full m-auto`}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[
                tw`py-3 px-6 rounded-xl`,
                darkMode ? tw`bg-secondary-6` : tw`bg-gray-200`,
              ]}
              onPress={() => setIsLanguageModalVisible(false)}>
              <Text
                style={[
                  tw`text-center font-nokia-bold text-base`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SSL;
