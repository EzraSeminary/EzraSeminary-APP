export const escapeSearchTerm = value =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const splitHighlightedText = (text, query) => {
  const words = String(query || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeSearchTerm);
  if (!words.length) return [{text: String(text || ''), match: false}];
  const regex = new RegExp(`(${words.join('|')})`, 'gi');
  const exactMatch = new RegExp(`^(?:${words.join('|')})$`, 'i');
  return String(text || '')
    .split(regex)
    .filter(Boolean)
    .map(part => ({text: part, match: exactMatch.test(part)}));
};
