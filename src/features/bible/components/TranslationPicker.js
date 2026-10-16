import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {Check, DownloadSimple, X} from 'phosphor-react-native';
import {translationId} from '../models';
import {BIBLE_COLORS} from '../constants';
import {
  BUNDLED_NASV_ID,
  downloadBible,
  getDownloadedTranslationIds,
} from '../offlineBible';

const TranslationPicker = ({
  visible,
  onClose,
  translations,
  selectedId,
  onSelect,
  darkMode,
}) => {
  const [downloadedIds, setDownloadedIds] = useState([BUNDLED_NASV_ID]);
  const [downloadProgress, setDownloadProgress] = useState({});
  const colors = {
    background: darkMode ? '#151A1E' : BIBLE_COLORS.background,
    card: darkMode ? BIBLE_COLORS.darkCard : '#FFFFFF',
    text: darkMode ? '#F7F7F7' : BIBLE_COLORS.ink,
    muted: darkMode ? '#B8C0C5' : BIBLE_COLORS.secondary,
  };
  const refreshDownloads = useCallback(async () => {
    const ids = await getDownloadedTranslationIds(
      translations.map(translationId),
    );
    setDownloadedIds(ids);
  }, [translations]);
  useEffect(() => {
    if (visible) refreshDownloads();
  }, [visible, refreshDownloads]);
  const startDownload = async item => {
    const id = translationId(item);
    setDownloadProgress(current => ({...current, [id]: 0.001}));
    try {
      await downloadBible(item, progress =>
        setDownloadProgress(current => ({...current, [id]: progress})),
      );
      setDownloadedIds(current => [...new Set([...current, id])]);
      Toast.show({type: 'success', text1: `${item.displayName} is offline`});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Download failed',
        text2: error?.message || 'Please check your connection and try again.',
      });
    } finally {
      setDownloadProgress(current => {
        const next = {...current};
        delete next[id];
        return next;
      });
    }
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, {color: colors.text}]}>
              Choose translation
            </Text>
            <Text style={[styles.subtitle, {color: colors.muted}]}>
              Download a version to read it offline
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close translation picker"
            onPress={onClose}
            style={styles.close}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {translations.map(item => {
            const id = translationId(item);
            const selected = id === selectedId;
            const downloaded = downloadedIds.includes(id);
            const progress = downloadProgress[id];
            return (
              <View
                key={id}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.card,
                    borderColor: selected
                      ? BIBLE_COLORS.gold
                      : darkMode
                      ? '#394249'
                      : BIBLE_COLORS.border,
                  },
                ]}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{selected}}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={styles.translationButton}>
                  <View style={styles.flex}>
                    <Text style={[styles.name, {color: colors.text}]}>
                      {item.displayName}
                    </Text>
                    <Text style={[styles.meta, {color: colors.muted}]}>
                      {item.language}
                      {item.translationCode ? ` · ${item.translationCode}` : ''}
                      {item.bookCount ? ` · ${item.bookCount} books` : ''}
                    </Text>
                    {downloaded ? (
                      <Text style={styles.offlineLabel}>
                        {id === BUNDLED_NASV_ID
                          ? 'Included offline'
                          : 'Available offline'}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? (
                    <Check size={22} color={BIBLE_COLORS.gold} weight="bold" />
                  ) : null}
                </TouchableOpacity>
                {!downloaded ? (
                  <TouchableOpacity
                    accessibilityLabel={`Download ${item.displayName}`}
                    disabled={progress !== undefined}
                    onPress={() => startDownload(item)}
                    style={styles.downloadButton}>
                    {progress !== undefined ? (
                      <View style={styles.progressWrap}>
                        <ActivityIndicator
                          size="small"
                          color={BIBLE_COLORS.gold}
                        />
                        <Text style={styles.progressText}>
                          {Math.max(1, Math.round(progress * 100))}%
                        </Text>
                      </View>
                    ) : (
                      <DownloadSimple
                        size={23}
                        color={BIBLE_COLORS.gold}
                        weight="bold"
                      />
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  header: {
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 22},
  subtitle: {fontFamily: 'Lato-Regular', fontSize: 13, marginTop: 3},
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {padding: 16, paddingBottom: 40},
  row: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  translationButton: {
    flex: 1,
    minHeight: 70,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadButton: {
    width: 58,
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: {alignItems: 'center', gap: 3},
  progressText: {
    color: BIBLE_COLORS.gold,
    fontFamily: 'Lato-Bold',
    fontSize: 10,
  },
  offlineLabel: {
    color: BIBLE_COLORS.gold,
    fontFamily: 'Lato-Bold',
    fontSize: 11,
    marginTop: 5,
  },
  flex: {flex: 1, paddingRight: 8},
  name: {fontFamily: 'Nokia Pure Headline Bold', fontSize: 17},
  meta: {fontFamily: 'Lato-Regular', fontSize: 13, marginTop: 5},
});

export default TranslationPicker;
