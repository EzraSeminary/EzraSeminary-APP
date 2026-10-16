import {
  BUNDLED_NASV_ID,
  BUNDLED_NASV_TRANSLATION,
  getOfflineBooks,
  getOfflineChapter,
  isBibleDownloaded,
  searchOfflineBible,
} from '../offlineBible';

describe('bundled NASV offline Bible', () => {
  test('ships the complete NASV translation with the app', async () => {
    const books = await getOfflineBooks(BUNDLED_NASV_ID);
    const chapter = await getOfflineChapter(BUNDLED_NASV_ID, books[0]._id, 1);

    expect(BUNDLED_NASV_TRANSLATION.displayName).toMatch(/NASV/i);
    expect(await isBibleDownloaded(BUNDLED_NASV_ID)).toBe(true);
    expect(books).toHaveLength(66);
    expect(chapter[0].verseNumber).toBe(1);
    expect(chapter[0].text).toContain('በመጀመሪያ');
  });

  test('searches bundled Scripture without a network request', async () => {
    const result = await searchOfflineBible({
      translationId: BUNDLED_NASV_ID,
      q: 'በመጀመሪያ',
      page: 1,
      limit: 15,
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].book).toBeTruthy();
    expect(result.pagination.total).toBeGreaterThan(0);
  });
});
