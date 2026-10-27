/*
 * events-tools.js — the Practice (calendar) tab: a time zone converter and the
 * Upcoming Events list.
 *
 * All the math is done by the browser's built-in time zone database (the
 * Intl API), the same one timezone.js uses. That database knows every
 * country's daylight-saving rules, so it handles weeks where Europe and the
 * USA have changed clocks on different dates. No outside library, service
 * or license is involved.
 *
 * Event data comes from upcoming-events.json (see README for the format).
 * app.js calls PcEventsTools.init({ t, getLang }) once, refresh() whenever
 * the language changes, and onTabShown() when the Practice tab opens.
 */
(function () {
  'use strict';

  const CA_ZONE = 'America/Los_Angeles';
  const LOCALES = { en: 'en-US', fr: 'fr', nl: 'nl', es: 'es' };

  let t = (k) => k;
  let getLang = () => 'en';
  let events = null; // null = not loaded yet, [] = loaded but empty, 'error'
  let converterReady = false;

  // Optional second place the person chose to see event times in. Stored only
  // on their own device, and only after they tick the box themselves.
  const PREF_KEY = 'prana-calendar:eventsExtraZone';
  let pref = null; // { tz, label } or null
  function loadPref() {
    try {
      const v = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
      pref = v && isValidZone(v.tz) && v.label ? { tz: v.tz, label: String(v.label) } : null;
    } catch (e) { pref = null; }
  }
  function savePref() {
    try {
      if (pref) localStorage.setItem(PREF_KEY, JSON.stringify(pref));
      else localStorage.removeItem(PREF_KEY);
    } catch (e) { /* storage unavailable: it just won't be remembered */ }
  }
  function updatePrefRow() {
    const row = $('eventsPrefRow');
    if (!row) return;
    row.hidden = !pref;
    if (pref) $('eventsPrefText').textContent = t('eventsShowingIn', { place: pref.label });
  }
  function updateShowBox() {
    const box = $('tzConvShowOnEvents');
    if (!box) return;
    const to = side.to;
    const ok = !!to.tz && to.tz !== CA_ZONE;
    box.hidden = !ok;
    if (!ok) return;
    $('tzConvShowOnEventsText').textContent = t('tzShowOnEvents', { place: sideName(to) });
    $('tzConvShowOnEventsBox').checked = !!(pref && pref.tz === to.tz);
  }

  const $ = (id) => document.getElementById(id);
  const locale = () => LOCALES[getLang()] || 'en-US';

  // ---- time zone math ----------------------------------------------------

  function isValidZone(tz) {
    if (!tz || typeof tz !== 'string') return false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; }
  }

  /** Offset of `tz` from UTC at instant `date`, in minutes (east = positive). */
  function offsetMin(date, tz) {
    const p = pcLocalParts(date, tz);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  }

  /**
   * Turn a wall-clock date/time in `tz` into a UTC instant.
   * Returns { date, status } where status is 'ok', 'skipped' (that clock time
   * does not exist because clocks jump forward) or 'ambiguous' (it happens
   * twice because clocks go back; the earlier instant is returned).
   */
  function zonedToUtc(y, m, d, h, mi, tz) {
    const naive = Date.UTC(y, m - 1, d, h, mi);
    const DAY = 86400000;
    const offs = new Set([
      offsetMin(new Date(naive - DAY), tz),
      offsetMin(new Date(naive), tz),
      offsetMin(new Date(naive + DAY), tz),
    ]);
    const valid = [];
    offs.forEach((o) => {
      const cand = naive - o * 60000;
      const p = pcLocalParts(new Date(cand), tz);
      if (p.year === y && p.month === m && p.day === d && p.hour === h && p.minute === mi) valid.push(cand);
    });
    if (valid.length === 0) return { date: new Date(naive - offsetMin(new Date(naive), tz) * 60000), status: 'skipped' };
    valid.sort((a, b) => a - b);
    return { date: new Date(valid[0]), status: valid.length > 1 ? 'ambiguous' : 'ok' };
  }

  function utcLabel(min) {
    const sign = min < 0 ? '−' : '+';
    const a = Math.abs(min);
    const h = Math.floor(a / 60), m = a % 60;
    return 'UTC' + sign + h + (m ? ':' + String(m).padStart(2, '0') : '');
  }

  function zoneAbbr(date, tz) {
    const parts = new Intl.DateTimeFormat(locale(), { timeZone: tz, timeZoneName: 'short' }).formatToParts(date);
    const part = parts.find((p) => p.type === 'timeZoneName');
    const name = part ? part.value : '';
    const off = utcLabel(offsetMin(date, tz));
    return /^(UTC|GMT)/.test(name) || !name ? off : name + ' (' + off + ')';
  }

  function fmtDate(date, tz) {
    return new Intl.DateTimeFormat(locale(), {
      timeZone: tz, weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    }).format(date);
  }
  function fmtTime(date, tz) {
    return new Intl.DateTimeFormat(locale(), { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(date);
  }
  function fmtDateTime(date, tz) {
    return fmtDate(date, tz) + ' · ' + fmtTime(date, tz) + ' ' + zoneAbbr(date, tz);
  }
  function sameLocalDay(a, b, tz) {
    const x = pcLocalParts(a, tz), y = pcLocalParts(b, tz);
    return x.year === y.year && x.month === y.month && x.day === y.day;
  }

  function zoneLabel(tz) {
    if (tz === CA_ZONE) return t('tzCaliforniaLabel');
    return tz.split('/').pop().replace(/_/g, ' ');
  }

  function gapText(min) {
    const a = Math.abs(min);
    const h = Math.floor(a / 60), m = a % 60;
    return m ? t('tzGapHoursMinutes', { h, m }) : t('tzGapHours', { h });
  }

  // ---- converter ---------------------------------------------------------

  function pad(n) { return String(n).padStart(2, '0'); }

  // The two places being converted. label === null means "California"
  // (its name is translated on the fly). to.tz === '' means not chosen yet.
  const side = { from: { tz: CA_ZONE, label: null }, to: { tz: '', label: '' } };
  const sideName = (sd) => sd.label || zoneLabel(sd.tz);

  // Time of day is chosen with three plain drop-downs (hour, minute, AM/PM)
  // instead of the browser's own time box, whose minute wheel runs past 59
  // and can quietly push the hour forward. Here minutes always start at 00
  // and can never change the hour. English uses a 12-hour clock with AM/PM;
  // the other languages use a 24-hour clock.
  const uses12h = () => getLang() === 'en';
  let lastTime = null; // last chosen { h, m } in 24h form, kept across language switches

  function getTime() {
    const hSel = $('tzConvHour'), mSel = $('tzConvMin'), apSel = $('tzConvAmPm');
    if (!hSel.value || !mSel.value) return null;
    let h = +hSel.value;
    if (uses12h()) h = (h % 12) + (apSel.value === 'PM' ? 12 : 0);
    return { h, m: +mSel.value };
  }

  function setTime(h, m) {
    lastTime = { h, m };
    const hSel = $('tzConvHour'), mSel = $('tzConvMin'), apSel = $('tzConvAmPm');
    const twelve = uses12h();
    hSel.textContent = ''; mSel.textContent = ''; apSel.textContent = '';
    const opt = (sel, value, text) => {
      const o = document.createElement('option');
      o.value = String(value); o.textContent = text; sel.appendChild(o);
    };
    if (twelve) {
      for (let i = 1; i <= 12; i++) opt(hSel, i, String(i));
      opt(apSel, 'AM', 'AM'); opt(apSel, 'PM', 'PM');
      hSel.value = String(h % 12 === 0 ? 12 : h % 12);
      apSel.value = h >= 12 ? 'PM' : 'AM';
    } else {
      for (let i = 0; i < 24; i++) opt(hSel, i, pad(i));
      hSel.value = String(h);
    }
    apSel.hidden = !twelve;
    for (let i = 0; i < 60; i++) opt(mSel, i, pad(i));
    mSel.value = String(m);
  }

  function setNow() {
    const tz = side.from.tz || CA_ZONE;
    const p = pcLocalParts(new Date(), tz);
    $('tzConvDate').value = p.year + '-' + pad(p.month) + '-' + pad(p.day);
    setTime(p.hour, p.minute);
  }

  function renderConverter() {
    const out = $('tzConvResult');
    if (!out) return;
    out.textContent = '';
    const from = side.from.tz;
    const to = side.to.tz;
    const fromName = side.from.tz ? sideName(side.from) : '';
    const toName = side.to.tz ? sideName(side.to) : '';
    const dateVal = $('tzConvDate').value;
    const tmv = getTime();

    const msg = (key, vars, cls) => {
      const p = document.createElement('p');
      p.className = 'status-text' + (cls ? ' ' + cls : '');
      p.textContent = t(key, vars);
      out.appendChild(p);
    };

    if (!from || !to) { msg('tzEnterZone'); return; }
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateVal);
    if (!dm || !tmv) { msg('tzNeedDate'); return; }

    const r = zonedToUtc(+dm[1], +dm[2], +dm[3], tmv.h, tmv.m, from);
    if (r.status === 'skipped') { msg('tzSkippedHour', { zone: fromName }); return; }
    const inst = r.date;

    // Rows: From, To, and California (if not already one of those). Nothing
    // is ever added from the device's own clock setting.
    const rows = [];
    const seen = new Set();
    const add = (labelText, tz) => {
      const text = fmtDateTime(inst, tz);
      if (seen.has(text)) return;
      seen.add(text);
      rows.push({ labelText, text });
    };
    add(fromName, from);
    add(toName, to);
    if (from !== CA_ZONE && to !== CA_ZONE) add(t('tzResultCalifornia'), CA_ZONE);

    const box = document.createElement('div');
    box.className = 'tz-result-box';
    rows.forEach((row) => {
      const d = document.createElement('div');
      d.className = 'tz-result-row';
      const l = document.createElement('span');
      l.className = 'tz-result-label';
      l.textContent = row.labelText;
      const v = document.createElement('span');
      v.className = 'tz-result-value';
      v.textContent = row.text;
      d.appendChild(l); d.appendChild(v);
      box.appendChild(d);
    });
    out.appendChild(box);

    const gapAt = (dt) => offsetMin(dt, to) - offsetMin(dt, from);
    const gap = gapAt(inst);
    if (gap === 0) msg('tzGapSame');
    else msg(gap > 0 ? 'tzGapAhead' : 'tzGapBehind', { to: toName, from: fromName, gap: gapText(gap) });

    if (r.status === 'ambiguous') msg('tzAmbiguousHour', { zone: fromName }, 'tz-note');
    const W = 21 * 86400000;
    if (gapAt(new Date(inst.getTime() - W)) !== gap || gapAt(new Date(inst.getTime() + W)) !== gap) {
      msg('tzClockChangeNote', null, 'tz-note');
    }
  }

  function syncInputs() {
    ['from', 'to'].forEach((w) => {
      const input = $('tzConv' + (w === 'from' ? 'From' : 'To') + 'City');
      if (!input) return;
      if (side[w].tz) input.value = sideName(side[w]);
    });
  }

  function choose(w, tz, label) {
    side[w] = { tz, label };
    const cap = w === 'from' ? 'From' : 'To';
    $('tzConv' + cap + 'City').value = sideName(side[w]);
    $('tzConv' + cap + 'Results').textContent = '';
    $('tzConv' + cap + 'Status').textContent = '';
    if (w === 'from') setNow();
    renderConverter();
    updateShowBox();
  }

  async function searchSide(w) {
    const cap = w === 'from' ? 'From' : 'To';
    const input = $('tzConv' + cap + 'City');
    const status = $('tzConv' + cap + 'Status');
    const results = $('tzConv' + cap + 'Results');
    const q = input.value.trim();
    results.textContent = '';
    status.textContent = '';
    if (!q) { status.textContent = t('enterCityNameFirst'); return; }
    // Power users can still type a zone name such as Europe/Paris directly.
    if (q.indexOf('/') > 0 && isValidZone(q)) { choose(w, q, zoneLabel(q)); return; }
    if (typeof pcGeocodeCity !== 'function') { status.textContent = t('cityLookupFailed'); return; }
    status.textContent = t('searchingStatus');
    try {
      const list = await pcGeocodeCity(q);
      if (!list.length) { status.textContent = t('tzNoCityMatch'); return; }
      if (list.length === 1) { choose(w, list[0].timezone, list[0].label); return; }
      status.textContent = t('selectAMatch');
      list.forEach((r) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'city-option';
        btn.textContent = r.label + ' \u2014 ' + r.timezone;
        btn.addEventListener('click', () => choose(w, r.timezone, r.label));
        results.appendChild(btn);
      });
    } catch (e) {
      console.error('Converter city search failed:', e);
      status.textContent = e && e.message ? e.message : t('cityLookupFailed');
    }
  }

  function initConverter() {
    if (converterReady || !$('tzConvFromCity')) return;
    converterReady = true;
    // "From" starts as California so people can enter e.g. 9:00 AM California;
    // "To" starts empty for them to search for their own city. Nothing is
    // read from the device's own time zone setting.
    syncInputs();
    setNow();
    ['from', 'to'].forEach((w) => {
      const cap = w === 'from' ? 'From' : 'To';
      const input = $('tzConv' + cap + 'City');
      $('tzConv' + cap + 'Search').addEventListener('click', () => searchSide(w));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchSide(w); } });
      // Editing the text un-selects the place until it is searched again.
      input.addEventListener('input', () => {
        if (side[w].tz && input.value !== sideName(side[w])) { side[w] = { tz: '', label: '' }; renderConverter(); updateShowBox(); }
      });
      $('tzConv' + cap + 'CA').addEventListener('click', () => choose(w, CA_ZONE, null));
    });
    ['tzConvDate', 'tzConvHour', 'tzConvMin', 'tzConvAmPm'].forEach((id) => {
      const onTimeEdit = () => { const t2 = getTime(); if (t2) lastTime = t2; renderConverter(); };
      $(id).addEventListener('input', onTimeEdit);
      $(id).addEventListener('change', onTimeEdit);
    });
    $('tzConvShowOnEventsBox').addEventListener('change', () => {
      const to = side.to;
      if ($('tzConvShowOnEventsBox').checked && to.tz) pref = { tz: to.tz, label: sideName(to) };
      else if (pref && pref.tz === to.tz) pref = null;
      savePref(); updatePrefRow(); renderEvents();
    });
    $('eventsPrefStop').addEventListener('click', () => {
      pref = null; savePref(); updatePrefRow(); updateShowBox(); renderEvents();
    });
    $('tzConvNow').addEventListener('click', () => { setNow(); renderConverter(); });
    renderConverter();
  }

  // ---- upcoming events ---------------------------------------------------

  function parseLocal(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(String(str || '').trim());
    return m ? { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : null, mi: m[5] ? +m[5] : null } : null;
  }

  /** Normalise one raw JSON entry; returns null if it is unusable. */
  function normaliseEvent(raw) {
    if (!raw || typeof raw !== 'object' || !raw.title) return null;
    const tz = isValidZone(raw.timezone) ? raw.timezone : CA_ZONE;
    const s = parseLocal(raw.start);
    if (!s) return null;
    const allDay = raw.allDay === true || s.h === null;
    const ev = { raw, tz, allDay };
    if (allDay) {
      const e = parseLocal(raw.endDate || raw.end) || s;
      ev.startDate = s; ev.endDate = e;
      ev.startInst = zonedToUtc(s.y, s.mo, s.d, 0, 0, tz).date;
      ev.endInst = zonedToUtc(e.y, e.mo, e.d, 23, 59, tz).date;
    } else {
      ev.startInst = zonedToUtc(s.y, s.mo, s.d, s.h, s.mi, tz).date;
      const e = parseLocal(raw.end);
      ev.endInst = e && e.h !== null
        ? zonedToUtc(e.y, e.mo, e.d, e.h, e.mi, tz).date
        : null;
    }
    return ev;
  }

  function eventText(ev, field) {
    const tr = ev.raw.translations && ev.raw.translations[getLang()];
    return (tr && tr[field]) || ev.raw[field] || '';
  }

  function rangeText(ev, tz) {
    const a = ev.startInst, b = ev.endInst;
    if (!b) return fmtDateTime(a, tz);
    if (sameLocalDay(a, b, tz)) {
      return fmtDate(a, tz) + ' · ' + fmtTime(a, tz) + ' – ' + fmtTime(b, tz) + ' ' + zoneAbbr(a, tz);
    }
    return fmtDateTime(a, tz) + ' – ' + fmtDateTime(b, tz);
  }

  function allDayText(ev) {
    const s = ev.startDate, e = ev.endDate;
    const fmt = (o) => new Intl.DateTimeFormat(locale(), {
      timeZone: 'UTC', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    }).format(new Date(Date.UTC(o.y, o.mo - 1, o.d, 12)));
    const same = s.y === e.y && s.mo === e.mo && s.d === e.d;
    return (same ? fmt(s) : fmt(s) + ' – ' + fmt(e)) + ' · ' + t('eventAllDay');
  }

  function renderEvents() {
    const list = $('upcomingEventsList');
    if (!list) return;
    list.textContent = '';
    const note = (key) => {
      const p = document.createElement('p');
      p.className = 'status-text';
      p.textContent = t(key);
      list.appendChild(p);
    };
    if (events === 'error') { note('upcomingEventsError'); return; }
    if (events === null) return;
    const now = Date.now();
    const upcoming = events
      .filter((ev) => (ev.endInst ? ev.endInst.getTime() : ev.startInst.getTime() + 2 * 3600000) > now)
      .sort((a, b) => a.startInst - b.startInst);
    if (upcoming.length === 0) { note('upcomingEventsEmpty'); return; }

    upcoming.forEach((ev) => {
      const card = document.createElement('div');
      card.className = 'event-item';

      const h = document.createElement('h3');
      h.className = 'event-title';
      const title = eventText(ev, 'title');
      if (ev.raw.link) {
        const a = document.createElement('a');
        a.href = ev.raw.link; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = title;
        h.appendChild(a);
      } else h.textContent = title;
      card.appendChild(h);

      const line = (labelText, text, cls) => {
        const p = document.createElement('p');
        p.className = 'event-time ' + (cls || '');
        if (labelText) {
          const b = document.createElement('strong');
          b.textContent = labelText + ': ';
          p.appendChild(b);
        }
        p.appendChild(document.createTextNode(text));
        card.appendChild(p);
      };

      if (ev.allDay) {
        line('', allDayText(ev));
      } else {
        line(ev.tz === CA_ZONE ? t('tzResultCalifornia') : zoneLabel(ev.tz), rangeText(ev, ev.tz), 'event-time-ca');
        if (pref && pref.tz !== ev.tz) {
          const mine = rangeText(ev, pref.tz);
          if (mine !== rangeText(ev, ev.tz)) line(pref.label, mine, 'event-time-mine');
        }
      }

      if (ev.raw.location) line('', ev.raw.location, 'event-location');
      const desc = eventText(ev, 'description');
      if (desc) {
        const p = document.createElement('p');
        p.className = 'event-desc';
        p.textContent = desc;
        card.appendChild(p);
      }
      list.appendChild(card);
    });
  }

  function loadEvents() {
    return fetch('upcoming-events.json', { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then((data) => {
        const arr = data && Array.isArray(data.events) ? data.events : [];
        events = arr.map(normaliseEvent).filter(Boolean);
      })
      .catch((e) => {
        console.error('Could not load upcoming-events.json:', e);
        events = 'error';
      })
      .then(renderEvents);
  }

  // ---- public hooks --------------------------------------------------------

  window.PcEventsTools = {
    init(opts) {
      if (opts && opts.t) t = opts.t;
      if (opts && opts.getLang) getLang = opts.getLang;
      loadPref();
      initConverter();
      updatePrefRow();
      loadEvents();
    },
    refresh() {
      if (lastTime && $('tzConvHour')) setTime(lastTime.h, lastTime.m);
      syncInputs(); renderConverter(); updateShowBox(); updatePrefRow(); renderEvents();
    },
    onTabShown() { renderEvents(); },
    // exposed for tests
    _zonedToUtc: zonedToUtc,
    _normaliseEvent: normaliseEvent,
  };
})();
