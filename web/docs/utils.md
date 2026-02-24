# Utilities Library

Typed, framework-agnostic helpers for common tasks. Import from `@/utils/...`.

## Strings

- `string.ts`
  - `slugify(input: string): string` – lowercases, removes diacritics, converts spaces/symbols to `-`.
  - `capitalize(input: string): string` – capitalizes first letter.
  - `titleCase(input: string): string` – capitalizes each whitespace-separated word.

## Numbers

- `number.ts`
  - `clamp(value, min, max): number` – restricts a value to a range.
  - `roundTo(value, decimals): number` – rounds to N decimals.
  - `between(value, min, max): boolean` – range check inclusive.
- `number-to-words.ts`
  - `numberToWords(num: number): string` – converts integer to English words.

## Random / IDs

- `random-int.ts`
  - `randomInt(min, max): number` – inclusive integer.
- `random-string.ts`
  - `generateRandomString(length): string` – alphanumeric.
- `generate-uuid.ts`
  - `generateUUIDv1() | v3(name, namespace) | v4() | v5(name, namespace)` – uuid via `uuid`.

## Objects / Arrays

- `unique.ts`
  - `unique<T>(array: T[]): T[]` – deduplicates via Set.
- `is-empty-object.ts`
  - `isEmptyObject(value: unknown): value is Record<string, never>` – narrow to empty plain object.

## Date & Time Utilities

### Timestamps

- `timestamp.ts`
  - `generateTimestamp(): string` – ISO 8601 timestamp for current time.
  - `generateUnixTimestamp(): number` – Unix timestamp in seconds.
  - `generateUnixTimestampMs(): number` – Unix timestamp in milliseconds.
  - `generateReadableTimestamp(date?): string` – human-readable format (e.g., "2024-10-12 14:30:45").
  - `generateFileTimestamp(date?): string` – compact format for filenames (e.g., "20241012_143045").
  - `generateDateStamp(date?): string` – date-only format (e.g., "2024-10-12").
  - `generateTimeStamp(date?): string` – time-only format (e.g., "14:30:45").
  - `generatePreciseTimestamp(date?): string` – timestamp with milliseconds.
  - `generateCustomTimestamp(format, date?): string` – custom format (supports YYYY, MM, DD, HH, mm, ss, SSS).
  - `parseTimestamp(timestamp): Date | null` – parses various timestamp formats.
  - `isTimestampExpired(timestamp, durationMs): boolean` – checks if a timestamp is expired.
  - `getTimestampAge(timestamp): number` – gets the age in milliseconds.
  - `compareTimestamps(ts1, ts2): -1 | 0 | 1` – compares two timestamps.

### Date & Time Formatting

- `date-time.ts`
  - `formatDate(date, locale?, options?)` – flexible date formatting using Intl.
  - `formatTime(date, locale?, options?)` – flexible time formatting.
  - `formatDateTime(date, locale?, options?)` – combined date-time formatting.
  - `convertUnixTimestamp(timestamp, locale?, dateOptions?, timeOptions?)` → `{ date, time }` – robust formatting with sensible defaults.
  - `getRelativeTime(date, locale?, baseDate?)` – relative time (e.g., "2 hours ago", "in 3 days").
  - `toISO(date): string` – converts to ISO 8601 string.
  - `parseISO(isoString): Date | null` – parses ISO 8601 string.
  - `getUnixTimestamp(): number` – current Unix timestamp in seconds.
  - `toUnixTimestamp(date): number` – converts Date to Unix timestamp.
  - `fromUnixTimestamp(timestamp): Date` – converts Unix timestamp to Date.

### Date Comparisons & Checks

- `date-time.ts`
  - `isToday(date): boolean` – checks if date is today.
  - `isYesterday(date): boolean` – checks if date is yesterday.
  - `isTomorrow(date): boolean` – checks if date is tomorrow.
  - `isPast(date): boolean` – checks if date is in the past.
  - `isFuture(date): boolean` – checks if date is in the future.
  - `isSameDay(date1, date2): boolean` – checks if two dates are on the same day.
  - `isValidDate(date): boolean` – validates a date.
  - `isLeapYear(year): boolean` – checks if a year is a leap year.
  - `getDaysInMonth(year, month): number` – gets number of days in a month.

