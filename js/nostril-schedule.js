/*
 * nostril-schedule.js — core Prana Calendar rules.
 *
 * ---------------------------------------------------------------------
 * OVERVIEW (rewritten to the "5-group" model)
 * ---------------------------------------------------------------------
 * Each lunar cycle runs from one moon-phase anchor (new moon -> Left
 * nostril, full moon -> Right nostril) to the next. A cycle nominally
 * spans exactly 15 tithis, alternating in five 3-day groups:
 *
 *   Group:     A        B        C        D        E
 *   Nostril:   anchor   opp.     anchor   opp.     anchor
 *
 * Because tithi length varies slightly relative to the solar day, a
 * cycle's 15 tithis can occupy 14, 15, or 16 solar days:
 *
 *   - 15 days (normal): each group is exactly 3 days. No adjustment.
 *   - 16 days ("adhika"): one tithi spans two consecutive sunrises, so
 *     one of B/C/D absorbs an extra day (4-day block). Groups A and E
 *     are NEVER adjusted — they are always exactly the first/last 3
 *     days of the cycle.
 *   - 14 days ("kshaya"): one tithi has no sunrise at all (it starts
 *     after one sunrise and ends before the next), so one of B/C/D
 *     loses a day (2-day short). Again, A and E are never touched.
 *
 * Which of B/C/D absorbs the extra/missing day, and which nostril the
 * resulting remainder block carries, is governed by the REMAINDER
 * NOSTRIL RULE + POSITION RULE below (no year-level carry-state
 * involved — each cycle is resolved entirely on its own):
 *
 *   REMAINDER NOSTRIL RULE (fixed by type, never by history):
 *     - 4-day block (adhika tithi)  -> always the MINORITY nostril,
 *       i.e. the opposite of the anchor nostril that Groups A and E
 *       carry.
 *     - 2-day short (kshaya tithi)  -> always the MAJORITY nostril,
 *       i.e. the same as the anchor nostril that Groups A and E carry.
 *
 *   POSITION RULE (tithi-proximity based):
 *     - Place the remainder as close to the adhika/kshaya tithi as
 *       possible.
 *     - It must end up with the correct nostril per the rule above.
 *     - Never placed in Group A or Group E.
 *     - If the correct-nostril candidate is equidistant between B and
 *       D, prefer D first, then B.
 *     - If B and D are both the wrong nostril for this remainder,
 *       place it in Group C instead.
 *
 * See pcPlaceRemainderBlock() for the shared implementation of the
 * position+nostril rule (used for both adhika and kshaya cycles) and
 * pcBuildCycleGroups() for how it's applied. Because every cycle's
 * remainder nostril is now fully determined by that cycle's own tithi
 * sequence and anchor nostril, cycles no longer need to be resolved in
 * order or thread any state between them (previous versions of this
 * file carried lastFourNostril / lastShortNostril / shortsSinceFour
 * across cycles; that carry-state logic has been removed entirely).
 * pcBuildYearSchedule() still walks the year's cycles in chronological
 * order for convenience (building the day-map and feeding the annual
 * balancing pass), but nothing about the per-cycle nostril computation
 * depends on that order any more. The result is cached per (year, lat,
 * lon, timezone) so it's only computed once and then reused for every
 * date lookup in that year — see PC_YEAR_SCHEDULE_CACHE.
 */

const PC_OPPOSITE = { L: 'R', R: 'L' };

/**
 * Compute the anchor day for a single moon-phase event.
 * event: { type: 'new'|'full', utc: Date }
 * Returns: { dateMs, ymd, nostril, moonUTC, sunriseUTC, localMoonDate }
 */
