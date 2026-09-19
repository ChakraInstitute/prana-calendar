/*
 * moonphases.js — New moon / full moon UTC times.
 * Implements Jean Meeus, "Astronomical Algorithms" (2nd ed.), Chapter 49,
 * "Phases of the Moon" — truncated periodic-term series, accurate to
 * roughly a minute or two for modern dates. This is a self-contained
 * re-implementation of the standard published formulas (no external
 * ephemeris service needed).
 */

const PC_DEG2RAD = Math.PI / 180;

function pcSinDeg(deg) {
  return Math.sin(deg * PC_DEG2RAD);
}

/** Normalize degrees to [0, 360). */
function pcMod360(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Delta-T (TD - UT) in seconds, approximate polynomial valid for
 * roughly 2005-2050 (Espenak/Meeus). Good enough for a modern-dates app;
 * the correction is on the order of ~70s, far smaller than a typical
 * sunrise/moon-phase separation.
 */
function pcDeltaTSeconds(decimalYear) {
  const t = decimalYear - 2000;
  return 62.92 + 0.32217 * t + 0.005589 * t * t;
}

/**
 * Given a fractional lunation number k (0 = new moon near 2000-01-06)
 * and a phase (0 = new moon, 0.5 = full moon), return the UTC Date of
 * that phase.
 */
function pcMoonPhaseUTC(k, phase) {
  k = k + phase;
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  let JDE =
    2451550.09766 +
    29.530588861 * k +
    0.00015437 * T2 -
    0.000000150 * T3 +
    0.00000000073 * T4;

  const E = 1 - 0.002516 * T - 0.0000074 * T2;

  const M = pcMod360(2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3);
  const Mp = pcMod360(
    201.5643 +
      385.81693528 * k +
      0.0107582 * T2 +
      0.00001238 * T3 -
      0.000000058 * T4
  );
  const F = pcMod360(
    160.7108 +
      390.67050284 * k -
      0.0016118 * T2 -
      0.00000227 * T3 +
      0.000000011 * T4
  );
  const Omega = pcMod360(124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3);

  const A1 = pcMod360(299.77 + 0.107408 * k - 0.009173 * T2);
  const A2 = pcMod360(251.88 + 0.016321 * k);
  const A3 = pcMod360(251.83 + 26.651886 * k);
  const A4 = pcMod360(349.42 + 36.412478 * k);
  const A5 = pcMod360(84.66 + 18.206239 * k);
  const A6 = pcMod360(141.74 + 53.303771 * k);
  const A7 = pcMod360(207.14 + 2.453732 * k);
  const A8 = pcMod360(154.84 + 7.30686 * k);
  const A9 = pcMod360(34.52 + 27.261239 * k);
  const A10 = pcMod360(207.19 + 0.121824 * k);
  const A11 = pcMod360(291.34 + 1.844379 * k);
  const A12 = pcMod360(161.72 + 24.198154 * k);
  const A13 = pcMod360(239.56 + 25.513099 * k);
  const A14 = pcMod360(331.55 + 3.592518 * k);

  let correction;
  if (phase === 0) {
    // New Moon
    correction =
      -0.4072 * pcSinDeg(Mp) +
      0.17241 * E * pcSinDeg(M) +
      0.01608 * pcSinDeg(2 * Mp) +
      0.01039 * pcSinDeg(2 * F) +
      0.00739 * E * pcSinDeg(Mp - M) -
      0.00514 * E * pcSinDeg(Mp + M) +
      0.00208 * E * E * pcSinDeg(2 * M) -
      0.00111 * pcSinDeg(Mp - 2 * F) -
      0.00057 * pcSinDeg(Mp + 2 * F) +
      0.00056 * E * pcSinDeg(2 * Mp + M) -
      0.00042 * pcSinDeg(3 * Mp) +
      0.00042 * E * pcSinDeg(M + 2 * F) +
      0.00038 * E * pcSinDeg(M - 2 * F) -
      0.00024 * E * pcSinDeg(2 * Mp - M) -
      0.00017 * pcSinDeg(Omega) -
      0.00007 * pcSinDeg(Mp + 2 * M) +
      0.00004 * pcSinDeg(2 * Mp - 2 * F) +
      0.00004 * pcSinDeg(3 * M) +
      0.00003 * pcSinDeg(Mp + M - 2 * F) +
      0.00003 * pcSinDeg(2 * Mp + 2 * F) -
      0.00003 * pcSinDeg(Mp + M + 2 * F) +
      0.00003 * pcSinDeg(Mp - M + 2 * F) -
      0.00002 * pcSinDeg(Mp - M - 2 * F) -
      0.00002 * pcSinDeg(3 * Mp + M) +
      0.00002 * pcSinDeg(4 * Mp);
  } else {
    // Full Moon (phase === 0.5)
    correction =
      -0.40614 * pcSinDeg(Mp) +
      0.17302 * E * pcSinDeg(M) +
      0.01608 * pcSinDeg(2 * Mp) +
      0.01039 * pcSinDeg(2 * F) +
      0.00739 * E * pcSinDeg(Mp - M) -
      0.00514 * E * pcSinDeg(Mp + M) +
      0.00208 * E * E * pcSinDeg(2 * M) -
      0.00111 * pcSinDeg(Mp - 2 * F) -
      0.00057 * pcSinDeg(Mp + 2 * F) +
      0.00056 * E * pcSinDeg(2 * Mp + M) -
      0.00042 * pcSinDeg(3 * Mp) +
      0.00042 * E * pcSinDeg(M + 2 * F) +
      0.00038 * E * pcSinDeg(M - 2 * F) -
      0.00024 * E * pcSinDeg(2 * Mp - M) -
      0.00017 * pcSinDeg(Omega) -
      0.00007 * pcSinDeg(Mp + 2 * M) +
      0.00004 * pcSinDeg(2 * Mp - 2 * F) +
      0.00004 * pcSinDeg(3 * M) +
      0.00003 * pcSinDeg(Mp + M - 2 * F) +
      0.00003 * pcSinDeg(2 * Mp + 2 * F) -
      0.00003 * pcSinDeg(Mp + M + 2 * F) +
      0.00003 * pcSinDeg(Mp - M + 2 * F) -
      0.00002 * pcSinDeg(Mp - M - 2 * F) -
      0.00002 * pcSinDeg(3 * Mp + M) +
      0.00002 * pcSinDeg(4 * Mp);
  }

  // Additional periodic corrections common to all phases.
  const extra =
    0.000325 * pcSinDeg(A1) +
    0.000165 * pcSinDeg(A2) +
    0.000164 * pcSinDeg(A3) +
    0.000126 * pcSinDeg(A4) +
    0.00011 * pcSinDeg(A5) +
    0.000062 * pcSinDeg(A6) +
    0.00006 * pcSinDeg(A7) +
    0.000056 * pcSinDeg(A8) +
    0.000047 * pcSinDeg(A9) +
    0.000042 * pcSinDeg(A10) +
    0.00004 * pcSinDeg(A11) +
    0.000037 * pcSinDeg(A12) +
    0.000035 * pcSinDeg(A13) +
    0.000023 * pcSinDeg(A14);

  JDE += correction + extra;

  // Convert Dynamical Time (TD) to Universal Time (UT/UTC).
  const decimalYear = 2000 + k / 12.3685;
  const deltaT = pcDeltaTSeconds(decimalYear);
  const JD_UT = JDE - deltaT / 86400;

  return pcJDToDate(JD_UT);
}

/**
 * Return every new-moon and full-moon event (UTC) whose instant falls
 * within [startDate, endDate). Each event: { type: 'new'|'full', utc: Date }.
 */
function pcMoonPhasesInRange(startDate, endDate) {
  const startYear =
    startDate.getUTCFullYear() +
    (startDate.getUTCMonth() + startDate.getUTCDate() / 30) / 12;
  const endYear =
    endDate.getUTCFullYear() +
    (endDate.getUTCMonth() + endDate.getUTCDate() / 30) / 12;

  // ~12.3685 lunations per year; pad generously on both ends.
  let kStart = Math.floor((startYear - 2000) * 12.3685) - 2;
  const kEnd = Math.ceil((endYear - 2000) * 12.3685) + 2;

  const events = [];
  for (let k = kStart; k <= kEnd; k++) {
    const newMoon = pcMoonPhaseUTC(k, 0);
    if (newMoon >= startDate && newMoon < endDate) {
      events.push({ type: 'new', utc: newMoon });
    }
    const fullMoon = pcMoonPhaseUTC(k, 0.5);
    if (fullMoon >= startDate && fullMoon < endDate) {
      events.push({ type: 'full', utc: fullMoon });
    }
  }
  events.sort((a, b) => a.utc.getTime() - b.utc.getTime());
  return events;
}
