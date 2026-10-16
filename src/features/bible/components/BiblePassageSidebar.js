import React, {useEffect, useMemo, useRef} from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {X} from 'phosphor-react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {bookLabel} from '../models';

const BiblePassageSidebar = ({
  visible,
  books,
  currentBook,
  currentChapter,
  translation,
  colors,
  onClose,
  onSelect,
}) => {
  const insets = useSafeAreaInsets();
  const booksRef = useRef(null);
  const chaptersRef = useRef(null);
  const amharic = /amharic|አማርኛ/i.test(
    `${translation?.language || ''} ${translation?.displayName || ''}`,
  );
  const groups = useMemo(
    () =>
      [
        {key: 'old', label: amharic ? 'ብሉይ ኪዳን' : 'Old Testament'},
        {key: 'new', label: amharic ? 'አዲስ ኪዳን' : 'New Testament'},
        {key: 'other', label: amharic ? 'ተጨማሪ መጻሕፍት' : 'Additional Books'},
      ]
        .map(group => ({
          ...group,
          items: books.filter(book =>
            group.key === 'other'
              ? !['old', 'new'].includes(book.testament)
              : book.testament === group.key,
          ),
        }))
        .filter(group => group.items.length),
    [amharic, books],
  );
  const chapterCount = Number(currentBook?.chapterCount) || 0;
  const activeBookOffset = useMemo(() => {
    let offset = 0;
    for (const group of groups) {
      offset += 40;
      const index = group.items.findIndex(
        item => item._id === currentBook?._id,
      );
      if (index >= 0) return offset + index * 51;
      offset += group.items.length * 51;
    }
    return 0;
  }, [groups, currentBook?._id]);
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => {
      booksRef.current?.scrollTo({
        y: Math.max(0, activeBookOffset),
        animated: false,
      });
      chaptersRef.current?.scrollTo({
        y: Math.max(0, 67 + (Number(currentChapter) - 1) * 48),
        animated: false,
      });
    }, 40);
    return () => clearTimeout(timer);
  }, [visible, currentBook?._id, currentChapter, activeBookOffset]);
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.panel, {backgroundColor: colors.bg}]}>
          <View
            style={[
              styles.header,
              {
                borderBottomColor: colors.border,
                paddingTop: insets.top,
                height: 76 + insets.top,
              },
            ]}>
            <View style={styles.headerCopy}>
              <Text
                numberOfLines={1}
                style={[styles.translation, {color: colors.text}]}>
                {translation?.displayName}
              </Text>
              <Text style={[styles.helper, {color: colors.muted}]}>
                Choose a book and chapter
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close books"
              onPress={onClose}
              style={styles.close}>
              <X size={23} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.columns}>
            <ScrollView
              ref={booksRef}
              style={[styles.books, {borderRightColor: colors.border}]}
              contentContainerStyle={[
                styles.bookContent,
                {paddingBottom: 30 + insets.bottom},
              ]}>
              {groups.map(group => (
                <View
                  key={group.key}
                  style={
                    group.key !== 'old' && {
                      borderTopColor: colors.text,
                      borderTopWidth: 2,
                    }
                  }>
                  <Text
                    style={[
                      styles.testament,
                      {color: colors.muted, borderBottomColor: colors.border},
                    ]}>
                    {group.label}
                  </Text>
                  {group.items.map(item => {
                    const active = item._id === currentBook?._id;
                    return (
                      <TouchableOpacity
                        key={item._id}
                        onPress={() => onSelect(item, null)}
                        style={[
                          styles.book,
                          active && {
                            backgroundColor: colors.card,
                            borderLeftColor: colors.accent,
                          },
                        ]}>
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.bookText,
                            {color: active ? colors.accent : colors.text},
                          ]}>
                          {bookLabel(item)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
            <ScrollView
              ref={chaptersRef}
              style={styles.chapters}
              contentContainerStyle={[
                styles.chapterContent,
                {paddingBottom: 30 + insets.bottom},
              ]}>
              <Text style={[styles.chapterTitle, {color: colors.text}]}>
                {bookLabel(currentBook)}
              </Text>
              <Text style={[styles.chapterHint, {color: colors.muted}]}>
                {chapterCount} chapters
              </Text>
              {Array.from({length: chapterCount}, (_, index) => index + 1).map(
                value => {
                  const active = value === Number(currentChapter);
                  return (
                    <TouchableOpacity
                      key={value}
                      accessibilityState={{selected: active}}
                      onPress={() => {
                        onSelect(currentBook, value);
                        onClose();
                      }}
                      style={[
                        styles.chapter,
                        {borderBottomColor: colors.border},
                        active && {
                          borderLeftColor: colors.accent,
                          backgroundColor: colors.card,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.chapterNumber,
                          {color: active ? colors.accent : colors.text},
                        ]}>
                        {value}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </ScrollView>
          </View>
        </View>
        <TouchableOpacity
          accessibilityLabel="Close books"
          style={styles.scrim}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,.48)'},
  panel: {width: '100%', height: '100%'},
  scrim: {flex: 1},
  header: {
    height: 76,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingLeft: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCopy: {flex: 1},
  translation: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 18},
  helper: {fontFamily: 'Lato-Regular', fontSize: 11, marginTop: 3},
  close: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columns: {flex: 1, flexDirection: 'row'},
  books: {width: '64%', borderRightWidth: StyleSheet.hairlineWidth},
  bookContent: {},
  testament: {
    fontFamily: 'Lato-Bold',
    fontSize: 11,
    letterSpacing: 0.7,
    padding: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  book: {
    minHeight: 51,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  bookText: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 15},
  chapters: {width: '36%'},
  chapterContent: {},
  chapterTitle: {
    fontFamily: 'Nokia Pure Headline Bold',
    fontSize: 22,
    marginHorizontal: 18,
    marginTop: 18,
  },
  chapterHint: {
    fontFamily: 'Lato-Regular',
    fontSize: 12,
    marginHorizontal: 18,
    marginTop: 3,
    marginBottom: 10,
  },
  chapter: {
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  chapterNumber: {
    fontFamily: 'Nokia Pure Headline Bold',
    fontSize: 17,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default BiblePassageSidebar;
