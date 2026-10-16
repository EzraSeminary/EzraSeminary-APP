import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {ArrowLeft, MagnifyingGlass, X} from 'phosphor-react-native';
import {useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useLazySearchBibleQuery} from '../../features/bible/bibleApi';
import {
  bookLabel,
  translationId,
  verseNumber,
} from '../../features/bible/models';
import {
  BIBLE_COLORS,
  BIBLE_SEARCH_DEBOUNCE_MS,
  BIBLE_SEARCH_LIMIT,
  getBibleTheme,
  isDarkBibleTheme,
} from '../../features/bible/constants';
import {splitHighlightedText} from '../../features/bible/searchUtils';
import {getReaderFontFamily} from '../../utils/readerFonts';
import {isAmharicTranslation} from '../../features/bible/reference';

const HighlightedText = ({text, query, color, fontFamily}) => {
  return (
    <Text style={[styles.resultText, {color, fontFamily}]}>
      {splitHighlightedText(text, query).map((part, index) =>
        part.match ? (
          <Text key={`${part}-${index}`} style={styles.match}>
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </Text>
  );
};

const BibleSearch = ({navigation, route}) => {
  const translation = route.params?.translation;
  const darkMode = useSelector(state => state.ui.darkMode);
  const settings = useSelector(state => state.bible.settings);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [message, setMessage] = useState(
    'Type at least two characters to search Scripture.',
  );
  const [search, {isFetching, error}] = useLazySearchBibleQuery();
  const requestRef = useRef(0);
  useEffect(() => {
    const request = ++requestRef.current;
    const trimmed = query.trim();
    setPage(1);
    setItems([]);
    setPagination(null);
    if (trimmed.length < 2) {
      setMessage('Type at least two characters to search Scripture.');
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await search({
          translationId: translationId(translation),
          q: trimmed,
          page: 1,
          limit: BIBLE_SEARCH_LIMIT,
        }).unwrap();
        if (request !== requestRef.current) return;
        setItems(data?.items || []);
        setPagination(data?.pagination || null);
        setMessage(
          (data?.items || []).length ? '' : 'No verses matched your search.',
        );
      } catch {
        if (request === requestRef.current)
          setMessage(
            'Search is unavailable. Check your connection and try again.',
          );
      }
    }, BIBLE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, search, translation]);
  const loadMore = async () => {
    if (isFetching || !pagination || page >= pagination.pages) return;
    const next = page + 1;
    const request = requestRef.current;
    try {
      const data = await search({
        translationId: translationId(translation),
        q: query.trim(),
        page: next,
        limit: BIBLE_SEARCH_LIMIT,
      }).unwrap();
      if (request !== requestRef.current) return;
      setItems(current => [
        ...current,
        ...(Array.isArray(data?.items) ? data.items : []),
      ]);
      setPagination(data?.pagination || pagination);
      setPage(next);
    } catch {}
  };
  const colors = useMemo(() => {
    const matchesApp = darkMode === isDarkBibleTheme(settings.theme);
    const theme = getBibleTheme(
      matchesApp ? settings.theme : darkMode ? 'charcoal' : 'paper',
    );
    return {
      bg: theme.background,
      card: theme.card,
      text: theme.text,
      muted: theme.muted,
      border: theme.border,
      accent: theme.accent,
    };
  }, [darkMode, settings.theme]);
  const searchFontId = isAmharicTranslation(translation)
    ? ['lexend', 'inter', 'montserrat'].includes(settings.fontId)
      ? 'nokia'
      : settings.fontId
    : ['lexend', 'inter', 'montserrat'].includes(settings.fontId)
    ? settings.fontId
    : 'lexend';
  return (
    <View
      style={[
        styles.screen,
        {backgroundColor: colors.bg, paddingTop: insets.top},
      ]}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={styles.icon}>
          <ArrowLeft size={23} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.heading}>
          <Text style={[styles.title, {color: colors.text}]}>
            Search the Bible
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.translation, {color: colors.muted}]}>
            {translation?.displayName}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.search,
          {backgroundColor: colors.card, borderColor: colors.border},
        ]}>
        <MagnifyingGlass size={21} color={colors.accent} />
        <TextInput
          autoFocus
          accessibilityLabel="Search Scripture"
          value={query}
          onChangeText={setQuery}
          placeholder="Search words or phrases"
          placeholderTextColor={colors.muted}
          style={[styles.input, {color: colors.text}]}
        />
        {query ? (
          <TouchableOpacity
            accessibilityLabel="Clear search"
            onPress={() => setQuery('')}
            style={styles.clear}>
            <X size={19} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {pagination ? (
        <Text style={[styles.total, {color: colors.muted}]}>
          {pagination.total} results
        </Text>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={item => item._id}
        contentContainerStyle={[
          styles.list,
          {paddingBottom: insets.bottom + 25},
        ]}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !isFetching ? (
            <Text style={[styles.message, {color: colors.muted}]}>
              {error ? 'Search failed. Try again.' : message}
            </Text>
          ) : null
        }
        ListFooterComponent={
          isFetching ? (
            <ActivityIndicator
              color={BIBLE_COLORS.gold}
              style={styles.loading}
            />
          ) : null
        }
        renderItem={({item}) => (
          <TouchableOpacity
            onPress={() =>
              navigation.push('BibleReader', {
                translation,
                book: item.book,
                chapterNumber: item.chapterNumber,
                focusVerseNumber: verseNumber(item),
              })
            }
            style={[
              styles.result,
              {backgroundColor: colors.card, borderColor: colors.border},
            ]}>
            <Text style={[styles.reference, {color: colors.accent}]}>
              {bookLabel(item.book)} {item.chapterNumber}:{verseNumber(item)}
            </Text>
            <HighlightedText
              text={item.text}
              query={query}
              color={colors.text}
              fontFamily={getReaderFontFamily(
                searchFontId,
                settings.fontWeight,
              )}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  screen: {flex: 1},
  header: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  icon: {width: 48, height: 48, alignItems: 'center', justifyContent: 'center'},
  heading: {flex: 1},
  title: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 23},
  translation: {fontFamily: 'Lato-Regular', fontSize: 12, marginTop: 2},
  search: {
    height: 52,
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 26,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    fontFamily: 'Lato-Regular',
    fontSize: 16,
    marginLeft: 9,
  },
  clear: {
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  total: {
    fontFamily: 'Lato-Bold',
    fontSize: 12,
    marginHorizontal: 20,
    marginTop: 13,
  },
  list: {padding: 16, flexGrow: 1},
  result: {borderWidth: 1, borderRadius: 15, padding: 15, marginBottom: 10},
  reference: {
    color: BIBLE_COLORS.gold,
    fontFamily: 'Lato-Bold',
    fontSize: 13,
    marginBottom: 7,
  },
  resultText: {
    fontFamily: 'Waldba_Wookianos_Regular_82dc20e729',
    fontSize: 17,
    lineHeight: 27,
  },
  match: {backgroundColor: 'rgba(234,146,21,.28)', fontWeight: '700'},
  message: {
    textAlign: 'center',
    fontFamily: 'Lato-Regular',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 50,
    paddingHorizontal: 30,
  },
  loading: {padding: 22},
});
export default BibleSearch;
