import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import {
  Books,
  CaretDown,
  CaretLeft,
  CaretRight,
  DotsThreeVertical,
  ArrowLeft,
  List,
  MagnifyingGlass,
  Swap,
} from 'phosphor-react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  useCreateBookmarkMutation,
  useCreateHighlightMutation,
  useCreateNoteMutation,
  useGetNotesQuery,
  useUpdateNoteMutation,
  useDeleteBookmarkMutation,
  useDeleteHighlightMutation,
  useGetBibleBooksQuery,
  useGetBibleChapterQuery,
  useGetBibleTranslationsQuery,
  useGetBookmarksQuery,
  useGetHighlightsQuery,
  useLazyGetBibleChapterQuery,
  useSaveBibleProgressMutation,
} from '../../features/bible/bibleApi';
import {
  bookLabel,
  translationId,
  verseId,
  verseNumber,
} from '../../features/bible/models';
import {
  buildBiblePath,
  formatPassageReference,
  isAmharicTranslation,
  matchEquivalentBook,
  parseVerseRanges,
} from '../../features/bible/reference';
import {
  BIBLE_COLORS,
  getBibleTheme,
  isDarkBibleTheme,
} from '../../features/bible/constants';
import {getReaderFontStyle} from '../../utils/readerFonts';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import {useHighlightPalette} from '../../features/bible/highlightPalette';
import {setDarkMode} from '../../redux/uiSlice';
import {
  clearPendingBibleAction,
  setPendingBibleAction,
  updateBibleSettings,
} from '../../features/bible/bibleSlice';
import TranslationPicker from '../../features/bible/components/TranslationPicker';
import VerseActionBar from '../../features/bible/components/VerseActionBar';
import NoteEditor from '../../features/bible/components/NoteEditor';
import ReaderSettings from '../../features/bible/components/ReaderSettings';
import BiblePassageSidebar from '../../features/bible/components/BiblePassageSidebar';
import BibleOverflowMenu from '../../features/bible/components/BibleOverflowMenu';
import {getCrossReferences, formatReferenceLabel} from '../../features/bible/crossReferences';

const alphaColor = hex => `${hex}55`;

