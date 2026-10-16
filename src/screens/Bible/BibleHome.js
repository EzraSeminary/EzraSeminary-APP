import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {ArrowLeft, CaretDown, MagnifyingGlass} from 'phosphor-react-native';
import {useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  useGetBibleBooksQuery,
  useGetBibleTranslationsQuery,
} from '../../features/bible/bibleApi';
import {bookLabel, translationId} from '../../features/bible/models';
import {BIBLE_COLORS} from '../../features/bible/constants';
import TranslationPicker from '../../features/bible/components/TranslationPicker';
import BookChapterPicker from '../../features/bible/components/BookChapterPicker';

const groupsFor = books =>
  [
    ['Old Testament', books.filter(book => book.testament === 'old')],
    ['New Testament', books.filter(book => book.testament === 'new')],
    [
      'Additional Books',
      books.filter(book => !['old', 'new'].includes(book.testament)),
    ],
  ].filter(([, items]) => items.length);

const BibleHome = ({navigation}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const insets = useSafeAreaInsets();
  const [translation, setTranslation] = useState(null);
  const [picker, setPicker] = useState(false);
  const [chapterBook, setChapterBook] = useState(null);
  const {
    data: translations = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetBibleTranslationsQuery();
  useEffect(() => {
    if (!translation && translations.length) {
      const nasv = translations.find(item =>
        /nasv/i.test(`${item.translationCode || ''} ${item.displayName || ''}`),
      );
      setTranslation(nasv || translations[0]);
    }
    if (
      translation &&
      !translations.some(
        item => translationId(item) === translationId(translation),
      )
    )
      setTranslation(translations[0] || null);
  }, [translations, translation]);
  const id = translationId(translation);
  const {
    data: books = [],
    isLoading: booksLoading,
    error: booksError,
    refetch: refetchBooks,
  } = useGetBibleBooksQuery(id, {skip: !id});
  const groups = useMemo(() => groupsFor(books), [books]);
  const colors = {
    bg: darkMode ? '#151A1E' : BIBLE_COLORS.background,
    card: darkMode ? BIBLE_COLORS.darkCard : '#FFFFFF',
    text: darkMode ? '#F8F8F8' : BIBLE_COLORS.ink,
    muted: darkMode ? '#B9C1C6' : BIBLE_COLORS.secondary,
    border: darkMode ? '#3A444B' : BIBLE_COLORS.border,
  };
  const openBook = (book, chapterNumber = 1, verseNumbers = []) =>
    navigation.navigate('BibleReader', {
      translation,
      book,
      chapterNumber,
      verseNumbers,
    });
  const refresh = async () =>
    Promise.all([refetch(), id ? refetchBooks() : Promise.resolve()]);
  return (
    <View style={[styles.screen, {backgroundColor: colors.bg}]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refresh}
            tintColor={BIBLE_COLORS.gold}
          />
        }
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 18) + 30,
        }}>
        <View
          style={[
            styles.compactHeader,
            {paddingTop: insets.top + 8, borderBottomColor: colors.border},
          ]}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            style={styles.headerIcon}>
            <ArrowLeft size={23} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.compactTitle, {color: colors.text}]}>
              Bible
            </Text>
            <Text style={[styles.compactSubtitle, {color: colors.muted}]}>
              Choose a translation, book and chapter
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Search Bible"
            onPress={() => navigation.navigate('BibleSearch', {translation})}
            style={styles.headerIcon}>
            <MagnifyingGlass size={23} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.body}>
          {isLoading ? (
            <ActivityIndicator
              color={BIBLE_COLORS.gold}
              style={styles.loader}
            />
          ) : error ? (
            <State
              title="Unable to load Bibles"
              action="Try again"
              onPress={refetch}
              colors={colors}
            />
          ) : !translations.length ? (
            <State
              title="No published translations are available."
              action="Try again"
              onPress={refetch}
              colors={colors}
            />
          ) : (
            <>
              <Text style={[styles.sectionLabel, {color: colors.text}]}>
                Translation
              </Text>
              <TouchableOpacity
                accessibilityLabel="Choose Bible translation"
                onPress={() => setPicker(true)}
                style={[
                  styles.selector,
                  {backgroundColor: colors.card, borderColor: colors.border},
                ]}>
                <View style={styles.flex}>
                  <Text style={[styles.selectorTitle, {color: colors.text}]}>
                    {translation?.displayName}
                  </Text>
                  <Text style={[styles.selectorMeta, {color: colors.muted}]}>
                    {translation?.language} · {translation?.translationCode}
                  </Text>
                </View>
                <CaretDown size={22} color={BIBLE_COLORS.gold} />
              </TouchableOpacity>
              <View style={styles.quickRow}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('BibleSearch', {translation})
                  }
                  style={[
                    styles.quick,
                    {backgroundColor: colors.card, borderColor: colors.border},
                  ]}>
                  <MagnifyingGlass size={22} color={BIBLE_COLORS.gold} />
                  <Text style={[styles.quickText, {color: colors.text}]}>
                    Search
                  </Text>
                </TouchableOpacity>
              </View>
              {booksLoading ? (
                <ActivityIndicator
                  color={BIBLE_COLORS.gold}
                  style={styles.loader}
                />
              ) : booksError ? (
                <State
                  title="Unable to load books"
                  action="Try again"
                  onPress={refetchBooks}
                  colors={colors}
                />
              ) : (
                groups.map(([title, items], groupIndex) => (
                  <View
                    key={title}
                    style={[
                      styles.section,
                      groupIndex > 0 && {
                        borderTopColor: colors.text,
                        borderTopWidth: 2,
                        paddingTop: 22,
                      },
                    ]}>
                    <Text style={[styles.sectionTitle, {color: colors.text}]}>
                      {title}
                    </Text>
                    <View style={styles.grid}>
                      {items.map(book => (
                        <TouchableOpacity
                          accessibilityLabel={`${bookLabel(book)}, ${
                            book.chapterCount
                          } chapters`}
                          key={book._id}
                          onPress={() => setChapterBook(book)}
                          style={[
                            styles.book,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}>
                          <Text
                            numberOfLines={2}
                            style={[styles.bookName, {color: colors.text}]}>
                            {bookLabel(book)}
                          </Text>
                          <Text
                            style={[
                              styles.chapterCount,
                              {color: colors.muted},
                            ]}>
                            {book.chapterCount} chapters
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
      <TranslationPicker
        visible={picker}
        onClose={() => setPicker(false)}
        translations={translations}
        selectedId={id}
        onSelect={setTranslation}
        darkMode={darkMode}
      />
      <BookChapterPicker
        visible={Boolean(chapterBook)}
        initialBook={chapterBook}
        books={books}
        currentBook={null}
        currentChapter={null}
        onClose={() => setChapterBook(null)}
        onSelect={(nextBook, nextChapter) => openBook(nextBook, nextChapter)}
        darkMode={darkMode}
      />
    </View>
  );
};
const State = ({title, action, onPress, colors}) => (
  <View style={[styles.state, {backgroundColor: colors.card}]}>
    <Text style={[styles.stateText, {color: colors.text}]}>{title}</Text>
    <TouchableOpacity onPress={onPress}>
      <Text style={styles.retry}>{action}</Text>
    </TouchableOpacity>
  </View>
);
const styles = StyleSheet.create({
  screen: {flex: 1},
  compactHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 7,
    paddingBottom: 8,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {flex: 1},
  compactTitle: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 23},
  compactSubtitle: {fontFamily: 'Lato-Regular', fontSize: 11, marginTop: 2},
  body: {padding: 16},
  loader: {padding: 36},
  sectionLabel: {fontFamily: 'Lato-Bold', fontSize: 14, marginBottom: 9},
  selector: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {flex: 1},
  selectorTitle: {
    fontFamily: 'Nokia Pure Headline Bold',
    fontSize: 17,
  },
  selectorMeta: {fontFamily: 'Lato-Regular', fontSize: 12, marginTop: 4},
  quickRow: {flexDirection: 'row', gap: 10, marginTop: 10},
  quick: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickText: {fontFamily: 'Lato-Bold'},
  section: {marginTop: 28},
  sectionTitle: {
    fontFamily: 'Nokia Pure Headline Bold',
    fontSize: 23,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  book: {
    width: '48.5%',
    minHeight: 84,
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    marginBottom: 10,
    justifyContent: 'center',
  },
  bookName: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 17},
  chapterCount: {fontFamily: 'Lato-Regular', fontSize: 11, marginTop: 6},
  progress: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  progressTitle: {fontFamily: 'Lato-Bold', fontSize: 14},
  progressText: {fontFamily: 'Lato-Regular', fontSize: 12, marginTop: 4},
  state: {padding: 24, borderRadius: 16, alignItems: 'center'},
  stateText: {fontFamily: 'Lato-Bold', textAlign: 'center'},
  retry: {color: BIBLE_COLORS.gold, fontFamily: 'Lato-Bold', marginTop: 12},
});
export default BibleHome;
