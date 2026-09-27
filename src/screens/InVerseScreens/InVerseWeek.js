import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  Modal,
  Linking,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useBottomTabBarHeight} from '@react-navigation/bottom-tabs';
import DateConverter from './DateConverter';
import {
  useGetInVerseOfDayQuery,
  useGetInVerseOfDayLessonQuery,
} from '../../services/InVerseapi';
import {useNavigation} from '@react-navigation/native';
import {ArrowSquareLeft, CaretUp, CaretDown} from 'phosphor-react-native';
import HTMLView from 'react-native-htmlview';
import tw from '../../../tailwind';
import LinearGradient from 'react-native-linear-gradient';
import ErrorScreen from '../../components/ErrorScreen';
import {format} from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ensureOnlineOrNotify} from '../../utils/refreshCacheManager';
import useReaderFontScale from '../../hooks/useReaderFontScale';
import AndroidStatusBarSpacer from '../../components/AndroidStatusBarSpacer';
import ReaderFontSizeControl from '../../components/ReaderFontSizeControl';
import useReaderFontFamily from '../../hooks/useReaderFontFamily';
import HtmlContent from '../../components/HtmlContent';

const normalizeVerseLookupKey = value =>
  String(value || '')
    .toLowerCase()
    .replace(/[“”"'/\\()[\]{}.,;፣፤፥፦፧።]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractVerseAddress = value => {
  const match = String(value || '').match(/\d+:\d+(?:-\d+)?/);
  return match?.[0] || '';
};

const normalizeVerseContent = value =>
  String(value || '')
    .replace(/^\s*(<br\s*\/?>|&nbsp;|\s)+/gi, '')
    .trim();

const normalizeVisibleText = value =>
  String(value || '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .trim();

const resolveVerseContent = value => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(resolveVerseContent).filter(Boolean).join(' ');
  }

  if (value && typeof value === 'object') {
    const preferredKeys = [
      'content',
      'text',
      'verse',
      'value',
      'body',
      'am',
      'en',
    ];

    for (const key of preferredKeys) {
      const resolved = resolveVerseContent(value[key]);
      if (normalizeVerseContent(resolved)) {
        return resolved;
      }
    }
  }

  return '';
};

// Replace the NoteBox component with this simpler version
const NoteInput = ({darkMode}) => {
  const [text, setText] = useState('');

  return (
    <TextInput
      multiline
      value={text}
      onChangeText={setText}
      placeholder="Write your note here..."
      placeholderTextColor="#AAB0B4"
      style={[
        tw`bg-primary-2 border border-accent-6 rounded-lg px-3 py-2 min-h-[60px]`,
        darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
        tw`font-nokia-bold text-base`,
      ]}
      textAlignVertical="top"
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      numberOfLines={4}
    />
  );
};

