/*
 * geocode.js — city name -> { label, latitude, longitude, timezone }
 *
 * Uses the app's OWN copy of the free GeoNames place list (every place with
 * 1,000 or more people, worldwide), kept as small files in places/v1/.
 * Typing "hou" loads ONE small file (places/v1/ho.json) from this site:
 * nothing typed is sent to any other company, and there is no key, no daily
 * limit and no bill. See places/README.md for the file formats and how to
 * rebuild the list once a year.
 *
 * GeoNames data is CC BY 4.0 (commercial use allowed). The credit line is
 * shown under the city boxes in index.html — keep it there.
 *
 * Ported from VARA's citySearch.reference.js. `pcPlacesNormalize` must stay
 * identical to `normalize` in the build script that wrote the files, or the
 * file keys will not match.
 *
 * Public function (same shape the rest of the app already uses):
 *   pcGeocodeCity(query) -> Promise<[{ label, latitude, longitude, timezone }]>
 */

const PC_PLACES_URL = 'places/v1/';
const PC_PLACES_TIMEOUT_MS = 10000;

const PC_PLACES_FOLD = { 'ł': 'l', 'ø': 'o', 'đ': 'd', 'ð': 'd', 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'þ': 'th', 'ı': 'i' };
const PC_PLACES_SHORT_WORDS = { st: 'saint', ste: 'sainte', mt: 'mount' };

function pcPlacesNormalize(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[łøđðßæœþı]/g, (c) => PC_PLACES_FOLD[c])
    .replace(/[-'’.]/g, ' ')
    .replace(/[^a-z\s,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^| )(st|ste|mt)(?= |$)/g, (m, space, word) => space + PC_PLACES_SHORT_WORDS[word]);
}

// "Houston, TX": people type US state codes; the list has the full names.
const PC_US_STATES = {
  al: 'alabama', ak: 'alaska', az: 'arizona', ar: 'arkansas', ca: 'california', co: 'colorado',
  ct: 'connecticut', de: 'delaware', fl: 'florida', ga: 'georgia', hi: 'hawaii', id: 'idaho',
  il: 'illinois', in: 'indiana', ia: 'iowa', ks: 'kansas', ky: 'kentucky', la: 'louisiana',
  me: 'maine', md: 'maryland', ma: 'massachusetts', mi: 'michigan', mn: 'minnesota',
  ms: 'mississippi', mo: 'missouri', mt: 'montana', ne: 'nebraska', nv: 'nevada',
  nh: 'new hampshire', nj: 'new jersey', nm: 'new mexico', ny: 'new york', nc: 'north carolina',
  nd: 'north dakota', oh: 'ohio', ok: 'oklahoma', or: 'oregon', pa: 'pennsylvania',
  ri: 'rhode island', sc: 'south carolina', sd: 'south dakota', tn: 'tennessee', tx: 'texas',
  ut: 'utah', vt: 'vermont', va: 'virginia', wa: 'washington', wv: 'west virginia',
  wi: 'wisconsin', wy: 'wyoming', dc: 'district of columbia',
};
const PC_COUNTRY_ALIASES = { usa: 'united states', us: 'united states', uk: 'united kingdom', uae: 'united arab emirates' };

function pcPlacesIsValidZone(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; }
}

// "hou" / "Houston, TX" -> { text: 'hou', region: 'texas' }
function pcPlacesParseQuery(query) {
  const parts = pcPlacesNormalize(query).split(',');
  const region = parts.slice(1).join(' ').trim();
  return {
    text: (parts[0] || '').trim(),
    region: PC_US_STATES[region] || PC_COUNTRY_ALIASES[region] || region,
  };
}

// --- loading the small files -----------------------------------------------
const pcPlacesShardKey = (text) => text.replace(/[\s,]/g, '').slice(0, 2).padEnd(2, '_');
const pcPlacesFileCache = new Map(); // fetched once per visit; a failed one is forgotten so the next try asks again

