/*
 * sunrise.js — Local sunrise/sunset time for a given calendar date and
 * latitude/longitude, using the standard NOAA solar position algorithm
 * (the same formulas behind the public NOAA Solar Calculator).
 *
 * Sunrise/sunset are physical events determined by date + lat/lon only;
 * a timezone is only needed afterwards, to *display* the resulting UTC
 * instant as a local wall-clock time. That display step lives in
 * timezone.js.
 */

/**
 * Shared solar-position computation for a Gregorian calendar date:
 * the sun's declination (degrees) and the equation of time (minutes).
 * Both sunrise and sunset are derived from these two values.
 */
function pcSolarPositionForDate(year, month, day) {
  const jd = pcJDForNoonUTC(year, month, day);
  const T = (jd - 2451545.0) / 36525;

  const L0 = pcMod360(280.46646 + T * (36000.76983 + T * 0.0003032));
  const M = pcMod360(357.52911 + T * (35999.05029 - 0.0001537 * T));
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

  const C =
    pcSinDeg(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    pcSinDeg(2 * M) * (0.019993 - 0.000101 * T) +
    pcSinDeg(3 * M) * 0.000289;

  const trueLong = L0 + C;

  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * pcSinDeg(omega);

  const epsilon0 =
    23 +
    (26 +
      (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) /
      60;
  const epsilon = epsilon0 + 0.00256 * Math.cos(omega * PC_DEG2RAD);

  const declination =
    Math.asin(Math.sin(epsilon * PC_DEG2RAD) * pcSinDeg(lambda)) / PC_DEG2RAD;

  const y = Math.pow(Math.tan((epsilon / 2) * PC_DEG2RAD), 2);
  const eqTimeMinutes =
    4 *
    (180 / Math.PI) *
    (y * pcSinDeg(2 * L0) -
      2 * e * pcSinDeg(M) +
      4 * e * y * pcSinDeg(M) * Math.cos(2 * L0 * PC_DEG2RAD) -
      0.5 * y * y * pcSinDeg(4 * L0) -
      1.25 * e * e * pcSinDeg(2 * M));

  return { declination, eqTimeMinutes };
}

/**
 * Hour angle (degrees) of sunrise/sunset for a given declination and
 * latitude, or null if the sun does not rise/set that day (polar
 * day/night) at that location.
 */
function pcSunHourAngle(declinationDeg, latitude) {
  const zenith = 90.833; // atmospheric refraction (~34') + solar radius (~16')
  const latRad = latitude * PC_DEG2RAD;
  const decRad = declinationDeg * PC_DEG2RAD;

  const cosHA =
    Math.cos(zenith * PC_DEG2RAD) / (Math.cos(latRad) * Math.cos(decRad)) -
    Math.tan(latRad) * Math.tan(decRad);

  if (cosHA < -1 || cosHA > 1) return null;
  return Math.acos(cosHA) / PC_DEG2RAD;
}

/**
 * Compute the UTC instant of sunrise for the given Gregorian calendar
 * date at the given latitude/longitude (degrees, longitude positive
 * East). Returns a UTC Date, or null if the sun does not rise on that
 * date at that location (polar day/night).
 */
function pcSunriseUTC(year, month, day, latitude, longitude) {
  const { declination, eqTimeMinutes } = pcSolarPositionForDate(year, month, day);
  const HA = pcSunHourAngle(declination, latitude);
  if (HA === null) return null;

  const solarNoonUTCMinutes = 720 - 4 * longitude - eqTimeMinutes;
  const sunriseUTCMinutes = solarNoonUTCMinutes - 4 * HA;

  const baseUTCMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  return new Date(baseUTCMidnight + Math.round(sunriseUTCMinutes * 60000));
}

/**
 * Compute the UTC instant of sunset for the given Gregorian calendar
 * date at the given latitude/longitude. Returns a UTC Date, or null if
 * the sun does not set on that date at that location (polar day/night).
 */
function pcSunsetUTC(year, month, day, latitude, longitude) {
  const { declination, eqTimeMinutes } = pcSolarPositionForDate(year, month, day);
  const HA = pcSunHourAngle(declination, latitude);
  if (HA === null) return null;

  const solarNoonUTCMinutes = 720 - 4 * longitude - eqTimeMinutes;
  const sunsetUTCMinutes = solarNoonUTCMinutes + 4 * HA;

  const baseUTCMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  return new Date(baseUTCMidnight + Math.round(sunsetUTCMinutes * 60000));
}
