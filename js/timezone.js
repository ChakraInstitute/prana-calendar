/*
 * timezone.js — helpers for reading a UTC instant as local calendar
 * date/time in an arbitrary IANA timezone, using the Intl API (which
 * correctly handles DST transitions without any hardcoded offset table).
 */

/**
 * Return the local calendar date/time parts of `date` as seen in
 * `timeZone`: { year, month, day, hour, minute, second }.
 */
function pcLocalParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = parseInt(p.value, 10);
  }
  // hourCycle h23 can still report 24 for midnight in some engines; normalize.
  if (parts.hour === 24) parts.hour = 0;
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

/** Just the local calendar date, as { year, month, day }. */
function pcLocalDateOnly(date, timeZone) {
  const p = pcLocalParts(date, timeZone);
  return { year: p.year, month: p.month, day: p.day };
}

/** Add `n` days to a { year, month, day } tuple (calendar arithmetic, UTC-based). */
function pcAddDays(ymd, n) {
  const ms = Date.UTC(ymd.year, ymd.month - 1, ymd.day) + n * 86400000;
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/** Neutral day-counting timestamp for a { year, month, day } tuple. */
function pcDateOnlyMs(ymd) {
  return Date.UTC(ymd.year, ymd.month - 1, ymd.day);
}

/** Format a UTC instant as a local time string (e.g. "6:42 AM") in `timeZone`. */
function pcFormatLocalTime(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** Format a { year, month, day } tuple as e.g. "January 13, 2021". */
function pcFormatDateOnly(ymd) {
  const d = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}
