import {useCallback, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const READER_FONT_SCALE_KEY = 'reader_font_scale_v1';
const FONT_SCALE_STEPS = [1, 1.1, 1.2, 1.3, 1.4];
const listeners = new Set();
let sharedFontScale = FONT_SCALE_STEPS[0];
let hasHydratedSharedScale = false;

const normalizeScale = value => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return FONT_SCALE_STEPS[0];
  }

  const closest = FONT_SCALE_STEPS.reduce((previous, current) =>
    Math.abs(current - parsed) < Math.abs(previous - parsed) ? current : previous,
  );
  return closest;
};

const notifyScaleChange = nextScale => {
  listeners.forEach(listener => {
    listener(nextScale);
  });
};

const useReaderFontScale = () => {
  const [readerFontScale, setReaderFontScale] = useState(sharedFontScale);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const handleScaleChange = nextScale => {
      setReaderFontScale(nextScale);
    };
    listeners.add(handleScaleChange);

    const loadScale = async () => {
      try {
        if (!hasHydratedSharedScale) {
          const stored = await AsyncStorage.getItem(READER_FONT_SCALE_KEY);
          if (stored) {
            sharedFontScale = normalizeScale(stored);
          }
          hasHydratedSharedScale = true;
          notifyScaleChange(sharedFontScale);
        } else if (isMounted) {
          setReaderFontScale(sharedFontScale);
        }
      } catch (error) {
        console.error('Failed to load reader font scale:', error);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    loadScale();

    return () => {
      isMounted = false;
      listeners.delete(handleScaleChange);
    };
  }, []);

  const setAndPersistScale = useCallback(async nextScale => {
    const normalized = normalizeScale(nextScale);
    sharedFontScale = normalized;
    notifyScaleChange(normalized);
    try {
      await AsyncStorage.setItem(READER_FONT_SCALE_KEY, String(normalized));
    } catch (error) {
      console.error('Failed to save reader font scale:', error);
    }
  }, []);

  const increaseFontScale = useCallback(async () => {
    const currentIndex = FONT_SCALE_STEPS.indexOf(normalizeScale(readerFontScale));
    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + 1) % FONT_SCALE_STEPS.length
        : 1 % FONT_SCALE_STEPS.length;
    await setAndPersistScale(FONT_SCALE_STEPS[nextIndex]);
  }, [readerFontScale, setAndPersistScale]);

  const decreaseFontScale = useCallback(async () => {
    const currentIndex = FONT_SCALE_STEPS.indexOf(normalizeScale(readerFontScale));
    const nextIndex =
      currentIndex >= 0
        ? (currentIndex - 1 + FONT_SCALE_STEPS.length) % FONT_SCALE_STEPS.length
        : FONT_SCALE_STEPS.length - 1;
    await setAndPersistScale(FONT_SCALE_STEPS[nextIndex]);
  }, [readerFontScale, setAndPersistScale]);

  const scaleTextSize = useCallback(
    baseSize => Math.round(baseSize * readerFontScale),
    [readerFontScale],
  );

  const percentage = useMemo(
    () => Math.round(readerFontScale * 100),
    [readerFontScale],
  );

  return {
    readerFontScale,
    readerFontScalePercentage: percentage,
    scaleTextSize,
    increaseFontScale,
    decreaseFontScale,
    isReaderFontScaleLoaded: isLoaded,
  };
};

export default useReaderFontScale;
