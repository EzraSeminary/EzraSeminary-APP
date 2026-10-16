import React from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {
  BookmarkSimple,
  BookmarksSimple,
  GearSix,
  House,
  HighlighterCircle,
  ShareNetwork,
  X,
} from 'phosphor-react-native';

const BibleOverflowMenu = ({
  visible,
  colors,
  saved,
  onClose,
  onSettings,
  onSave,
  onShare,
  onSavedContent,
  onHighlightManager,
  onExit,
}) => {
  const rows = [
    ['Font settings', GearSix, onSettings],
    [saved ? 'Remove saved chapter' : 'Save chapter', BookmarkSimple, onSave],
    ['Share chapter', ShareNetwork, onShare],
    ['Saved content', BookmarksSimple, onSavedContent],
    ['Highlight manager', HighlighterCircle, onHighlightManager],
    ['Exit Bible', House, onExit],
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.scrim}>
        <View
          style={[
            styles.menu,
            {backgroundColor: colors.card, borderColor: colors.border},
          ]}>
          <View style={styles.menuTop}>
            <Text style={[styles.title, {color: colors.text}]}>
              Bible tools
            </Text>
            <X size={18} color={colors.muted} />
          </View>
          {rows.map(([label, Icon, action]) => (
            <TouchableOpacity
              key={label}
              onPress={() => {
                onClose();
                setTimeout(action, 160);
              }}
              style={styles.row}>
              <Icon size={21} color={colors.text} />
              <Text style={[styles.label, {color: colors.text}]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {flex: 1, backgroundColor: 'rgba(0,0,0,.28)'},
  menu: {
    position: 'absolute',
    right: 14,
    top: 62,
    width: 245,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 7},
    elevation: 12,
  },
  menuTop: {
    height: 40,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 16},
  row: {
    height: 51,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  label: {fontFamily: 'Lato-Regular', fontSize: 15},
});

export default BibleOverflowMenu;