function pcComputeAnchor(event, lat, lon, timezone) {
  const localMoonDate = pcLocalDateOnly(event.utc, timezone);
  const sunriseUTC = pcSunriseUTC(
    localMoonDate.year,
    localMoonDate.month,
    localMoonDate.day,
    lat,
    lon
  );

  let anchorYmd = localMoonDate;
  let polarNote = null;

  if (sunriseUTC === null) {
    // Polar day/night: sunrise is not defined for this date/location.
    // Fall back conservatively to "next day", and flag it so the UI can
    // note the limitation.
    anchorYmd = pcAddDays(localMoonDate, 1);
    polarNote =
      'No sunrise on this date at this location (polar day/night) — the anchor day was estimated.';
  } else if (event.utc.getTime() >= sunriseUTC.getTime()) {
    anchorYmd = pcAddDays(localMoonDate, 1);
  }

  return {
    dateMs: pcDateOnlyMs(anchorYmd),
    ymd: anchorYmd,
    nostril: event.type === 'new' ? 'L' : 'R',
    moonUTC: event.utc,
    moonType: event.type,
    sunriseUTC,
    localMoonDate,
    polarNote,
  };
}

// -------------------------------------------------------------------
// Per-day tithi sequence (used to detect adhika/kshaya tithis)
// -------------------------------------------------------------------

/**
 * The tithi-in-paksha (1-15) "owning" a given local calendar day, using
 * the existing Tithi math in panchanga.js evaluated at that day's local
 * sunrise instant — the same moment Svar Yoga tradition uses to read
 * the dominant nostril for the day. Falls back to local noon UTC on a
 * date/location with no defined sunrise (polar day/night), so the
 * sequence stays complete even there.
 */
function pcTithiInPakshaForLocalDay(ymd, lat, lon) {
  const sunriseUTC = pcSunriseUTC(ymd.year, ymd.month, ymd.day, lat, lon);
  const instant =
    sunriseUTC || new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12, 0, 0));
  return pcComputePanchanga(instant).tithiInPaksha;
}

/**
 * Build the tithi-in-paksha sequence for every day of a cycle, from the
 * anchor day (dayIndex 0) up to (but not including) the next anchor.
 */
function pcBuildTithiSeq(anchorYmd, totalDays, lat, lon) {
  const seq = [];
  for (let i = 0; i < totalDays; i++) {
    seq.push(pcTithiInPakshaForLocalDay(pcAddDays(anchorYmd, i), lat, lon));
  }
  return seq;
}

/**
 * Determine the one tithi anomaly a cycle should have, GATED BY THE
 * CYCLE'S OWN LENGTH FIRST — totalDays decides which single anomaly
 * type is even looked for, and the other is never checked:
 *
 *   - 15 days: no tithi anomaly calculation needed at all — standard
 *     3-3-3-3-3 pattern, full stop.
 *   - 16 days: look ONLY for an adhika (double-sunrise) tithi. A
 *     kshaya signature appearing anywhere in the same sequence is
 *     ignored — it isn't what makes this cycle 16 days, so it isn't
 *     what this cycle's anomaly is.
 *   - 14 days: look ONLY for a kshaya (skipped-sunrise) tithi. An
 *     adhika signature appearing anywhere in the same sequence is
 *     ignored — same reasoning.
 *   - anything else: no clean single-anomaly cycle length, so no scan
 *     is meaningful — straight to 'irregular' (the "remainder in
 *     Group D" fallback rule takes it from there).
 *
 * The two detections are NEVER both run against the same cycle. This
 * matters for real data: a cycle can occasionally net out to 14 or 16
 * days while its raw tithi sequence *also* contains a signature of the
 * other anomaly type elsewhere (e.g. a repeat AND a skip that mostly
 * cancel out) — cycle length is the authoritative signal for which
 * anomaly this cycle actually has, so it's checked first and the
 * search for the other kind never happens.
 *
 * Returns { type: 'none' | 'adhika' | 'kshaya' | 'irregular', tithi, dayIndex }.
 * dayIndex is the first day-index the anomalous tithi is associated
 * with (the first of its two days for adhika; the day right before the
 * gap for kshaya).
 */
