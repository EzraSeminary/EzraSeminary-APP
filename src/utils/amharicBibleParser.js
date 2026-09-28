import amharicBible from '../assets/AmharicNASVBible.json';

const AMHARIC_BOOKS = [
  {id: '1', name: 'ዘፍጥረት', aliases: ['ዘፍ', 'ዘፍጥ', 'ዘፍጥረት']},
  {id: '2', name: 'ዘፀአት', aliases: ['ዘፀ', 'ዘጸ', 'ዘፀአት', 'ዘጸአት']},
  {id: '3', name: 'ዘሌዋውያን', aliases: ['ዘሌ', 'ዘሌዋ', 'ዘሌዋውያን']},
  {id: '4', name: 'ዘኍልቍ', aliases: ['ዘኍ', 'ዘኁ', 'ዘኍልቍ', 'ዘኁልቁ']},
  {id: '5', name: 'ዘዳግም', aliases: ['ዘዳ', 'ዘዳግ', 'ዘዳግም']},
  {id: '6', name: 'ኢያሱ', aliases: ['ኢያ', 'ኢያሱ']},
  {id: '7', name: 'መሳፍንት', aliases: ['መሳ', 'መሳፍ', 'መሳፍንት']},
  {id: '8', name: 'ሩት', aliases: ['ሩት']},
  {id: '9', name: '1ኛ ሳሙኤል', aliases: ['1 ሳሙ', '1ኛ ሳሙ', '1ኛ ሳሙኤል', '፩ኛ ሳሙ']},
  {id: '10', name: '2ኛ ሳሙኤል', aliases: ['2 ሳሙ', '2ኛ ሳሙ', '2ኛ ሳሙኤል', '፪ኛ ሳሙ']},
  {id: '11', name: '1ኛ ነገሥት', aliases: ['1 ነገ', '1ኛ ነገ', '1ኛ ነገሥት', '1ኛ ነገስት', '፩ኛ ነገ']},
  {id: '12', name: '2ኛ ነገሥት', aliases: ['2 ነገ', '2ኛ ነገ', '2ኛ ነገሥት', '2ኛ ነገስት', '፪ኛ ነገ']},
  {id: '13', name: '1ኛ ዜና', aliases: ['1 ዜና', '1ኛ ዜና', '1ኛ ዜና መዋዕል', '፩ኛ ዜና']},
  {id: '14', name: '2ኛ ዜና', aliases: ['2 ዜና', '2ኛ ዜና', '2ኛ ዜና መዋዕል', '፪ኛ ዜና']},
  {id: '15', name: 'ዕዝራ', aliases: ['ዕዝ', 'እዝ', 'ዕዝራ', 'እዝራ']},
  {id: '16', name: 'ነህምያ', aliases: ['ነህ', 'ነህም', 'ነህምያ']},
  {id: '17', name: 'አስቴር', aliases: ['አስ', 'አስቴ', 'አስቴር']},
  {id: '18', name: 'ኢዮብ', aliases: ['ኢዮ', 'ኢዮብ']},
  {id: '19', name: 'መዝሙር', aliases: ['መዝ', 'መዝሙር', 'መዝሙረ']},
  {id: '20', name: 'ምሳሌ', aliases: ['ምሳ', 'ምሳሌ']},
  {id: '21', name: 'መክብብ', aliases: ['መክ', 'መክብብ']},
  {id: '22', name: 'መኃልየ መኃልይ', aliases: ['መኃ', 'መሃ', 'መኃልየ', 'መሃልየ', 'መኃልየ መኃልይ']},
  {id: '23', name: 'ኢሳይያስ', aliases: ['ኢሳ', 'ኢሳይያስ', 'ኢሳያስ']},
  {id: '24', name: 'ኤርምያስ', aliases: ['ኤር', 'ኤርም', 'ኤርምያስ', 'ኤርሚያስ']},
  {id: '25', name: 'ሰቆቃወ ኤርምያስ', aliases: ['ሰቆ', 'ሰቆቃ', 'ሰቆቃወ']},
  {id: '26', name: 'ሕዝቅኤል', aliases: ['ሕዝ', 'ህዝ', 'ሕዝቅ', 'ሕዝቅኤል', 'ህዝቅኤል']},
  {id: '27', name: 'ዳንኤል', aliases: ['ዳን', 'ዳንኤል']},
  {id: '28', name: 'ሆሴዕ', aliases: ['ሆሴ', 'ሆሴዕ']},
  {id: '29', name: 'ኢዩኤል', aliases: ['ኢዩ', 'ኢዮ', 'ኢዩኤል', 'ኢዮኤል']},
  {id: '30', name: 'አሞጽ', aliases: ['አሞ', 'አሞጽ', 'አሞስ']},
  {id: '31', name: 'አብድዩ', aliases: ['አብድ', 'አብድዩ', 'አብድያ']},
  {id: '32', name: 'ዮናስ', aliases: ['ዮና', 'ዮናስ']},
  {id: '33', name: 'ሚክያስ', aliases: ['ሚክ', 'ሚክያስ']},
  {id: '34', name: 'ናሆም', aliases: ['ናሆ', 'ናሆም']},
  {id: '35', name: 'ዕንባቆም', aliases: ['ዕን', 'እን', 'ዕንባ', 'ዕንባቆም', 'እንባቆም']},
  {id: '36', name: 'ሶፎንያስ', aliases: ['ሶፎ', 'ሶፎንያስ']},
  {id: '37', name: 'ሐጌ', aliases: ['ሐጌ', 'ሀጌ']},
  {id: '38', name: 'ዘካርያስ', aliases: ['ዘካ', 'ዘካር', 'ዘካርያስ']},
  {id: '39', name: 'ሚልክያስ', aliases: ['ሚል', 'ሚልክ', 'ሚልክያስ']},
  {id: '40', name: 'ማቴዎስ', aliases: ['ማቴ', 'ማቴ.', 'ማቴዎስ']},
  {id: '41', name: 'ማርቆስ', aliases: ['ማር', 'ማር.', 'ማርቆስ']},
  {id: '42', name: 'ሉቃስ', aliases: ['ሉቃ', 'ሉቃ.', 'ሉቃስ']},
  {id: '43', name: 'ዮሐንስ', aliases: ['ዮሐ', 'ዮሐ.', 'ዮሐንስ', 'ዮሃንስ']},
  {id: '44', name: 'የሐዋርያት ሥራ', aliases: ['የሐዋ', 'ሐዋ', 'ሀዋ', 'ሐዋርያት', 'የሐዋርያት ሥራ']},
  {id: '45', name: 'ሮሜ', aliases: ['ሮሜ', 'ሮሜ.']},
  {id: '46', name: '1ኛ ቆሮንቶስ', aliases: ['1 ቆሮ', '1ኛ ቆሮ', '1ኛ ቆሮንቶስ', '፩ኛ ቆሮ']},
  {id: '47', name: '2ኛ ቆሮንቶስ', aliases: ['2 ቆሮ', '2ኛ ቆሮ', '2ኛ ቆሮንቶስ', '፪ኛ ቆሮ']},
  {id: '48', name: 'ገላትያ', aliases: ['ገላ', 'ገላትያ']},
  {id: '49', name: 'ኤፌሶን', aliases: ['ኤፌ', 'ኤፌሶን']},
  {id: '50', name: 'ፊልጵስዩስ', aliases: ['ፊል', 'ፊልጵ', 'ፊልጵስዩስ', 'ፊልጵስዮስ']},
  {id: '51', name: 'ቆላስይስ', aliases: ['ቆላ', 'ቆላ.', 'ቆላስይስ', 'ቆላስያስ']},
  {id: '52', name: '1ኛ ተሰሎንቄ', aliases: ['1 ተሰ', '1ኛ ተሰ', '1ኛ ተሰሎንቄ', '፩ኛ ተሰ']},
  {id: '53', name: '2ኛ ተሰሎንቄ', aliases: ['2 ተሰ', '2ኛ ተሰ', '2ኛ ተሰሎንቄ', '፪ኛ ተሰ']},
  {id: '54', name: '1ኛ ጢሞቴዎስ', aliases: ['1 ጢሞ', '1ኛ ጢሞ', '1ኛ ጢሞቴዎስ', '፩ኛ ጢሞ']},
  {id: '55', name: '2ኛ ጢሞቴዎስ', aliases: ['2 ጢሞ', '2ኛ ጢሞ', '2ኛ ጢሞቴዎስ', '፪ኛ ጢሞ']},
  {id: '56', name: 'ቲቶ', aliases: ['ቲቶ']},
  {id: '57', name: 'ፊልሞና', aliases: ['ፊልሞ', 'ፊልሞና']},
  {id: '58', name: 'ዕብራውያን', aliases: ['ዕብ', 'ዕብ.', 'እብ', 'እብ.', 'ዕብራውያን', 'እብራውያን']},
  {id: '59', name: 'ያዕቆብ', aliases: ['ያዕ', 'ያዕቆብ', 'ያዕቆብ']},
  {id: '60', name: '1ኛ ጴጥሮስ', aliases: ['1 ጴጥ', '1ኛ ጴጥ', '1ኛ ጴጥሮስ', '፩ኛ ጴጥ']},
  {id: '61', name: '2ኛ ጴጥሮስ', aliases: ['2 ጴጥ', '2ኛ ጴጥ', '2ኛ ጴጥሮስ', '፪ኛ ጴጥ']},
  {id: '62', name: '1ኛ ዮሐንስ', aliases: ['1 ዮሐ', '1ኛ ዮሐ', '1ኛ ዮሐንስ', '፩ኛ ዮሐ']},
  {id: '63', name: '2ኛ ዮሐንስ', aliases: ['2 ዮሐ', '2ኛ ዮሐ', '2ኛ ዮሐንስ', '፪ኛ ዮሐ']},
  {id: '64', name: '3ኛ ዮሐንስ', aliases: ['3 ዮሐ', '3ኛ ዮሐ', '3ኛ ዮሐንስ', '፫ኛ ዮሐ']},
  {id: '65', name: 'ይሁዳ', aliases: ['ይሁ', 'ይሁዳ']},
  {id: '66', name: 'ራዕይ', aliases: ['ራዕ', 'ራዕ.', 'ራእ', 'ራእ.', 'ራዕይ', 'ራእይ']},
];