### Date Manipulation

- `date-time.ts`
  - `startOfDay(date): Date` – gets start of day (00:00:00.000).
  - `endOfDay(date): Date` – gets end of day (23:59:59.999).
  - `startOfWeek(date, weekStartsOn?): Date` – gets start of week.
  - `endOfWeek(date, weekStartsOn?): Date` – gets end of week.
  - `startOfMonth(date): Date` – gets start of month.
  - `endOfMonth(date): Date` – gets end of month.
  - `startOfYear(date): Date` – gets start of year.
  - `endOfYear(date): Date` – gets end of year.
  - `addDays(date, days): Date` – adds days to a date.
  - `addHours(date, hours): Date` – adds hours to a date.
  - `addMinutes(date, minutes): Date` – adds minutes to a date.
  - `addMonths(date, months): Date` – adds months to a date.
  - `addYears(date, years): Date` – adds years to a date.

### Date Differences

- `date-time.ts`
  - `differenceInMs(date1, date2): number` – difference in milliseconds.
  - `differenceInSeconds(date1, date2): number` – difference in seconds.
  - `differenceInMinutes(date1, date2): number` – difference in minutes.
  - `differenceInHours(date1, date2): number` – difference in hours.
  - `differenceInDays(date1, date2): number` – difference in days.

### Timezone Utilities

- `timezone.ts`
  - `getUserTimezone(): string` – gets user's IANA timezone identifier.
  - `getTimezoneOffset(date, timezone?): number` – gets timezone offset in minutes.
  - `convertTimezone(date, fromTz, toTz): Date` – converts date between timezones.
  - `formatInTimezone(date, timezone, locale?, options?)` – formats date in specific timezone.
  - `getTimezoneAbbreviation(date, timezone?, locale?)` – gets timezone abbreviation (e.g., "EST").
  - `getTimezoneName(date, timezone?, locale?)` – gets full timezone name (e.g., "Eastern Standard Time").
  - `isDaylightSavingTime(date, timezone?): boolean` – checks if DST is active.
  - `getUTCOffsetString(date, timezone?): string` – gets UTC offset (e.g., "+05:30").
  - `getCommonTimezones()` – returns common timezones grouped by region.
  - `isValidTimezone(timezone): boolean` – validates a timezone identifier.
  - `getTimeInTimezones(timezones, date?): Record<string, string>` – gets current time in multiple timezones.
  - `toUTC(date): Date` – converts to UTC.
  - `nowInTimezone(timezone): Date` – gets current time in a timezone.
  - `scheduleInTimezone(targetTime, timezone, callback)` – schedules a callback in a timezone.

### Duration Utilities

- `duration.ts`
  - `TIME_CONSTANTS` – constants for MILLISECOND, SECOND, MINUTE, HOUR, DAY, WEEK, MONTH, YEAR.
  - `msToSeconds(ms): number` / `msToMinutes(ms)` / `msToHours(ms)` / `msToDays(ms)` / `msToWeeks(ms)` – converts milliseconds to other units.
  - `secondsToMs(s): number` / `minutesToMs(m)` / `hoursToMs(h)` / `daysToMs(d)` / `weeksToMs(w)` – converts units to milliseconds.
  - `parseDuration(duration): number` – parses duration strings (e.g., "2h 30m", "1d 12h").
  - `formatDuration(ms, options?)` – formats milliseconds into readable duration.
  - `formatTime(ms, options?)` – formats as colon-separated time (e.g., "2:30:45").
  - `getDuration(startDate, endDate): number` – gets duration between dates in milliseconds.
  - `hasElapsed(date, durationMs): boolean` – checks if duration has elapsed.
  - `getRemainingTime(date, durationMs): number` – gets remaining time until expiration.
  - `getDurationProgress(startDate, durationMs): number` – gets progress percentage (0-100).
  - `roundDuration(ms, unit): number` – rounds duration to nearest unit.
  - `addDuration(date, durationMs): Date` – adds duration to date.
  - `subtractDuration(date, durationMs): Date` – subtracts duration from date.
  - `createStopwatch()` – creates a stopwatch with start/stop/reset/getElapsed methods.
  - `createCountdown(targetDate)` – creates a countdown timer with tracking methods.

