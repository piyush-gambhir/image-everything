/**
 * Gets the user's current timezone identifier (e.g., "America/New_York").
 *
 * @returns {string} The IANA timezone identifier.
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Gets the timezone offset in minutes for a given date and timezone.
 *
 * @param {Date | string | number} date - The date to check.
 * @param {string} [timezone] - The IANA timezone identifier (defaults to user's timezone).
 * @returns {number} The timezone offset in minutes.
 */
export function getTimezoneOffset(date: Date | string | number, timezone?: string): number {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  const tz = timezone || getUserTimezone();

  // Get the UTC time
  const utcTime = dateObj.getTime();

  // Format the date in the target timezone
  const tzDateString = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(dateObj);

  // Parse the formatted string back to get the local time
  const [datePart, timePart] = tzDateString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');

  const tzDate = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second),
  );

  // Calculate offset in minutes
  return (tzDate.getTime() - utcTime) / 60000;
}

/**
 * Converts a date from one timezone to another.
 *
 * @param {Date | string | number} date - The date to convert.
 * @param {string} fromTimezone - The source timezone (IANA identifier).
 * @param {string} toTimezone - The target timezone (IANA identifier).
 * @returns {Date} A new Date object representing the same moment in the target timezone.
 */
export function convertTimezone(
  date: Date | string | number,
  fromTimezone: string,
  toTimezone: string,
): Date {
  const dateObj = typeof date === 'object' ? date : new Date(date);

  // Format in both timezones to get the time difference
  const fromOffset = getTimezoneOffset(dateObj, fromTimezone);
  const toOffset = getTimezoneOffset(dateObj, toTimezone);

  // Calculate the difference and adjust
  const offsetDiff = toOffset - fromOffset;
  return new Date(dateObj.getTime() + offsetDiff * 60000);
}

/**
 * Formats a date in a specific timezone.
 *
 * @param {Date | string | number} date - The date to format.
 * @param {string} timezone - The IANA timezone identifier.
 * @param {string} [locale="en-US"] - The locale string. Default is `"en-US"`
 * @param {Intl.DateTimeFormatOptions} [options] - Formatting options.
 * @returns {string} The formatted date string in the specified timezone.
 */
export function formatInTimezone(
  date: Date | string | number,
  timezone: string,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  },
): string {
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    return new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: timezone,
    }).format(dateObj);
  } catch (error) {
    console.error('Invalid timezone or date provided', error);
    return 'Invalid date/timezone';
  }
}

/**
 * Gets the timezone abbreviation (e.g., "EST", "PDT") for a given date and timezone.
 *
 * @param {Date | string | number} date - The date to check.
 * @param {string} [timezone] - The IANA timezone identifier (defaults to user's timezone).
 * @param {string} [locale="en-US"] - The locale string. Default is `"en-US"`
 * @returns {string} The timezone abbreviation.
 */
export function getTimezoneAbbreviation(
  date: Date | string | number,
  timezone?: string,
  locale: string = 'en-US',
): string {
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    const tz = timezone || getUserTimezone();

    const formatted = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      timeZoneName: 'short',
    }).format(dateObj);

    // Extract the timezone abbreviation from the formatted string
    const match = formatted.match(/\b[A-Z]{3,5}\b/);
    return match ? match[0] : '';
  } catch (error) {
    console.error('Invalid timezone or date provided', error);
    return '';
  }
}

/**
 * Gets the full timezone name (e.g., "Eastern Standard Time") for a given date and timezone.
 *
 * @param {Date | string | number} date - The date to check.
 * @param {string} [timezone] - The IANA timezone identifier (defaults to user's timezone).
 * @param {string} [locale="en-US"] - The locale string. Default is `"en-US"`
 * @returns {string} The full timezone name.
 */
export function getTimezoneName(
  date: Date | string | number,
  timezone?: string,
  locale: string = 'en-US',
): string {
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    const tz = timezone || getUserTimezone();

    const formatted = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      timeZoneName: 'long',
    }).format(dateObj);

    // Extract the timezone name (everything after the comma and space)
    const parts = formatted.split(', ');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  } catch (error) {
    console.error('Invalid timezone or date provided', error);
    return '';
  }
}

/**
 * Checks if a timezone is currently observing Daylight Saving Time.
 *
 * @param {Date | string | number} date - The date to check.
 * @param {string} [timezone] - The IANA timezone identifier (defaults to user's timezone).
 * @returns {boolean} True if the timezone is observing DST at the given date.
 */
