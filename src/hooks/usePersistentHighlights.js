import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'persistent_highlights_v1:';

const createStorageKey = cacheKey => `${STORAGE_PREFIX}${cacheKey}`;

const normalizeHighlightState = raw => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  return raw;
};

const usePersistentHighlights = cacheKey => {
  const [highlights, setHighlights] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadHighlights = async () => {
      try {
        const saved = await AsyncStorage.getItem(createStorageKey(cacheKey));
        const parsed = saved ? JSON.parse(saved) : {};

        if (isMounted) {
          setHighlights(normalizeHighlightState(parsed));
        }
      } catch (error) {
        console.error('Error loading highlights:', error);
        if (isMounted) {
          setHighlights({});
        }
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    if (cacheKey) {
      setIsLoaded(false);
      loadHighlights();
    }

    return () => {
      isMounted = false;
    };
  }, [cacheKey]);

  const persist = useCallback(
    async nextHighlights => {
      setHighlights(nextHighlights);

      try {
        await AsyncStorage.setItem(
          createStorageKey(cacheKey),
          JSON.stringify(nextHighlights),
        );
      } catch (error) {
        console.error('Error saving highlights:', error);
      }
    },
    [cacheKey],
  );

  const setHighlight = useCallback(
    async (blockId, colorId) => {
      const nextHighlights = {
        ...highlights,
        [blockId]: colorId,
      };

      await persist(nextHighlights);
    },
    [highlights, persist],
  );

  const clearHighlight = useCallback(
    async blockId => {
      if (!highlights[blockId]) {
        return;
      }

      const nextHighlights = {...highlights};
      delete nextHighlights[blockId];
      await persist(nextHighlights);
    },
    [highlights, persist],
  );

  return {
    highlights,
    isLoaded,
    setHighlight,
    clearHighlight,
  };
};

export default usePersistentHighlights;
