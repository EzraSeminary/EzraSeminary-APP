// Simple test for text formatting functions
import {stripHtmlTags, formatDevotionalForSharing} from './textFormatter';

// Test data
const testDevotional = {
  month: 'መስከረም',
  day: '15',
  title: 'የእግዚአብሔርን ፀጋ መረዳት',
  chapter: 'ሮማ 3:21-24',
  verse: 'ሁሉም ኃጠዓተኞች ናቸው፣ ከእግዚአብሔርም ክብር ያንሱ ናቸው።',
  body: [
    '<p>እግዚአብሔር <strong>ፀጋ</strong> ይሰጣል። <em>ቸርነቱ</em> ታላቅ ነው።</p><br/><p>ይህ አስደናቂ ነው።</p>',
  ],
  prayer: 'አባት ሆይ፣ የአንተን ፀጋ እንድንረዳ ረዳን።',
};

// Test HTML stripping
console.log('Testing HTML stripping:');
const htmlText =
  '<p>እግዚአብሔር <strong>ፀጋ</strong> ይሰጣል። <em>ቸርነቱ</em> ታላቅ ነው።</p>';
const strippedText = stripHtmlTags(htmlText);
console.log('Original:', htmlText);
console.log('Stripped:', strippedText);

// Test full devotional formatting
console.log('\nTesting devotional formatting:');
const formattedText = formatDevotionalForSharing(testDevotional);
console.log('Formatted devotional:');
console.log(formattedText);

// Test with empty or null values
console.log('\nTesting with empty values:');
const emptyDevotional = {month: '', day: '', title: '', body: ['']};
const emptyFormatted = formatDevotionalForSharing(emptyDevotional);
console.log('Empty devotional formatted:', emptyFormatted);

export default {stripHtmlTags, formatDevotionalForSharing};