### Calendar Utilities

- `calendar.ts`
  - `DAYS_OF_WEEK` / `MONTHS` – constants for days and months.
  - `getDayOfWeek(date): number` – gets day of week (0=Sunday).
  - `getDayName(date, locale?, format?)` – gets day name (e.g., "Monday").
  - `getMonthName(date, locale?, format?)` – gets month name (e.g., "January").
  - `getWeekNumber(date): number` – gets ISO 8601 week number.
  - `getQuarter(date): 1 | 2 | 3 | 4` – gets quarter of year.
  - `startOfQuarter(date): Date` / `endOfQuarter(date): Date` – quarter boundaries.
  - `isWeekend(date): boolean` / `isWeekday(date): boolean` – checks day type.
  - `getNextDayOfWeek(dayOfWeek, fromDate?): Date` – gets next occurrence of a day.
  - `getPreviousDayOfWeek(dayOfWeek, fromDate?): Date` – gets previous occurrence.
  - `getDatesInMonth(year, month): Date[]` – all dates in a month.
  - `getWeekdaysInMonth(year, month): Date[]` – all weekdays in a month.
  - `getWeekendsInMonth(year, month): Date[]` – all weekend dates in a month.
  - `getDateRange(startDate, endDate): Date[]` – array of dates in range.
  - `isInDateRange(date, startDate, endDate): boolean` – checks if date is in range.
  - `daysBetween(date1, date2): number` – days between dates.
  - `weekdaysBetween(startDate, endDate): number` – weekdays between dates.
  - `weekendsBetween(startDate, endDate): number` – weekends between dates.
  - `addBusinessDays(date, days): Date` – adds business days (skips weekends).
  - `getFiscalYear(date, fiscalYearStartMonth?): number` – gets fiscal year.
  - `getAge(birthDate, currentDate?): number` – calculates age in years.
  - `isBirthday(date, birthDate): boolean` – checks if date is a birthday.
  - `getNextBirthday(birthDate, fromDate?): Date` – gets next birthday date.
  - `getDayOccurrencesInMonth(year, month, dayOfWeek): Date[]` – all occurrences of a day in month.
  - `getNthDayOfMonth(year, month, dayOfWeek, occurrence): Date | null` – nth occurrence of a day.
  - `doDateRangesOverlap(start1, end1, start2, end2): boolean` – checks if ranges overlap.
  - `mergeDateRanges(ranges): Array<[Date, Date]>` – merges overlapping ranges.

### Time Parsing

- `time-parser.ts`
  - `parseTime(timeString, baseDate?): Date | null` – parses time strings (12/24-hour formats).
  - `parseDate(dateString): Date | null` – parses date strings (ISO, US, European formats).
  - `parseDateTime(dateTimeString): Date | null` – parses combined date-time strings.
  - `parseRelativeTime(relativeString, baseDate?): Date | null` – parses "2 hours ago", "in 3 days", etc.
  - `parseNaturalDate(naturalString, baseDate?): Date | null` – parses "next Monday", "last Friday", etc.
  - `parseAny(input, baseDate?): Date | null` – attempts all parsing strategies.
  - `isValidTimeString(timeString): boolean` – validates time format.
  - `isValidDateString(dateString): boolean` – validates date format.
  - `extractTimeComponents(timeString)` – extracts hours, minutes, seconds, period.
  - `extractDateComponents(dateString)` – extracts year, month, day.

## URL

- `url.ts`
  - `absoluteUrl(path: string): string` – builds an absolute URL from `NEXT_PUBLIC_APP_URL`.

## Files / MDX

