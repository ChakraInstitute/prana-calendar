/*
 * day-lord.js — day-of-week color, planetary ruler, and mantra.
 * Index 0 = Sunday ... 6 = Saturday, matching Date.getUTCDay().
 */

const PC_DAY_LORDS = [
  {
    day: 'Sunday',
    colorLabel: 'Gold',
    colors: ['#D4AF37'],
    planet: 'Sun',
    mantra: 'Om Suryaya Namah',
  },
  {
    day: 'Monday',
    colorLabel: 'Light Blue / Silver',
    colors: ['#AFCBE3', '#C0C0C0'],
    planet: 'Moon',
    mantra: 'Om Som Somaya Namah',
  },
  {
    day: 'Tuesday',
    colorLabel: 'Orange / Red',
    colors: ['#E2672A', '#C0392B'],
    planet: 'Mars',
    mantra: 'Om Mangalaya Namah',
  },
  {
    day: 'Wednesday',
    colorLabel: 'Green',
    colors: ['#4C9A5B'],
    planet: 'Mercury',
    mantra: 'Om Budhaya Namah',
  },
  {
    day: 'Thursday',
    colorLabel: 'Yellow',
    colors: ['#F1C232'],
    planet: 'Jupiter',
    mantra: 'Om Gurudevaya Namah',
  },
  {
    day: 'Friday',
    colorLabel: 'White / Multi',
    colors: ['#FFFFFF', '#F5D3E0', '#D3E6F5', '#E7F5D3'],
    planet: 'Venus',
    mantra: 'Om Shukraya Namah',
  },
  {
    day: 'Saturday',
    colorLabel: 'Black / Navy Blue',
    colors: ['#141414', '#1B2A4A'],
    planet: 'Saturn',
    mantra: 'Om Shanaishcharaya Namah',
  },
];

/** Day-of-week index (0=Sunday..6=Saturday) for a local calendar date.
 *  Day-of-week is a property of the calendar date itself, not of a
 *  timezone, so no zone conversion is needed here. */
function pcWeekdayIndex(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function pcGetDayLord(year, month, day) {
  return PC_DAY_LORDS[pcWeekdayIndex(year, month, day)];
}

/** CSS background value for a day-lord's swatch (solid color, or an even
 *  split gradient when more than one color is listed). */
function pcSwatchBackground(colors) {
  if (colors.length === 1) return colors[0];
  const step = 100 / colors.length;
  const stops = colors
    .map((c, i) => `${c} ${i * step}%, ${c} ${(i + 1) * step}%`)
    .join(', ');
  return `linear-gradient(135deg, ${stops})`;
}
