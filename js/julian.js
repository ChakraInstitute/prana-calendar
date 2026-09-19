/*
 * julian.js — Julian Day <-> Gregorian calendar date conversions.
 * Standard algorithms from Jean Meeus, "Astronomical Algorithms", Ch. 7.
 * All Date objects here are treated as UTC instants.
 */

/** Convert a UTC JS Date to a Julian Day number (float). */
function pcDateToJD(date) {
  let Y = date.getUTCFullYear();
  let M = date.getUTCMonth() + 1;
  const D =
    date.getUTCDate() +
    (date.getUTCHours() +
      date.getUTCMinutes() / 60 +
      date.getUTCSeconds() / 3600) /
      24;

  if (M <= 2) {
    Y -= 1;
    M += 12;
  }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (Y + 4716)) +
    Math.floor(30.6001 * (M + 1)) +
    D +
    B -
    1524.5
  );
}

/** Convert a Julian Day number back to a UTC JS Date. */
function pcJDToDate(jd) {
  jd += 0.5;
  const Z = Math.floor(jd);
  const F = jd - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const dayWithFrac = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const dayInt = Math.floor(dayWithFrac);
  const dayFrac = dayWithFrac - dayInt;
  const totalSeconds = Math.round(dayFrac * 86400);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return new Date(Date.UTC(year, month - 1, dayInt, h, m, s));
}

/** Julian Day for a UTC calendar date at 12:00:00 UTC (no time-of-day component). */
function pcJDForNoonUTC(year, month, day) {
  return pcDateToJD(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}
