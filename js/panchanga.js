/*
 * panchanga.js — Tithi, Paksha, and Nakshatra (display only).
 *
 * These values are purely informational on the Today tab — nothing here
 * feeds into the dominant-nostril calculation anywhere else in the app.
 *
 * Sun and Moon geocentric ecliptic longitudes use the compact low-precision
 * formulas popularized by Paul Schlyter ("How to Compute Planetary
 * Positions") — the same single-dominant-term formulas used in production
 * by the widely-used suncalc.js library. They're accurate to roughly a few
 * tenths of a degree, which is well within what Tithi (12° steps) and
 * Nakshatra (13.333° steps) need for a simple display; this app intentionally
 * doesn't pull in a full VSOP87/ELP2000 ephemeris for something this size.
 */

const PC_PANCHANGA_RAD = Math.PI / 180;

/** Days since the J2000.0 epoch (2000-01-01 12:00 UT), from a UTC Date. */
function pcDaysSinceJ2000(date) {
  return pcDateToJD(date) - 2451545.0;
}

/** Geocentric apparent ecliptic longitude of the Sun, in degrees [0, 360). */
function pcSunEclipticLongitudeDeg(date) {
  const d = pcDaysSinceJ2000(date);
  const M = pcMod360(357.5291 + 0.98560028 * d); // mean anomaly
  const Mrad = M * PC_PANCHANGA_RAD;
  const C =
    1.9148 * Math.sin(Mrad) +
    0.02 * Math.sin(2 * Mrad) +
    0.0003 * Math.sin(3 * Mrad); // equation of center
  const PERIHELION = 102.9372;
  return pcMod360(M + C + PERIHELION + 180);
}

/** Geocentric ecliptic longitude of the Moon, in degrees [0, 360). */
function pcMoonEclipticLongitudeDeg(date) {
  const d = pcDaysSinceJ2000(date);
  const L = pcMod360(218.316 + 13.176396 * d); // mean longitude
  const M = pcMod360(134.963 + 13.064993 * d); // mean anomaly
  const correction = 6.289 * Math.sin(M * PC_PANCHANGA_RAD);
  return pcMod360(L + correction);
}

// Lahiri ayanamsha — linear approximation anchored to the published value
// at 2000-01-01 00:00 UT (23°51'12"), advancing at the long-term
// precession rate of ~50.29 arcseconds/year. This is a small fraction of a
// degree off true (nutation-inclusive) values even decades out — plenty
// for Nakshatra's 13.333° steps and for placing the Moon in a sidereal
// zodiac sign.
const PC_LAHIRI_AYANAMSHA_J2000_DEG = 23 + 51 / 60 + 12 / 3600;
const PC_LAHIRI_AYANAMSHA_RATE_DEG_PER_YEAR = 50.29 / 3600;

function pcLahiriAyanamshaDeg(date) {
  const yearsSinceJ2000 = pcDaysSinceJ2000(date) / 365.25;
  return (
    PC_LAHIRI_AYANAMSHA_J2000_DEG +
    PC_LAHIRI_AYANAMSHA_RATE_DEG_PER_YEAR * yearsSinceJ2000
  );
}

const PC_TITHI_NAMES = [
  'Pratipada',
  'Dwitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashthi',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dwadashi',
  'Trayodashi',
  'Chaturdashi',
];

const PC_NAKSHATRA_NAMES = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati',
];

const PC_ZODIAC_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

/**
 * Tithi, Paksha, Nakshatra, and the Moon's sidereal/tropical zodiac signs
 * for a given UTC instant. Display only.
 */
function pcComputePanchanga(date) {
  const sunLon = pcSunEclipticLongitudeDeg(date);
  const moonLon = pcMoonEclipticLongitudeDeg(date);

  // Tithi: each 12° of (Moon - Sun) elongation is one tithi. This is a
  // difference of two TROPICAL longitudes, so the ayanamsha cancels out —
  // it plays no part in the Tithi calculation.
  const elongation = pcMod360(moonLon - sunLon);
  const tithiIndex = Math.floor(elongation / 12); // 0-29
  const tithiNumber = tithiIndex + 1; // 1-30
  const paksha = tithiNumber <= 15 ? 'Shukla' : 'Krishna';
  const tithiInPaksha = ((tithiNumber - 1) % 15) + 1; // 1-15
  const tithiName =
    tithiInPaksha === 15
      ? paksha === 'Shukla'
        ? 'Purnima'
        : 'Amavasya'
      : PC_TITHI_NAMES[tithiInPaksha - 1];

  // Nakshatra: the Moon's SIDEREAL longitude (tropical minus the Lahiri
  // ayanamsha), divided into 27 equal 13.333° segments.
  const ayanamsha = pcLahiriAyanamshaDeg(date);
  const siderealMoonLon = pcMod360(moonLon - ayanamsha);
  const nakshatraIndex = Math.floor(siderealMoonLon / (360 / 27)); // 0-26
  const nakshatraNumber = nakshatraIndex + 1; // 1-27
  const nakshatraName = PC_NAKSHATRA_NAMES[nakshatraIndex];

  const siderealSignIndex = Math.floor(siderealMoonLon / 30) % 12;
  const tropicalSignIndex = Math.floor(moonLon / 30) % 12;

  return {
    tithiNumber,
    tithiName,
    tithiInPaksha, // 1-15 — which tithi WITHIN the current paksha; used by the Nitya calculation in app.js
    paksha,
    nakshatraNumber,
    nakshatraName,
    siderealSign: PC_ZODIAC_SIGNS[siderealSignIndex],
    tropicalSign: PC_ZODIAC_SIGNS[tropicalSignIndex],
  };
}
