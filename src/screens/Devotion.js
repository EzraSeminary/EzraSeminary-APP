import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ImageBackground,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import handleDownload from '../components/handleDownload';
import {handleShare} from '../components/handleShare';
import {
  User,
  ArrowSquareUpRight,
  DownloadSimple,
  ShareNetwork,
  Share,
} from 'phosphor-react-native';
import tw from './../../tailwind';
import {useGetDevotionsQuery} from '../redux/api-slices/apiSlice';
import {toEthiopian} from 'ethiopian-date';
import HTMLView from 'react-native-htmlview';
import ErrorScreen from '../components/ErrorScreen';
import PreviousDevotions from './DevotionScreens/PreviousDevotions';
import NotificationService from '../services/NotificationService';
import DevotionalShareModal from '../components/DevotionalShareModal';
import networkManager from '../utils/networkManager';

const ethiopianMonths = [
  '',
  'መስከረም',
  'ጥቅምት',
  'ህዳር',
  'ታህሳስ',
  'ጥር',
  'የካቲት',
  'መጋቢት',
  'ሚያዝያ',
  'ግንቦት',
  'ሰኔ',
  'ሐምሌ',
  'ነሐሴ',
  'ጳጉሜ',
];

const Devotion = () => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const navigation = useNavigation();
  const {
    data: devotions = [],
    isFetching,
    error,
    refetch,
  } = useGetDevotionsQuery();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDevotion, setSelectedDevotion] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const tailwindStyles = StyleSheet.create({
    p: {
      ...(darkMode
        ? tw`text-primary-1 font-nokia-bold text-justify text-sm leading-snug`
        : tw`text-secondary-6 font-nokia-bold text-justify leading-snug`),
      marginVertical: -15,
    },
    a: tw`text-accent-6 font-nokia-bold text-sm underline`,
    h1: darkMode
      ? tw`text-primary-1 font-nokia-bold text-justify text-2xl leading-snug`
      : tw`text-secondary-6 font-nokia-bold text-justify text-2xl leading-snug`,
    h2: darkMode
      ? tw`text-primary-1 font-nokia-bold text-justify text-xl leading-snug`
      : tw`text-secondary-6 font-nokia-bold text-justify text-xl leading-snug`,
    h3: darkMode
      ? tw`text-primary-1 font-nokia-bold text-justify text-lg leading-snug`
      : tw`text-secondary-6 font-nokia-bold text-justify text-lg leading-snug`,
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setLoadingTimeout(false);
    setNetworkError(false);

    // Check network connectivity first
    if (!networkManager.isOnline) {
      setNetworkError(true);
      setIsRefreshing(false);
      return;
    }

    try {
      await refetch();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Add loading timeout effect
  useEffect(() => {
    let timeoutId;
    if (isFetching && !error) {
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000); // 15 second timeout
    } else {
      setLoadingTimeout(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isFetching, error]);

  // Check network connectivity on mount and set up listener
  useEffect(() => {
    // Initial check
    if (!networkManager.isOnline) {
      setNetworkError(true);
    }

    // Set up network state listener
    const unsubscribe = networkManager.addListener(networkState => {
      if (!networkState.isOnline) {
        setNetworkError(true);
      } else {
        setNetworkError(false);
      }
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (devotions.length > 0) {
      const today = new Date();
      const [year, month, day] = toEthiopian(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate(),
      );
      const ethiopianMonth = ethiopianMonths[month];
      const todaysDevotion = devotions.find(
        devotion =>
          devotion.month === ethiopianMonth && Number(devotion.day) === day,
      );
      const currentDevotion = todaysDevotion || devotions[0];
      setSelectedDevotion(currentDevotion);

      // Schedule notification for current devotion if notifications are enabled
      scheduleNotificationForCurrentDevotion(currentDevotion);
    }
  }, [devotions]);

  const scheduleNotificationForCurrentDevotion = async devotion => {
    try {
      const settings = await NotificationService.getDailyNotificationSettings();
      if (settings.enabled && devotion) {
        await NotificationService.scheduleDailyVerseNotification(
          devotion,
          settings.time,
        );
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const previousDevotions = useMemo(() => {
    const today = new Date();
    const [year, month, day] = toEthiopian(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate(),
    );
    const ethiopianMonth = ethiopianMonths[month];
    return devotions
      .filter(
        devotion =>
          devotion.month === ethiopianMonth && Number(devotion.day) < day,
      )
      .sort((a, b) => Number(b.day) - Number(a.day))
      .slice(0, 4);
  }, [devotions]);

  // Handle different error states
  if (networkError && !devotions.length) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : tw`h-100%`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
            ]}>
            No Internet Connection
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center mb-6`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-4`,
            ]}>
            Please check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4`}
            onPress={onRefresh}>
            <Text style={tw`font-nokia-bold text-white text-base`}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !devotions.length) {
    return <ErrorScreen refetch={refetch} darkMode={darkMode} />;
  }

  if (loadingTimeout && !devotions.length) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : tw`h-100%`}>
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <ActivityIndicator size="large" color="#EA9215" style={tw`mb-4`} />
          <Text
            style={[
              tw`font-nokia-bold text-xl text-center mb-4`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
            ]}>
            Still loading...
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm text-center mb-6`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-4`,
            ]}>
            This is taking longer than expected. Please check your connection.
          </Text>
          <TouchableOpacity
            style={tw`bg-accent-6 px-6 py-3 rounded-4`}
            onPress={onRefresh}>
            <Text style={tw`font-nokia-bold text-white text-base`}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isFetching && !devotions.length) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <ActivityIndicator size="large" color="#EA9215" style={tw`mt-20`} />
        <Text style={tw`font-nokia-bold text-lg text-accent-6 text-center`}>
          Loading
        </Text>
      </SafeAreaView>
    );
  }

  if (!devotions || devotions.length === 0) {
    return <ErrorScreen refetch={refetch} darkMode={darkMode} />;
  }
  const devotionToDisplay = selectedDevotion || devotions[0];
  const url = `${devotionToDisplay.image}`;

  // Extract content from devotional (try multiple fields with better fallbacks)
  const content =
    devotionToDisplay.body?.[0] ||
    devotionToDisplay.body ||
    devotionToDisplay.content ||
    devotionToDisplay.text ||
    devotionToDisplay.description ||
    '';

  // Ensure content is properly formatted for HTMLView
  const sanitizedContent =
    typeof content === 'string'
      ? content.includes('<') && content.includes('>')
        ? content // Keep HTML content as-is
        : `<div><p>${content.replace(/\n/g, '<br/>')}</p></div>`
      : '';

  // Create styles for HTMLView
  const htmlStyles = StyleSheet.create({
    p: {
      ...(darkMode
        ? tw`text-primary-1 font-nokia-bold text-justify text-sm leading-snug`
        : tw`text-secondary-6 font-nokia-bold text-justify leading-snug`),
      marginVertical: -15,
    },
    a: tw`text-accent-6 font-nokia-bold text-sm underline`,
    h1: darkMode
      ? tw`text-primary-1 font-nokia-bold text-justify text-2xl leading-snug`
      : tw`text-secondary-6 font-nokia-bold text-justify text-2xl leading-snug`,
    h2: darkMode
      ? tw`text-secondary-6 font-nokia-bold text-justify text-xl leading-snug`
      : tw`text-secondary-6 font-nokia-bold text-justify text-xl leading-snug`,
    h3: darkMode
      ? tw`text-primary-1 font-nokia-bold text-justify text-lg leading-snug`
      : tw`text-secondary-6 font-nokia-bold text-justify leading-snug`,
    // Table styles for HTML content
    table: tw`border border-gray-300 my-4`,
    td: tw`border-r border-gray-300 p-2`,
  });

  // Render node function for HTMLView
  const renderNode = (node, index, siblings, parent, defaultRenderer) => {
    if (node.name === 'a') {
      return (
        <Text key={index} style={htmlStyles.a}>
          {defaultRenderer(node.children, node)}
        </Text>
      );
    }

    if (node.name === 'blockquote') {
      const childrenWithStyles = node.children.map((child, childIndex) => {
        if (child.type === 'text') {
          return (
            <Text
              key={childIndex}
              style={[
                tw`font-nokia-bold text-lg text-justify`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
              ]}>
              {child.data}
            </Text>
          );
        } else {
          return defaultRenderer(child.children, child);
        }
      });
      return (
        <View
          key={index}
          style={[
            tw`border-l-4 border-accent-6 pl-4 flex flex-row flex-wrap text-wrap mb-4`,
          ]}>
          {childrenWithStyles}
        </View>
      );
    }

    if (node.name === 'table') {
      return (
        <View key={index} style={htmlStyles.table}>
          {defaultRenderer(node.children, node)}
        </View>
      );
    }

    if (node.name === 'tr') {
      return (
        <View key={index} style={tw`flex-row border-b border-gray-300`}>
          {defaultRenderer(node.children, node)}
        </View>
      );
    }

    if (node.name === 'td') {
      return (
        <Text key={index} style={htmlStyles.td}>
          {defaultRenderer(node.children, node)}
        </Text>
      );
    }

    // Default renderer for other nodes
    return defaultRenderer(node.children, node);
  };

  return (
    <View style={darkMode ? tw`bg-secondary-9` : null}>
      <SafeAreaView style={tw`flex mx-auto w-[92%]`}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }
          removeClippedSubviews={true}>
          <View style={tw`flex flex-row justify-between items-center my-4`}>
            <View style={tw`border-b border-accent-6`}>
              <Text
                style={[
                  tw`font-nokia-bold text-xl text-secondary-6 text-center`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                Devotional
              </Text>
            </View>
            <View style={tw`flex flex-row items-center gap-3`}>
              <TouchableOpacity onPress={() => setShareModalVisible(true)}>
                <Share size={32} weight="regular" color="#EA9215" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={tw`flex flex-row mt-6 justify-between`}>
            <View style={tw`w-70%`}>
              <Text
                style={[
                  tw`font-nokia-bold text-secondary-6 text-4xl leading-tight`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                {devotionToDisplay.title}
              </Text>
              <View style={tw`border-b border-accent-6 mb-1`} />
              <Text
                style={[
                  tw`font-nokia-bold text-secondary-6 text-sm`,
                  darkMode ? tw`text-primary-1` : null,
                ]}>
                የዕለቱ የመጽሐፍ ቅዱስ ንባብ ክፍል -
              </Text>
              <Text
                style={tw`font-nokia-bold text-accent-6 text-xl leading-tight`}>
                {devotionToDisplay.chapter}
              </Text>
            </View>
            <View
              style={tw`flex items-center justify-center border border-accent-6 p-2 rounded-4 w-20 h-20`}>
              <View
                style={tw`flex justify-center gap-[-1] bg-secondary-6 rounded-2 w-16 h-16`}>
                <Text style={tw`font-nokia-bold text-primary-1 text-center`}>
                  {devotionToDisplay.month}
                </Text>
                <Text
                  style={tw`font-nokia-bold text-primary-1 text-4xl leading-tight text-center`}>
                  {devotionToDisplay.day}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              tw`border border-accent-6 p-4 rounded-4 mt-4 bg-primary-5 shadow-lg`,
              darkMode ? tw`bg-secondary-8` : null,
            ]}>
            <Text
              selectable
              style={[
                tw`font-nokia-bold text-secondary-6 text-lg leading-tight`,
                darkMode ? tw`text-primary-1` : null,
              ]}>
              {devotionToDisplay.verse}
            </Text>
          </View>
          <View style={tw`mt-8`}>
            <HTMLView
              value={devotionToDisplay.body[0]} // Assuming body[0] contains HTML string
              stylesheet={tailwindStyles}
              linebreak={false}
            />
          </View>
          <View
            style={[
              tw`border border-accent-6 p-4 rounded-4 mt-8 bg-primary-4 shadow-sm mb-2`,
              darkMode ? tw`bg-secondary-8` : null,
            ]}>
            <Text
              style={tw`font-nokia-bold text-accent-6 text-sm leading-tight text-center`}>
              {devotionToDisplay.prayer}
            </Text>
          </View>

          {/* Share Devotional Button */}
          <TouchableOpacity
            style={tw`flex flex-row items-center justify-center gap-2 p-3 bg-accent-6 rounded-4 mt-4 mb-2`}
            onPress={() => setShareModalVisible(true)}>
            <Share size={24} weight="bold" color="#FFFFFF" />
            <Text style={tw`font-nokia-bold text-white text-base`}>
              የዕለቱን መንፈሳዊ ትምህርት አጋራ
            </Text>
          </TouchableOpacity>
          <View
            style={tw`border border-accent-6 rounded-4 mt-4 overflow-hidden`}>
            <Image
              source={{
                uri: `${devotionToDisplay.image}`,
              }}
              style={tw`w-full h-96`}
              resizeMode="cover"
            />
            <View style={tw`flex flex-row gap-2 justify-center my-4`}>
              <TouchableOpacity
                style={tw`flex flex-row items-center gap-2 px-2 py-1 bg-accent-6 rounded-4`}
                onPress={() => handleDownload(setIsDownloading, url)}>
                {isDownloading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={tw`font-nokia-bold text-primary-1`}>
                      {' '}
                      ምስሉን አውርድ
                    </Text>
                    <DownloadSimple
                      size={28}
                      weight="bold"
                      style={tw`text-primary-1`}
                    />
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`flex flex-row items-center gap-2 px-2 py-1 bg-accent-6 rounded-4`}
                onPress={() => handleShare(setIsSharing, url)}>
                {isSharing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={tw`font-nokia-bold text-primary-1`}>
                      {' '}
                      ምስሉን አጋራ
                    </Text>
                    <ShareNetwork
                      size={28}
                      weight="bold"
                      style={tw`text-primary-1`}
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <View style={tw`border-b border-primary-7 mt-4 mb-4`} />
          <View style={tw`flex flex-row justify-between items-center`}>
            <Text
              style={[
                tw`font-nokia-bold text-secondary-4 text-lg`,
                darkMode ? tw`text-primary-3` : null,
              ]}>
              Discover Devotionals
            </Text>
            <TouchableOpacity
              style={tw`border border-accent-6 px-4 py-1 rounded-4`}
              onPress={() => navigation.navigate('AllDevotionals')}>
              <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>
                All Devotionals
              </Text>
            </TouchableOpacity>
          </View>
          <PreviousDevotions devotions={devotions} darkMode={darkMode} />
        </ScrollView>
      </SafeAreaView>

      {/* Share Modal */}
      <DevotionalShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        devotional={devotionToDisplay}
        darkMode={darkMode}
      />
    </View>
  );
};

export default Devotion;
