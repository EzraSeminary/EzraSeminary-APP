export const ETHIOPIAN_MONTHS = [
  '',
  'መስከረም',
  'ጥቅምት',
  'ህዳር',
  'ታህሳስ',
  'ጥር',
  'የካቲት',
  'መጋቢት',
  'ሚያዚያ',
  'ግንቦት',
  'ሰኔ',
  'ሐምሌ',
  'ነሐሴ',
  'ጳጉሜ',
];

const ETHIOPIAN_MONTH_ALIASES = {
  'ሚያዝያ': 'ሚያዚያ',
  'ሀምሌ': 'ሐምሌ',
};

export const normalizeEthiopianMonth = month => {
  const value = String(month || '').trim();
  return ETHIOPIAN_MONTH_ALIASES[value] || value;
};

