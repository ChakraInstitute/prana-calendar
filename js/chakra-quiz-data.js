/*
 * chakra-quiz-data.js — content for the Chakra Assessment quiz.
 *
 * ============================================================================
 * THIS IS YOUR REAL CONTENT — a few things I drafted myself
 * ============================================================================
 * Everything below is now your real questions, mantra names, and messages,
 * exactly as you gave them. Two things I had to write myself since they
 * weren't specified — please review these:
 *
 *   1. `whySentence` on each entry in PC_CHAKRA_MANTRAS — "one sentence on
 *      why this mantra suits their assessment" (a results-page requirement
 *      you gave) needed actual wording, which I drafted from the theme of
 *      that chakra's questions. These are my best guess at your voice —
 *      edit freely.
 *   2. Every mantra in the app falls into one of two groups (this is your
 *      real product structure, not something inferred from code) — see
 *      js/mantra-catalog.js for the actual streaming URLs, unlock codes,
 *      and purchase links:
 *        - FREE (no payment, no code) — Jai Guru Dev and Shree Radhay
 *          (Heart Chakra Mantra). Neither is tied to a specific chakra or
 *          quiz result — they're general, always-available mantras, which
 *          is why neither appears in PC_CHAKRA_MANTRAS below.
 *        - PAID (locked behind a one-time unlock code, purchasable) — all
 *          nine chakra-tied mantras: Ganapati Deva, Bajaranga Bali, Rama
 *          Chandra Raghuvira, Santoshi Mata, Krishna Radhay Bol, Ekongkara,
 *          Gayatri, Vasudeva (Soma), and Narayana (Crown/7th). Each has a real
 *          `.mantra-item` player slot in the Mantra tab (index.html) that
 *          starts locked — entering that mantra's exact code (from
 *          js/mantra-catalog.js) unlocks it permanently on that device, and
 *          a "Purchase this mantra — $7.50" button links to its own
 *          purchase URL. The quiz's recommendation is guidance only — it
 *          tells the user which mantra to focus on; it does NOT unlock it
 *          for them. Because every one of these nine genuinely has a
 *          player, the results page always shows "available in app" for
 *          whichever one is recommended — a real availability check, not a
 *          positional stand-in. The purification-question and
 *          Chilla-completion GATES below still determine whether Soma/7th
 *          can ever be the quiz's RECOMMENDATION (a scoring rule, unrelated
 *          to the unlock-code system) — when that gate fails, the quiz
 *          still falls back to recommending Gayatri instead, exactly as
 *          before.
 *
 * ============================================================================
 * SCORING — Tier 1 (unchanged) + Tier 2 SEQUENTIAL LADDER — see
 * computeChakraQuizRecommendation / computeTier2LadderRecommendation in
 * app.js
 * ============================================================================
 * Every "Yes" is worth 1 raw point by default, except where a question
 * carries its own explicit `points` value (see PC_CHAKRA_QUIZ_PAGES below),
 * which is used instead. Raw point totals, never percentages.
 *   - Chakra 1 (Root/Muladhara): question 2 worth 2 points, the other three
 *     worth 1 each — max 5.
 *   - Chakra 2 (Sacral/Svadhisthana): question 2 worth 2 points, the other
 *     three worth 1 each — max 5.
 *   - Chakra 3 (Solar Plexus/Manipura): all 4 questions worth 2 points each
 *     via CHAKRA_SCORING_META.pointsPerYes — max 8.
 *   - Chakra 4 (Heart/Anahata): question 2 worth 2 points, the other three
 *     worth 1 each — max 5.
 *   - Hrit, Ekongkara/5th, Gayatri/6th: every "Yes" is worth 1 point, max 4.
 *   - Soma and Crown/7th (Narayana): questions 1 and 2 are explicitly worth
 *     2 points each (max 4 scored points). Question 3 on each is worth 0
 *     points either way — Crown's is a plain Yes/No GATE; Soma's is a
 *     3-option question (`tripleOptions`: No / 3 Chillas / more than 3
 *     Chillas) read directly by the ladder, not folded into the score.
 * The separate upfront purification Yes/No question (on Soma's quiz page —
 * see PC_CHAKRA_QUIZ_PAGES below) is likewise worth 0 points and never
 * added into any chakra's score — it's read directly by the ladder as a
 * hard prerequisite for Soma (see below).
 *
 * Tier 1 = Root, Sacral, Solar Plexus, Heart/Santoshi (chakras 1-4) —
 * completely unchanged from before.
 *
 *   TIER 1 (checked first, always):
 *   - Each Tier 1 chakra has its own threshold (CHAKRA_SCORING_META.threshold)
 *     — Root, Sacral, and Heart each need 3+ to qualify; Solar Plexus needs
 *     only 2+ (its questions are all worth 2 points, so a single "Yes"
 *     already meets it). Any chakra meeting ITS OWN threshold wins outright
 *     — Tier 2 is never consulted.
 *   - Every qualifying Tier 1 chakra is recommended (not just one), ordered
 *     HIGHEST SCORE FIRST. Ties go to Chakra 3 (Solar Plexus) if it's one
 *     of the tied chakras, otherwise to the lower-numbered chakra.
 *
 * Tier 2 = Hrit, Ekongkara (5th), Gayatri (6th/Third Eye), Soma, Crown/7th
 * (Narayana). These no longer just compete openly on raw score — they now
 * form a SEQUENTIAL LADDER, only reached at all once every Tier 1 chakra is
 * below its own threshold:
 *
 *   RUNG 1 — Hrit: "qualifies" at a raw score of 3 or 4 (3+ "Yes" answers
 *     out of 4).
 *     - Qualifies AND question 3 Yes -> recommend Hrit. Done.
 *     - Qualifies AND question 3 No -> Chakra 5 (Ekongkara) is unlocked,
 *       proceed to Rung 2.
 *     - Doesn't qualify -> fall back to the OLD "highest raw score wins,
 *       ties go to the lower/earlier chakra" comparison among ALL FIVE
 *       Tier 2 chakras (Soma/Crown only counted if their own real-world
 *       gate below is satisfied). This is the ONLY fallback that can ever
 *       include Soma or Crown/7th.
 *
 *   RUNG 2 — Chakra 5 / Ekongkara (only ever evaluated if Rung 1 unlocked
 *     it): same 3-or-4 qualify threshold.
 *     - Qualifies AND question 3 Yes -> recommend Chakra 5. Done.
 *     - Qualifies AND question 3 No -> Chakra 6 (Gayatri) unlocked, proceed
 *       to Rung 3.
 *     - Doesn't qualify -> fall back to the score/tie comparison, but only
 *       among {Hrit, Chakra 5} — Chakra 6/Soma/Crown were never unlocked so
 *       they take no part in this fallback.
 *
 *   RUNG 3 — Chakra 6 / Gayatri (only ever evaluated if Rung 2 unlocked
 *     it): same 3-or-4 qualify threshold.
 *     - Qualifies AND question 3 No -> recommend Chakra 6 outright. This
 *       ladder arrival takes PRIORITY over score-based tie-breaking with
 *       Hrit/Chakra 5 — no fallback comparison happens here at all.
 *     - Qualifies AND all 4 questions Yes -> Soma unlocked, proceed to the
 *       Soma rung.
 *     - Doesn't qualify (or qualifies but lands on neither condition above,
 *       e.g. question 3 Yes with something else No) -> fall back to the
 *       score/tie comparison among {Hrit, Chakra 5, Chakra 6} only.
 *
 *   SOMA (only ever evaluated if Chakra 6's ladder step unlocked it — i.e.
 *     Chakra 6 scored 3+ points AND all 4 of its questions were Yes). Soma
 *     "qualifies" here on an entirely different, stricter basis than a raw
 *     score: the purification-retreat question above must be Yes, AND
 *     questions 1-2 must both be Yes, AND the Chilla-count question must
 *     not be "No".
 *     - Doesn't qualify (purification No, or question 1 or 2 No, or the
 *       Chilla-count question is "No") -> recommend Chakra 6 directly. No
 *       further fallback or tie-break happens at this level.
 *     - Qualifies AND Chilla-count is "3 Chillas" -> recommend Soma (mode
 *       'gatedYes' — the readiness/caution message, store link included,
 *       no purchase lock).
 *     - Qualifies AND Chilla-count is "more than 3 Chillas" -> Crown/7th
 *       unlocked.
 *
 *   CROWN/7TH (only ever evaluated if Soma's rung unlocked it): every
 *     question, including the 6-Chilla gate, must be Yes.
 *     - All Yes -> recommend Crown/7th (mode 'gatedYes').
 *     - Any No -> recommend Soma instead (Soma already qualified to reach
 *       this point, so this is a plain fallback to it, not a re-check).
 *
 *   THE OLD SCORE/TIE FALLBACK (only ever invoked from Rungs 1-3 above,
 *   never from Soma/Crown, and only among the specific chakras named at
 *   that rung): highest raw score among the eligible candidates wins; ties
 *   go to the lower/earlier chakra (Hrit, then Ekongkara/5th, then
 *   Gayatri/6th, then Soma, then Crown/7th). Soma/Crown are only ever
 *   "eligible candidates" in the Rung-1 fallback (the only one that can
 *   include them), and only when their own real-world gate — the same
 *   purification+Q1+Q2+Chilla-count rule for Soma, the same 3-Yes rule for
 *   Crown — is already satisfied; when either wins this fallback it's
 *   always shown as 'gatedYes' (the readiness message), never a
 *   Gayatri-substitute.
 *
 *   TIER 2 TIE ADD-ONS (additive only — layered on top of whichever
 *   fallback comparison ran, never replacing its winner; only meaningful
 *   when a score/tie fallback actually happened, never after a plain
 *   ladder arrival):
 *   - If Hrit and Ekongkara (5th) are tied for that fallback's max: the
 *     winner is still Hrit (lower order), but
 *     PC_CHAKRA_TIER2_TIE_MESSAGES.hritThroat is also shown, encouraging
 *     sustained work with Hrit before moving on to Ekongkara.
 *   - If Gayatri (6th), Soma, AND Crown/7th are ALL THREE tied for the
 *     Rung-1 fallback's max: the winner is still Gayatri (lowest order
 *     among the three), but PC_CHAKRA_TIER2_TIE_MESSAGES.gayatriHigher is
 *     also shown, naming the possibility of higher chakra work without
 *     ever naming Vasudeva/Narayana.
 * ============================================================================
 */