function pcDetectTithiAnomaly(tithiSeq, totalDays) {
  const n = tithiSeq.length;

  if (totalDays === 15) {
    return { type: 'none' };
  }

  if (totalDays === 16) {
    // Adhika ONLY: an adjacent repeated tithi value. This works
    // regardless of where in the sequence it falls, including right at
    // the start (tithi 1 doubled) or end (tithi 15 doubled) — a repeat
    // is always visible as two equal neighbors.
    for (let i = 0; i < n - 1; i++) {
      if (tithiSeq[i + 1] === tithiSeq[i]) {
        return { type: 'adhika', tithi: tithiSeq[i], dayIndex: i };
      }
    }
    return { type: 'irregular' }; // 16 days but no repeat found — unexpected
  }

  if (totalDays === 14) {
    // Kshaya ONLY: a missing tithi. A gap in the MIDDLE of the sequence
    // shows up as a jump of 2 between neighbors — but a gap at the very
    // start or very end doesn't (the rest of the sequence is just
    // uniformly shifted by one with no internal jump to spot), so those
    // two edge cases are checked directly against what tithi 1 and
    // tithi 15 ought to look like.
    if (tithiSeq[0] === 2) return { type: 'kshaya', tithi: 1, dayIndex: -1 };
    if (tithiSeq[n - 1] === 14) return { type: 'kshaya', tithi: 15, dayIndex: n - 1 };
    for (let i = 0; i < n - 1; i++) {
      if (tithiSeq[i + 1] === tithiSeq[i] + 2) {
        return { type: 'kshaya', tithi: tithiSeq[i] + 1, dayIndex: i };
      }
    }
    return { type: 'irregular' }; // 14 days but no skip found — unexpected
  }

  return { type: 'irregular' }; // any other cycle length — no clean single-anomaly case applies
}

/** Which of the five nominal 3-tithi groups a tithi (1-15) falls in. */
function pcNominalGroupForTithi(tithi) {
  if (tithi <= 3) return 'A';
  if (tithi <= 6) return 'B';
  if (tithi <= 9) return 'C';
  if (tithi <= 12) return 'D';
  return 'E';
}

/**
 * Shared placement rule for a cycle's remainder block (the 4-day adhika
 * block or the 2-day kshaya short), implementing the REMAINDER NOSTRIL
 * RULE + POSITION RULE described in the module doc comment:
 *
 *   - `requiredNostril` is fixed by the caller from the remainder's
 *     TYPE alone (minority/opposite-of-anchor for a 4-day block,
 *     majority/anchor for a 2-day short) — never from any carried-over
 *     state.
 *   - Placement starts from whichever of B/D is nominally closest to
 *     the anomalous tithi (tithi 1-6 -> B, tithi 10-15 -> D), used only
 *     if it already carries the required nostril (B and D always carry
 *     the opposite-of-anchor nostril structurally; C always carries the
 *     anchor nostril structurally — see nostrilByGroup in
 *     pcBuildCycleGroups).
 *   - A tithi that falls in nominal Group C's range (7-9) is equidistant
 *     enough between B and D that it's resolved by exact tithi
 *     distance, preferring D on an exact tie.
 *   - Group A and Group E are never candidates.
 *   - Whenever the nominally-closest group (B or D) is the wrong
 *     nostril for this remainder, it falls back to Group C instead —
 *     which is guaranteed correct for that case, since B/D and C always
 *     carry opposite nostrils from each other.
 *
 * @param {number} tithi  the anomaly's tithi (1-15), used to judge
 *   proximity — the repeated tithi for an adhika block, the skipped
 *   tithi for a kshaya short.
 * @param {'L'|'R'} requiredNostril
 * @param {{A:string,B:string,C:string,D:string,E:string}} nostrilByGroup
 *   this cycle's fixed per-group nostril identity.
 * @returns {'B'|'C'|'D'}
 */
function pcPlaceRemainderBlock(tithi, requiredNostril, nostrilByGroup) {
  const nominal = pcNominalGroupForTithi(tithi);
  if (nominal === 'C') {
    if (nostrilByGroup.C === requiredNostril) return 'C';
    // Neither B nor D is "more correct" by nostril (both carry the
    // opposite nostril) — break the tie by which is physically closer
    // to the anomalous tithi.
    const distToB = tithi - 6; // tithi 7,8,9 -> 1,2,3
    const distToD = 10 - tithi; // tithi 7,8,9 -> 3,2,1
    return distToB < distToD ? 'B' : 'D'; // equidistant -> D
  }
  // A, B, D, E all map to a single specific preferred group (B or D
  // respectively for A/B and D/E) — this is also how a tithi that falls
  // in the fixed Group A or Group E gets shifted into the nearest legal
  // group (B for A, D for E).
  const preferred = nominal === 'A' || nominal === 'B' ? 'B' : 'D';
  return nostrilByGroup[preferred] === requiredNostril ? preferred : 'C';
}

