# Time Utilities

Comprehensive date, time, timezone, and calendar utilities for your Next.js application.

## Overview

The time utilities provide a complete suite of functions for working with dates, times, timezones, durations, calendars, and time parsing. All utilities are:

- **Fully typed** with TypeScript
- **Framework-agnostic** (can be used in any JavaScript/TypeScript project)
- **Pure functions** with no side effects
- **Well-documented** with JSDoc comments
- **Flexible** - accept Date objects, ISO strings, or timestamps as input

## Utilities

### 1. `date-time.ts` - Core Date & Time Functions

Comprehensive date and time manipulation and formatting utilities.

**Formatting:**

- `formatDate(date, locale?, options?)` - Format dates with Intl.DateTimeFormat
- `formatTime(date, locale?, options?)` - Format times
- `formatDateTime(date, locale?, options?)` - Format date and time together
- `getRelativeTime(date, locale?, baseDate?)` - Get relative time strings ("2 hours ago")

**Comparisons:**

- `isToday(date)`, `isYesterday(date)`, `isTomorrow(date)`
- `isPast(date)`, `isFuture(date)`
- `isSameDay(date1, date2)`
- `isValidDate(date)`, `isLeapYear(year)`

**Manipulation:**

- `startOfDay(date)`, `endOfDay(date)`
- `startOfWeek(date)`, `endOfWeek(date)`
- `startOfMonth(date)`, `endOfMonth(date)`
- `startOfYear(date)`, `endOfYear(date)`
- `addDays(date, days)`, `addHours(date, hours)`, `addMinutes(date, minutes)`
- `addMonths(date, months)`, `addYears(date, years)`

**Differences:**

- `differenceInMs(date1, date2)`
- `differenceInSeconds(date1, date2)`
- `differenceInMinutes(date1, date2)`
- `differenceInHours(date1, date2)`
- `differenceInDays(date1, date2)`

**Unix Timestamps:**

- `getUnixTimestamp()` - Current Unix timestamp in seconds
- `toUnixTimestamp(date)` - Convert Date to Unix timestamp
- `fromUnixTimestamp(timestamp)` - Convert Unix timestamp to Date
- `convertUnixTimestamp(timestamp, locale?, dateOptions?, timeOptions?)` - Format Unix
  timestamp

### 2. `timezone.ts` - Timezone Operations

Complete timezone handling including conversions, formatting, and DST detection.

**Basic Timezone Info:**

- `getUserTimezone()` - Get user's IANA timezone identifier
- `getTimezoneOffset(date, timezone?)` - Get timezone offset in minutes
- `getTimezoneAbbreviation(date, timezone?, locale?)` - Get abbreviation ("EST", "PDT")
- `getTimezoneName(date, timezone?, locale?)` - Get full name ("Eastern Standard Time")
- `getUTCOffsetString(date, timezone?)` - Get UTC offset string ("+05:30")

**Timezone Conversions:**

- `convertTimezone(date, fromTz, toTz)` - Convert date between timezones
- `formatInTimezone(date, timezone, locale?, options?)` - Format date in specific timezone
- `toUTC(date)` - Convert to UTC
- `nowInTimezone(timezone)` - Get current time in a timezone

**Timezone Utilities:**

- `isDaylightSavingTime(date, timezone?)` - Check if DST is active
- `isValidTimezone(timezone)` - Validate timezone identifier
- `getCommonTimezones()` - Get common timezones grouped by region
- `getTimeInTimezones(timezones, date?)` - Get time in multiple timezones
- `scheduleInTimezone(targetTime, timezone, callback)` - Schedule callback in timezone

### 3. `timestamp.ts` - Timestamp Generation & Parsing

Various timestamp formats for different use cases.

**Generation:**

- `generateTimestamp()` - ISO 8601 timestamp
- `generateUnixTimestamp()` - Unix timestamp in seconds
- `generateUnixTimestampMs()` - Unix timestamp in milliseconds
- `generateReadableTimestamp(date?)` - Human-readable format
- `generateFileTimestamp(date?)` - Compact format for filenames
- `generateDateStamp(date?)` - Date-only format
- `generateTimeStamp(date?)` - Time-only format
- `generatePreciseTimestamp(date?)` - With milliseconds
- `generateCustomTimestamp(format, date?)` - Custom format string
- `generateRFC3339Timestamp(date?)` - RFC 3339 format
- `generateRFC2822Timestamp(date?)` - RFC 2822 format

**Parsing & Utilities:**

- `parseTimestamp(timestamp)` - Parse various timestamp formats
- `isTimestampExpired(timestamp, durationMs)` - Check if expired
- `getTimestampAge(timestamp)` - Get age in milliseconds
- `compareTimestamps(ts1, ts2)` - Compare two timestamps

### 4. `duration.ts` - Duration Handling

Work with time durations, intervals, and time spans.

**Constants:**

- `TIME_CONSTANTS` - Predefined time values in milliseconds

**Conversions:**

