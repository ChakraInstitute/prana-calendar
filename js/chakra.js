/*
 * chakra.js — Chakra Energy Timer.
 *
 * Rules:
 *  - The day splits into two cycles: daytime (sunrise -> sunset) and
 *    nighttime (sunset -> next sunrise).
 *  - Each cycle is divided into 7 equal periods.
 *  - Both cycles run the same fixed chakra order, starting at chakra 3:
 *    3, 4, 5, 6, 7, 1, 2 — chakra 3 always lands exactly on sunrise (for
 *    the day cycle) or sunset (for the night cycle).
 *  - "Right now" is real, live current time — this is a timer, not tied
 *    to whatever historical date is picked for the nostril calculation.
 */

const PC_CHAKRAS = [
  { number: 1, sanskrit: 'Muladhara', english: 'Root' },
  { number: 2, sanskrit: 'Svadhisthana', english: 'Sacral' },
  { number: 3, sanskrit: 'Manipura', english: 'Solar Plexus' },
  { number: 4, sanskrit: 'Anahata', english: 'Heart' },
  { number: 5, sanskrit: 'Vishuddha', english: 'Throat' },
  { number: 6, sanskrit: 'Ajna', english: 'Third Eye' },
  { number: 7, sanskrit: 'Sahasrara', english: 'Crown' },
];

// Fixed sequence of chakra numbers for one cycle (day or night alike),
// starting at chakra 3.
const PC_CHAKRA_CYCLE_ORDER = [3, 4, 5, 6, 7, 1, 2];

function pcChakraInfo(number) {
  return PC_CHAKRAS[number - 1];
}

/**
 * Determine the current chakra period for a location, at a given moment
 * (defaults to right now).
 *
 * Returns null if sunrise/sunset can't be determined for the relevant
 * date(s) at this location (polar day/night), or:
 * {
 *   cycleLabel: 'Daytime' | 'Nighttime',
 *   cycleStart, cycleEnd,      // Date (UTC) — full cycle bounds
 *   periodIndex,               // 0-6, position within PC_CHAKRA_CYCLE_ORDER
 *   periodStart, periodEnd,    // Date (UTC) — bounds of the active period
 *   chakraNumber, chakra,      // active chakra
 *   nextChakraNumber, nextChakra,
 *   elapsedFraction,           // 0-1 progress through the whole cycle
 * }
 */
function pcGetCurrentChakraStatus(lat, lon, timezone, now) {
  now = now || new Date();
  const todayLocal = pcLocalDateOnly(now, timezone);

  const todaySunrise = pcSunriseUTC(todayLocal.year, todayLocal.month, todayLocal.day, lat, lon);
  const todaySunset = pcSunsetUTC(todayLocal.year, todayLocal.month, todayLocal.day, lat, lon);

  let cycleStart, cycleEnd, cycleLabel;

  if (todaySunrise && todaySunset && now >= todaySunrise && now < todaySunset) {
    cycleStart = todaySunrise;
    cycleEnd = todaySunset;
    cycleLabel = 'Daytime';
  } else if (todaySunset && now >= todaySunset) {
    // Tonight: today's sunset through tomorrow's sunrise.
    const tomorrow = pcAddDays(todayLocal, 1);
    cycleStart = todaySunset;
    cycleEnd = pcSunriseUTC(tomorrow.year, tomorrow.month, tomorrow.day, lat, lon);
    cycleLabel = 'Nighttime';
  } else {
    // Still last night: yesterday's sunset through today's sunrise.
    const yesterday = pcAddDays(todayLocal, -1);
    cycleStart = pcSunsetUTC(yesterday.year, yesterday.month, yesterday.day, lat, lon);
    cycleEnd = todaySunrise;
    cycleLabel = 'Nighttime';
  }

  if (!cycleStart || !cycleEnd || cycleEnd <= cycleStart) {
    return null; // Can't resolve a clean sunrise/sunset pair here (e.g. polar day/night).
  }

  const totalMs = cycleEnd.getTime() - cycleStart.getTime();
  const periodMs = totalMs / 7;

  let periodIndex = Math.floor((now.getTime() - cycleStart.getTime()) / periodMs);
  periodIndex = Math.min(6, Math.max(0, periodIndex));

  const periodStart = new Date(cycleStart.getTime() + periodIndex * periodMs);
  const periodEnd = new Date(cycleStart.getTime() + (periodIndex + 1) * periodMs);

  const chakraNumber = PC_CHAKRA_CYCLE_ORDER[periodIndex];
  const nextChakraNumber = PC_CHAKRA_CYCLE_ORDER[(periodIndex + 1) % 7];

  return {
    cycleLabel,
    cycleStart,
    cycleEnd,
    periodIndex,
    periodStart,
    periodEnd,
    chakraNumber,
    chakra: pcChakraInfo(chakraNumber),
    nextChakraNumber,
    nextChakra: pcChakraInfo(nextChakraNumber),
    elapsedFraction: (now.getTime() - cycleStart.getTime()) / totalMs, // progress through the whole cycle (0-1)
    periodElapsedFraction: (now.getTime() - periodStart.getTime()) / periodMs, // progress through just the active period (0-1)
  };
}
