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
  TextInput,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import {useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
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
  NotePencil,
} from 'phosphor-react-native';
import tw from './../../../tailwind';
import LinearGradient from 'react-native-linear-gradient';
import HtmlContent from '../../components/HtmlContent';
import HTMLView from 'react-native-htmlview';
import {WebView} from 'react-native-webview';
import YoutubePlayer from 'react-native-youtube-iframe';
import ErrorScreen from '../../components/ErrorScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {format} from 'date-fns';
import {extractHtmlBlocks, stripHtmlTags} from '../../utils/htmlBlocks';
import {ensureOnlineOrNotify} from '../../utils/refreshCacheManager';
import {fetchQuarterVideoSections} from '../../utils/sslQuarterVideoFeed';
import useReaderFontScale from '../../hooks/useReaderFontScale';
import AndroidStatusBarSpacer from '../../components/AndroidStatusBarSpacer';
import ReaderFontSizeControl from '../../components/ReaderFontSizeControl';
import useReaderFontFamily from '../../hooks/useReaderFontFamily';

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
    (html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''),
  );

const VERSE_LINK_REGEX = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const GENERIC_VERSE_REFERENCE_REGEX =
  /(?:[1-4፩-፬]\s*)?[A-Za-z\u1200-\u137F]+(?:[.-][A-Za-z\u1200-\u137F]+)*(?:\s+[A-Za-z\u1200-\u137F]+(?:[.-][A-Za-z\u1200-\u137F]+)*)?\s+\d+:\d+(?:-\d+)?/g;

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
      (normalizedHref && !/^https?:/i.test(normalizedHref)
        ? normalizedHref
        : ''),
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

      if (!earliestMatch || (match.index ?? 0) < (earliestMatch.index ?? 0)) {
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

    if (anchorText && (hasVerseClass(classValue) || resolvedVerseRef)) {
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

const blockHasVerseReferences = html => {
  const displayParts = parseParagraphDisplayParts(html);

  if (displayParts.some(part => part.verseRef)) {
    return true;
  }

  return displayParts.some(part =>
    new RegExp(GENERIC_VERSE_REFERENCE_REGEX.source, 'g').test(
      String(part?.text || ''),
    ),
  );
};

const isQuestionBlock = html => /<code\b/i.test(String(html || '').trim());

const parseQuestionBlockContent = (html, versePattern) => {
  const innerHtml = String(html || '')
    .replace(/^<code[^>]*>/i, '')
    .replace(/<\/code>$/i, '');
  const plainQuestionText = stripInlineHtml(innerHtml).trim();
  const verseElements = [];
  let match;

  VERSE_LINK_REGEX.lastIndex = 0;
  while ((match = VERSE_LINK_REGEX.exec(innerHtml)) !== null) {
    const [, attributes = '', anchorHtml = ''] = match;
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

    if (anchorText && (hasVerseClass(classValue) || resolvedVerseRef)) {
      verseElements.push({
        text: anchorText,
        verseRef: resolvedVerseRef || anchorText,
      });
    }
  }

  const regexVerseRefs = splitTextByVersePattern(
    plainQuestionText,
    versePattern,
  )
    .filter(part => part.verseRef)
    .map(part => ({
      verseRef: part.verseRef,
      text: part.text,
    }));

  const references = [...verseElements, ...regexVerseRefs].filter(
    (item, itemIndex, array) =>
      item?.verseRef &&
      item?.text &&
      itemIndex ===
        array.findIndex(
          candidate =>
            candidate.verseRef === item.verseRef &&
            candidate.text === item.text,
        ),
  );

  return {
    plainQuestionText,
    references,
  };
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
      animationType="fade"
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
            style={tw`absolute inset-0 bg-secondary-10 bg-opacity-70`}
          />
          <View
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: '72%',
              borderRadius: 28,
              borderWidth: 1,
              borderColor: darkMode ? '#374151' : '#FED7AA',
              padding: 20,
              backgroundColor: darkMode ? '#111827' : '#FFFDF8',
              shadowColor: '#000000',
              shadowOpacity: 0.25,
              shadowRadius: 24,
              shadowOffset: {width: 0, height: 12},
              elevation: 16,
            }}>
            <View style={tw`flex-row items-center mb-4`}>
              <View
                style={tw`w-11 h-11 rounded-full bg-accent-6 items-center justify-center mr-3`}>
                <NotePencil size={22} color="#FFFFFF" weight="bold" />
              </View>
              <View style={tw`flex-1`}>
                <Text
                  style={[
                    tw`font-nokia-bold`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    {fontSize: 21},
                  ]}>
                  {initialText ? 'Edit Note' : 'Add Note'}
                </Text>
                <Text
                  style={[
                    tw`font-nokia-bold mt-1`,
                    darkMode ? tw`text-primary-4` : tw`text-secondary-4`,
                    {fontSize: 13, lineHeight: 18},
                  ]}>
                  Keep a thought with this question.
                </Text>
              </View>
            </View>
            <TextInput
              multiline
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Write your note here..."
              placeholderTextColor="#AAB0B4"
              style={{
                minHeight: Platform.OS === 'android' ? 180 : 160,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: darkMode ? '#374151' : '#FDBA74',
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginBottom: 18,
                color: darkMode ? '#F8FAFC' : '#1F2937',
                backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                fontFamily: 'Nokia Pure Headline Bold',
                fontSize: 16,
                lineHeight: 22,
                textAlignVertical: 'top',
              }}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />
            <View style={tw`flex-row justify-end gap-3`}>
              <TouchableOpacity
                onPress={onClose}
                style={tw`px-6 py-3 rounded-full border border-accent-6`}>
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
                style={tw`px-7 py-3 rounded-full bg-accent-6`}>
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
  const insets = useSafeAreaInsets();
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
          const cached = await getCachedSSLLesson(ssl, weekId, language);
          if (cached) {
            const cachedDay = cached.days?.[check] || cached.lessonData;
            if (cachedDay) {
              setCachedSSLWeek(cachedDay);
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
  }, [ssl, weekId, language, check, weekError, quarterError]);

  // Cache SSL lesson when data is loaded
  useEffect(() => {
    if (SSLWeek && SSLQuarter && ssl && weekId) {
      saveSSLLessonToCache(ssl, weekId, SSLWeek, SSLQuarter, language, check);
      // Clear cache flags when fresh data loads
      if (isUsingCache) {
        setIsUsingCache(false);
        setCachedSSLWeek(null);
        setCachedSSLQuarter(null);
      }
    }
  }, [SSLWeek, SSLQuarter, ssl, weekId, language, check, isUsingCache]);

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

      if (blockHasVerseReferences(html)) {
        return false;
      }

      return true;
    };

    const segments = [];
    let currentHighlightableBlocks = [];

    contentBlocks.forEach(block => {
      if (isQuestionBlock(block?.html)) {
        if (currentHighlightableBlocks.length > 0) {
          segments.push({
            id: `highlight-group-${segments.length}`,
            type: 'highlightable',
            blocks: currentHighlightableBlocks,
          });
          currentHighlightableBlocks = [];
        }

        segments.push({
          id: `question-block-${block.id}`,
          type: 'question',
          block,
        });
        return;
      }

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
    setShowVideoOptionsModal(true);
  };
  const [showSupplementalNotes, setShowSupplementalNotes] = useState(false);
  const [showVideoOptionsModal, setShowVideoOptionsModal] = useState(false);
  const [directVideoMeta, setDirectVideoMeta] = useState(null);
  const [quarterVideoSections, setQuarterVideoSections] = useState([]);
  const [selectedVideoEntry, setSelectedVideoEntry] = useState(null);
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
  const scaled = useCallback(
    size =>
      scaleTextSize(Math.round(size * Math.min(Math.max(fontScale, 1), 1.8))),
    [fontScale, scaleTextSize],
  );
  const extractYouTubeVideoId = useCallback(url => {
    const normalizedUrl = String(url || '').trim();
    if (!normalizedUrl) {
      return '';
    }

    const shortMatch = normalizedUrl.match(/youtu\.be\/([^?&/]+)/i);
    if (shortMatch?.[1]) {
      return shortMatch[1];
    }

    const watchMatch = normalizedUrl.match(/[?&]v=([^?&/]+)/i);
    if (watchMatch?.[1]) {
      return watchMatch[1];
    }

    const embedMatch = normalizedUrl.match(/\/embed\/([^?&/]+)/i);
    if (embedMatch?.[1]) {
      return embedMatch[1];
    }

    const shortsMatch = normalizedUrl.match(/\/shorts\/([^?&/]+)/i);
    if (shortsMatch?.[1]) {
      return shortsMatch[1];
    }

    return '';
  }, []);
  const accessibilityScale = Math.max(
    1,
    Math.min(Math.max(fontScale, 1), 1.8) * (readerFontScalePercentage / 100),
  );
  const interQuestionSpacing = Math.max(
    scaled(10),
    Math.round(10 * accessibilityScale),
  );
  const noteSectionSpacing = Math.max(
    scaled(8),
    Math.round(8 * accessibilityScale),
  );
  const noteCardBottomSpacing = Math.max(
    scaled(24),
    Math.round(24 * accessibilityScale),
  );
  const verseModalMaxHeight = Math.min(
    windowHeight * 0.72,
    Math.max(
      windowHeight -
        Math.max(insets.top, 24) -
        Math.max(insets.bottom, 24) -
        32,
      320,
    ),
  );

  useEffect(() => {
    let isActive = true;

    const loadDirectVideoMeta = async () => {
      const url = videoLinkData?.videoUrl;
      const videoId = extractYouTubeVideoId(url);

      if (!url || !videoId) {
        if (isActive) {
          setDirectVideoMeta(null);
        }
        return;
      }

      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(
            url,
          )}&format=json`,
        );
        const payload = await response.json();

        if (!isActive) {
          return;
        }

        setDirectVideoMeta({
          title: payload?.title || displaySSLWeek?.title || 'Sabbath School',
          channel: payload?.author_name || 'YouTube',
          thumbnail:
            payload?.thumbnail_url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          videoId,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setDirectVideoMeta({
          title: displaySSLWeek?.title || 'Sabbath School',
          channel: 'YouTube',
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          videoId,
        });
      }
    };

    loadDirectVideoMeta();

    return () => {
      isActive = false;
    };
  }, [displaySSLWeek?.title, extractYouTubeVideoId, videoLinkData?.videoUrl]);

  useEffect(() => {
    let isActive = true;

    const loadQuarterVideoEntries = async () => {
      if (!ssl || !weekId) {
        if (isActive) {
          setQuarterVideoSections([]);
        }
        return;
      }

      try {
        const sections = await fetchQuarterVideoSections({
          language: 'en',
          quarterId: ssl.substring(0, 7),
        });

        if (isActive) {
          setQuarterVideoSections(
            sections.filter(section => section.entries?.length),
          );
        }
      } catch (error) {
        if (isActive) {
          setQuarterVideoSections([]);
        }
      }
    };

    loadQuarterVideoEntries();

    return () => {
      isActive = false;
    };
  }, [ssl, weekId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({y: 0, animated: true});
  }, [check]);

  useEffect(() => {
    scrollRef.current?.scrollTo({y: 0, animated: false});
  }, [weekId, displaySSLWeek?.date]);

  const darkMode = useSelector(state => state.ui.darkMode);
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

  const handleVerseClick = useCallback(
    verseKey => {
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
        verseKeys.find(
          key => normalizeVerseLookupKey(key) === normalizedRequested,
        ) ||
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
    },
    [displaySSLWeek],
  );
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
    ({block, textStyle}) => {
      const parts =
        Array.isArray(block?.displayParts) && block.displayParts.length
          ? block.displayParts
          : [{text: block?.text || ''}];
      const flattenedTextStyle = StyleSheet.flatten(textStyle) || {};
      const displayTextStyle = {...flattenedTextStyle};
      const paragraphContainerStyle = {
        width: '100%',
        paddingTop:
          flattenedTextStyle.paddingTop ??
          flattenedTextStyle.paddingVertical ??
          flattenedTextStyle.padding ??
          0,
        paddingBottom:
          flattenedTextStyle.paddingBottom ??
          flattenedTextStyle.paddingVertical ??
          flattenedTextStyle.padding ??
          0,
        paddingLeft:
          flattenedTextStyle.paddingLeft ??
          flattenedTextStyle.paddingHorizontal ??
          flattenedTextStyle.padding ??
          0,
        paddingRight:
          flattenedTextStyle.paddingRight ??
          flattenedTextStyle.paddingHorizontal ??
          flattenedTextStyle.padding ??
          0,
        marginTop:
          flattenedTextStyle.marginTop ??
          flattenedTextStyle.marginVertical ??
          flattenedTextStyle.margin ??
          0,
        marginBottom:
          flattenedTextStyle.marginBottom ??
          flattenedTextStyle.marginVertical ??
          flattenedTextStyle.margin ??
          0,
        marginLeft:
          flattenedTextStyle.marginLeft ??
          flattenedTextStyle.marginHorizontal ??
          flattenedTextStyle.margin ??
          0,
        marginRight:
          flattenedTextStyle.marginRight ??
          flattenedTextStyle.marginHorizontal ??
          flattenedTextStyle.margin ??
          0,
      };

      delete displayTextStyle.paddingTop;
      delete displayTextStyle.paddingBottom;
      delete displayTextStyle.paddingLeft;
      delete displayTextStyle.paddingRight;
      delete displayTextStyle.paddingVertical;
      delete displayTextStyle.paddingHorizontal;
      delete displayTextStyle.padding;
      delete displayTextStyle.marginTop;
      delete displayTextStyle.marginBottom;
      delete displayTextStyle.marginLeft;
      delete displayTextStyle.marginRight;
      delete displayTextStyle.marginVertical;
      delete displayTextStyle.marginHorizontal;
      delete displayTextStyle.margin;

      const interactiveSegments = parts.flatMap((part, partIndex) => {
        if (part?.verseRef) {
          return [
            {
              key: `${block.id}-${partIndex}`,
              text: String(part.text || ''),
              verseRef: part.verseRef,
            },
          ];
        }

        return splitTextByVersePattern(
          part?.text || '',
          verseReferencePattern,
        ).map((item, itemIndex) => ({
          key: `${block.id}-${partIndex}-${itemIndex}`,
          text: item.text,
          verseRef: item.verseRef || null,
        }));
      });

      return (
        <View pointerEvents="box-none" style={paragraphContainerStyle}>
          <Text style={displayTextStyle}>
            {interactiveSegments.map(segment => (
              <Text
                key={segment.key}
                onPress={
                  segment.verseRef
                    ? () => handleVerseClick(segment.verseRef)
                    : undefined
                }
                style={
                  segment.verseRef
                    ? {
                        color: '#EA9215',
                        textDecorationLine: 'underline',
                      }
                    : null
                }>
                {segment.text}
              </Text>
            ))}
          </Text>
        </View>
      );
    },
    [handleVerseClick, verseReferencePattern],
  );

  const renderQuestionBlock = block => {
    const {plainQuestionText, references} = parseQuestionBlockContent(
      block?.html,
      verseReferencePattern,
    );
    const noteId = `${weekId}-${check}-${block?.id || 'question'}`;
    const noteText = notes[noteId] || '';

    return (
      <View
        key={noteId}
        collapsable={false}
        style={{
          width: '100%',
          maxWidth: '100%',
          alignSelf: 'stretch',
          marginBottom: noteCardBottomSpacing,
        }}>
        <View
          style={[
            tw`rounded-lg p-3`,
            {
              backgroundColor: darkMode ? '#333' : '#f5f5f5',
              width: '100%',
              maxWidth: '100%',
            },
          ]}>
          <View style={{width: '100%', flexShrink: 1}}>
            <HTMLView
              value={block?.html}
              stylesheet={styles}
              renderNode={renderNode}
              addLineBreaks={false}
            />
          </View>
          <View
            style={{
              marginTop: noteSectionSpacing + scaled(4),
              paddingTop: noteSectionSpacing + scaled(2),
              paddingBottom: noteSectionSpacing,
              borderTopWidth: 1,
              borderTopColor: darkMode ? '#4B5563' : '#D1D5DB',
              gap: noteSectionSpacing,
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
              style={[
                tw`self-start px-3 rounded-full bg-accent-6`,
                {
                  minHeight: scaled(36),
                  paddingVertical: Math.max(scaled(5), noteSectionSpacing - 2),
                  justifyContent: 'center',
                },
              ]}>
              <Text
                style={[
                  tw`font-nokia-bold text-primary-1`,
                  {
                    fontSize: scaled(14),
                    lineHeight: scaled(18),
                  },
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
  };

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
  if (
    (isQuarterLoading || isWeekLoading) &&
    !loadingTimeout &&
    (!displaySSLQuarter || !displaySSLWeek)
  ) {
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
  if ((quarterError || weekError) && (!displaySSLQuarter || !displaySSLWeek)) {
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
    text: {...tw`font-nokia-bold`, ...readerFontStyle},
    h3: darkMode
      ? {
          ...tw`font-nokia-bold text-primary-1`,
          ...readerFontStyle,
          fontSize: scaled(24),
        }
      : {
          ...tw`font-nokia-bold text-secondary-6`,
          ...readerFontStyle,
          fontSize: scaled(24),
        },
    p: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold py-2`,
          ...readerFontStyle,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold py-2`,
          ...readerFontStyle,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        },
    blockquote: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold`,
          ...readerFontStyle,
          fontSize: scaled(20),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold`,
          ...readerFontStyle,
          fontSize: scaled(20),
        },
    ol: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold py-2`,
          ...readerFontStyle,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold py-2`,
          ...readerFontStyle,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        },
    ul: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold py-2`,
          ...readerFontStyle,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold py-2`,
          ...readerFontStyle,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        },
    li: darkMode
      ? {
          ...tw`text-primary-1 font-nokia-bold py-1`,
          ...readerFontStyle,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        }
      : {
          ...tw`text-secondary-6 font-nokia-bold py-1`,
          ...readerFontStyle,
          fontSize: scaled(17),
          lineHeight: scaled(26),
        },
    'blockquote.p': {...tw`font-nokia-bold text-4xl`, ...readerFontStyle},
    em: tw`mt-4`,
    code: {
      ...tw`font-nokia-bold`,
      ...readerFontStyle,
      color: '#EA9215',
      backgroundColor: darkMode ? '#333' : '#f5f5f5',
      fontSize: scaled(16),
      lineHeight: scaled(24),
      padding: 8,
      borderRadius: 4,
    },
    strong: {fontSize: scaled(20)},
    a: {...tw`text-accent-6 underline`, ...readerFontStyle},
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
      const anchorText = stripInlineHtml(extractNodeText(node));
      const verseReference = resolveVerseReference(node.attribs) || anchorText;
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
      const blockquoteText = extractNodeText(node);
      const memoryText = parseMemoryText(blockquoteText);

      if (memoryText) {
        return (
          <View key={index} style={tw`border-l-4 border-accent-6 pl-4 mb-4`}>
            <Text
              style={[
                tw`font-nokia-bold`,
                darkMode ? tw`text-secondary-5` : tw`text-secondary-6`,
                {
                  fontSize: scaled(28),
                  lineHeight: scaled(34),
                  marginBottom: 12,
                },
              ]}>
              {memoryText.label}
            </Text>
            <Text
              style={[
                tw`font-nokia-bold`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                {
                  fontSize: scaled(19),
                  lineHeight: scaled(31),
                  marginBottom: 10,
                },
              ]}>
              {memoryText.verse}
            </Text>
            {memoryText.reference ? (
              <Text
                style={[
                  tw`font-nokia-bold text-accent-6`,
                  {
                    fontSize: scaled(26),
                    lineHeight: scaled(32),
                    textDecorationLine: 'underline',
                  },
                ]}>
                {memoryText.reference}
              </Text>
            ) : null}
          </View>
        );
      }

      const childrenWithStyles = node.children.map((child, childIndex) => {
        if (child.type === 'text') {
          return (
            <Text
              key={childIndex}
              style={[
                tw`font-nokia-bold`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                {
                  fontSize: scaled(18),
                  lineHeight: scaled(28),
                },
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
            tw`flex-row items-center justify-between rounded-2xl mt-4 px-4 py-3 border`,
            {
              minHeight: scaled(56),
              borderColor: '#EA9215',
              backgroundColor: darkMode ? '#1F2937' : '#FFF7ED',
            },
          ]}>
          <Text
            style={[
              tw`font-nokia-bold flex-1`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
              {fontSize: scaled(18), lineHeight: scaled(24)},
            ]}>
            {node.children[0].data}
          </Text>
          {showSupplementalNotes ? (
            <CaretUp size={22} color="#EA9215" weight="bold" />
          ) : (
            <CaretDown size={22} color="#EA9215" weight="bold" />
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

    return undefined;
  };

  const handleBackButtonPress = () => {
    navigation.goBack();
  };
  const gradientColor = '#000000';
  const dateStyle = {
    ...tw`font-nokia-bold text-primary-6`,
    ...readerFontStyle,
    fontSize: scaled(18),
  };
  const extractNodeText = function extractNodeText(node) {
    if (!node) {
      return '';
    }

    if (node.type === 'text') {
      return node.data || '';
    }

    return (node.children || []).map(extractNodeText).join('');
  };
  const parseMemoryText = rawText => {
    const compactText = decodeHtmlEntities(rawText || '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!/^memory text:/i.test(compactText)) {
      return null;
    }

    const withoutLabel = compactText.replace(/^memory text:\s*/i, '').trim();
    const referenceMatch = withoutLabel.match(
      /\(?([1-4]?\s?[A-Za-z][A-Za-z\s]+?\d+:\d+(?:,\s*\d+)*(?:,\s*[A-Z]{2,})?)\)?\.?$/i,
    );

    if (!referenceMatch || referenceMatch.index == null) {
      return {
        label: 'Memory Text:',
        verse: withoutLabel,
        reference: '',
      };
    }

    const verse = withoutLabel
      .slice(0, referenceMatch.index)
      .trim()
      .replace(/\(?\s*$/, '')
      .trim();

    return {
      label: 'Memory Text:',
      verse,
      reference: referenceMatch[1].trim(),
    };
  };
  const modifiedContent = selectedVerseContent;
  const directVideoEntries = directVideoMeta
    ? [
        {
          id: 'direct-linked-video',
          provider: directVideoMeta.channel,
          title: directVideoMeta.title,
          image: directVideoMeta.thumbnail,
          videoId: directVideoMeta.videoId,
          playbackType: 'youtube',
          isDirectVideo: true,
          showTitle: true,
        },
      ]
    : [];
  const fallbackVideoSearchOptions = (() => {
    const lessonTitle = displaySSLWeek?.title || '';
    const quarterTitle = displaySSLQuarter?.quarterly?.title || '';
    const queryBase = [quarterTitle, lessonTitle].filter(Boolean).join(' ');

    return [
      {
        id: 'hope-sabbath-school',
        provider: 'Hope Sabbath School',
        title: 'Latest Hope Sabbath School',
        subtitle: lessonTitle || quarterTitle || 'Current quarter videos',
        image: '',
        webUrl: `https://m.youtube.com/results?search_query=${encodeURIComponent(
          `${queryBase} Hope Sabbath School`,
        )}`,
        showTitle: true,
      },
      {
        id: 'it-is-written',
        provider: 'It Is Written',
        title: 'Latest It Is Written',
        subtitle: lessonTitle || quarterTitle || 'Current quarter videos',
        image: '',
        webUrl: `https://m.youtube.com/results?search_query=${encodeURIComponent(
          `${queryBase} It Is Written Sabbath School`,
        )}`,
        showTitle: true,
      },
      {
        id: 'hopelives365',
        provider: 'Hope Lives 365',
        title: 'Latest Hope Lives 365',
        subtitle: lessonTitle || quarterTitle || 'Current quarter videos',
        image: '',
        webUrl: `https://m.youtube.com/results?search_query=${encodeURIComponent(
          `${queryBase} HopeLives365 Sabbath School`,
        )}`,
        showTitle: true,
      },
    ];
  })();
  const englishProviderRows =
    quarterVideoSections.length > 0
      ? quarterVideoSections
      : fallbackVideoSearchOptions.map(option => ({
          provider: option.provider,
          entries: [option],
        }));
  const hasQuarterVideoEntries =
    directVideoEntries.length > 0 || englishProviderRows.length > 0;
  const handleOpenVideoOption = entry => {
    setShowVideoOptionsModal(false);
    setSelectedVideoEntry(entry);
  };

  return (
    <View style={darkMode ? tw`bg-secondary-9 h-full` : null}>
      <AndroidStatusBarSpacer minHeight={4} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        ref={scrollRef}
        onScrollBeginDrag={handleReaderScrollBegin}
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
              <ReaderFontSizeControl
                darkMode={darkMode}
                isVisible={showFontSizePopup}
                onToggle={() => setShowFontSizePopup(previous => !previous)}
                onDecrease={decreaseFontScale}
                onIncrease={increaseFontScale}
                percentage={readerFontScalePercentage}
                popupPosition={{top: 112, right: 72}}
              />
              <TouchableOpacity
                onPress={handleWatchYouTube}
                style={[
                  tw`w-11 h-11 rounded-full items-center justify-center border border-accent-6`,
                  darkMode ? tw`bg-secondary-8` : tw`bg-primary-1`,
                ]}>
                <YoutubeLogo size={22} weight="fill" color={'#EA9215'} />
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

          <View
            style={[
              tw`flex flex-col px-4 mt-2`,
              {rowGap: Math.max(scaled(12), interQuestionSpacing)},
            ]}>
            {contentSegments.map(segment => {
              if (segment.type === 'static') {
                return (
                  <View
                    key={segment.id}
                    style={[
                      tw`rounded-4 px-2 py-1`,
                      {marginBottom: interQuestionSpacing},
                    ]}>
                    <HTMLView
                      value={segment.block.html}
                      stylesheet={styles}
                      renderNode={renderNode}
                      addLineBreaks={false}
                    />
                  </View>
                );
              }

              if (segment.type === 'question') {
                return (
                  <View
                    key={segment.id}
                    style={[
                      tw`rounded-4 px-2 py-1`,
                      {marginBottom: interQuestionSpacing},
                    ]}>
                    {renderQuestionBlock(segment.block)}
                  </View>
                );
              }

              return (
                <View
                  key={segment.id}
                  style={[
                    tw`rounded-4 px-2 py-1`,
                    {marginBottom: interQuestionSpacing},
                  ]}>
                  {segment.blocks.map(block => (
                    <View key={block.id} pointerEvents="box-none">
                      {renderHighlightableParagraph({
                        block,
                        textStyle: styles.p,
                      })}
                    </View>
                  ))}
                </View>
              );
            })}
            <View style={tw`flex flex-row justify-between`}>
              {check !== '01' && (
                <TouchableOpacity
                  style={tw`mb-2 px-5 py-3 rounded-full border border-accent-6`}
                  onPress={onPreviousButtonClick}>
                  <Text
                    style={[
                      tw`text-accent-6 font-nokia-bold`,
                      {fontSize: scaled(17)},
                    ]}>
                    {language === 'en' ? 'Previous' : 'ተመለስ'}
                  </Text>
                </TouchableOpacity>
              )}
              {check !== '07' && (
                <TouchableOpacity
                  style={[
                    tw`mb-2 px-5 py-3 rounded-full bg-accent-6`,
                    check === '01' && tw`self-end`,
                  ]}
                  onPress={onNextButtonClick}>
                  <Text
                    style={[
                      tw`text-primary-1 font-nokia-bold`,
                      {fontSize: scaled(17)},
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
              contentContainerStyle={tw`p-0`}
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
      <Modal
        animationType="slide"
        transparent
        visible={showVideoOptionsModal}
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowVideoOptionsModal(false)}>
        <View
          style={[
            tw`flex-1 justify-end`,
            {backgroundColor: 'rgba(17, 24, 39, 0.45)'},
          ]}>
          <Pressable
            style={tw`absolute inset-0`}
            onPress={() => setShowVideoOptionsModal(false)}
          />
          <View
            style={[
              tw`rounded-t-[32px] px-5 pt-4 pb-8`,
              {
                minHeight: '70%',
                maxHeight: '85%',
                backgroundColor: darkMode ? '#F8FAFC' : '#FFFFFF',
              },
            ]}>
            <View
              style={[
                tw`self-center rounded-full mb-6`,
                {width: 58, height: 7, backgroundColor: '#4B5563'},
              ]}
            />
            <Text
              style={[
                tw`font-nokia-bold mb-3`,
                {fontSize: scaled(28), color: '#111827'},
              ]}>
              Video
            </Text>
            <Text
              style={[
                tw`font-nokia-bold mb-5`,
                {fontSize: scaled(14), color: '#4B69A6'},
              ]}>
              {displaySSLWeek?.title || displaySSLQuarter?.quarterly?.title}
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{paddingBottom: 12}}>
              {directVideoEntries.length ? (
                <View style={tw`mb-6`}>
                  <Text
                    style={[
                      tw`font-nokia-bold mb-4`,
                      {fontSize: scaled(16), color: '#4B69A6'},
                    ]}>
                    Lesson Video
                  </Text>
                  {directVideoEntries.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      activeOpacity={0.9}
                      style={tw`mb-4`}
                      onPress={() => handleOpenVideoOption(option)}>
                      <ImageBackground
                        source={{uri: option.image}}
                        imageStyle={{borderRadius: 18}}
                        style={[
                          tw`w-full mb-3 overflow-hidden justify-end`,
                          {height: 210},
                        ]}>
                        <LinearGradient
                          colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.42)']}
                          style={tw`absolute inset-0`}
                        />
                      </ImageBackground>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          {fontSize: scaled(18), color: '#111827'},
                        ]}>
                        {option.title}
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          {fontSize: scaled(15), color: '#6B7280'},
                        ]}>
                        {option.provider}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {englishProviderRows.length ? (
                <View style={tw`mb-4`}>
                  <Text
                    style={[
                      tw`font-nokia-bold mb-2`,
                      {fontSize: scaled(16), color: '#4B69A6'},
                    ]}>
                    Quarter Videos
                  </Text>
                  {englishProviderRows.map(section => (
                    <View key={section.provider} style={tw`mb-6`}>
                      <Text
                        style={[
                          tw`font-nokia-bold mb-3`,
                          {fontSize: scaled(15), color: '#6B7280'},
                        ]}>
                        {section.provider}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{paddingRight: 8}}>
                        {section.entries.map(option => (
                          <TouchableOpacity
                            key={option.id}
                            activeOpacity={0.9}
                            style={{width: 286, marginRight: 16}}
                            onPress={() => handleOpenVideoOption(option)}>
                            {option.image ? (
                              <ImageBackground
                                source={{uri: option.image}}
                                imageStyle={{borderRadius: 18}}
                                style={[
                                  tw`w-full overflow-hidden`,
                                  {height: 190},
                                ]}>
                                <LinearGradient
                                  colors={[
                                    'rgba(0,0,0,0.02)',
                                    'rgba(0,0,0,0.16)',
                                  ]}
                                  style={tw`absolute inset-0`}
                                />
                              </ImageBackground>
                            ) : (
                              <View
                                style={[
                                  tw`w-full rounded-2xl items-start justify-end p-5 overflow-hidden`,
                                  {height: 190, backgroundColor: '#E5E7EB'},
                                ]}>
                                <LinearGradient
                                  colors={['#243B53', '#486581']}
                                  style={tw`absolute inset-0`}
                                />
                                <Text
                                  style={[
                                    tw`font-nokia-bold text-primary-1`,
                                    {
                                      fontSize: scaled(26),
                                      lineHeight: scaled(30),
                                    },
                                  ]}>
                                  {option.provider}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  ))}
                </View>
              ) : null}

              {!hasQuarterVideoEntries ? (
                <View
                  style={[
                    tw`rounded-2xl p-5`,
                    {
                      backgroundColor: '#F3F4F6',
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                    },
                  ]}>
                  <Text
                    style={[
                      tw`font-nokia-bold mb-2`,
                      {fontSize: scaled(16), color: '#111827'},
                    ]}>
                    No videos found yet
                  </Text>
                  <Text
                    style={[
                      tw`font-nokia-bold`,
                      {fontSize: scaled(14), color: '#6B7280'},
                    ]}>
                    Add quarter video links or provider details to populate this
                    list.
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        visible={Boolean(selectedVideoEntry)}
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedVideoEntry(null)}>
        <SafeAreaView style={tw`flex-1 bg-secondary-9`}>
          <View
            style={tw`flex-row items-center justify-between px-4 py-3 border-b border-secondary-7`}>
            <Text
              style={[
                tw`font-nokia-bold flex-1 pr-3`,
                {fontSize: scaled(18), color: '#F8FAFC'},
              ]}
              numberOfLines={1}>
              {selectedVideoEntry?.title || 'Video'}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedVideoEntry(null)}
              style={tw`px-3 py-2 rounded-full bg-accent-6`}>
              <Text style={tw`font-nokia-bold text-primary-1`}>Close</Text>
            </TouchableOpacity>
          </View>
          {selectedVideoEntry?.playbackType === 'youtube' &&
          selectedVideoEntry?.videoId ? (
            <View style={tw`flex-1 justify-center bg-black`}>
              <YoutubePlayer
                height={260}
                play={true}
                videoId={selectedVideoEntry.videoId}
                webViewStyle={{opacity: 0.99}}
              />
            </View>
          ) : selectedVideoEntry?.webUrl ? (
            <WebView
              source={{uri: selectedVideoEntry.webUrl}}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
            />
          ) : selectedVideoEntry?.mediaUrl ? (
            <WebView
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                      <style>
                        html, body {
                          margin: 0;
                          padding: 0;
                          background: #000;
                          width: 100%;
                          height: 100%;
                          overflow: hidden;
                        }
                        video {
                          width: 100%;
                          height: 100%;
                          object-fit: contain;
                          background: #000;
                        }
                      </style>
                    </head>
                    <body>
                      <video controls autoplay playsinline webkit-playsinline>
                        <source src="${selectedVideoEntry.mediaUrl}" type="video/mp4" />
                      </video>
                    </body>
                  </html>
                `,
              }}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default SSLWeek;
