import React, {useMemo, useState} from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CaretRight,
  Check,
  TextAlignLeft,
  X,
} from 'phosphor-react-native';
import {BIBLE_THEMES, getBibleTheme} from '../constants';
import {
  fontSupportsWeight,
  getReaderFontStyle,
  READER_FONTS,
} from '../../../utils/readerFonts';
import {isAmharicTranslation} from '../reference';

const WEIGHTS = [
  ['300', 'Light'],
  ['400', 'Regular'],
  ['700', 'Bold'],
  ['900', 'Heavy'],
];
const LINE_HEIGHTS = [1.15, 1.95, 2.25, 2.5];

const ReaderSettings = ({
  visible,
  settings,
  onChange,
  onClose,
  translation,
}) => {
  const [page, setPage] = useState('main');
  const theme = useMemo(() => getBibleTheme(settings.theme), [settings.theme]);
  const fonts = READER_FONTS.filter(item =>
    isAmharicTranslation(translation)
      ? item.script === 'ethiopic'
      : item.script === 'latin',
  );
  const activeFont =
    fonts.find(item => item.id === settings.fontId) || fonts[0];
  const close = () => {
    setPage('main');
    onClose();
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={page === 'fonts' ? () => setPage('main') : close}>
      <View style={styles.scrim}>
        <TouchableOpacity style={styles.dismissArea} onPress={close} />
        <SafeAreaView style={[styles.sheet, {backgroundColor: theme.card}]}>
          <View style={styles.handle} />
          {page === 'fonts' ? (
            <>
              <View style={styles.header}>
                <TouchableOpacity
                  accessibilityLabel="Back to font settings"
                  onPress={() => setPage('main')}
                  style={styles.iconButton}>
                  <ArrowLeft size={23} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, {color: theme.text}]}>Font</Text>
                <View style={styles.iconButton} />
              </View>
              <ScrollView contentContainerStyle={styles.fontContent}>
                {fonts.map(font => {
                  const selected = activeFont.id === font.id;
                  return (
                    <TouchableOpacity
                      key={font.id}
                      onPress={() => {
                        const nextWeight = fontSupportsWeight(font.id, settings.fontWeight)
                          ? settings.fontWeight
                          : fontSupportsWeight(font.id, '700')
                          ? '700'
                          : (font.weights || ['400'])[0];
                        onChange({fontId: font.id, fontWeight: nextWeight});
                      }}
                      style={[
                        styles.fontRow,
                        {borderBottomColor: theme.border},
                      ]}>
                      <View style={styles.grow}>
                        <Text
                          style={[
                            styles.fontName,
                            {
                              color: theme.text,
                              ...getReaderFontStyle(font.id, settings.fontWeight),
                            },
                          ]}>
                          {font.label}
                        </Text>
                        <Text
                          style={{
                            color: theme.muted,
                            fontSize: 18,
                            ...getReaderFontStyle(font.id, settings.fontWeight),
                          }}>
                          {font.sample} መጽሐፍ ቅዱስ
                        </Text>
                      </View>
                      {selected ? (
                        <Check size={22} color={theme.accent} weight="bold" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
                <Text style={[styles.sectionLabel, {color: theme.muted}]}>
                  FONT WEIGHT
                </Text>
                <View style={styles.weightRow}>
                  {WEIGHTS.map(([value, label]) => {
                    const active = settings.fontWeight === value;
                    const supported = fontSupportsWeight(activeFont.id, value);
                    return (
                      <TouchableOpacity
                        key={value}
                        disabled={!supported}
                        onPress={() => onChange({fontWeight: value})}
                        style={[
                          styles.weightButton,
                          {borderColor: active ? theme.accent : theme.border},
                          active && {backgroundColor: theme.background},
                          !supported && {opacity: 0.35},
                        ]}>
                        <Text style={{color: theme.text, fontWeight: value}}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          ) : (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.topRow}>
                <Text style={[styles.title, {color: theme.text}]}>
                  Reading settings
                </Text>
                <TouchableOpacity
                  accessibilityLabel="Close settings"
                  onPress={close}
                  style={styles.iconButton}>
                  <X size={22} color={theme.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.controlRow}>
                <TouchableOpacity
                  accessibilityLabel="Decrease text size"
                  onPress={() =>
                    onChange({fontSize: Math.max(15, settings.fontSize - 1)})
                  }
                  style={[
                    styles.bigControl,
                    {backgroundColor: theme.background},
                  ]}>
                  <Text style={[styles.smallA, {color: theme.text}]}>A−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Increase text size"
                  onPress={() =>
                    onChange({fontSize: Math.min(34, settings.fontSize + 1)})
                  }
                  style={[
                    styles.bigControl,
                    {backgroundColor: theme.background},
                  ]}>
                  <Text style={[styles.largeA, {color: theme.text}]}>A+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Change line height"
                  onPress={() => {
                    const index = LINE_HEIGHTS.findIndex(
                      value => value === settings.lineSpacing,
                    );
                    onChange({
                      lineSpacing:
                        LINE_HEIGHTS[(index + 1) % LINE_HEIGHTS.length],
                    });
                  }}
                  style={[
                    styles.lineControl,
                    {backgroundColor: theme.background},
                  ]}>
                  <TextAlignLeft size={31} color={theme.text} />
                  <Text style={[styles.lineHint, {color: theme.muted}]}>
                    {Math.max(0, LINE_HEIGHTS.indexOf(settings.lineSpacing)) + 1}/4
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setPage('fonts')}
                style={[
                  styles.settingRow,
                  {backgroundColor: theme.background},
                ]}>
                <Text style={[styles.rowLabel, {color: theme.text}]}>Font</Text>
                <Text
                  numberOfLines={1}
                  style={[styles.rowValue, {color: theme.text}]}>
                  {activeFont.label}
                </Text>
                <CaretRight size={22} color={theme.muted} />
              </TouchableOpacity>
              <View
                style={[
                  styles.settingRow,
                  {backgroundColor: theme.background},
                ]}>
                <Text style={[styles.rowLabel, {color: theme.text}]}>
                  Continuous Scrolling
                </Text>
                <Switch
                  value={Boolean(settings.continuousScrolling)}
                  onValueChange={value =>
                    onChange({continuousScrolling: value})
                  }
                  trackColor={{false: theme.border, true: theme.accent}}
                  thumbColor="#FFFFFF"
                />
              </View>
              <Text style={[styles.sectionLabel, {color: theme.muted}]}>
                THEME
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.themes}>
                {BIBLE_THEMES.map(item => {
                  const active = item.id === theme.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      accessibilityLabel={`${item.label} Bible theme`}
                      accessibilityState={{selected: active}}
                      onPress={() => onChange({theme: item.id})}
                      style={[
                        styles.themeCard,
                        {
                          backgroundColor: item.background,
                          borderColor: active ? item.accent : item.border,
                        },
                      ]}>
                      <View
                        style={[
                          styles.sampleLine,
                          {backgroundColor: item.text, width: 39},
                        ]}
                      />
                      <View
                        style={[
                          styles.sampleLine,
                          {backgroundColor: item.muted, width: 29},
                        ]}
                      />
                      <View
                        style={[
                          styles.sampleCircle,
                          {borderColor: item.muted},
                        ]}>
                        {active ? (
                          <Check size={16} color={item.accent} weight="bold" />
                        ) : null}
                      </View>
                      <Text style={[styles.themeLabel, {color: item.text}]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.16)',
    justifyContent: 'flex-end',
  },
  dismissArea: {flex: 1},
  sheet: {maxHeight: '69%', borderTopLeftRadius: 28, borderTopRightRadius: 28},
  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#777',
    opacity: 0.45,
    alignSelf: 'center',
    marginTop: 11,
  },
  content: {padding: 18, paddingBottom: 28},
  fontContent: {paddingHorizontal: 20, paddingBottom: 42},
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  topRow: {
    height: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 21},
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlRow: {flexDirection: 'row', gap: 3, marginVertical: 14},
  bigControl: {
    flex: 1,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineControl: {
    width: 108,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },
  smallA: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 18},
  largeA: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 30},
  lineHint: {fontFamily: 'Lato-Regular', fontSize: 10, marginTop: 2},
  settingRow: {
    minHeight: 66,
    marginTop: 3,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {fontFamily: 'Lato-Regular', fontSize: 16, flex: 1},
  rowValue: {
    fontFamily: 'Nokia Pure Headline Bold',
    fontSize: 17,
    maxWidth: '46%',
    marginRight: 8,
  },
  sectionLabel: {
    fontFamily: 'Lato-Bold',
    fontSize: 12,
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 12,
  },
  themes: {gap: 10, paddingRight: 20},
  themeCard: {
    width: 94,
    height: 154,
    borderWidth: 2,
    borderRadius: 20,
    padding: 13,
  },
  sampleLine: {height: 3, borderRadius: 2, marginTop: 6},
  sampleCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  themeLabel: {fontFamily: 'Lato-Bold', fontSize: 11, marginTop: 'auto'},
  fontRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  grow: {flex: 1},
  fontName: {fontSize: 19, marginBottom: 5},
  weightRow: {flexDirection: 'row', gap: 8},
  weightButton: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReaderSettings;
