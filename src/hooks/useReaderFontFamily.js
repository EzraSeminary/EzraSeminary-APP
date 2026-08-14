import {useCallback, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_READER_FONT_ID,
  getReaderFontById,
  getReaderFontFamily,
  normalizeReaderFontId,
  READER_FONTS,
} from '../utils/readerFonts';

const READER_FONT_FAMILY_KEY = 'reader_font_family_v1';
const listeners = new Set();
let sharedReaderFontId = DEFAULT_READER_FONT_ID;
let hasHydratedSharedFont = false;

const notifyFontChange = nextFontId => {
  listeners.forEach(listener => {
    listener(nextFontId);
  });
};

const useReaderFontFamily = () => {
  const [readerFontId, setReaderFontIdState] = useState(sharedReaderFontId);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const handleFontChange = nextFontId => {
      setReaderFontIdState(nextFontId);
    };
    listeners.add(handleFontChange);

    const loadFont = async () => {
      try {
        if (!hasHydratedSharedFont) {
          const stored = await AsyncStorage.getItem(READER_FONT_FAMILY_KEY);
          if (stored) {
            sharedReaderFontId = normalizeReaderFontId(stored);
          }
          hasHydratedSharedFont = true;
          notifyFontChange(sharedReaderFontId);
        } else if (isMounted) {
          setReaderFontIdState(sharedReaderFontId);
        }
      } catch (error) {
        console.error('Failed to load reader font family:', error);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    loadFont();

    return () => {
      isMounted = false;
      listeners.delete(handleFontChange);
    };
  }, []);

  const setReaderFontId = useCallback(async nextFontId => {
    const normalizedFontId = normalizeReaderFontId(nextFontId);
    sharedReaderFontId = normalizedFontId;
    notifyFontChange(normalizedFontId);

    try {
      await AsyncStorage.setItem(READER_FONT_FAMILY_KEY, normalizedFontId);
    } catch (error) {
      console.error('Failed to save reader font family:', error);
    }
  }, []);

  const readerFontFamily = useMemo(
    () => getReaderFontFamily(readerFontId),
    [readerFontId],
  );
  const readerFont = useMemo(
    () => getReaderFontById(readerFontId),
    [readerFontId],
  );
  const readerFontStyle = useMemo(
    () => ({fontFamily: readerFontFamily}),
    [readerFontFamily],
  );

  return {
    readerFont,
    readerFontId,
    readerFontFamily,
    readerFontStyle,
    readerFonts: READER_FONTS,
    setReaderFontId,
    isReaderFontFamilyLoaded: isLoaded,
  };
};

export default useReaderFontFamily;
