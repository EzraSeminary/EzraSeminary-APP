import {EthDateTime} from 'ethiopian-calendar-date-converter';
import {ETHIOPIAN_MONTHS, normalizeEthiopianMonth} from './ethiopianCalendar';

export const toEthDateParts = date => {
  const eth = EthDateTime.fromEuropeanDate(date);
  return {
    year: eth.year,
    month: eth.month,
    day: eth.date,
    monthName: normalizeEthiopianMonth(ETHIOPIAN_MONTHS[eth.month]),
  };
};

export const isSeriesDevotion = devotion =>
  Boolean(
    devotion?.isSeries ||
      devotion?.seriesId ||
      devotion?.series ||
      devotion?.seriesTitle ||
      devotion?.seriesName ||
      devotion?.entryType === 'series' ||
      devotion?.type === 'series',
  );

export const getSeriesLabel = devotion =>
  devotion?.seriesTitle ||
  devotion?.seriesName ||
  devotion?.series?.title ||
  devotion?.series?.name ||
  devotion?.seriesId ||
  'Series';

const parseDateValue = value => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeDate = date => {
  if (!date) {
    return null;
  }
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

export const getDevotionOrderValue = devotion => {
  const numberValue =
    devotion?.seriesDay ??
    devotion?.seriesOrder ??
    devotion?.dayOfYear ??
    devotion?.order ??
    devotion?.sequence ??
    devotion?.day;

  const parsed = Number(numberValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const getDevotionSortDate = devotion => {
  const explicit =
    parseDateValue(devotion?.previewDate) ||
    parseDateValue(devotion?.publishDate) ||
    parseDateValue(devotion?.publishedAt) ||
    parseDateValue(devotion?.scheduledDate) ||
    parseDateValue(devotion?.scheduledFor) ||
    parseDateValue(devotion?.availableDate) ||
    parseDateValue(devotion?.devotionDate) ||
    parseDateValue(devotion?.date) ||
    parseDateValue(devotion?.seriesDate);

  if (explicit) {
    return normalizeDate(explicit);
  }

  const seriesStartDate =
    parseDateValue(devotion?.seriesStartDate) ||
    parseDateValue(devotion?.series?.startDate) ||
    parseDateValue(devotion?.startDate);
  const order = getDevotionOrderValue(devotion);

  if (seriesStartDate && order && order > 0) {
    return normalizeDate(addDays(seriesStartDate, order - 1));
  }

  return null;
};

export const selectSeriesDevotionForDate = (devotions, selectedDate) => {
  const ethDate = toEthDateParts(selectedDate);
  const yearDevotions = (devotions || []).filter(
    devotion => Number(devotion?.year) === Number(ethDate.year),
  );
  const seriesDevotions = yearDevotions.filter(isSeriesDevotion);

  if (seriesDevotions.length === 0) {
    return null;
  }

  const selectedAt = new Date(selectedDate);
  selectedAt.setHours(0, 0, 0, 0);

  const dated = seriesDevotions
    .map(devotion => ({devotion, sortDate: getDevotionSortDate(devotion)}))
    .filter(item => item.sortDate)
    .sort((a, b) => a.sortDate - b.sortDate);

  const uniqueSortDates = new Set(
    dated.map(item => item.sortDate.getTime()),
  );
  const hasOrderedEntries = seriesDevotions.some(
    devotion => getDevotionOrderValue(devotion) !== null,
  );

  if (dated.length > 0 && (uniqueSortDates.size > 1 || !hasOrderedEntries)) {
    const exact = dated.find(
      item => item.sortDate.getTime() === selectedAt.getTime(),
    );
    if (exact) {
      return exact.devotion;
    }

    const previous = [...dated]
      .reverse()
      .find(item => item.sortDate.getTime() <= selectedAt.getTime());
    return previous?.devotion || dated[0].devotion;
  }

  const ordered = [...seriesDevotions].sort((a, b) => {
    const aOrder = getDevotionOrderValue(a) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = getDevotionOrderValue(b) ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
  const targetOrder = Math.max(1, ethDate.day);
  return (
    [...ordered]
      .reverse()
      .find(
        devotion => (getDevotionOrderValue(devotion) ?? 0) <= targetOrder,
      ) || ordered[0]
  );
};

export const selectCalendarDevotionForDate = (devotions, selectedDate) => {
  const ethDate = toEthDateParts(selectedDate);
  return (devotions || []).find(devotion => {
    const hasYear = devotion?.year !== undefined && devotion?.year !== null;
    return (
      !isSeriesDevotion(devotion) &&
      normalizeEthiopianMonth(devotion?.month) === ethDate.monthName &&
      Number(devotion?.day) === Number(ethDate.day) &&
      (!hasYear || Number(devotion?.year) === Number(ethDate.year))
    );
  });
};

export const selectDevotionForPreviewDate = (devotions, selectedDate) =>
  selectSeriesDevotionForDate(devotions, selectedDate) ||
  selectCalendarDevotionForDate(devotions, selectedDate) ||
  null;
