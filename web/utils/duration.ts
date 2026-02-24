/** Time constants in milliseconds. */
export const TIME_CONSTANTS = {
  MILLISECOND: 1,
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000, // Approximate
  YEAR: 365 * 24 * 60 * 60 * 1000, // Approximate
} as const;

/**
 * Converts milliseconds to seconds.
 *
 * @param {number} milliseconds - The duration in milliseconds.
 * @returns {number} The duration in seconds.
 */
export function msToSeconds(milliseconds: number): number {
  return milliseconds / TIME_CONSTANTS.SECOND;
}

/**
 * Converts milliseconds to minutes.
 *
 * @param {number} milliseconds - The duration in milliseconds.
 * @returns {number} The duration in minutes.
 */
export function msToMinutes(milliseconds: number): number {
  return milliseconds / TIME_CONSTANTS.MINUTE;
}

/**
 * Converts milliseconds to hours.
 *
 * @param {number} milliseconds - The duration in milliseconds.
 * @returns {number} The duration in hours.
 */
export function msToHours(milliseconds: number): number {
  return milliseconds / TIME_CONSTANTS.HOUR;
}

/**
 * Converts milliseconds to days.
 *
 * @param {number} milliseconds - The duration in milliseconds.
 * @returns {number} The duration in days.
 */
export function msToDays(milliseconds: number): number {
  return milliseconds / TIME_CONSTANTS.DAY;
}

/**
 * Converts milliseconds to weeks.
 *
 * @param {number} milliseconds - The duration in milliseconds.
 * @returns {number} The duration in weeks.
 */
export function msToWeeks(milliseconds: number): number {
  return milliseconds / TIME_CONSTANTS.WEEK;
}

/**
 * Converts seconds to milliseconds.
 *
 * @param {number} seconds - The duration in seconds.
 * @returns {number} The duration in milliseconds.
 */
export function secondsToMs(seconds: number): number {
  return seconds * TIME_CONSTANTS.SECOND;
}

/**
 * Converts minutes to milliseconds.
 *
 * @param {number} minutes - The duration in minutes.
 * @returns {number} The duration in milliseconds.
 */
export function minutesToMs(minutes: number): number {
  return minutes * TIME_CONSTANTS.MINUTE;
}

/**
 * Converts hours to milliseconds.
 *
 * @param {number} hours - The duration in hours.
 * @returns {number} The duration in milliseconds.
 */
export function hoursToMs(hours: number): number {
  return hours * TIME_CONSTANTS.HOUR;
}

/**
 * Converts days to milliseconds.
 *
 * @param {number} days - The duration in days.
 * @returns {number} The duration in milliseconds.
 */
export function daysToMs(days: number): number {
  return days * TIME_CONSTANTS.DAY;
}

/**
 * Converts weeks to milliseconds.
 *
 * @param {number} weeks - The duration in weeks.
 * @returns {number} The duration in milliseconds.
 */
export function weeksToMs(weeks: number): number {
  return weeks * TIME_CONSTANTS.WEEK;
}

/**
 * Parses a duration string (e.g., "2h 30m", "1d 12h", "45s") to milliseconds.
 *
 * @param {string} duration - The duration string.
 * @returns {number} The duration in milliseconds.
 */
export function parseDuration(duration: string): number {
  const regex = /(\d+\.?\d*)\s*([a-z]+)/gi;
  let totalMs = 0;
  let match;

  while ((match = regex.exec(duration)) !== null) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'ms':
      case 'millisecond':
      case 'milliseconds':
        totalMs += value;
        break;
      case 's':
      case 'sec':
      case 'second':
      case 'seconds':
        totalMs += secondsToMs(value);
        break;
      case 'm':
      case 'min':
      case 'minute':
      case 'minutes':
        totalMs += minutesToMs(value);
        break;
      case 'h':
      case 'hr':
      case 'hour':
      case 'hours':
        totalMs += hoursToMs(value);
        break;
      case 'd':
      case 'day':
      case 'days':
        totalMs += daysToMs(value);
        break;
      case 'w':
      case 'week':
      case 'weeks':
        totalMs += weeksToMs(value);
        break;
      case 'mo':
      case 'month':
      case 'months':
        totalMs += value * TIME_CONSTANTS.MONTH;
        break;
      case 'y':
      case 'yr':
      case 'year':
      case 'years':
        totalMs += value * TIME_CONSTANTS.YEAR;
        break;
      default:
        console.warn(`Unknown duration unit: ${unit}`);
    }
  }

  return totalMs;
}

