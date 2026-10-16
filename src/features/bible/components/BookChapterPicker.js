import React, {useEffect, useMemo, useState} from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {ArrowLeft, X} from 'phosphor-react-native';
import {bookLabel} from '../models';
import {BIBLE_COLORS} from '../constants';

export const chapterColumnCount = width => (width >= 430 ? 6 : 5);

const groupBooks = books =>
  [
    {
      key: 'old',
      title: 'Old Testament',
      items: books.filter(book => book.testament === 'old'),
    },
    {
      key: 'new',
      title: 'New Testament',
      items: books.filter(book => book.testament === 'new'),
    },
    {
      key: 'other',
      title: 'Additional Books',
      items: books.filter(book => !['old', 'new'].includes(book.testament)),
    },
  ].filter(group => group.items.length);

const BookChapterPicker = ({
  visible,
  books = [],
  currentBook,
  currentChapter,
  initialBook,
  onClose,
  onSelect,
  darkMode,
}) => {
  const [book, setBook] = useState(null);
  const {width} = useWindowDimensions();
  const columns = chapterColumnCount(width);
  useEffect(() => {
    if (visible) setBook(initialBook || null);
    else setBook(null);
  }, [visible, initialBook]);
  const groups = useMemo(() => groupBooks(books), [books]);
  const colors = {
    bg: darkMode ? '#151A1E' : BIBLE_COLORS.background,
    card: darkMode ? BIBLE_COLORS.darkCard : '#FFFFFF',
    text: darkMode ? '#FFFFFF' : BIBLE_COLORS.ink,
    muted: darkMode ? '#B8C0C5' : BIBLE_COLORS.secondary,
    border: darkMode ? '#3B454C' : BIBLE_COLORS.border,
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.bg}]}>
        <View style={styles.header}>
          {book ? (
            <TouchableOpacity
              accessibilityLabel="All books"
              onPress={() => setBook(null)}
              style={styles.iconButton}>
              <ArrowLeft size={23} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconButton} />
          )}
          <View style={styles.headingWrap}>
            <Text
              numberOfLines={1}
              style={[styles.title, {color: colors.text}]}>
              {book ? bookLabel(book) : 'Choose a passage'}
            </Text>
            <Text style={[styles.subtitle, {color: colors.muted}]}>
              {book ? 'Select chapter' : 'Books of the Bible'}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Close passage picker"
            onPress={onClose}
            style={styles.iconButton}>
            <X size={23} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {book ? (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setBook(null)}
                style={styles.allBooks}>
                <ArrowLeft size={18} color={BIBLE_COLORS.gold} />
                <Text style={styles.allBooksText}>All books</Text>
              </TouchableOpacity>
              <View style={styles.chapterGrid}>
                {Array.from(
                  {length: Number(book.chapterCount) || 0},
                  (_, index) => index + 1,
                ).map(chapter => {
                  const active =
                    book._id === currentBook?._id &&
                    chapter === Number(currentChapter);
                  return (
                    <TouchableOpacity
                      key={chapter}
                      accessibilityLabel={`${bookLabel(
                        book,
                      )} chapter ${chapter}`}
                      accessibilityState={{selected: active}}
                      onPress={() => {
                        onSelect(book, chapter);
                        onClose();
                      }}
                      style={[
                        styles.chapter,
                        {
                          width: `${100 / columns - 2}%`,
                          backgroundColor: active
                            ? BIBLE_COLORS.gold
                            : colors.card,
                          borderColor: active
                            ? BIBLE_COLORS.gold
                            : colors.border,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.chapterText,
                          {color: active ? '#FFFFFF' : colors.text},
                        ]}>
                        {chapter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            groups.map(group => (
              <View key={group.key} style={styles.group}>
                <Text style={[styles.groupTitle, {color: BIBLE_COLORS.gold}]}>
                  {group.title}
                </Text>
                <View style={styles.bookGrid}>
                  {group.items.map(item => {
                    const active = item._id === currentBook?._id;
                    return (
                      <TouchableOpacity
                        key={item._id}
                        accessibilityRole="button"
                        accessibilityState={{selected: active}}
                        onPress={() => setBook(item)}
                        style={[
                          styles.book,
                          {
                            backgroundColor: active
                              ? darkMode
                                ? '#45361F'
                                : BIBLE_COLORS.lightGold
                              : colors.card,
                            borderColor: active
                              ? BIBLE_COLORS.gold
                              : colors.border,
                          },
                        ]}>
                        <Text
                          numberOfLines={2}
                          style={[styles.bookName, {color: colors.text}]}>
                          {bookLabel(item)}
                        </Text>
                        <Text style={[styles.bookMeta, {color: colors.muted}]}>
                          {item.chapterCount} chapters
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  header: {
    minHeight: 74,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#7B858C',
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingWrap: {flex: 1, alignItems: 'center'},
  title: {
    fontFamily: 'Nokia Pure Headline Bold',
    fontSize: 20,
    maxWidth: '100%',
  },
  subtitle: {fontFamily: 'Lato-Regular', fontSize: 12, marginTop: 2},
  content: {padding: 16, paddingBottom: 48},
  allBooks: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  allBooksText: {
    marginLeft: 8,
    color: BIBLE_COLORS.gold,
    fontFamily: 'Lato-Bold',
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: 9,
    rowGap: 9,
  },
  chapter: {
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  chapterText: {
    fontFamily: 'Lato-Bold',
    fontSize: 16,
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 20,
  },
  group: {marginBottom: 24},
  groupTitle: {
    fontFamily: 'Nokia Pure Headline Bold',
    fontSize: 19,
    marginBottom: 10,
  },
  bookGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  book: {
    width: '48.7%',
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    justifyContent: 'center',
  },
  bookName: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 16},
  bookMeta: {fontFamily: 'Lato-Regular', fontSize: 11, marginTop: 5},
});

export default BookChapterPicker;
