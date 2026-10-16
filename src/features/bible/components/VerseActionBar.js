import React from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Copy,
  NotePencil,
  ShareNetwork,
  Trash,
  X,
} from 'phosphor-react-native';
import {BIBLE_COLORS} from '../constants';

const VerseActionBar = ({
  reference,
  translationName,
  onHighlight,
  onRemoveHighlight,
  canRemoveHighlight,
  onNote,
  onCopy,
  onShare,
  onClear,
  busy,
  darkMode,
  highlightColors = [],
  noteActionLabel = 'Note',
}) => {
  const insets = useSafeAreaInsets();
  if (!reference) return null;
  const text = darkMode ? '#FFFFFF' : BIBLE_COLORS.ink;
  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: darkMode ? '#263038' : '#FFFFFF',
            borderColor: darkMode ? '#46535C' : BIBLE_COLORS.border,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}>
        <View style={styles.handle} />
        <View style={styles.top}>
          <View style={styles.titleWrap}>
            <Text numberOfLines={1} style={[styles.reference, {color: text}]}>
              {reference}
            </Text>
            <Text numberOfLines={1} style={styles.translation}>
              {translationName}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Clear verse selection"
            onPress={onClear}
            style={styles.icon}>
            <X size={20} color={text} />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorScroll}
          contentContainerStyle={styles.colorRow}>
          {highlightColors.map(item => (
            <TouchableOpacity
              key={item.key}
              disabled={busy}
              accessibilityLabel={`${item.label} highlight`}
              onPress={() => {
                onHighlight(item.key);
              }}
              style={styles.colorButton}>
              <View style={[styles.swatch, {backgroundColor: item.hex}]} />
              <Text
                numberOfLines={1}
                style={[styles.colorLabel, {color: text}]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.actions}>
          {canRemoveHighlight ? (
            <Action
              icon={Trash}
              label="Remove"
              onPress={onRemoveHighlight}
              color={text}
            />
          ) : null}
          <Action
            icon={NotePencil}
            label={noteActionLabel}
            onPress={onNote}
            color={text}
          />
          <Action icon={Copy} label="Copy" onPress={onCopy} color={text} />
          <Action
            icon={ShareNetwork}
            label="Share"
            onPress={onShare}
            color={text}
          />
        </View>
      </View>
    </View>
  );
};
const Action = ({icon: Icon, label, onPress, color}) => (
  <TouchableOpacity
    accessibilityLabel={label}
    onPress={onPress}
    style={styles.action}>
    <Icon size={20} color={color} />
    <Text style={[styles.actionText, {color}]}>{label}</Text>
  </TouchableOpacity>
);
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 30,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,.14)',
  },
  bar: {
    width: '100%',
    borderTopWidth: 1,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 12,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8A8F92',
    opacity: 0.5,
    alignSelf: 'center',
    marginBottom: 5,
  },
  top: {flexDirection: 'row', alignItems: 'center'},
  titleWrap: {flex: 1},
  reference: {fontFamily: 'Lato-Bold', fontSize: 15},
  translation: {color: BIBLE_COLORS.gold, fontSize: 11, marginTop: 2},
  icon: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  colorScroll: {maxHeight: 70},
  colorRow: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 5,
  },
  colorButton: {width: 58, alignItems: 'center'},
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,.12)',
  },
  colorLabel: {fontSize: 9, marginTop: 3, maxWidth: 54},
  actions: {
    height: 47,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#778187',
    justifyContent: 'space-around',
  },
  action: {
    minWidth: 62,
    minHeight: 44,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {fontFamily: 'Lato-Bold', fontSize: 11},
});
export default VerseActionBar;
