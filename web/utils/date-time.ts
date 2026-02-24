/**
 * Converts a given Unix timestamp to a formatted date and time string.
 *
 * @param {number} timestamp - The Unix timestamp to convert (in seconds).
 * @param {string} [locale="en-US"] - The locale string (e.g., 'en-US'). Default is `"en-US"`
 * @param {Intl.DateTimeFormatOptions} [dateOptions] - Formatting options for the date.
 * @param {Intl.DateTimeFormatOptions} [timeOptions] - Formatting options for the time.
 * @returns {{ date: string; time: string }} An object containing the formatted date and time
 *   strings.
 */
export function convertUnixTimestamp(
  timestamp: number,
  locale: string = 'en-US',
  dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  },
  timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  },
): { date: string; time: string } {
  try {
    // Convert Unix timestamp (in seconds) to milliseconds
    const date = new Date(timestamp * 1000);

    const formattedDate = new Intl.DateTimeFormat(locale, dateOptions).format(date);
    const formattedTime = new Intl.DateTimeFormat(locale, timeOptions).format(date);

    return {
      date: formattedDate,
      time: formattedTime,
    };
  } catch (error) {
    console.error('Invalid timestamp provided', error);
    return {
      date: 'Invalid date',
      time: 'Invalid time',
    };
  }
}

/**
 * Formats a date using Intl.DateTimeFormat with flexible options.
 *
 * @param {Date | string | number} date - The date to format (Date, ISO string, or Unix timestamp in
 *   ms).
 * @param {string} [locale="en-US"] - The locale string. Default is `"en-US"`
 * @param {Intl.DateTimeFormatOptions} [options] - Formatting options.
 * @returns {string} The formatted date string.
 */
export function formatDate(
  date: Date | string | number,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
): string {
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch (error) {
    console.error('Invalid date provided', error);
    return 'Invalid date';
  }
}

/**
 * Formats a time using Intl.DateTimeFormat.
 *
 * @param {Date | string | number} date - The date to extract time from.
 * @param {string} [locale="en-US"] - The locale string. Default is `"en-US"`
 * @param {Intl.DateTimeFormatOptions} [options] - Formatting options for time.
 * @returns {string} The formatted time string.
 */
export function formatTime(
  date: Date | string | number,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  },
): string {
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch (error) {
    console.error('Invalid date provided', error);
    return 'Invalid time';
  }
}

/**
 * Formats a date and time together in a single string.
 *
 * @param {Date | string | number} date - The date to format.
 * @param {string} [locale="en-US"] - The locale string. Default is `"en-US"`
 * @param {Intl.DateTimeFormatOptions} [options] - Formatting options.
 * @returns {string} The formatted date-time string.
 */
export function formatDateTime(
  date: Date | string | number,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  },
): string {
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch (error) {
    console.error('Invalid date provided', error);
    return 'Invalid date-time';
  }
}

/**
 * Gets a relative time string (e.g., "2 hours ago", "in 3 days").
 *
 * @param {Date | string | number} date - The date to compare.
 * @param {string} [locale="en-US"] - The locale string. Default is `"en-US"`
 * @param {Date} [baseDate=new Date()] - The base date to compare against (defaults to now). Default
 *   is `new Date()`
 * @returns {string} The relative time string.
 */
export function getRelativeTime(
  date: Date | string | number,
  locale: string = 'en-US',
  baseDate: Date = new Date(),
): string {
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    const diffMs = dateObj.getTime() - baseDate.getTime();
    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);
    const diffWeeks = Math.round(diffDays / 7);
    const diffMonths = Math.round(diffDays / 30);
    const diffYears = Math.round(diffDays / 365);

    if (Math.abs(diffSeconds) < 60) {
      return rtf.format(diffSeconds, 'second');
    } else if (Math.abs(diffMinutes) < 60) {
      return rtf.format(diffMinutes, 'minute');
    } else if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour');
    } else if (Math.abs(diffDays) < 7) {
      return rtf.format(diffDays, 'day');
    } else if (Math.abs(diffWeeks) < 4) {
      return rtf.format(diffWeeks, 'week');
    } else if (Math.abs(diffMonths) < 12) {
      return rtf.format(diffMonths, 'month');
    } else {
      return rtf.format(diffYears, 'year');
    }
  } catch (error) {
    console.error('Invalid date provided', error);
    return 'Invalid date';
  }
}

/**
 * Checks if a date is today.
 *
 * @param {Date | string | number} date - The date to check.
 * @returns {boolean} True if the date is today.
 */
