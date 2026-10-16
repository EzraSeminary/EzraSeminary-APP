const fs = require('fs');
const path = require('path');

const input = path.resolve(__dirname, '../assets/bible/cross_references.txt');
// Input data credited in its header to OpenBible.info, CC-BY.
const output = path.resolve(
  __dirname,
  '../src/features/bible/data/crossReferences.json',
);
const bible = require('../src/features/bible/data/nasv.json');
const normalize = value => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const resolveOrder = abbreviation => {
  const aliases = {'1Kgs': '1 Kings', '2Kgs': '2 Kings', Jas: 'James', Phlm: 'Philemon'};
  if (aliases[abbreviation]) {
    return bible.books.find(book => book.name === aliases[abbreviation])?.order;
  }
  const token = normalize(abbreviation);
  const candidates = bible.books.filter(book =>
    normalize(book.name).startsWith(token),
  );
  candidates.sort((a, b) => normalize(b.name).length - normalize(a.name).length);
  return candidates[0]?.order;
};

const parseReference = value => {
  const [bookCode, chapter, verse] = String(value).split('.');
  const order = resolveOrder(bookCode);
  const chapterNumber = Number(chapter);
  const verseNumber = Number(verse);
  if (!order || !chapterNumber || !verseNumber) return null;
  return order * 1000000 + chapterNumber * 1000 + verseNumber;
};

const rows = fs.readFileSync(input, 'utf8').split(/\r?\n/);
const result = {};
let skipped = 0;
for (let index = 1; index < rows.length; index += 1) {
  const [from, to, rawVotes] = rows[index].split('\t');
  if (!from || !to) continue;
  const [start, end] = to.split('-');
  const packedSource = parseReference(from);
  const source = packedSource
    ? `${Math.floor(packedSource / 1000000)}.${Math.floor((packedSource % 1000000) / 1000)}.${packedSource % 1000}`
    : null;
  const targetStart = parseReference(start);
  const targetEnd = end ? parseReference(end) : '';
  if (!source || !targetStart || (end && !targetEnd)) {
    skipped += 1;
    continue;
  }
  (result[source] ||= []).push([
    targetStart,
    targetEnd,
    Number(rawVotes) || 0,
  ]);
}

Object.values(result).forEach(items =>
  items.sort((a, b) => b[2] - a[2]),
);
Object.keys(result).forEach(key => {
  result[key] = result[key].map(([start, end]) => [start, end]);
});
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, JSON.stringify(result));
console.log(
  `Created ${Object.keys(result).length} source entries; skipped ${skipped}; ${(fs.statSync(output).size / 1024 / 1024).toFixed(2)} MiB`,
);
