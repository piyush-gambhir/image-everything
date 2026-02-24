/** Day of week constants. */
export const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

/** Month constants. */
export const MONTHS = {
  JANUARY: 0,
  FEBRUARY: 1,
  MARCH: 2,
  APRIL: 3,
  MAY: 4,
  JUNE: 5,
  JULY: 6,
  AUGUST: 7,
  SEPTEMBER: 8,
  OCTOBER: 9,
  NOVEMBER: 10,
  DECEMBER: 11,
} as const;

/**
 * Gets the day of the week for a given date.
 *
 * @param {Date | string | number} date - The date to check.
 * @returns {number} The day of week (0=Sunday, 1=Monday, etc.).
 */
export function getDayOfWeek(date: Date | string | number): number {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return dateObj.getDay();
}

/**
 * Gets the day name for a given date.
 *
 * @param {Date | string | number} date - The date to check.
 * @param {string} [locale="en-US"] - The locale string. Default is `"en-US"`
 * @param {'long' | 'short' | 'narrow'} [format="long"] - The format style. Default is `"long"`
 * @returns {string} The day name (e.g., "Monday", "Mon", "M").
 */
export function getDayName(
  date: Date | string | number,
  locale: string = 'en-US',
  format: 'long' | 'short' | 'narrow' = 'long',
): string {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, { weekday: format }).format(dateObj);
}

/**
 * Gets the month name for a given date.
 *
 * @param {Date | string | number} date - The date to check.
 * @param {string} [locale="en-US"] - The locale string. Default is `"en-US"`
 * @param {'long' | 'short' | 'narrow'} [format="long"] - The format style. Default is `"long"`
 * @returns {string} The month name (e.g., "January", "Jan", "J").
 */
export function getMonthName(
  date: Date | string | number,
  locale: string = 'en-US',
  format: 'long' | 'short' | 'narrow' = 'long',
): string {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, { month: format }).format(dateObj);
}

/**
 * Gets the week number of the year for a given date (ISO 8601).
 *
 * @param {Date | string | number} date - The date to check.
 * @returns {number} The week number (1-53).
 */
