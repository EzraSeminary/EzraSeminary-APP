// Utility functions for text formatting and HTML cleanup
import {Platform} from 'react-native';

/**
 * Removes HTML tags and entities from text while preserving structure
 * @param {string} html - The HTML string to clean
 * @returns {string} - Clean text without HTML tags but with proper formatting
 */
export const stripHtmlTags = html => {
  if (!html || typeof html !== 'string') return '';

  let text = html;

  // Handle ordered lists - convert to numbered format
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    let listItems = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    let numberedList = listItems
      .map((item, index) => {
        let cleanItem = item.replace(/<\/?li[^>]*>/gi, '').trim();
        cleanItem = cleanItem.replace(/<[^>]*>/g, ''); // Remove any other HTML tags
        cleanItem = cleanItem
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&apos;/g, "'");

        // Clean up extra whitespace
        cleanItem = cleanItem.replace(/\s+/g, ' ').trim();

        if (cleanItem) {
          return `${index + 1}. ${cleanItem}`;
        }
        return '';
      })
      .filter(item => item.length > 0);

    return '\n\n' + numberedList.join('\n\n') + '\n\n';
  });

  // Handle unordered lists - convert to bullet format
  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    let listItems = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    let bulletList = listItems
      .map(item => {
        let cleanItem = item.replace(/<\/?li[^>]*>/gi, '').trim();
        cleanItem = cleanItem.replace(/<[^>]*>/g, ''); // Remove any other HTML tags
        cleanItem = cleanItem
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&apos;/g, "'");

        // Clean up extra whitespace
        cleanItem = cleanItem.replace(/\s+/g, ' ').trim();

        if (cleanItem) {
          return `• ${cleanItem}`;
        }
        return '';
      })
      .filter(item => item.length > 0);

    return '\n\n' + bulletList.join('\n\n') + '\n\n';
  });

  // Handle headings - convert to underlined format
  text = text.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi,
    (match, level, content) => {
      let cleanContent = content.replace(/<[^>]*>/g, '').trim();
      cleanContent = cleanContent
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'");
      cleanContent = cleanContent.replace(/\s+/g, ' ').trim();

      if (cleanContent) {
        // Create underline based on heading level
        const underlineChar = level <= 2 ? '═' : '─';
        const underline = underlineChar.repeat(cleanContent.length);
        return `\n\n${cleanContent}\n${underline}\n`;
      }
      return '';
    },
  );

  // Handle paragraphs - add proper spacing
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (match, content) => {
    let cleanContent = content.replace(/<[^>]*>/g, '').trim();
    cleanContent = cleanContent
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'");
    cleanContent = cleanContent.replace(/\s+/g, ' ').trim();

    if (cleanContent) {
      return `\n\n${cleanContent}`;
    }
    return '';
  });

  // Handle line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Handle strong/bold tags - convert to emphasis
  text = text.replace(
    /<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi,
    (match, tag, content) => {
      let cleanContent = content.replace(/<[^>]*>/g, '').trim();
      if (cleanContent) {
        return `**${cleanContent}**`;
      }
      return cleanContent;
    },
  );

  // Handle emphasis/italic tags
  text = text.replace(
    /<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi,
    (match, tag, content) => {
      let cleanContent = content.replace(/<[^>]*>/g, '').trim();
      if (cleanContent) {
        return `*${cleanContent}*`;
      }
      return cleanContent;
    },
  );

  // Remove any remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Convert remaining HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");

  // Clean up whitespace while preserving intentional line breaks
  text = text.replace(/[ \t]+/g, ' '); // Replace multiple spaces/tabs with single space
  text = text.replace(/\n[ \t]+/g, '\n'); // Remove spaces at beginning of lines
  text = text.replace(/[ \t]+\n/g, '\n'); // Remove spaces at end of lines

  // Clean up multiple consecutive newlines (max 3 for better spacing)
  text = text.replace(/\n{4,}/g, '\n\n\n');

  // Trim and ensure we don't start/end with too many newlines
  text = text.trim();

  return text;
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
  formattedText += '📱 Ezra Seminary - Daily Devotional\n';

  // Add platform-specific app store link
  if (Platform.OS === 'ios') {
    // Add App Store link for iOS
    formattedText +=
      '🍎 Download on App Store: [https://apps.apple.com/us/app/ezra-seminary/id6740612880]';
  } else if (Platform.OS === 'android') {
    // Add Google Play Store link for Android
    formattedText +=
      '🤖 Get it on Google Play: [https://play.google.com/store/apps/details?id=com.ezraapp]';
  }

  return formattedText;
};