// Scoring metadata per chakra — kept separate from PC_CHAKRA_QUIZ_PAGES
// (which is just quiz content) so the Tier 1/2 engine in app.js has a
// single source of truth for each chakra's tier, point weight, tie-break
// order, and (Tier 1 only) qualifying threshold. `order` is the tie-break
// ordering (ascending = lower/earlier chakra), not a display number — Hrit
// and Soma sit between whole chakra numbers on purpose (4.5 and 6.5) since
// that's where they fall in the tradition. All five tier:2 chakras (Hrit,
// throat/Ekongkara, thirdeye/Gayatri, soma, crown) compete together for the
// Tier 2 win — see app.js for the gating rule applied when Soma or Crown
// wins. `threshold` (Tier 1 chakras only) is the minimum score that chakra
// needs to qualify outright — Root/Sacral/Heart need 3, Solar Plexus needs
// only 2 (its questions are worth 2 points each, so one "Yes" already
// clears it).
const CHAKRA_SCORING_META = {
  root: { tier: 1, order: 1, pointsPerYes: 1, threshold: 3 },
  sacral: { tier: 1, order: 2, pointsPerYes: 1, threshold: 3 },
  solarplexus: { tier: 1, order: 3, pointsPerYes: 2, threshold: 2 }, // Chakra 3 — double points
  heart: { tier: 1, order: 4, pointsPerYes: 1, threshold: 3 },
  hrit: { tier: 2, order: 4.5, pointsPerYes: 1 },
  throat: { tier: 2, order: 5, pointsPerYes: 1 }, // Ekongkara
  thirdeye: { tier: 2, order: 6, pointsPerYes: 1 }, // Gayatri
  soma: { tier: 2, order: 6.5, pointsPerYes: 1 },
  crown: { tier: 2, order: 7, pointsPerYes: 1 },
};

