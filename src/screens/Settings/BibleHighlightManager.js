import React, {useState} from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSelector} from 'react-redux';
import {ArrowLeft, Plus, Trash} from 'phosphor-react-native';
import {BIBLE_COLORS} from '../../features/bible/constants';
import {saveHighlightPalette, useHighlightPalette} from '../../features/bible/highlightPalette';
import AndroidStatusBarSpacer from '../../components/AndroidStatusBarSpacer';

const PICKER_COLORS = [
  '#FCD34D', '#6EE7B7', '#93C5FD', '#FDA4AF', '#C4B5FD', '#FDBA74',
  '#5EEAD4', '#FCA5A5', '#CBD5E1', '#FDE68A', '#86EFAC', '#67E8F9',
  '#A5B4FC', '#F0ABFC', '#FDA4AF', '#D9F99D', '#FDBA74', '#E5E7EB',
];

const BibleHighlightManager = ({navigation}) => {
  const darkMode = useSelector(state => state.ui.darkMode);
  const colors = useHighlightPalette();
  const [editing, setEditing] = useState(null);
  const [label, setLabel] = useState('');
  const [hex, setHex] = useState('#FCD34D');
  const bg = darkMode ? '#151A1E' : '#F8F8F6';
  const card = darkMode ? '#252D33' : '#FFFFFF';
  const text = darkMode ? '#FFFFFF' : BIBLE_COLORS.ink;
  const muted = darkMode ? '#B8C0C5' : BIBLE_COLORS.secondary;

  const beginEdit = item => {
    setEditing(item || {key: `custom-${Date.now()}`, label: '', hex: '#FCD34D'});
    setLabel(item?.label || '');
    setHex(item?.hex || '#FCD34D');
  };
  const commit = async () => {
    const cleanLabel = label.trim();
    const cleanHex = hex.trim().toUpperCase();
    if (!cleanLabel) {
      Alert.alert('Add a label', 'Enter a short name for this highlight color.');
      return;
    }
    if (!/^#[0-9A-F]{6}$/.test(cleanHex)) {
      Alert.alert('Invalid color', 'Use a six digit color such as #FCD34D.');
      return;
    }
    const isNew = !colors.some(item => item.key === editing.key);
    const next = isNew
      ? [...colors, {...editing, label: cleanLabel, hex: cleanHex}]
      : colors.map(item => item.key === editing.key
          ? {...item, label: cleanLabel, hex: cleanHex}
          : item);
    await saveHighlightPalette(next);
    setEditing(null);
  };
  const remove = item => {
    Alert.alert('Delete highlight color?', `Remove “${item.label}” from your palette?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => saveHighlightPalette(colors.filter(color => color.key !== item.key))},
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: bg}]}>
      <AndroidStatusBarSpacer minHeight={4} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <ArrowLeft size={24} color={text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, {color: text}]}>Highlight manager</Text>
          <Text style={[styles.subtitle, {color: muted}]}>
            {colors.length} of 20 colors · choose a color to edit its name and shade
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {colors.map(item => (
          <View key={item.key} style={[styles.row, {backgroundColor: card}]}>
            <View style={[styles.swatch, {backgroundColor: item.hex}]} />
            <View style={styles.grow}>
              <Text style={[styles.rowLabel, {color: text}]}>{item.label}</Text>
              <Text style={[styles.rowHex, {color: muted}]}>{item.hex}</Text>
            </View>
            <TouchableOpacity onPress={() => beginEdit(item)} style={styles.action}>
              <Text style={[styles.edit, {color: BIBLE_COLORS.gold}]}>Edit</Text>
            </TouchableOpacity>
            {item.key.startsWith('custom-') ? (
              <TouchableOpacity accessibilityLabel={`Delete ${item.label}`} onPress={() => remove(item)} style={styles.action}>
                <Trash size={19} color={muted} />
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
        <TouchableOpacity
          disabled={colors.length >= 20}
          onPress={() => beginEdit(null)}
          style={[styles.addButton, colors.length >= 20 && styles.disabled]}>
          <Plus size={20} color="#FFFFFF" weight="bold" />
          <Text style={styles.addText}>{colors.length >= 20 ? 'Palette limit reached' : 'Create highlight color'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {editing ? (
        <View style={styles.editorOverlay}>
          <View style={[styles.editor, {backgroundColor: card}]}>
            <Text style={[styles.editorTitle, {color: text}]}>
              {colors.some(item => item.key === editing.key) ? 'Edit highlight' : 'New highlight'}
            </Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              maxLength={24}
              placeholder="Label (e.g. Promise)"
              placeholderTextColor={muted}
              style={[styles.input, {color: text, borderColor: muted}]}
            />
            <View style={styles.pickerGrid}>
              {PICKER_COLORS.map(value => (
                <TouchableOpacity key={value} onPress={() => setHex(value)} style={[styles.pickerSwatch, {backgroundColor: value, borderColor: hex.toUpperCase() === value ? text : 'transparent'}]} />
              ))}
            </View>
            <View style={styles.hexRow}>
              <View style={[styles.preview, {backgroundColor: hex}]} />
              <TextInput
                value={hex}
                onChangeText={setHex}
                autoCapitalize="characters"
                maxLength={7}
                placeholder="#RRGGBB"
                placeholderTextColor={muted}
                style={[styles.input, styles.hexInput, {color: text, borderColor: muted}]}
              />
            </View>
            <View style={styles.editorActions}>
              <TouchableOpacity onPress={() => setEditing(null)} style={styles.cancelButton}>
                <Text style={{color: muted}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={commit} style={styles.saveButton}>
                <Text style={styles.addText}>Save color</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  header: {minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16},
  back: {width: 42, height: 48, justifyContent: 'center'},
  headerText: {flex: 1},
  title: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 22},
  subtitle: {fontFamily: 'Lato-Regular', fontSize: 12, marginTop: 3},
  content: {padding: 16, paddingBottom: 48},
  row: {minHeight: 72, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 9},
  swatch: {width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(0,0,0,.1)', marginRight: 13},
  grow: {flex: 1},
  rowLabel: {fontFamily: 'Lato-Bold', fontSize: 15},
  rowHex: {fontFamily: 'Lato-Regular', fontSize: 11, marginTop: 3},
  action: {padding: 9},
  edit: {fontFamily: 'Lato-Bold', fontSize: 13},
  addButton: {minHeight: 52, borderRadius: 14, backgroundColor: BIBLE_COLORS.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 7},
  addText: {fontFamily: 'Lato-Bold', fontSize: 14, color: '#FFFFFF'},
  disabled: {opacity: 0.5},
  editorOverlay: {...StyleSheet.absoluteFillObject, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,.45)', zIndex: 5},
  editor: {borderRadius: 22, padding: 20},
  editorTitle: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 20, marginBottom: 14},
  input: {height: 48, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, marginBottom: 13, fontFamily: 'Lato-Regular'},
  pickerGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginVertical: 5},
  pickerSwatch: {width: 32, height: 32, borderRadius: 16, borderWidth: 2},
  hexRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14},
  preview: {width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(0,0,0,.15)'},
  hexInput: {flex: 1, marginBottom: 0},
  editorActions: {flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: 18},
  cancelButton: {padding: 12},
  saveButton: {backgroundColor: BIBLE_COLORS.gold, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 11},
});

export default BibleHighlightManager;
