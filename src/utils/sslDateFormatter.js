import {format} from 'date-fns';

export const parseSslDate = dateString => {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const [day, month, year] = dateString.split('/').map(Number);
  if (!day || !month || !year) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatQuarterFromId = quarterId => {
  const match = String(quarterId || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, quarterToken] = match;
  const quarterNumber = Number(quarterToken);
  if (!quarterNumber || quarterNumber < 1 || quarterNumber > 4) {
    return null;
  }

  return `Q${quarterNumber} ${year}`;
};

export const formatSslListDate = (item, language = 'am') => {
  if (language !== 'en') {
    return item?.human_date || '';
  }

  const start = parseSslDate(item?.start_date);
  const end = parseSslDate(item?.end_date);

  if (start && end) {
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  }

  if (start) {
    return format(start, 'MMM d, yyyy');
  }

  const fallbackFromId = formatQuarterFromId(item?.id);
  if (fallbackFromId) {
    return fallbackFromId;
  }

  return item?.human_date || '';
};

export const formatSslDateRange = (startDate, endDate) => {
  const start = parseSslDate(startDate);
  const end = parseSslDate(endDate);

  if (!start || !end) {
    return '';
  }

  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
};
