import RNFS from 'react-native-fs';
import {getApiBaseUrl} from '../../utils/apiBaseUrl';
import bundledNasv from './data/nasv.json';

export const BUNDLED_NASV_ID = bundledNasv.translation._id;
export const BUNDLED_NASV_TRANSLATION = bundledNasv.translation;

const OFFLINE_DIRECTORY = `${RNFS.DocumentDirectoryPath}/offline-bibles`;
const memoryCache = new Map([[BUNDLED_NASV_ID, bundledNasv]]);

const fileKey = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');
const biblePath = translationId =>
  `${OFFLINE_DIRECTORY}/${fileKey(translationId)}.json`;
const metadataPath = translationId =>
  `${OFFLINE_DIRECTORY}/${fileKey(translationId)}.meta.json`;

const readJsonFile = async path =>
  JSON.parse(await RNFS.readFile(path, 'utf8'));

export const getOfflineBible = async translationId => {
  if (!translationId) return null;
  if (memoryCache.has(translationId)) return memoryCache.get(translationId);
  const path = biblePath(translationId);
  if (!(await RNFS.exists(path))) return null;
  const bible = await readJsonFile(path);
  memoryCache.set(translationId, bible);
  return bible;
};

export const isBibleDownloaded = async translationId =>
  translationId === BUNDLED_NASV_ID || RNFS.exists(biblePath(translationId));

export const getDownloadedTranslationIds = async translationIds => {
  const pairs = await Promise.all(
    translationIds.map(async id => [id, await isBibleDownloaded(id)]),
  );
  return pairs.filter(([, downloaded]) => downloaded).map(([id]) => id);
};

export const getOfflineTranslations = async () => {
  const translations = [BUNDLED_NASV_TRANSLATION];
  if (!(await RNFS.exists(OFFLINE_DIRECTORY))) return translations;
  const entries = await RNFS.readDir(OFFLINE_DIRECTORY);
  const metadata = await Promise.all(
    entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.meta.json'))
      .map(entry => readJsonFile(entry.path).catch(() => null)),
  );
  metadata.filter(Boolean).forEach(translation => {
    if (!translations.some(item => item._id === translation._id)) {
      translations.push(translation);
    }
  });
  return translations;
};

export const getOfflineBooks = async translationId =>
  (await getOfflineBible(translationId))?.books || null;

export const getOfflineChapter = async (translationId, bookId, chapterNumber) =>
  (await getOfflineBible(translationId))?.chapters?.[bookId]?.[chapterNumber] ||
  null;

export const getOfflineChapterNumbers = async (translationId, bookId) => {
  const chapters = (await getOfflineBible(translationId))?.chapters?.[bookId];
  return chapters
    ? Object.keys(chapters)
        .map(Number)
        .sort((a, b) => a - b)
    : null;
};

export const getOfflineVerse = async (translationId, requestedVerseId) => {
  const bible = await getOfflineBible(translationId);
  if (!bible) return null;
  for (const book of bible.books) {
    for (const verses of Object.values(bible.chapters[book._id] || {})) {
      const match = verses.find(verse => verse._id === requestedVerseId);
      if (match) return {...match, book};
    }
  }
  return null;
};

export const searchOfflineBible = async ({
  translationId,
  q,
  page = 1,
  limit = 15,
  bookId,
}) => {
  const bible = await getOfflineBible(translationId);
  if (!bible) return null;
  const needle = q.trim().toLocaleLowerCase();
  const matches = [];
  for (const book of bible.books) {
    if (bookId && book._id !== bookId) continue;
    for (const verses of Object.values(bible.chapters[book._id] || {})) {
      verses.forEach(verse => {
        if (verse.text.toLocaleLowerCase().includes(needle)) {
          matches.push({...verse, book});
        }
      });
    }
  }
  const start = (page - 1) * limit;
  return {
    items: matches.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: matches.length,
      pages: Math.ceil(matches.length / limit),
    },
  };
};

const requestJson = async (url, attempt = 1) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    return response.json();
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise(resolve => setTimeout(resolve, attempt * 700));
    return requestJson(url, attempt + 1);
  }
};

const compactBook = book => ({
  _id: book._id,
  translation: book.translation,
  standardId: book.standardId,
  name: book.name,
  localizedName: book.localizedName,
  testament: book.testament,
  order: book.order,
  chapterCount: book.chapterCount,
});

const compactVerse = verse => ({
  _id: verse._id,
  book: verse.book,
  chapterNumber: verse.chapterNumber,
  verseNumber: verse.verseNumber,
  sourceVerseId: verse.sourceVerseId,
  text: verse.text,
});

export const downloadBible = async (translation, onProgress = () => {}) => {
  const translationId = translation?._id || translation?.id;
  if (!translationId) throw new Error('This translation cannot be downloaded.');
  if (await isBibleDownloaded(translationId)) {
    onProgress(1);
    return;
  }

  const apiRoot = await getApiBaseUrl();
  const booksResponse = await requestJson(
    `${apiRoot}api/bibles/${translationId}/books`,
  );
  const books = booksResponse.map(compactBook);
  const jobs = books.flatMap(book =>
    Array.from({length: book.chapterCount}, (_, index) => ({
      book,
      chapterNumber: index + 1,
    })),
  );
  const chapters = {};
  let cursor = 0;
  let complete = 0;
  let reportedPercent = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      const response = await requestJson(
        `${apiRoot}api/bibles/${translationId}/books/${job.book._id}/chapters/${job.chapterNumber}`,
      );
      if (!chapters[job.book._id]) chapters[job.book._id] = {};
      chapters[job.book._id][job.chapterNumber] = (response.verses || []).map(
        compactVerse,
      );
      complete += 1;
      const percent = Math.floor((complete / jobs.length) * 100);
      if (percent > reportedPercent) {
        reportedPercent = percent;
        onProgress(percent / 100);
      }
    }
  };
  await Promise.all(Array.from({length: 6}, worker));

  const bible = {schemaVersion: 1, translation, books, chapters};
  await RNFS.mkdir(OFFLINE_DIRECTORY);
  const destination = biblePath(translationId);
  const temporary = `${destination}.part`;
  await RNFS.writeFile(temporary, JSON.stringify(bible), 'utf8');
  await RNFS.moveFile(temporary, destination);
  await RNFS.writeFile(
    metadataPath(translationId),
    JSON.stringify(translation),
    'utf8',
  );
  memoryCache.set(translationId, bible);
  onProgress(1);
};