// Replace the NoteInput component with this new modal-based system
const NoteModal = ({isVisible, onClose, onSave, initialText, darkMode}) => {
  const [noteText, setNoteText] = useState(initialText || '');

  const handleSave = () => {
    onSave(noteText);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}>
      <View
        style={tw`flex-1 justify-center items-center bg-secondary-9 bg-opacity-80`}>
        <View
          style={[
            tw`w-11/12 bg-primary-2 p-4 rounded-2 border border-accent-8`,
            darkMode ? tw`bg-secondary-9` : null,
          ]}>
          <TextInput
            multiline
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Write your note here..."
            placeholderTextColor="#AAB0B4"
            style={[
              tw` border border-accent-6 rounded-2 px-3 py-2 min-h-[120px] mb-4`,
              darkMode
                ? tw`text-primary-1 bg-secondary-7`
                : tw`text-secondary-6 bg-primary-2`,
              tw`font-nokia-bold text-base`,
            ]}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
          <View style={tw`flex-row justify-end gap-4`}>
            <TouchableOpacity
              onPress={onClose}
              style={tw`px-4 py-2 rounded-lg border border-accent-6`}>
              <Text
                style={[
                  tw`font-nokia-bold`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                ]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={tw`px-4 py-2 rounded-lg bg-accent-6`}>
              <Text style={tw`font-nokia-bold text-primary-1`}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const InVerseWeek = ({route}) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const {InVerse, weekId} = route.params;
  const scrollRef = useRef();
  const navigation = useNavigation();
  const [check, setCheck] = useState('01');
  const daysOfWeek = ['አርብ', 'ቅዳሜ', 'እሁድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ'];
  const daysOfWeekEng = [
    'Friday',
    'Saturday',
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
  ];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVerseKey, setSelectedVerseKey] = useState('');
  const [selectedVerseContent, setSelectedVerseContent] = useState('');
  const language = useSelector(state => state.language.language);

  // notes for each <code> block
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [notes, setNotes] = useState({});

  const {
    data: InVerseQuarter,
    error: quarterError,
    isLoading: isQuarterLoading,
  } = useGetInVerseOfDayQuery({
    path: InVerse,
    id: weekId,
  });

  const {
    data: InVerseWeek,
    isLoading: isWeekLoading,
    error: weekError,
    refetch,
  } = useGetInVerseOfDayLessonQuery({
    path: InVerse,
    id: weekId,
    day: check,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({y: 0, animated: true});
  }, [check]);

  const darkMode = useSelector(state => state.ui.darkMode);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const {fontScale, height: windowHeight} = useWindowDimensions();
  const {
    scaleTextSize,
    increaseFontScale,
    decreaseFontScale,
    readerFontScalePercentage,
  } = useReaderFontScale();
  const {readerFontStyle} = useReaderFontFamily();
  const [showFontSizePopup, setShowFontSizePopup] = useState(false);
  const handleReaderScrollBegin = useCallback(() => {
    setShowFontSizePopup(false);
  }, []);
  const accessibilityScale = Math.max(
    1,
    Math.min(Math.max(fontScale, 1), 1.8) * (readerFontScalePercentage / 100),
  );
  const noteSectionSpacing = Math.max(
    scaleTextSize(8),
    Math.round(8 * accessibilityScale),
  );
  const noteCardBottomSpacing = Math.max(
    scaleTextSize(24),
    Math.round(24 * accessibilityScale),
  );

  // Add timeout for loading state
  useEffect(() => {
    let timeoutId;
    if (isQuarterLoading || isWeekLoading) {
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout
    } else {
      setLoadingTimeout(false);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isQuarterLoading, isWeekLoading]);

  // Load notes from AsyncStorage when component mounts or when weekId/check changes
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const savedNotes = await AsyncStorage.getItem(
          `notes-${weekId}-${check}`,
        );
        if (savedNotes) {
          setNotes(JSON.parse(savedNotes));
        } else {
          setNotes({});
        }
      } catch (error) {
        console.error('Error loading notes:', error);
      }
    };
    loadNotes();
  }, [weekId, check]);

  // Save notes to AsyncStorage whenever they change
  const handleSaveNote = useCallback(
    async (noteId, text) => {
      try {
        const newNotes = {
          ...notes,
          [noteId]: text,
        };
        setNotes(newNotes);
        await AsyncStorage.setItem(
          `notes-${weekId}-${check}`,
          JSON.stringify(newNotes),
        );
      } catch (error) {
        console.error('Error saving note:', error);
      }
    },
    [notes, weekId, check],
  );

  const handleVerseClick = useCallback(
    verseKey => {
      if (
        InVerseWeek &&
        InVerseWeek.bible &&
        InVerseWeek.bible.length > 0 &&
        InVerseWeek.bible[0].verses &&
        InVerseWeek.bible[0].verses[verseKey]
      ) {
        setSelectedVerseKey(verseKey);
        setSelectedVerseContent(InVerseWeek.bible[0].verses[verseKey]);
        setIsModalOpen(true);
      } else {
        console.error(
          `Verse key "${verseKey}" not found in InVerseWeek:`,
          InVerseWeek,
        );
      }
    },
    [InVerseWeek],
  );

  const onCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedVerseKey('');
    setSelectedVerseContent('');
  }, []);

  const onRefresh = useCallback(async () => {
    const hasInternet = await ensureOnlineOrNotify();
    if (!hasInternet) {
      return;
    }
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const [showSupplementalNotes, setShowSupplementalNotes] = useState(false);

  const handleToggleSupplementalNotes = useCallback(() => {
    setShowSupplementalNotes(prev => !prev);
  }, []);

  const onPrevious = () => {
    if (check !== '01') {
      setCheck(prev => (parseInt(prev, 10) - 1).toString().padStart(2, '0'));
      scrollRef.current?.scrollTo({y: 0, animated: true});
    }
  };

  const onNext = () => {
    if (check !== '07') {
      setCheck(prev => (parseInt(prev, 10) + 1).toString().padStart(2, '0'));
      scrollRef.current?.scrollTo({y: 0, animated: true});
    }
  };

  // Styles definition should be here, after hooks and before early returns if it uses darkMode
  const styles = StyleSheet.create({
    text: {...tw`font-nokia-bold`, ...readerFontStyle},
    h3: darkMode
      ? {
          ...tw`font-nokia-bold text-primary-1`,
          ...readerFontStyle,
          fontSize: scaleTextSize(24),
        }
      : {
          ...tw`font-nokia-bold text-secondary-6`,
          ...readerFontStyle,
          fontSize: scaleTextSize(24),
        },
    p: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold py-2`,
          ...readerFontStyle,
          fontSize: scaleTextSize(17),
          lineHeight: scaleTextSize(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold py-2`,
          ...readerFontStyle,
          fontSize: scaleTextSize(17),
          lineHeight: scaleTextSize(26),
        },
    blockquote: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold`,
          ...readerFontStyle,
          fontSize: scaleTextSize(20),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold`,
          ...readerFontStyle,
          fontSize: scaleTextSize(20),
        },
    ol: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold py-2`,
          ...readerFontStyle,
          fontSize: scaleTextSize(17),
          lineHeight: scaleTextSize(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold py-2`,
          ...readerFontStyle,
          fontSize: scaleTextSize(17),
          lineHeight: scaleTextSize(26),
        },
    ul: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold py-2`,
          ...readerFontStyle,
          fontSize: scaleTextSize(17),
          lineHeight: scaleTextSize(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold py-2`,
          ...readerFontStyle,
          fontSize: scaleTextSize(17),
          lineHeight: scaleTextSize(26),
        },
    li: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold py-1`,
          ...readerFontStyle,
          fontSize: scaleTextSize(17),
          lineHeight: scaleTextSize(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold py-1`,
          ...readerFontStyle,
          fontSize: scaleTextSize(17),
          lineHeight: scaleTextSize(26),
        },
    'blockquote.p': {...tw`font-nokia-bold text-4xl`, ...readerFontStyle},
    em: tw`mt-4`,
    code: {
      ...tw`font-nokia-bold`,
      ...readerFontStyle,
      color: '#EA9215',
      backgroundColor: darkMode ? '#333' : '#f5f5f5',
      fontSize: scaleTextSize(16),
      lineHeight: scaleTextSize(24),
      padding: 8,
      borderRadius: 4,
    },
    strong: {fontSize: scaleTextSize(20)},
    a: {
      ...tw`text-accent-6 font-nokia-bold py-2`,
      ...readerFontStyle,
    },
    table: tw`border border-gray-300 my-4`,
    td: tw`border-r border-gray-300 p-2`,
  });

  // Memoize renderNode
  const renderNode = useCallback(
    (node, index, siblings, parent, defaultRenderer) => {
      /* 1 ─────────  PARAGRAPH  ───────── */
      if (node.name === 'p') {
        // Special case for supplemental notes toggle, which needs access to showSupplementalNotes state
        if (node.children[0]?.data === 'Supplemental EGW Notes') {
          return (
            <TouchableOpacity
              key={index}
              onPress={handleToggleSupplementalNotes}
              style={[
                tw`flex flex-row justify-between p-2 rounded-lg mt-4 border border-lg h-8`,
              ]}>
              <Text
                style={[
                  tw`font-nokia-bold`,
                  darkMode ? tw`text-accent-6` : tw`text-secondary-6`,
                  {fontSize: scaleTextSize(16)},
                ]}>
                {node.children[0].data}
              </Text>
              {showSupplementalNotes ? (
                <CaretUp size={24} color={darkMode ? '#FFFFFF' : '#000000'} />
              ) : (
                <CaretDown size={24} color={darkMode ? '#FFFFFF' : '#000000'} />
              )}
            </TouchableOpacity>
          );
        }
        // Default paragraph rendering
        return (
          <Text
            key={index}
            style={[
              styles.p, // font-nokia-bold, colour, justify, etc.
              {flexWrap: 'wrap'}, // allow the text itself to wrap
            ]}>
            {defaultRenderer(node.children, node)}
          </Text>
        );
      }

      // Handle verse links (a tags) - render as inline Text with specific styles
      if (node.name === 'a') {
        const {class: className, verse: verseReference} = node.attribs;
        const linkStyle = [tw`font-nokia-bold text-accent-6 underline`];
        if (className === 'verse' && verseReference) {
          const onPress = () => handleVerseClick(verseReference); // handleVerseClick needs to be stable or in deps
          return (
            <Text key={index} style={linkStyle} onPress={onPress}>
              {defaultRenderer(node.children, node)}{' '}
            </Text>
          );
        }
        return (
          <Text key={index} style={linkStyle}>
            {defaultRenderer(node.children, node)}
          </Text>
        );
      }

      // Handle blockquote handling
      if (node.name === 'blockquote') {
        const childrenWithStyles = node.children.map((child, childIndex) => {
          if (child.type === 'text') {
            return (
              <Text
                key={childIndex}
                style={[
                  tw`font-nokia-bold`,
                  darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                  {
                    fontSize: scaleTextSize(18),
                    lineHeight: scaleTextSize(26),
                  },
                  {flexWrap: 'wrap'},
                ]}>
                {child.data}
              </Text>
            );
          } else {
            return defaultRenderer([child], parent);
          }
        });
        return (
          <View
            key={index}
            style={[
              tw`border-l-4 border-accent-6 pl-4 flex flex-row flex-wrap text-wrap`,
            ]}>
            {childrenWithStyles}
          </View>
        );
      }

      // Keep table handling
      if (node.name === 'table') {
        return (
          <View key={index} style={styles.table}>
            {defaultRenderer(node.children, node)}
          </View>
        );
      }

      if (node.name === 'tr') {
        return (
          <View key={index} style={styles.tr}>
            {defaultRenderer(node.children, node)}
          </View>
        );
      }

      if (node.name === 'td') {
        return (
          <View key={index} style={styles.td}>
            {defaultRenderer(node.children, node)}
          </View>
        );
      }

      // Keep supplemental notes div handling
      if (
        node.name === 'div' &&
        node.attribs?.class === 'ss-donation-appeal-text'
      ) {
        return showSupplementalNotes ? (
          <View key={index} style={tw`mt-2`}>
            {defaultRenderer(node.children, node)}
          </View>
        ) : null;
      }

      // Note section handling
      if (node.name === 'code') {
        const codeContent = (node.children ?? [])
          .map(child => {
            if (child.type === 'text') {
              return child.data || '';
            } else if (child.type === 'tag') {
              // For tag elements, we'll handle them separately
              if (child.name === 'a' && child.attribs?.class === 'verse') {
                // Extract the text content from the verse element
                const verseText = child.children
                  .map(grandChild => grandChild.data || '')
                  .join('');
                return verseText;
              }
              // For other tags, extract their text content
              return child.children
                .map(grandChild => grandChild.data || '')
                .join('');
            }
            return '';
          })
          .join('');

        // Extract verse elements for rendering as links
        const verseElements = (node.children ?? [])
          .filter(
            child =>
              child.type === 'tag' &&
              child.name === 'a' &&
              child.attribs?.class === 'verse',
          )
          .map(child => ({
            verseRef: child.attribs.verse,
            text: child.children
              .map(grandChild => grandChild.data || '')
              .join(''),
          }));

        const noteId = `${weekId}-${check}-${index}-${codeContent.substring(
          0,
          20,
        )}`;
        const noteText = notes[noteId] || '';

        return (
          <View
            key={noteId}
            style={{
              width: '100%',
              maxWidth: '100%',
              alignSelf: 'stretch',
              marginTop: scaleTextSize(8),
              marginBottom: noteCardBottomSpacing,
            }}>
            <View
              style={[
                tw`rounded-lg p-2`,
                {
                  backgroundColor: darkMode ? '#333' : '#f5f5f5',
                  width: '100%',
                  maxWidth: '100%',
                },
              ]}>
              <View style={{width: '100%', maxWidth: '100%'}}>
                <View
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                  }}>
                  {node.children.map((child, childIndex) => {
                    if (child.type === 'text') {
                      return (
                        <Text
                          key={childIndex}
                          style={[
                            tw`font-nokia-bold`,
                            {
                              color: '#EA9215',
                              fontSize: scaleTextSize(16),
                              lineHeight: scaleTextSize(24),
                              maxWidth: '100%',
                              flexShrink: 1,
                            },
                          ]}>
                          {child.data || ''}
                        </Text>
                      );
                    } else if (
                      child.type === 'tag' &&
                      child.name === 'a' &&
                      child.attribs?.class === 'verse'
                    ) {
                      const verseText = child.children
                        .map(grandChild => grandChild.data || '')
                        .join('');
                      return (
                        <Text
                          key={childIndex}
                          style={[
                            tw`font-nokia-bold text-accent-6 underline`,
                            {
                              fontSize: scaleTextSize(16),
                              lineHeight: scaleTextSize(24),
                              maxWidth: '100%',
                              flexShrink: 1,
                            },
                          ]}
                          onPress={() => handleVerseClick(child.attribs.verse)}>
                          {verseText}
                        </Text>
                      );
                    } else if (child.type === 'tag') {
                      const childText = child.children
                        .map(grandChild => grandChild.data || '')
                        .join('');
                      return childText ? (
                        <Text
                          key={childIndex}
                          style={[
                            tw`font-nokia-bold`,
                            {
                              color: '#EA9215',
                              fontSize: scaleTextSize(16),
                              lineHeight: scaleTextSize(24),
                              maxWidth: '100%',
                              flexShrink: 1,
                            },
                          ]}>
                          {childText}
                        </Text>
                      ) : null;
                    }
                    return null;
                  })}
                </View>
              </View>
            </View>
            <View
              style={{
                marginTop: noteSectionSpacing,
                paddingBottom: noteSectionSpacing,
              }}>
              <View style={{gap: noteSectionSpacing}}>
                {noteText ? (
                  <View style={tw`w-full`}>
                    <Text
                      style={[
                        tw`font-nokia-bold`,
                        darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                        {
                          fontSize: scaleTextSize(16),
                          lineHeight: scaleTextSize(24),
                          textDecorationLine: 'underline',
                          textDecorationColor: '#EA9215',
                          textDecorationStyle: 'solid',
                          flexWrap: 'wrap',
                        },
                      ]}>
                      {noteText}
                    </Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  onPress={() => setActiveNoteId(noteId)}
                  style={[
                    tw`self-start px-3 rounded-full bg-accent-6`,
                    {
                      minHeight: scaleTextSize(36),
                      paddingVertical: Math.max(
                        scaleTextSize(5),
                        noteSectionSpacing - 2,
                      ),
                      justifyContent: 'center',
                    },
                  ]}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-primary-1`,
                      {
                        fontSize: scaleTextSize(14),
                        lineHeight: scaleTextSize(18),
                      },
                    ]}>
                    {noteText ? 'Edit Note' : 'Add Note'}
                  </Text>
                </TouchableOpacity>
              </View>
              <NoteModal
                isVisible={activeNoteId === noteId}
                onClose={() => setActiveNoteId(null)}
                onSave={text => handleSaveNote(noteId, text)}
                initialText={noteText}
                darkMode={darkMode}
              />
            </View>
          </View>
        );
      }

      return undefined;
    },
    [
      darkMode,
      handleVerseClick,
      handleToggleSupplementalNotes,
      showSupplementalNotes,
      styles,
      weekId,
      check,
      notes,
      setActiveNoteId,
      handleSaveNote,
      activeNoteId,
      noteCardBottomSpacing,
      noteSectionSpacing,
      scaleTextSize,
    ],
  );

  const handleBackButtonPress = () => {
    navigation.goBack();
  };
  const gradientColor = '#000000';
  const dateStyle = {
    ...tw`font-nokia-bold text-primary-6`,
    ...readerFontStyle,
    fontSize: scaleTextSize(18),
  };
  const modifiedContent = selectedVerseContent;

  // Show loading state while data is being fetched - but with timeout
  if ((isQuarterLoading || isWeekLoading) && !loadingTimeout) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <AndroidStatusBarSpacer minHeight={4} />
        <View
          style={[
            tw`mx-4 mt-4 p-3 rounded-3 border flex-row items-center`,
            {
              backgroundColor: darkMode ? '#374151' : '#F8FAFC',
              borderColor: '#E2E8F0',
            },
          ]}>
          <ActivityIndicator size="small" color="#EA9215" style={tw`mr-3`} />
          <Text
            style={[
              tw`font-nokia-bold text-sm`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            {language === 'en' ? 'Loading lesson...' : 'ትምህርቱን በመጫን ላይ...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if there's an error
  if (quarterError || weekError) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }>
          <View style={tw`border border-accent-6 rounded mb-4 mx-4 mt-4`}>
            <Text style={tw`font-nokia-bold text-accent-6 text-center py-4`}>
              {language === 'en'
                ? 'Unable to load lesson. Pull to retry.'
                : 'ትምህርቱን መጫን አልተቻለም። ለመሞከር ይጎትቱ።'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Validate that we have the required data
  if (!InVerseQuarter || !InVerseWeek || !InVerseWeek.content) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }>
          <View style={tw`border border-accent-6 rounded mb-4 mx-4 mt-4`}>
            <Text style={tw`font-nokia-bold text-accent-6 text-center py-4`}>
              {language === 'en'
                ? 'Lesson data not available. Pull to retry.'
                : 'የትምህርቱ ውሂብ አይገኝም። ለመሞከር ይጎትቱ።'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const {content} = InVerseWeek;
  const sanitizedContent = content.replace(/\n/g, '');

  const parseCustomDate = dateString => {
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  const formatDate = startDate => {
    try {
      const start = format(parseCustomDate(startDate), 'MMM dd');
      return `${start}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  return (
    <View style={[tw`flex-1`, darkMode ? tw`bg-secondary-9` : null]}>
      <AndroidStatusBarSpacer minHeight={4} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        ref={scrollRef}
        onScrollBeginDrag={handleReaderScrollBegin}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: tabBarHeight + insets.bottom + 64,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#EA9215']}
            tintColor="#EA9215"
          />
        }>
        <View style={tw`flex`}>
          <ImageBackground
            source={{uri: InVerseQuarter.lesson.cover}}
            style={tw`flex-5 flex-col justify-between py-6 px-4 h-80`}>
            <TouchableOpacity
              onPress={handleBackButtonPress}
              style={{zIndex: 1, marginTop: 12}}>
              <ArrowSquareLeft size={36} weight="fill" color={'#EA9215'} />
            </TouchableOpacity>
            <View
              style={{
                zIndex: 1,
                marginTop: 42,
                position: 'absolute',
                right: 20,
              }}>
              <ReaderFontSizeControl
                darkMode={darkMode}
                isVisible={showFontSizePopup}
                onToggle={() => setShowFontSizePopup(previous => !previous)}
                onDecrease={decreaseFontScale}
                onIncrease={increaseFontScale}
                percentage={readerFontScalePercentage}
              />
            </View>
            <LinearGradient
              pointerEvents="none"
              colors={[gradientColor, `${gradientColor}20`]}
              style={tw`absolute inset-0`}
              start={{x: 0.5, y: 1}}
              end={{x: 0.5, y: 0.2}}
            />
            <View style={tw`absolute bottom-0 p-4`}>
              {language === 'en' ? (
                <Text
                  style={[
                    tw`font-nokia-bold text-primary-6 py-1`,
                    {fontSize: scaleTextSize(18)},
                  ]}>
                  {daysOfWeekEng[check % 7]}, &nbsp;
                  <Text
                    style={[tw`text-accent-6`, {fontSize: scaleTextSize(18)}]}>
                    {formatDate(InVerseWeek.date)}
                  </Text>
                </Text>
              ) : (
                <Text
                  style={[
                    tw`font-nokia-bold text-primary-6 py-1`,
                    {fontSize: scaleTextSize(18)},
                  ]}>
                  {daysOfWeek[check % 7]}፣ &nbsp;
                  <DateConverter
                    gregorianDate={InVerseWeek.date}
                    style={tw`text-2xl`}
                    textStyle={dateStyle}
                  />
                </Text>
              )}
              <Text
                style={[
                  tw`flex flex-col font-nokia-bold text-primary-1`,
                  {fontSize: scaleTextSize(30), lineHeight: scaleTextSize(36)},
                ]}>
                {InVerseWeek.title}
              </Text>
            </View>
          </ImageBackground>
          <View style={tw`flex flex-col gap-4 px-4 mt-4`}>
            <View style={{width: '100%'}}>
              <HTMLView
                value={sanitizedContent}
                renderNode={renderNode}
                stylesheet={styles}
                addLineBreaks={false}
                onLinkPress={() => {}}
                onLinkLongPress={() => {}}
                textComponentProps={{
                  selectable: true,
                  style: [
                    tw`font-nokia-bold`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                    {...readerFontStyle, flexWrap: 'wrap'},
                  ],
                }}
              />
            </View>
            <View style={tw`flex flex-row justify-between`}>
              {check !== '01' && (
                <TouchableOpacity style={tw`mb-2`} onPress={onPrevious}>
                  <Text
                    style={[
                      tw`text-accent-6 font-nokia-bold border border-accent-6 px-4 py-1 rounded-4`,
                      {fontSize: scaleTextSize(20)},
                    ]}>
                    {language === 'en' ? 'Previous' : 'ተመለስ'}
                  </Text>
                </TouchableOpacity>
              )}
              {check !== '07' && (
                <TouchableOpacity
                  style={[tw`mb-2`, check === '01' && tw`self-end`]}
                  onPress={onNext}>
                  <Text
                    style={[
                      tw`text-accent-6 font-nokia-bold border border-accent-6 px-4 py-1 rounded-4`,
                      {fontSize: scaleTextSize(20)},
                    ]}>
                    {language === 'en' ? 'Next' : 'ቀጥል'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalOpen}
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={onCloseModal}>
        <View
          style={[
            tw`flex-1 justify-center items-center px-4`,
            {backgroundColor: 'rgba(0,0,0,0.6)'},
          ]}>
          <View
            style={[
              tw`w-full max-w-lg rounded-2xl border border-accent-8 p-5`,
              {backgroundColor: darkMode ? '#111827' : '#FFFFFF'},
            ]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{
                maxHeight:
                  windowHeight -
                  Math.max(insets.top, 40) -
                  Math.max(insets.bottom, 24) -
                  160,
              }}>
              <HtmlContent
                html={`<div>${modifiedContent}</div>`}
                baseStyle={{
                  ...readerFontStyle,
                  color: darkMode ? '#F8FAFC' : '#1F2937',
                  fontSize: scaleTextSize(16),
                  lineHeight: scaleTextSize(24),
                }}
                tagsStyles={{
                  p: {
                    ...readerFontStyle,
                    color: darkMode ? '#F8FAFC' : '#1F2937',
                    fontSize: scaleTextSize(16),
                    lineHeight: scaleTextSize(24),
                    textAlign: 'left',
                  },
                  div: {
                    ...readerFontStyle,
                    color: darkMode ? '#F8FAFC' : '#1F2937',
                    fontSize: scaleTextSize(16),
                    lineHeight: scaleTextSize(24),
                    textAlign: 'left',
                  },
                  h2: {
                    ...readerFontStyle,
                    color: '#EA9215',
                    fontSize: scaleTextSize(24),
                  },
                  sup: {
                    ...readerFontStyle,
                    color: '#EA9215',
                    fontSize: scaleTextSize(12),
                  },
                  ol: {
                    ...readerFontStyle,
                    color: darkMode ? '#F8FAFC' : '#1F2937',
                    fontSize: scaleTextSize(16),
                    lineHeight: scaleTextSize(24),
                    textAlign: 'left',
                    paddingVertical: 8,
                  },
                  ul: {
                    ...readerFontStyle,
                    color: darkMode ? '#F8FAFC' : '#1F2937',
                    fontSize: scaleTextSize(16),
                    lineHeight: scaleTextSize(24),
                    textAlign: 'left',
                    paddingVertical: 8,
                  },
                  li: {
                    ...readerFontStyle,
                    color: darkMode ? '#F8FAFC' : '#1F2937',
                    fontSize: scaleTextSize(16),
                    lineHeight: scaleTextSize(24),
                    textAlign: 'left',
                    paddingVertical: 4,
                  },
                }}
              />
            </ScrollView>
            <TouchableOpacity
              style={tw`bg-accent-6 mt-4 rounded-lg p-2`}
              onPress={onCloseModal}>
              <Text
                style={[
                  tw`font-nokia-bold text-primary-1 text-center`,
                  {fontSize: scaleTextSize(16)},
                ]}>
                {language === 'en' ? 'Close' : 'ዝጋ'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default InVerseWeek;
