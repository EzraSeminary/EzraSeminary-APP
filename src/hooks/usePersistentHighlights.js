import {useCallback, useEffect, useRef, useState} from 'react';
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
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
    async nextStateOrUpdater => {
      const currentState = stateRef.current;
      const nextState =
        typeof nextStateOrUpdater === 'function'
          ? nextStateOrUpdater(currentState)
          : nextStateOrUpdater;

      stateRef.current = nextState;
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
      await persist(previousState => ({
        ...previousState,
        blockHighlights: {
          ...previousState.blockHighlights,
          [blockId]: colorId,
        },
      }));
    },
    [persist],
  );

  const clearHighlight = useCallback(
    async blockId => {
      const currentState = stateRef.current;
      const hasBlockHighlight = Boolean(currentState.blockHighlights?.[blockId]);
      const hasInlineHighlight = Boolean(
        currentState.inlineHighlights?.[blockId]?.length,
      );

      if (!hasBlockHighlight && !hasInlineHighlight) {
        return;
      }

      await persist(previousState => {
        const nextState = {
          ...previousState,
          blockHighlights: {...previousState.blockHighlights},
          inlineHighlights: {...previousState.inlineHighlights},
        };
        delete nextState.blockHighlights[blockId];
        delete nextState.inlineHighlights[blockId];
        return nextState;
      });
    },
    [persist],
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
      await persist(previousState => {
        const existingForBlock = Array.isArray(
          previousState.inlineHighlights?.[blockId],
        )
          ? previousState.inlineHighlights[blockId]
          : [];

        return {
          ...previousState,
          inlineHighlights: {
            ...previousState.inlineHighlights,
            [blockId]: [...existingForBlock, nextRange],
          },
        };
      });
    },
    [persist],
  );

  const clearInlineHighlights = useCallback(
    async blockId => {
      const existingForBlock = stateRef.current.inlineHighlights?.[blockId];
      if (!existingForBlock || existingForBlock.length === 0) {
        return;
      }
      await persist(previousState => {
        const nextState = {
          ...previousState,
          inlineHighlights: {...previousState.inlineHighlights},
        };
        delete nextState.inlineHighlights[blockId];
        return nextState;
      });
    },
    [persist],
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
