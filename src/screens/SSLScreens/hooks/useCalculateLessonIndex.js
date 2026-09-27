import {useMemo} from 'react';
import {useGetSSLsQuery} from '../../../services/SabbathSchoolApi';
import {parseSslDate} from '../../../utils/sslDateFormatter';

const parseCurrentDate = currentDate => {
  if (typeof currentDate === 'string') {
    const isoMatch = currentDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch.map(Number);
      return new Date(year, month - 1, day);
    }
  }

  const parsed = new Date(currentDate);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getCalendarQuarterFallback = date => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  if (month >= 1 && month <= 3) {
    return `${year}-01`;
  }
  if (month >= 4 && month <= 6) {
    return `${year}-02`;
  }
  if (month >= 7 && month <= 9) {
    return `${year}-03`;
  }
  return `${year}-04`;
};

const normalizeQuarter = item => {
  const startDate = parseSslDate(item?.start_date);
  const endDate = parseSslDate(item?.end_date);

  if (!item?.id || !startDate) {
    return null;
  }

  return {
    id: item.id,
    startDate,
    endDate,
  };
};

const findQuarterForDate = (quarters, date) => {
  const validQuarters = (quarters || [])
    .map(normalizeQuarter)
    .filter(Boolean)
    .sort((a, b) => a.startDate - b.startDate);

  const activeQuarter = validQuarters.find(item => {
    if (!item.endDate) {
      return item.startDate <= date;
    }

    return item.startDate <= date && date <= item.endDate;
  });

  if (activeQuarter) {
    return activeQuarter;
  }

  const latestStartedQuarter = [...validQuarters]
    .reverse()
    .find(item => item.startDate <= date);

  return latestStartedQuarter || validQuarters[0] || null;
};

function useCalculateLessonIndex(currentDate) {
  const {data: quarters, isLoading} = useGetSSLsQuery();
  const currentDateObj = parseCurrentDate(currentDate);
  const year = currentDateObj.getFullYear();

  return useMemo(() => {
    if (isLoading || !quarters?.length) {
      return [null, null, year];
    }

    const quarterData = findQuarterForDate(quarters, currentDateObj);
    if (!quarterData) {
      return [getCalendarQuarterFallback(currentDateObj), '01', year];
    }

    const effectiveDate =
      quarterData.endDate && currentDateObj > quarterData.endDate
        ? quarterData.endDate
        : currentDateObj;
    const diffDays = Math.floor(
      (effectiveDate - quarterData.startDate) / (1000 * 60 * 60 * 24),
    );
    const week = Math.max(Math.floor(diffDays / 7) + 1, 1);

    return [quarterData.id, week.toString().padStart(2, '0'), year];
  }, [currentDateObj, isLoading, quarters, year]);
}

export default useCalculateLessonIndex;