// All 9 quiz pages, one per chakra, each a flat list of 4 yes/no questions.
// Soma and Crown/7th are now separate pages (previously combined onto one
// screen) — Soma's page carries the upfront purification gate (see
// `hasPurificationGate` below); Crown/7th's page is otherwise identical in
// shape to any other page. `quizLabel` is shown as the page heading WHILE
// TAKING THE QUIZ — chakra name/number only, never the mantra name (mantras
// are only ever revealed on the results page). `label` (chakra + mantra
// name) and `chakraCommonName` (the chakra's plain descriptive name) are
// used together on the results page; `label`/`chakraCommonName` are also
// used in the Today summary and Assessment History.
const PC_CHAKRA_QUIZ_PAGES = [
  {
    key: 'root',
    quizLabel: 'Chakra 1',
    label: 'Chakra 1 — Ganapati Deva',
    chakraCommonName: 'Muladhara',
    // Q2 is worth 2 points (see `points` below); Q1/Q3/Q4 stay at the
    // default 1 point each — max 5, threshold 3 (CHAKRA_SCORING_META.root).
    questions: [
      { text: 'I struggle to maintain healthy physical routines — waking early (before sunrise), regular digestion, consistent sleep and eating habits.' },
      { text: 'I often feel significantly physically sluggish or depleted.', points: 2 },
      { text: 'I find it hard to engage in physical activity with energy, excitement, or vigor.' },
      { text: 'I have experienced significant financial stress or instability in the last 2 years and it has caused me a lot of stress and worry about survival or security.' },
    ],
  },
  {
    key: 'sacral',
    quizLabel: 'Chakra 2',
    label: 'Chakra 2 — Bajaranga Bali',
    chakraCommonName: 'Svadhisthana',
    // Q2 is worth 2 points (see `points` below); Q1/Q3/Q4 stay at the
    // default 1 point each — max 5, threshold 3 (CHAKRA_SCORING_META.sacral).
    questions: [
      { text: 'Relationships — romantic, family, or social — take up most of my mental and emotional energy.' },
      { text: 'Sexual energy, desire, or intimacy is a significant source of challenge, confusion, or consumes a lot of my thoughts.', points: 2 },
      { text: 'Relationships have been a major source of pain or drama in my life.' },
      { text: 'I have a high need for social connection and would feel lost without my community.' },
    ],
  },
  {
    key: 'solarplexus',
    quizLabel: 'Chakra 3',
    label: 'Chakra 3 — Rama Chandra Raghuvira',
    chakraCommonName: 'Manipura',
    questions: [
      { text: 'Do either of these opposites tend to be true for you: I tend to be passive and hold back, OR I can be aggressive and have been told I come on too strong.' },
      { text: 'I have a competitive spirit and like to challenge myself against others mentally or physically (or I regularly push myself to extremes in physical exercise).' },
      { text: 'I work hard for achievement, recognition, status and proving myself, and/or leaving a legacy takes up significant energy in my life.' },
      { text: 'I place high value on logic and rational thinking and tend to distrust what I cannot prove or measure.' },
    ],
  },
  {
    key: 'heart',
    quizLabel: 'Chakra 4',
    label: 'Chakra 4 — Santoshi Mata',
    chakraCommonName: 'Anahata',
    // Q2 is worth 2 points (see `points` below); Q1/Q3/Q4 stay at the
    // default 1 point each — max 5, threshold 3 (CHAKRA_SCORING_META.heart).
    // No question here carries an `emphasize` word — none of these four
    // needs the extra visual call-out the old "touch" question did.
    questions: [
      { text: 'I feel others\' pain deeply and can absorb it — especially in caring roles — and struggle to fully release it (I may get physically ill at times).' },
      { text: 'I struggle to fully surrender or trust in something greater than myself — doubt arises.', points: 2 },
      { text: 'I feel genuine compassion for others and yet I sometimes find myself judging them or feeling resentful.' },
      { text: 'I am naturally generous but feel uncomfortable when others give to me, or I feel an immediate urge to give something back when I receive.' },
    ],
  },
  {
    key: 'hrit',
    quizLabel: 'Hrit Chakra',
    label: 'Hrit Chakra — Krishna Radhay Bol',
    chakraCommonName: 'Hrit',
    questions: [
      { text: 'Deep in my heart I have fully surrendered to divine will — my life can be whatever the divine desires it to be.' },
      { text: 'I have a deep and ever-present devotion to a deity, teacher, divine reality, humanity, or life itself — I completely recognize the force greater than myself and bow to it, there are no doubts.' },
      { text: 'I can recognize when my inner depth of devotion and surrender wavers but I cannot always call it back as quickly as I wish.' },
      { text: 'I have deep compassion for all beings and forgive the hurts and wrongs encountered on our evolving path.' },
    ],
  },
  {
    key: 'throat',
    quizLabel: 'Chakra 5',
    label: 'Chakra 5 — Ekongkara',
    chakraCommonName: 'Vishuddha',
    questions: [
      { text: 'I am increasingly drawn to the interplay of the divine sounds of mantra and the resulting inner silence and stillness. External stimulation feels less satisfying than it used to.' },
      { text: 'I experience life as a creative expression and feel most alive when acting from spontaneous inner guidance rather than planning or logic.' },
      { text: "Harsh or loud sounds don't particularly affect me, and I am just beginning to understand the power of mantra and sound — if at all (say No if this feels stable and established for you)." },
      { text: 'I am naturally drawn to a very simple and light diet — I notice that what I eat affects my inner sensitivity and inner states.' },
    ],
  },
  {
    key: 'thirdeye',
    quizLabel: 'Chakra 6',
    label: 'Chakra 6 — Gayatri',
    chakraCommonName: 'Ajna',
    questions: [
      { text: 'My primary motivation has genuinely shifted away from worldly goals — I am more drawn to the divine than to worldly accomplishment or pleasure.' },
      { text: 'I have had direct experiences of the divine but have not yet resolved the sense of separation between myself and that reality.' },
      { text: 'I have been doing serious daily practice for at least 2 years with a teacher or tradition.' },
      { text: 'I seek direct perception of truth — not as belief or philosophy but as living experience.' },
    ],
  },
  {
    // Soma's page carries the upfront purification gate — a GATE ONLY,
    // worth zero scoring points, that decides which output message a Soma/
    // Crown win shows (see computeChakraQuizRecommendation in app.js). It
    // no longer shares a page with Crown/7th — each has its own page now.
    key: 'soma',
    quizLabel: 'Soma Chakra',
    label: 'Soma Chakra — Vasudeva',
    chakraCommonName: 'Soma',
    hasPurificationGate: true,
    purificationQuestionText:
      'Have you attended a purification retreat or workshop with the Chakra Institute in the last two years?',
    purificationQuestionNote:
      'This question is not scored — it does not add any points toward your results. Soma is only ever ' +
      'reachable (via the ladder in computeTier2LadderRecommendation, app.js) when this is answered Yes.',
    // Questions 1-2 are each worth 2 points (see `points` below — overrides
    // CHAKRA_SCORING_META.pointsPerYes, which stays 1 as a fallback default
    // for chakras that don't need an override). Question 3 is NOT a plain
    // Yes/No — it's a 3-option question (`tripleOptions`), worth 0 points
    // either way, read directly by the Tier 2 ladder in app.js
    // (computeTier2LadderRecommendation): "No" (or the purification
    // question being anything but Yes, or either scored question above
    // being "No") means Soma doesn't qualify at all; "3 Chillas" means
    // recommend Soma; "more than 3 Chillas" unlocks Crown/7th.
    questions: [
      { text: 'I have moments of steady unwavering contact with the divine that go beyond meditation sessions.', points: 2 },
      { text: 'Liberation from karma, samsara, and the awakening of unity consciousness is the primary priority of my life.', points: 2 },
      {
        text: 'How many previous Chillas (40-day mantra commitment) have you completed?',
        points: 0,
        tripleOptions: [
          { value: 'no', label: 'No' },
          { value: 'yes3', label: 'Yes — I have completed 3 Chillas' },
          { value: 'yesmore', label: 'Yes — I have completed more than 3 Chillas' },
        ],
      },
    ],
  },
  {
    key: 'crown',
    quizLabel: 'Chakra 7',
    label: 'Chakra 7 — Narayana',
    chakraCommonName: 'Sahasrara',
    // Unchanged shape (plain Yes/No throughout, unlike Soma's Q3 above) —
    // questions 1-2 worth 2 points each, question 3 is a 0-point GATE. Only
    // reachable at all once Soma's ladder step unlocks it (Soma's Chilla
    // question answered "more than 3"); once reached, ALL THREE of these
    // must be Yes to recommend Crown/7th — any No falls back to Soma
    // instead. See computeTier2LadderRecommendation in app.js.
    questions: [
      { text: 'I have been on a path of serious spiritual practice for many years with consistent dedication and I seek to sustain and deepen unity consciousness.', points: 2 },
      { text: 'I have had direct contact with a realized teacher or lineage and that connection guides my inner life.', points: 2 },
      { text: 'I have completed at least 6 previous Chillas (40-day mantra commitment).', points: 0, gate: true },
    ],
  },
];

