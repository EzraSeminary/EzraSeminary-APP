import {stripHtmlTags, formatDevotionalForSharing} from './textFormatter';

describe('textFormatter', () => {
  it('strips HTML tags', () => {
    const htmlText =
      '<p>እግዚአብሔር <strong>ፀጋ</strong> ይሰጣል። <em>ቸርነቱ</em> ታላቅ ነው።</p>';
    const strippedText = stripHtmlTags(htmlText);
    expect(strippedText).not.toContain('<');
    expect(typeof strippedText).toBe('string');
  });

  it('formats devotional for sharing', () => {
    const testDevotional = {
      month: 'መስከረም',
      day: '15',
      title: 'የእግዚአብሔርን ፀጋ መረዳት',
      chapter: 'ሮማ 3:21-24',
      verse: 'ሁሉም ኃጠዓተኞች ናቸው፣ ከእግዚአብሔርም ክብር ያንሱ ናቸው።',
      body: ['<p>some <strong>html</strong></p>'],
      prayer: 'አባት ሆይ፣ የአንተን ፀጋ እንድንረዳ ረዳን።',
    };
    const formatted = formatDevotionalForSharing(testDevotional);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });
});
