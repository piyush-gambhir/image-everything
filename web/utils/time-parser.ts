/**
 * Parses a time string in various formats to a Date object.
 *
 * @param {string} timeString - The time string to parse (e.g., "2:30 PM", "14:30", "2:30:45 PM").
 * @param {Date} [baseDate=new Date()] - The base date to apply the time to. Default is `new Date()`
 * @returns {Date | null} The parsed Date object, or null if invalid.
 */
export function parseTime(timeString: string, baseDate: Date = new Date()): Date | null {
  try {
    const trimmed = timeString.trim();

    // Try parsing 12-hour format with AM/PM
    const time12HourRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i;
    const match12 = trimmed.match(time12HourRegex);

    if (match12) {
      let hours = parseInt(match12[1]);
      const minutes = parseInt(match12[2]);
      const seconds = match12[3] ? parseInt(match12[3]) : 0;
      const period = match12[4].toUpperCase();

      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      const result = new Date(baseDate);
      result.setHours(hours, minutes, seconds, 0);
      return result;
    }

    // Try parsing 24-hour format
    const time24HourRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    const match24 = trimmed.match(time24HourRegex);

    if (match24) {
      const hours = parseInt(match24[1]);
      const minutes = parseInt(match24[2]);
      const seconds = match24[3] ? parseInt(match24[3]) : 0;

      if (
        hours >= 0 &&
        hours < 24 &&
        minutes >= 0 &&
        minutes < 60 &&
        seconds >= 0 &&
        seconds < 60
      ) {
        const result = new Date(baseDate);
        result.setHours(hours, minutes, seconds, 0);
        return result;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parses a date string in various formats to a Date object.
 *
 * @param {string} dateString - The date string to parse (e.g., "2024-10-12", "10/12/2024", "Oct 12,
 *   2024").
 * @returns {Date | null} The parsed Date object, or null if invalid.
 */
export function parseDate(dateString: string): Date | null {
  try {
    const trimmed = dateString.trim();

    // Try ISO format (YYYY-MM-DD)
    const isoRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    const isoMatch = trimmed.match(isoRegex);

    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1;
      const day = parseInt(isoMatch[3]);
      const date = new Date(year, month, day);

      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date;
      }
    }

    // Try US format (MM/DD/YYYY)
    const usRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const usMatch = trimmed.match(usRegex);

    if (usMatch) {
      const month = parseInt(usMatch[1]) - 1;
      const day = parseInt(usMatch[2]);
      const year = parseInt(usMatch[3]);
      const date = new Date(year, month, day);

      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date;
      }
    }

    // Try European format (DD/MM/YYYY)
    const euRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const euMatch = trimmed.match(euRegex);

    if (euMatch) {
      const day = parseInt(euMatch[1]);
      const month = parseInt(euMatch[2]) - 1;
      const year = parseInt(euMatch[3]);
      const date = new Date(year, month, day);

      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date;
      }
    }

    // Try using native Date parser as fallback
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parses a date-time string in various formats to a Date object.
 *
 * @param {string} dateTimeString - The date-time string to parse.
 * @returns {Date | null} The parsed Date object, or null if invalid.
 */
export function parseDateTime(dateTimeString: string): Date | null {
  try {
    const trimmed = dateTimeString.trim();

    // Try ISO 8601 format
    const isoDate = new Date(trimmed);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try splitting on common separators
    const separators = [' at ', ' ', 'T'];
    for (const sep of separators) {
      const parts = trimmed.split(sep);
      if (parts.length === 2) {
        const datePart = parseDate(parts[0]);
        if (datePart) {
          const dateTime = parseTime(parts[1], datePart);
          if (dateTime) {
            return dateTime;
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parses a relative time string (e.g., "2 hours ago", "in 3 days") to a Date object.
 *
 * @param {string} relativeString - The relative time string.
 * @param {Date} [baseDate=new Date()] - The base date to calculate from. Default is `new Date()`
 * @returns {Date | null} The parsed Date object, or null if invalid.
 */
export function parseRelativeTime(
  relativeString: string,
  baseDate: Date = new Date(),
): Date | null {
  try {
    const trimmed = relativeString.trim().toLowerCase();

    // Handle "now"
    if (trimmed === 'now') {
      return new Date(baseDate);
    }

    // Handle "today", "tomorrow", "yesterday"
    if (trimmed === 'today') {
      return new Date(baseDate);
    }
    if (trimmed === 'tomorrow') {
      const result = new Date(baseDate);
      result.setDate(result.getDate() + 1);
      return result;
    }
    if (trimmed === 'yesterday') {
      const result = new Date(baseDate);
      result.setDate(result.getDate() - 1);
      return result;
    }

    // Parse "X units ago" or "in X units"
    const agoRegex = /^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/;
    const inRegex = /^in\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?$/;

    const agoMatch = trimmed.match(agoRegex);
    const inMatch = trimmed.match(inRegex);

    if (agoMatch || inMatch) {
      const match = agoMatch || inMatch;
      const amount = parseInt(match![1]);
      const unit = match![2];
      const multiplier = agoMatch ? -1 : 1;

      const result = new Date(baseDate);

      switch (unit) {
        case 'second':
          result.setSeconds(result.getSeconds() + amount * multiplier);
          break;
        case 'minute':
          result.setMinutes(result.getMinutes() + amount * multiplier);
          break;
        case 'hour':
          result.setHours(result.getHours() + amount * multiplier);
          break;
        case 'day':
          result.setDate(result.getDate() + amount * multiplier);
          break;
        case 'week':
          result.setDate(result.getDate() + amount * 7 * multiplier);
          break;
        case 'month':
          result.setMonth(result.getMonth() + amount * multiplier);
          break;
        case 'year':
          result.setFullYear(result.getFullYear() + amount * multiplier);
          break;
      }

      return result;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parses a natural language date string (e.g., "next Monday", "last Friday").
 *
 * @param {string} naturalString - The natural language date string.
 * @param {Date} [baseDate=new Date()] - The base date to calculate from. Default is `new Date()`
 * @returns {Date | null} The parsed Date object, or null if invalid.
 */
export function parseNaturalDate(naturalString: string, baseDate: Date = new Date()): Date | null {
  try {
    const trimmed = naturalString.trim().toLowerCase();

    // Days of the week
    const daysMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    // Handle "next [day]"
    const nextDayRegex = /^next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/;
    const nextMatch = trimmed.match(nextDayRegex);

    if (nextMatch) {
      const targetDay = daysMap[nextMatch[1]];
      const result = new Date(baseDate);
      const currentDay = result.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
      result.setDate(result.getDate() + daysUntilTarget);
      return result;
    }

    // Handle "last [day]"
    const lastDayRegex = /^last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/;
    const lastMatch = trimmed.match(lastDayRegex);

    if (lastMatch) {
      const targetDay = daysMap[lastMatch[1]];
      const result = new Date(baseDate);
      const currentDay = result.getDay();
      const daysSinceLast = (currentDay - targetDay + 7) % 7 || 7;
      result.setDate(result.getDate() - daysSinceLast);
      return result;
    }

    // Handle "this [day]"
    const thisDayRegex = /^this\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/;
    const thisMatch = trimmed.match(thisDayRegex);

    if (thisMatch) {
      const targetDay = daysMap[thisMatch[1]];
      const result = new Date(baseDate);
      const currentDay = result.getDay();

      if (currentDay === targetDay) {
        return result;
      }

      const daysUntilTarget = (targetDay - currentDay + 7) % 7;
      result.setDate(result.getDate() + daysUntilTarget);
      return result;
    }

    // Handle "next week/month/year"
    if (trimmed === 'next week') {
      const result = new Date(baseDate);
      result.setDate(result.getDate() + 7);
      return result;
    }
    if (trimmed === 'next month') {
      const result = new Date(baseDate);
      result.setMonth(result.getMonth() + 1);
      return result;
    }
    if (trimmed === 'next year') {
      const result = new Date(baseDate);
      result.setFullYear(result.getFullYear() + 1);
      return result;
    }

    // Handle "last week/month/year"
    if (trimmed === 'last week') {
      const result = new Date(baseDate);
      result.setDate(result.getDate() - 7);
      return result;
    }
    if (trimmed === 'last month') {
      const result = new Date(baseDate);
      result.setMonth(result.getMonth() - 1);
      return result;
    }
    if (trimmed === 'last year') {
      const result = new Date(baseDate);
      result.setFullYear(result.getFullYear() - 1);
      return result;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Attempts to parse any date/time string using multiple strategies.
 *
 * @param {string} input - The input string to parse.
 * @param {Date} [baseDate=new Date()] - The base date for relative parsing. Default is `new Date()`
 * @returns {Date | null} The parsed Date object, or null if unable to parse.
 */
export function parseAny(input: string, baseDate: Date = new Date()): Date | null {
  // Try each parsing strategy in order
  const strategies = [
    () => parseDateTime(input),
    () => parseDate(input),
    () => parseTime(input, baseDate),
    () => parseRelativeTime(input, baseDate),
    () => parseNaturalDate(input, baseDate),
  ];

  for (const strategy of strategies) {
    const result = strategy();
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Validates if a time string is in valid format.
 *
 * @param {string} timeString - The time string to validate.
 * @returns {boolean} True if the time string is valid.
 */
export function isValidTimeString(timeString: string): boolean {
  return parseTime(timeString) !== null;
}

/**
 * Validates if a date string is in valid format.
 *
 * @param {string} dateString - The date string to validate.
 * @returns {boolean} True if the date string is valid.
 */
export function isValidDateString(dateString: string): boolean {
  return parseDate(dateString) !== null;
}

/**
 * Extracts time components from a time string.
 *
 * @param {string} timeString - The time string to parse.
 * @returns {{ hours: number; minutes: number; seconds: number; period?: 'AM' | 'PM' } | null} The
 *   time components, or null if invalid.
 */
export function extractTimeComponents(
  timeString: string,
): { hours: number; minutes: number; seconds: number; period?: 'AM' | 'PM' } | null {
  const date = parseTime(timeString);
  if (!date) return null;

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  // Determine if original was 12-hour format
  if (timeString.toUpperCase().includes('AM') || timeString.toUpperCase().includes('PM')) {
    const period = hours >= 12 ? 'PM' : 'AM';
    return { hours, minutes, seconds, period };
  }

  return { hours, minutes, seconds };
}

/**
 * Extracts date components from a date string.
 *
 * @param {string} dateString - The date string to parse.
 * @returns {{ year: number; month: number; day: number } | null} The date components, or null if
 *   invalid.
 */
export function extractDateComponents(
  dateString: string,
): { year: number; month: number; day: number } | null {
  const date = parseDate(dateString);
  if (!date) return null;

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1, // Return 1-12 instead of 0-11
    day: date.getDate(),
  };
}
