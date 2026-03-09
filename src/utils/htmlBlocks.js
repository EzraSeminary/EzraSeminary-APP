const decodeHtmlEntities = text =>
  (text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

export const stripHtmlTags = html =>
  decodeHtmlEntities(
    (html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim(),
  );

const BLOCK_REGEX =
  /<(h[1-6]|p|blockquote|pre|code|ul|ol|li|div|table)[^>]*>[\s\S]*?<\/\1>/gi;

const normalizeHtmlInput = input => {
  if (Array.isArray(input)) {
    return input.filter(Boolean).join('\n');
  }

  return input || '';
};

const wrapPlainText = text => {
  const normalized = (text || '').trim();

  if (!normalized) {
    return '';
  }

  if (/<[a-z][\s\S]*>/i.test(normalized)) {
    return normalized;
  }

  return `<p>${normalized
    .replace(/\r\n/g, '<br/>')
    .replace(/\n/g, '<br/>')
    .replace(/\r/g, '<br/>')}</p>`;
};

const hashString = value => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
};

export const extractHtmlBlocks = input => {
  const normalized = normalizeHtmlInput(input);
  const html = wrapPlainText(normalized);

  if (!html) {
    return [];
  }

  const matches = [...html.matchAll(BLOCK_REGEX)];
  const blocks = matches.length > 0 ? matches.map(match => match[0]) : [html];

  return blocks
    .map((blockHtml, index) => {
      const text = stripHtmlTags(blockHtml);

      if (!text) {
        return null;
      }

      return {
        id: `block-${index}-${hashString(text)}`,
        html: blockHtml,
        text,
      };
    })
    .filter(Boolean);
};
