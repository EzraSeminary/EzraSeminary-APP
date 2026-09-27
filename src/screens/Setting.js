import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View,
  Text,
  Switch,
  SafeAreaView,
  TouchableOpacity,
  Share,
  Linking,
  ScrollView,
  Modal,
  Animated,
  NativeModules,
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
  Sparkle,
  Folder,
  Heart,
  TextT,
  BookOpenText,
} from 'phosphor-react-native';
import {useGetSSLsQuery} from '../services/SabbathSchoolApi';
import UserAvatar from '../components/UserAvatar';
import CacheChecker from '../components/CacheChecker';
import useReaderFontScale from '../hooks/useReaderFontScale';
import AndroidStatusBarSpacer from '../components/AndroidStatusBarSpacer';
import ReaderFontFamilySelector from '../components/ReaderFontFamilySelector';
import useReaderFontFamily from '../hooks/useReaderFontFamily';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getFloatingTabScenePadding} from '../navigation/floatingTabBarStyles';

const SSL_LANGUAGE_OPTIONS = [
  {
    value: 'am',
    label: 'Amharic',
    nativeLabel: 'አማርኛ',
    icon: 'አ',
  },
  {
    value: 'en',
    label: 'English',
    nativeLabel: 'International',
    icon: 'A',
  },
  {
    value: 'ti',
    label: 'Tigrigna',
    nativeLabel: 'ትግርኛ',
    icon: 'ት',
  },
];

const getSSLLanguageLabel = value =>
  SSL_LANGUAGE_OPTIONS.find(option => option.value === value)?.label ||
  'Amharic';

