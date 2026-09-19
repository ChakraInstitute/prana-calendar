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
 * resulting short block carries, is governed by the placement rules
 * below (verified against the user's 2021-2023 teacher data plus the
 * additional 14/16-day rules supplied afterward). See
 * pcBuildCycleGroups() for the implementation and inline reasoning.
 *
 * YEAR-LEVEL STATE: the nostril of a 2-day short depends on what most
 * recently happened *before* it. Finalized rule ("Option A", chosen
 * after simulating three candidates against real 2026/2017 data): the
 * first TWO consecutive shorts after a 4-day block match that block's
 * nostril; the third consecutive short (and every one after it, still
 * with no new 4-block in between) alternates starting from there. A
 * new 4-block always resets the streak back to zero. That means cycles
 * can't be resolved independently: pcBuildYearSchedule() walks every
 * cycle in a calendar year in chronological order, threading that small
 * piece of state (lastFourNostril / lastShortNostril / shortsSinceFour)
 * from one cycle to the next, exactly as specified ("carry state
 * forward between cycles"). The result is cached per (year, lat, lon,
 * timezone) so it's only computed once and then reused for every date
 * lookup in that year — see PC_YEAR_SCHEDULE_CACHE.
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
 * Decide which of B/C/D grows to 4 days to hold the 4-day (adhika) block,
 * driven directly by the ADHIKA TITHI DAY's absolute position in the
 * cycle — the actual calendar day on which that tithi is active at BOTH
 * the previous sunrise and the current sunrise (i.e. the SECOND of the
 * two consecutive days sharing the repeated tithi number), not the
 * tithi's nominal 1-15 value. Rules, in order:
 *
 *   1. The 4-day block must CONTAIN the adhika tithi day, unless that
 *      day itself falls within the fixed Group A or Group E (which are
 *      never adjusted).
 *   2. Within the block, prefer the adhika day to land at position 4
 *      (the last day of the block), then position 3, then 2, then
 *      position 1 only if no other placement is possible.
 *   3. The block can never extend into Group A or Group E.
 *   4. If the adhika day falls in Group A, shift the entire 4-day block
 *      to start at the beginning of Group B.
 *   5. If the adhika day falls in Group E, shift the entire 4-day block
 *      to end at the last day of Group D.
 *
 * @param {number} totalDays  16 for a clean adhika cycle.
 * @param {number} adhikaDayIndex  absolute 0-based day-index (within the
 *   cycle) of the SECOND of the two consecutive days sharing the
 *   repeated tithi — i.e. anomaly.dayIndex + 1.
 * @returns {{ target: 'B'|'C'|'D', position: number|null, shifted: string|null }}
 */
function pcPlaceAdhikaBlock(totalDays, adhikaDayIndex) {
  const aEnd = 3; // Group A is always days [0, 3)
  const eStart = totalDays - 3; // Group E is always the last 3 days

  if (adhikaDayIndex < aEnd) {
    // Falls in Group A -> shift the whole block to the start of Group B.
    return { target: 'B', position: null, shifted: 'A' };
  }
  if (adhikaDayIndex >= eStart) {
    // Falls in Group E -> shift the whole block to end at Group D's end.
    return { target: 'D', position: null, shifted: 'E' };
  }

  // Otherwise: try each of the three possible placements (grow B, grow C,
  // or grow D — the only three discrete positions a 4-day block can take
  // once A and E are fixed) and, among whichever candidate(s) actually
  // contain the adhika day, prefer the one that puts it at the highest
  // position within the block (4 preferred, then 3, then 2, then 1).
  let best = null;
  for (const target of ['B', 'C', 'D']) {
    const middle = { B: 3, C: 3, D: 3 };
    middle[target] = 4;
    let cursor = aEnd;
    let start = cursor, end = cursor;
    for (const g of ['B', 'C', 'D']) {
      start = cursor;
      end = cursor + middle[g];
      cursor = end;
      if (g === target) break;
    }
    if (adhikaDayIndex >= start && adhikaDayIndex < end) {
      const position = adhikaDayIndex - start + 1; // 1-indexed within the block
      if (!best || position > best.position) {
        best = { target, position, shifted: null };
      }
    }
  }
  // Every index in the middle span [aEnd, eStart) is covered by at least
  // one of the three candidate placements, so `best` is always found;
  // the fallback below is purely defensive.
  return best || { target: 'D', position: null, shifted: null };
}

