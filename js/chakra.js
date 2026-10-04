/*
 * chakra.js — Chakra Energy Timer.
 *
 * Rules:
 *  - THE STRONGEST RULE: Chakra 2 always begins exactly 24 minutes
 *    BEFORE sunrise and exactly 24 minutes BEFORE sunset. This is fixed
 *    and is never overridden by anything else.
 *  - The day splits into two groups, each anchored by a Chakra 2 start:
 *      DAYTIME group:   (sunrise - 24 min) -> (sunset - 24 min)
 *      NIGHTTIME group: (sunset - 24 min)  -> (next sunrise - 24 min)
 *  - Each group is divided into 7 periods, in the fixed order
 *    C2, C3, C4, C5, C6, C7, C1:
 *      daytime period length   = (sunset - sunrise) / 7
 *      nighttime period length = (next sunrise - sunset) / 7
 *    Chakra 1 is the LAST period of each group and absorbs whatever
 *    remainder exists: it always ends exactly when the next group
 *    begins (the next Chakra 2, 24 minutes before sunset/sunrise).
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

// Fixed sequence of chakra numbers for one group (day or night alike),
// starting at chakra 2 (which always begins 24 minutes before sunrise /
// sunset) and ending with chakra 1.
const PC_CHAKRA_CYCLE_ORDER = [2, 3, 4, 5, 6, 7, 1];

// Chakra 2 begins this many minutes before sunrise and before sunset.
const PC_CHAKRA2_LEAD_MINUTES = 24;

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
 *   cycleStart, cycleEnd,      // Date (UTC) — bounds of the whole group
 *                              // (start = its Chakra 2 start)
 *   periodIndex,               // 0-6, position within PC_CHAKRA_CYCLE_ORDER
 *   periodStart, periodEnd,    // Date (UTC) — bounds of the active period
 *   chakraNumber, chakra,      // active chakra
 *   nextChakraNumber, nextChakra,
 *   elapsedFraction,           // 0-1 progress through the whole group
 * }
 */
function pcGetCurrentChakraStatus(lat, lon, timezone, now) {
  now = now || new Date();
  const todayLocal = pcLocalDateOnly(now, timezone);
  const leadMs = PC_CHAKRA2_LEAD_MINUTES * 60000;

  const todaySunrise = pcSunriseUTC(todayLocal.year, todayLocal.month, todayLocal.day, lat, lon);
  const todaySunset = pcSunsetUTC(todayLocal.year, todayLocal.month, todayLocal.day, lat, lon);

  // The three raw anchors that define the group this moment falls in:
  // [startAnchor, midAnchor, endAnchor] where the group's periods are
  // (mid - start) / 7 long. startAnchor/endAnchor are the sunrise/sunset
  // the group is measured from; the group itself begins 24 min earlier.
  let groupStartRef, groupEndRef, cycleLabel;

  if (todaySunrise && todaySunset && now.getTime() >= todaySunrise.getTime() - leadMs && now.getTime() < todaySunset.getTime() - leadMs) {
    groupStartRef = todaySunrise;
    groupEndRef = todaySunset;
    cycleLabel = 'Daytime';
  } else if (todaySunset && now.getTime() >= todaySunset.getTime() - leadMs) {
    // Tonight: today's sunset group through tomorrow's sunrise group.
    const tomorrow = pcAddDays(todayLocal, 1);
    groupStartRef = todaySunset;
    groupEndRef = pcSunriseUTC(tomorrow.year, tomorrow.month, tomorrow.day, lat, lon);
    cycleLabel = 'Nighttime';
  } else {
    // Still last night: yesterday's sunset group through today's sunrise group.
    const yesterday = pcAddDays(todayLocal, -1);
    groupStartRef = pcSunsetUTC(yesterday.year, yesterday.month, yesterday.day, lat, lon);
    groupEndRef = todaySunrise;
    cycleLabel = 'Nighttime';
  }

  if (!groupStartRef || !groupEndRef || groupEndRef <= groupStartRef) {
    return null; // Can't resolve a clean sunrise/sunset pair here (e.g. polar day/night).
  }

  // Period length is measured between the actual sunrise/sunset times;
  // the group is that same span shifted 24 minutes earlier, so Chakra 2
  // lands exactly 24 minutes before sunrise (day) / sunset (night).
  const periodMs = (groupEndRef.getTime() - groupStartRef.getTime()) / 7;
  const cycleStart = new Date(groupStartRef.getTime() - leadMs);
  const cycleEnd = new Date(groupEndRef.getTime() - leadMs);
  const totalMs = cycleEnd.getTime() - cycleStart.getTime();

  let periodIndex = Math.floor((now.getTime() - cycleStart.getTime()) / periodMs);
  periodIndex = Math.min(6, Math.max(0, periodIndex));

  const periodStart = new Date(cycleStart.getTime() + periodIndex * periodMs);
  // Chakra 1 (the last period) absorbs any remainder: it ends exactly
  // when the next group's Chakra 2 begins.
  const periodEnd = periodIndex === 6 ? cycleEnd : new Date(cycleStart.getTime() + (periodIndex + 1) * periodMs);

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
    elapsedFraction: (now.getTime() - cycleStart.getTime()) / totalMs, // progress through the whole group (0-1)
    periodElapsedFraction: (now.getTime() - periodStart.getTime()) / (periodEnd.getTime() - periodStart.getTime()), // progress through just the active period (0-1)
  };
}
