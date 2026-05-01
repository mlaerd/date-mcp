import { DateTime, Duration } from 'luxon';

// Time unit names for display
export const timeUnits = {
  seconds: 'second',
  minutes: 'minute',
  hours: 'hour',
  days: 'day',
  weeks: 'week',
  months: 'month',
  years: 'year'
} as const;

// Get week number for a DateTime
export function getWeekNumber(dt: DateTime): number {
  return dt.weekNumber;
}

// Get day of year for a DateTime
export function getDayOfYear(dt: DateTime): number {
  return dt.ordinal;
}

// Get human-readable time difference
export function getHumanReadableDiff(dt1: DateTime, dt2: DateTime): string {
  // Use Luxon's relative time formatting
  return dt1.toRelative({ base: dt2 }) || 'now';
}

// Get date components for a given DateTime
export function getDateComponents(dt: DateTime) {
  return {
    year: dt.year,
    month: dt.month,
    day: dt.day,
    hour: dt.hour,
    minute: dt.minute,
    second: dt.second,
    dayOfWeek: dt.weekday === 7 ? 0 : dt.weekday, // Convert Sunday from 7 to 0
    weekOfYear: dt.weekNumber,
    offset: -dt.offset, // Negate to match JavaScript's getTimezoneOffset convention
  };
}

// Get date context information
export function getDateContext(dt: DateTime) {
  return {
    isWeekend: dt.weekday >= 6, // Saturday = 6, Sunday = 7 in Luxon
    quarter: dt.quarter,
    dayOfYear: dt.ordinal,
    daysInMonth: dt.daysInMonth,
  };
}

// Format date information in various formats
export function formatDateInfo(dt: DateTime, locale: string = 'ja-JP') {
  return {
    iso: dt.toISO() || '',
    unix: Math.floor(dt.toSeconds()),
    human: dt.setLocale(locale).toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
    milliseconds: dt.toMillis(),
  };
}

// Parse date with optional timezone fallback
export function parseDateWithTimezone(dateStr: string, fallbackTimezone?: string): DateTime | null {
  // Check if the string has explicit timezone information
  const hasTimezone = /[+-]\d{2}:\d{2}|Z$/.test(dateStr);
  
  if (hasTimezone) {
    // Parse with timezone info
    return DateTime.fromISO(dateStr);
  }
  
  // No timezone in string, use fallback if provided
  if (fallbackTimezone) {
    // Parse as local time in the specified timezone
    const dt = DateTime.fromISO(dateStr, { zone: 'UTC' }).setZone(fallbackTimezone, { keepLocalTime: true });
    if (dt.isValid) return dt;
  }
  
  // No fallback timezone, parse as local/UTC
  return DateTime.fromISO(dateStr);
}

// Add duration to a DateTime
export function addDuration(dt: DateTime, amount: number, unit: keyof typeof timeUnits): DateTime {
  const durationObj: any = {};
  durationObj[unit] = amount;
  return dt.plus(Duration.fromObject(durationObj));
}

// Calculate the difference between two DateTimes
export function calculateDifference(dt1: DateTime, dt2: DateTime) {
  // 1. ミリ秒単位での絶対差分を取得（Luxon経由ではなく標準のミリ秒計算が確実）
  const ms1 = dt1.toMillis();
  const ms2 = dt2.toMillis();
  const absDiffMs = Math.abs(ms1 - ms2);

  // 2. 各単位への換算（354〜355日を正しく出すための累積計算）
  return {
    milliseconds: absDiffMs,
    seconds: Math.floor(absDiffMs / 1000),
    minutes: Math.floor(absDiffMs / (1000 * 60)),
    hours: Math.floor(absDiffMs / (1000 * 60 * 60)),
    days: Math.floor(absDiffMs / (1000 * 60 * 60 * 24)),
    weeks: Math.floor(absDiffMs / (1000 * 60 * 60 * 24 * 7)),
    // 月と年はカレンダー計算が必要なため Luxon の単一単位 diff を使用
    months: Math.floor(Math.abs(dt1.diff(dt2, 'months').months)),
    years: Math.floor(Math.abs(dt1.diff(dt2, 'years').years)),
  };
}