# City list for birth-place search (from VARA)

A free, self-hosted replacement for a paid city-search API. It was built for VARA, an astrology app, where a birth city must come with **latitude, longitude and an IANA time zone**. Searching sends nothing to any other company and has no daily limit, no API key and no monthly bill.

## What is in this zip

| Folder / file | What it is |
|---|---|
| `places/v1/*.json` | the city list: one small file for each first two letters of a place name (`ho.json` holds Houston, Honolulu, Hobart...) |
| `places/v1/alt/*.json` | other spellings people type ("Bruxelles", "Brussel", "Den Haag", "Luik"), each pointing at a place |
| `places/v1/meta.json` | country names, region names, the time zone list, and the credit text |
| `buildCityIndex.js` | the script that makes all of the above from GeoNames' free download (run it again once a year) |
| `citySearch.reference.js` | VARA's search code (the part that reads these files and ranks results), as a working reference |

Total about 15 MB (about 4.5 MB zipped). A visitor's browser loads only the one or two small files for the letters typed, never the whole list.

## Where the data comes from, and the credit you MUST show

The data is **GeoNames** (https://www.geonames.org), licence **CC BY 4.0**. Commercial use is allowed. The licence requires a credit. VARA shows this line, with a link, under every city box:

> Place list from GeoNames (geonames.org), CC BY 4.0. Modified: split into small files.

If you use this in another app, show the same credit (with the link to https://www.geonames.org) somewhere the person can see it.

Source files (free): https://download.geonames.org/export/dump/ : `cities1000.zip` (every place with 1,000 or more people, about 171,000 places), `admin1CodesASCII.txt` (region names), `countryInfo.txt` (country names). GeoNames provides the data "as is", without warranty.

## File formats

`places/v1/<ab>.json` is an array of rows, the biggest places first:

```
[name, country code, region code, latitude, longitude, time zone number, population, other spelling]
 0     1             2            3         4          5                 6           7 (only when it differs from the name)
```

- `time zone number` is a position in `meta.json` -> `timeZones` (an array of IANA names such as "America/Chicago").
- `country code` and `region code` are looked up in `meta.json` -> `countries["US"]` and `regions["US.TX"]`.
- `places/v1/alt/<ab>.json` is an array of `[spelling, file key of the place, number of the place in that file]`.

## How the files are chosen (the matching rules)

1. Write the text typed the same way the files were written (`normalize`): remove accents; fold letters that are not accents (`ł ø đ ð ß æ œ þ ı`); turn hyphens, apostrophes and full stops into spaces; keep only a-z, spaces and commas; collapse spaces; expand the whole words `st`, `ste`, `mt` to `saint`, `sainte`, `mount` (so "St. Louis" and "Saint Louis" are the same).
2. The file key is the first two letters of the result with spaces removed (`"New York"` -> `ne`).
3. Load `<key>.json` and `alt/<key>.json` (if the second does not exist, there are no other spellings), plus `meta.json`.
4. Keep rows whose name (or other spelling) starts with what was typed.
5. Sort: the whole name typed first, then names before other spellings, then a typed state or country ("Houston, TX", "London, UK"), then **places in the Americas and Europe before the rest of the world** (VARA's people live there; change it in `citySearch.reference.js`), then bigger places first.
6. Show "City, Region, Country" and use the latitude, longitude and time zone.
7. **A state or country typed without a comma** ("houston tx", "san francisco ca", "paris france", "santa cruz bolivia"): when there is no comma and the last one or two words are a known US state code, a state/region/country name (from `meta.json`) or a country alias (`usa`, `uk`...), search the rest of the text as the city and keep only places in that state or country. This is tried first, because "ca" is also the start of the village "San Francisco Cajonos". If nothing is found, the last words are tried as an unknown region as a last resort. Ask for a long list (1000) before cutting it down to the state or country, or the right place gets lost among same-named places.

`buildCityIndex.js` and `citySearch.reference.js` both contain `normalize`; keep the two identical.

## Known limits

- Places with fewer than 1,000 people are not in the list. VARA offers "enter it manually" (name, latitude, longitude, time zone) for them.
- The list is a snapshot. Rebuild it about once a year (download the three files, run `node buildCityIndex.js <folder>`), and bump the folder name (`v1` -> `v2`) so browsers fetch the new files.
- Time zones are the place's current IANA zone. For historical birth times, use a library that knows the zone's history (VARA's chart code does).

## Hosting notes

Put the `places` folder in the website's public folder. Give it a long cache time (`Cache-Control: public, max-age=31536000, immutable`), because the folder name carries the version. VARA uses Firebase Hosting for this.

## A note for another Claude chat

"This is a ready-made, free city lookup for birth places. Please read README.md first. Do not call any outside geocoding service. Use `places/v1/` as described, show the GeoNames credit, and reuse `normalize` exactly as written so the file keys match. `citySearch.reference.js` is a working example in JavaScript; port it to this app's language and structure if needed."
