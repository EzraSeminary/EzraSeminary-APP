import {
  buildBiblePath,
  compactVerseRanges,
  formatPassageReference,
  matchEquivalentBook,
  parseBiblePassagePath,
  parseVerseRanges,
} from '../reference';

describe('Bible passage references', () => {
  test('formats contiguous and noncontiguous selections canonically', () => {
    expect(compactVerseRanges([4, 2, 1, 2])).toBe('1-2,4');
    expect(
      formatPassageReference({
        book: {name: 'Genesis'},
        chapter: 1,
        verseNumbers: [1, 2, 4],
        translation: {language: 'English'},
      }),
    ).toBe('Genesis 1:1-2,4');
  });

  test('uses the Ethiopic separator and localized book name', () => {
    expect(
      formatPassageReference({
        book: {name: 'Genesis', localizedName: 'ዘፍጥረት'},
        chapter: 1,
        verseNumbers: [1, 2, 4],
        translation: {language: 'Amharic'},
      }),
    ).toBe('ዘፍጥረት 1:1-2፣4');
  });

  test('accepts comma, Ethiopic comma, and ranges from links', () => {
    expect(parseVerseRanges('1-2፣4,7-6')).toEqual([1, 2, 4, 6, 7]);
    expect(parseBiblePassagePath('nasv.GEN.3', '1-2፣4')).toEqual({
      translationSlug: 'nasv',
      bookSlug: 'gen',
      chapter: 3,
      verseNumbers: [1, 2, 4],
    });
  });

  test('builds website-compatible passage links', () => {
    expect(
      buildBiblePath({
        translation: {translationCode: 'NASV'},
        book: {standardId: 'GEN'},
        chapter: 1,
        verseNumbers: [1, 2, 4],
      }),
    ).toBe('/bible/nasv.gen.1?v=1-2%2C4');
  });
});

describe('translation comparison book matching', () => {
  test('prefers standardId then falls back to canonical order', () => {
    const books = [
      {_id: 'order', standardId: 'OTHER', order: 1},
      {_id: 'standard', standardId: 'GEN', order: 9},
    ];
    expect(matchEquivalentBook({standardId: 'GEN', order: 1}, books)._id).toBe(
      'standard',
    );
    expect(
      matchEquivalentBook({standardId: 'MISSING', order: 1}, books)._id,
    ).toBe('order');
  });
});
