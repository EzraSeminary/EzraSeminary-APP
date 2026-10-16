import {chapterColumnCount} from '../components/BookChapterPicker';
import {
  BIBLE_SEARCH_DEBOUNCE_MS,
  BIBLE_SEARCH_LIMIT,
  getHighlightColorPage,
  HIGHLIGHT_COLORS,
  isDarkBibleTheme,
} from '../constants';
import {bookLabel, normalizeChapter, translationId, verseId} from '../models';
import {splitHighlightedText} from '../searchUtils';
import {getApiBaseUrlSync} from '../../../utils/apiBaseUrl';
import {READER_FONTS} from '../../../utils/readerFonts';

describe('Bible mobile behavior contracts', () => {
  test('normalizes identifiers, localized book names, and verse order', () => {
    expect(translationId({_id: 'translation'})).toBe('translation');
    expect(bookLabel({name: 'Genesis', localizedName: 'ዘፍጥረት'})).toBe('ዘፍጥረት');
    expect(
      normalizeChapter({
        verses: [
          {_id: '2', verseNumber: 2},
          {_id: '1', sourceVerseId: '1'},
        ],
      }).map(item => item._id),
    ).toEqual(['1', '2']);
    expect(verseId({_id: 'verse-object'})).toBe('verse-object');
    expect(verseId('verse-string')).toBe('verse-string');
  });

  test('keeps the passage picker at five or six safe columns', () => {
    expect(chapterColumnCount(390)).toBe(5);
    expect(chapterColumnCount(768)).toBe(6);
  });

  test('provides all nine colors in five-color pages', () => {
    expect(HIGHLIGHT_COLORS).toHaveLength(9);
    expect(getHighlightColorPage(0)).toHaveLength(5);
    expect(getHighlightColorPage(1)).toHaveLength(4);
    expect(getHighlightColorPage(0)[0].key).toBe('yellow');
    expect(getHighlightColorPage(1)[3].key).toBe('gray');
  });

  test('uses the required search debounce and pagination size', () => {
    expect(BIBLE_SEARCH_DEBOUNCE_MS).toBe(450);
    expect(BIBLE_SEARCH_LIMIT).toBe(15);
  });

  test('classifies reader themes for app-wide theme synchronization', () => {
    expect(isDarkBibleTheme('charcoal')).toBe(true);
    expect(isDarkBibleTheme('midnight')).toBe(true);
    expect(isDarkBibleTheme('paper')).toBe(false);
  });

  test('provides the English reader font choices', () => {
    expect(
      READER_FONTS.filter(font => font.script === 'latin').map(font => font.id),
    ).toEqual(['lexend', 'inter', 'montserrat']);
  });

  test('allows the backend URL to be supplied by the build environment', () => {
    const previous = process.env.API_BASE_URL;
    process.env.API_BASE_URL = 'http://10.0.2.2:5100';
    expect(getApiBaseUrlSync()).toBe('http://10.0.2.2:5100/');
    if (previous === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = previous;
  });

  test('marks every matching search fragment without regex state leakage', () => {
    expect(splitHighlightedText('God said God', 'God')).toEqual([
      {text: 'God', match: true},
      {text: ' said ', match: false},
      {text: 'God', match: true},
    ]);
  });
});
