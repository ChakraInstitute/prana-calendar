// Builds places/v1/countries.json: for each country, its biggest places, so
// that typing a country name ("Netherlands") offers that country's main cities.
// Run AFTER rebuilding the places files:   node tools/buildCountryTops.js
// (Reads places/v1/*.json, writes places/v1/countries.json.)
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'places', 'v1');
const PER_COUNTRY = 6;

const byCountry = {};
for (const f of fs.readdirSync(dir)) {
  if (!/^[a-z_]{2}\.json$/.test(f)) continue;
  for (const row of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) {
    (byCountry[row[1]] = byCountry[row[1]] || []).push(row);
  }
}
const norm = (s) => s.toLowerCase();
const out = {};
for (const [cc, rows] of Object.entries(byCountry)) {
  rows.sort((a, b) => b[6] - a[6]);
  const picked = [];
  for (const row of rows.slice(0, 80)) {
    const n = norm(row[0]);
    // skip districts such as "Amsterdam-Zuid" / "Paris 15 Vaugirard" when the city itself is already picked
    if (picked.some((p) => { const m = norm(p[0]); return n.startsWith(m + ' ') || n.startsWith(m + '-'); })) continue;
    picked.push(row);
    if (picked.length >= PER_COUNTRY) break;
  }
  out[cc] = picked;
}
fs.writeFileSync(path.join(dir, 'countries.json'), JSON.stringify(out));
console.log('countries:', Object.keys(out).length);