- `files.ts`
  - `getFilesByExtension(dir, ext='.mdx')` – list files.
  - `readFileContent(filePath, encoding='utf-8')` – safe read.
  - `getSlugFromFile(filePath)` – filename without extension.
  - `ensureDirectoryExists(dir)` – recursive mkdir.
- `mdx/mdx-parser.ts`
  - `mdxParser(fileContent)` → `{ metadata, content }` – simple front‑matter parser.
- `mdx/get-mdx-data.ts`
  - `getMDXData(filePath)` – `{ slug, metadata, content }` per file.
  - `getMDXPages(directory)` – array of page data; `getMDXPage(slug, dir)`; `getMDXPagePaths(dir)`.

## Promises / Control Flow

- `promise.ts`
  - `sleep(ms)` – delay helper.
  - `withTimeout(promise, ms, message?)` – reject if promise doesn’t resolve in time.
  - `retry(fn, { retries=3, delayMs=250, factor=2 })` – exponential backoff retry.
  - `invariant(condition, message)` – runtime assertion with TS `asserts`.

## Storage helpers (simple functions)

- `local-storage.ts`
  - `getLocalStorageData(key)` – parse JSON or `null`.
  - `setLocalStorageData(key, data)` – stringify JSON.
- `session-storage.ts`
  - `getSessionStorageData(key)` / `setSessionStorageData(key, data)` – sessionStorage variants.

## Zod utilities

- `zod/file-types.ts` – common allowed mime types (images/videos/audio/docs).
- `zod/validation.ts` – email/url/string/number/date/password checks, and file validators using Zod v4; helpers return `{ valid, message }`.

## Import examples

```ts
// Numbers & Strings
import { addBusinessDays, getWeekdaysInMonth, isWeekend } from '@/utils/calendar';
// Date & Time
import { addDays, formatDate, formatTime, isToday } from '@/utils/date-time';
import { createStopwatch, formatDuration, parseDuration } from '@/utils/duration';
import { clamp, roundTo } from '@/utils/number';
// Promises & Control Flow
import { retry, sleep, withTimeout } from '@/utils/promise';
import { capitalize, slugify } from '@/utils/string';
import { parseAny, parseRelativeTime, parseTime } from '@/utils/time-parser';
import { generateFileTimestamp, generateTimestamp } from '@/utils/timestamp';
import { convertTimezone, formatInTimezone, getUserTimezone } from '@/utils/timezone';
import { unique } from '@/utils/unique';
// Other
import { absoluteUrl } from '@/utils/url';
```

## Usage Examples

### Date & Time

```ts
// Formatting dates

// "2h 30m"

// Working with calendars
import { addBusinessDays, getNextBirthday, isWeekend } from '@/utils/calendar';
import { formatDate, getRelativeTime } from '@/utils/date-time';
// "October 13, 2024 at 03:30 JST"

// Parsing durations
import { formatDuration, parseDuration } from '@/utils/duration';
// Next Dec 25th

// Parsing time strings
import { parseRelativeTime, parseTime } from '@/utils/time-parser';
// "2 days ago"

// Working with timezones
import { formatInTimezone, getUserTimezone } from '@/utils/timezone';

formatDate(new Date(), 'en-US', { month: 'short', day: 'numeric' }); // "Oct 12"
getRelativeTime(new Date('2024-10-10'));

const userTz = getUserTimezone(); // "America/New_York"
formatInTimezone(new Date(), 'Asia/Tokyo');

const ms = parseDuration('2h 30m'); // 9000000
formatDuration(ms);

isWeekend(new Date('2024-10-12')); // true (Saturday)
addBusinessDays(new Date('2024-10-11'), 5); // Skips weekends
getNextBirthday(new Date('1990-12-25'));

parseTime('2:30 PM'); // Date object with 14:30
parseRelativeTime('2 hours ago'); // Date object 2 hours in past
```

Notes

- Utilities are pure and typed; prefer passing options over global state.
- File/MDX helpers assume Node environment (server-side usage).
- All date utilities accept `Date`, ISO strings, or timestamps as input.
- Timezone utilities use IANA timezone identifiers (e.g., "America/New_York").
