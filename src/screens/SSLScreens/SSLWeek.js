import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
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
  Dimensions,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import {useSelector} from 'react-redux';
import DateConverter from './DateConverter';
import {
  useGetSSLOfDayQuery,
  useGetSSLOfDayLessonQuery,
} from '../../services/SabbathSchoolApi';
import {useGetVideoLinkQuery} from '../../services/videoLinksApi';
import {useNavigation} from '@react-navigation/native';
import {
  saveSSLLessonToCache,
  getCachedSSLLesson,
  clearSSLCache,
} from '../../utils/sslCache';
import networkManager from '../../utils/networkManager';
import {
  ArrowSquareLeft,
  YoutubeLogo,
  CaretUp,
  CaretDown,
  CloudSlash,
  Warning,
} from 'phosphor-react-native';
import HtmlContent from '../../components/HtmlContent';
import HighlightableHtmlBlocks from '../../components/HighlightableHtmlBlocks';
import tw from './../../../tailwind';
import LinearGradient from 'react-native-linear-gradient';
import HTMLView from 'react-native-htmlview';
import ErrorScreen from '../../components/ErrorScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {format} from 'date-fns';
import usePersistentHighlights from '../../hooks/usePersistentHighlights';
import {extractHtmlBlocks} from '../../utils/htmlBlocks';
import {ensureOnlineOrNotify} from '../../utils/refreshCacheManager';
import useReaderFontScale from '../../hooks/useReaderFontScale';
import AndroidStatusBarSpacer from '../../components/AndroidStatusBarSpacer';
import HighlightActionSheet from '../../components/HighlightActionSheet';
import {getHighlightColors} from '../../utils/highlightPalette';