/**
 * Formats milliseconds into a human-readable duration string.
 *
 * @param {number} milliseconds - The duration in milliseconds.
 * @param {object} [options] - Formatting options.
 * @param {boolean} [options.verbose=false] - Use verbose labels (e.g., "hours" vs "h"). Default is
 *   `false`
 * @param {number} [options.maxUnits=2] - Maximum number of units to display. Default is `2`
 * @param {boolean} [options.compact=false] - Use compact format without spaces. Default is `false`
 * @returns {string} The formatted duration string.
 */
export function formatDuration(
  milliseconds: number,
  options: {
    verbose?: boolean;
    maxUnits?: number;
    compact?: boolean;
  } = {},
): string {
  const { verbose = false, maxUnits = 2, compact = false } = options;

  if (milliseconds === 0) {
    return verbose ? '0 seconds' : '0s';
  }

  const units = [
    { ms: TIME_CONSTANTS.YEAR, short: 'y', long: 'year' },
    { ms: TIME_CONSTANTS.MONTH, short: 'mo', long: 'month' },
    { ms: TIME_CONSTANTS.WEEK, short: 'w', long: 'week' },
    { ms: TIME_CONSTANTS.DAY, short: 'd', long: 'day' },
    { ms: TIME_CONSTANTS.HOUR, short: 'h', long: 'hour' },
    { ms: TIME_CONSTANTS.MINUTE, short: 'm', long: 'minute' },
    { ms: TIME_CONSTANTS.SECOND, short: 's', long: 'second' },
  ];

  const parts: string[] = [];
  let remaining = Math.abs(milliseconds);

  for (const unit of units) {
    if (parts.length >= maxUnits) break;

    const value = Math.floor(remaining / unit.ms);
    if (value > 0) {
      remaining -= value * unit.ms;

      const label = verbose ? (value === 1 ? unit.long : `${unit.long}s`) : unit.short;
      const separator = compact ? '' : ' ';
      parts.push(`${value}${separator}${label}`);
    }
  }

  const result = parts.join(compact ? '' : ' ');
  return milliseconds < 0 ? `-${result}` : result;
}

/**
 * Formats milliseconds into a colon-separated time format (e.g., "2:30:45" or "1:23:45:678").
 *
 * @param {number} milliseconds - The duration in milliseconds.
 * @param {object} [options] - Formatting options.
 * @param {boolean} [options.includeMs=false] - Include milliseconds in the output. Default is
 *   `false`
 * @param {boolean} [options.showHours=true] - Show hours even if zero. Default is `true`
 * @returns {string} The formatted time string.
 */
