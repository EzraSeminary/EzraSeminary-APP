import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect, useState} from 'react';
import {HIGHLIGHT_COLORS} from './constants';

const STORAGE_KEY = 'bible_highlight_palette_v1';
const listeners = new Set();
let palette = HIGHLIGHT_COLORS;
let loaded = false;

const normalizeColor = item => ({
  key: String(item.key),
  label: String(item.label || 'Highlight').trim().slice(0, 24) || 'Highlight',
  hex: /^#[0-9a-fA-F]{6}$/.test(item.hex) ? item.hex.toUpperCase() : '#FCD34D',
});

export const loadHighlightPalette = async () => {
  if (!loaded) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : [];
      const overrides = new Map(
        (Array.isArray(stored) ? stored : []).map(item => [item.key, item]),
      );
      palette = HIGHLIGHT_COLORS.map(item =>
        normalizeColor({...item, ...(overrides.get(item.key) || {})}),
      );
      (Array.isArray(stored) ? stored : []).forEach(item => {
        if (!HIGHLIGHT_COLORS.some(base => base.key === item.key)) {
          palette.push(normalizeColor(item));
        }
      });
    } catch {
      palette = HIGHLIGHT_COLORS.map(normalizeColor);
    }
    loaded = true;
  }
  return palette;
};

export const saveHighlightPalette = async nextPalette => {
  palette = nextPalette.slice(0, 20).map(normalizeColor);
  loaded = true;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
  listeners.forEach(listener => listener(palette));
  return palette;
};

export const useHighlightPalette = () => {
  const [colors, setColors] = useState(palette);
  useEffect(() => {
    let active = true;
    loadHighlightPalette().then(value => {
      if (active) setColors(value);
    });
    const listener = value => setColors(value);
    listeners.add(listener);
    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, []);
  return colors;
};
