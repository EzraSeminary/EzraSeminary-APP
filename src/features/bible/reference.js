const uniqueSorted = values =>
  [...new Set(values.map(Number).filter(Number.isFinite))].sort(
    (a, b) => a - b,
  );

export const parseVerseRanges = value => {
  const numbers = [];
  String(value || '')
    .split(/[,፣]/)
    .forEach(part => {
      const [rawStart, rawEnd] = part.trim().split('-');
      const start = Number(rawStart);
      const end = rawEnd === undefined ? start : Number(rawEnd);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return;
      const low = Math.min(start, end);
      const high = Math.max(start, end);
      for (let number = low; number <= high; number += 1) numbers.push(number);
    });
  return uniqueSorted(numbers);
};

export const compactVerseRanges = (values, separator = ',') => {
  const numbers = uniqueSorted(values);
  const ranges = [];
  for (let index = 0; index < numbers.length; index += 1) {
    const start = numbers[index];
    let end = start;
    while (numbers[index + 1] === end + 1) {
      end = numbers[++index];
    }
    ranges.push(start === end ? String(start) : `${start}-${end}`);
  }
  return ranges.join(separator);
};

export const isAmharicTranslation = translation =>
  /amharic|አማርኛ/i.test(
    `${translation?.language || ''} ${translation?.displayName || ''}`,
  );

export const formatPassageReference = ({
  book,
  chapter,
  verseNumbers,
  translation,
}) => {
  const label = book?.localizedName || book?.name || '';
  const separator = isAmharicTranslation(translation) ? '፣' : ',';
  const ranges = compactVerseRanges(verseNumbers, separator);
  return `${label} ${chapter}${ranges ? `:${ranges}` : ''}`.trim();
};

export const matchEquivalentBook = (sourceBook, targetBooks = []) =>
  targetBooks.find(book => book.standardId === sourceBook?.standardId) ||
  targetBooks.find(book => Number(book.order) === Number(sourceBook?.order)) ||
  null;

export const buildBiblePath = ({translation, book, chapter, verseNumbers}) => {
  const slug = value =>
    encodeURIComponent(
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-'),
    );
  const translationSlug = slug(
    translation?.translationCode || translation?.id || translation?._id,
  );
  const bookSlug = slug(book?.standardId || book?.name || book?._id);
  const verses = compactVerseRanges(verseNumbers || []);
  return `/bible/${translationSlug}.${bookSlug}.${chapter}${
    verses ? `?v=${encodeURIComponent(verses)}` : ''
  }`;
};

export const parseBiblePassagePath = (passage, verses) => {
  const [translationSlug = '', bookSlug = '', rawChapter = '1'] = String(
    passage || '',
  ).split('.');
  return {
    translationSlug: decodeURIComponent(translationSlug).toLowerCase(),
    bookSlug: decodeURIComponent(bookSlug).toLowerCase(),
    chapter: Math.max(1, Number(rawChapter) || 1),
    verseNumbers: parseVerseRanges(verses),
  };
};