export function isToday(date: Date | string | number): boolean {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Checks if a date is yesterday.
 *
 * @param {Date | string | number} date - The date to check.
 * @returns {boolean} True if the date is yesterday.
 */
export function isYesterday(date: Date | string | number): boolean {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Checks if a date is tomorrow.
 *
 * @param {Date | string | number} date - The date to check.
 * @returns {boolean} True if the date is tomorrow.
 */
export function isTomorrow(date: Date | string | number): boolean {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    dateObj.getDate() === tomorrow.getDate() &&
    dateObj.getMonth() === tomorrow.getMonth() &&
    dateObj.getFullYear() === tomorrow.getFullYear()
  );
}

/**
 * Checks if a date is in the past.
 *
 * @param {Date | string | number} date - The date to check.
 * @returns {boolean} True if the date is in the past.
 */
export function isPast(date: Date | string | number): boolean {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return dateObj.getTime() < Date.now();
}

/**
 * Checks if a date is in the future.
 *
 * @param {Date | string | number} date - The date to check.
 * @returns {boolean} True if the date is in the future.
 */
export function isFuture(date: Date | string | number): boolean {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return dateObj.getTime() > Date.now();
}

/**
 * Checks if two dates are on the same day.
 *
 * @param {Date | string | number} date1 - The first date.
 * @param {Date | string | number} date2 - The second date.
 * @returns {boolean} True if both dates are on the same day.
 */
export function isSameDay(date1: Date | string | number, date2: Date | string | number): boolean {
  const d1 = typeof date1 === 'object' ? date1 : new Date(date1);
  const d2 = typeof date2 === 'object' ? date2 : new Date(date2);
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
}

/**
 * Gets the start of the day (00:00:00.000) for a given date.
 *
 * @param {Date | string | number} date - The date.
 * @returns {Date} A new Date object set to the start of the day.
 */
export function startOfDay(date: Date | string | number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
}

/**
 * Gets the end of the day (23:59:59.999) for a given date.
 *
 * @param {Date | string | number} date - The date.
 * @returns {Date} A new Date object set to the end of the day.
 */
export function endOfDay(date: Date | string | number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
}

/**
 * Gets the start of the week (Sunday 00:00:00.000) for a given date.
 *
 * @param {Date | string | number} date - The date.
 * @param {number} [weekStartsOn=0] - Day of week the week starts on (0=Sunday, 1=Monday, etc.).
 *   Default is `0`
 * @returns {Date} A new Date object set to the start of the week.
 */
export function startOfWeek(date: Date | string | number, weekStartsOn: number = 0): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  const day = dateObj.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  dateObj.setDate(dateObj.getDate() - diff);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
}

/**
 * Gets the end of the week (Saturday 23:59:59.999) for a given date.
 *
 * @param {Date | string | number} date - The date.
 * @param {number} [weekStartsOn=0] - Day of week the week starts on (0=Sunday, 1=Monday, etc.).
 *   Default is `0`
 * @returns {Date} A new Date object set to the end of the week.
 */
export function endOfWeek(date: Date | string | number, weekStartsOn: number = 0): Date {
  const dateObj = startOfWeek(date, weekStartsOn);
  dateObj.setDate(dateObj.getDate() + 6);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
}

/**
 * Gets the start of the month (1st day at 00:00:00.000) for a given date.
 *
 * @param {Date | string | number} date - The date.
 * @returns {Date} A new Date object set to the start of the month.
 */
export function startOfMonth(date: Date | string | number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  dateObj.setDate(1);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
}

/**
 * Gets the end of the month (last day at 23:59:59.999) for a given date.
 *
 * @param {Date | string | number} date - The date.
 * @returns {Date} A new Date object set to the end of the month.
 */
export function endOfMonth(date: Date | string | number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  dateObj.setMonth(dateObj.getMonth() + 1, 0);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
}

/**
 * Gets the start of the year (Jan 1st at 00:00:00.000) for a given date.
 *
 * @param {Date | string | number} date - The date.
 * @returns {Date} A new Date object set to the start of the year.
 */
export function startOfYear(date: Date | string | number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  dateObj.setMonth(0, 1);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
}

/**
 * Gets the end of the year (Dec 31st at 23:59:59.999) for a given date.
 *
 * @param {Date | string | number} date - The date.
 * @returns {Date} A new Date object set to the end of the year.
 */
export function endOfYear(date: Date | string | number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  dateObj.setMonth(11, 31);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
}

/**
 * Adds a specified number of days to a date.
 *
 * @param {Date | string | number} date - The date.
 * @param {number} days - Number of days to add (can be negative).
 * @returns {Date} A new Date object with days added.
 */
export function addDays(date: Date | string | number, days: number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
}

/**
 * Adds a specified number of hours to a date.
 *
 * @param {Date | string | number} date - The date.
 * @param {number} hours - Number of hours to add (can be negative).
 * @returns {Date} A new Date object with hours added.
 */
export function addHours(date: Date | string | number, hours: number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  dateObj.setHours(dateObj.getHours() + hours);
  return dateObj;
}

/**
 * Adds a specified number of minutes to a date.
 *
 * @param {Date | string | number} date - The date.
 * @param {number} minutes - Number of minutes to add (can be negative).
 * @returns {Date} A new Date object with minutes added.
 */