// -------------------------------------------------------------------
// Group day-ranges + nostril assignment for a single cycle
// -------------------------------------------------------------------

/**
 * Build the {A,B,C,D,E} day-ranges (as [startDayIndex, endDayIndex))
 * and per-group nostril for one lunar cycle. Fully self-contained: no
 * state is threaded in from — or carried out to — any other cycle. See
 * the module doc comment for the REMAINDER NOSTRIL RULE + POSITION RULE
 * this implements.
 *
 * @param {number} totalDays  14, 15, or 16 (occasionally something else
 *   from a fluke long/short cycle — see the "irregular" fallback).
 * @param {number[]} tithiSeq  from pcBuildTithiSeq(), length totalDays.
 * @param {'L'|'R'} anchorNostril
 */
function pcBuildCycleGroups(totalDays, tithiSeq, anchorNostril) {
  const oppNostril = PC_OPPOSITE[anchorNostril];
  // A and E are always exactly the first/last 3 days of the cycle —
  // "Groups A and E always exactly 3 days, never adjusted."
  const groups = { A: [0, 3], E: [totalDays - 3, totalDays] };
  // The nostril identity of each group never changes regardless of
  // which one ends up short/long — only ITS LENGTH does.
  const nostrilByGroup = { A: anchorNostril, B: oppNostril, C: anchorNostril, D: oppNostril, E: anchorNostril };

  const anomaly = pcDetectTithiAnomaly(tithiSeq, totalDays);

  if (totalDays === 15 && anomaly.type === 'none') {
    groups.B = [3, 6];
    groups.C = [6, 9];
    groups.D = [9, 12];
  } else if (totalDays === 16 && anomaly.type === 'adhika') {
    // 4-DAY BLOCK: always the MINORITY nostril, i.e. the opposite of
    // this cycle's anchor nostril. See pcPlaceRemainderBlock() for the
    // shared position+nostril placement rule.
    const requiredNostril = oppNostril;
    const target = pcPlaceRemainderBlock(anomaly.tithi, requiredNostril, nostrilByGroup);
    const middle = { B: 3, C: 3, D: 3 };
    middle[target] = 4;
    let cursor = 3;
    groups.B = [cursor, cursor + middle.B]; cursor += middle.B;
    groups.C = [cursor, cursor + middle.C]; cursor += middle.C;
    groups.D = [cursor, cursor + middle.D]; cursor += middle.D;
  } else if (totalDays === 14 && anomaly.type === 'kshaya') {
    // 2-DAY SHORT: always the MAJORITY nostril, i.e. the same as this
    // cycle's anchor nostril. See pcPlaceRemainderBlock() for the
    // shared position+nostril placement rule.
    const requiredNostril = anchorNostril;
    const shortGroup = pcPlaceRemainderBlock(anomaly.tithi, requiredNostril, nostrilByGroup);
    const middle = { B: 3, C: 3, D: 3 };
    middle[shortGroup] = 2;
    let cursor = 3;
    groups.B = [cursor, cursor + middle.B]; cursor += middle.B;
    groups.C = [cursor, cursor + middle.C]; cursor += middle.C;
    groups.D = [cursor, cursor + middle.D]; cursor += middle.D;
  } else {
    // FALLBACK: an irregular cycle (anomaly detection came back
    // ambiguous, or totalDays isn't 14/15/16 at all) — "default to
    // placing remainder in Group D."
    const middleTotal = totalDays - 6; // everything except fixed A(3) + E(3)
    const bc = 3;
    const cc = 3;
    const dc = Math.max(0, middleTotal - bc - cc);
    let cursor = 3;
    groups.B = [cursor, cursor + bc]; cursor += bc;
    groups.C = [cursor, cursor + cc]; cursor += cc;
    groups.D = [cursor, cursor + dc]; cursor += dc;
  }

  return { groups, nostrilByGroup, anomaly };
}