const Setting = ({navigation}) => {
  const dispatch = useDispatch();
  const darkMode = useSelector(state => state.ui.darkMode);
  const user = useSelector(state => state.auth);
  const language = useSelector(state => state.language.language);
  const [modalVisible, setModalVisible] = useState(false);
  const [showCacheChecker, setShowCacheChecker] = useState(false);
  const {refetch} = useGetSSLsQuery();
  const {readerFontScalePercentage, increaseFontScale, decreaseFontScale} =
    useReaderFontScale();
  const {readerFont} = useReaderFontFamily();
  const appVersion = useMemo(
    () => NativeModules.AppVersion?.versionName ?? 'Unknown',
    [],
  );
  const insets = useSafeAreaInsets();
  const scrollContentStyle = useMemo(
    () => ({
      ...tw`items-center px-4`,
      paddingBottom: getFloatingTabScenePadding(insets),
    }),
    [insets],
  );

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Sparkle animation loop
    const sparkleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    sparkleAnimation.start();

    return () => sparkleAnimation.stop();
  }, [fadeAnim, slideAnim, scaleAnim, sparkleAnim]);

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

  const SettingItem = ({
    icon,
    title,
    onPress,
    hasArrow = true,
    rightComponent,
  }) => (
    <TouchableOpacity
      style={tw`flex-row w-full justify-between items-center py-3`}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={tw`flex-row items-center flex-1`}>
        <View
          style={tw`w-8 h-8 bg-accent-6 rounded-2 items-center justify-center mr-3`}>
          {icon}
        </View>
        <Text style={tw`font-nokia-bold text-accent-6 text-base flex-1`}>
          {title}
        </Text>
      </View>
      {rightComponent ||
        (hasArrow && (
          <ArrowCircleRight size={20} weight="fill" color={'#EA9215'} />
        ))}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[
        tw`flex-1 items-center px-4 bg-primary-1 justify-between`,
        darkMode && tw`bg-secondary-9`,
      ]}>
      <ScrollView
        contentContainerStyle={scrollContentStyle}
        showsVerticalScrollIndicator={false}>
        <AndroidStatusBarSpacer minHeight={4} />
        <Animated.View
          style={[
            tw`w-full`,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          {/* Enhanced Header */}
          <Animated.View
            style={[
              tw`items-center mt-4 mb-6 p-4 rounded-2xl`,
              {
                backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                transform: [{scale: scaleAnim}],
              },
            ]}>
            <View style={tw`flex-row items-center justify-center mb-2`}>
              <Text
                style={[
                  tw`font-nokia-bold text-xl text-secondary-6 text-center`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                My Profile
              </Text>
              <Animated.View
                style={[
                  tw`ml-2`,
                  {
                    transform: [
                      {
                        rotate: sparkleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}>
                <Sparkle size={20} color="#EA9215" weight="fill" />
              </Animated.View>
            </View>
          </Animated.View>

          {/* Enhanced Profile Section */}
          {user && (
            <Animated.View
              style={[
                tw`flex-col w-full justify-center items-center mb-6 p-6 rounded-2xl`,
                {
                  backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                  transform: [{scale: scaleAnim}],
                },
              ]}>
              <Animated.View
                style={[
                  tw`mb-4`,
                  {
                    transform: [
                      {
                        scale: sparkleAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [1, 1.05, 1],
                        }),
                      },
                    ],
                  },
                ]}>
                <UserAvatar
                  avatarUri={user?.user?.avatar}
                  size={96}
                  style={[
                    {
                      shadowColor: '#EA9215',
                      shadowOffset: {width: 0, height: 4},
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 10,
                    },
                  ]}
                />
              </Animated.View>
              <Text
                style={[
                  tw`font-nokia-bold text-lg text-secondary-6 mb-1`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                {user && user.user && user.user.firstName}
              </Text>
              <Text
                style={[
                  tw`font-nokia-light text-sm text-secondary-6 opacity-70`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                {user && user.user && user.user.email}
              </Text>
            </Animated.View>
          )}

          {/* Profile Management Section */}
          {user.user && (
            <Animated.View
              style={[
                tw`mb-6 p-4 rounded-2xl border border-accent-6`,
                {
                  backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                  transform: [{scale: scaleAnim}],
                },
              ]}>
              <Text
                style={[
                  tw`font-nokia-bold text-lg text-secondary-6 mb-4`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                Profile Management
              </Text>

              <SettingItem
                icon={<Pencil size={16} weight="fill" color={'#FFFFFF'} />}
                title="Edit Profile"
                onPress={() => navigation.navigate('EditProfile')}
              />

              <SettingItem
                icon={<UserCircle size={16} weight="fill" color={'#FFFFFF'} />}
                title="Account Settings"
                onPress={() => navigation.navigate('AccountSettings')}
              />

              <SettingItem
                icon={<Heart size={16} weight="fill" color={'#FFFFFF'} />}
                title="Favorite Devotions"
                onPress={() => navigation.navigate('FavoriteDevotions')}
              />
            </Animated.View>
          )}

          {/* Admin Section */}
          {user.user &&
            (user.user.role === 'Admin' || user.user.role === 'Instructor') && (
              <Animated.View
                style={[
                  tw`mb-6 p-4 rounded-2xl border border-accent-6`,
                  {
                    backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                    transform: [{scale: scaleAnim}],
                  },
                ]}>
                <Text
                  style={[
                    tw`font-nokia-bold text-lg text-secondary-6 mb-4`,
                    darkMode ? tw`text-primary-1` : null,
                  ]}>
                  Admin
                </Text>

                <SettingItem
                  icon={<Folder size={16} weight="fill" color={'#FFFFFF'} />}
                  title="Explore/Supplements"
                  onPress={() => navigation.navigate('ExploreAdmin')}
                />
                <SettingItem
                  icon={
                    <BookOpenText size={16} weight="fill" color={'#FFFFFF'} />
                  }
                  title="Devotional Management"
                  onPress={() => navigation.navigate('DevotionAdmin')}
                />
              </Animated.View>
            )}

          {/* App Settings Section */}
          <Animated.View
            style={[
              tw`mb-6 p-4 rounded-2xl border border-accent-6`,
              {
                backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                transform: [{scale: scaleAnim}],
              },
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-lg text-secondary-6 mb-4`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              App Settings
            </Text>

            <SettingItem
              icon={<Moon size={16} weight="fill" color={'#FFFFFF'} />}
              title="Dark Mode"
              hasArrow={false}
              rightComponent={
                <Switch onValueChange={handleToggle} value={darkMode} />
              }
            />

            <SettingItem
              icon={<Globe size={16} weight="fill" color={'#FFFFFF'} />}
              title="SSL Language"
              onPress={() => setModalVisible(true)}
              rightComponent={
                <View style={tw`flex-row items-center`}>
                  <Text style={tw`font-nokia-bold text-accent-6 text-sm mr-2`}>
                    {getSSLLanguageLabel(language)}
                  </Text>
                  <ArrowCircleRight size={20} weight="fill" color={'#EA9215'} />
                </View>
              }
            />

            <SettingItem
              icon={<Bell size={16} weight="fill" color={'#FFFFFF'} />}
              title="Notification Settings"
              onPress={() => navigation.navigate('NotificationSettings')}
            />
          </Animated.View>

          {/* Reading Font Section */}
          {/* <Animated.View
            style={[
              tw`mb-6 p-4 rounded-2xl border border-accent-6`,
              {
                backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                transform: [{scale: scaleAnim}],
              },
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-lg text-secondary-6 mb-4`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              Reading Font
            </Text>
            <SettingItem
              icon={<TextT size={16} weight="fill" color={'#FFFFFF'} />}
              title="Font Type"
              hasArrow={false}
              rightComponent={
                <Text style={tw`font-nokia-bold text-accent-6 text-sm ml-2`}>
                  {readerFont.label}
                </Text>
              }
            />
            <ReaderFontFamilySelector
              darkMode={darkMode}
              showTitle={false}
              contentContainerStyle={tw`mb-3`}
            />
            <SettingItem
              icon={<Pencil size={16} weight="fill" color={'#FFFFFF'} />}
              title="Reading Font Size"
              hasArrow={false}
              rightComponent={
                <View style={tw`flex-row items-center`}>
                  <TouchableOpacity
                    onPress={decreaseFontScale}
                    style={tw`bg-accent-6 px-3 py-2 rounded-full`}>
                    <Text style={tw`text-primary-1 font-nokia-bold text-sm`}>
                      A-
                    </Text>
                  </TouchableOpacity>
                  <Text style={tw`font-nokia-bold text-accent-6 text-sm mx-2`}>
                    {readerFontScalePercentage}%
                  </Text>
                  <TouchableOpacity
                    onPress={increaseFontScale}
                    style={tw`bg-accent-6 px-3 py-2 rounded-full`}>
                    <Text style={tw`text-primary-1 font-nokia-bold text-sm`}>
                      A+
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </Animated.View> */}

          {/* App Information Section */}
          <Animated.View
            style={[
              tw`mb-6 p-4 rounded-2xl border border-accent-6`,
              {
                backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                transform: [{scale: scaleAnim}],
              },
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-lg text-secondary-6 mb-4`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              App Information
            </Text>

            <SettingItem
              icon={<DeviceMobile size={16} weight="fill" color={'#FFFFFF'} />}
              title="App Information"
              onPress={() => navigation.navigate('AppInfo')}
            />

            <SettingItem
              icon={<ShareNetwork size={16} weight="fill" color={'#FFFFFF'} />}
              title="Share Application"
              onPress={handleShare}
            />

            <SettingItem
              icon={<Info size={16} weight="fill" color={'#FFFFFF'} />}
              title="About Us"
              onPress={() =>
                handleLinkPress('https://ezraseminary.org/aboutUs')
              }
            />

            <SettingItem
              icon={<Sparkle size={16} weight="fill" color={'#FFFFFF'} />}
              title="Cache Status"
              onPress={() => setShowCacheChecker(true)}
            />

            <View
              style={tw`mt-2 pt-4 border-t border-accent-6 border-opacity-20`}>
              <Text
                style={[
                  tw`font-nokia-bold text-sm text-center leading-5`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                ]}>
                Prepared By YetnbitKal Ministry
              </Text>
              <Text
                style={[
                  tw`font-nokia-bold text-sm text-center leading-5 mt-1`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                ]}>
                Developed by AmenDevs
              </Text>
              <Text
                style={[
                  tw`font-nokia-bold text-sm text-center leading-5 mt-2`,
                  darkMode ? tw`text-primary-3` : tw`text-secondary-5`,
                ]}>
                Version {appVersion}
              </Text>
            </View>
          </Animated.View>

          {/* Support Section */}
          <Animated.View
            style={[
              tw`mb-6 p-4 rounded-2xl border border-accent-6`,
              {
                backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                transform: [{scale: scaleAnim}],
              },
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-lg text-secondary-6 mb-4`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              Support
            </Text>

            <SettingItem
              icon={<Envelope size={16} weight="fill" color={'#FFFFFF'} />}
              title="Contact Us"
              onPress={() =>
                handleLinkPress('https://ezraseminary.org/contactUs')
              }
            />
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{scale: scaleAnim}],
          }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={[
              tw`w-36 flex justify-center self-center border border-red-500 rounded-full mb-8`,
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
        </Animated.View>
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
              {SSL_LANGUAGE_OPTIONS.map(option => {
                const isSelected = language === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      tw`flex-row items-center p-4 rounded-4 border-2`,
                      isSelected
                        ? tw`bg-accent-6 border-accent-6`
                        : tw`bg-primary-1 border-accent-6`,
                      darkMode && !isSelected ? tw`bg-secondary-7` : null,
                    ]}
                    onPress={() => handleLanguageChange(option.value)}
                    activeOpacity={0.8}>
                    <View
                      style={[
                        tw`w-10 h-10 rounded-3 items-center justify-center mr-4`,
                        isSelected
                          ? tw`bg-white bg-opacity-20`
                          : tw`bg-accent-6`,
                      ]}>
                      <Text style={tw`font-nokia-bold text-lg text-white`}>
                        {option.icon}
                      </Text>
                    </View>
                    <View style={tw`flex-1`}>
                      <Text
                        style={[
                          tw`text-lg font-nokia-bold`,
                          isSelected ? tw`text-white` : tw`text-secondary-6`,
                          darkMode && !isSelected
                            ? tw`text-primary-1`
                            : null,
                        ]}>
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          tw`text-sm font-nokia-bold`,
                          isSelected
                            ? tw`text-primary-1 opacity-90`
                            : tw`text-secondary-4`,
                          darkMode && !isSelected
                            ? tw`text-primary-3`
                            : null,
                        ]}>
                        {option.nativeLabel}
                      </Text>
                    </View>
                    {isSelected && (
                      <View
                        style={tw`w-6 h-6 bg-white rounded-full items-center justify-center`}>
                        <View style={tw`w-3 h-3 bg-accent-6 rounded-full`} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
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

      {/* Cache Checker Modal */}
      <CacheChecker
        visible={showCacheChecker}
        onClose={() => setShowCacheChecker(false)}
        darkMode={darkMode}
      />
    </SafeAreaView>
  );
};

export default Setting;
