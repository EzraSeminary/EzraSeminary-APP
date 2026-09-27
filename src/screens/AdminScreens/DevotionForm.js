import React, {useState} from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {
  ArrowLeft,
  FloppyDisk,
  MusicNotesSimple,
  UploadSimple,
  X,
} from 'phosphor-react-native';
import tw from './../../../tailwind';
import {
  useCreateDevotionMutation,
  useUpdateDevotionMutation,
} from '../../redux/api-slices/apiSlice';
import Toast from 'react-native-toast-message';
import {
  ETHIOPIAN_MONTHS,
  normalizeEthiopianMonth,
} from '../../utils/ethiopianCalendar';
import {getDevotionalAudioUrl} from '../../utils/devotionalAudio';
import {getSeriesLabel, isSeriesDevotion} from '../../utils/devotionalSeries';
import AndroidStatusBarSpacer from '../../components/AndroidStatusBarSpacer';

const months = ETHIOPIAN_MONTHS.filter(Boolean).map(normalizeEthiopianMonth);

const DevotionForm = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const darkMode = useSelector(state => state.ui.darkMode);
  const devotion = route.params?.devotion;
  const routeYear = route.params?.year;
  const isEditing = Boolean(devotion?._id);
  const existingAudioUrl = getDevotionalAudioUrl(devotion);

  const [year, setYear] = useState(String(devotion?.year || routeYear || ''));
  const [isSeries, setIsSeries] = useState(isSeriesDevotion(devotion));
  const [month, setMonth] = useState(
    normalizeEthiopianMonth(devotion?.month) || months[0],
  );
  const [day, setDay] = useState(String(devotion?.day || ''));
  const [seriesTitle, setSeriesTitle] = useState(
    getSeriesLabel(devotion) === 'Series' ? '' : getSeriesLabel(devotion),
  );
  const [seriesOrder, setSeriesOrder] = useState(
    String(
      devotion?.seriesDay || devotion?.seriesOrder || devotion?.order || '',
    ),
  );
  const [title, setTitle] = useState(devotion?.title || '');
  const [chapter, setChapter] = useState(devotion?.chapter || '');
  const [verse, setVerse] = useState(
    devotion?.verse || devotion?.mainVerse || devotion?.main_verse || '',
  );
  const [body, setBody] = useState(
    Array.isArray(devotion?.body)
      ? devotion.body
          .map(block => block?.value || block?.text || block)
          .filter(Boolean)
          .join('\n\n')
      : devotion?.body || '',
  );
  const [prayer, setPrayer] = useState(devotion?.prayer || '');
  const [audioFile, setAudioFile] = useState(null);
  const [removeAudio, setRemoveAudio] = useState(false);

  const [createDevotion, {isLoading: isCreating}] = useCreateDevotionMutation();
  const [updateDevotion, {isLoading: isUpdating}] = useUpdateDevotionMutation();
  const isLoading = isCreating || isUpdating;

  const pickAudio = async () => {
    try {
      const DocumentPickerModule = require('react-native-document-picker');
      const DocumentPicker =
        DocumentPickerModule.default || DocumentPickerModule;
      const pickerTypes = DocumentPickerModule.types || {};
      const [file] = await DocumentPicker.pick({
        type: [pickerTypes.audio || 'audio/*'],
        copyTo: 'cachesDirectory',
      });
      if (file) {
        setAudioFile(file);
        setRemoveAudio(false);
      }
    } catch (error) {
      const DocumentPickerModule = require('react-native-document-picker');
      const DocumentPicker =
        DocumentPickerModule.default || DocumentPickerModule;
      if (!DocumentPicker.isCancel(error)) {
        Toast.show({
          type: 'error',
          text1: 'Audio selection failed',
          text2: 'Please choose a valid audio file.',
        });
      }
    }
  };

  const clearAudio = () => {
    setAudioFile(null);
    setRemoveAudio(Boolean(existingAudioUrl));
  };

  const appendIfPresent = (formData, key, value) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      formData.append(key, String(value).trim());
    }
  };

  const handleSave = async () => {
    if (!year.trim() || !title.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing details',
        text2: 'Year and title are required.',
      });
      return;
    }

    if (!isSeries && (!month || !day.trim())) {
      Toast.show({
        type: 'error',
        text1: 'Missing date',
        text2: 'Month and day are required for calendar devotions.',
      });
      return;
    }

    const formData = new FormData();
    formData.append('year', year.trim());
    formData.append('title', title.trim());
    appendIfPresent(formData, 'chapter', chapter);
    appendIfPresent(formData, 'verse', verse);
    appendIfPresent(formData, 'mainVerse', verse);
    appendIfPresent(formData, 'body', body);
    appendIfPresent(formData, 'prayer', prayer);
    formData.append('isSeries', isSeries ? 'true' : 'false');

    if (isSeries) {
      appendIfPresent(formData, 'seriesTitle', seriesTitle);
      appendIfPresent(formData, 'seriesName', seriesTitle);
      appendIfPresent(formData, 'seriesDay', seriesOrder);
      appendIfPresent(formData, 'seriesOrder', seriesOrder);
      appendIfPresent(formData, 'order', seriesOrder);
    } else {
      formData.append('month', month);
      formData.append('day', day.trim());
    }

    if (audioFile) {
      formData.append('audio', {
        uri: audioFile.fileCopyUri || audioFile.uri,
        type: audioFile.type || 'audio/mpeg',
        name: audioFile.name || 'devotional-audio.mp3',
      });
    }
    if (removeAudio) {
      formData.append('removeAudio', 'true');
    }

    try {
      if (isEditing) {
        await updateDevotion({id: devotion._id, formData}).unwrap();
        Toast.show({type: 'success', text1: 'Devotion updated'});
      } else {
        await createDevotion(formData).unwrap();
        Toast.show({type: 'success', text1: 'Devotion created'});
      }
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: error?.data?.message || 'Please try again.',
      });
    }
  };

  const inputStyle = [
    tw`font-nokia-bold rounded-3 px-3 py-3 mb-3 border`,
    {
      color: darkMode ? '#FFFFFF' : '#111827',
      backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
      borderColor: darkMode ? '#374151' : '#E5E7EB',
    },
  ];

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
          {isEditing ? 'Edit Devotion' : 'New Devotion'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isLoading}
          style={tw`p-2`}>
          {isLoading ? (
            <ActivityIndicator color="#EA9215" />
          ) : (
            <FloppyDisk size={24} color="#EA9215" weight="bold" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={tw`p-4 pb-10`}>
        <TextInput
          value={year}
          onChangeText={setYear}
          editable={!isEditing && !routeYear}
          keyboardType="number-pad"
          placeholder="Ethiopian year"
          placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
          style={[inputStyle, (isEditing || routeYear) && tw`opacity-70`]}
        />

        <View
          style={[
            tw`rounded-4 border p-4 mb-3`,
            {
              backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
              borderColor: darkMode ? '#374151' : '#E5E7EB',
            },
          ]}>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-1 pr-3`}>
              <Text
                style={[
                  tw`font-nokia-bold text-base`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                ]}>
                Series entry
              </Text>
              <Text
                style={[
                  tw`font-nokia-bold text-xs mt-1`,
                  darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                ]}>
                Series devotions use order/date instead of month and day.
              </Text>
            </View>
            <Switch value={isSeries} onValueChange={setIsSeries} />
          </View>
        </View>

        {isSeries ? (
          <>
            <TextInput
              value={seriesTitle}
              onChangeText={setSeriesTitle}
              placeholder="Series name"
              placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
              style={inputStyle}
            />
            <TextInput
              value={seriesOrder}
              onChangeText={setSeriesOrder}
              keyboardType="number-pad"
              placeholder="Series day/order"
              placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
              style={inputStyle}
            />
          </>
        ) : (
          <>
            <View
              style={[
                tw`rounded-3 mb-3 border overflow-hidden`,
                {
                  backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                  borderColor: darkMode ? '#374151' : '#E5E7EB',
                },
              ]}>
              <Picker
                selectedValue={month}
                onValueChange={setMonth}
                dropdownIconColor="#EA9215"
                style={{color: darkMode ? '#FFFFFF' : '#111827'}}>
                {months.map(item => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>
            <TextInput
              value={day}
              onChangeText={setDay}
              keyboardType="number-pad"
              placeholder="Day"
              placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
              style={inputStyle}
            />
          </>
        )}

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
          style={inputStyle}
        />
        <TextInput
          value={chapter}
          onChangeText={setChapter}
          placeholder="Chapter"
          placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
          style={inputStyle}
        />
        <TextInput
          value={verse}
          onChangeText={setVerse}
          placeholder="Verse"
          placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
          style={[inputStyle, tw`min-h-24`]}
          multiline
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Body"
          placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
          style={[inputStyle, tw`min-h-36`]}
          multiline
          textAlignVertical="top"
        />
        <TextInput
          value={prayer}
          onChangeText={setPrayer}
          placeholder="Prayer"
          placeholderTextColor={darkMode ? '#9CA3AF' : '#6B7280'}
          style={[inputStyle, tw`min-h-24`]}
          multiline
          textAlignVertical="top"
        />

        <View
          style={[
            tw`rounded-4 border border-accent-6 p-4 mb-4`,
            {backgroundColor: darkMode ? '#1F2937' : '#FFF8EC'},
          ]}>
          <Text
            style={[
              tw`font-nokia-bold text-base mb-3`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Optional Audio
          </Text>
          {audioFile || (existingAudioUrl && !removeAudio) ? (
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <View style={tw`flex-row items-center flex-1 pr-3`}>
                <MusicNotesSimple size={22} color="#EA9215" weight="bold" />
                <Text
                  style={[
                    tw`font-nokia-bold text-sm ml-2 flex-1`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}
                  numberOfLines={1}>
                  {audioFile?.name || 'Existing audio'}
                </Text>
              </View>
              <TouchableOpacity onPress={clearAudio} style={tw`p-2`}>
                <X size={20} color="#EF4444" weight="bold" />
              </TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity
            onPress={pickAudio}
            style={tw`flex-row items-center justify-center bg-accent-6 rounded-3 py-3`}>
            <UploadSimple size={20} color="#FFFFFF" weight="bold" />
            <Text style={tw`font-nokia-bold text-white ml-2`}>
              Choose audio file
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DevotionForm;
