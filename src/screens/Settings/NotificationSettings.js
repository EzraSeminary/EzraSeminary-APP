import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {useSelector} from 'react-redux';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {Bell, Clock, TestTube, ArrowSquareLeft} from 'phosphor-react-native';
import tw from '../../../tailwind';
import NotificationService from '../../services/NotificationService';
import {useGetDevotionsQuery} from '../../redux/api-slices/apiSlice';
import {toEthiopian} from 'ethiopian-date';
import {useNavigation} from '@react-navigation/native';
import AndroidStatusBarSpacer from '../../components/AndroidStatusBarSpacer';
import {normalizeEthiopianMonth} from '../../utils/ethiopianCalendar';

const NotificationSettings = () => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const navigation = useNavigation();
  const {data: devotions = []} = useGetDevotionsQuery();

  const [notificationTime, setNotificationTime] = useState(new Date());
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
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

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      const settings = await NotificationService.getDailyNotificationSettings();
      const savedTime = new Date();
      savedTime.setHours(settings.time.hour, settings.time.minute, 0, 0);
      setNotificationTime(savedTime);
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const getCurrentDevotion = () => {
    if (devotions.length === 0) return null;

    const today = new Date();
    const [year, month, day] = toEthiopian(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate(),
    );
    const ethiopianMonth = ethiopianMonths[month];

    return (
      devotions.find(
        devotion =>
          normalizeEthiopianMonth(devotion.month) ===
            normalizeEthiopianMonth(ethiopianMonth) &&
          Number(devotion.day) === day,
      ) || null
    );
  };

  const handleTimeChange = async selectedTime => {
    setTimePickerVisibility(false);
    setNotificationTime(selectedTime);

    const time = {
      hour: selectedTime.getHours(),
      minute: selectedTime.getMinutes(),
    };

    try {
      await NotificationService.updateDailyNotificationTime(time);

      let devotion = getCurrentDevotion();
      if (!devotion) {
        devotion = await NotificationService.getTodaysDevotion();
      }
      if (devotion) {
        const success =
          await NotificationService.scheduleDailyVerseNotification(
            devotion,
            time,
          );

        if (success) {
          Alert.alert(
            'Time Updated',
            `Daily verse notifications will now be sent at ${formatTime(
              selectedTime,
            )}`,
            [{text: 'OK'}],
          );
        } else {
          const detailedError = NotificationService.getLastScheduleError();
          Alert.alert(
            'Error',
            detailedError
              ? `Failed to schedule notification.\n\n${detailedError}`
              : 'Failed to schedule notification. Please try again.',
            [{text: 'OK'}],
          );
        }
      } else {
        Alert.alert(
          'No devotion data',
          'Could not schedule. Open the Home screen first to load devotions, then set the time again.',
          [{text: 'OK'}],
        );
      }
    } catch (error) {
      console.error('Error updating notification time:', error);
      Alert.alert(
        'Error',
        'Failed to update notification time. Please try again.',
        [{text: 'OK'}],
      );
    }
  };

  const handleTestNotification = async () => {
    let devotion = getCurrentDevotion();
    if (!devotion) {
      devotion = await NotificationService.getTodaysDevotion();
    }
    if (devotion) {
      try {
        const success = await NotificationService.showTestNotification(
          devotion,
        );
        if (success) {
          Alert.alert(
            'Test Notification Sent',
            'Check your notification panel to see how the daily verse notification will appear.',
            [{text: 'OK'}],
          );
        } else {
          Alert.alert(
            'Permission Required',
            'Notifications are blocked. Please enable them in Android Settings > Apps > Ezra Seminary > Notifications.',
            [{text: 'OK'}],
          );
        }
      } catch (error) {
        console.error('Error sending test notification:', error);
        Alert.alert(
          'Error',
          'Failed to send test notification. Please try again.',
          [{text: 'OK'}],
        );
      }
    } else {
      Alert.alert(
        'No Devotion Available',
        'Unable to send test notification. Please try again later.',
        [{text: 'OK'}],
      );
    }
  };

  const formatTime = time => {
    return time.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={darkMode ? tw`bg-secondary-9 h-full` : tw`bg-primary-1 h-full`}>
      <ScrollView style={tw`flex-1`}>
        <View style={tw`p-4`}>
          <AndroidStatusBarSpacer minHeight={4} />
          {/* Header */}
          <View style={tw`flex-row items-center mb-6`}>
            <TouchableOpacity onPress={handleBackPress} style={tw`mr-4`}>
              <ArrowSquareLeft
                size={32}
                color={darkMode ? '#FFFFFF' : '#000000'}
                weight="fill"
              />
            </TouchableOpacity>
            <Bell
              size={24}
              color={darkMode ? '#FFFFFF' : '#000000'}
              weight="fill"
            />
            <Text
              style={[
                tw`text-xl font-nokia-bold ml-2`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
              ]}>
              Notification Settings
            </Text>
          </View>

          {/* Time Picker */}
          <TouchableOpacity
            style={[
              tw`flex-row justify-between items-center p-4 rounded-lg mb-4`,
              darkMode ? tw`bg-secondary-8` : tw`bg-primary-2`,
            ]}
            onPress={() => setTimePickerVisibility(true)}>
            <View style={tw`flex-row items-center`}>
              <Clock size={20} color={darkMode ? '#FFFFFF' : '#000000'} />
              <Text
                style={[
                  tw`font-nokia-bold text-base ml-2`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                ]}>
                Notification Time
              </Text>
            </View>
            <Text style={[tw`font-nokia-bold text-base`, tw`text-accent-6`]}>
              {formatTime(notificationTime)}
            </Text>
          </TouchableOpacity>

          {/* Test Notification Button */}
          <TouchableOpacity
            style={[
              tw`flex-row justify-center items-center p-4 rounded-lg mb-4`,
              tw`bg-accent-6`,
            ]}
            onPress={handleTestNotification}>
            <TestTube size={20} color="#FFFFFF" />
            <Text style={tw`font-nokia-bold text-primary-1 ml-2`}>
              Send Test Notification
            </Text>
          </TouchableOpacity>

          {/* Info Text */}
          <View
            style={[
              tw`p-4 rounded-lg mb-4`,
              darkMode ? tw`bg-secondary-8` : tw`bg-primary-2`,
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-sm text-center`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-4`,
              ]}>
              You will receive daily verse notifications at{' '}
              {formatTime(notificationTime)}
            </Text>
          </View>

          {/* Additional Info */}
          <View
            style={[
              tw`p-4 rounded-lg`,
              darkMode ? tw`bg-secondary-8` : tw`bg-primary-2`,
            ]}>
            <Text
              style={[
                tw`font-nokia-bold text-xs text-center`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-4`,
              ]}>
              Notifications will include the daily verse title, scripture text,
              and chapter reference. You can tap the notification to open the
              devotional section of the app.
            </Text>
          </View>
        </View>
      </ScrollView>

      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleTimeChange}
        onCancel={() => setTimePickerVisibility(false)}
        date={notificationTime}
        is24Hour={false}
      />
    </SafeAreaView>
  );
};

export default NotificationSettings;