// ============================================================================
// ADAPTIVE QUIZ — SHORT VERSION (pages 5 & 6)
// ============================================================================
// When any Tier 1 chakra (root/sacral/solarplexus/heart) has already met its
// threshold by the end of page 4, the remaining pages are shortened to just
// these two rather than the full five-page Hrit/Chakra5/Chakra6/Soma/Chakra7
// tail — Hrit and Soma are skipped entirely in that case. This is decided
// live in app.js (see getActiveQuizPages) purely from the Tier 1 scores so
// far; nothing here or in the UI ever announces the switch to the user.
//
// Each short-page question is copied from its corresponding full-length page
// above via `shortQuizQuestion` (never re-typed) so the two stay in sync —
// `scoreIndex` records which position it holds in ITS OWN chakra's full
// question array, which is what the scoring engine keys answers by
// (see computeChakraQuizScores / getActiveQuizPages in app.js), and
// `pageKey` records which chakra it actually scores toward. Page 6 is
// "mixed" — its two questions score to two different chakras (Chakra 6 and
// Chakra 7) under one shared page/heading.
function shortQuizQuestion(chakraKey, questionIndex, pageKeyOverride) {
  const page = PC_CHAKRA_QUIZ_PAGES.find((p) => p.key === chakraKey);
  const q = page.questions[questionIndex];
  return { ...q, scoreIndex: questionIndex, pageKey: pageKeyOverride || chakraKey };
}

