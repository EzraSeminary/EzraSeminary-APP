import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'persistent_highlights_v1:';

const createStorageKey = cacheKey => `${STORAGE_PREFIX}${cacheKey}`;

const normalizeHighlightState = raw => {
  if (!raw || typeof raw !== 'object') {
    return {
      blockHighlights: {},
      inlineHighlights: {},
    };
  }

  // Backward compatibility: previous format was { [blockId]: colorId }
  if (!raw.blockHighlights && !raw.inlineHighlights) {
    return {
      blockHighlights: Array.isArray(raw) ? {} : raw,
      inlineHighlights: {},
    };
  }

  return {
    blockHighlights:
      raw.blockHighlights &&
      typeof raw.blockHighlights === 'object' &&
      !Array.isArray(raw.blockHighlights)
        ? raw.blockHighlights
        : {},
    inlineHighlights:
      raw.inlineHighlights &&
      typeof raw.inlineHighlights === 'object' &&
      !Array.isArray(raw.inlineHighlights)
        ? raw.inlineHighlights
        : {},
  };
};

const usePersistentHighlights = cacheKey => {
  const [state, setState] = useState({
    blockHighlights: {},
    inlineHighlights: {},
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadHighlights = async () => {
      try {
        const saved = await AsyncStorage.getItem(createStorageKey(cacheKey));
        const parsed = saved ? JSON.parse(saved) : {};

        if (isMounted) {
          setState(normalizeHighlightState(parsed));
        }
      } catch (error) {
        console.error('Error loading highlights:', error);
        if (isMounted) {
          setState({
            blockHighlights: {},
            inlineHighlights: {},
          });
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
    async nextState => {
      setState(nextState);

      try {
        await AsyncStorage.setItem(
          createStorageKey(cacheKey),
          JSON.stringify(nextState),
        );
      } catch (error) {
        console.error('Error saving highlights:', error);
      }
    },
    [cacheKey],
  );

  const setHighlight = useCallback(
    async (blockId, colorId) => {
      const nextState = {
        ...state,
        blockHighlights: {
          ...state.blockHighlights,
          [blockId]: colorId,
        },
      };

      await persist(nextState);
    },
    [state, persist],
  );

  const clearHighlight = useCallback(
    async blockId => {
      const hasBlockHighlight = Boolean(state.blockHighlights?.[blockId]);
      const hasInlineHighlight = Boolean(
        state.inlineHighlights?.[blockId]?.length,
      );

      if (!hasBlockHighlight && !hasInlineHighlight) {
        return;
      }

      const nextState = {
        ...state,
        blockHighlights: {...state.blockHighlights},
        inlineHighlights: {...state.inlineHighlights},
      };
      delete nextState.blockHighlights[blockId];
      delete nextState.inlineHighlights[blockId];
      await persist(nextState);
    },
    [state, persist],
  );

  const setInlineHighlight = useCallback(
    async ({blockId, start, end, colorId, selectedText}) => {
      const safeStart = Math.max(0, Number(start) || 0);
      const safeEnd = Math.max(safeStart, Number(end) || safeStart);
      if (safeEnd <= safeStart || !blockId || !colorId) {
        return;
      }

      const nextRange = {
        id: `hl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        start: safeStart,
        end: safeEnd,
        colorId,
        text: String(selectedText || ''),
      };
      const existingForBlock = Array.isArray(state.inlineHighlights?.[blockId])
        ? state.inlineHighlights[blockId]
        : [];

      const nextState = {
        ...state,
        inlineHighlights: {
          ...state.inlineHighlights,
          [blockId]: [...existingForBlock, nextRange],
        },
      };
      await persist(nextState);
    },
    [state, persist],
  );

  const clearInlineHighlights = useCallback(
    async blockId => {
      const existingForBlock = state.inlineHighlights?.[blockId];
      if (!existingForBlock || existingForBlock.length === 0) {
        return;
      }
      const nextState = {
        ...state,
        inlineHighlights: {...state.inlineHighlights},
      };
      delete nextState.inlineHighlights[blockId];
      await persist(nextState);
    },
    [state, persist],
  );

  return {
    highlights: state.blockHighlights,
    inlineHighlights: state.inlineHighlights,
    isLoaded,
    setHighlight,
    clearHighlight,
    setInlineHighlight,
    clearInlineHighlights,
  };
};

export default usePersistentHighlights;