const CrossReferencePanel = ({
  book,
  chapter,
  verse,
  books,
  translation,
  translationId: activeTranslationId,
  colors,
  onNavigate,
}) => {
  const references = useMemo(
    () => getCrossReferences(book, chapter, verse),
    [book?.order, chapter, verse],
  );
  const [visibleCount, setVisibleCount] = useState(10);
  const [chapterData, setChapterData] = useState({});
  const [loadChapter] = useLazyGetBibleChapterQuery();
  const visibleReferences = references.slice(0, visibleCount);

  useEffect(() => {
    let cancelled = false;
    const chapterKeys = new Map();
    visibleReferences.forEach(reference => {
      [reference.start, reference.end].filter(Boolean).forEach(point => {
        const targetBook = books.find(item => Number(item.order) === point.bookOrder);
        if (targetBook?._id) {
          chapterKeys.set(`${point.bookOrder}.${point.chapter}`, {
            bookOrder: point.bookOrder,
            chapter: point.chapter,
            bookId: targetBook._id,
          });
        }
      });
    });
    Promise.all(
      [...chapterKeys.entries()].map(async ([key, point]) => {
        try {
          const data = await loadChapter({
            translationId: activeTranslationId,
            bookId: point.bookId,
            chapterNumber: point.chapter,
          }).unwrap();
          return [key, Array.isArray(data) ? data : []];
        } catch {
          return [key, []];
        }
      }),
    ).then(entries => {
      if (!cancelled) setChapterData(current => ({...current, ...Object.fromEntries(entries)}));
    });
    return () => {
      cancelled = true;
    };
  }, [visibleCount, references, books, activeTranslationId, loadChapter]);

  if (!references.length) return null;
  return (
    <View style={[styles.crossRefBox, {backgroundColor: colors.card, borderColor: colors.border}]}>
      {visibleReferences.map((reference, index) => {
        const startKey = `${reference.start?.bookOrder}.${reference.start?.chapter}`;
        const endKey = reference.end ? `${reference.end.bookOrder}.${reference.end.chapter}` : startKey;
        const startVerses = chapterData[startKey] || [];
        const endVerses = chapterData[endKey] || startVerses;
        const passageText = reference.end && endKey !== startKey
          ? [
              ...startVerses.filter(item => verseNumber(item) >= reference.start.verse),
              ...endVerses.filter(item => verseNumber(item) <= reference.end.verse),
            ]
          : startVerses.filter(item =>
              verseNumber(item) >= reference.start.verse &&
              verseNumber(item) <= (reference.end?.verse || reference.start.verse),
            );
        const label = formatReferenceLabel(reference.start, books, translation);
        const endLabel = reference.end && (
          reference.end.bookOrder !== reference.start.bookOrder ||
          reference.end.chapter !== reference.start.chapter ||
          reference.end.verse !== reference.start.verse
        ) ? formatReferenceLabel(reference.end, books, translation) : '';
        return (
          <TouchableOpacity
            key={`${startKey}.${reference.start?.verse}.${index}`}
            accessibilityLabel={`Open cross reference ${label}`}
            onPress={() => onNavigate(reference.start)}
            style={[styles.crossRefItem, index > 0 && {borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth}]}>
            <Text style={[styles.crossRefLabel, {color: colors.accent}]}>
              {label}{endLabel ? `–${endLabel}` : ''}
            </Text>
            {passageText.length ? (
              <Text numberOfLines={3} style={[styles.crossRefText, {color: colors.text}]}>
                {passageText.map(item => item.text).join(' ')}
              </Text>
            ) : (
              <Text style={[styles.crossRefText, {color: colors.muted}]}>Loading reference text…</Text>
            )}
          </TouchableOpacity>
        );
      })}
      {visibleCount < references.length ? (
        <TouchableOpacity onPress={() => setVisibleCount(count => Math.min(count + 10, references.length))} style={styles.crossRefMore}>
          <Text style={[styles.crossRefLabel, {color: colors.accent}]}>Show more references ({references.length - visibleCount})</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const BibleReader = ({navigation, route}) => {
  const dispatch = useDispatch();
  const darkMode = useSelector(state => state.ui.darkMode);
  const user = useSelector(state => state.auth.user);
  const settings = useSelector(state => state.bible.settings);
  const pendingAction = useSelector(state => state.bible.pendingAction);
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const listRef = useRef(null);
  const versesRef = useRef([]);
  const topBarProgress = useRef(new Animated.Value(1)).current;
  const topBarHiddenRef = useRef(false);
  const lastScrollRef = useRef({offset: 0, time: Date.now()});
  const longScrollTimerRef = useRef(null);
  const pendingScrollRestoreRef = useRef(null);
  const referenceHistoryRef = useRef([]);
  const [translation, setTranslation] = useState(
    route.params?.translation || null,
  );
  const [book, setBook] = useState(route.params?.book || null);
  const [chapter, setChapter] = useState(
    Number(route.params?.chapterNumber) || 1,
  );
  const [selected, setSelected] = useState(() => {
    const requested =
      route.params?.verseNumbers || parseVerseRanges(route.params?.v);
    return (Array.isArray(requested) ? requested : []).map(Number).filter(Number.isFinite);
  });
  const requestedSelectionRef = useRef(
    Array.isArray(route.params?.verseNumbers)
      ? route.params.verseNumbers
      : parseVerseRanges(route.params?.v),
  );
  const requestedFocusRef = useRef(
    Number(route.params?.focusVerseNumber) || null,
  );
  const [focusedVerse, setFocusedVerse] = useState(
    Number(route.params?.focusVerseNumber) || null,
  );
  const [translationPicker, setTranslationPicker] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [compareTab, setCompareTab] = useState('primary');
  const [selectionSource, setSelectionSource] = useState('primary');
  const [referenceHistory, setReferenceHistory] = useState([]);
  const [expandedCrossReferences, setExpandedCrossReferences] = useState({});
  const [passageMessage, setPassageMessage] = useState('');
  const setTopBarHidden = useCallback(
    hidden => {
      if (topBarHiddenRef.current === hidden) return;
      topBarHiddenRef.current = hidden;
      Animated.timing(topBarProgress, {
        toValue: hidden ? 0 : 1,
        duration: 180,
        useNativeDriver: false,
      }).start();
    },
    [topBarProgress],
  );
  const clearLongScrollTimer = useCallback(() => {
    if (longScrollTimerRef.current) clearTimeout(longScrollTimerRef.current);
    longScrollTimerRef.current = null;
  }, []);
  useEffect(() => clearLongScrollTimer, [clearLongScrollTimer]);
  const beginReaderScroll = useCallback(() => {
    clearLongScrollTimer();
    longScrollTimerRef.current = setTimeout(() => setTopBarHidden(true), 5000);
  }, [clearLongScrollTimer, setTopBarHidden]);
  const trackReaderScroll = useCallback(
    event => {
      const offset = Math.max(0, event.nativeEvent.contentOffset.y);
      const now = Date.now();
      const previous = lastScrollRef.current;
      const delta = offset - previous.offset;
      const elapsed = Math.max(1, now - previous.time);
      const speed = Math.abs(delta) / elapsed;
      if (offset < 8 || delta < -4) setTopBarHidden(false);
      else if (delta > 0 && speed > 1.6) setTopBarHidden(true);
      lastScrollRef.current = {offset, time: now};
    },
    [setTopBarHidden],
  );
  const id = translationId(translation);
  const bookId = book?._id;
  const {data: translations = []} = useGetBibleTranslationsQuery();
  const {data: books = []} = useGetBibleBooksQuery(id, {skip: !id});
  const openCrossReference = useCallback(
    point => {
      const targetBook = books.find(item => Number(item.order) === point?.bookOrder);
      if (!targetBook || !point?.chapter || !point?.verse) return;
      const nextHistory = [
        ...referenceHistoryRef.current,
        {
          book,
          chapter,
          scrollOffset: lastScrollRef.current.offset,
          focusedVerse,
          selected: [...selected],
        },
      ];
      referenceHistoryRef.current = nextHistory;
      setReferenceHistory(nextHistory);
      setSelectionSource('primary');
      setSelected([]);
      setBook(targetBook);
      setChapter(point.chapter);
      setFocusedVerse(point.verse);
      requestedFocusRef.current = point.verse;
      if (book?._id === targetBook._id && chapter === point.chapter) {
        setTimeout(() => {
          const index = versesRef.current.findIndex(
            item => verseNumber(item) === point.verse,
          );
          if (index >= 0) listRef.current?.scrollToIndex?.({index, animated: true, viewPosition: 0.35});
        }, 80);
      }
    },
    [books, book, chapter, focusedVerse, selected],
  );
  const returnFromCrossReference = useCallback(() => {
    const history = referenceHistoryRef.current;
    const previous = history[history.length - 1];
    if (!previous) return;
    const nextHistory = history.slice(0, -1);
    referenceHistoryRef.current = nextHistory;
    setReferenceHistory(nextHistory);
    pendingScrollRestoreRef.current = previous.scrollOffset;
    requestedFocusRef.current = previous.focusedVerse || null;
    setBook(previous.book);
    setChapter(previous.chapter);
    setFocusedVerse(previous.focusedVerse || null);
    setSelectionSource('primary');
    setSelected(previous.selected || []);
    setTimeout(() => {
      pendingScrollRestoreRef.current = null;
      listRef.current?.scrollToOffset?.({
        offset: previous.scrollOffset || 0,
        animated: false,
      });
    }, 120);
  }, []);
  const {
    data: verses = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetBibleChapterQuery(
    {translationId: id, bookId, chapterNumber: chapter},
    {skip: !id || !bookId},
  );
  versesRef.current = verses;
  const {data: highlights = []} = useGetHighlightsQuery(
    {translationId: id, bookId},
    {skip: !user || !id || !bookId},
  );
  const {data: bookmarks = []} = useGetBookmarksQuery(
    {translationId: id, bookId},
    {skip: !user || !id || !bookId},
  );
  const {data: notes = []} = useGetNotesQuery(
    {translationId: id, bookId},
    {skip: !user || !id || !bookId},
  );
  const highlightColors = useHighlightPalette();
  const [createHighlight, {isLoading: savingHighlight}] =
    useCreateHighlightMutation();
  const [deleteHighlight] = useDeleteHighlightMutation();
  const [createNote, {isLoading: savingNote}] = useCreateNoteMutation();
  const [updateNote, {isLoading: updatingNote}] = useUpdateNoteMutation();
  const [createBookmark] = useCreateBookmarkMutation();
  const [deleteBookmark] = useDeleteBookmarkMutation();
  const [saveProgress] = useSaveBibleProgressMutation();
  const comparisonId = translationId(comparison);
  const {data: comparisonBooks = []} = useGetBibleBooksQuery(comparisonId, {
    skip: !comparisonId,
  });
  const comparisonBook = useMemo(
    () => matchEquivalentBook(book, comparisonBooks),
    [book, comparisonBooks],
  );
  const comparisonBookId = comparisonBook?._id;
  const {data: comparisonVerses = [], isFetching: comparisonLoading} =
    useGetBibleChapterQuery(
      {
        translationId: comparisonId,
        bookId: comparisonBookId,
        chapterNumber: chapter,
      },
      {skip: !comparisonId || !comparisonBookId},
    );
  const {data: comparisonHighlights = []} = useGetHighlightsQuery(
    {translationId: comparisonId, bookId: comparisonBookId},
    {skip: !user || !comparisonId || !comparisonBookId},
  );
  const effectiveThemeId =
    darkMode === isDarkBibleTheme(settings.theme)
      ? settings.theme
      : darkMode
      ? 'charcoal'
      : 'paper';
  const readerTheme = getBibleTheme(effectiveThemeId);
  const themeDark = isDarkBibleTheme(effectiveThemeId);
  useEffect(() => {
    StatusBar.setBackgroundColor(readerTheme.background, true);
    StatusBar.setBarStyle(themeDark ? 'light-content' : 'dark-content', true);
    changeNavigationBarColor(readerTheme.background, !themeDark, true);
  }, [readerTheme.background, themeDark]);
  const colors = {
    bg: readerTheme.background,
    card: readerTheme.card,
    text: readerTheme.text,
    muted: readerTheme.muted,
    border: readerTheme.border,
    accent: readerTheme.accent,
  };
  useEffect(() => {
    const themeIsDark = isDarkBibleTheme(settings.theme);
    if (darkMode !== themeIsDark) {
      dispatch(updateBibleSettings({theme: darkMode ? 'charcoal' : 'paper'}));
    }
  }, [darkMode, settings.theme, dispatch]);
  useEffect(() => {
    if (!translation) return;
    const amharic = isAmharicTranslation(translation);
    const latinFont = ['lexend', 'inter', 'montserrat'].includes(
      settings.fontId,
    );
    if (!amharic && !latinFont) {
      dispatch(updateBibleSettings({fontId: 'lexend', fontWeight: '400'}));
    } else if (amharic && latinFont) {
      dispatch(updateBibleSettings({fontId: 'nokia', fontWeight: '400'}));
    }
  }, [translation, settings.fontId, dispatch]);
  const highlightByVerse = useMemo(() => {
    const map = {};
    highlights.forEach(item =>
      (item.verseIds || []).forEach(verse => {
        const idValue = verseId(verse);
        if (idValue) map[idValue] = item;
      }),
    );
    return map;
  }, [highlights]);
  const comparisonHighlightByVerse = useMemo(() => {
    const map = {};
    comparisonHighlights.forEach(item =>
      (item.verseIds || []).forEach(verse => {
        const idValue = verseId(verse);
        if (idValue) map[idValue] = item;
      }),
    );
    return map;
  }, [comparisonHighlights]);
  const activeTranslation =
    selectionSource === 'compare' ? comparison : translation;
  const activeBook = selectionSource === 'compare' ? comparisonBook : book;
  const activeVerses =
    selectionSource === 'compare' ? comparisonVerses : verses;
  const activeTranslationId = translationId(activeTranslation);
  const activeBookId = activeBook?._id;
  const activeHighlightMap =
    selectionSource === 'compare'
      ? comparisonHighlightByVerse
      : highlightByVerse;
  const selectedVerses = useMemo(
    () => activeVerses.filter(verse => selected.includes(verseNumber(verse))),
    [activeVerses, selected],
  );
  const selectedIds = selectedVerses.map(verseId).filter(Boolean);
  const selectedNote = useMemo(() => {
    if (!selectedIds.length) return null;
    return notes.find(note => {
      const noteIds = Array.isArray(note.verseIds)
        ? note.verseIds.map(verseId).filter(Boolean)
        : [];
      return selectedIds.length === 1
        ? noteIds.includes(selectedIds[0])
        : selectedIds.every(value => noteIds.includes(value));
    }) || null;
  }, [notes, selectedIds.join('|')]);
  const noteByVerse = useMemo(() => {
    const map = {};
    notes.forEach(note => {
      (Array.isArray(note.verseIds) ? note.verseIds : []).forEach(value => {
        const valueId = verseId(value);
        if (valueId) map[valueId] = note;
      });
    });
    return map;
  }, [notes]);
  const reference = selected.length
    ? formatPassageReference({
        book: activeBook,
        chapter,
        verseNumbers: selected,
        translation: activeTranslation,
      })
    : '';
  const bookmark = bookmarks.find(
    item => item.book?._id === bookId && Number(item.chapterNumber) === chapter,
  );
  const selectedHighlightIds = [
    ...new Set(
      selectedVerses
        .map(verse => activeHighlightMap[verse._id]?._id)
        .filter(Boolean),
    ),
  ];

  useEffect(() => {
    if (translation || !translations.length || !route.params?.passage) return;
    const [translationSlug] = String(route.params.passage).split('.');
    const normalized = decodeURIComponent(translationSlug).toLowerCase();
    const match = translations.find(item =>
      [item.translationCode, item.id, item._id]
        .filter(Boolean)
        .some(value => String(value).toLowerCase() === normalized),
    );
    if (match) setTranslation(match);
  }, [translation, translations, route.params?.passage]);
  useEffect(() => {
    if (book || !books.length || !route.params?.passage) return;
    const parts = String(route.params.passage).split('.');
    const slug = decodeURIComponent(parts[1] || '').toLowerCase();
    const match = books.find(item =>
      [item.standardId, item.name, item.localizedName, item._id]
        .filter(Boolean)
        .some(
          value => String(value).toLowerCase().replace(/\s+/g, '-') === slug,
        ),
    );
    if (match) {
      setBook(match);
      setChapter(Number(parts[2]) || 1);
      const requested = parseVerseRanges(route.params?.v);
      if (requested.length) setSelected(requested);
    }
  }, [book, books, route.params?.passage, route.params?.v]);

  useEffect(() => {
    if (!books.length || !book) return;
    const exact = books.find(item => item._id === book._id);
    if (exact) {
      if (exact !== book) setBook(exact);
      setPassageMessage('');
      return;
    }
    const equivalent = matchEquivalentBook(book, books);
    if (equivalent) {
      setBook(equivalent);
      setChapter(current =>
        Math.min(current, Number(equivalent.chapterCount) || current),
      );
      setPassageMessage('');
    } else
      setPassageMessage(
        `${bookLabel(book)} is not available in ${
          translation?.displayName
        }. Choose another book.`,
      );
  }, [books, book, translation]);
  useEffect(() => {
    setSelected([]);
    setFocusedVerse(null);
    setSelectionSource('primary');
    listRef.current?.scrollToOffset?.({offset: 0, animated: false});
  }, [id, bookId, chapter, comparisonId]);
  useEffect(() => {
    const requested = (requestedSelectionRef.current || []).map(Number);
    if (!verses.length || !requested.length) return;
    requestedSelectionRef.current = [];
    setSelected(requested);
    const index = verses.findIndex(item =>
      requested.includes(verseNumber(item)),
    );
    if (index >= 0)
      setTimeout(
        () =>
          listRef.current?.scrollToIndex?.({
            index,
            animated: true,
            viewPosition: 0.5,
          }),
        80,
      );
  }, [verses]);
  useEffect(() => {
    const requested = requestedFocusRef.current;
    if (!verses.length || !requested) return;
    requestedFocusRef.current = null;
    setFocusedVerse(requested);
    const index = verses.findIndex(item => verseNumber(item) === requested);
    if (index >= 0) {
      setTimeout(
        () =>
          listRef.current?.scrollToIndex?.({
            index,
            animated: true,
            viewPosition: 0.35,
          }),
        80,
      );
    }
  }, [verses]);
  useEffect(() => {
    const offset = pendingScrollRestoreRef.current;
    if (!verses.length || offset == null) return;
    pendingScrollRestoreRef.current = null;
    setTimeout(() => listRef.current?.scrollToOffset?.({offset, animated: false}), 90);
  }, [verses, bookId, chapter]);
  useEffect(() => {
    if (!user || !verses[0] || !id || !bookId) return undefined;
    const timer = setTimeout(
      () =>
        saveProgress({
          translationId: id,
          bookId,
          chapterNumber: chapter,
          verseId: verses[0]._id,
        }),
      800,
    );
    return () => clearTimeout(timer);
  }, [user, id, bookId, chapter, verses, saveProgress]);

  const authGate = useCallback(
    action => {
      if (user) return true;
      dispatch(setPendingBibleAction(action));
      navigation.getParent()?.getParent()?.navigate('Login', {
        returnToBible: true,
        reason:
          'Sign in to sync this Bible study action with your Ezra account.',
      });
      return false;
    },
    [user, dispatch, navigation],
  );
  const highlight = useCallback(
    async color => {
      if (!selectedIds.length) return;
      if (!authGate({type: 'highlight', color})) return;
      try {
        await createHighlight({
          translationId: activeTranslationId,
          bookId: activeBookId,
          chapterNumber: chapter,
          verseIds: selectedIds,
          color,
        }).unwrap();
        setSelected([]);
        Toast.show({type: 'success', text1: 'Highlight saved'});
      } catch (e) {
        Toast.show({
          type: 'error',
          text1: 'Could not save highlight',
          text2: e?.data?.error || 'Please try again.',
        });
      }
    },
    [
      selectedIds,
      authGate,
      createHighlight,
      activeTranslationId,
      activeBookId,
      chapter,
    ],
  );
  const saveNote = useCallback(
    async text => {
      if (!authGate({type: 'note', text})) return;
      try {
        if (editingNote?._id || editingNote?.id) {
          await updateNote({
            noteId: editingNote._id || editingNote.id,
            text: text.trim(),
          }).unwrap();
        } else {
          await createNote({
            translationId: activeTranslationId,
            bookId: activeBookId,
            chapterNumber: chapter,
            verseIds: selectedIds,
            text: text.trim(),
          }).unwrap();
        }
        setNoteOpen(false);
        setEditingNote(null);
        setSelected([]);
        dispatch(clearPendingBibleAction());
        Toast.show({type: 'success', text1: 'Note saved'});
      } catch (e) {
        Toast.show({
          type: 'error',
          text1: 'Could not save note',
          text2: e?.data?.error || 'Please try again.',
        });
      }
    },
    [
      authGate,
      createNote,
      updateNote,
      editingNote,
      activeTranslationId,
      activeBookId,
      chapter,
      selectedIds,
      dispatch,
    ],
  );
  useEffect(() => {
    if (!user || !pendingAction) return;
    if (pendingAction.type === 'highlight') {
      dispatch(clearPendingBibleAction());
      highlight(pendingAction.color);
    } else if (pendingAction.type === 'note') {
      saveNote(pendingAction.text);
    }
  }, [user, pendingAction, highlight, saveNote, dispatch]);
  const toggleBookmark = useCallback(async () => {
    if (!authGate({type: 'bookmark'})) return;
    try {
      if (bookmark) await deleteBookmark(bookmark._id).unwrap();
      else
        await createBookmark({
          translationId: id,
          bookId,
          chapterNumber: chapter,
          verseIds: verses[0]?._id ? [verses[0]._id] : [],
          type: 'chapter',
        }).unwrap();
      Toast.show({
        type: 'success',
        text1: bookmark ? 'Saved chapter removed' : 'Chapter saved',
      });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Bookmark could not be updated',
        text2: e?.data?.error,
      });
    }
  }, [
    authGate,
    bookmark,
    deleteBookmark,
    createBookmark,
    id,
    bookId,
    chapter,
    verses,
  ]);
  useEffect(() => {
    if (user && pendingAction?.type === 'bookmark') {
      dispatch(clearPendingBibleAction());
      toggleBookmark();
    }
  }, [user, pendingAction?.type, dispatch, toggleBookmark]);
  const removeHighlights = () =>
    Alert.alert(
      'Remove highlight?',
      'This removes the highlight from the selected verses.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                selectedHighlightIds.map(value =>
                  deleteHighlight(value).unwrap(),
                ),
              );
              setSelected([]);
            } catch {
              Toast.show({type: 'error', text1: 'Could not remove highlight'});
            }
          },
        },
      ],
    );
  const selectedText = selectedVerses.map(verse => verse.text).join(' ');
  const copy = () => {
    Clipboard.setString(`“${selectedText}” ${reference}`);
    Toast.show({type: 'success', text1: 'Scripture copied'});
    setSelected([]);
  };
  const share = async () => {
    const path = buildBiblePath({
      translation: activeTranslation,
      book: activeBook,
      chapter,
      verseNumbers: selected,
    });
    await Share.share({
      message: `${reference || `${bookLabel(activeBook)} ${chapter}`}\n${
        activeTranslation?.displayName
      }\n${selectedText}\nhttps://ezraseminary.com${path}`,
    });
  };
  const moveChapter = direction => {
    const next = chapter + direction;
    if (next >= 1 && next <= Number(book?.chapterCount || chapter)) {
      setChapter(next);
      return;
    }
    const index = books.findIndex(item => item._id === bookId);
    const nextBook = books[index + direction];
    if (nextBook) {
      setBook(nextBook);
      setChapter(direction > 0 ? 1 : Number(nextBook.chapterCount));
    }
  };
  const swapTranslations = () => {
    if (!comparison || !comparisonBook) return;
    const old = translation;
    setTranslation(comparison);
    setBook(comparisonBook);
    setComparison(old);
    setCompareTab('primary');
    setSelectionSource('primary');
  };
  const maxWidth =
    settings.readingWidth === 'focused'
      ? 680
      : settings.readingWidth === 'comfortable'
      ? 850
      : 1100;
  const header = (
    <View style={[styles.contentWidth, {maxWidth, backgroundColor: colors.bg}]}>
      <Animated.View
        style={[
          styles.topBarClip,
          {
            height: topBarProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 58],
            }),
            opacity: topBarProgress,
          },
        ]}>
        <View style={[styles.readerTop, {borderBottomColor: colors.border}]}>
          <TouchableOpacity
            accessibilityLabel={referenceHistory.length ? 'Return to previous reference' : 'Open books and chapters'}
            onPress={() => referenceHistory.length ? returnFromCrossReference() : setSidebarOpen(true)}
            style={styles.icon}>
            {referenceHistory.length ? (
              <ArrowLeft size={24} color={colors.text} />
            ) : (
              <List size={25} color={colors.text} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTranslationPicker(true)}
            style={styles.translationButton}>
            <Text
              numberOfLines={1}
              style={[styles.translationName, {color: colors.text}]}>
              {translation?.displayName}
            </Text>
            <CaretDown size={16} color={BIBLE_COLORS.gold} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Search Bible"
            onPress={() => navigation.navigate('BibleSearch', {translation})}
            style={styles.icon}>
            <MagnifyingGlass size={23} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Compare translations"
            onPress={() => setCompareOpen(value => !value)}
            style={styles.icon}>
            <Books
              size={23}
              color={compareOpen ? colors.accent : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="More Bible tools"
            onPress={() => setOverflowOpen(true)}
            style={styles.icon}>
            <DotsThreeVertical size={24} color={colors.text} weight="bold" />
          </TouchableOpacity>
        </View>
      </Animated.View>
      {passageMessage ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{passageMessage}</Text>
        </View>
      ) : null}
      {compareOpen ? (
        <View style={[styles.compareControls, {borderColor: colors.border}]}>
          <TouchableOpacity onPress={() => setTranslationPicker('compare')}>
            <Text style={styles.compareLink}>
              {comparison?.displayName || 'Choose comparison translation'}
            </Text>
          </TouchableOpacity>
          {comparison ? (
            <TouchableOpacity
              accessibilityLabel="Swap translations"
              onPress={swapTranslations}
              style={styles.icon}>
              <Swap size={21} color={BIBLE_COLORS.gold} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {compareOpen &&
      comparison &&
      comparisonBooks.length &&
      !comparisonBook ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            {bookLabel(book)} is not available in {comparison.displayName}.
            Choose another comparison translation or passage.
          </Text>
        </View>
      ) : null}
      {compareOpen && comparison && width < 768 ? (
        <View style={[styles.segment, {backgroundColor: colors.card}]}>
          {[
            ['primary', 'Primary'],
            ['compare', 'Compare'],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              accessibilityState={{selected: compareTab === key}}
              onPress={() => setCompareTab(key)}
              style={[
                styles.segmentItem,
                compareTab === key && styles.segmentActive,
              ]}>
              <Text
                style={[
                  styles.segmentText,
                  {color: compareTab === key ? '#FFFFFF' : colors.text},
                ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <Text style={[styles.chapterHeading, {color: colors.text}]}>
        {bookLabel(book)} {chapter}
      </Text>
    </View>
  );
  const renderVerse = (verse, comparisonSide = false) => {
    const number = verseNumber(verse);
    const source = comparisonSide ? 'compare' : 'primary';
    const active = selectionSource === source && selected.includes(number);
    const focused = !comparisonSide && focusedVerse === number;
    const highlightItem = comparisonSide
      ? comparisonHighlightByVerse[verseId(verse)]
      : highlightByVerse[verseId(verse)];
    const highlightColor = highlightColors.find(
      item => item.key === highlightItem?.color,
    )?.hex;
    const hasNote = !comparisonSide && Boolean(noteByVerse[verseId(verse)]);
    const crossReferences = !comparisonSide
      ? getCrossReferences(book, chapter, number)
      : [];
    const crossReferenceKey = `${source}:${verseId(verse)}`;
    return (
      <View
        style={[
          styles.verse,
          {
            backgroundColor: active
              ? colors.card
              : highlightColor
              ? alphaColor(highlightColor)
              : 'transparent',
            borderColor: hasNote || active ? colors.accent : 'transparent',
            borderWidth: hasNote ? 1 : 0,
            borderStyle: hasNote ? 'dotted' : 'solid',
            borderRadius: hasNote ? 9 : 0,
            borderLeftWidth: hasNote ? 1 : 3,
          },
        ]}>
        <View style={styles.verseLine}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Verse ${number}. ${verse.text}`}
            accessibilityState={{selected: active}}
            onPress={() => {
              setFocusedVerse(null);
              if (selectionSource !== source) {
                setSelectionSource(source);
                setSelected([number]);
                return;
              }
              setSelected(current =>
                current.includes(number)
                  ? current.filter(value => value !== number)
                  : [...current, number].sort((a, b) => a - b),
              );
            }}
            style={styles.verseTap}>
            <Text
              style={[
                styles.verseText,
                {
                  color: colors.text,
                  ...getReaderFontStyle(
                    settings.fontId || 'nokia',
                    settings.fontWeight,
                  ),
                  fontSize: settings.fontSize,
                  lineHeight: settings.fontSize * settings.lineSpacing,
                  textDecorationLine: focused ? 'underline' : 'none',
                  textDecorationColor: colors.accent,
                },
              ]}>
              <Text style={[styles.number, {color: colors.accent}]}>{number}</Text>
              {'  '}
              {verse.text}
              {crossReferences.length ? (
                <Text
                  accessibilityLabel={`Show cross references for verse ${number}`}
                  suppressHighlighting
                  onPress={event => {
                    event?.stopPropagation?.();
                    setExpandedCrossReferences(current => ({
                      ...current,
                      [crossReferenceKey]: !current[crossReferenceKey],
                    }));
                  }}
                  style={[styles.crossRefInline, {color: colors.accent}]}>
                  {' ⛓︎'}
                </Text>
              ) : null}
            </Text>
          </TouchableOpacity>
        </View>
        {expandedCrossReferences[crossReferenceKey] ? (
          <CrossReferencePanel
            book={book}
            chapter={chapter}
            verse={number}
            books={books}
            translation={translation}
            translationId={id}
            colors={colors}
            onNavigate={openCrossReference}
          />
        ) : null}
      </View>
    );
  };
  const showComparison =
    compareOpen &&
    comparison &&
    comparisonBook &&
    (width >= 768 || compareTab === 'compare');
  if (showComparison && width >= 768) {
    return (
      <View
        style={[
          styles.screen,
          {backgroundColor: colors.bg, paddingTop: insets.top},
        ]}>
        {header}
        <View style={styles.columns}>
          <FlatList
            data={verses}
            keyExtractor={item => item._id}
            renderItem={({item}) => renderVerse(item)}
            contentContainerStyle={styles.columnContent}
          />
          <FlatList
            data={comparisonVerses}
            keyExtractor={item => item._id}
            renderItem={({item}) => renderVerse(item, true)}
            contentContainerStyle={styles.columnContent}
          />
        </View>
        {!noteOpen ? (
          <VerseActionBar
            reference={reference}
            translationName={activeTranslation?.displayName}
            onHighlight={highlight}
            onRemoveHighlight={removeHighlights}
            canRemoveHighlight={selectedHighlightIds.length > 0}
            onNote={() => {
              setEditingNote(selectedNote);
              setNoteOpen(true);
            }}
            onCopy={copy}
            onShare={share}
            onClear={() => setSelected([])}
            busy={savingHighlight}
            darkMode={darkMode}
            highlightColors={highlightColors}
            noteActionLabel={selectedNote ? 'View note' : 'Note'}
          />
        ) : null}
      </View>
    );
  }
  const displayVerses = showComparison ? comparisonVerses : verses;
  return (
    <View
      style={[
        styles.screen,
        {backgroundColor: colors.bg, paddingTop: insets.top},
      ]}>
      <FlatList
        ref={listRef}
        data={displayVerses}
        keyExtractor={item => item._id}
        ListHeaderComponent={header}
        renderItem={({item}) => renderVerse(item, showComparison)}
        refreshing={isFetching || comparisonLoading}
        onRefresh={refetch}
        onEndReached={() => {
          if (settings.continuousScrolling && !isFetching && !comparisonLoading)
            moveChapter(1);
        }}
        onEndReachedThreshold={0.15}
        onScrollBeginDrag={beginReaderScroll}
        onScrollEndDrag={clearLongScrollTimer}
        onMomentumScrollEnd={clearLongScrollTimer}
        onScroll={trackReaderScroll}
        scrollEventThrottle={16}
        onScrollToIndexFailed={info =>
          setTimeout(
            () =>
              listRef.current?.scrollToOffset({
                offset: Math.max(0, info.averageItemLength * info.index),
                animated: true,
              }),
            50,
          )
        }
        contentContainerStyle={[
          styles.list,
          {paddingBottom: (selected.length ? 205 : 76) + insets.bottom},
        ]}
        ListEmptyComponent={
          isLoading ? (
            <View
              accessibilityLabel="Loading chapter"
              style={styles.skeletonWrap}>
              {[94, 82, 91, 74, 88, 79].map((size, index) => (
                <View
                  key={`${size}-${index}`}
                  style={[
                    styles.skeleton,
                    {
                      width: `${size}%`,
                      backgroundColor: darkMode ? '#303A41' : '#E5E7E8',
                    },
                  ]}
                />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, {color: colors.text}]}>
                {error
                  ? 'Unable to load this chapter'
                  : 'This chapter has no verses.'}
              </Text>
              {error ? (
                <TouchableOpacity onPress={refetch}>
                  <Text style={styles.compareLink}>Try again</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
      />
      {!noteOpen ? (
        <VerseActionBar
          reference={reference}
          translationName={activeTranslation?.displayName}
          onHighlight={highlight}
          onRemoveHighlight={removeHighlights}
          canRemoveHighlight={selectedHighlightIds.length > 0}
          onNote={() => {
            setEditingNote(selectedNote);
            setNoteOpen(true);
          }}
          onCopy={copy}
          onShare={share}
          onClear={() => setSelected([])}
          busy={savingHighlight}
          darkMode={darkMode}
          highlightColors={highlightColors}
          noteActionLabel={selectedNote ? 'View note' : 'Note'}
        />
      ) : null}
      {!selected.length ? (
        <View
          style={[
            styles.bibleTabBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}>
          <TouchableOpacity
            accessibilityLabel="Previous chapter"
            onPress={() => moveChapter(-1)}
            style={styles.bottomIcon}>
            <CaretLeft size={26} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Choose book and chapter"
            onPress={() => setSidebarOpen(true)}
            style={styles.bottomTitleWrap}>
            <Text
              numberOfLines={1}
              style={[styles.bottomTitle, {color: colors.text}]}>
              {bookLabel(book)} {chapter}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Next chapter"
            onPress={() => moveChapter(1)}
            style={styles.bottomIcon}>
            <CaretRight size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
      ) : null}
      <TranslationPicker
        visible={Boolean(translationPicker)}
        onClose={() => setTranslationPicker(false)}
        translations={translations.filter(item =>
          translationPicker === 'compare' ? translationId(item) !== id : true,
        )}
        selectedId={translationPicker === 'compare' ? comparisonId : id}
        onSelect={item =>
          translationPicker === 'compare'
            ? setComparison(item)
            : setTranslation(item)
        }
        darkMode={darkMode}
      />
      <BiblePassageSidebar
        visible={sidebarOpen}
        books={books}
        currentBook={book}
        currentChapter={chapter}
        translation={translation}
        colors={colors}
        onClose={() => setSidebarOpen(false)}
        onSelect={(nextBook, nextChapter) => {
          const changingBook = nextBook._id !== book?._id;
          setBook(nextBook);
          if (nextChapter) setChapter(nextChapter);
          else if (changingBook) setChapter(1);
        }}
      />
      <BibleOverflowMenu
        visible={overflowOpen}
        colors={colors}
        saved={Boolean(bookmark)}
        onClose={() => setOverflowOpen(false)}
        onSettings={() => setSettingsOpen(true)}
        onSave={toggleBookmark}
        onShare={share}
        onSavedContent={() =>
          user ? navigation.navigate('MyBible') : authGate({type: 'library'})
        }
        onHighlightManager={() => navigation.navigate('BibleHighlightManager')}
        onExit={() => navigation.popToTop()}
      />
      <ReaderSettings
        visible={settingsOpen}
        settings={settings}
        translation={translation}
        onChange={value => {
          dispatch(updateBibleSettings(value));
          if (value.theme) {
            dispatch(setDarkMode(isDarkBibleTheme(value.theme)));
          }
        }}
        onClose={() => setSettingsOpen(false)}
        darkMode={darkMode}
      />
      <NoteEditor
        visible={noteOpen}
        reference={reference}
        initialText={editingNote?.text || (pendingAction?.type === 'note' ? pendingAction.text : '')}
        onClose={() => {
          setNoteOpen(false);
          setEditingNote(null);
        }}
        onSave={saveNote}
        saving={savingNote || updatingNote}
        darkMode={darkMode}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  screen: {flex: 1},
  contentWidth: {width: '100%', alignSelf: 'center'},
  topBarClip: {overflow: 'hidden'},
  readerTop: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {width: 46, height: 46, alignItems: 'center', justifyContent: 'center'},
  translationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  translationName: {fontFamily: 'Lato-Bold', fontSize: 13, maxWidth: '80%'},
  passageButton: {
    minHeight: 78,
    marginHorizontal: 15,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookHeading: {
    fontFamily: 'Nokia Pure Headline Bold',
    fontSize: 29,
    fontWeight: '900',
    marginHorizontal: 18,
    marginTop: 20,
    marginBottom: 12,
  },
  chapterHeading: {
    fontFamily: 'Nokia Pure Headline Bold',
    fontSize: 34,
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
    marginTop: 18,
    marginBottom: 12,
  },
  verseCount: {fontFamily: 'Lato-Regular', fontSize: 12, marginTop: 3},
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingVertical: 9,
  },
  action: {
    width: 54,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: 'Lato-Bold',
    fontSize: 9,
    marginTop: 4,
    maxWidth: 54,
  },
  warning: {
    margin: 15,
    padding: 13,
    backgroundColor: '#FFF0DB',
    borderRadius: 12,
  },
  warningText: {color: '#874E00', fontFamily: 'Lato-Bold', fontSize: 13},
  compareControls: {
    marginHorizontal: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareLink: {
    color: BIBLE_COLORS.gold,
    fontFamily: 'Lato-Bold',
    fontSize: 13,
    paddingVertical: 10,
  },
  segment: {margin: 12, padding: 4, borderRadius: 22, flexDirection: 'row'},
  segmentItem: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {backgroundColor: BIBLE_COLORS.gold},
  segmentText: {fontFamily: 'Lato-Bold', fontSize: 13},
  list: {flexGrow: 1},
  verse: {
    marginHorizontal: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderLeftWidth: 3,
    borderRadius: 0,
    minHeight: 48,
  },
  verseLine: {flexDirection: 'row', alignItems: 'flex-start'},
  verseTap: {flex: 1},
  crossRefInline: {fontFamily: 'Lato-Bold', fontSize: 11},
  crossRefBox: {marginTop: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 10},
  crossRefItem: {paddingVertical: 9},
  crossRefLabel: {fontFamily: 'Lato-Bold', fontSize: 12},
  crossRefText: {fontFamily: 'Lato-Regular', fontSize: 12, lineHeight: 17, marginTop: 3},
  crossRefMore: {alignItems: 'center', paddingVertical: 9},
  verseText: {letterSpacing: 0.1},
  number: {
    paddingHorizontal: 4,
    fontFamily: 'Lato-Black',
    fontWeight: '900',
    fontSize: 13,
  },
  loading: {padding: 60},
  skeletonWrap: {padding: 22},
  skeleton: {height: 19, borderRadius: 8, marginBottom: 15},
  empty: {alignItems: 'center', padding: 45},
  emptyTitle: {fontFamily: 'Lato-Bold', textAlign: 'center', fontSize: 16},
  chapterNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 22,
  },
  navButton: {
    minWidth: 116,
    height: 48,
    borderWidth: 1,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {fontFamily: 'Lato-Bold', fontSize: 13},
  columns: {flex: 1, flexDirection: 'row'},
  columnContent: {paddingBottom: 120},
  columnsItem: {flex: 1},
  bibleTabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 54,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
  },
  bottomIcon: {
    width: 68,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTitleWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  bottomTitle: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 16},
});
export default BibleReader;
