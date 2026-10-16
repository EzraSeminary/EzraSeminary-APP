/**
 * Runtime-free JSDoc models keep the existing JavaScript codebase typed in
 * editors without introducing a second compile pipeline.
 *
 * @typedef {Object} BibleTranslation
 * @property {string=} _id
 * @property {string=} id
 * @property {string} displayName
 * @property {string} language
 * @property {string} translationCode
 * @property {number=} bookCount
 *
 * @typedef {Object} BibleBook
 * @property {string} _id
 * @property {string} name
 * @property {string=} localizedName
 * @property {string} standardId
 * @property {string} testament
 * @property {number} order
 * @property {number} chapterCount
 *
 * @typedef {Object} BibleVerse
 * @property {string} _id
 * @property {number} chapterNumber
 * @property {number=} verseNumber
 * @property {string=} sourceVerseId
 * @property {string} text
 */

export const translationId = translation =>
  translation?.id || translation?._id || '';

export const bookLabel = book => book?.localizedName || book?.name || '';

export const verseNumber = verse => {
  const value = Number(verse?.verseNumber ?? verse?.sourceVerseId);
  return Number.isFinite(value) ? value : 0;
};

export const verseId = verse =>
  typeof verse === 'string' ? verse : verse?._id || verse?.id || '';

export const normalizeChapter = response =>
  [...(Array.isArray(response) ? response : Array.isArray(response?.verses) ? response.verses : [])].sort(
    (a, b) => verseNumber(a) - verseNumber(b),
  );