// -------------------------------------------------------------------
// Group day-ranges + nostril assignment for a single cycle
// -------------------------------------------------------------------

/**
 * Build the {A,B,C,D,E} day-ranges (as [startDayIndex, endDayIndex))
 * and per-group nostril for one lunar cycle, and update the running
 * cross-cycle nostril-continuity state for 2-day shorts.
 *
 * @param {number} totalDays  14, 15, or 16 (occasionally something else
 *   from a fluke long/short cycle — see the "irregular" fallback).
 * @param {number[]} tithiSeq  from pcBuildTithiSeq(), length totalDays.
 * @param {'L'|'R'} anchorNostril
 * @param {object} state  { lastFourNostril, lastShortNostril, shortsSinceFour }
 *   — mutated in place to carry forward into the next cycle. Pass
 *   { lastFourNostril: null, lastShortNostril: null, shortsSinceFour: 0 }
 *   for the very first cycle of a year (see pcBuildYearSchedule).
 */
function pcBuildCycleGroups(totalDays, tithiSeq, anchorNostril, state) {
  let isFirstShortAfterFour = null; // only meaningful for a kshaya (short) cycle — see below
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
    // 4-DAY BLOCK PLACEMENT — driven directly by the absolute day-index
    // of the adhika tithi day (the second of the two consecutive days
    // sharing the repeated tithi at sunrise), not by the tithi's nominal
    // 1-15 value. See pcPlaceAdhikaBlock() for the full rule and
    // rationale (must contain that day; prefer position 4, then 3, then
    // 2, then 1; shift to the start of B / end of D if that day falls in
    // the fixed Group A / Group E).
    const adhikaDayIndex = anomaly.dayIndex + 1;
    const { target } = pcPlaceAdhikaBlock(totalDays, adhikaDayIndex);
    const middle = { B: 3, C: 3, D: 3 };
    middle[target] = 4;
    let cursor = 3;
    groups.B = [cursor, cursor + middle.B]; cursor += middle.B;
    groups.C = [cursor, cursor + middle.C]; cursor += middle.C;
    groups.D = [cursor, cursor + middle.D]; cursor += middle.D;
  } else if (totalDays === 14 && anomaly.type === 'kshaya') {
    // 2-DAY SHORT PLACEMENT (position rule) + NOSTRIL RULE.
    //
    // Required nostril for this short, carried from state — this is the
    // finalized "Option A" rule: the first TWO consecutive shorts after
    // a 4-day block match that block's nostril; the third consecutive
    // short (and every one after it, still with no new 4-block in
    // between) alternates, starting from there. A new 4-block always
    // resets the count back to zero. With no prior context yet this
    // year (no 4-block or short has occurred), fall back to this
    // cycle's own anchor nostril — a reasonable, documented default;
    // the spec doesn't say what happens before any 4/short has occurred.
    const requiredNostril =
      state.lastShortNostril === null
        ? state.lastFourNostril !== null
          ? state.lastFourNostril
          : anchorNostril
        : state.shortsSinceFour < 2
        ? state.lastShortNostril
        : PC_OPPOSITE[state.lastShortNostril];

    const nominal = pcNominalGroupForTithi(anomaly.tithi);
    // B and D always carry the opposite nostril; C always carries the
    // anchor nostril (see nostrilByGroup above) — so "is B/C/D the
    // correct nostril" collapses to a simple comparison against
    // whichever nostril that group structurally always has.
    let shortGroup;
    if (nominal === 'C') {
      if (nostrilByGroup.C === requiredNostril) {
        shortGroup = 'C';
      } else {
        // Neither B nor D is "more correct" by nostril (both carry the
        // opposite nostril) — break the tie by which is physically
        // closer to the kshaya tithi, per the explicit rule.
        const distToB = anomaly.tithi - 6; // tithi 7,8,9 -> 1,2,3
        const distToD = 10 - anomaly.tithi; // tithi 7,8,9 -> 3,2,1
        shortGroup = distToB < distToD ? 'B' : 'D'; // equidistant -> D
      }
    } else {
      // A, B, D, E all map to a single specific preferred group (B or D
      // respectively for A/B and D/E), falling back to C otherwise.
      const preferred = nominal === 'A' || nominal === 'B' ? 'B' : 'D';
      shortGroup = nostrilByGroup[preferred] === requiredNostril ? preferred : 'C';
    }

    const middle = { B: 3, C: 3, D: 3 };
    middle[shortGroup] = 2;
    let cursor = 3;
    groups.B = [cursor, cursor + middle.B]; cursor += middle.B;
    groups.C = [cursor, cursor + middle.C]; cursor += middle.C;
    groups.D = [cursor, cursor + middle.D]; cursor += middle.D;

    // Captured BEFORE the increment below: true iff this is the very
    // first short since the last 4-block (or since the start of the
    // year) — needed by the annual balancing pass (see
    // pcApplyAnnualBalancingPass), which is only allowed to flip a
    // short's nostril if it's NOT this one, as first priority.
    isFirstShortAfterFour = state.shortsSinceFour === 0;

    state.lastShortNostril = nostrilByGroup[shortGroup];
    state.shortsSinceFour += 1;
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

  // Track the most recent 4-day block's nostril for the NEXT short to
  // pick up, and clear any in-progress short streak (a new 4-block
  // resets the alternation — "next short matches the new 4's nostril").
  if (totalDays === 16 && anomaly.type === 'adhika') {
    const adhikaDayIndex = anomaly.dayIndex + 1;
    const { target } = pcPlaceAdhikaBlock(totalDays, adhikaDayIndex);
    state.lastFourNostril = nostrilByGroup[target];
    state.lastShortNostril = null;
    state.shortsSinceFour = 0;
  }

  return { groups, nostrilByGroup, anomaly, isFirstShortAfterFour };
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
 * Eligibility priority, per spec:
 *   1. consecutive shorts that are NOT the 1st short after a 4-block
 *   2. only if still unbalanced: any remaining short, including 1st
 *      shorts after a 4
 * Within a priority tier, the earliest (chronological) eligible short
 * of the needed nostril is chosen — the spec doesn't specify a
 * tie-break, so this is a documented, deterministic default.
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
// Year-level schedule: walk every cycle in chronological order,
// carrying nostril-continuity state forward (per module doc comment).
// -------------------------------------------------------------------

const PC_YEAR_SCHEDULE_CACHE = new Map();

/**
 * Build (and cache) the full dominant-nostril schedule for every day of
 * `year` at a given location: "At app load, calculate all lunar cycles
 * for the current year sequentially. Carry state forward between
 * cycles." In practice this runs lazily on first use for that
 * (year, location) pair rather than unconditionally at startup — the
 * app doesn't know a location until the user provides one — but the
 * effect is the same: every date lookup within a year is served from
 * one single sequential pass over that year's cycles, not resolved in
 * isolation.
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
  const state = { lastFourNostril: null, lastShortNostril: null, shortsSinceFour: 0 };

  for (let i = 0; i < anchors.length - 1; i++) {
    const A = anchors[i];
    const B = anchors[i + 1];
    const totalDays = Math.round((B.dateMs - A.dateMs) / 86400000);
    if (totalDays <= 0) continue; // guard against any duplicate/degenerate anchor

    const tithiSeq = pcBuildTithiSeq(A.ymd, totalDays, lat, lon);
    const { groups, nostrilByGroup, anomaly, isFirstShortAfterFour } = pcBuildCycleGroups(
      totalDays,
      tithiSeq,
      A.nostril,
      state
    );

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
      isFirstShortAfterFour,
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
