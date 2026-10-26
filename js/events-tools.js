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

  function setNow() {
    const from = $('tzConvFrom').value.trim();
    const tz = isValidZone(from) ? from : CA_ZONE;
    const p = pcLocalParts(new Date(), tz);
    $('tzConvDate').value = p.year + '-' + pad(p.month) + '-' + pad(p.day);
    $('tzConvTime').value = pad(p.hour) + ':' + pad(p.minute);
  }

  function renderConverter() {
    const out = $('tzConvResult');
    if (!out) return;
    out.textContent = '';
    const from = $('tzConvFrom').value.trim();
    const to = $('tzConvTo').value.trim();
    const dateVal = $('tzConvDate').value;
    const timeVal = $('tzConvTime').value;

    const msg = (key, vars, cls) => {
      const p = document.createElement('p');
      p.className = 'status-text' + (cls ? ' ' + cls : '');
      p.textContent = t(key, vars);
      out.appendChild(p);
    };

    if (!to && isValidZone(from)) { msg('tzEnterZone'); return; }
    if (!isValidZone(from) || !isValidZone(to)) { msg('tzInvalidZone'); return; }
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateVal);
    const tm = /^(\d{2}):(\d{2})$/.exec(timeVal);
    if (!dm || !tm) { msg('tzNeedDate'); return; }

    const r = zonedToUtc(+dm[1], +dm[2], +dm[3], +tm[1], +tm[2], from);
    if (r.status === 'skipped') { msg('tzSkippedHour', { zone: zoneLabel(from) }); return; }
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
    add(zoneLabel(from), from);
    add(zoneLabel(to), to);
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
    else msg(gap > 0 ? 'tzGapAhead' : 'tzGapBehind', { to: zoneLabel(to), from: zoneLabel(from), gap: gapText(gap) });

    if (r.status === 'ambiguous') msg('tzAmbiguousHour', { zone: zoneLabel(from) }, 'tz-note');
    const W = 21 * 86400000;
    if (gapAt(new Date(inst.getTime() - W)) !== gap || gapAt(new Date(inst.getTime() + W)) !== gap) {
      msg('tzClockChangeNote', null, 'tz-note');
    }
  }

  function initConverter() {
    if (converterReady || !$('tzConvFrom')) return;
    converterReady = true;
    // "From" starts as California so people can enter e.g. 9:00 AM California;
    // "To" starts empty for them to type their own place. Nothing is read
    // from the device's own time zone setting.
    $('tzConvFrom').value = CA_ZONE;
    $('tzConvTo').value = '';
    setNow();
    ['tzConvDate', 'tzConvTime'].forEach((id) => $(id).addEventListener('input', renderConverter));
    ['tzConvFrom', 'tzConvTo'].forEach((id) => $(id).addEventListener('change', renderConverter));
    $('tzConvSwap').addEventListener('click', () => {
      const a = $('tzConvFrom').value;
      $('tzConvFrom').value = $('tzConvTo').value;
      $('tzConvTo').value = a;
      renderConverter();
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
      initConverter();
      loadEvents();
    },
    refresh() { renderConverter(); renderEvents(); },
    onTabShown() { renderEvents(); },
    // exposed for tests
    _zonedToUtc: zonedToUtc,
    _normaliseEvent: normaliseEvent,
  };
})();