- `msToSeconds(ms)`, `msToMinutes(ms)`, `msToHours(ms)`, `msToDays(ms)`, `msToWeeks(ms)`
- `secondsToMs(s)`, `minutesToMs(m)`, `hoursToMs(h)`, `daysToMs(d)`, `weeksToMs(w)`

**Duration Parsing & Formatting:**

- `parseDuration(duration)` - Parse duration strings ("2h 30m", "1d 12h")
- `formatDuration(ms, options?)` - Format milliseconds to readable string
- `formatTime(ms, options?)` - Format as colon-separated time ("2:30:45")

**Duration Operations:**

- `getDuration(startDate, endDate)` - Get duration between dates
- `hasElapsed(date, durationMs)` - Check if duration has elapsed
- `getRemainingTime(date, durationMs)` - Get remaining time
- `getDurationProgress(startDate, durationMs)` - Get progress percentage
- `roundDuration(ms, unit)` - Round to nearest unit
- `addDuration(date, durationMs)`, `subtractDuration(date, durationMs)`

**Utilities:**

- `createStopwatch()` - Stopwatch with start/stop/reset/getElapsed methods
- `createCountdown(targetDate)` - Countdown timer with tracking methods

### 5. `calendar.ts` - Calendar & Date Range Operations

Advanced calendar operations, date ranges, and business day calculations.

**Day & Month Info:**

- `getDayOfWeek(date)`, `getDayName(date, locale?, format?)`
- `getMonthName(date, locale?, format?)`
- `getWeekNumber(date)` - ISO 8601 week number
- `getQuarter(date)`, `startOfQuarter(date)`, `endOfQuarter(date)`

**Day Type Checks:**

- `isWeekend(date)`, `isWeekday(date)`
- `getNextDayOfWeek(dayOfWeek, fromDate?)`
- `getPreviousDayOfWeek(dayOfWeek, fromDate?)`

**Date Collections:**

- `getDatesInMonth(year, month)` - All dates in month
- `getWeekdaysInMonth(year, month)` - All weekdays in month
- `getWeekendsInMonth(year, month)` - All weekends in month
- `getDateRange(startDate, endDate)` - Array of dates in range
- `getDayOccurrencesInMonth(year, month, dayOfWeek)` - All occurrences of a day
- `getNthDayOfMonth(year, month, dayOfWeek, occurrence)` - Nth occurrence

**Date Range Operations:**

- `isInDateRange(date, startDate, endDate)` - Check if date is in range
- `daysBetween(date1, date2)` - Days between dates
- `weekdaysBetween(startDate, endDate)` - Weekdays between dates
- `weekendsBetween(startDate, endDate)` - Weekends between dates
- `doDateRangesOverlap(start1, end1, start2, end2)` - Check overlap
- `mergeDateRanges(ranges)` - Merge overlapping ranges

**Business & Fiscal:**

- `addBusinessDays(date, days)` - Add business days (skip weekends)
- `getFiscalYear(date, fiscalYearStartMonth?)` - Get fiscal year

**Age & Birthdays:**

- `getAge(birthDate, currentDate?)` - Calculate age in years
- `isBirthday(date, birthDate)` - Check if date is a birthday
- `getNextBirthday(birthDate, fromDate?)` - Get next birthday date

### 6. `time-parser.ts` - Flexible Time Parsing

Parse various time and date formats including natural language.

**Basic Parsing:**

- `parseTime(timeString, baseDate?)` - Parse "2:30 PM", "14:30", etc.
- `parseDate(dateString)` - Parse ISO, US, European date formats
- `parseDateTime(dateTimeString)` - Parse combined date-time strings

**Advanced Parsing:**

- `parseRelativeTime(relativeString, baseDate?)` - Parse "2 hours ago", "in 3 days"
- `parseNaturalDate(naturalString, baseDate?)` - Parse "next Monday", "last Friday"
- `parseAny(input, baseDate?)` - Try all parsing strategies

**Validation & Extraction:**

- `isValidTimeString(timeString)`, `isValidDateString(dateString)`
- `extractTimeComponents(timeString)` - Get hours, minutes, seconds, period
- `extractDateComponents(dateString)` - Get year, month, day

## Usage Examples

### Basic Date Formatting

```ts
import { formatDate, formatDateTime, formatTime } from '@/utils/date-time';

const now = new Date();

formatDate(now); // "October 12, 2024"
formatTime(now); // "02:30 PM"
formatDateTime(now); // "October 12, 2024 at 02:30 PM"

// Custom formatting
formatDate(now, 'en-US', {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}); // "Sat, Oct 12, 2024"
```

### Relative Time

```ts
import { getRelativeTime } from '@/utils/date-time';

const pastDate = new Date('2024-10-10');
getRelativeTime(pastDate); // "2 days ago"

const futureDate = new Date('2024-10-15');
getRelativeTime(futureDate); // "in 3 days"
```

### Working with Timezones

