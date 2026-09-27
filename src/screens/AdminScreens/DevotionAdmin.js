import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {
  ArrowLeft,
  CalendarBlank,
  MusicNotesSimple,
  Pencil,
  Plus,
  Trash,
} from 'phosphor-react-native';
import tw from './../../../tailwind';
import {
  useDeleteDevotionMutation,
  useGetAdminDevotionPreviewQuery,
  useGetAdminDevotionsQuery,
  useGetAvailableYearsQuery,
} from '../../redux/api-slices/apiSlice';
import Toast from 'react-native-toast-message';
import DevotionalAudioPlayer from '../../components/DevotionalAudioPlayer';
import {getDevotionalAudioUrl} from '../../utils/devotionalAudio';
import {
  getSeriesLabel,
  isSeriesDevotion,
  toEthDateParts,
} from '../../utils/devotionalSeries';
import AndroidStatusBarSpacer from '../../components/AndroidStatusBarSpacer';

const formatDate = date => date.toISOString().slice(0, 10);

const getDateLabel = date => {
  const eth = toEthDateParts(date);
  return `${formatDate(date)} • ${eth.monthName} ${eth.day}, ${eth.year}`;
};

const DevotionAdmin = () => {
  const navigation = useNavigation();
  const darkMode = useSelector(state => state.ui.darkMode);
  const [previewDate, setPreviewDate] = useState(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const previewYear = toEthDateParts(previewDate).year;

  const {data: years = []} = useGetAvailableYearsQuery();
  const {
    data: devotions = [],
    isLoading,
    refetch,
  } = useGetAdminDevotionsQuery({year: previewYear});
  const {data: previewDevotion, isFetching: isPreviewLoading} =
    useGetAdminDevotionPreviewQuery({
      date: formatDate(previewDate),
      year: previewYear,
    });
  const [deleteDevotion, {isLoading: isDeleting}] = useDeleteDevotionMutation();

  const sortedDevotions = useMemo(
    () =>
      [...devotions].sort((a, b) => {
        const aSeries = isSeriesDevotion(a) ? 0 : 1;
        const bSeries = isSeriesDevotion(b) ? 0 : 1;
        if (aSeries !== bSeries) {
          return aSeries - bSeries;
        }
        return Number(a.day || a.order || 0) - Number(b.day || b.order || 0);
      }),
    [devotions],
  );

  const handleDelete = devotion => {
    Alert.alert('Delete Devotion', `Delete "${devotion.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDevotion(devotion._id).unwrap();
            Toast.show({type: 'success', text1: 'Devotion deleted'});
            refetch();
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'Delete failed',
              text2: error?.data?.message || 'Please try again.',
            });
          }
        },
      },
    ]);
  };

  const renderDevotionMeta = devotion => {
    if (isSeriesDevotion(devotion)) {
      return `${devotion.year || previewYear} • ${getSeriesLabel(devotion)}`;
    }
    return `${devotion.year || previewYear} • ${devotion.month || ''} ${
      devotion.day || ''
    }`;
  };

  return (
    <SafeAreaView
      style={[tw`flex-1`, {backgroundColor: darkMode ? '#111827' : '#F9FAFB'}]}>
      <AndroidStatusBarSpacer minHeight={4} />
      <View
        style={[
          tw`flex-row items-center justify-between px-4 py-3 border-b`,
          {
            backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
            borderBottomColor: darkMode ? '#374151' : '#E5E7EB',
          },
        ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
          <ArrowLeft
            size={24}
            color={darkMode ? '#FFFFFF' : '#374151'}
            weight="bold"
          />
        </TouchableOpacity>
        <Text
          style={[
            tw`font-nokia-bold text-lg flex-1 mx-3`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
          ]}>
          Devotions
        </Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('DevotionForm', {year: previewYear})
          }
          style={tw`p-2`}>
          <Plus size={24} color="#EA9215" weight="bold" />
        </TouchableOpacity>
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4`}>
        <View
          style={[
            tw`rounded-4 border border-accent-6 p-4 mb-4`,
            {backgroundColor: darkMode ? '#1F2937' : '#FFFFFF'},
          ]}>
          <Text
            style={[
              tw`font-nokia-bold text-base mb-3`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Admin Preview Date
          </Text>
          <TouchableOpacity
            onPress={() => setDatePickerVisible(true)}
            style={tw`flex-row items-center justify-between rounded-3 px-3 py-3 bg-accent-6`}>
            <Text style={tw`font-nokia-bold text-white flex-1`}>
              {getDateLabel(previewDate)}
            </Text>
            <CalendarBlank size={22} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={datePickerVisible}
            mode="date"
            date={previewDate}
            onCancel={() => setDatePickerVisible(false)}
            onConfirm={date => {
              setPreviewDate(date);
              setDatePickerVisible(false);
            }}
          />

          <View
            style={[
              tw`rounded-4 mt-4 p-4`,
              {backgroundColor: darkMode ? '#374151' : '#FFF8EC'},
            ]}>
            {isPreviewLoading ? (
              <ActivityIndicator color="#EA9215" />
            ) : previewDevotion?._id ? (
              <>
                <Text style={[tw`font-nokia-bold text-xs text-accent-6 mb-1`]}>
                  {renderDevotionMeta(previewDevotion)}
                </Text>
                <Text
                  style={[
                    tw`font-nokia-bold text-xl mb-2`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  {previewDevotion.title}
                </Text>
                <Text
                  style={[
                    tw`font-nokia-bold text-sm`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}
                  numberOfLines={3}>
                  {previewDevotion.verse || previewDevotion.mainVerse || ''}
                </Text>
                <DevotionalAudioPlayer
                  audioUrl={getDevotionalAudioUrl(previewDevotion)}
                  darkMode={darkMode}
                  title={previewDevotion.title}
                />
              </>
            ) : (
              <Text
                style={[
                  tw`font-nokia-bold text-sm text-center`,
                  darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                ]}>
                No devotion is available for this preview date.
              </Text>
            )}
          </View>
        </View>

        <Text
          style={[
            tw`font-nokia-bold text-base mb-3`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
          ]}>
          {previewYear} Entries {years.length ? `• ${years.length} years` : ''}
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#EA9215" style={tw`mt-8`} />
        ) : sortedDevotions.length === 0 ? (
          <View style={tw`py-10 items-center`}>
            <Text
              style={[
                tw`font-nokia-bold text-sm`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              No devotions found for this year.
            </Text>
          </View>
        ) : (
          sortedDevotions.map(devotion => (
            <View
              key={devotion._id}
              style={[
                tw`rounded-4 p-4 mb-3 border`,
                {
                  backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                  borderColor: darkMode ? '#374151' : '#E5E7EB',
                },
              ]}>
              <View style={tw`flex-row justify-between`}>
                <View style={tw`flex-1 pr-3`}>
                  <Text
                    style={[tw`font-nokia-bold text-xs text-accent-6 mb-1`]}>
                    {renderDevotionMeta(devotion)}
                  </Text>
                  <Text
                    style={[
                      tw`font-nokia-bold text-base`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}
                    numberOfLines={2}>
                    {devotion.title}
                  </Text>
                  {getDevotionalAudioUrl(devotion) ? (
                    <View style={tw`flex-row items-center mt-2`}>
                      <MusicNotesSimple
                        size={16}
                        color="#EA9215"
                        weight="bold"
                      />
                      <Text
                        style={tw`font-nokia-bold text-accent-6 text-xs ml-1`}>
                        Audio attached
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={tw`flex-row items-start`}>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('DevotionForm', {
                        devotion,
                        year: previewYear,
                      })
                    }
                    style={tw`p-2`}>
                    <Pencil size={20} color="#EA9215" weight="bold" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(devotion)}
                    disabled={isDeleting}
                    style={tw`p-2`}>
                    <Trash
                      size={20}
                      color={isDeleting ? '#9CA3AF' : '#EF4444'}
                      weight="bold"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DevotionAdmin;