export function addMinutes(date: Date | string | number, minutes: number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  dateObj.setMinutes(dateObj.getMinutes() + minutes);
  return dateObj;
}

/**
 * Adds a specified number of months to a date.
 *
 * @param {Date | string | number} date - The date.
 * @param {number} months - Number of months to add (can be negative).
 * @returns {Date} A new Date object with months added.
 */
export function addMonths(date: Date | string | number, months: number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  dateObj.setMonth(dateObj.getMonth() + months);
  return dateObj;
}

/**
 * Adds a specified number of years to a date.
 *
 * @param {Date | string | number} date - The date.
 * @param {number} years - Number of years to add (can be negative).
 * @returns {Date} A new Date object with years added.
 */
export function addYears(date: Date | string | number, years: number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  dateObj.setFullYear(dateObj.getFullYear() + years);
  return dateObj;
}

/**
 * Calculates the difference between two dates in milliseconds.
 *
 * @param {Date | string | number} date1 - The first date.
 * @param {Date | string | number} date2 - The second date.
 * @returns {number} The difference in milliseconds (date1 - date2).
 */
export function differenceInMs(
  date1: Date | string | number,
  date2: Date | string | number,
): number {
  const d1 = typeof date1 === 'object' ? date1 : new Date(date1);
  const d2 = typeof date2 === 'object' ? date2 : new Date(date2);
  return d1.getTime() - d2.getTime();
}

/**
 * Calculates the difference between two dates in seconds.
 *
 * @param {Date | string | number} date1 - The first date.
 * @param {Date | string | number} date2 - The second date.
 * @returns {number} The difference in seconds (date1 - date2).
 */
export function differenceInSeconds(
  date1: Date | string | number,
  date2: Date | string | number,
): number {
  return Math.floor(differenceInMs(date1, date2) / 1000);
}

/**
 * Calculates the difference between two dates in minutes.
 *
 * @param {Date | string | number} date1 - The first date.
 * @param {Date | string | number} date2 - The second date.
 * @returns {number} The difference in minutes (date1 - date2).
 */
export function differenceInMinutes(
  date1: Date | string | number,
  date2: Date | string | number,
): number {
  return Math.floor(differenceInMs(date1, date2) / 60000);
}

/**
 * Calculates the difference between two dates in hours.
 *
 * @param {Date | string | number} date1 - The first date.
 * @param {Date | string | number} date2 - The second date.
 * @returns {number} The difference in hours (date1 - date2).
 */
export function differenceInHours(
  date1: Date | string | number,
  date2: Date | string | number,
): number {
  return Math.floor(differenceInMs(date1, date2) / 3600000);
}

/**
 * Calculates the difference between two dates in days.
 *
 * @param {Date | string | number} date1 - The first date.
 * @param {Date | string | number} date2 - The second date.
 * @returns {number} The difference in days (date1 - date2).
 */
export function differenceInDays(
  date1: Date | string | number,
  date2: Date | string | number,
): number {
  return Math.floor(differenceInMs(date1, date2) / 86400000);
}

/**
 * Checks if a year is a leap year.
 *
 * @param {number} year - The year to check.
 * @returns {boolean} True if the year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Gets the number of days in a specific month of a year.
 *
 * @param {number} year - The year.
 * @param {number} month - The month (0-11, where 0 is January).
 * @returns {number} The number of days in the month.
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Checks if a date is valid.
 *
 * @param {Date | string | number} date - The date to validate.
 * @returns {boolean} True if the date is valid.
 */
export function isValidDate(date: Date | string | number): boolean {
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    return !isNaN(dateObj.getTime());
  } catch {
    return false;
  }
}

/**
 * Parses an ISO 8601 date string and returns a Date object.
 *
 * @param {string} isoString - The ISO string to parse.
 * @returns {Date | null} The parsed Date object, or null if invalid.
 */
export function parseISO(isoString: string): Date | null {
  try {
    const date = new Date(isoString);
    return isValidDate(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Formats a date to ISO 8601 string format.
 *
 * @param {Date | string | number} date - The date to format.
 * @returns {string} The ISO 8601 string representation.
 */
export function toISO(date: Date | string | number): string {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return dateObj.toISOString();
}

/**
 * Gets the current Unix timestamp in seconds.
 *
 * @returns {number} The current Unix timestamp in seconds.
 */
export function getUnixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Converts a Date to a Unix timestamp in seconds.
 *
 * @param {Date | string | number} date - The date to convert.
 * @returns {number} The Unix timestamp in seconds.
 */
export function toUnixTimestamp(date: Date | string | number): number {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return Math.floor(dateObj.getTime() / 1000);
}

/**
 * Converts a Unix timestamp (in seconds) to a Date object.
 *
 * @param {number} timestamp - The Unix timestamp in seconds.
 * @returns {Date} The Date object.
 */
export function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}