```ts
import { convertTimezone, formatInTimezone, getUserTimezone } from '@/utils/timezone';

// Get user's timezone
const userTz = getUserTimezone(); // "America/New_York"

// Format date in specific timezone
const date = new Date();
formatInTimezone(date, 'Asia/Tokyo'); // "October 13, 2024 at 03:30 JST"

// Convert between timezones
const nyTime = new Date('2024-10-12T14:30:00');
const tokyoTime = convertTimezone(nyTime, 'America/New_York', 'Asia/Tokyo');
```

### Duration Parsing and Formatting

```ts
import { createStopwatch, formatDuration, parseDuration } from '@/utils/duration';

// Parse duration strings
const ms = parseDuration('2h 30m 15s'); // 9015000

// Format durations
formatDuration(ms); // "2h 30m"
formatDuration(ms, { verbose: true }); // "2 hours 30 minutes"

// Use stopwatch
const stopwatch = createStopwatch();
stopwatch.start();
// ... do something
stopwatch.stop();
console.log(`Elapsed: ${formatDuration(stopwatch.getElapsed())}`);
```

### Calendar Operations

```ts
import { addBusinessDays, getNextBirthday, getWeekdaysInMonth, isWeekend } from '@/utils/calendar';

// Check if weekend
isWeekend(new Date('2024-10-12')); // true (Saturday)

// Add business days (skips weekends)
const startDate = new Date('2024-10-11'); // Friday
const result = addBusinessDays(startDate, 3); // Following Wednesday

// Get all weekdays in October 2024
const weekdays = getWeekdaysInMonth(2024, 9); // Returns array of Date objects

// Get next birthday
const birthDate = new Date('1990-12-25');
const nextBirthday = getNextBirthday(birthDate); // Next Dec 25th
```

### Time Parsing

```ts
import { parseAny, parseNaturalDate, parseRelativeTime, parseTime } from '@/utils/time-parser';

// Parse time strings
parseTime('2:30 PM'); // Date object at 14:30
parseTime('14:30'); // Date object at 14:30

// Parse relative time
parseRelativeTime('2 hours ago'); // Date object 2 hours in past
parseRelativeTime('in 3 days'); // Date object 3 days in future

// Parse natural language
parseNaturalDate('next Monday'); // Date object for next Monday
parseNaturalDate('last Friday'); // Date object for last Friday

// Try all strategies
parseAny('tomorrow'); // Date object for tomorrow
parseAny('2024-10-12'); // Parsed date
parseAny('2:30 PM'); // Parsed time
```

### Date Manipulation

```ts
import { addDays, differenceInDays, endOfDay, startOfDay } from '@/utils/date-time';

const date = new Date('2024-10-12T14:30:00');

// Get boundaries
const start = startOfDay(date); // 2024-10-12 00:00:00.000
const end = endOfDay(date); // 2024-10-12 23:59:59.999

// Add/subtract time
const tomorrow = addDays(date, 1);
const lastWeek = addDays(date, -7);

// Calculate differences
const date1 = new Date('2024-10-01');
const date2 = new Date('2024-10-12');
differenceInDays(date2, date1); // 11
```

### Advanced: Date Ranges

```ts
import { getDateRange, mergeDateRanges, weekdaysBetween } from '@/utils/calendar';

// Get all dates in range
const start = new Date('2024-10-01');
const end = new Date('2024-10-07');
const dates = getDateRange(start, end); // Array of 7 dates

// Count weekdays in range
const weekdayCount = weekdaysBetween(start, end); // 5

// Merge overlapping date ranges
const ranges: Array<[Date, Date]> = [
  [new Date('2024-10-01'), new Date('2024-10-05')],
  [new Date('2024-10-04'), new Date('2024-10-10')],
  [new Date('2024-10-15'), new Date('2024-10-20')],
];
const merged = mergeDateRanges(ranges); // 2 merged ranges
```

## Best Practices

1. **Use ISO 8601 for storage**: Always store dates as ISO strings or Unix timestamps in your
   database
2. **Format for display only**: Format dates for display in the user's locale and timezone
3. **Timezone awareness**: Always be explicit about timezones when dealing with dates across
   locations
4. **Business days**: Use calendar utilities for business day calculations
5. **Validation**: Always validate parsed dates and times before using them
6. **Performance**: Cache timezone calculations if performing many operations

## Type Support

All utilities are fully typed with TypeScript. Most functions accept flexible input types:

```ts
// These are equivalent
formatDate(new Date());
formatDate('2024-10-12');
formatDate(1697123400000);
```

## Notes

- All date utilities use the native JavaScript `Date` object
- Timezone utilities use IANA timezone identifiers (e.g., "America/New_York")
- Duration utilities work with milliseconds internally
- Calendar utilities follow ISO 8601 standards where applicable
- All functions are pure and have no side effects
- Utilities are framework-agnostic and can be used in any JavaScript/TypeScript project

## See Also

- [Main Utilities Documentation](./utils.md)
- [Hooks Documentation](./hooks.md)
- [Code Style Guide](./code-style.md)
