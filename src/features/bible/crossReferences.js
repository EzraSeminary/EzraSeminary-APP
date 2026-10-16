let referenceIndex;

const getReferenceIndex = () => {
  if (!referenceIndex) {
    referenceIndex = require('./data/crossReferences.json');
  }
  return referenceIndex;
};

export const getCrossReferences = (book, chapterNumber, verseNumber) => {
  const key = `${Number(book?.order)}.${Number(chapterNumber)}.${Number(
    verseNumber,
  )}`;
  const entries = getReferenceIndex()[key] || [];
  return entries.map(([start, end, votes]) => ({
    start: parseReferenceCode(start),
    end: end ? parseReferenceCode(end) : null,
    votes,
  }));
};

export const parseReferenceCode = value => {
  const packedCode = Number(value);
  if (Number.isFinite(packedCode) && packedCode >= 1000000) {
    const bookOrder = Math.floor(packedCode / 1000000);
    const remainder = packedCode % 1000000;
    const chapter = Math.floor(remainder / 1000);
    const verse = remainder % 1000;
    if (bookOrder && chapter && verse) return {bookOrder, chapter, verse};
  }
  const [bookOrder, chapter, verse] = String(value || '').split('.').map(Number);
  if (!bookOrder || !chapter || !verse) return null;
  return {bookOrder, chapter, verse};
};

export const formatReferenceLabel = (reference, books, translation) => {
  if (!reference) return '';
  const book = books.find(item => Number(item.order) === reference.bookOrder);
  if (!book) return '';
  const name = book.localizedName || book.name;
  const separator = /amharic|አማርኛ/i.test(
    `${translation?.language || ''} ${translation?.displayName || ''}`,
  )
    ? '፡'
    : ':';
  return `${name} ${reference.chapter}${separator}${reference.verse}`;
};
