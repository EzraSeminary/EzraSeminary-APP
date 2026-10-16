import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BookmarkSimple,
  HighlighterCircle,
  NotePencil,
  Trash,
} from 'phosphor-react-native';
import {useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  useDeleteBookmarkMutation,
  useDeleteHighlightMutation,
  useDeleteNoteMutation,
  useGetBookmarksQuery,
  useGetHighlightsQuery,
  useGetNotesQuery,
  useUpdateNoteMutation,
} from '../../features/bible/bibleApi';
import {BIBLE_COLORS} from '../../features/bible/constants';
import {useHighlightPalette} from '../../features/bible/highlightPalette';
import {verseNumber} from '../../features/bible/models';
import NoteEditor from '../../features/bible/components/NoteEditor';

const tabs = [
  ['notes', 'Notes', NotePencil],
  ['bookmarks', 'Saved Chapters', BookmarkSimple],
  ['highlights', 'Highlights', HighlighterCircle],
];
const MyBible = ({navigation}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('notes');
  const [highlightFilter, setHighlightFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const highlightColors = useHighlightPalette();
  const notes = useGetNotesQuery();
  const bookmarks = useGetBookmarksQuery();
  const highlights = useGetHighlightsQuery();
  const [deleteNote] = useDeleteNoteMutation();
  const [deleteBookmark] = useDeleteBookmarkMutation();
  const [deleteHighlight] = useDeleteHighlightMutation();
  const [updateNote, {isLoading: saving}] = useUpdateNoteMutation();
  const source = {notes, bookmarks, highlights}[tab];
  const allData = source.data || [];
  const data = tab === 'highlights' && highlightFilter !== 'all'
    ? allData.filter(item => item.color === highlightFilter)
    : allData;
  const colors = {
    bg: darkMode ? '#151A1E' : BIBLE_COLORS.background,
    card: darkMode ? BIBLE_COLORS.darkCard : '#FFF',
    text: darkMode ? '#FFF' : BIBLE_COLORS.ink,
    muted: darkMode ? '#B6BEC3' : BIBLE_COLORS.secondary,
    border: darkMode ? '#3A444B' : BIBLE_COLORS.border,
  };
  const remove = item =>
    Alert.alert('Delete this item?', 'This cannot be undone.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (tab === 'notes') await deleteNote(item._id);
          else if (tab === 'bookmarks') await deleteBookmark(item._id);
          else await deleteHighlight(item._id);
        },
      },
    ]);
  const open = item =>
    navigation.navigate('BibleReader', {
      translation: item.translation,
      book: item.book,
      chapterNumber: item.chapterNumber,
      verseNumbers: (item.verseIds || []).map(verseNumber),
    });
  const empty = useMemo(
    () =>
      ({
        notes: [
          'No notes yet',
          'Select verses in the reader and choose Note to begin.',
        ],
        bookmarks: [
          'No saved chapters yet',
          'Use the bookmark button while reading to save a chapter.',
        ],
        highlights: [
          'No highlights yet',
          'Select verses and choose one of the nine study colors.',
        ],
      }[tab]),
    [tab],
  );
  const renderItem = ({item}) => {
    const swatch = highlightColors.find(color => color.key === item.color);
    const verseText = (item.verseIds || [])
      .map(verse => verse.text)
      .filter(Boolean)
      .join(' ');
    return (
      <View
        style={[
          styles.card,
          {backgroundColor: colors.card, borderColor: colors.border},
        ]}>
        <View style={styles.cardTop}>
          {swatch ? (
            <View style={[styles.swatch, {backgroundColor: swatch.hex}]} />
          ) : null}
          <View style={styles.flex}>
            <Text style={[styles.reference, {color: colors.text}]}>
              {item.reference ||
                `${item.book?.localizedName || item.book?.name || 'Bible'} ${
                  item.chapterNumber
                }`}
            </Text>
            <Text style={[styles.translation, {color: colors.muted}]}>
              {item.translation?.displayName}
            </Text>
          </View>
        </View>
        {item.text ? (
          <Text style={[styles.note, {color: colors.text}]}>{item.text}</Text>
        ) : null}
        {verseText ? (
          <Text numberOfLines={4} style={[styles.verse, {color: colors.muted}]}>
            {verseText}
          </Text>
        ) : null}
        {item.updatedAt ? (
          <Text style={[styles.date, {color: colors.muted}]}>
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        ) : null}
        <View style={styles.buttons}>
          <TouchableOpacity onPress={() => open(item)} style={styles.open}>
            <Text style={styles.openText}>Open Passage</Text>
          </TouchableOpacity>
          {tab === 'notes' ? (
            <TouchableOpacity
              accessibilityLabel="Edit note"
              onPress={() => setEditing(item)}
              style={[styles.icon, {borderColor: colors.border}]}>
              <NotePencil size={19} color={colors.text} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            accessibilityLabel="Delete item"
            onPress={() => remove(item)}
            style={[styles.icon, {borderColor: colors.border}]}>
            <Trash size={19} color="#D56060" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
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
          style={styles.headerIcon}>
          <ArrowLeft size={23} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, {color: colors.text}]}>My Bible</Text>
          <Text style={[styles.subtitle, {color: colors.muted}]}>
            Your private study library
          </Text>
        </View>
      </View>
      <View style={styles.tabs}>
        {tabs.map(([key, label, Icon]) => (
          <TouchableOpacity
            key={key}
            accessibilityState={{selected: tab === key}}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.activeTab]}>
            {Icon ? (
              <Icon size={18} color={tab === key ? '#FFF' : colors.muted} />
            ) : null}
            <Text
              numberOfLines={1}
              style={[
                styles.tabText,
                {color: tab === key ? '#FFF' : colors.muted},
              ]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'highlights' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.highlightFilters}>
          {[
            {key: 'all', label: 'All'},
            ...highlightColors.map(color => ({
              key: color.key,
              label: color.label,
              hex: color.hex,
            })),
          ].map(filter => {
            const active = highlightFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                accessibilityState={{selected: active}}
                onPress={() => setHighlightFilter(filter.key)}
                style={[
                  styles.highlightFilter,
                  {
                    backgroundColor: active ? BIBLE_COLORS.gold : colors.card,
                    borderColor: active ? BIBLE_COLORS.gold : colors.border,
                  },
                ]}>
                {filter.hex ? (
                  <View style={[styles.filterSwatch, {backgroundColor: filter.hex}]} />
                ) : null}
                <Text style={[styles.filterText, {color: active ? '#FFF' : colors.text}]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
      <FlatList
        data={data}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          {paddingBottom: insets.bottom + 30},
          !data.length && styles.grow,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={source.isFetching}
            onRefresh={source.refetch}
            tintColor={BIBLE_COLORS.gold}
          />
        }
        ListEmptyComponent={
          source.isLoading ? (
            <ActivityIndicator
              color={BIBLE_COLORS.gold}
              style={styles.loading}
            />
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, {color: colors.text}]}>
                {source.error ? 'Unable to load your library' : empty[0]}
              </Text>
              <Text style={[styles.emptyText, {color: colors.muted}]}>
                {source.error
                  ? 'Check your connection and try again.'
                  : empty[1]}
              </Text>
              <TouchableOpacity
                onPress={
                  source.error
                    ? source.refetch
                    : () => navigation.navigate('BibleHome')
                }
                style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>
                  {source.error ? 'Retry' : 'Open the Bible'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
      <NoteEditor
        visible={Boolean(editing)}
        reference={editing?.reference || ''}
        initialText={editing?.text || ''}
        onClose={() => setEditing(null)}
        saving={saving}
        darkMode={darkMode}
        onSave={async text => {
          await updateNote({noteId: editing._id, text: text.trim()}).unwrap();
          setEditing(null);
        }}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  screen: {flex: 1},
  header: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 24},
  subtitle: {fontFamily: 'Lato-Regular', fontSize: 12, marginTop: 2},
  tabs: {flexDirection: 'row', paddingHorizontal: 10, gap: 5},
  tab: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  activeTab: {backgroundColor: BIBLE_COLORS.gold},
  highlightFilters: {paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, gap: 8},
  highlightFilter: {height: 36, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6},
  filterSwatch: {width: 12, height: 12, borderRadius: 6},
  filterText: {fontFamily: 'Lato-Bold', fontSize: 12},
  tabText: {fontFamily: 'Lato-Bold', fontSize: 11},
  list: {padding: 14},
  grow: {flexGrow: 1},
  card: {borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 11},
  cardTop: {flexDirection: 'row', alignItems: 'center'},
  swatch: {width: 15, height: 36, borderRadius: 7, marginRight: 10},
  flex: {flex: 1},
  reference: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 17},
  translation: {fontFamily: 'Lato-Regular', fontSize: 11, marginTop: 3},
  note: {
    fontFamily: 'Lato-Regular',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 13,
  },
  verse: {
    fontFamily: 'Waldba_Wookianos_Regular_82dc20e729',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
  },
  date: {fontSize: 10, marginTop: 10},
  buttons: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14},
  open: {
    height: 42,
    flex: 1,
    borderRadius: 21,
    backgroundColor: BIBLE_COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openText: {color: '#FFF', fontFamily: 'Lato-Bold', fontSize: 13},
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 35},
  emptyTitle: {
    fontFamily: 'Nokia Pure Headline Bold',
    fontSize: 21,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: 'Lato-Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 9,
  },
  emptyButton: {
    height: 46,
    borderRadius: 23,
    backgroundColor: BIBLE_COLORS.gold,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  emptyButtonText: {color: '#FFF', fontFamily: 'Lato-Bold'},
  loading: {padding: 60},
});
export default MyBible;
