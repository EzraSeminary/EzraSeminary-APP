// Utility functions to help with quarterly data management

/**
 * Calculate the expected quarterly ID for a given date
 * @param {Date|string} date - The date to calculate quarterly ID for
 * @param {string} type - Either 'ssl' or 'inverse' for different quarterly types
 * @returns {string} The quarterly ID (e.g., '2024-01' or '2024-01-cq')
 */
export const calculateQuarterlyId = (date, type = 'ssl') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  let quarter;
  if (month >= 1 && month <= 3) {
    quarter = `${year}-01`;
  } else if (month >= 4 && month <= 6) {
    quarter = `${year}-02`;
  } else if (month >= 7 && month <= 9) {
    quarter = `${year}-03`;
  } else {
    quarter = `${year}-04`;
  }

  // InVerse quarterlies end with '-cq'
  if (type === 'inverse') {
    quarter += '-cq';
  }

  return quarter;
};

/**
 * Check if we're in a new quarter that might not have data yet
 * @param {Date|string} date - The current date
 * @returns {boolean} True if we're in the first few weeks of a new quarter
 */
export const isEarlyInQuarter = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();

  // Check if we're in the first month of a quarter and within the first 2 weeks
  const isFirstMonthOfQuarter =
    month === 1 || month === 4 || month === 7 || month === 10;
  const isEarlyInMonth = day <= 14;

  return isFirstMonthOfQuarter && isEarlyInMonth;
};

/**
 * Get a more descriptive error message based on the error type and timing
 * @param {Object} error - The error object from RTK Query
 * @param {string} type - Either 'ssl' or 'inverse'
 * @returns {Object} Object with title and message
 */
export const getQuarterlyErrorMessage = (error, type = 'ssl') => {
  const isEarly = isEarlyInQuarter();
  const typeName = type === 'ssl' ? 'Sabbath School' : 'InVerse';

  if (error?.status === 404) {
    if (isEarly) {
      return {
        title: 'Quarterly Update Pending',
        message: `New ${typeName} lessons are being prepared for this quarter. Please check back soon or browse previous quarterly lessons.`,
      };
    } else {
      return {
        title: 'Lesson Not Found',
        message: `The requested ${typeName} lesson could not be found. Please try refreshing or contact support.`,
      };
    }
  }

  if (error?.status >= 500) {
    return {
      title: 'Server Error',
      message: `There's a temporary issue with the ${typeName} service. Please try again later.`,
    };
  }

  if (error?.name === 'NetworkError' || error?.status === 0) {
    return {
      title: 'Connection Error',
      message: 'Please check your internet connection and try again.',
    };
  }

  return {
    title: 'Quarterly Update Pending',
    message: `New ${typeName} lessons may be loading. Please try refreshing.`,
  };
};

/**
 * Determine if an error is likely due to missing quarterly data vs other issues
 * @param {Object} error - The error object from RTK Query
 * @returns {boolean} True if this appears to be a missing quarterly data issue
 */
export const isMissingQuarterlyError = error => {
  return (
    error?.status === 404 || (error?.data && error.data.includes('not found'))
  );
};