const PC_CHAKRA_QUIZ_SHORT_PAGE_5 = {
  key: 'throat',
  quizLabel: 'Chakra 5',
  label: 'Chakra 5 — Ekongkara',
  questions: [
    shortQuizQuestion('throat', 0),
    shortQuizQuestion('throat', 3),
  ],
};

const PC_CHAKRA_QUIZ_SHORT_PAGE_6 = {
  key: 'thirdeye-crown-short', // pseudo key — this page itself is never scored as a unit
  quizLabel: 'Chakras 6 & 7',
  label: 'Chakras 6 & 7',
  mixed: true,
  questions: [
    shortQuizQuestion('thirdeye', 0),
    shortQuizQuestion('crown', 1),
  ],
};

// mantraTabKey must match a mantra-item's data-mantra-key in index.html, or
// be null if that chakra's mantra isn't in the Mantra tab. `whySentence` is
// shown on the results page ("one sentence on why this mantra suits their
// assessment") — see the file header for which of these I drafted myself.
// `sustainMessage` is your verbatim encouragement message for that chakra.
const PC_CHAKRA_MANTRAS = {
  root: {
    mantraName: 'Ganapati Deva',
    mantraTabKey: 'ganapati-deva',
    whySentence:
      "This suggests you may benefit from cultivating consistent physical routines to feel more grounded and safe in the body. Work with the 1st Chakra also strengthens the ability to use your higher chakra openings more successfully.",
    additionalMantras: [
      'Adhyakshaya AM (for Confidence)',
      'Adhyakshaya PM (for Confidence)',
      'Aom Adityaha Namah (Pre-Dawn)',
    ],
    sustainMessage:
      'One Chilla with Ganapati Deva is a beautiful beginning. For deeper and more lasting transformation, ' +
      'sustained work with this chakra is recommended. The mantras above offer continued support for your ' +
      'first chakra journey. Working through these over multiple Chillas can bring profound and lasting change.',
  },
  sacral: {
    mantraName: 'Bajaranga Bali',
    mantraTabKey: 'bajaranga-bali',
    whySentence:
      "This suggests you may benefit from working through stuck relationship patterns and finding more ease and balance in intimacy. Work with the 2nd Chakra can help to create more spaciousness from emotion so you can navigate feelings more masterfully.",
    additionalMantras: ['Bajaranga Bali (different version)', 'Pavana Sutte Hanuman (for overcoming fears)'],
    sustainMessage:
      'One Chilla with Bajaranga Bali is a beautiful beginning. For deeper and more lasting transformation, ' +
      'sustained work with this chakra is recommended. The mantras above offer continued support for your ' +
      'second chakra journey.',
  },
  solarplexus: {
    mantraName: 'Rama Chandra Raghuvira',
    mantraTabKey: 'rama-chandra-raghuvira',
    whySentence:
      "This suggests you may benefit from softening and strengthening the ego base — remember, what doesn't bend breaks. Work with the 3rd Chakra creates genuine confidence and a healthy, balanced sense of personal authority.",
    additionalMantras: [
      'Raja Ram (for Softening Ego)',
      'Ramava (for Integrity)',
      'Aum Ram (for Deep Sleep)',
      'Meré Ram (for Joy in Life)',
      'Sita Ram Kahiye (for Empathy)',
    ],
    sustainMessage:
      'One Chilla with Rama Chandra Raghuvira is a beautiful beginning. The third chakra often benefits from ' +
      'extended focus — many students work here for a long time with profound results. The mantras above offer ' +
      'continued and deepened support for your third chakra journey.',
  },
  heart: {
    // "Jai Guru Dev" and "Jai Ganesh" both stay out of here — they're the
    // two FREE mantras available to everyone in the Mantra tab, not tied to
    // any one chakra (see the file-header note on the Free/Paid/Gated
    // structure above).
    mantraName: 'Santoshi Mata',
    mantraTabKey: 'santoshi-mata',
    whySentence:
      'This suggests you may benefit from opening the heart, easing emotional heaviness, and reconnecting with genuine joy. Work with the 4th Chakra opens us to unconditional love.',
    additionalMantras: [
      'Santoshi Mata (for Loss, Sadness and Emotional Heaviness — different version)',
      'Radhay Radhay (for Compassion)',
      'Shree Radhay (for Heart Chakra)',
    ],
    sustainMessage:
      'One Chilla with Santoshi Mata is a beautiful beginning. The heart chakra responds beautifully to ' +
      'sustained practice. The mantras above offer continued support and deepening for your fourth chakra journey.',
  },
  hrit: {
    mantraName: 'Krishna Radhay Bol',
    mantraTabKey: 'krishna-radhay-bol',
    whySentence:
      'This suggests a deep longing for unconditional love and devotion that this mantra is especially suited to deepen. Work with the Hrit Chakra can open the ability to experience Divine Presence.',
    additionalMantras: ['Aarti for Devotion', 'Sadhu (for Spiritual Zeal)'],
    sustainMessage:
      'One Chilla with Krishna Radhay Bol is a beautiful beginning. The Hrit chakra is the spiritual heart — ' +
      'sustained devotional practice here can be profoundly transformative. The mantras above offer continued ' +
      'support for this sacred work.',
  },
  throat: {
    mantraName: 'Ekongkara',
    mantraTabKey: 'ekongkara',
    whySentence:
      'This suggests a readiness to move from intellectual understanding toward direct inner experience through sound and stillness. Work with the 5th Chakra can open us to our own experience of divinity and true teachings that will assist us along the path.',
    additionalMantras: [
      'Sharaday Ma (Creativity and Communication)',
      'Sadhu (for Spiritual Zeal)',
      'Guru Brahma Vishnu Maheshvara (Awakening Inner Guru)',
    ],
    sustainMessage:
      'One Chilla with Ekongkara is a beautiful beginning. The fifth chakra is the threshold of direct ' +
      'experience — sustained practice here opens dimensions of sound and inner knowing that deepen over time. ' +
      'The mantras above offer continued support for your fifth chakra journey.',
  },
  thirdeye: {
    mantraName: 'Gayatri',
    mantraTabKey: 'gayatri',
    whySentence:
      'This suggests you are ready to move beyond the earlier stages of practice into serious sadhana and direct perception of truth. Work with the 6th Chakra is a vast dimension and Mantra can be a powerful tool.',
    additionalMantras: [
      'Aom Namaha Shivaya (for Stillness)',
      'Brahma Vishnu Maheshvara (for Tripartite Brain)',
      'Shanti in the Lokas',
      'Shiva Shambu Hara Hara',
      'Shiva Shankara (for Contentment)',
      'Shivo Hum (Beyond the Ego)',
      'Datta Ray (for Mastering Tripartite Brain)',
      'Maha Mritunjaya (for Longevity)',
    ],
    sustainMessage:
      'One Chilla with Gayatri is a beautiful beginning. The sixth chakra is sacred ground — Gayatri is one of ' +
      'the most ancient and powerful mantras in the Vedic tradition. Sustained practice here supports the ' +
      'development of true intuition and discrimination. The mantras above offer continued deepening for your ' +
      'sixth chakra journey.',
  },
  // Soma and Crown are never named to the user directly except through the
  // gated flow above. mantraName here is kept for your own records only.
  soma: {
    mantraName: 'Vasudeva',
    mantraTabKey: 'narayana',
    whySentence:
      "This suggests a strong pull toward steady, sustained contact with the divine and readiness to work directly with karma and liberation. Work with the Soma Chakra can bring fulfillment of one's desires for the betterment of humanity.",
    additionalMantras: [],
    sustainMessage:
      'One Chilla with Vasudeva is a profound undertaking. Because this Mantra works at the level of karma ' +
      'and liberation, sustained practice — supported by consultation with the Chakra Institute — is ' +
      'recommended before and during this journey.',
  },
  crown: {
    mantraName: 'Narayana',
    mantraTabKey: 'om',
    whySentence:
      "This suggests a mature readiness to sustain and deepen unity consciousness through committed, ongoing spiritual practice. Work with 7th Chakra is very delicate and we hope Sri Shyamji's Narayana Mantra supports you.",
    additionalMantras: ['Hara Hara Mahadeva (Return of the Goddess)'],
    sustainMessage:
      'One Chilla with Narayana is a rare and significant commitment. Given the depth of this practice, we recommend ' +
      'continued work with the 6th chakra Mantras and, where possible, a consultation with the Chakra Institute ' +
      'to support this journey.',
  },
};

