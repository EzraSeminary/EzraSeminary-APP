// Utility functions for text formatting and HTML cleanup

/**
 * Removes HTML tags and entities from text
 * @param {string} html - The HTML string to clean
 * @returns {string} - Clean text without HTML tags
 */
export const stripHtmlTags = html => {
  if (!html || typeof html !== 'string') return '';

  return (
    html
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Convert common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'")
      // Remove extra whitespace and line breaks
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim()
  );
};

/**
 * Formats devotional data for sharing
 * @param {Object} devotional - The devotional object
 * @returns {string} - Formatted text ready for sharing
 */
export const formatDevotionalForSharing = devotional => {
  if (!devotional) return '';

  const date = `${devotional.month} ${devotional.day}`;
  const title = devotional.title || '';
  const chapter = devotional.chapter || '';
  const verse = devotional.verse || '';
  const body = stripHtmlTags(devotional.body?.[0] || '');
  const prayer = devotional.prayer || '';

  let formattedText = '';

  // Add date
  if (date.trim() !== ' ') {
    formattedText += `📅 ${date}\n\n`;
  }

  // Add title
  if (title) {
    formattedText += `${title}\n`;
    formattedText += '━'.repeat(title.length) + '\n\n';
  }

  // Add scripture reference
  if (chapter) {
    formattedText += `📖 የዕለቱ የመጽሐፍ ቅዱስ ንባብ ክፍል: ${chapter}\n\n`;
  }

  // Add verse
  if (verse) {
    formattedText += `"${verse}"\n\n`;
  }

  // Add body content
  if (body) {
    formattedText += `${body}\n\n`;
  }

  // Add prayer
  if (prayer) {
    formattedText += `🙏 ጸሎት:\n${prayer}\n\n`;
  }

  // Add footer
  formattedText += '────────────────\n';
  formattedText += '📱 EzraApp - Daily Devotional';

  return formattedText;
};
