import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Switch,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Share,
  Linking,
  ScrollView,
  Alert,
  Modal,
  Button,
} from 'react-native';
import tw from './../../tailwind';
import {useSelector, useDispatch} from 'react-redux';
import {toggleDarkMode} from '../redux/uiSlice';
import {logoutUser} from '../redux/authSlice';
import {setLanguage} from '../redux/languageSlice';
import {
  ArrowCircleRight,
  Envelope,
  DeviceMobile,
  Moon,
  Pencil,
  ShareNetwork,
  UserCircle,
  Info,
  Globe,
  Bell,
} from 'phosphor-react-native';
import {useGetSSLsQuery} from '../services/SabbathSchoolApi';
import NotificationSettings from '../screens/Settings/NotificationSettings';

const Setting = ({navigation}) => {
  const dispatch = useDispatch();
  const darkMode = useSelector(state => state.ui.darkMode);
  const user = useSelector(state => state.auth);
  const language = useSelector(state => state.language.language);
  const [modalVisible, setModalVisible] = useState(false);
  const {refetch} = useGetSSLsQuery();

  const handleToggle = () => {
    dispatch(toggleDarkMode());
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    navigation.navigate('Login');
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message:
          'Check out this amazing app on the Google Play Store: https://play.google.com/store/apps/details?id=com.ezraapp&pcampaignid=web_share',
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type of result.activityType
        } else {
          // Shared
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
      }
    } catch (error) {
      console.error('Error sharing the app link:', error);
    }
  };

  const handleLinkPress = url => {
    Linking.openURL(url).catch(err =>
      console.error('Error opening link:', err),
    );
  };

  const handleLanguageChange = async value => {
    dispatch(setLanguage(value));
    setModalVisible(false);
    await refetch(); // Refetch data after changing the language
  };

  return (
    <SafeAreaView
      style={[
        tw`flex-1 items-center px-4 bg-primary-1 justify-between`,
        darkMode && tw`bg-secondary-9`,
      ]}>
      <ScrollView
        contentContainerStyle={tw`items-center`}
        showsVerticalScrollIndicator={false}>
        <View style={tw`w-92%`}>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-secondary-6 text-center mt-4`,
              darkMode ? tw`text-primary-1` : null,
            ]}>
            {' '}
            My Profile{' '}
          </Text>
          {user && (
            <View style={tw`flex-col w-full justify-center items-center my-4`}>
              <Image
                style={tw`w-24 h-24 rounded-full border border-accent-6 my-2`}
                source={
                  user && user.user && user.user.avatar
                    ? {
                        uri: `${user.user.avatar}`,
                      }
                    : require('./../assets/default-avatar.png') // replace with the actual path to your default avatar
                }
              />
              <Text
                style={[
                  tw`font-nokia-bold text-lg text-secondary-6`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                {user && user.user && user.user.firstName}
              </Text>
              <Text
                style={[
                  tw`font-nokia-light text-sm text-secondary-6`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                {user && user.user && user.user.email}
              </Text>
            </View>
          )}

          {user.user && (
            <View style={tw` py-4 border-b border-accent-6`}>
              <TouchableOpacity
                style={tw`flex-row w-full justify-between items-center`}
                onPress={() => navigation.navigate('EditProfile')}>
                <View style={tw`flex-row items-center`}>
                  <Pencil
                    size={20}
                    weight="fill"
                    color={'#EA9215'}
                    style={tw`mr-2`}
                  />
                  <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                    Edit Profile
                  </Text>
                </View>
                <ArrowCircleRight
                  size={24}
                  weight="fill"
                  color={'#EA9215'}
                  style={tw`mr-2`}
                />
              </TouchableOpacity>
            </View>
          )}
          <View style={tw`py-4 border-b border-accent-6`}>
            <TouchableOpacity
              style={tw`flex-row w-full justify-between items-center`}
              onPress={() => navigation.navigate('AppInfo')}>
              <View style={tw`flex-row items-center`}>
                <DeviceMobile
                  size={20}
                  weight="fill"
                  color={'#EA9215'}
                  style={tw`mr-2`}
                />
                <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                  App Information
                </Text>
              </View>
              <ArrowCircleRight
                size={24}
                weight="fill"
                color={'#EA9215'}
                style={tw`mr-2`}
              />
            </TouchableOpacity>
          </View>
          <View style={tw`py-4 border-b border-accent-6`}>
            <TouchableOpacity
              style={tw`flex-row w-full justify-between items-center`}
              onPress={handleShare}>
              <View style={tw`flex-row items-center`}>
                <ShareNetwork
                  size={20}
                  weight="fill"
                  color={'#EA9215'}
                  style={tw`mr-2`}
                />
                <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                  Share Application
                </Text>
              </View>
              <ArrowCircleRight
                size={24}
                weight="fill"
                color={'#EA9215'}
                style={tw`mr-2`}
              />
            </TouchableOpacity>
          </View>
          <View
            style={tw`flex-row w-full justify-between items-center py-4 border-b border-accent-6`}>
            <View style={tw`flex-row items-center`}>
              <Moon
                size={20}
                weight="fill"
                color={'#EA9215'}
                style={tw`mr-2`}
              />
              <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                Dark Mode
              </Text>
            </View>
            <Switch onValueChange={handleToggle} value={darkMode} />
          </View>
          <View style={tw`py-4 border-b border-accent-6`}>
            <TouchableOpacity
              style={tw`flex-row w-full justify-between items-center`}
              onPress={() => setModalVisible(true)}>
              <View style={tw`flex-row items-center`}>
                <Globe
                  size={20}
                  weight="fill"
                  color={'#EA9215'}
                  style={tw`mr-2`}
                />
                <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                  SSL Language
                </Text>
              </View>
              <View style={tw`flex-row items-center`}>
                <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                  {' '}
                  {language === 'am' ? 'Amharic' : 'English'}{' '}
                </Text>
                <ArrowCircleRight
                  size={24}
                  weight="fill"
                  color={'#EA9215'}
                  style={tw`mr-2`}
                />
              </View>
            </TouchableOpacity>
          </View>
          <View style={tw`py-4 border-b border-accent-6`}>
            <TouchableOpacity
              style={tw`flex-row w-full justify-between items-center`}
              onPress={() =>
                handleLinkPress('https://ezraseminary.org/contactUs')
              }>
              <View style={tw`flex-row items-center`}>
                <Envelope
                  size={20}
                  weight="fill"
                  color={'#EA9215'}
                  style={tw`mr-2`}
                />
                <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                  Contact Us
                </Text>
              </View>
              <ArrowCircleRight
                size={24}
                weight="fill"
                color={'#EA9215'}
                style={tw`mr-2`}
              />
            </TouchableOpacity>
          </View>
          <View style={tw`py-4 border-b border-accent-6`}>
            <TouchableOpacity
              style={tw`flex-row w-full justify-between items-center`}
              onPress={() =>
                handleLinkPress('https://ezraseminary.org/aboutUs')
              }>
              <View style={tw`flex-row items-center`}>
                <Info
                  size={20}
                  weight="fill"
                  color={'#EA9215'}
                  style={tw`mr-2`}
                />
                <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                  About Us
                </Text>
              </View>
              <ArrowCircleRight
                size={24}
                weight="fill"
                color={'#EA9215'}
                style={tw`mr-2`}
              />
            </TouchableOpacity>
          </View>
          {user.user && (
            <View style={tw` py-4 border-b border-accent-6`}>
              <TouchableOpacity
                style={tw`flex-row w-full justify-between items-center`}
                onPress={() => navigation.navigate('AccountSettings')}>
                <View style={tw`flex-row items-center`}>
                  <UserCircle
                    size={20}
                    weight="fill"
                    color={'#EA9215'}
                    style={tw`mr-2`}
                  />
                  <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                    Account Settings
                  </Text>
                </View>
                <ArrowCircleRight
                  size={24}
                  weight="fill"
                  color={'#EA9215'}
                  style={tw`mr-2`}
                />
              </TouchableOpacity>
            </View>
          )}
          <View style={tw`py-4 border-b border-accent-6`}>
            <TouchableOpacity
              style={tw`flex-row w-full justify-between items-center`}
              onPress={() => navigation.navigate('NotificationSettings')}>
              <View style={tw`flex-row items-center`}>
                <Bell
                  size={20}
                  weight="fill"
                  color={'#EA9215'}
                  style={tw`mr-2`}
                />
                <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                  Notification Settings
                </Text>
              </View>
              <ArrowCircleRight
                size={24}
                weight="fill"
                color={'#EA9215'}
                style={tw`mr-2`}
              />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          style={[
            tw`w-36 flex justify-center self-center border border-red-500 rounded-full my-8`,
            user.user ? null : tw`border-accent-6 bg-accent-6`,
          ]}>
          <Text
            style={[
              tw`text-center font-nokia-bold text-lg text-red-500 px-8 py-2 `,
              user.user ? null : tw`text-primary-1`,
            ]}>
            {user.user ? 'Logout' : 'Login'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}>
        <View
          style={tw`flex-1 justify-center items-center bg-black bg-opacity-50 px-6`}>
          <View
            style={[
              tw`bg-white rounded-6 p-6 w-full max-w-sm shadow-xl border border-accent-6`,
              darkMode ? tw`bg-secondary-8 border-secondary-6` : null,
            ]}>
            {/* Header */}
            <View style={tw`items-center mb-6`}>
              <View
                style={tw`w-12 h-12 bg-accent-6 rounded-full items-center justify-center mb-3`}>
                <Globe size={24} weight="bold" color="#FFFFFF" />
              </View>
              <Text
                style={[
                  tw`text-xl font-nokia-bold text-secondary-6 text-center`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                Select Language
              </Text>
              <Text
                style={[
                  tw`text-sm font-nokia-bold text-secondary-4 text-center mt-1`,
                  darkMode ? tw`text-primary-3` : null,
                ]}>
                Choose your preferred SSL language
              </Text>
            </View>

            {/* Language Options */}
            <View style={tw`gap-3 mb-6`}>
              {/* Amharic Option */}
              <TouchableOpacity
                style={[
                  tw`flex-row items-center p-4 rounded-4 border-2`,
                  language === 'am'
                    ? tw`bg-accent-6 border-accent-6`
                    : tw`bg-primary-1 border-accent-6`,
                  darkMode && language !== 'am' ? tw`bg-secondary-7` : null,
                ]}
                onPress={() => handleLanguageChange('am')}
                activeOpacity={0.8}>
                <View
                  style={[
                    tw`w-10 h-10 rounded-3 items-center justify-center mr-4`,
                    language === 'am'
                      ? tw`bg-white bg-opacity-20`
                      : tw`bg-accent-6`,
                  ]}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-lg`,
                      language === 'am' ? tw`text-white` : tw`text-white`,
                    ]}>
                    አ
                  </Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text
                    style={[
                      tw`text-lg font-nokia-bold`,
                      language === 'am' ? tw`text-white` : tw`text-secondary-6`,
                      darkMode && language !== 'am' ? tw`text-primary-1` : null,
                    ]}>
                    Amharic
                  </Text>
                  <Text
                    style={[
                      tw`text-sm font-nokia-bold`,
                      language === 'am'
                        ? tw`text-primary-1 opacity-90`
                        : tw`text-secondary-4`,
                      darkMode && language !== 'am' ? tw`text-primary-3` : null,
                    ]}>
                    አማርኛ
                  </Text>
                </View>
                {language === 'am' && (
                  <View
                    style={tw`w-6 h-6 bg-white rounded-full items-center justify-center`}>
                    <View style={tw`w-3 h-3 bg-accent-6 rounded-full`} />
                  </View>
                )}
              </TouchableOpacity>

              {/* English Option */}
              <TouchableOpacity
                style={[
                  tw`flex-row items-center p-4 rounded-4 border-2`,
                  language === 'en'
                    ? tw`bg-accent-6 border-accent-6`
                    : tw`bg-primary-1 border-accent-6`,
                  darkMode && language !== 'en' ? tw`bg-secondary-7` : null,
                ]}
                onPress={() => handleLanguageChange('en')}
                activeOpacity={0.8}>
                <View
                  style={[
                    tw`w-10 h-10 rounded-3 items-center justify-center mr-4`,
                    language === 'en'
                      ? tw`bg-white bg-opacity-20`
                      : tw`bg-accent-6`,
                  ]}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-lg`,
                      language === 'en' ? tw`text-white` : tw`text-white`,
                    ]}>
                    A
                  </Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text
                    style={[
                      tw`text-lg font-nokia-bold`,
                      language === 'en' ? tw`text-white` : tw`text-secondary-6`,
                      darkMode && language !== 'en' ? tw`text-primary-1` : null,
                    ]}>
                    English
                  </Text>
                  <Text
                    style={[
                      tw`text-sm font-nokia-bold`,
                      language === 'en'
                        ? tw`text-primary-1 opacity-90`
                        : tw`text-secondary-4`,
                      darkMode && language !== 'en' ? tw`text-primary-3` : null,
                    ]}>
                    International
                  </Text>
                </View>
                {language === 'en' && (
                  <View
                    style={tw`w-6 h-6 bg-white rounded-full items-center justify-center`}>
                    <View style={tw`w-3 h-3 bg-accent-6 rounded-full`} />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[
                tw`py-3 px-6 border border-accent-6 rounded-4 self-center`,
                darkMode ? tw`border-secondary-6` : null,
              ]}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}>
              <Text
                style={[
                  tw`text-sm font-nokia-bold text-accent-6`,
                  darkMode ? tw`text-primary-2` : null,
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

export default Setting;