/** Which nostril applies at `dayIndex` days after the cycle's anchor. */
function pcNostrilForDayIndexInCycle(dayIndex, groups, nostrilByGroup) {
  for (const g of ['A', 'B', 'C', 'D', 'E']) {
    const [start, end] = groups[g];
    if (dayIndex >= start && dayIndex < end) return nostrilByGroup[g];
  }
  // Shouldn't happen (dayIndex out of range for this cycle) — safe default.
  return nostrilByGroup.E;
}

// -------------------------------------------------------------------
// Annual balancing pass
// -------------------------------------------------------------------
//
// The tithi-rule pass above (pcBuildCycleGroups, run sequentially for
// every cycle in the year) decides each cycle's remainder block on its
// own merits — where the year ends up landing on L vs. R overall is
// just whatever falls out of that. This second, separate pass runs
// AFTER all cycles are built and looks at the year as a whole: if one
// nostril's 4-blocks-minus-shorts score ends up more than 1 away from
// the other's, it nudges the imbalance back by flipping the nostril of
// already-placed 2-day shorts — never touching 4-day blocks or anchor
// days, and never changing WHICH days are short, only which nostril
// they're recorded as.

/**
 * Classify a cycle's non-fixed remainder block (the one grown/shrunk
 * relative to the standard 3 days, if any) once its groups are set.
 * Returns { kind: 'normal'|'four'|'short'|'irregular', group, length, nostril }.
 */
function pcCycleRemainderInfo(cycle) {
  const lens = {};
  for (const g of ['A', 'B', 'C', 'D', 'E']) lens[g] = cycle.groups[g][1] - cycle.groups[g][0];
  if (lens.B === 3 && lens.C === 3 && lens.D === 3) {
    return { kind: 'normal', group: null, length: 3, nostril: null };
  }
  const group = ['B', 'C', 'D'].find((g) => lens[g] !== 3);
  const length = lens[group];
  const nostril = cycle.nostrilByGroup[group];
  let kind;
  if (length === 4 && cycle.anomaly.type === 'adhika') kind = 'four';
  else if (length === 2 && cycle.anomaly.type === 'kshaya') kind = 'short';
  else kind = 'irregular'; // the "remainder in Group D" fallback case — never flipped
  return { kind, group, length, nostril };
}

/** scoreR/scoreL per spec: each 4-block is +1 for its nostril, each
 *  2-day short is -1 for its nostril. Normal (3-day) cycles and
 *  irregular/fallback cycles are neutral. */
function pcComputeAnnualScores(cycles) {
  let scoreR = 0, scoreL = 0;
  for (const cycle of cycles) {
    const info = pcCycleRemainderInfo(cycle);
    if (info.kind === 'four') {
      if (info.nostril === 'R') scoreR += 1; else scoreL += 1;
    } else if (info.kind === 'short') {
      if (info.nostril === 'R') scoreR -= 1; else scoreL -= 1;
    }
  }
  return { scoreR, scoreL };
}

/**
 * Run the balancing pass in place: while |scoreR - scoreL| > 1, find an
 * eligible 2-day short belonging to the LOWER-scoring nostril and flip
 * its recorded nostril to the other one (raising the lower score by 1,
 * lowering the higher score by 1 — never touching 4-blocks or anchors).
 * Mutates `cycle.nostrilByGroup` for each flipped cycle and the day-map
 * entries for that cycle's 2-day span. Returns the adjustment log.
 *
 * Eligibility priority, per spec (unchanged from before the carry-state
 * removal — kept exactly as implemented):
 *   1. consecutive shorts that are NOT the 1st short after a 4-block
 *   2. only if still unbalanced: any remaining short, including 1st
 *      shorts after a 4
 * Within a priority tier, the earliest (chronological) eligible short
 * of the needed nostril is chosen — the spec doesn't specify a
 * tie-break, so this is a documented, deterministic default.
 *
 * NOTE: tier 1 keys off `cycle.isFirstShortAfterFour`, which was a
 * byproduct of the now-removed carry-state tracking (it required
 * knowing how many shorts had occurred since the last 4-day block).
 * Cycles no longer carry that field, so it reads as `undefined` here,
 * tier 1's filter never matches, and every call falls straight through
 * to tier 2 (any remaining eligible short, earliest first) — which is
 * exactly the historical fallback behavior for this pass, so the logic
 * below is left untouched.
 */