export function formatTime(
  milliseconds: number,
  options: {
    includeMs?: boolean;
    showHours?: boolean;
  } = {},
): string {
  const { includeMs = false, showHours = true } = options;

  const totalSeconds = Math.floor(Math.abs(milliseconds) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor(Math.abs(milliseconds) % 1000);

  let result = '';

  if (showHours || hours > 0) {
    result += `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } else {
    result += `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  if (includeMs) {
    result += `:${String(ms).padStart(3, '0')}`;
  }

  return milliseconds < 0 ? `-${result}` : result;
}

/**
 * Gets the duration between two dates.
 *
 * @param {Date | string | number} startDate - The start date.
 * @param {Date | string | number} endDate - The end date.
 * @returns {number} The duration in milliseconds.
 */
export function getDuration(
  startDate: Date | string | number,
  endDate: Date | string | number,
): number {
  const start = typeof startDate === 'object' ? startDate : new Date(startDate);
  const end = typeof endDate === 'object' ? endDate : new Date(endDate);
  return end.getTime() - start.getTime();
}

/**
 * Checks if a duration has elapsed since a given date.
 *
 * @param {Date | string | number} date - The starting date.
 * @param {number} durationMs - The duration in milliseconds.
 * @returns {boolean} True if the duration has elapsed.
 */
export function hasElapsed(date: Date | string | number, durationMs: number): boolean {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  return Date.now() - dateObj.getTime() >= durationMs;
}

/**
 * Gets the remaining time until a duration expires.
 *
 * @param {Date | string | number} date - The starting date.
 * @param {number} durationMs - The total duration in milliseconds.
 * @returns {number} The remaining time in milliseconds (0 if expired).
 */
export function getRemainingTime(date: Date | string | number, durationMs: number): number {
  const dateObj = typeof date === 'object' ? date : new Date(date);
  const elapsed = Date.now() - dateObj.getTime();
  return Math.max(0, durationMs - elapsed);
}

/**
 * Gets the progress percentage of a duration.
 *
 * @param {Date | string | number} startDate - The start date.
 * @param {number} durationMs - The total duration in milliseconds.
 * @returns {number} The progress as a percentage (0-100, capped at 100).
 */
export function getDurationProgress(startDate: Date | string | number, durationMs: number): number {
  const start = typeof startDate === 'object' ? startDate : new Date(startDate);
  const elapsed = Date.now() - start.getTime();
  return Math.min(100, (elapsed / durationMs) * 100);
}

/**
 * Rounds a duration to the nearest unit.
 *
 * @param {number} milliseconds - The duration in milliseconds.
 * @param {'second' | 'minute' | 'hour' | 'day'} unit - The unit to round to.
 * @returns {number} The rounded duration in milliseconds.
 */
export function roundDuration(
  milliseconds: number,
  unit: 'second' | 'minute' | 'hour' | 'day',
): number {
  const unitMs = {
    second: TIME_CONSTANTS.SECOND,
    minute: TIME_CONSTANTS.MINUTE,
    hour: TIME_CONSTANTS.HOUR,
    day: TIME_CONSTANTS.DAY,
  }[unit];

  return Math.round(milliseconds / unitMs) * unitMs;
}

/**
 * Adds a duration to a date.
 *
 * @param {Date | string | number} date - The date.
 * @param {number} durationMs - The duration to add in milliseconds.
 * @returns {Date} A new Date object with the duration added.
 */
export function addDuration(date: Date | string | number, durationMs: number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  return new Date(dateObj.getTime() + durationMs);
}

/**
 * Subtracts a duration from a date.
 *
 * @param {Date | string | number} date - The date.
 * @param {number} durationMs - The duration to subtract in milliseconds.
 * @returns {Date} A new Date object with the duration subtracted.
 */
export function subtractDuration(date: Date | string | number, durationMs: number): Date {
  const dateObj = typeof date === 'object' ? new Date(date) : new Date(date);
  return new Date(dateObj.getTime() - durationMs);
}

/**
 * Creates a stopwatch that can measure elapsed time.
 *
 * @returns {object} A stopwatch object with start, stop, reset, and getElapsed methods.
 */
export function createStopwatch() {
  let startTime: number | null = null;
  let totalElapsed = 0;
  let isRunning = false;

  return {
    start(): void {
      if (!isRunning) {
        startTime = Date.now();
        isRunning = true;
      }
    },

    stop(): number {
      if (isRunning && startTime !== null) {
        totalElapsed += Date.now() - startTime;
        isRunning = false;
        startTime = null;
      }
      return totalElapsed;
    },

    reset(): void {
      startTime = null;
      totalElapsed = 0;
      isRunning = false;
    },

    getElapsed(): number {
      if (isRunning && startTime !== null) {
        return totalElapsed + (Date.now() - startTime);
      }
      return totalElapsed;
    },

    isRunning(): boolean {
      return isRunning;
    },
  };
}

/**
 * Creates a countdown timer that can track time until a target.
 *
 * @param {Date | string | number} targetDate - The target date/time.
 * @returns {object} A countdown object with methods to check the remaining time.
 */
export function createCountdown(targetDate: Date | string | number) {
  const target = typeof targetDate === 'object' ? targetDate : new Date(targetDate);

  return {
    getRemaining(): number {
      return Math.max(0, target.getTime() - Date.now());
    },

    isExpired(): boolean {
      return Date.now() >= target.getTime();
    },

    getProgress(startDate: Date | string | number): number {
      const start = typeof startDate === 'object' ? startDate : new Date(startDate);
      const total = target.getTime() - start.getTime();
      const elapsed = Date.now() - start.getTime();
      return Math.min(100, (elapsed / total) * 100);
    },

    format(options?: { verbose?: boolean; maxUnits?: number; compact?: boolean }): string {
      return formatDuration(this.getRemaining(), options);
    },
  };
}