const decodeHtmlEntities = text =>
  (text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const normalizeInlineText = text => decodeHtmlEntities(text || '');

const stripInlineHtml = html =>
  normalizeInlineText(
    (html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  );

const VERSE_LINK_REGEX =
  /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const GENERIC_VERSE_REFERENCE_REGEX =
  /(?:[1-4፩-፬]\s*)?[A-Za-z\u1200-\u137F]+(?:[.\-][A-Za-z\u1200-\u137F]+)*(?:\s+[A-Za-z\u1200-\u137F]+(?:[.\-][A-Za-z\u1200-\u137F]+)*)?\s+\d+:\d+(?:-\d+)?/g;

const readHtmlAttribute = (attributes, name) => {
  const pattern = new RegExp(
    `${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  const match = String(attributes || '').match(pattern);
  return match?.[1] || match?.[2] || match?.[3] || '';
};

const hasVerseClass = classValue =>
  String(classValue || '')
    .toLowerCase()
    .split(/\s+/)
    .includes('verse');

const resolveVerseReference = attributes => {
  const verseValue =
    attributes?.verse ||
    attributes?.['data-verse'] ||
    attributes?.['data-verse-id'] ||
    '';
  const normalizedHref = String(attributes?.href || '')
    .replace(/^#/, '')
    .trim();

  return String(
    verseValue ||
      (normalizedHref && !/^https?:/i.test(normalizedHref) ? normalizedHref : ''),
  ).trim();
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const splitTextByVersePattern = (text, versePattern) => {
  const input = String(text || '');

  if (!input) {
    return [];
  }

  const regexes = [];
  if (versePattern) {
    regexes.push(new RegExp(versePattern.source, versePattern.flags));
  }
  regexes.push(new RegExp(GENERIC_VERSE_REFERENCE_REGEX.source, 'g'));

  const parts = [];
  let consumed = 0;

  while (consumed < input.length) {
    let earliestMatch = null;

    regexes.forEach(regex => {
      regex.lastIndex = consumed;
      const match = regex.exec(input);
      if (!match) {
        return;
      }

      if (
        !earliestMatch ||
        (match.index ?? 0) < (earliestMatch.index ?? 0)
      ) {
        earliestMatch = match;
      }
    });

    if (!earliestMatch) {
      parts.push({text: input.slice(consumed)});
      break;
    }

    const verseText = earliestMatch[0];
    const matchIndex = earliestMatch.index ?? 0;

    if (matchIndex > consumed) {
      parts.push({text: input.slice(consumed, matchIndex)});
    }

    parts.push({
      text: verseText,
      verseRef: verseText,
    });
    consumed = matchIndex + verseText.length;
  }

  return parts.filter(part => part.text);
};

const parseParagraphDisplayParts = html => {
  const innerHtml = String(html || '')
    .replace(/^<p[^>]*>/i, '')
    .replace(/<\/p>$/i, '');

  const parts = [];
  let cursor = 0;
  let match;

  while ((match = VERSE_LINK_REGEX.exec(innerHtml)) !== null) {
    const [fullMatch, attributes = '', anchorHtml = ''] = match;
    const matchStart = match.index;

    if (matchStart > cursor) {
      const beforeHtml = innerHtml.slice(cursor, matchStart);
      const beforeText = stripInlineHtml(beforeHtml);
      if (beforeText) {
        parts.push({text: beforeText});
      }
    }

    const classValue = readHtmlAttribute(attributes, 'class');
    const verseValue =
      readHtmlAttribute(attributes, 'verse') ||
      readHtmlAttribute(attributes, 'data-verse') ||
      readHtmlAttribute(attributes, 'data-verse-id');
    const hrefValue = readHtmlAttribute(attributes, 'href');
    const anchorText = stripInlineHtml(anchorHtml);
    const normalizedHref = hrefValue.replace(/^#/, '').trim();
    const resolvedVerseRef =
      verseValue.trim() ||
      (normalizedHref && !/^https?:/i.test(normalizedHref)
        ? normalizedHref
        : '');

    if (
      anchorText &&
      (hasVerseClass(classValue) || resolvedVerseRef)
    ) {
      parts.push({
        text: anchorText,
        verseRef: resolvedVerseRef || anchorText,
      });
    } else if (anchorText) {
      parts.push({text: anchorText});
    }

    cursor = matchStart + fullMatch.length;
  }

  if (cursor < innerHtml.length) {
    const tailText = stripInlineHtml(innerHtml.slice(cursor));
    if (tailText) {
      parts.push({text: tailText});
    }
  }

  return parts.filter(part => part.text);
};

const NoteModal = ({isVisible, onClose, onSave, initialText, darkMode}) => {
  const [noteText, setNoteText] = useState(initialText || '');

  useEffect(() => {
    setNoteText(initialText || '');
  }, [initialText, isVisible]);

  const handleSave = () => {
    onSave(noteText);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1`}>
        <View style={tw`flex-1 justify-center items-center px-4`}>
          <Pressable
            onPress={onClose}
            style={tw`absolute inset-0 bg-secondary-9 bg-opacity-80`}
          />
          <View
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: '72%',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#EA9215',
              padding: 18,
              backgroundColor: darkMode ? '#111827' : '#FFFFFF',
            }}>
            <Text
              style={[
                tw`font-nokia-bold mb-3`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                {fontSize: 18},
              ]}>
              Add Note
            </Text>
            <TextInput
              multiline
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Write your note here..."
              placeholderTextColor="#AAB0B4"
              style={[
                tw`border border-accent-6 px-3 py-3 mb-4`,
                darkMode
                  ? tw`text-primary-1 bg-secondary-7`
                  : tw`text-secondary-6 bg-primary-2`,
                tw`font-nokia-bold text-base`,
                {
                  minHeight: Platform.OS === 'android' ? 180 : 160,
                  borderRadius: 14,
                  textAlignVertical: 'top',
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />
            <View style={tw`flex-row justify-end gap-3`}>
              <TouchableOpacity
                onPress={onClose}
                style={tw`px-5 py-3 rounded-lg border border-accent-6`}>
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
                style={tw`px-5 py-3 rounded-lg bg-accent-6`}>
                <Text style={tw`font-nokia-bold text-primary-1`}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const SSLWeek = ({route}) => {
  const {ssl, weekId, lessonData, quarterData, videoLink} = route.params;
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
  const [cachedSSLWeek, setCachedSSLWeek] = useState(null);
  const [cachedSSLQuarter, setCachedSSLQuarter] = useState(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [floatingHighlightSheet, setFloatingHighlightSheet] = useState({
    visible: false,
  });

  const {
    data: SSLQuarter,
    error: quarterError,
    isLoading: isQuarterLoading,
  } = useGetSSLOfDayQuery({
    path: ssl,
    id: weekId,
  });

  const {
    data: SSLWeek,
    isLoading: isWeekLoading,
    error: weekError,
    refetch,
  } = useGetSSLOfDayLessonQuery({
    path: ssl,
    id: weekId,
    day: check,
  });

  // Load from cache when offline or API fails
  useEffect(() => {
    const loadFromCache = async () => {
      if (
        (!networkManager.isOnline || weekError || quarterError) &&
        ssl &&
        weekId
      ) {
        try {
          const cached = await getCachedSSLLesson(ssl, weekId);
          if (cached) {
            if (cached.lessonData) {
              setCachedSSLWeek(cached.lessonData);
            }
            if (cached.quarterData) {
              setCachedSSLQuarter(cached.quarterData);
            }
            setIsUsingCache(true);
            console.log('📦 Using cached SSL lesson data (offline/error)');
          }
        } catch (error) {
          console.error('Error loading cached SSL lesson:', error);
        }
      } else {
        setIsUsingCache(false);
      }
    };

    loadFromCache();
  }, [ssl, weekId, weekError, quarterError]);

  // Cache SSL lesson when data is loaded
  useEffect(() => {
    if (SSLWeek && SSLQuarter && ssl && weekId) {
      saveSSLLessonToCache(ssl, weekId, SSLWeek, SSLQuarter);
      // Clear cache flags when fresh data loads
      if (isUsingCache) {
        setIsUsingCache(false);
        setCachedSSLWeek(null);
        setCachedSSLQuarter(null);
      }
    }
  }, [SSLWeek, SSLQuarter, ssl, weekId, isUsingCache]);

  // Use cached data if available and API data is not
  const displaySSLWeek = SSLWeek || cachedSSLWeek;
  const displaySSLQuarter = SSLQuarter || cachedSSLQuarter;
  const rawContent = displaySSLWeek?.content || '';
  const sanitizedContent = useMemo(
    () => rawContent.replace(/\n/g, ''),
    [rawContent],
  );
  const contentBlocks = useMemo(
    () => extractHtmlBlocks(sanitizedContent),
    [sanitizedContent],
  );
  const contentSegments = useMemo(() => {
    const isHighlightableBlock = block => {
      const html = String(block?.html || '').trim();
      const normalizedHtml = html.toLowerCase();

      if (!normalizedHtml.startsWith('<p')) {
        return false;
      }

      if (normalizedHtml.includes('supplemental egw notes')) {
        return false;
      }

      return true;
    };

    const segments = [];
    let currentHighlightableBlocks = [];

    contentBlocks.forEach(block => {
      if (isHighlightableBlock(block)) {
        const displayParts = parseParagraphDisplayParts(block.html);
        const normalizedText = displayParts.map(part => part.text).join('');

        currentHighlightableBlocks.push({
          ...block,
          text: normalizedText || block.text,
          displayParts,
        });
        return;
      }

      if (currentHighlightableBlocks.length > 0) {
        segments.push({
          id: `highlight-group-${segments.length}`,
          type: 'highlightable',
          blocks: currentHighlightableBlocks,
        });
        currentHighlightableBlocks = [];
      }

      segments.push({
        id: `static-block-${block.id}`,
        type: 'static',
        block,
      });
    });

    if (currentHighlightableBlocks.length > 0) {
      segments.push({
        id: `highlight-group-${segments.length}`,
        type: 'highlightable',
        blocks: currentHighlightableBlocks,
      });
    }

    return segments;
  }, [contentBlocks]);

  const year = ssl.substring(0, 4);
  const quarter = ssl.substring(5, 7);

  const {data: videoLinkData, error: videoError} = useGetVideoLinkQuery({
    year: year,
    quarter: quarter,
    lesson: weekId,
  });

  const handleWatchYouTube = () => {
    if (videoLinkData && videoLinkData.videoUrl) {
      Linking.openURL(videoLinkData.videoUrl);
    } else {
      alert('Video link not available');
    }
  };
  const [showSupplementalNotes, setShowSupplementalNotes] = useState(false);
  const {fontScale} = useWindowDimensions();
  const {
    scaleTextSize,
    increaseFontScale,
    decreaseFontScale,
    readerFontScalePercentage,
  } = useReaderFontScale();
  const [showFontSizePopup, setShowFontSizePopup] = useState(false);
  const scaled = useCallback(
    size =>
      scaleTextSize(Math.round(size * Math.min(Math.max(fontScale, 1), 1.8))),
    [fontScale, scaleTextSize],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({y: 0, animated: true});
  }, [check]);

  useEffect(() => {
    scrollRef.current?.scrollTo({y: 0, animated: false});
  }, [weekId, displaySSLWeek?.date]);

  const darkMode = useSelector(state => state.ui.darkMode);
  const highlightCacheKey = useMemo(
    () => `ssl:${ssl}:${weekId}:${check}`,
    [check, ssl, weekId],
  );
  const {
    highlights,
    inlineHighlights,
    setHighlight,
    clearHighlight,
    setInlineHighlight,
    clearInlineHighlights,
  } =
    usePersistentHighlights(highlightCacheKey);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

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

  const handleVerseClick = useCallback(verseKey => {
    const weekData = displaySSLWeek;
    const verses = weekData?.bible?.[0]?.verses || {};
    const verseKeys = Object.keys(verses);

    if (!verseKeys.length) {
      console.error(`Verse key "${verseKey}" not found`);
      return;
    }

    if (verses[verseKey]) {
      setSelectedVerseKey(verseKey);
      setSelectedVerseContent(verses[verseKey]);
      setIsModalOpen(true);
      return;
    }

    const normalizedRequested = normalizeVerseLookupKey(verseKey);
    const requestedAddress = extractVerseAddress(verseKey);

    const resolvedKey =
      verseKeys.find(key => normalizeVerseLookupKey(key) === normalizedRequested) ||
      verseKeys.find(key => {
        const candidateAddress = extractVerseAddress(key);
        if (!requestedAddress || candidateAddress !== requestedAddress) {
          return false;
        }

        const normalizedCandidate = normalizeVerseLookupKey(key);
        return (
          normalizedCandidate.includes(normalizedRequested) ||
          normalizedRequested.includes(normalizedCandidate)
        );
      }) ||
      verseKeys.find(key => extractVerseAddress(key) === requestedAddress);

    if (resolvedKey && verses[resolvedKey]) {
      setSelectedVerseKey(resolvedKey);
      setSelectedVerseContent(verses[resolvedKey]);
      setIsModalOpen(true);
      return;
    }

    console.error(`Verse key "${verseKey}" not found`);
  }, [displaySSLWeek]);
  const verseReferencePattern = useMemo(() => {
    const verseKeys = Object.keys(displaySSLWeek?.bible?.[0]?.verses || {})
      .filter(Boolean)
      .sort((first, second) => second.length - first.length);

    if (!verseKeys.length) {
      return null;
    }

    return new RegExp(verseKeys.map(escapeRegex).join('|'), 'g');
  }, [displaySSLWeek]);

  const renderHighlightableParagraph = useCallback(
    ({block, localRanges, textStyle}) => {
      const parts = Array.isArray(block?.displayParts) && block.displayParts.length
        ? block.displayParts
        : [{text: block?.text || ''}];

      let cursor = 0;
      const renderedSegments = [];

      parts.forEach((part, partIndex) => {
        const partText = String(part?.text || '');
        if (!partText) {
          return;
        }

        const partStart = cursor;
        const partEnd = partStart + partText.length;
        const overlappingRanges = (Array.isArray(localRanges) ? localRanges : [])
          .filter(range => range.start < partEnd && range.end > partStart)
          .map(range => ({
            ...range,
            start: Math.max(0, range.start - partStart),
            end: Math.min(partText.length, range.end - partStart),
          }))
          .filter(range => range.end > range.start)
          .sort((first, second) => first.start - second.start);

        let localCursor = 0;

        overlappingRanges.forEach((range, rangeIndex) => {
          if (range.start > localCursor) {
            renderedSegments.push({
              key: `${block.id}-${partIndex}-plain-${rangeIndex}-${localCursor}`,
              text: partText.slice(localCursor, range.start),
              verseRef: part.verseRef,
              colorId: null,
            });
          }

          renderedSegments.push({
            key: `${block.id}-${partIndex}-hl-${rangeIndex}-${range.start}`,
            text: partText.slice(range.start, range.end),
            verseRef: part.verseRef,
            colorId: range.colorId,
          });

          localCursor = range.end;
        });

        if (localCursor < partText.length) {
          renderedSegments.push({
            key: `${block.id}-${partIndex}-tail-${localCursor}`,
            text: partText.slice(localCursor),
            verseRef: part.verseRef,
            colorId: null,
          });
        }

        cursor = partEnd;
      });

      const interactiveSegments = renderedSegments.flatMap(segment => {
        if (segment.verseRef) {
          return [segment];
        }

        return splitTextByVersePattern(segment.text, verseReferencePattern).map(
          (part, partIndex) => ({
            ...segment,
            key: `${segment.key}-verse-${partIndex}`,
            text: part.text,
            verseRef: part.verseRef || null,
          }),
        );
      });

      return (
        <Text style={textStyle}>
          {interactiveSegments.map(segment => {
            const highlightColors = segment.colorId
              ? getHighlightColors(segment.colorId, darkMode)
              : null;

            return (
              <Text
                key={segment.key}
                onPress={
                  segment.verseRef
                    ? () => handleVerseClick(segment.verseRef)
                    : undefined
                }
                style={[
                  segment.verseRef
                    ? {
                        color: '#EA9215',
                        textDecorationLine: 'underline',
                      }
                    : null,
                  highlightColors
                    ? {backgroundColor: highlightColors.backgroundColor}
                    : null,
                ]}>
                {segment.text}
              </Text>
            );
          })}
        </Text>
      );
    },
    [darkMode, handleVerseClick, verseReferencePattern],
  );

  const onCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVerseKey('');
    setSelectedVerseContent('');
  };

  const onRefresh = async () => {
    const hasInternet = await ensureOnlineOrNotify();
    if (!hasInternet) {
      return;
    }
    setIsRefreshing(true);
    await clearSSLCache();
    await refetch();
    setIsRefreshing(false);
  };

  const onNextButtonClick = () => {
    const nextCheck = parseInt(check, 10) + 1;
    const paddedNextCheck = nextCheck.toString().padStart(2, '0');
    setCheck(paddedNextCheck);
  };

  const onPreviousButtonClick = () => {
    const previousCheck = parseInt(check, 10) - 1;
    const paddedPreviousCheck = previousCheck.toString().padStart(2, '0');
    setCheck(paddedPreviousCheck);
  };

  const handleToggleSupplementalNotes = () => {
    setShowSupplementalNotes(!showSupplementalNotes);
  };

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

  // Show loading state while data is being fetched - but with timeout
  if ((isQuarterLoading || isWeekLoading) && !loadingTimeout) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        {/* Compact Loading */}
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
              onRefresh={refetch}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }>
          {/* Compact Error Card */}
          <View
            style={[
              tw`mx-4 mt-4 p-3 rounded-3 border flex-row items-center`,
              {
                backgroundColor: darkMode ? '#374151' : '#FEF2F2',
                borderColor: '#EF4444',
              },
            ]}>
            <Warning size={18} color="#EF4444" weight="bold" style={tw`mr-3`} />
            <Text
              style={[
                tw`font-nokia-bold text-sm flex-1`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
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
  if (!displaySSLQuarter || !displaySSLWeek || !displaySSLWeek.content) {
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
          {/* Compact Missing Data Card */}
          <View
            style={[
              tw`mx-4 mt-4 p-3 rounded-3 border flex-row items-center`,
              {
                backgroundColor: darkMode ? '#374151' : '#FEF7F0',
                borderColor: '#EA9215',
              },
            ]}>
            <CloudSlash
              size={18}
              color="#EA9215"
              weight="bold"
              style={tw`mr-3`}
            />
            <Text
              style={[
                tw`font-nokia-bold text-sm flex-1`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              {language === 'en'
                ? 'Lesson data not available. Pull to retry.'
                : 'የትምህርቱ ውሂብ አይገኝም። ለመሞከር ይጎትቱ።'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    text: tw`font-nokia-bold`,
    h3: darkMode
      ? {...tw`font-nokia-bold text-primary-1`, fontSize: scaled(24)}
      : {...tw`font-nokia-bold text-secondary-6`, fontSize: scaled(24)},
    p: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold py-2 flex-wrap`,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold py-2 flex-wrap`,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        },
    blockquote: darkMode
      ? {...tw`text-primary-1 font-nokia-bold`, fontSize: scaled(20)}
      : {...tw`text-secondary-6 font-nokia-bold`, fontSize: scaled(20)},
    ol: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold py-2`,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold py-2`,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        },
    ul: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold py-2`,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold py-2`,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        },
    li: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold py-1`,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold py-1`,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        },
    'blockquote.p': tw`font-nokia-bold text-4xl`,
    em: tw`mt-4`,
    code: {
      ...tw`font-nokia-bold`,
      color: '#EA9215',
      backgroundColor: darkMode ? '#333' : '#f5f5f5',
      fontSize: scaled(16),
      lineHeight: scaled(24),
      padding: 8,
      borderRadius: 4,
    },
    strong: {fontSize: scaled(20)},
    a: tw`text-accent-6 underline`,
    // Styles for table elements
    table: tw`border border-gray-300 my-4`,
    // tr: tw`border-b border-gray-300`,
    td: tw`border-r border-gray-300 p-2`,
    // 'tr:last-child': tw`border-b-0`,
    // 'td:last-child': tw`border-r-0`,
  });
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

  const renderNode = (node, index, siblings, parent, defaultRenderer) => {
    if (node.name === 'a') {
      const verseReference = resolveVerseReference(node.attribs);
      if (hasVerseClass(node.attribs?.class) || verseReference) {
        const onPress = () => handleVerseClick(verseReference);
        return (
          <Text key={index} style={styles.a} onPress={onPress}>
            {defaultRenderer(node.children, node)}
          </Text>
        );
      }
      return (
        <Text key={index} style={styles.a}>
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
                tw`font-nokia-bold text-lg`,
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

    if (
      node.name === 'p' &&
      node.children[0]?.data === 'Supplemental EGW Notes'
    ) {
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
              {fontSize: scaled(16)},
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

    if (node.name === 'code') {
      const codeContent = (node.children ?? [])
        .map(child => {
          if (child.type === 'text') {
            return child.data || '';
          } else if (child.type === 'tag') {
            // For tag elements, we'll handle them separately
              if (
                child.name === 'a' &&
                (hasVerseClass(child.attribs?.class) ||
                  resolveVerseReference(child.attribs))
              ) {
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
              (hasVerseClass(child.attribs?.class) ||
                resolveVerseReference(child.attribs)),
        )
        .map(child => ({
            verseRef: resolveVerseReference(child.attribs),
          text: child.children
            .map(grandChild => grandChild.data || '')
            .join(''),
        }));

      const noteId = `${weekId}-${check}-${index}-${codeContent.substring(
        0,
        20,
      )}`;
      const noteText = notes[noteId] || '';

      const screenWidth = Dimensions.get('window').width;
      const containerWidth = screenWidth - 32;

      return (
        <View
          key={noteId}
          collapsable={false}
          style={[
            {
              width: containerWidth,
              maxWidth: containerWidth,
              marginTop: scaled(8),
              marginBottom: scaled(24),
            },
          ]}>
          <View
            style={[
              tw`rounded-lg p-3`,
              {
                backgroundColor: darkMode ? '#333' : '#f5f5f5',
                width: '100%',
                maxWidth: '100%',
              },
            ]}>
            <View style={{width: '100%', maxWidth: '100%'}}>
              <Text
                style={[
                  tw`font-nokia-bold`,
                  {
                    color: '#EA9215',
                    fontSize: scaled(16),
                    lineHeight: scaled(24),
                    width: '100%',
                  },
                ]}
                numberOfLines={undefined}
                ellipsizeMode="clip">
                {node.children.map((child, childIndex) => {
                  if (child.type === 'text') {
                    return child.data || '';
                  } else if (
                    child.type === 'tag' &&
                    child.name === 'a' &&
                    (hasVerseClass(child.attribs?.class) ||
                      resolveVerseReference(child.attribs))
                  ) {
                    const verseText = child.children
                      .map(grandChild => grandChild.data || '')
                      .join('');
                    return (
                      <Text
                        key={childIndex}
                        style={[tw`text-accent-6 underline`]}
                        onPress={() =>
                          handleVerseClick(resolveVerseReference(child.attribs))
                        }>
                        {verseText}
                      </Text>
                    );
                  } else if (child.type === 'tag') {
                    return child.children
                      .map(grandChild => grandChild.data || '')
                      .join('');
                  }
                  return '';
                })}
              </Text>
            </View>
            <View
              style={{
                marginTop: scaled(12),
                paddingTop: scaled(10),
                paddingBottom: scaled(6),
                borderTopWidth: 1,
                borderTopColor: darkMode ? '#4B5563' : '#D1D5DB',
                gap: scaled(8),
              }}>
              {noteText ? (
                <View style={tw`w-full`}>
                  <Text
                    style={[
                      tw`font-nokia-bold`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                      {
                        fontSize: scaled(16),
                        lineHeight: scaled(24),
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
                style={tw`self-start px-3 py-1 rounded-full bg-accent-6`}>
                <Text
                  style={[
                    tw`font-nokia-bold text-primary-1`,
                    {fontSize: scaled(14)},
                  ]}>
                  {noteText ? 'Edit Note' : 'Add Note'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <NoteModal
            isVisible={activeNoteId === noteId}
            onClose={() => setActiveNoteId(null)}
            onSave={text => handleSaveNote(noteId, text)}
            initialText={noteText}
            darkMode={darkMode}
          />
        </View>
      );
    }

    return undefined;
  };

  const handleBackButtonPress = () => {
    navigation.goBack();
  };
  const gradientColor = '#000000';
  const dateStyle = {
    ...tw`font-nokia-bold text-primary-6`,
    fontSize: scaled(18),
  };
  const modifiedContent = selectedVerseContent;

  return (
    <View style={darkMode ? tw`bg-secondary-9 h-full` : null}>
      <AndroidStatusBarSpacer minHeight={4} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        ref={scrollRef}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'android' ? 96 : 24,
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
            source={{
              uri:
                displaySSLQuarter?.lesson?.cover ||
                displaySSLQuarter?.quarterly?.splash,
            }}
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
                flexDirection: 'row',
                gap: 8,
              }}>
              <TouchableOpacity
                onPress={() => setShowFontSizePopup(previous => !previous)}
                style={[
                  tw`border border-accent-6 rounded-full px-3 py-1`,
                  darkMode ? tw`bg-secondary-9` : tw`bg-primary-1`,
                ]}>
                <Text style={tw`font-nokia-bold text-accent-6 text-sm`}>A+</Text>
              </TouchableOpacity>
              {showFontSizePopup && (
                <View
                  style={[
                    tw`absolute rounded-full px-3 py-2 border flex-row items-center`,
                    darkMode
                      ? tw`bg-secondary-9 border-secondary-6`
                      : tw`bg-primary-1 border-primary-4`,
                    {top: 38, right: 42},
                  ]}>
                  <TouchableOpacity
                    onPress={decreaseFontScale}
                    style={tw`px-3 py-1 rounded-full bg-accent-6`}>
                    <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>
                      A-
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={[
                      tw`font-nokia-bold text-sm px-2`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                    ]}>
                    {readerFontScalePercentage}%
                  </Text>
                  <TouchableOpacity
                    onPress={increaseFontScale}
                    style={tw`px-3 py-1 rounded-full bg-accent-6`}>
                    <Text style={tw`font-nokia-bold text-primary-1 text-sm`}>
                      A+
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity onPress={handleWatchYouTube}>
                <YoutubeLogo size={36} weight="fill" color={'#EA9215'} />
              </TouchableOpacity>
            </View>
            <LinearGradient
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
                    {fontSize: scaled(18)},
                  ]}>
                  {daysOfWeekEng[check % 7]}, &nbsp;
                  <Text style={[tw`text-accent-6`, {fontSize: scaled(18)}]}>
                    {formatDate(displaySSLWeek.date)}
                  </Text>
                </Text>
              ) : (
                <Text
                  style={[
                    tw`font-nokia-bold text-primary-6 py-1`,
                    {fontSize: scaled(18)},
                  ]}>
                  {daysOfWeek[check % 7]}፣ &nbsp;
                  <DateConverter
                    gregorianDate={displaySSLWeek.date}
                    style={tw`text-2xl`}
                    textStyle={dateStyle}
                  />
                </Text>
              )}
              <Text
                style={[
                  tw`flex flex-col font-nokia-bold text-primary-1`,
                  {fontSize: scaled(30), lineHeight: scaled(36)},
                ]}>
                {displaySSLWeek.title}
              </Text>
            </View>
          </ImageBackground>

          <View style={tw`flex flex-col gap-4 px-4 mt-2`}>
            {contentSegments.map(segment => {
              if (segment.type === 'static') {
                return (
                  <View key={segment.id} style={tw`rounded-4 px-2 py-1 mb-2`}>
                    <HTMLView
                      value={segment.block.html}
                      stylesheet={styles}
                      renderNode={renderNode}
                      addLineBreaks={false}
                    />
                  </View>
                );
              }

              return (
                <HighlightableHtmlBlocks
                  key={segment.id}
                  blocks={segment.blocks}
                  darkMode={darkMode}
                  highlights={highlights}
                  inlineHighlights={inlineHighlights}
                  onSelectColor={setHighlight}
                  onSelectInlineColor={setInlineHighlight}
                  onClearHighlight={clearHighlight}
                  onClearInlineHighlights={clearInlineHighlights}
                  onFloatingSheetChange={setFloatingHighlightSheet}
                  stylesheet={styles}
                  renderBlockDisplay={renderHighlightableParagraph}
                  minContentHeight={0}
                  blockContainerStyle={tw`rounded-4 px-2 py-1 mb-2`}
                />
              );
            })}
            <View style={tw`flex flex-row justify-between`}>
              {check !== '01' && (
                <TouchableOpacity
                  style={tw`mb-2`}
                  onPress={onPreviousButtonClick}>
                  <Text
                    style={[
                      tw`text-accent-6 font-nokia-bold border border-accent-6 px-4 py-1 rounded-4`,
                      {fontSize: scaled(20)},
                    ]}>
                    {language === 'en' ? 'Previous' : 'ተመለስ'}
                  </Text>
                </TouchableOpacity>
              )}
              {check !== '07' && (
                <TouchableOpacity
                  style={[tw`mb-2`, check === '01' && tw`self-end`]}
                  onPress={onNextButtonClick}>
                  <Text
                    style={[
                      tw`text-accent-6 font-nokia-bold border border-accent-6 px-4 py-1 rounded-4`,
                      {fontSize: scaled(20)},
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
        onRequestClose={onCloseModal}>
        <View
          style={tw`flex-1 justify-center items-center bg-secondary-9 bg-opacity-70`}>
          <View
            style={[
              tw`max-h-80% bg-primary-2 p-5 rounded-2xl w-11/12 max-w-lg border border-accent-8`,
              darkMode ? tw`bg-secondary-9` : null,
            ]}>
            <ScrollView contentContainerStyle={tw`p-0`}>
              <HtmlContent
                html={`<div>${modifiedContent}</div>`}
                baseStyle={{
                  fontFamily: 'Nokia Pure Headline Bold',
                  color: darkMode ? '#F8FAFC' : '#1F2937',
                  fontSize: scaled(16),
                  lineHeight: scaled(24),
                  margin: 0,
                  padding: 0,
                }}
                tagsStyles={{
                  p: {
                    fontFamily: 'Nokia Pure Headline Bold',
                    color: darkMode ? '#F8FAFC' : '#1F2937',
                    fontSize: scaled(16),
                    lineHeight: scaled(24),
                    textAlign: 'left',
                    marginTop: 0,
                    marginBottom: 12,
                    paddingTop: 0,
                    paddingBottom: 0,
                  },
                  div: {
                    fontFamily: 'Nokia Pure Headline Bold',
                    color: darkMode ? '#F8FAFC' : '#1F2937',
                    fontSize: scaled(16),
                    lineHeight: scaled(24),
                    textAlign: 'left',
                    marginTop: 0,
                    marginBottom: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                  },
                  h2: {
                    fontFamily: 'Nokia Pure Headline Bold',
                    color: '#EA9215',
                    fontSize: scaled(24),
                    marginTop: 0,
                    marginBottom: 12,
                    paddingTop: 0,
                  },
                  sup: {
                    fontFamily: 'Nokia Pure Headline Bold',
                    fontSize: scaled(12),
                    color: '#EA9215',
                  },
                  ol: {
                    fontFamily: 'Nokia Pure Headline Bold',
                    color: darkMode ? '#F8FAFC' : '#1F2937',
                    fontSize: scaled(16),
                    lineHeight: scaled(24),
                    textAlign: 'left',
                    marginTop: 0,
                    marginBottom: 12,
                    paddingLeft: 16,
                  },
                  ul: {
                    fontFamily: 'Nokia Pure Headline Bold',
                    color: darkMode ? '#F8FAFC' : '#1F2937',
                    fontSize: scaled(16),
                    lineHeight: scaled(24),
                    textAlign: 'left',
                    marginTop: 0,
                    marginBottom: 12,
                    paddingLeft: 16,
                  },
                  li: {
                    fontFamily: 'Nokia Pure Headline Bold',
                    color: darkMode ? '#F8FAFC' : '#1F2937',
                    fontSize: scaled(16),
                    lineHeight: scaled(24),
                    textAlign: 'left',
                    marginTop: 0,
                    marginBottom: 8,
                  },
                }}
              />
            </ScrollView>
            <TouchableOpacity
              style={tw`bg-accent-6 mt-4 rounded-lg p-2`}
              onPress={onCloseModal}>
              <Text style={tw`font-nokia-bold text-primary-1 text-center`}>
                ዝጋ
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {floatingHighlightSheet?.visible ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            pointerEvents="box-none"
            style={[tw`absolute left-3 right-3`, {bottom: 16}]}>
            <HighlightActionSheet
              visible={Boolean(floatingHighlightSheet?.visible)}
              useModal={false}
              darkMode={darkMode}
              selectedCount={floatingHighlightSheet?.selectedCount || 0}
              selectedText={floatingHighlightSheet?.selectedText || ''}
              onClose={floatingHighlightSheet?.onClose || (() => {})}
              onSelectColor={
                floatingHighlightSheet?.onSelectColor || (async () => {})
              }
              onClearHighlights={
                floatingHighlightSheet?.onClearHighlights || (async () => {})
              }
              onOpenFreeSelection={floatingHighlightSheet?.onOpenFreeSelection}
              freeSelectionEnabled={Boolean(
                floatingHighlightSheet?.freeSelectionEnabled,
              )}
              allowBlockHighlight={Boolean(
                floatingHighlightSheet?.allowBlockHighlight,
              )}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default SSLWeek;