function pcApplyAnnualBalancingPass(cycles, days) {
  const log = [];
  const flipped = new Set();
  let { scoreR, scoreL } = pcComputeAnnualScores(cycles);

  function eligiblePool(requiredNostril, priorityTier) {
    return cycles
      .map((cycle, idx) => ({ cycle, idx, info: pcCycleRemainderInfo(cycle) }))
      .filter(({ idx, info }) => info.kind === 'short' && info.nostril === requiredNostril && !flipped.has(idx))
      .filter(({ cycle }) => (priorityTier === 1 ? cycle.isFirstShortAfterFour === false : true))
      .sort((a, b) => a.cycle.anchor.dateMs - b.cycle.anchor.dateMs);
  }

  // Safety valve: with a bounded number of cycles per year, the pass
  // can flip at most one short per iteration, so this bound is always
  // more than enough and just guards against an unforeseen infinite loop.
  const maxIterations = cycles.length * 2 + 10;
  let iterations = 0;

  while (Math.abs(scoreR - scoreL) > 1 && iterations < maxIterations) {
    iterations++;
    const lowerNostril = scoreR < scoreL ? 'R' : 'L';

    let pool = eligiblePool(lowerNostril, 1);
    if (pool.length === 0) pool = eligiblePool(lowerNostril, 2);
    if (pool.length === 0) break; // nothing left that can legally be flipped

    const chosen = pool[0];
    const { cycle, info } = chosen;
    const before = { scoreR, scoreL };
    const newNostril = PC_OPPOSITE[info.nostril];

    cycle.nostrilByGroup[info.group] = newNostril;
    flipped.add(chosen.idx);

    const [dayStart, dayEnd] = cycle.groups[info.group];
    for (let dayIndex = dayStart; dayIndex < dayEnd; dayIndex++) {
      days.set(cycle.anchor.dateMs + dayIndex * 86400000, newNostril);
    }

    ({ scoreR, scoreL } = pcComputeAnnualScores(cycles));
    log.push({
      anchorDate: cycle.anchor.ymd,
      cycleAnchorDateMs: cycle.anchor.dateMs,
      group: info.group,
      fromNostril: info.nostril,
      toNostril: newNostril,
      wasFirstShortAfterFour: cycle.isFirstShortAfterFour,
      scoreBefore: before,
      scoreAfter: { scoreR, scoreL },
    });
  }

  return log;
}

// -------------------------------------------------------------------
// Year-level schedule: walk every cycle in chronological order and
// build the day-map. Each cycle's own nostril rules are now fully
// self-contained (see pcBuildCycleGroups) — this pass no longer
// threads any state between cycles; it walks in order simply because
// that's a natural way to build the day-map and feed the annual
// balancing pass afterward.
// -------------------------------------------------------------------

const PC_YEAR_SCHEDULE_CACHE = new Map();

/**
 * Build (and cache) the full dominant-nostril schedule for every day of
 * `year` at a given location. Runs lazily on first use for that
 * (year, location) pair — the app doesn't know a location until the
 * user provides one — and the result is cached so each (year, lat, lon,
 * timezone) combination is only computed once.
 *
 * Returns { days: Map<dateMs, nostril>, cycles: [...] } — `cycles` is
 * kept mainly for debugging/testing.
 */
