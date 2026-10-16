import React, {useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {X} from 'phosphor-react-native';
import {BIBLE_COLORS} from '../constants';

const NoteEditor = ({
  visible,
  reference,
  initialText = '',
  onClose,
  onSave,
  saving,
  darkMode,
}) => {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState('');
  useEffect(() => {
    if (visible) {
      setText(initialText);
      setError('');
    }
  }, [visible, initialText]);
  const submit = () => {
    if (!text.trim()) {
      setError('Enter a note before saving.');
      return;
    }
    onSave(text);
  };
  const bg = darkMode ? '#151A1E' : BIBLE_COLORS.background;
  const card = darkMode ? BIBLE_COLORS.darkCard : '#FFFFFF';
  const color = darkMode ? '#FFFFFF' : BIBLE_COLORS.ink;
  if (!visible) return null;
  return (
      <KeyboardAvoidingView
        pointerEvents="box-none"
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, {backgroundColor: bg}]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text style={[styles.title, {color}]}>Study note</Text>
              <Text numberOfLines={2} style={styles.reference}>
                {reference}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close note editor"
              onPress={onClose}
              style={styles.close}>
              <X size={24} color={color} />
            </TouchableOpacity>
          </View>
          <View style={styles.body}>
            <TextInput
              accessibilityLabel="Private note"
              autoFocus
              multiline
              maxLength={5000}
              value={text}
              onChangeText={value => {
                setText(value);
                setError('');
              }}
              placeholder="Write your private study note…"
              placeholderTextColor={darkMode ? '#89939A' : '#7A858C'}
              textAlignVertical="top"
              style={[
                styles.input,
                {
                  backgroundColor: card,
                  color,
                  borderColor: error
                    ? '#DC5757'
                    : darkMode
                    ? '#3A444B'
                    : BIBLE_COLORS.border,
                },
              ]}
            />
            <View style={styles.metaRow}>
              <Text style={styles.error}>{error}</Text>
              <Text
                style={[
                  styles.count,
                  {color: darkMode ? '#B8C0C5' : BIBLE_COLORS.secondary},
                ]}>
                {text.length}/5000
              </Text>
            </View>
            <TouchableOpacity
              disabled={saving}
              onPress={submit}
              style={[styles.save, saving && styles.disabled]}>
              <Text style={styles.saveText}>
                {saving ? 'Saving…' : 'Save note'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  overlay: {...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 40},
  sheet: {
    width: '100%',
    maxHeight: '68%',
    minHeight: 430,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 18 : 10,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#777',
    opacity: 0.45,
    alignSelf: 'center',
    marginTop: 11,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {flex: 1},
  title: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 23},
  reference: {fontFamily: 'Lato-Bold', color: BIBLE_COLORS.gold, marginTop: 4},
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {paddingHorizontal: 18, paddingBottom: 18},
  input: {
    height: 230,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontFamily: 'Lato-Regular',
    fontSize: 17,
    lineHeight: 25,
  },
  metaRow: {
    minHeight: 35,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  error: {color: '#DC5757', fontFamily: 'Lato-Bold', fontSize: 13},
  count: {fontSize: 12},
  save: {
    height: 52,
    borderRadius: 999,
    backgroundColor: BIBLE_COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {opacity: 0.55},
  saveText: {color: '#FFFFFF', fontFamily: 'Lato-Bold', fontSize: 16},
});
export default NoteEditor;