export function getWeekNumber(date: Date | string | number): number {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  const firstDayOfYear = new Date(dateObj.getFullYear(), 0, 1);
  const pastDaysOfYear = (dateObj.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Gets the quarter of the year for a given date.
 *
 * @param {Date | string | number} date - The date to check.
 * @returns {1 | 2 | 3 | 4} The quarter number.
 */
export function getQuarter(date: Date | string | number): 1 | 2 | 3 | 4 {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return (Math.floor(dateObj.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

/**
 * Gets the start date of a quarter for a given date.
 *
 * @param {Date | string | number} date - The date to check.
 * @returns {Date} The start date of the quarter.
 */
export function startOfQuarter(date: Date | string | number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  const quarter = getQuarter(dateObj);
  const month = (quarter - 1) * 3;
  dateObj.setMonth(month, 1);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
}

/**
 * Gets the end date of a quarter for a given date.
 *
 * @param {Date | string | number} date - The date to check.
 * @returns {Date} The end date of the quarter.
 */
export function endOfQuarter(date: Date | string | number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  const quarter = getQuarter(dateObj);
  const month = quarter * 3 - 1;
  dateObj.setMonth(month + 1, 0);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
}

/**
 * Checks if a date is a weekend (Saturday or Sunday).
 *
 * @param {Date | string | number} date - The date to check.
 * @returns {boolean} True if the date is a weekend.
 */
export function isWeekend(date: Date | string | number): boolean {
  const day = getDayOfWeek(date);
  return day === DAYS_OF_WEEK.SATURDAY || day === DAYS_OF_WEEK.SUNDAY;
}

/**
 * Checks if a date is a weekday (Monday-Friday).
 *
 * @param {Date | string | number} date - The date to check.
 * @returns {boolean} True if the date is a weekday.
 */
export function isWeekday(date: Date | string | number): boolean {
  return !isWeekend(date);
}

/**
 * Gets the next occurrence of a specific day of the week.
 *
 * @param {number} dayOfWeek - The target day (0=Sunday, 1=Monday, etc.).
 * @param {Date | string | number} [fromDate=new Date()] - The starting date. Default is `new
 *   Date()`. Default is `new Date()`
 * @returns {Date} The next occurrence of the specified day.
 */
export function getNextDayOfWeek(
  dayOfWeek: number,
  fromDate: Date | string | number = new Date(),
): Date {
  const date = typeof fromDate === 'object' ? new Date(fromDate) : new Date(fromDate);
  const currentDay = date.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilTarget);
  return date;
}

/**
 * Gets the previous occurrence of a specific day of the week.
 *
 * @param {number} dayOfWeek - The target day (0=Sunday, 1=Monday, etc.).
 * @param {Date | string | number} [fromDate=new Date()] - The starting date. Default is `new
 *   Date()`. Default is `new Date()`
 * @returns {Date} The previous occurrence of the specified day.
 */
export function getPreviousDayOfWeek(
  dayOfWeek: number,
  fromDate: Date | string | number = new Date(),
): Date {
  const date = typeof fromDate === 'object' ? new Date(fromDate) : new Date(fromDate);
  const currentDay = date.getDay();
  const daysSinceLast = (currentDay - dayOfWeek + 7) % 7 || 7;
  date.setDate(date.getDate() - daysSinceLast);
  return date;
}

/**
 * Gets all dates in a given month.
 *
 * @param {number} year - The year.
 * @param {number} month - The month (0-11).
 * @returns {Date[]} Array of all dates in the month.
 */
export function getDatesInMonth(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month, day));
  }

  return dates;
}

/**
 * Gets all weekdays in a given month.
 *
 * @param {number} year - The year.
 * @param {number} month - The month (0-11).
 * @returns {Date[]} Array of all weekdays in the month.
 */
export function getWeekdaysInMonth(year: number, month: number): Date[] {
  return getDatesInMonth(year, month).filter(isWeekday);
}

/**
 * Gets all weekends in a given month.
 *
 * @param {number} year - The year.
 * @param {number} month - The month (0-11).
 * @returns {Date[]} Array of all weekend dates in the month.
 */
export function getWeekendsInMonth(year: number, month: number): Date[] {
  return getDatesInMonth(year, month).filter(isWeekend);
}

/**
 * Gets a date range between two dates (inclusive).
 *
 * @param {Date | string | number} startDate - The start date.
 * @param {Date | string | number} endDate - The end date.
 * @returns {Date[]} Array of dates in the range.
 */
export function getDateRange(
  startDate: Date | string | number,
  endDate: Date | string | number,
): Date[] {
  const start = typeof startDate === 'object' ? new Date(startDate) : new Date(startDate);
  const end = typeof endDate === 'object' ? new Date(endDate) : new Date(endDate);

  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Checks if a date falls within a date range (inclusive).
 *
 * @param {Date | string | number} date - The date to check.
 * @param {Date | string | number} startDate - The start of the range.
 * @param {Date | string | number} endDate - The end of the range.
 * @returns {boolean} True if the date is within the range.
 */
export function isInDateRange(
  date: Date | string | number,
  startDate: Date | string | number,
  endDate: Date | string | number,
): boolean {
  const d = typeof date === 'object' ? date : new Date(date);
  const start = typeof startDate === 'object' ? startDate : new Date(startDate);
  const end = typeof endDate === 'object' ? endDate : new Date(endDate);

  return d >= start && d <= end;
}

/**
 * Gets the number of days between two dates.
 *
 * @param {Date | string | number} date1 - The first date.
 * @param {Date | string | number} date2 - The second date.
 * @returns {number} The number of days (can be negative).
 */
export function daysBetween(date1: Date | string | number, date2: Date | string | number): number {
  const d1 = typeof date1 === 'object' ? date1 : new Date(date1);
  const d2 = typeof date2 === 'object' ? date2 : new Date(date2);

  const diffMs = d2.getTime() - d1.getTime();
  return Math.floor(diffMs / 86400000);
}

/**
 * Gets the number of weekdays between two dates.
 *
 * @param {Date | string | number} startDate - The start date.
 * @param {Date | string | number} endDate - The end date.
 * @returns {number} The number of weekdays.
 */
export function weekdaysBetween(
  startDate: Date | string | number,
  endDate: Date | string | number,
): number {
  return getDateRange(startDate, endDate).filter(isWeekday).length;
}

/**
 * Gets the number of weekends between two dates.
 *
 * @param {Date | string | number} startDate - The start date.
 * @param {Date | string | number} endDate - The end date.
 * @returns {number} The number of weekend days.
 */
export function weekendsBetween(
  startDate: Date | string | number,
  endDate: Date | string | number,
): number {
  return getDateRange(startDate, endDate).filter(isWeekend).length;
}

/**
 * Adds business days (weekdays) to a date.
 *
 * @param {Date | string | number} date - The starting date.
 * @param {number} days - Number of business days to add.
 * @returns {Date} The resulting date after adding business days.
 */
export function addBusinessDays(date: Date | string | number, days: number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  let remaining = Math.abs(days);
  const direction = days >= 0 ? 1 : -1;

  while (remaining > 0) {
    dateObj.setDate(dateObj.getDate() + direction);
    if (isWeekday(dateObj)) {
      remaining--;
    }
  }

  return dateObj;
}

/**
 * Gets the fiscal year for a given date (assuming fiscal year starts in month).
 *
 * @param {Date | string | number} date - The date to check.
 * @param {number} [fiscalYearStartMonth=0] - The month the fiscal year starts (0-11, default
 *   January). Default is `0`
 * @returns {number} The fiscal year.
 */
export function getFiscalYear(
  date: Date | string | number,
  fiscalYearStartMonth: number = 0,
): number {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();

  return month >= fiscalYearStartMonth ? year : year - 1;
}

/**
 * Gets the age in years based on a birthdate.
 *
 * @param {Date | string | number} birthDate - The birth date.
 * @param {Date | string | number} [currentDate=new Date()] - The date to calculate age from
 *   (defaults to today). Default is `new Date()`
 * @returns {number} The age in years.
 */
export function getAge(
  birthDate: Date | string | number,
  currentDate: Date | string | number = new Date(),
): number {
  const birth = typeof birthDate === 'object' ? birthDate : new Date(birthDate);
  const current = typeof currentDate === 'object' ? currentDate : new Date(currentDate);

  let age = current.getFullYear() - birth.getFullYear();
  const monthDiff = current.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && current.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Checks if a date is a birthday (same month and day as birth date).
 *
 * @param {Date | string | number} date - The date to check.
 * @param {Date | string | number} birthDate - The birth date.
 * @returns {boolean} True if the date is a birthday.
 */
export function isBirthday(
  date: Date | string | number,
  birthDate: Date | string | number,
): boolean {
  const d = typeof date === 'object' ? date : new Date(date);
  const birth = typeof birthDate === 'object' ? birthDate : new Date(birthDate);

  return d.getMonth() === birth.getMonth() && d.getDate() === birth.getDate();
}

/**
 * Gets the next birthday date.
 *
 * @param {Date | string | number} birthDate - The birth date.
 * @param {Date | string | number} [fromDate=new Date()] - The date to calculate from (defaults to
 *   today). Default is `new Date()`
 * @returns {Date} The next birthday date.
 */
export function getNextBirthday(
  birthDate: Date | string | number,
  fromDate: Date | string | number = new Date(),
): Date {
  const birth = typeof birthDate === 'object' ? birthDate : new Date(birthDate);
  const from = typeof fromDate === 'object' ? new Date(fromDate) : new Date(fromDate);

  const thisYearBirthday = new Date(from.getFullYear(), birth.getMonth(), birth.getDate());

  if (thisYearBirthday >= from) {
    return thisYearBirthday;
  } else {
    return new Date(from.getFullYear() + 1, birth.getMonth(), birth.getDate());
  }
}

/**
 * Gets an array of all dates for a specific day of the week in a month.
 *
 * @param {number} year - The year.
 * @param {number} month - The month (0-11).
 * @param {number} dayOfWeek - The day of week (0=Sunday, 1=Monday, etc.).
 * @returns {Date[]} Array of dates for the specified day in the month.
 */
export function getDayOccurrencesInMonth(year: number, month: number, dayOfWeek: number): Date[] {
  return getDatesInMonth(year, month).filter((date) => date.getDay() === dayOfWeek);
}

/**
 * Gets the nth occurrence of a day of the week in a month.
 *
 * @param {number} year - The year.
 * @param {number} month - The month (0-11).
 * @param {number} dayOfWeek - The day of week (0=Sunday, 1=Monday, etc.).
 * @param {number} occurrence - The occurrence number (1=first, 2=second, etc., -1=last).
 * @returns {Date | null} The date of the nth occurrence, or null if not found.
 */
export function getNthDayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  occurrence: number,
): Date | null {
  const occurrences = getDayOccurrencesInMonth(year, month, dayOfWeek);

  if (occurrence === -1) {
    return occurrences[occurrences.length - 1] || null;
  }

  return occurrences[occurrence - 1] || null;
}

/**
 * Checks if two date ranges overlap.
 *
 * @param {Date | string | number} start1 - Start of first range.
 * @param {Date | string | number} end1 - End of first range.
 * @param {Date | string | number} start2 - Start of second range.
 * @param {Date | string | number} end2 - End of second range.
 * @returns {boolean} True if the ranges overlap.
 */
export function doDateRangesOverlap(
  start1: Date | string | number,
  end1: Date | string | number,
  start2: Date | string | number,
  end2: Date | string | number,
): boolean {
  const s1 = typeof start1 === 'object' ? start1 : new Date(start1);
  const e1 = typeof end1 === 'object' ? end1 : new Date(end1);
  const s2 = typeof start2 === 'object' ? start2 : new Date(start2);
  const e2 = typeof end2 === 'object' ? end2 : new Date(end2);

  return s1 <= e2 && s2 <= e1;
}

/**
 * Merges overlapping date ranges.
 *
 * @param {[Date, Date][]} ranges - Array of date range tuples.
 * @returns {[Date, Date][]} Array of merged date ranges.
 */
export function mergeDateRanges(ranges: Array<[Date, Date]>): Array<[Date, Date]> {
  if (ranges.length === 0) return [];

  // Sort ranges by start date
  const sorted = [...ranges].sort((a, b) => a[0].getTime() - b[0].getTime());

  const merged: Array<[Date, Date]> = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];

    if (current[0] <= lastMerged[1]) {
      // Overlapping ranges, merge them
      lastMerged[1] = new Date(Math.max(lastMerged[1].getTime(), current[1].getTime()));
    } else {
      // Non-overlapping, add to merged
      merged.push(current);
    }
  }

  return merged;
}