const ETHIOPIC_DIGITS = {
  '፩': 1,
  '፪': 2,
  '፫': 3,
  '፬': 4,
  '፭': 5,
  '፮': 6,
  '፯': 7,
  '፰': 8,
  '፱': 9,
  '፲': 10,
  '፳': 20,
  '፴': 30,
  '፵': 40,
  '፶': 50,
  '፷': 60,
  '፸': 70,
  '፹': 80,
  '፺': 90,
};

const normalizeSeparators = value =>
  String(value || '')
    .replace(/[：፥]/g, ':')
    .replace(/፡/g, ':')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const escapeHtml = value =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeBookKey = value =>
  normalizeSeparators(value)
    .replace(/[.።]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const toNumber = value => {
  const text = String(value || '').trim();
  if (/^\d+$/.test(text)) {
    return Number(text);
  }

  let total = 0;
  for (const char of text) {
    const digit = ETHIOPIC_DIGITS[char];
    if (!digit) {
      return NaN;
    }
    total += digit;
  }
  return total;
};

const BOOK_ALIAS_MAP = AMHARIC_BOOKS.reduce((result, book) => {
  [book.name, ...book.aliases].forEach(alias => {
    const normalizedAlias = normalizeBookKey(alias);
    result[normalizedAlias] = book;
    result[normalizeBookKey(normalizedAlias.replace(/^([123፩፪፫])ኛ\s+/, '$1 '))] =
      book;
    result[normalizeBookKey(normalizedAlias.replace(/^([123፩፪፫])\s+/, '$1ኛ '))] =
      book;
  });
  return result;
}, {});

const sortedBookAliases = Object.keys(BOOK_ALIAS_MAP).sort(
  (first, second) => second.length - first.length,
);

const AMHARIC_REFERENCE_REGEX = new RegExp(
  `(${sortedBookAliases
    .map(alias => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})\\.?\\s*([0-9፩-፺]+)\\s*[:፡]\\s*([0-9፩-፺]+(?:\\s*-\\s*[0-9፩-፺]+)?)`,
  'g',
);

const AMHARIC_REFERENCE_AT_START_REGEX = new RegExp(
  `^\\s*(${sortedBookAliases
    .map(alias => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})\\.?\\s*[0-9፩-፺]+\\s*[:፡]\\s*[0-9፩-፺]+(?:\\s*-\\s*[0-9፩-፺]+)?`,
);

const AMHARIC_CONTINUATION_REGEX =
  /([,;፣፤]\s*)([0-9፩-፺]+(?:\s*[:፡]\s*[0-9፩-፺]+(?:\s*-\s*[0-9፩-፺]+)?|\s*-\s*[0-9፩-፺]+)?)/g;
const LEADING_AMHARIC_CONTINUATION_REGEX =
  /^(\s*)([0-9፩-፺]+(?:\s*[:፡]\s*[0-9፩-፺]+(?:\s*-\s*[0-9፩-፺]+)?|\s*-\s*[0-9፩-፺]+)?)/;
const TRAILING_AMHARIC_SEPARATOR_REGEX = /[,;፣፤]\s*$/;

export const parseAmharicVerseReference = reference => {
  const normalized = normalizeSeparators(reference)
    .replace(/ን(?=\s|$)/g, '')
    .replace(/[።,፣;፤]+$/g, '')
    .trim();

  for (const alias of sortedBookAliases) {
    const pattern = new RegExp(
      `^${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.?\\s*([0-9፩-፺]+)\\s*:\\s*([0-9፩-፺]+)(?:\\s*-\\s*([0-9፩-፺]+))?`,
    );
    const match = normalized.match(pattern);
    if (!match) {
      continue;
    }

    const book = BOOK_ALIAS_MAP[alias];
    const chapter = toNumber(match[1]);
    const startVerse = toNumber(match[2]);
    const endVerse = match[3] ? toNumber(match[3]) : startVerse;

    if (
      !book ||
      !Number.isFinite(chapter) ||
      !Number.isFinite(startVerse) ||
      !Number.isFinite(endVerse)
    ) {
      return null;
    }

    return {
      bookId: book.id,
      bookName: book.name,
      chapter,
      startVerse,
      endVerse: Math.max(startVerse, endVerse),
      normalizedReference:
        startVerse === endVerse
          ? `${book.name} ${chapter}:${startVerse}`
          : `${book.name} ${chapter}:${startVerse}-${endVerse}`,
    };
  }

  return null;
};

const formatParsedVerseRange = parsed =>
  parsed.startVerse === parsed.endVerse
    ? String(parsed.startVerse)
    : `${parsed.startVerse}-${parsed.endVerse}`;

const parseAmharicVerseReferenceList = reference => {
  const normalized = normalizeSeparators(reference)
    .replace(/ን(?=\s|$)/g, '')
    .replace(/[።;፤]+$/g, '')
    .trim();
  const firstReference = parseAmharicVerseReference(normalized);

  if (!firstReference) {
    return null;
  }

  AMHARIC_REFERENCE_REGEX.lastIndex = 0;
  const firstMatch = AMHARIC_REFERENCE_REGEX.exec(normalized);
  if (!firstMatch || firstMatch.index !== 0) {
    return null;
  }

  const remaining = normalized.slice(firstMatch[0].length).trim();

  if (!/^[,፣]/.test(remaining)) {
    return [firstReference];
  }

  const parsedReferences = [firstReference];
  const continuationPattern =
    /^[,፣]\s*([0-9፩-፺]+(?:\s*-\s*[0-9፩-፺]+)?)/;
  let rest = remaining;

  while (rest) {
    const match = rest.match(continuationPattern);
    if (!match) {
      break;
    }

    const parsedContinuation = parseAmharicVerseReference(
      `${firstReference.bookName} ${firstReference.chapter}:${match[1]}`,
    );
    if (!parsedContinuation) {
      break;
    }

    parsedReferences.push(parsedContinuation);
    rest = rest.slice(match[0].length).trim();
  }

  return parsedReferences;
};

const formatParsedReferenceList = references => {
  if (!references?.length) {
    return '';
  }

  const firstReference = references[0];
  const sameChapter = references.every(
    reference =>
      reference.bookId === firstReference.bookId &&
      reference.chapter === firstReference.chapter,
  );

  if (sameChapter) {
    return `${firstReference.bookName} ${
      firstReference.chapter
    }:${references.map(formatParsedVerseRange).join(', ')}`;
  }

  return references
    .map(reference => reference.normalizedReference)
    .join('; ');
};

export const resolveAmharicVerseHtml = reference => {
  const parsedReferences = parseAmharicVerseReferenceList(reference);
  if (parsedReferences?.length > 1) {
    const verseHtml = [];

    parsedReferences.forEach(parsed => {
      const chapter = amharicBible?.[parsed.bookId]?.[String(parsed.chapter)];
      if (!chapter) {
        return;
      }

      for (
        let verseNumber = parsed.startVerse;
        verseNumber <= parsed.endVerse;
        verseNumber += 1
      ) {
        const verseText = chapter[String(verseNumber)];
        if (!verseText) {
          continue;
        }

        verseHtml.push(
          `<p><sup>${verseNumber}</sup> ${escapeHtml(verseText)}</p>`,
        );
      }
    });

    if (verseHtml.length) {
      const key = formatParsedReferenceList(parsedReferences);
      return {
        key,
        html: `<h2>${escapeHtml(key)}</h2>${verseHtml.join('')}`,
      };
    }
  }

  const parsed = parseAmharicVerseReference(reference);
  if (!parsed) {
    return null;
  }

  const chapter = amharicBible?.[parsed.bookId]?.[String(parsed.chapter)];
  if (!chapter) {
    return null;
  }

  const verseHtml = [];
  for (
    let verseNumber = parsed.startVerse;
    verseNumber <= parsed.endVerse;
    verseNumber += 1
  ) {
    const verseText = chapter[String(verseNumber)];
    if (!verseText) {
      continue;
    }

    verseHtml.push(
      `<p><sup>${verseNumber}</sup> ${escapeHtml(verseText)}</p>`,
    );
  }

  if (!verseHtml.length) {
    return null;
  }

  return {
    key: parsed.normalizedReference,
    html: `<h2>${escapeHtml(parsed.normalizedReference)}</h2>${verseHtml.join('')}`,
  };
};

const parseContinuationReference = (value, context) => {
  const text = normalizeSeparators(value);
  const bookName = context?.bookName || context?.book;
  const chapter = context?.chapter;

  if (!text || !bookName || !chapter) {
    return null;
  }

  const chapterVerseMatch = text.match(
    /^([0-9፩-፺]+)\s*:\s*([0-9፩-፺]+(?:\s*-\s*[0-9፩-፺]+)?)$/,
  );
  if (chapterVerseMatch) {
    return parseAmharicVerseReference(
      `${bookName} ${chapterVerseMatch[1]}:${chapterVerseMatch[2]}`,
    );
  }

  const verseMatch = text.match(/^([0-9፩-፺]+(?:\s*-\s*[0-9፩-፺]+)?)$/);
  if (verseMatch) {
    return parseAmharicVerseReference(
      `${bookName} ${chapter}:${verseMatch[1]}`,
    );
  }

  return null;
};

const continuationStartsBookReference = (input, match) => {
  if (!match) {
    return false;
  }

  const matchEnd = (match.index ?? 0) + String(match[0] || '').length;
  const candidate = `${match[2] || ''}${String(input || '').slice(matchEnd)}`;
  return AMHARIC_REFERENCE_AT_START_REGEX.test(candidate);
};

const updateContextFromParsedReference = (context, parsed) => {
  if (!context || !parsed) {
    return;
  }

  context.book = parsed.bookName;
  context.bookName = parsed.bookName;
  context.chapter = String(parsed.chapter);
};

const mergeCommaContinuation = (
  parts,
  separator,
  continuationText,
  parsedContinuation,
) => {
  const previousPart = parts[parts.length - 1];
  if (!previousPart?.verseRef || !/[,፣]/.test(separator)) {
    return false;
  }

  const previousReferences = parseAmharicVerseReferenceList(
    previousPart.verseRef,
  );
  const previousLast = previousReferences?.[previousReferences.length - 1];

  if (
    !previousLast ||
    previousLast.bookId !== parsedContinuation.bookId ||
    previousLast.chapter !== parsedContinuation.chapter
  ) {
    return false;
  }

  const mergedReferences = [...previousReferences, parsedContinuation];
  previousPart.text = `${previousPart.text}${separator}${continuationText}`;
  previousPart.verseRef = formatParsedReferenceList(mergedReferences);
  return true;
};

export const splitAmharicVerseReferenceText = (text, context = {}) => {
  const input = String(text || '');
  if (!input) {
    return [];
  }

  const parts = [];
  let consumed = 0;
  let foundVerseReference = false;

  while (consumed < input.length) {
    if (consumed === 0 && context.expectsContinuation) {
      const leadingContinuation = input.match(LEADING_AMHARIC_CONTINUATION_REGEX);
      const parsedContinuation =
        leadingContinuation &&
        !continuationStartsBookReference(input, leadingContinuation)
          ? parseContinuationReference(leadingContinuation[2], context)
          : null;

      if (parsedContinuation) {
        const leadingWhitespace = leadingContinuation[1] || '';
        if (leadingWhitespace) {
          parts.push({text: leadingWhitespace});
        }
        parts.push({
          text: leadingContinuation[2],
          verseRef: parsedContinuation.normalizedReference,
        });
        updateContextFromParsedReference(context, parsedContinuation);
        context.expectsContinuation = TRAILING_AMHARIC_SEPARATOR_REGEX.test(
          leadingContinuation[2],
        );
        consumed = leadingContinuation[0].length;
        foundVerseReference = true;
        continue;
      }
    }

    context.expectsContinuation = false;
    AMHARIC_REFERENCE_REGEX.lastIndex = consumed;
    AMHARIC_CONTINUATION_REGEX.lastIndex = consumed;

    const referenceMatch = AMHARIC_REFERENCE_REGEX.exec(input);
    const continuationMatch = AMHARIC_CONTINUATION_REGEX.exec(input);
    const usableContinuationMatch =
      continuationMatch &&
      !continuationStartsBookReference(input, continuationMatch)
        ? continuationMatch
        : null;

    let match = referenceMatch;
    let isContinuationMatch = false;
    if (
      usableContinuationMatch &&
      (!match || usableContinuationMatch.index < match.index)
    ) {
      match = usableContinuationMatch;
      isContinuationMatch = true;
    }

    if (!match) {
      const tailText = input.slice(consumed);
      parts.push({text: tailText});
      context.expectsContinuation =
        Boolean(context.bookName || context.book) &&
        Boolean(context.chapter) &&
        TRAILING_AMHARIC_SEPARATOR_REGEX.test(tailText);
      break;
    }

    const matchIndex = match.index ?? 0;
    if (matchIndex > consumed) {
      parts.push({text: input.slice(consumed, matchIndex)});
    }

    if (isContinuationMatch) {
      const separator = match[1] || '';
      const continuationText = match[2] || '';
      const parsedContinuation = parseContinuationReference(
        continuationText,
        context,
      );

      if (parsedContinuation) {
        const merged = mergeCommaContinuation(
          parts,
          separator,
          continuationText,
          parsedContinuation,
        );
        if (!merged) {
          if (separator) {
            parts.push({text: separator});
          }
          parts.push({
            text: continuationText,
            verseRef: parsedContinuation.normalizedReference,
          });
        }
        updateContextFromParsedReference(context, parsedContinuation);
        foundVerseReference = true;
      } else {
        if (separator) {
          parts.push({text: separator});
        }
        parts.push({text: continuationText});
      }
      context.expectsContinuation =
        TRAILING_AMHARIC_SEPARATOR_REGEX.test(continuationText);
    } else {
      const parsedReference = parseAmharicVerseReference(match[0]);
      if (parsedReference) {
        parts.push({
          text: match[0],
          verseRef: parsedReference.normalizedReference,
        });
        updateContextFromParsedReference(context, parsedReference);
        foundVerseReference = true;
      } else {
        parts.push({text: match[0]});
      }
      context.expectsContinuation = TRAILING_AMHARIC_SEPARATOR_REGEX.test(
        match[0],
      );
    }

    consumed = matchIndex + match[0].length;
  }

  return foundVerseReference ? parts.filter(part => part.text) : [];
};

export const findAmharicVerseReferences = text => {
  const input = normalizeSeparators(text);
  const references = [];
  let match;

  AMHARIC_REFERENCE_REGEX.lastIndex = 0;
  while ((match = AMHARIC_REFERENCE_REGEX.exec(input)) !== null) {
    const resolved = parseAmharicVerseReference(match[0]);
    if (resolved) {
      references.push({
        text: match[0],
        verseRef: resolved.normalizedReference,
        index: match.index,
      });
    }
  }

  return references;
};