function pcBuildYearSchedule(year, lat, lon, timezone) {
  const cacheKey = `${year}|${lat}|${lon}|${timezone}`;
  if (PC_YEAR_SCHEDULE_CACHE.has(cacheKey)) {
    return PC_YEAR_SCHEDULE_CACHE.get(cacheKey);
  }

  // Pad generously beyond the calendar year so the cycle covering
  // Jan 1 (which starts before it) and the cycle covering Dec 31
  // (which ends after it) are both fully captured.
  const windowStart = new Date(Date.UTC(year - 1, 11, 1));
  const windowEnd = new Date(Date.UTC(year + 1, 0, 31));
  const events = pcMoonPhasesInRange(windowStart, windowEnd);

  const anchors = events
    .map((ev) => pcComputeAnchor(ev, lat, lon, timezone))
    .sort((a, b) => a.dateMs - b.dateMs);

  const days = new Map();
  const cycles = [];

  for (let i = 0; i < anchors.length - 1; i++) {
    const A = anchors[i];
    const B = anchors[i + 1];
    const totalDays = Math.round((B.dateMs - A.dateMs) / 86400000);
    if (totalDays <= 0) continue; // guard against any duplicate/degenerate anchor

    const tithiSeq = pcBuildTithiSeq(A.ymd, totalDays, lat, lon);
    const { groups, nostrilByGroup, anomaly } = pcBuildCycleGroups(totalDays, tithiSeq, A.nostril);

    for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
      const nostril = pcNostrilForDayIndexInCycle(dayIndex, groups, nostrilByGroup);
      const dateMs = A.dateMs + dayIndex * 86400000;
      days.set(dateMs, nostril);
    }

    cycles.push({
      anchor: A,
      nextAnchor: B,
      totalDays,
      groups,
      nostrilByGroup,
      anomaly,
    });
  }

  // Second pass: rebalance the year's overall R/L score by flipping
  // eligible 2-day shorts (never 4-blocks or anchors) so the year as a
  // whole doesn't drift too far to one nostril. See pcApplyAnnualBalancingPass.
  const balancingLog = pcApplyAnnualBalancingPass(cycles, days);

  const schedule = { days, cycles, balancingLog };
  PC_YEAR_SCHEDULE_CACHE.set(cacheKey, schedule);
  return schedule;
}

/**
 * Determine the dominant nostril for a given local calendar date at a
 * given location, from that date's calendar-year schedule (built and
 * cached in one sequential pass — see pcBuildYearSchedule).
 *
 * @param {number} targetYear
 * @param {number} targetMonth  1-12
 * @param {number} targetDay
 * @param {number} lat
 * @param {number} lon  positive East
 * @param {string} timezone  IANA zone, e.g. "America/Phoenix"
 */
function pcGetNostrilForLocalDate(targetYear, targetMonth, targetDay, lat, lon, timezone) {
  const targetMs = Date.UTC(targetYear, targetMonth - 1, targetDay);
  const schedule = pcBuildYearSchedule(targetYear, lat, lon, timezone);

  if (!schedule.days.has(targetMs)) {
    throw new Error('Could not find enough lunar phase data around this date.');
  }

  const nostril = schedule.days.get(targetMs);

  // Locate the cycle this date belongs to, purely to keep returning the
  // same descriptive fields the rest of the app already relies on
  // (anchor/nextAnchor/dayIndex/etc.).
  const cycle = schedule.cycles.find(
    (c) => c.anchor.dateMs <= targetMs && targetMs < c.nextAnchor.dateMs
  );
  if (!cycle) {
    throw new Error('Could not bracket the target date with lunar anchors.');
  }
  const dayIndex = Math.round((targetMs - cycle.anchor.dateMs) / 86400000);
  const group = ['A', 'B', 'C', 'D', 'E'].find((g) => {
    const [s, e] = cycle.groups[g];
    return dayIndex >= s && dayIndex < e;
  });

  return {
    nostril,
    anchor: cycle.anchor,
    nextAnchor: cycle.nextAnchor,
    dayIndex,
    dayOfCycle: dayIndex + 1,
    totalDaysInCycle: cycle.totalDays,
    // Kept for the existing Today-tab "cycle details" display, which
    // predates the 5-group model: the size of whichever B/C/D group
    // isn't a standard 3 days (3 for a normal 15-day cycle).
    remainderBlockDays: cycle.totalDays - 12,
    group,
    anomaly: cycle.anomaly,
  };
}