// Real contact email you gave us for the Soma/Crown "ready for higher
// mantras" message.
const PC_CHAKRA_CONTACT_EMAIL = 'admin@chakrainstitute.com';

// Additive Tier 2 tie messages — layered on top of the engine, see the
// SCORING section above ("TIER 2 TIE ADD-ONS") for exactly when each fires.
// The literal email address text is turned into a mailto link by app.js
// wherever these are rendered.
const PC_CHAKRA_TIER2_TIE_MESSAGES = {
  hritThroat:
    'The upper chakras each take considerable time to open fully. Working deeply in each one before moving ' +
    'higher is recommended. Your scores suggest potential readiness across multiple chakras — after sustained ' +
    'work with Hrit consider exploring Ekongkara (available in app) for Chakra 5.',
  gayatriHigher:
    'Your scores suggest you may be ready for higher chakra work. Sri Shyamji created many 6th chakra mantras ' +
    'specifically to prepare the ground for this — these are available on website. After sustained work ' +
    'here, if you would like to discuss higher chakra mantras please contact us at admin@chakrainstitute.com',
};

// Shown on the results page per your "Consultation CTA" requirement —
// always shown, regardless of what was recommended.
const PC_CHAKRA_CONSULTATION_CTA =
  'For deeper personal guidance in the traditions of Tantra, Microchakra Psychology™, InnerTuning™, ' +
  'Svar Yoga and Nada Yoga, consultations with the Chakra Institute are available.';

const PC_CHAKRA_QUIZ_DISCLAIMER =
  'The Chakra Institute Prana Calendar app and all associated content — including mantras, ' +
  'quizzes, and teachings — are offered for educational, inspirational, and spiritual ' +
  'purposes in the living traditions of Tantra, Microchakra Psychology™, InnerTuning™, Svar ' +
  'Yoga, and Nada Yoga. These offerings are not a substitute for medical or mental health care. ' +
  'If you are experiencing a health crisis please consult a qualified professional. For personal ' +
  'spiritual guidance in these traditions, consultations with the Chakra Institute are available.';

const PC_CHAKRA_STORE_URL = 'https://www.chakrainstitute.com/store/mantras-for-therapeutic-use-mp3';
