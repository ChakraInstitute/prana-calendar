/*
 * geocode.js — city name -> { latitude, longitude, timezone, label }
 * via the free Open-Meteo Geocoding API (no key required).
 * https://open-meteo.com/en/docs/geocoding-api
 */

async function pcGeocodeCity(query, timeoutMs) {
  timeoutMs = timeoutMs || 10000;
  const url =
    'https://geocoding-api.open-meteo.com/v1/search?name=' +
    encodeURIComponent(query) +
    '&count=5&language=en&format=json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The city lookup timed out. Check your connection and try again.');
    }
    // Most commonly a network failure, an ad-blocker, or a CORS restriction
    // (e.g. some browsers restrict fetch() from file:// pages).
    console.error('pcGeocodeCity: fetch failed', err);
    throw new Error(
      'Could not reach the city-lookup service (network or browser restriction).'
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error('Geocoding service returned an error (' + res.status + ').');
  }
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    return [];
  }
  return data.results.map((r) => ({
    label:
      [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  }));
}