export function isDaylightSavingTime(date: Date | string | number, timezone?: string): boolean {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  const tz = timezone || getUserTimezone();

  // Get offset in January (typically standard time in Northern Hemisphere)
  const jan = new Date(dateObj.getFullYear(), 0, 1);
  const janOffset = getTimezoneOffset(jan, tz);

  // Get offset in July (typically daylight time in Northern Hemisphere)
  const jul = new Date(dateObj.getFullYear(), 6, 1);
  const julOffset = getTimezoneOffset(jul, tz);

  // Get offset for the current date
  const currentOffset = getTimezoneOffset(dateObj, tz);

  // DST is active when the offset differs from standard time
  const standardOffset = Math.max(janOffset, julOffset);
  return currentOffset !== standardOffset;
}

/**
 * Gets the UTC offset string for a timezone (e.g., "+05:30", "-08:00").
 *
 * @param {Date | string | number} date - The date to check.
 * @param {string} [timezone] - The IANA timezone identifier (defaults to user's timezone).
 * @returns {string} The UTC offset string.
 */
export function getUTCOffsetString(date: Date | string | number, timezone?: string): string {
  const offset = getTimezoneOffset(date, timezone);
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? '+' : '-';

  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Gets a list of common timezone identifiers grouped by region.
 *
 * @returns {Record<string, string[]>} An object with region keys and timezone arrays.
 */
export function getCommonTimezones(): Record<string, string[]> {
  return {
    Americas: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'America/Honolulu',
      'America/Toronto',
      'America/Mexico_City',
      'America/Sao_Paulo',
      'America/Buenos_Aires',
    ],
    Europe: [
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Madrid',
      'Europe/Rome',
      'Europe/Amsterdam',
      'Europe/Brussels',
      'Europe/Vienna',
      'Europe/Stockholm',
      'Europe/Moscow',
    ],
    Asia: [
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Bangkok',
      'Asia/Shanghai',
      'Asia/Hong_Kong',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Asia/Singapore',
      'Asia/Jakarta',
      'Asia/Manila',
    ],
    Pacific: [
      'Pacific/Auckland',
      'Pacific/Sydney',
      'Pacific/Melbourne',
      'Pacific/Brisbane',
      'Pacific/Perth',
      'Pacific/Fiji',
    ],
    Africa: ['Africa/Cairo', 'Africa/Johannesburg', 'Africa/Nairobi', 'Africa/Lagos'],
    Atlantic: ['Atlantic/Azores', 'Atlantic/Reykjavik'],
  };
}

/**
 * Validates if a timezone identifier is valid.
 *
 * @param {string} timezone - The IANA timezone identifier to validate.
 * @returns {boolean} True if the timezone is valid.
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the current time in multiple timezones.
 *
 * @param {string[]} timezones - Array of IANA timezone identifiers.
 * @param {Date} [date=new Date()] - The date to use (defaults to now). Default is `new Date()`
 * @returns {Record<string, string>} An object mapping timezone to formatted time.
 */
export function getTimeInTimezones(
  timezones: string[],
  date: Date = new Date(),
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const tz of timezones) {
    try {
      result[tz] = formatInTimezone(date, tz, 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      result[tz] = 'Invalid timezone';
    }
  }

  return result;
}

/**
 * Converts a date to UTC.
 *
 * @param {Date | string | number} date - The date to convert.
 * @returns {Date} A new Date object in UTC.
 */
export function toUTC(date: Date | string | number): Date {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return new Date(dateObj.toUTCString());
}

/**
 * Gets the current date and time in a specific timezone as a Date object.
 *
 * @param {string} timezone - The IANA timezone identifier.
 * @returns {Date} A Date object representing the current time in the specified timezone.
 */
export function nowInTimezone(timezone: string): Date {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const offset = getTimezoneOffset(now, timezone);
  return new Date(utcTime + offset * 60000);
}

/**
 * Schedules a callback to run at a specific time in a timezone.
 *
 * @param {Date | string | number} targetTime - The target time to run the callback.
 * @param {string} timezone - The IANA timezone identifier.
 * @param {() => void} callback - The function to execute.
 * @returns {NodeJS.Timeout} The timeout ID that can be used to cancel.
 */
export function scheduleInTimezone(
  targetTime: Date | string | number,
  timezone: string,
  callback: () => void,
): NodeJS.Timeout {
  const targetDate = typeof targetTime === 'object' ? targetTime : new Date(targetTime);
  const now = new Date();

  // Convert target time to local time
  const targetLocal = convertTimezone(targetDate, timezone, getUserTimezone());

  const delay = targetLocal.getTime() - now.getTime();

  if (delay < 0) {
    console.warn('Target time is in the past');
  }

  return setTimeout(callback, Math.max(0, delay));
}
