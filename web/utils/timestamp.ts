/**
 * Generates an ISO 8601 timestamp string for the current time.
 *
 * @returns {string} The ISO 8601 timestamp string.
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generates a Unix timestamp in seconds for the current time.
 *
 * @returns {number} The Unix timestamp in seconds.
 */
export function generateUnixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Generates a Unix timestamp in milliseconds for the current time.
 *
 * @returns {number} The Unix timestamp in milliseconds.
 */
export function generateUnixTimestampMs(): number {
  return Date.now();
}

/**
 * Generates a human-readable timestamp string (e.g., "2024-10-12 14:30:45").
 *
 * @param {Date} [date=new Date()] - The date to format (defaults to now). Default is `new Date()`
 * @returns {string} The formatted timestamp string.
 */
export function generateReadableTimestamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Generates a compact timestamp string for filenames (e.g., "20241012_143045").
 *
 * @param {Date} [date=new Date()] - The date to format (defaults to now). Default is `new Date()`
 * @returns {string} The compact timestamp string.
 */
export function generateFileTimestamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Generates a date-only timestamp string (e.g., "2024-10-12").
 *
 * @param {Date} [date=new Date()] - The date to format (defaults to now). Default is `new Date()`
 * @returns {string} The date-only timestamp string.
 */
export function generateDateStamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Generates a time-only timestamp string (e.g., "14:30:45").
 *
 * @param {Date} [date=new Date()] - The date to extract time from (defaults to now). Default is
 *   `new Date()`
 * @returns {string} The time-only timestamp string.
 */
export function generateTimeStamp(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Generates a timestamp with milliseconds (e.g., "2024-10-12 14:30:45.123").
 *
 * @param {Date} [date=new Date()] - The date to format (defaults to now). Default is `new Date()`
 * @returns {string} The timestamp string with milliseconds.
 */
export function generatePreciseTimestamp(date: Date = new Date()): string {
  const baseTimestamp = generateReadableTimestamp(date);
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

  return `${baseTimestamp}.${milliseconds}`;
}

/**
 * Generates a timestamp in RFC 3339 format (similar to ISO 8601 but with timezone).
 *
 * @param {Date} [date=new Date()] - The date to format (defaults to now). Default is `new Date()`
 * @returns {string} The RFC 3339 formatted timestamp.
 */
export function generateRFC3339Timestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Generates a timestamp in RFC 2822 format (commonly used in emails).
 *
 * @param {Date} [date=new Date()] - The date to format (defaults to now). Default is `new Date()`
 * @returns {string} The RFC 2822 formatted timestamp.
 */
export function generateRFC2822Timestamp(date: Date = new Date()): string {
  return date.toUTCString();
}

/**
 * Generates a custom formatted timestamp.
 *
 * @param {string} format - The format string (supports: YYYY, MM, DD, HH, mm, ss, SSS).
 * @param {Date} [date=new Date()] - The date to format (defaults to now). Default is `new Date()`
 * @returns {string} The formatted timestamp.
 */
export function generateCustomTimestamp(format: string, date: Date = new Date()): string {
  const tokens: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    DD: String(date.getDate()).padStart(2, '0'),
    HH: String(date.getHours()).padStart(2, '0'),
    mm: String(date.getMinutes()).padStart(2, '0'),
    ss: String(date.getSeconds()).padStart(2, '0'),
    SSS: String(date.getMilliseconds()).padStart(3, '0'),
  };

  let result = format;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.replace(new RegExp(token, 'g'), value);
  }

  return result;
}

/**
 * Parses various timestamp formats and returns a Date object.
 *
 * @param {string | number} timestamp - The timestamp to parse (ISO string, Unix timestamp, etc.).
 * @returns {Date | null} The parsed Date object, or null if invalid.
 */
export function parseTimestamp(timestamp: string | number): Date | null {
  try {
    if (typeof timestamp === 'number') {
      // Handle Unix timestamps (both seconds and milliseconds)
      const ts = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
      return new Date(ts);
    }

    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Checks if a timestamp is expired based on a duration in milliseconds.
 *
 * @param {string | number | Date} timestamp - The timestamp to check.
 * @param {number} durationMs - The duration in milliseconds.
 * @returns {boolean} True if the timestamp is expired.
 */
export function isTimestampExpired(timestamp: string | number | Date, durationMs: number): boolean {
  const date = typeof timestamp === 'object' ? timestamp : parseTimestamp(timestamp);
  if (!date) return true;

  return Date.now() - date.getTime() > durationMs;
}

/**
 * Gets the age of a timestamp in milliseconds.
 *
 * @param {string | number | Date} timestamp - The timestamp to check.
 * @returns {number} The age in milliseconds, or -1 if invalid.
 */
export function getTimestampAge(timestamp: string | number | Date): number {
  const date = typeof timestamp === 'object' ? timestamp : parseTimestamp(timestamp);
  if (!date) return -1;

  return Date.now() - date.getTime();
}

/**
 * Compares two timestamps and returns which is earlier.
 *
 * @param {string | number | Date} timestamp1 - The first timestamp.
 * @param {string | number | Date} timestamp2 - The second timestamp.
 * @returns {-1 | 0 | 1} -1 if timestamp1 is earlier, 1 if timestamp2 is earlier, 0 if equal.
 */
export function compareTimestamps(
  timestamp1: string | number | Date,
  timestamp2: string | number | Date,
): -1 | 0 | 1 {
  const date1 = typeof timestamp1 === 'object' ? timestamp1 : parseTimestamp(timestamp1);
  const date2 = typeof timestamp2 === 'object' ? timestamp2 : parseTimestamp(timestamp2);

  if (!date1 || !date2) return 0;

  const time1 = date1.getTime();
  const time2 = date2.getTime();

  if (time1 < time2) return -1;
  if (time1 > time2) return 1;
  return 0;
}