async function pcPlacesFetchFile(name) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => controller && controller.abort(), PC_PLACES_TIMEOUT_MS);
  try {
    const res = await fetch(PC_PLACES_URL + name, controller ? { signal: controller.signal } : undefined);
    // no file for these two letters just means no places start with them
    if (res.status === 404 && name !== 'meta.json') return [];
    if (!res.ok) throw new Error('places file answered ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function pcPlacesFile(name) {
  if (!pcPlacesFileCache.has(name)) {
    pcPlacesFileCache.set(
      name,
      pcPlacesFetchFile(name).catch((err) => {
        pcPlacesFileCache.delete(name);
        throw err;
      })
    );
  }
  return pcPlacesFileCache.get(name);
}

// --- searching ---------------------------------------------------------------
async function pcPlacesSearchList(text, region, limit) {
  const key = pcPlacesShardKey(text);
  // (the other-spellings file may not exist for these letters: that just means "no other spellings")
  const [meta, rows, others] = await Promise.all([
    pcPlacesFile('meta.json'),
    pcPlacesFile(key + '.json'),
    pcPlacesFile('alt/' + key + '.json').catch(() => []),
  ]);
  const found = [];
  const seenRows = new Set();
  const add = (row, spellings, viaName) => {
    if (seenRows.has(row)) return;
    seenRows.add(row);
    const name = row[0], countryCode = row[1], regionCode = row[2];
    const latitude = row[3], longitude = row[4], zone = row[5], population = row[6];
    const timezone = meta.timeZones[zone];
    if (!timezone || !pcPlacesIsValidZone(timezone)) return;
    const regionName = meta.regions[countryCode + '.' + regionCode];
    const countryName = meta.countries[countryCode] || countryCode;
    const area = [regionName && pcPlacesNormalize(regionName) !== pcPlacesNormalize(name) ? regionName : null, countryName]
      .filter(Boolean).join(', ');
    // rank 0: whole name typed, 1: whole other spelling, 2: start of name, 3: start of other spelling
    // "home": when the same name exists in several places, the Americas and Europe come first.
    const home = /^(America|Europe|Atlantic)\//.test(timezone) || timezone === 'Pacific/Honolulu' ? 0 : 1;
    found.push({
      rank: (spellings.includes(text) ? 0 : 2) + (viaName ? 0 : 1),
      home,
      population,
      place: { label: name + (area ? ', ' + area : ''), area, latitude, longitude, timezone },
    });
  };
  rows.forEach((row) => {
    const spellings = [pcPlacesNormalize(row[0]), row[7] ? pcPlacesNormalize(row[7]) : ''];
    if (spellings.some((written) => written.startsWith(text))) add(row, spellings, true);
  });
  // a spelling people type that is not the place's name ("Bruxelles", "Den Haag") points at the place in its own file
  const pointed = others.filter((o) => o[0].startsWith(text)).slice(0, 60);
  const needed = await Promise.all(
    [...new Set(pointed.map((o) => o[1]))].map(async (file) => [file, file === key ? rows : await pcPlacesFile(file + '.json').catch(() => [])])
  );
  const byFile = new Map(needed);
  pointed.forEach((o) => {
    const row = (byFile.get(o[1]) || [])[o[2]];
    if (row) add(row, [o[0]], false);
  });
  // whole name typed first, then the typed state/country ("Houston, TX"), then bigger places
  const matchesRegion = (f) => !!region && pcPlacesNormalize(f.place.area).includes(region);
  found.sort((a, b) =>
    a.rank - b.rank ||
    Number(matchesRegion(b)) - Number(matchesRegion(a)) ||
    a.home - b.home ||
    b.population - a.population
  );
  const seen = new Set();
  return found
    .map((f) => f.place)
    .filter((p) => (seen.has(p.label) ? false : seen.add(p.label)))
    .slice(0, limit);
}

// No comma ("houston tx", "paris france", "san francisco ca"): nothing matches the whole text, so the last
// one or two words are tried as the state or country and the rest as the city (only places whose state or
// country really is that are kept). `knownOnly`: only when the last words really are a state/region/country
// ("san francisco ca" is San Francisco in California, not the village "San Francisco Cajonos").
let pcPlacesKnownWords = null;
async function pcPlacesKnownRegionWords() {
  const meta = await pcPlacesFile('meta.json');
  if (!pcPlacesKnownWords || pcPlacesKnownWords.meta !== meta) {
    pcPlacesKnownWords = {
      meta,
      words: new Set([...Object.values(meta.countries), ...Object.values(meta.regions)].map(pcPlacesNormalize)),
    };
  }
  return pcPlacesKnownWords.words;
}

async function pcPlacesSearchWithRegionFromText(text, limit, knownOnly) {
  const words = text.split(' ');
  const known = await pcPlacesKnownRegionWords();
  for (let take = 1; take <= 2 && take < words.length; take += 1) {
    const city = words.slice(0, words.length - take).join(' ');
    const tail = words.slice(words.length - take).join(' ');
    if (city.length < 2) continue;
    if (knownOnly && !(PC_US_STATES[tail] || PC_COUNTRY_ALIASES[tail] || known.has(tail))) continue;
    const guess = PC_US_STATES[tail] || PC_COUNTRY_ALIASES[tail] || tail;
    // ask for a long list, then cut down to the state/country ("Santa Cruz" in Bolivia would be lost among the other Santa Cruzes)
    const found = (await pcPlacesSearchList(city, guess, 1000)).filter((p) => pcPlacesNormalize(p.area).includes(guess));
    if (found.length) return found.slice(0, limit);
  }
  return [];
}

/**
 * Search the app's own place list.
 * "hou" / "Houston, TX" / "houston texas" -> matching places, best first.
 * Resolves to [] when nothing matches; REJECTS (with a readable message) only
 * when the list files could not be loaded at all (e.g. offline on first use).
 */
async function pcGeocodeCity(query) {
  const parsed = pcPlacesParseQuery(query);
  const text = parsed.text, region = parsed.region;
  const limit = 6;
  if (text.length < 2) return [];
  try {
    const spaced = !region && text.includes(' ');
    const withState = spaced ? await pcPlacesSearchWithRegionFromText(text, limit, true) : [];
    if (withState.length) return withState;
    const found = await pcPlacesSearchList(text, region, limit);
    if (found.length || !spaced) return found;
    return await pcPlacesSearchWithRegionFromText(text, limit, false);
  } catch (err) {
    console.error('pcGeocodeCity: the place list could not be loaded', err);
    throw new Error('The city list could not be loaded. Check your connection and try again.');
  }
}
