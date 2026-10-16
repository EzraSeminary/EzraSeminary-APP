const fs = require('fs/promises');
const path = require('path');

const API_ROOT = 'https://ezrabackend.online';
const NASV_ID = '6ace3c2e442898d6c037abba';
const OUTPUT = path.resolve(__dirname, '../src/features/bible/data/nasv.json');

const requestJson = async (pathname, attempt = 1) => {
  try {
    const response = await fetch(`${API_ROOT}${pathname}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise(resolve => setTimeout(resolve, attempt * 600));
    return requestJson(pathname, attempt + 1);
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

const runPool = async (jobs, workerCount, worker) => {
  let cursor = 0;
  let complete = 0;
  const run = async () => {
    while (cursor < jobs.length) {
      const index = cursor++;
      await worker(jobs[index]);
      complete += 1;
      if (complete % 50 === 0 || complete === jobs.length) {
        process.stdout.write(
          `Downloaded ${complete}/${jobs.length} chapters\n`,
        );
      }
    }
  };
  await Promise.all(Array.from({length: workerCount}, run));
};

const main = async () => {
  const translations = await requestJson('/api/bibles');
  const translation = translations.find(item => item._id === NASV_ID);
  if (!translation) throw new Error('Amharic NASV was not found');

  const sourceBooks = await requestJson(`/api/bibles/${NASV_ID}/books`);
  const books = sourceBooks.map(compactBook);
  const chapters = {};
  const jobs = books.flatMap(book =>
    Array.from({length: book.chapterCount}, (_, index) => ({
      book,
      chapterNumber: index + 1,
    })),
  );

  await runPool(jobs, 10, async ({book, chapterNumber}) => {
    const response = await requestJson(
      `/api/bibles/${NASV_ID}/books/${book._id}/chapters/${chapterNumber}`,
    );
    if (!chapters[book._id]) chapters[book._id] = {};
    chapters[book._id][chapterNumber] = (response.verses || []).map(
      compactVerse,
    );
  });

  await fs.mkdir(path.dirname(OUTPUT), {recursive: true});
  await fs.writeFile(
    OUTPUT,
    JSON.stringify({schemaVersion: 1, translation, books, chapters}),
  );
  const stats = await fs.stat(OUTPUT);
  process.stdout.write(
    `Wrote ${OUTPUT} (${(stats.size / 1024 / 1024).toFixed(2)} MB)\n`,
  );
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
