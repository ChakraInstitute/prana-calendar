/*
 * app.js — UI wiring for the Prana Calendar.
 */

(function () {
  let selectedLocation = null; // { latitude, longitude, timezone, label }
  let currentResultYmd = null; // the date the nostril Result card is currently showing, if any
  let calendarYear = null; // Practice tab calendar — the month currently shown
  let calendarMonth = null; // 1-12
  let monthViewYear = null; // Today-tab "Month View (testing)" — the month currently shown
  let monthViewMonth = null; // 1-12
  let monthViewOpen = false; // whether the collapsible Month View panel is currently expanded
  let dayPopupDateIso = null; // the date the day-detail popup is currently open for
  let quizCurrentPageIndex = 0; // Chakra Assessment — which page (0-indexed) is showing
  let quizAnswers = {}; // Chakra Assessment — { chakraKey: { questionIdx: 'yes'|'no' } }, in-progress only
  let quizPurificationAnswer = null; // Chakra Assessment — 'yes'|'no', from the final combined page's upfront question
  let currentQuizResultEntryId = null; // id of the history entry the open results view is showing
  let currentResultsEntry = null; // the full entry object currently shown in #quizResultsView (for Review my answers)
  let lastNostrilRenderCtx = null; // { loc, ymd, result, sunriseUTC } from the most recent renderResult() call — used to re-render the Result card on a language switch and to build the nostril Share message
  let lastDayLord = null; // the { day, colorLabel, planet, mantra, colors } object from the most recent renderDayLordForSelectedDate() call — used by the day-lord card's Share button
  const MIN_DATE = '2020-01-01';
  const MAX_DATE = '2030-12-31';
  const SAVED_LOCATION_KEY = 'prana-calendar:savedLocation';
  const NOSTRIL_LOG_KEY = 'prana-calendar:nostrilLog';
  const CHILLA_KEY = 'prana-calendar:chilla';
  const CHILLA_COUNTER_KEY = 'prana-calendar:chillaCounter';
  const CHILLA_HISTORY_KEY = 'prana-calendar:chillaHistory';
  const CHILLA_LENGTH = 40;
  const CHAKRA_QUIZ_HISTORY_KEY = 'prana-calendar:chakraQuizHistory';
  const CHAKRA_QUIZ_COUNTER_KEY = 'prana-calendar:chakraQuizCounter';
  const CHAKRA_QUIZ_HIDE_KEY = 'prana-calendar:chakraQuizHidePref';
  const REFERRAL_ENTERED_KEY = 'prana-calendar:referralEntered'; // { code, dateIso } — set once, when THIS device enters someone else's code
  const MY_REFERRAL_CODE_KEY = 'prana-calendar:myReferralCode';
  const MY_REFERRAL_EMAIL_KEY = 'prana-calendar:myReferralEmail';
  const UNLOCKED_MANTRAS_KEY = 'prana-calendar:unlockedMantras'; // { mantraKey: true, ... } — permanent, per device
  const SPLASH_LAST_SHOWN_KEY = 'prana-calendar:splashLastShown'; // deviceTodayIso() string, last date the splash was shown
  const NITYA_SCHEME_KEY = 'prana-calendar:nityaScheme'; // 'classical' | 'nityotsava' — persisted, but always tappable to switch
  const APP_SHARE_URL = 'https://www.chakrainstitute.com'; // link appended to every Share message — same URL as the "Website" social link
  let nityaAccordionOpen = false; // whether the Nitya accordion under the Tithi line is currently expanded
  let currentNityaTithiInPaksha = null; // the tithiInPaksha (1-15) the accordion is currently showing, for re-rendering on scheme toggle
  let currentNityaPaksha = null; // 'Shukla' | 'Krishna', for the same reason
  let nakshatraAccordionOpen = false; // whether the Nakshatra accordion under the Nakshatra line is currently expanded
  let currentNakshatraNumber = null; // the nakshatraNumber (1-27) the accordion is currently showing
  // Display label for the Today-tab summary's "Chakra [X]" — Hrit and Soma
  // aren't part of the standard 7-chakra numbering, so they get a descriptive
  // label instead of a number.
  const CHAKRA_KEY_DISPLAY = {
    root: '1 (Muladhara)',
    sacral: '2 (Svadhisthana)',
    solarplexus: '3 (Manipura)',
    heart: '4 (Anahata)',
    hrit: 'Hrit',
    throat: '5 (Vishuddha)',
    thirdeye: '6 (Ajna)',
    soma: 'Soma (6th/7th)',
    crown: '7 (Sahasrara)',
  };
  // Chilla dot colors, cycling by Chilla number: 1st=purple, 2nd=blue,
  // 3rd=orange, 4th=teal, 5th=pink, then repeats.
  const CHILLA_DOT_COLORS = ['#8b5cf6', '#3b82f6', '#f59e0b', '#14b8a6', '#ec4899'];

  const els = {};

  // ---------------------------------------------------------------------
  // Language / translations — see js/translations.js for the actual string
  // tables (PC_TRANSLATIONS). This block is just the small engine that
  // applies them: detect a starting language, look strings up with a safe
  // English fallback so a missing key never shows blank text, and re-apply
  // to every [data-i18n*] element (plus a handful of dynamically-rendered
  // pieces) whenever the language changes.
  // ---------------------------------------------------------------------
  const LANGUAGE_KEY = 'prana-calendar:language';
  const SUPPORTED_LANGS = ['en', 'fr', 'nl', 'es'];
  let currentLang = 'en';

  function pcT(key, vars) {
    const table = (window.PC_TRANSLATIONS && window.PC_TRANSLATIONS[currentLang]) || {};
    const enTable = (window.PC_TRANSLATIONS && window.PC_TRANSLATIONS.en) || {};
    let str = Object.prototype.hasOwnProperty.call(table, key)
      ? table[key]
      : Object.prototype.hasOwnProperty.call(enTable, key)
      ? enTable[key]
      : key;
    if (vars) {
      str = str.replace(/\{(\w+)\}/g, (_, name) =>
        Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : ''
      );
    }
    return str;
  }

  // Planet-name localization. Deity names (Brahma, Agni, Vishnu, etc.) stay
  // in Sanskrit/English across all languages by design — only the classical
  // Western planet names are translated. These two helpers keep that logic
  // in one place rather than touching day-lord.js/nakshatra-data.js, since
  // all translatable text is meant to live in translations.js.
  const PLANET_NAME_KEYS = {
    Sun: 'planetSun',
    Moon: 'planetMoon',
    Mercury: 'planetMercury',
    Venus: 'planetVenus',
    Mars: 'planetMars',
    Jupiter: 'planetJupiter',
    Saturn: 'planetSaturn',
  };

  // For bare planet-name fields (day-lord.js: 'Sun', 'Moon', ...).
  function pcLocalizePlanetName(planet) {
    const key = PLANET_NAME_KEYS[planet];
    return key ? pcT(key) : planet;
  }

  // For compound planet fields (nakshatra-data.js: 'Venus (Shukra)', etc.).
  // Only the leading Western planet word is translated; the Sanskrit
  // parenthetical is preserved verbatim. Bare Vedic node names with no
  // Western equivalent ('Ketu', 'Rahu') pass through untouched.
  function pcLocalizePlanetField(raw) {
    if (!raw) return raw;
    for (const en in PLANET_NAME_KEYS) {
      if (raw === en || raw.indexOf(en + ' (') === 0) {
        return pcT(PLANET_NAME_KEYS[en]) + raw.slice(en.length);
      }
    }
    return raw;
  }

  // A manually-picked language (saved in localStorage) always wins. Absent
  // that, silently fall back to the browser's own locale if it matches one
  // of the 4 supported languages — no prompt/popup asking, it just opens
  // already in that language, which feels welcoming rather than surprising.
  // Anything not in SUPPORTED_LANGS falls back to English.
  function detectInitialLanguage() {
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    } catch (e) {
      /* localStorage unavailable — fall through to browser detection */
    }
    const candidates = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
    for (const raw of candidates) {
      if (!raw) continue;
      const prefix = String(raw).slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGS.includes(prefix)) return prefix;
    }
    return 'en';
  }

  // Applies the current language to every static [data-i18n]/[data-i18n-*]
  // element, then nudges a short list of dynamically-rendered pieces to
  // re-render so anything already on screen (a result, an open quiz
  // question, the chakra timer, etc.) updates immediately too, instead of
  // only affecting the next natural re-render.
  function applyTranslations() {
    document.documentElement.lang = currentLang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = pcT(el.getAttribute('data-i18n'));
    });
    // data-i18n-html is for the handful of Learn-tab paragraphs that embed
    // a plain <a> link inline (e.g. "...visit <a href=...>www...</a>") —
    // textContent would print the tag literally. Safe to set via innerHTML
    // because the translated strings are all author-controlled content in
    // translations.js, never user input.
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = pcT(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', pcT(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', pcT(el.getAttribute('data-i18n-aria-label')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', pcT(el.getAttribute('data-i18n-title')));
    });

    document.querySelectorAll('.language-option').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
      btn.setAttribute('aria-current', btn.getAttribute('data-lang') === currentLang ? 'true' : 'false');
    });

    // Re-render dynamic content that may already be visible, so switching
    // language updates it in place rather than waiting for its next
    // natural trigger. Each of these is cheap and safe to call redundantly;
    // wrapped individually so one failing never blocks the rest.
    try { renderDayLordForSelectedDate(); } catch (e) {}
    try { renderChakraTimer(); } catch (e) {}
    try { if (typeof renderChilla === 'function') renderChilla(); } catch (e) {}
    try { if (typeof renderChakraQuizSummary === 'function') renderChakraQuizSummary(); } catch (e) {}
    try { if (typeof renderAssessmentHistory === 'function') renderAssessmentHistory(); } catch (e) {}
    try { if (typeof renderCalendar === 'function') renderCalendar(); } catch (e) {}
    try { if (monthViewOpen && typeof renderMonthView === 'function') renderMonthView(); } catch (e) {}
    try { reRenderNostrilResultForLanguage(); } catch (e) {}
    try { if (nakshatraAccordionOpen && typeof renderNakshatraAccordion === 'function') renderNakshatraAccordion(); } catch (e) {}
    try { if (nityaAccordionOpen && typeof renderNityaAccordion === 'function') renderNityaAccordion(); } catch (e) {}
    try { if (currentResultsEntry && els.quizResultsView && !els.quizResultsView.hidden) renderChakraQuizResultsView(currentResultsEntry); } catch (e) {}
  }

  function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    currentLang = lang;
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch (e) {
      /* ignore — language just won't persist across reloads */
    }
    applyTranslations();
  }

  function initLanguage() {
    currentLang = detectInitialLanguage();
    applyTranslations();
  }

  // ---------------------------------------------------------------------
  // Share — one small helper used by every Share button in the app (the
  // nostril-of-day result, the color/planet/mantra card, the quiz result,
  // and the Practice-tab streak/Chilla card). Prefers the native Web Share
  // sheet (navigator.share) where the browser supports it — this is what
  // lets the user pick a specific app (Messages, WhatsApp, email, etc.) to
  // share into. Falls back to copying the fully-composed message straight
  // to the clipboard, with a brief on-screen confirmation, when
  // navigator.share isn't available (most desktop browsers) or the user's
  // OS-level share sheet itself fails for a reason other than the user
  // simply cancelling it.
  // ---------------------------------------------------------------------
  function pcShareText(text, feedbackEl) {
    const showFeedback = (ok) => {
      if (!feedbackEl) return;
      feedbackEl.textContent = ok ? pcT('copiedNote') : pcT('shareFailedNote');
      feedbackEl.removeAttribute('hidden');
      clearTimeout(feedbackEl._pcShareTimer);
      feedbackEl._pcShareTimer = setTimeout(() => feedbackEl.setAttribute('hidden', ''), 2500);
    };
    const copyFallback = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showFeedback(true)).catch(() => showFeedback(false));
      } else {
        showFeedback(false);
      }
    };
    if (navigator.share) {
      navigator.share({ text }).catch((err) => {
        // AbortError just means the user closed the native share sheet
        // without picking anything — not a failure worth falling back for.
        if (err && err.name === 'AbortError') return;
        copyFallback();
      });
      return;
    }
    copyFallback();
  }

  // ---------------------------------------------------------------------
  // Share, with a designed image card — used by the three Share buttons
  // that have a visual "card" version (Color/Planet/Mantra, Nostril
  // result, Chakra Assessment result). Builds a branded PNG via
  // js/share-card.js (pcBuildShareCardCanvas) and:
  //   1. Shares it through the native Web Share sheet as an image file
  //      (with the existing plain-text message attached too), when the
  //      browser supports sharing files (most mobile browsers) — this is
  //      what lets the user drop the card straight into Messages,
  //      WhatsApp, Instagram Stories, etc.
  //   2. Otherwise (most desktop browsers, or a browser that can share
  //      text but not files), downloads the PNG to the device and copies
  //      the plain-text message to the clipboard, so the user still ends
  //      up with both pieces to share manually.
  // Falls back to the old text-only pcShareText() entirely if canvas
  // generation itself fails for any reason (e.g. an unusual browser),
  // so a Share button never just does nothing.
  // ---------------------------------------------------------------------
  function pcShareCardImage(cardType, cardData, text, feedbackEl, filename) {
    const showFeedback = (key) => {
      if (!feedbackEl) return;
      feedbackEl.textContent = pcT(key);
      feedbackEl.removeAttribute('hidden');
      clearTimeout(feedbackEl._pcShareTimer);
      feedbackEl._pcShareTimer = setTimeout(() => feedbackEl.setAttribute('hidden', ''), 2500);
    };
    const downloadPng = (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'prana-calendar-share.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    };
    const downloadAndCopyFallback = (blob) => {
      downloadPng(blob);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => showFeedback('shareImageSavedNote'))
          .catch(() => showFeedback('shareImageSavedNote'));
      } else {
        showFeedback('shareImageSavedNote');
      }
    };

    if (typeof pcBuildShareCardCanvas !== 'function' || typeof pcCanvasToPngBlob !== 'function') {
      pcShareText(text, feedbackEl);
      return;
    }

    // pcBuildShareCardCanvas is async (it waits for the Chakra Institute
    // logo image to load before drawing) — Promise.resolve().then(...)
    // catches a synchronous throw exactly like a rejected promise, so both
    // failure modes land in the same .catch() below.
    Promise.resolve()
      .then(() => pcBuildShareCardCanvas(cardType, cardData))
      .then((canvas) => pcCanvasToPngBlob(canvas))
      .then((blob) => {
        const file = new File([blob], filename || 'prana-calendar-share.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator
            .share({ files: [file], text, title: 'InnerTuning — Prana Calendar' })
            .catch((err) => {
              if (err && err.name === 'AbortError') return;
              downloadAndCopyFallback(blob);
            });
          return;
        }
        if (navigator.share) {
          // Can share text but not files on this browser — still share the
          // text natively, and separately hand the person the image file.
          downloadPng(blob);
          navigator.share({ text }).catch((err) => {
            if (err && err.name === 'AbortError') return;
            downloadAndCopyFallback(blob);
          });
          return;
        }
        downloadAndCopyFallback(blob);
      })
      .catch((e) => {
        console.error('Share card image export failed, falling back to text share:', e);
        pcShareText(text, feedbackEl);
      });
  }

  // Surface any otherwise-silent error instead of the page just "doing
  // nothing" — this is what previously made a broken step invisible.
  window.addEventListener('error', (e) => {
    console.error('Unhandled error:', e.error || e.message);
    showErrorSafe('Something went wrong: ' + (e.message || 'unknown error') + ' (see browser console for details).');
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showErrorSafe(
      'Something went wrong: ' +
        (e.reason && e.reason.message ? e.reason.message : e.reason) +
        ' (see browser console for details).'
    );
  });

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Each step is isolated so a problem in one (e.g. populating the
    // timezone list) can never prevent the others (e.g. binding the
    // search button) from running.
    runStep('cacheEls', cacheEls);
    runStep('initLanguage', initLanguage);
    runStep('bindTabNav', bindTabNav);
    runStep('populateTimezoneDatalist', populateTimezoneDatalist);
    runStep('setDefaultDate', setDefaultDate);
    runStep('renderDayLordForSelectedDate', renderDayLordForSelectedDate);
    runStep('loadSavedLocation', loadSavedLocation);
    runStep('bindEvents', bindEvents);
    runStep('renderChakraTimer', renderChakraTimer);
    runStep('renderChilla', renderChilla);
    runStep('initCalendar', initCalendar);
    runStep('initMonthView', initMonthView);
    runStep('bindMantraPlayers', bindMantraPlayers);
    runStep('bindMantraUnlocks', bindMantraUnlocks);
    runStep('bindAccordions', bindAccordions);
    runStep('bindLearnJumpLinks', bindLearnJumpLinks);
    runStep('renderChakraQuizSummary', renderChakraQuizSummary);
    runStep('renderAssessmentHistory', renderAssessmentHistory);
    runStep('initEmailJs', initEmailJs);
    runStep('renderEarnMantraCard', renderEarnMantraCard);
    runStep('renderReferralEntryCard', renderReferralEntryCard);
    runStep('bindGracefulImageFallbacks', bindGracefulImageFallbacks);
    runStep('initSplash', initSplash);

    // The chakra timer tracks the real current moment, so keep it fresh
    // even if the page is just left open.
    setInterval(() => runStep('renderChakraTimer', renderChakraTimer), 60000);

    console.log('Prana Calendar initialized.');
  }

  function runStep(name, fn) {
    try {
      fn();
    } catch (err) {
      console.error('Init step "' + name + '" failed:', err);
    }
  }

  function cacheEls() {
    [
      'cityInput',
      'cityStatus',
      'cityResults',
      'citySearchBtn',
      'citySearchBtnText',
      'citySearchSpinner',
      'manualToggle',
      'manualFields',
      'latInput',
      'lonInput',
      'tzInput',
      'tzDatalist',
      'dateInput',
      'calculateBtn',
      'resultCard',
      'resultContent',
      'resultNostril',
      'resultSanskrit',
      'resultLocation',
      'resultDate',
      'resultSunrise',
      'resultDetails',
      'dayLordDateLabel',
      'dayLordSwatch',
      'dayLordDay',
      'dayLordColor',
      'dayLordPlanet',
      'dayLordMantra',
      'lunarTithiText',
      'lunarNityaToggle',
      'lunarNityaText',
      'nityaAccordion',
      'nityaName',
      'nityaVowel',
      'nityaDescription',
      'nityaSchemeClassicalBtn',
      'nityaSchemeNityotsavaBtn',
      'lunarPakshaText',
      'lunarNakshatraToggle',
      'lunarNakshatraText',
      'lunarSiderealText',
      'nakshatraAccordion',
      'nakshatraName',
      'nakshatraMeta',
      'nakshatraThemes',
      'nakshatraDescription',
      'nakshatraDiffNote',
      'lunarTropicalText',
      'rememberLocationRow',
      'rememberLocationCheckbox',
      'chakraStatus',
      'chakraDetails',
      'chakraCurrentNumber',
      'chakraCurrentName',
      'chakraCurrentEnglish',
      'chakraCycleLabel',
      'chakraPeriodStart',
      'chakraPeriodEnd',
      'chakraSegments',
      'chakraNextInfo',
      'errorBox',
      'resultInfoBtn',
      'nostrilTracking',
      'trackingButtons',
      'trackCheckBtn',
      'trackXBtn',
      'trackCorrectedFollowup',
      'trackCorrectedYesBtn',
      'trackCorrectedNoBtn',
      'chillaCard',
      'chillaStartRow',
      'startChillaBtn',
      'chillaTrackHintLink',
      'chillaActiveRow',
      'chillaNameText',
      'chillaStreakText',
      'chillaTodayCheckbox',
      'startNewChillaBtn',
      'endChillaBtn',
      'chillaSetupOverlay',
      'chillaNameInput',
      'chillaBeginBtn',
      'calPrevBtn',
      'calNextBtn',
      'calMonthLabel',
      'calendarGrid',
      'monthViewToggle',
      'monthViewPanel',
      'monthViewPrevBtn',
      'monthViewNextBtn',
      'monthViewMonthLabel',
      'monthViewGrid',
      'monthViewStatus',
      'dayPopupOverlay',
      'dayPopupDate',
      'popupCheckBtn',
      'popupXBtn',
      'popupClearBtn',
      'popupCorrectedFollowup',
      'popupCorrectedYesBtn',
      'popupCorrectedNoBtn',
      'popupChillaSection',
      'popupChillaCheckbox',
      'dayPopupCloseBtn',
      'chakraQuizButtonRow',
      'takeChakraQuizBtn',
      'chakraQuizSummaryRow',
      'chakraQuizSummaryText',
      'chakraQuizRetakeBtn',
      'chakraQuizHideBtn',
      'chakraQuizShowRow',
      'chakraQuizShowBtn',
      'chakraQuizShowRetakeBtn',
      'chakraQuizSeeFullBtn',
      'chakraQuizPastResultsLink',
      'resultHistoryLink',
      'shareNostrilBtn',
      'shareNostrilCopiedNote',
      'shareDayLordBtn',
      'shareDayLordCopiedNote',
      'shareQuizBtn',
      'shareQuizCopiedNote',
      'sharePracticeBtn',
      'sharePracticeCopiedNote',
      'chakraQuizDeleteBtn',
      'chakraQuizOverlay',
      'quizDisclaimerView',
      'quizDisclaimerText',
      'quizDisclaimerCheckbox',
      'quizBeginBtn',
      'quizPageView',
      'quizPageProgress',
      'quizPageLabel',
      'quizQuestionsContainer',
      'quizValidationError',
      'quizBackBtn',
      'quizNextBtn',
      'quizResultsView',
      'quizResultRecommendations',
      'quizResultStoreBtn',
      'quizResultTieNote',
      'quizResultTieNoteText',
      'quizResultReadyBlock',
      'quizResultReadyText',
      'quizResultNoneBlock',
      'quizConsultationCta',
      'quizReviewAnswersBtn',
      'quizResultsRetakeBtn',
      'quizAnswersReview',
      'quizNewsletterSection',
      'quizFooterDisclaimer',
      'assessmentHistoryEmpty',
      'assessmentHistoryList',
      'confirmDialogOverlay',
      'confirmDialogMessage',
      'confirmDialogCancelBtn',
      'confirmDialogConfirmBtn',
      'referralEntryFormRow',
      'referralEntryCodeInput',
      'referralEntryError',
      'referralEntrySubmitBtn',
      'referralEntryThanks',
      'earnMantraCard',
      'referralJoinedBanner',
      'referralEmailPromptRow',
      'referralOwnEmailInput',
      'referralEmailContinueBtn',
      'referralCodeRow',
      'referralCodeText',
      'copyReferralCodeBtn',
      'shareReferralCodeBtn',
      'referralCopiedNote',
      'emailResultsRow',
      'emailResultsInput',
      'emailResultsSendBtn',
      'emailResultsStatus',
      'splashOverlay',
      'splashCloseBtn',
      'splashLogoImg',
      'splashEventsList',
      'shyamjiPortraitPhoto',
      'sacredHeaderPhotoToday',
      'sacredHeaderSignatureToday',
      'sacredHeaderSignatureMantra',
      'sacredHeaderSignaturePractice',
      'sacredHeaderSignatureLearn',
    ].forEach((id) => (els[id] = document.getElementById(id)));
  }

  // Bottom tab navigation: Today / Mantra / Practice / Learn. Today holds
  // all the existing app content; the rest are placeholders for now. The
  // bottom nav stays visible and tappable throughout the entire quiz flow
  // (see the .quiz-overlay/.bottom-nav z-index comments in style.css) and
  // is now the ONLY way to leave the quiz — there is no separate "Return to
  // Today"/exit button anywhere in the overlay.
  function bindTabNav() {
    const buttons = document.querySelectorAll('.bottom-nav-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        if (isChakraQuizInProgress()) {
          // Disclaimer or question pages are showing — real progress is at
          // stake, so confirm before losing it.
          showConfirmDialog(pcT('exitQuizConfirm'), pcT('exitBtn'), () => {
            closeChakraQuiz();
            switchTab(tabName);
          });
          return;
        }
        if (els.chakraQuizOverlay && !els.chakraQuizOverlay.hasAttribute('hidden')) {
          // Results are showing (just finished, or opened from history) —
          // that attempt is already saved, so there's nothing to lose.
          closeChakraQuiz();
        }
        switchTab(tabName);
      });
    });

  }

  // True only while the quiz overlay is open AND still on the
  // disclaimer/question-taking steps (i.e. there's unsaved progress that a
  // navigation away would lose) — false once results are showing, since a
  // completed attempt is already saved to history.
  function isChakraQuizInProgress() {
    return (
      !!els.chakraQuizOverlay &&
      !els.chakraQuizOverlay.hasAttribute('hidden') &&
      !!els.quizResultsView &&
      els.quizResultsView.hasAttribute('hidden')
    );
  }

  function switchTab(tabName) {
    document.querySelectorAll('.bottom-nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      const isActive = panel.id === 'tab-' + tabName;
      if (isActive) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    });

    // Refresh the calendar every time Practice is opened, in case data
    // changed elsewhere (a new nostril check-in, a Chilla started/ended)
    // or the device date has rolled over since it last rendered.
    if (tabName === 'practice') {
      runStep('renderCalendar', renderCalendar);
      runStep('renderAssessmentHistory', renderAssessmentHistory);
    }
  }

  // Cross-tab "jump to this bit of the Learn tab" links (the "Learn about
  // the Prana Calendar Practice" line on Today, and the Svar Yoga/Nasal
  // Cycles links inside the How to Use accordion). `targetId` is either an
  // .accordion-header button's id (opened, same as a real click, and
  // scrolled into view by its own existing click handler in
  // bindAccordions) or a plain heading id like the group header (just
  // scrolled into view, nothing to expand).
  function jumpToLearnTarget(targetId) {
    switchTab('learn');
    const target = document.getElementById(targetId);
    if (!target) return;
    if (target.classList.contains('accordion-header')) {
      const item = target.closest('.accordion-item');
      if (item && !item.classList.contains('expanded')) {
        target.click(); // bindAccordions' own handler expands it and scrolls it into view
        return;
      }
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bindLearnJumpLinks() {
    document.querySelectorAll('.learn-jump-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        jumpToLearnTarget(link.getAttribute('data-learn-target'));
      });
    });
  }

  // Keeps the Color/Planet/Mantra panel in sync with whatever date is
  // currently in the Date field — not just "today". Called on load and
  // every time that field changes.
  function renderDayLordForSelectedDate() {
    const parsed = parseIsoDate((els.dateInput.value || '').trim());
    let ymd;
    if (parsed) {
      ymd = parsed;
      els.dayLordDateLabel.textContent = pcT('forDateLabel', { date: pcFormatDateOnly(ymd) });
    } else {
      // No valid date selected yet — fall back to the device's own
      // local today so the panel is never empty.
      const now = new Date();
      ymd = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
      els.dayLordDateLabel.textContent = pcT('todayDateLabel', { date: pcFormatDateOnly(ymd) });
    }
    const lord = pcGetDayLord(ymd.year, ymd.month, ymd.day);
    lastDayLord = lord; // for the day-lord card's Share button
    els.dayLordSwatch.style.background = pcSwatchBackground(lord.colors);
    els.dayLordDay.textContent = lord.day;
    els.dayLordColor.textContent = pcT('colorOfDayLabel', { color: lord.colorLabel });
    els.dayLordPlanet.textContent = pcT('rulingPlanetLabel', { planet: pcLocalizePlanetName(lord.planet) });
    els.dayLordMantra.textContent = lord.mantra;

    renderLunarPositionInfo(ymd);
  }

  // Share button on the Color/Planet/Mantra card — "Today's color is ...".
  // Shares a designed image card (see js/share-card.js) with the same
  // message as its caption/fallback text.
  function shareDayLordInfo() {
    if (!lastDayLord) return;
    const text = pcT('shareDayLordMessage', {
      color: lastDayLord.colorLabel,
      planet: pcLocalizePlanetName(lastDayLord.planet),
      mantra: lastDayLord.mantra,
      link: APP_SHARE_URL,
    });
    // The on-screen date label already reads e.g. "June 15, 2024:" (or its
    // translated equivalent) — strip the trailing colon for the card, which
    // shows the date on its own line rather than as a sentence lead-in.
    const dateLabel = ((els.dayLordDateLabel && els.dayLordDateLabel.textContent) || '').replace(/[:：]\s*$/, '').trim();
    pcShareCardImage(
      'daylord',
      {
        dateLabel,
        title: pcT('shareCardDayLordTitle'),
        colors: lastDayLord.colors,
        colorLabel: lastDayLord.colorLabel,
        planetLine: pcT('rulingPlanetLabel', { planet: pcLocalizePlanetName(lastDayLord.planet) }),
        mantraLabel: pcT('shareCardMantraLabel'),
        mantra: lastDayLord.mantra,
        taglineLine1: pcT('pranaCalendarSubtitleLine1'),
        taglineLine2: pcT('pranaCalendarSubtitleLine2'),
      },
      text,
      els.shareDayLordCopiedNote,
      'prana-calendar-color-planet-mantra.png'
    );
  }

  // Tithi/Paksha/Nakshatra — display only (see js/panchanga.js); computed
  // for the same calendar date as the rest of this card, at a fixed 12:00
  // UTC so the result is a simple, reproducible function of the date alone
  // rather than depending on the viewer's clock or location/sunrise.
  function renderLunarPositionInfo(ymd) {
    if (!els.lunarTithiText) return;
    const instant = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12, 0, 0));
    const p = pcComputePanchanga(instant);
    els.lunarTithiText.textContent = pcT('tithiLabel', { number: p.tithiNumber, name: p.tithiName });
    els.lunarPakshaText.textContent = pcT('pakshaLabel', {
      paksha: p.paksha,
      phase: p.paksha === 'Shukla' ? pcT('waxing') : pcT('waning'),
    });
    els.lunarNakshatraText.textContent = pcT('nakshatraLabel', { name: p.nakshatraName });
    els.lunarSiderealText.textContent = pcT('siderealLabel', { sign: p.siderealSign });
    els.lunarTropicalText.textContent = pcT('tropicalLabel', { sign: p.tropicalSign });

    // Remember this date's tithiInPaksha/paksha so the Nitya accordion (see
    // below) can re-render itself purely from these when the user switches
    // scheme, without recomputing the panchanga again.
    currentNityaTithiInPaksha = p.tithiInPaksha;
    currentNityaPaksha = p.paksha;
    renderNityaAccordion();

    // Same idea for the Nakshatra accordion — PC_NAKSHATRAS is indexed 0-26
    // in the same order as PC_NAKSHATRA_NAMES in panchanga.js, so the
    // nakshatraNumber (1-27) maps straight across.
    currentNakshatraNumber = p.nakshatraNumber;
    renderNakshatraAccordion();
  }

  // --- Nitya accordion (tap the Tithi line) --------------------------------
  //
  // All Nitya TEXT (names, vowels, Devanagari, descriptions, the footnote,
  // the scheme-toggle labels) lives in js/nitya-data.js — nothing here is a
  // hardcoded string, so a future translation only ever touches that file.
  // This section is purely the CALCULATION (which of the 16 Nityas belongs
  // to today's tithi, under whichever scheme is selected) and the DOM
  // wiring to show it.
  //
  //   Classical (Tantraraja): nitya_index = tithi - 1 — same formula for
  //     both pakshas.
  //   Nityotsava: Shukla paksha is identical to Classical. Krishna paksha
  //     reverses: nitya_index = (16 - tithi) - 1.
  // `tithi` here is always tithiInPaksha (1-15) — the day's position WITHIN
  // its own paksha, not the 1-30 whole-lunar-month tithiNumber. Both
  // formulas only ever produce an index in 0-14 for a valid tithi of 1-15,
  // so Nitya 16 (Mahānityā/Lalitā, index 15 — she has no tithi of her own)
  // can never come out of this by construction.
  function pcNityaIndexForTithi(tithiInPaksha, paksha, scheme) {
    if (scheme === 'nityotsava' && paksha === 'Krishna') {
      return 16 - tithiInPaksha - 1;
    }
    return tithiInPaksha - 1;
  }

  function loadNityaScheme() {
    const raw = localStorage.getItem(NITYA_SCHEME_KEY);
    return raw === 'nityotsava' ? 'nityotsava' : 'classical'; // default: Classical/Tantraraja
  }
  function saveNityaScheme(scheme) {
    try {
      localStorage.setItem(NITYA_SCHEME_KEY, scheme);
    } catch (e) {
      // Storage can fail (private browsing, full quota) — the toggle still
      // works for the rest of this session, it just won't be remembered.
    }
  }

  // Renders (or re-renders) the Nitya accordion for whatever date's
  // tithiInPaksha/paksha renderLunarPositionInfo most recently stored, under
  // the currently-saved scheme. Safe to call any time — including before a
  // date has ever been computed, or while the accordion is collapsed — it
  // simply no-ops until there's something to show.
  function renderNityaAccordion() {
    if (!els.nityaName) return;
    if (currentNityaTithiInPaksha == null || !currentNityaPaksha) return;

    const scheme = loadNityaScheme();
    const index = pcNityaIndexForTithi(currentNityaTithiInPaksha, currentNityaPaksha, scheme);
    // Defensive guard, per the file-level comment on pcNityaIndexForTithi —
    // Nitya 16 (index 15) must never display here even if some future
    // change to the tithi math ever produced it.
    const nitya = index >= 0 && index <= 14 ? PC_NITYAS[index] : null;
    if (!nitya) {
      els.nityaAccordion.setAttribute('hidden', '');
      if (els.lunarNityaText) els.lunarNityaText.textContent = pcT('nityaDeviLabel', { name: '—' });
      return;
    }

    // The summary line (Nitya Devi: {name}) is its own always-visible line
    // now — separate from the Tithi line — so it needs to stay in sync
    // here too, not just the accordion contents, including when the scheme
    // toggle changes which Nitya applies for a Krishna-paksha date.
    if (els.lunarNityaText) els.lunarNityaText.textContent = pcT('nityaDeviLabel', { name: nitya.name });

    els.nityaName.textContent = nitya.name;
    // No "Vowel:"/"Devanagari:" labels — just the pronunciation and the
    // Sanskrit character together, per your instruction not to label the
    // script character.
    els.nityaVowel.textContent = pcT('nitya_' + index + '_vowel') + ' — ' + nitya.devanagari;
    els.nityaDescription.textContent = pcT('nitya_' + index + '_description');

    if (els.nityaSchemeClassicalBtn) {
      els.nityaSchemeClassicalBtn.textContent = pcT('nityaSchemeLabel_classical');
      els.nityaSchemeClassicalBtn.classList.toggle('selected', scheme === 'classical');
      els.nityaSchemeClassicalBtn.setAttribute('aria-pressed', scheme === 'classical' ? 'true' : 'false');
    }
    if (els.nityaSchemeNityotsavaBtn) {
      els.nityaSchemeNityotsavaBtn.textContent = pcT('nityaSchemeLabel_nityotsava');
      els.nityaSchemeNityotsavaBtn.classList.toggle('selected', scheme === 'nityotsava');
      els.nityaSchemeNityotsavaBtn.setAttribute('aria-pressed', scheme === 'nityotsava' ? 'true' : 'false');
    }
    const footnoteEl = els.nityaAccordion.querySelector('.nitya-footnote');
    if (footnoteEl) footnoteEl.textContent = pcT('nityaFootnote_' + scheme);
  }

  function toggleNityaAccordion() {
    if (!els.nityaAccordion || !els.lunarNityaToggle) return;
    nityaAccordionOpen = !nityaAccordionOpen;
    els.nityaAccordion.toggleAttribute('hidden', !nityaAccordionOpen);
    els.lunarNityaToggle.setAttribute('aria-expanded', nityaAccordionOpen ? 'true' : 'false');
    if (nityaAccordionOpen) renderNityaAccordion();
  }

  // --- Nakshatra accordion (tap the Nakshatra line) -------------------------
  //
  // Same pattern as the Nitya accordion above: all Nakshatra TEXT lives in
  // js/nakshatra-data.js, indexed 0-26 in the same order as
  // PC_NAKSHATRA_NAMES in panchanga.js, so PC_NAKSHATRAS[nakshatraNumber - 1]
  // is always the correct entry — no separate calculation needed here.
  function renderNakshatraAccordion() {
    if (!els.nakshatraName) return;
    if (currentNakshatraNumber == null) return;

    const nakshatra = PC_NAKSHATRAS[currentNakshatraNumber - 1];
    if (!nakshatra) {
      els.nakshatraAccordion.setAttribute('hidden', '');
      return;
    }

    const nakIndex = currentNakshatraNumber - 1;
    els.nakshatraName.textContent = nakshatra.name + ' — ' + pcT('nakshatra_' + nakIndex + '_epithet');
    els.nakshatraMeta.textContent = pcT('nakshatraMetaLabel', { deity: nakshatra.deity, planet: pcLocalizePlanetField(nakshatra.planet) });
    els.nakshatraThemes.textContent = pcT('nakshatra_' + nakIndex + '_themes');
    els.nakshatraDescription.textContent = pcT('nakshatra_' + nakIndex + '_description');
    if (els.nakshatraDiffNote) els.nakshatraDiffNote.textContent = pcT('nakshatraDiffNote');
  }

  function toggleNakshatraAccordion() {
    if (!els.nakshatraAccordion || !els.lunarNakshatraToggle) return;
    nakshatraAccordionOpen = !nakshatraAccordionOpen;
    els.nakshatraAccordion.toggleAttribute('hidden', !nakshatraAccordionOpen);
    els.lunarNakshatraToggle.setAttribute('aria-expanded', nakshatraAccordionOpen ? 'true' : 'false');
    if (nakshatraAccordionOpen) renderNakshatraAccordion();
  }

  // Live chakra timer — always reflects the real current moment (not
  // whatever date is picked for the nostril calculation), for whichever
  // location is currently active.
  function renderChakraTimer() {
    const loc = getActiveLocation();
    if (!loc) {
      els.chakraStatus.textContent = pcT('chakraTimerStatusDefault');
      els.chakraDetails.setAttribute('hidden', '');
      return;
    }

    let tzOk = true;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: loc.timezone }).format(new Date());
    } catch (e) {
      tzOk = false;
    }
    if (!tzOk) {
      els.chakraStatus.textContent = pcT('chakraTimerBadTimezone', { timezone: loc.timezone });
      els.chakraDetails.setAttribute('hidden', '');
      return;
    }

    const status = pcGetCurrentChakraStatus(loc.latitude, loc.longitude, loc.timezone, new Date());
    if (!status) {
      els.chakraStatus.textContent = pcT('chakraTimerNoSunriseSunset');
      els.chakraDetails.setAttribute('hidden', '');
      return;
    }

    els.chakraStatus.textContent = pcT('chakraTimerRightNowAt', { label: loc.label });
    els.chakraDetails.removeAttribute('hidden');

    els.chakraCurrentNumber.textContent = status.chakra.number;
    els.chakraCurrentName.textContent = pcT('chakraNumberSanskrit', { number: status.chakra.number, sanskrit: status.chakra.sanskrit });
    els.chakraCurrentEnglish.textContent = `(${status.chakra.english})`;
    els.chakraCycleLabel.textContent = status.cycleLabel;
    els.chakraPeriodStart.textContent = pcFormatLocalTime(status.periodStart, loc.timezone);
    els.chakraPeriodEnd.textContent = pcFormatLocalTime(status.periodEnd, loc.timezone);
    els.chakraNextInfo.textContent = pcT('chakraNextInfo', {
      number: status.nextChakra.number,
      sanskrit: status.nextChakra.sanskrit,
      english: status.nextChakra.english,
      time: pcFormatLocalTime(status.periodEnd, loc.timezone),
    });

    // Always shown left-to-right as 1-2-3-4-5-6-7 (numeric order), not the
    // 3-4-5-6-7-1-2 cycle order — that's how the underlying timing works,
    // but displaying it that way reads as confusing/out-of-order to users.
    els.chakraSegments.innerHTML = PC_CHAKRAS
      .map((c) => {
        const active = c.number === status.chakraNumber ? ' active' : '';
        return `<div class="chakra-segment${active}" title="Chakra ${c.number} — ${c.sanskrit}">${c.number}</div>`;
      })
      .join('');
  }

  function loadSavedLocation() {
    let saved;
    try {
      const raw = localStorage.getItem(SAVED_LOCATION_KEY);
      if (!raw) return;
      saved = JSON.parse(raw);
    } catch (e) {
      console.error('Could not read saved location:', e);
      return;
    }
    if (
      !saved ||
      typeof saved.latitude !== 'number' ||
      typeof saved.longitude !== 'number' ||
      !saved.timezone
    ) {
      return;
    }
    selectedLocation = saved;
    els.cityInput.value = saved.label || `${saved.latitude}, ${saved.longitude}`;
    // No confirmation text here by design — the location just quietly
    // shows up in the input field, with nothing extra announced.
    els.rememberLocationRow.removeAttribute('hidden');
    els.rememberLocationCheckbox.checked = true;
  }

  function saveLocation(loc) {
    try {
      localStorage.setItem(SAVED_LOCATION_KEY, JSON.stringify(loc));
    } catch (e) {
      console.error('Could not save location:', e);
    }
  }

  function forgetSavedLocation() {
    try {
      localStorage.removeItem(SAVED_LOCATION_KEY);
    } catch (e) {
      console.error('Could not clear saved location:', e);
    }
  }

  function setDefaultDate() {
    const today = new Date();
    const iso = ymdToIso({
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    });
    els.dateInput.value = iso;
  }

  function ymdToIso(ymd) {
    return (
      String(ymd.year).padStart(4, '0') +
      '-' +
      String(ymd.month).padStart(2, '0') +
      '-' +
      String(ymd.day).padStart(2, '0')
    );
  }

  // Device-local "today" as a YYYY-MM-DD string — no location/timezone
  // involved, this is just the calendar date on the user's own device,
  // matching what the plain <input type="date"> field uses.
  function deviceTodayIso() {
    const now = new Date();
    return ymdToIso({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
  }

  // Adds (or subtracts, with a negative delta) whole days to a YYYY-MM-DD
  // string, staying in plain calendar-date arithmetic (UTC-anchored so DST
  // never skews it by an hour into the wrong day).
  function isoAddDays(iso, delta) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + delta);
    return dt.toISOString().slice(0, 10);
  }

  function isoToShortLabel(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  function populateTimezoneDatalist() {
    if (!els.tzDatalist) return;
    let zones = [];
    try {
      if (typeof Intl.supportedValuesOf === 'function') {
        zones = Intl.supportedValuesOf('timeZone');
      }
    } catch (e) {
      zones = [];
    }
    if (zones.length === 0) {
      zones = [
        'UTC',
        'America/Los_Angeles',
        'America/Denver',
        'America/Phoenix',
        'America/Chicago',
        'America/New_York',
        'Europe/London',
        'Europe/Paris',
        'Asia/Kolkata',
        'Asia/Tokyo',
        'Australia/Sydney',
      ];
    }
    els.tzDatalist.innerHTML = zones
      .map((z) => `<option value="${z}"></option>`)
      .join('');
  }

  function bindEvents() {
    // Each handler is bound independently (try/catch per binding) so one
    // missing element can't silently take the rest down with it.
    document.querySelectorAll('.language-option').forEach((btn) => {
      safeBind(btn, 'click', () => setLanguage(btn.getAttribute('data-lang')));
    });

    safeBind(els.citySearchBtn, 'click', onCitySearch);
    safeBind(els.cityInput, 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onCitySearch();
      }
    });
    safeBind(els.cityInput, 'input', () => {
      // If the user edits the text after picking a result, the old
      // selection no longer matches what's shown — don't keep it silently.
      // (This never touches a saved location in storage — only the
      // "Remember my location" checkbox does that, and only when the
      // user acts on it themselves.)
      if (selectedLocation && els.cityInput.value !== selectedLocation.label) {
        selectedLocation = null;
        els.cityStatus.textContent = '';
        els.rememberLocationRow.setAttribute('hidden', '');
        renderChakraTimer();
        renderMonthView();
      }
    });
    safeBind(els.manualToggle, 'click', () => {
      const hidden = els.manualFields.hasAttribute('hidden');
      if (hidden) {
        els.manualFields.removeAttribute('hidden');
      } else {
        els.manualFields.setAttribute('hidden', '');
      }
    });
    safeBind(els.rememberLocationCheckbox, 'change', () => {
      if (els.rememberLocationCheckbox.checked) {
        if (selectedLocation) saveLocation(selectedLocation);
      } else {
        forgetSavedLocation();
      }
    });
    safeBind(els.calculateBtn, 'click', onCalculate);

    // Live-update the color/planet/mantra panel the moment the date
    // changes — typing, picking from the calendar, or arrow-key nudging
    // all fire one of these two events depending on the browser.
    safeBind(els.dateInput, 'input', renderDayLordForSelectedDate);
    safeBind(els.dateInput, 'change', renderDayLordForSelectedDate);
    // Keep the Month View's "selected date" outline live if the panel is
    // already open when the Date field changes.
    safeBind(els.dateInput, 'input', () => { if (monthViewOpen) renderMonthView(); });
    safeBind(els.dateInput, 'change', () => { if (monthViewOpen) renderMonthView(); });

    // The chakra timer only needs a location (it always uses the real
    // current time), so refresh it whenever manual coordinates change.
    // The Month View grid depends on location too, so refresh it here as
    // well — it's re-rendered from scratch each time regardless.
    safeBind(els.latInput, 'input', () => {
      renderChakraTimer();
      renderMonthView();
    });
    safeBind(els.lonInput, 'input', () => {
      renderChakraTimer();
      renderMonthView();
    });
    safeBind(els.tzInput, 'input', () => {
      renderChakraTimer();
      renderMonthView();
    });

    safeBind(els.monthViewToggle, 'click', toggleMonthView);
    safeBind(els.monthViewPrevBtn, 'click', () => {
      monthViewMonth -= 1;
      if (monthViewMonth < 1) {
        monthViewMonth = 12;
        monthViewYear -= 1;
      }
      renderMonthView();
    });
    safeBind(els.monthViewNextBtn, 'click', () => {
      monthViewMonth += 1;
      if (monthViewMonth > 12) {
        monthViewMonth = 1;
        monthViewYear += 1;
      }
      renderMonthView();
    });
    // Tapping a day loads it into the Date field and runs the full
    // calculation below, so the month grid doubles as quick navigation
    // into the detailed result/cycle-info view for any day it shows.
    safeBind(els.monthViewGrid, 'click', (e) => {
      const dayBtn = e.target.closest('.month-view-day');
      if (!dayBtn) return;
      const iso = dayBtn.getAttribute('data-date');
      if (!iso) return;
      els.dateInput.value = iso;
      renderDayLordForSelectedDate();
      onCalculate();
      if (monthViewOpen) renderMonthView();
      if (els.resultCard) {
        els.resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // Cycle-anchor details are collapsed by default; the ⓘ button toggles them.
    safeBind(els.resultInfoBtn, 'click', () => {
      const isHidden = els.resultDetails.hasAttribute('hidden');
      if (isHidden) {
        els.resultDetails.removeAttribute('hidden');
        els.resultInfoBtn.setAttribute('aria-expanded', 'true');
      } else {
        els.resultDetails.setAttribute('hidden', '');
        els.resultInfoBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Tapping the Nitya Devi line expands/collapses the Nitya accordion
    // beneath it; the scheme toggle inside it switches Classical/Nityotsava
    // and saves the choice, but stays tappable to switch again anytime.
    safeBind(els.lunarNityaToggle, 'click', toggleNityaAccordion);
    safeBind(els.nityaSchemeClassicalBtn, 'click', () => {
      saveNityaScheme('classical');
      renderNityaAccordion();
    });
    safeBind(els.nityaSchemeNityotsavaBtn, 'click', () => {
      saveNityaScheme('nityotsava');
      renderNityaAccordion();
    });

    // Tapping the Nakshatra line expands/collapses its own accordion.
    safeBind(els.lunarNakshatraToggle, 'click', toggleNakshatraAccordion);

    // Nostril check-in tracking. Both buttons stay visible and neutral
    // (grey) until one is selected, then only that one highlights in its
    // color — tapping the already-selected button clears it back to
    // neutral, tapping the other switches (same toggle pattern as the
    // Practice-tab day-popup's ✓/✗ buttons).
    safeBind(els.trackCheckBtn, 'click', () => toggleNostrilLogToday('check'));
    safeBind(els.trackXBtn, 'click', () => toggleNostrilLogToday('x'));
    safeBind(els.trackCorrectedYesBtn, 'click', () => setNostrilCorrectedToday(true));
    safeBind(els.trackCorrectedNoBtn, 'click', () => setNostrilCorrectedToday(false));

    // Chilla tracker. Only one Chilla can be active at a time.
    // "Start a Chilla" (no active Chilla) opens the setup screen directly.
    safeBind(els.startChillaBtn, 'click', openChillaSetup);
    // "Start a new Chilla" (an active Chilla exists) has to end the current
    // one first — confirm before doing anything destructive.
    safeBind(els.startNewChillaBtn, 'click', () => {
      const ok = window.confirm(pcT('startNewChillaConfirm'));
      if (!ok) return;
      endCurrentChilla();
      openChillaSetup();
    });
    safeBind(els.endChillaBtn, 'click', () => {
      const ok = window.confirm(pcT('endChillaConfirm'));
      if (!ok) return;
      endCurrentChilla();
      renderChilla();
    });
    safeBind(els.chillaBeginBtn, 'click', beginChillaFromSetup);
    safeBind(els.chillaNameInput, 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        beginChillaFromSetup();
      }
    });
    // Tapping the backdrop (but not the card itself) dismisses the setup
    // screen without starting anything.
    safeBind(els.chillaSetupOverlay, 'click', (e) => {
      if (e.target === els.chillaSetupOverlay) closeChillaSetup();
    });
    safeBind(els.chillaTodayCheckbox, 'change', () => {
      const chilla = loadChilla();
      const today = deviceTodayIso();
      if (els.chillaTodayCheckbox.checked) {
        chilla.checkins[today] = true;
      } else {
        delete chilla.checkins[today];
      }
      saveChilla(chilla);
      renderChilla();
    });

    // Practice tab — calendar navigation and the day-detail popup.
    safeBind(els.calPrevBtn, 'click', () => {
      calendarMonth--;
      if (calendarMonth < 1) {
        calendarMonth = 12;
        calendarYear--;
      }
      renderCalendar();
    });
    safeBind(els.calNextBtn, 'click', () => {
      calendarMonth++;
      if (calendarMonth > 12) {
        calendarMonth = 1;
        calendarYear++;
      }
      renderCalendar();
    });
    safeBind(els.calendarGrid, 'click', (e) => {
      const cell = e.target.closest('.calendar-day');
      if (!cell || cell.hasAttribute('disabled')) return;
      openDayPopup(cell.getAttribute('data-date'));
    });
    safeBind(els.popupCheckBtn, 'click', () => toggleDayPopupNostril('check'));
    safeBind(els.popupXBtn, 'click', () => toggleDayPopupNostril('x'));
    safeBind(els.popupCorrectedYesBtn, 'click', () => setPopupNostrilCorrected(true));
    safeBind(els.popupCorrectedNoBtn, 'click', () => setPopupNostrilCorrected(false));
    safeBind(els.popupClearBtn, 'click', () => setDayPopupNostril(null));
    safeBind(els.popupChillaCheckbox, 'change', () => {
      if (!dayPopupDateIso) return;
      setChillaCheckinForDate(dayPopupDateIso, els.popupChillaCheckbox.checked);
      renderCalendar();
      renderChilla(); // in case this edit touched the currently-active Chilla
    });
    safeBind(els.dayPopupCloseBtn, 'click', closeDayPopup);
    safeBind(els.dayPopupOverlay, 'click', (e) => {
      if (e.target === els.dayPopupOverlay) closeDayPopup();
    });

    // Chakra Assessment.
    safeBind(els.takeChakraQuizBtn, 'click', openChakraQuiz);
    safeBind(els.chakraQuizRetakeBtn, 'click', openChakraQuiz);
    safeBind(els.chakraQuizHideBtn, 'click', () => {
      saveChakraQuizHidePref(true);
      renderChakraQuizSummary();
    });
    safeBind(els.chakraQuizShowBtn, 'click', () => {
      saveChakraQuizHidePref(false);
      renderChakraQuizSummary();
    });
    // Lets the user retake the assessment directly from the hidden state,
    // without first having to reveal the old recommendation.
    safeBind(els.chakraQuizShowRetakeBtn, 'click', openChakraQuiz);
    safeBind(els.quizDisclaimerCheckbox, 'change', () => {
      els.quizBeginBtn.disabled = !els.quizDisclaimerCheckbox.checked;
    });
    safeBind(els.quizBeginBtn, 'click', beginChakraQuizPages);
    // Note: there is no standalone exit/return button anywhere in the quiz
    // overlay any more — the always-visible bottom nav is the only way in
    // or out, with a confirmation prompt while progress is at stake (see
    // bindTabNav / isChakraQuizInProgress above). Tapping the quiz's
    // backdrop still does not close it, for the same reason as before:
    // losing several answered pages to a stray tap would be a much worse
    // experience than a slightly-too-safe modal.
    safeBind(els.quizBackBtn, 'click', goToPrevQuizPage);
    safeBind(els.quizNextBtn, 'click', goToNextQuizPageOrFinish);
    safeBind(els.quizReviewAnswersBtn, 'click', () => {
      if (!currentResultsEntry || !els.quizAnswersReview) return;
      const isHidden = els.quizAnswersReview.hasAttribute('hidden');
      if (isHidden) {
        if (!els.quizAnswersReview.dataset.populated) {
          els.quizAnswersReview.innerHTML = buildAnswersReviewHtml(currentResultsEntry);
          els.quizAnswersReview.dataset.populated = 'true';
        }
        els.quizAnswersReview.removeAttribute('hidden');
        els.quizReviewAnswersBtn.textContent = pcT('hideMyAnswersBtn');
      } else {
        els.quizAnswersReview.setAttribute('hidden', '');
        els.quizReviewAnswersBtn.textContent = pcT('reviewAnswersBtn');
      }
    });
    // Lets someone start a brand new attempt right from the results screen
    // without first backing out to the Today/Practice tab — this attempt's
    // results are already saved (see finishChakraQuiz), so there's nothing
    // to lose by jumping straight into a fresh one.
    safeBind(els.quizResultsRetakeBtn, 'click', openChakraQuiz);

    // Today tab — "See full results" opens the full recommendation view for
    // the most recent saved attempt, without navigating away from Today.
    // The delete icon shares the same confirm-dialog pattern as the
    // Practice-tab history list, and removing it there also removes it from
    // Practice history since both read/write the same saved history list.
    safeBind(els.chakraQuizSeeFullBtn, 'click', () => {
      const entry = getMostRecentQuizResult();
      if (entry) openSavedQuizResult(entry.id);
    });
    // "See past results →" — a quieter, more direct route to the full
    // history than "See full results" (which reopens just the most recent
    // attempt in the overlay); this one goes straight to the Practice tab.
    safeBind(els.chakraQuizPastResultsLink, 'click', () => switchTab('practice'));
    safeBind(els.resultHistoryLink, 'click', () => switchTab('practice'));
    safeBind(els.chillaTrackHintLink, 'click', () => switchTab('practice'));
    safeBind(els.shareNostrilBtn, 'click', shareNostrilResult);
    safeBind(els.shareDayLordBtn, 'click', shareDayLordInfo);
    safeBind(els.shareQuizBtn, 'click', shareQuizResult);
    safeBind(els.sharePracticeBtn, 'click', sharePracticeProgress);
    safeBind(els.chakraQuizDeleteBtn, 'click', () => {
      const entry = getMostRecentQuizResult();
      if (!entry) return;
      showConfirmDialog(pcT('deleteResultConfirm'), pcT('deleteBtn'), () => deleteAssessmentHistoryEntry(entry.id));
    });

    // Practice tab — Assessment History (event delegation, since entries
    // are re-rendered from scratch every time). Tapping Delete asks for
    // confirmation; tapping anywhere else on the entry opens the full
    // recommendation view for that saved attempt (not just its summary).
    safeBind(els.assessmentHistoryList, 'click', (e) => {
      const deleteBtn = e.target.closest('.assessment-history-delete-btn');
      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-quiz-id');
        showConfirmDialog(pcT('deleteResultConfirm'), pcT('deleteBtn'), () => deleteAssessmentHistoryEntry(id));
        return;
      }
      const item = e.target.closest('.assessment-history-item');
      if (!item) return;
      const id = item.getAttribute('data-quiz-id');
      openSavedQuizResult(id);
    });
    safeBind(els.assessmentHistoryList, 'keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const item = e.target.closest('.assessment-history-item');
      if (!item) return;
      e.preventDefault();
      openSavedQuizResult(item.getAttribute('data-quiz-id'));
    });

    // Reusable confirmation dialog (delete-result and exit-quiz share it).
    safeBind(els.confirmDialogCancelBtn, 'click', hideConfirmDialog);
    safeBind(els.confirmDialogConfirmBtn, 'click', () => {
      const callback = confirmDialogCallback;
      hideConfirmDialog();
      if (callback) callback();
    });

    // Today tab — quiet "Were you referred by a friend?" referral code entry.
    safeBind(els.referralEntryCodeInput, 'input', () => {
      const hasCode = !!(els.referralEntryCodeInput.value || '').trim();
      if (hasCode && els.referralEntryError) els.referralEntryError.setAttribute('hidden', '');
    });
    safeBind(els.referralEntryCodeInput, 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitReferralEntryForm();
      }
    });
    safeBind(els.referralEntrySubmitBtn, 'click', submitReferralEntryForm);

    // Mantra tab — "Earn a Free Mantra".
    safeBind(els.referralEmailContinueBtn, 'click', submitReferralOwnEmail);
    safeBind(els.copyReferralCodeBtn, 'click', copyReferralCode);
    safeBind(els.shareReferralCodeBtn, 'click', shareReferralCode);

    // Quiz results — optional "Email me my results".
    safeBind(els.emailResultsSendBtn, 'click', submitEmailResults);
  }

  // --- Reusable confirmation dialog ---------------------------------------

  let confirmDialogCallback = null;

  function showConfirmDialog(message, confirmLabel, onConfirm) {
    els.confirmDialogMessage.textContent = message;
    els.confirmDialogConfirmBtn.textContent = confirmLabel;
    confirmDialogCallback = onConfirm;
    els.confirmDialogOverlay.removeAttribute('hidden');
  }

  function hideConfirmDialog() {
    els.confirmDialogOverlay.setAttribute('hidden', '');
    confirmDialogCallback = null;
  }

  function safeBind(el, event, handler) {
    if (!el) {
      console.error(`Could not bind "${event}" — element not found.`);
      return;
    }
    el.addEventListener(event, handler);
  }

  function parseIsoDate(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }

  function setSearching(isSearching) {
    els.citySearchBtn.disabled = isSearching;
    els.citySearchSpinner.hidden = !isSearching;
    els.citySearchBtnText.textContent = isSearching ? 'Searching…' : 'Search';
  }

  async function onCitySearch() {
    console.log('City search clicked.');
    const query = els.cityInput.value.trim();
    clearError();
    els.cityResults.innerHTML = '';
    selectedLocation = null;
    els.rememberLocationRow.setAttribute('hidden', '');

    if (!query) {
      els.cityStatus.textContent = pcT('enterCityNameFirst');
      return;
    }

    els.cityStatus.textContent = pcT('searchingStatus');
    setSearching(true);
    try {
      const results = await pcGeocodeCity(query);
      if (results.length === 0) {
        els.cityStatus.textContent = pcT('noCityMatches');
        return;
      }
      els.cityStatus.textContent = pcT('selectAMatch');
      renderCityResults(results);
    } catch (err) {
      console.error('City search failed:', err);
      els.cityStatus.textContent =
        (err && err.message ? err.message : pcT('cityLookupFailed')) +
        ' ' + pcT('useManualCoordinatesInstead');
      els.manualFields.removeAttribute('hidden');
    } finally {
      setSearching(false);
    }
  }

  function renderCityResults(results) {
    els.cityResults.innerHTML = '';
    results.forEach((r) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'city-option';
      btn.textContent = `${r.label} — ${r.timezone}`;
      btn.addEventListener('click', () => {
        selectedLocation = r;
        // Put the confirmed selection into the main search bar and close
        // the dropdown, so it's visually obvious the pick registered.
        els.cityInput.value = r.label;
        els.cityResults.innerHTML = '';
        els.cityStatus.textContent = pcT('selectedLocation', { label: r.label, timezone: r.timezone });

        // A fresh selection is never saved automatically — the checkbox
        // always starts unchecked so the user has to opt in explicitly.
        // (Any previously-saved location in storage is left untouched
        // until they act on this checkbox.)
        els.rememberLocationRow.removeAttribute('hidden');
        els.rememberLocationCheckbox.checked = false;

        renderChakraTimer();
        renderMonthView();
      });
      els.cityResults.appendChild(btn);
    });
  }

  function getActiveLocation() {
    // Manual fields, if filled in, take precedence (explicit override).
    const lat = parseFloat(els.latInput.value);
    const lon = parseFloat(els.lonInput.value);
    const tz = els.tzInput.value.trim();

    if (!Number.isNaN(lat) && !Number.isNaN(lon) && tz) {
      return {
        latitude: lat,
        longitude: lon,
        timezone: tz,
        label: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      };
    }
    return selectedLocation;
  }

  function onCalculate() {
    console.log('Calculate clicked.');
    clearError();
    els.resultContent.setAttribute('hidden', '');

    const loc = getActiveLocation();
    if (!loc) {
      showError(
        'Please select a city from search results, or fill in latitude, longitude, and timezone manually.'
      );
      return;
    }

    const dateStr = (els.dateInput.value || '').trim();
    if (!dateStr) {
      showError('Please choose a date.');
      return;
    }
    if (dateStr < MIN_DATE || dateStr > MAX_DATE) {
      showError(`Please choose a date between ${MIN_DATE} and ${MAX_DATE}.`);
      return;
    }
    const ymd = parseIsoDate(dateStr);
    if (!ymd) {
      showError('Please enter the date as YYYY-MM-DD, e.g. 2021-01-13.');
      return;
    }

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: loc.timezone }).format(new Date());
    } catch (e) {
      showError(
        `"${loc.timezone}" is not a recognized timezone name (e.g. "America/Phoenix").`
      );
      return;
    }

    const { year: y, month: m, day: d } = ymd;

    let result;
    try {
      result = pcGetNostrilForLocalDate(
        y,
        m,
        d,
        loc.latitude,
        loc.longitude,
        loc.timezone
      );
    } catch (err) {
      console.error('Calculation failed:', err);
      showError('Calculation failed: ' + err.message);
      return;
    }

    const sunrise = pcSunriseUTC(y, m, d, loc.latitude, loc.longitude);
    renderResult(loc, { year: y, month: m, day: d }, result, sunrise);
  }

  function renderResult(loc, ymd, result, sunriseUTC) {
    lastNostrilRenderCtx = { loc, ymd, result, sunriseUTC };

    const isLeft = result.nostril === 'L';
    els.resultNostril.textContent = isLeft ? pcT('resultNostrilLeft') : pcT('resultNostrilRight');
    els.resultNostril.className = isLeft ? 'nostril left' : 'nostril right';
    els.resultSanskrit.textContent = isLeft
      ? pcT('resultSanskritIda')
      : pcT('resultSanskritPingala');

    els.resultLocation.textContent = loc.label + ` (${loc.timezone})`;
    els.resultDate.textContent = pcFormatDateOnly(ymd);

    els.resultSunrise.textContent = sunriseUTC
      ? pcFormatLocalTime(sunriseUTC, loc.timezone)
      : pcT('resultNoSunrise');

    const anchorLabel = result.anchor.moonType === 'new' ? pcT('resultMoonTypeNew') : pcT('resultMoonTypeFull');
    const nextAnchorLabel =
      result.nextAnchor.moonType === 'new' ? pcT('resultMoonTypeNew') : pcT('resultMoonTypeFull');

    let details = pcT('resultCycleDetails', {
      anchorLabel,
      anchorDate: pcFormatDateOnly(result.anchor.ymd),
      dayOfCycle: result.dayOfCycle,
      totalDays: result.totalDaysInCycle,
      remainderDays: result.remainderBlockDays,
      nextAnchorLabel,
      nextAnchorDate: pcFormatDateOnly(result.nextAnchor.ymd),
    });

    if (result.anchor.polarNote) {
      details += pcT('resultDetailsNote', { note: result.anchor.polarNote });
    }

    els.resultDetails.textContent = details;
    // (Color/planet/mantra live in their own panel, kept in sync with the
    // Date field directly — see renderDayLordForSelectedDate.)

    // The cycle-anchor details are collapsed by default for every new
    // result — the ⓘ button next to the nostril reveals them on demand.
    els.resultDetails.setAttribute('hidden', '');
    els.resultInfoBtn.setAttribute('aria-expanded', 'false');

    els.resultContent.removeAttribute('hidden');

    currentResultYmd = ymd;
    renderNostrilTracking();
  }

  // Re-renders the Result card in place (same data, new language) — used by
  // applyTranslations() so switching language updates an already-visible
  // result instead of leaving it in whatever language it was first
  // calculated in. No-ops if no result has been calculated yet this session.
  function reRenderNostrilResultForLanguage() {
    if (!lastNostrilRenderCtx) return;
    const { loc, ymd, result, sunriseUTC } = lastNostrilRenderCtx;
    renderResult(loc, ymd, result, sunriseUTC);
  }

  // Share button on the Result card — "My dominant nostril today is ...".
  // Shares a designed image card (see js/share-card.js) with the same
  // message as its caption/fallback text.
  function shareNostrilResult() {
    if (!lastNostrilRenderCtx) return;
    const isLeft = lastNostrilRenderCtx.result.nostril === 'L';
    const side = isLeft ? pcT('resultNostrilLeft') : pcT('resultNostrilRight');
    const dateLabel = pcFormatDateOnly(lastNostrilRenderCtx.ymd);
    const text = pcT('shareNostrilMessage', {
      date: dateLabel,
      side,
      link: APP_SHARE_URL,
    });
    pcShareCardImage(
      'nostril',
      {
        // Reuses the same left/right identity colors as the rest of the UI.
        accentHex: isLeft ? '#4f6fa3' : '#b9622e',
        dateLabel,
        title: pcT('shareCardNostrilTitle'),
        isLeft,
        sideLabel: side,
        subLine: pcT('shareCardDiscoverLine'),
        taglineLine1: pcT('pranaCalendarSubtitleLine1'),
        taglineLine2: pcT('pranaCalendarSubtitleLine2'),
      },
      text,
      els.shareNostrilCopiedNote,
      'prana-calendar-nostril-result.png'
    );
  }

  // --- Nostril check-in tracking (today only) ---------------------------
  //
  // Lets the user log whether the predicted nostril actually matched what
  // they noticed, for today's date only. Stored locally on the device,
  // keyed by calendar date, so past days keep whatever was logged (or stay
  // blank if nothing was).

  function loadNostrilLog() {
    try {
      const raw = localStorage.getItem(NOSTRIL_LOG_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Could not read nostril log:', e);
      return {};
    }
  }

  function saveNostrilLog(log) {
    try {
      localStorage.setItem(NOSTRIL_LOG_KEY, JSON.stringify(log));
    } catch (e) {
      console.error('Could not save nostril log:', e);
    }
  }

  // THREE nostril states are logged, not two: 'check' (correct at
  // sunrise), 'x-corrected' (incorrect, but the follow-up question "were
  // you able to correct it easily?" was answered Yes), and
  // 'x-not-corrected' (incorrect, follow-up answered No). A bare legacy
  // 'x' — from data saved before this three-state distinction existed, or
  // the brief moment right after tapping ✗ before the follow-up is
  // answered — is treated as 'x-not-corrected' (the safe/conservative
  // default), and the follow-up stays available to update it either way.
  function nostrilMarkKind(value) {
    if (value === 'check') return 'check';
    if (value === 'x-corrected') return 'x-corrected';
    if (value === 'x' || value === 'x-not-corrected') return 'x-not-corrected';
    return null;
  }

  // Both ✓/✗ buttons are always shown (never swapped out for a separate
  // indicator) — neutral/grey until one is the logged answer, then only
  // that one highlights in its color via the shared `.toggle-btn.selected`
  // pattern also used by the Practice-tab day popup. Past/future dates that
  // were logged are shown the same way but disabled (a read-only record).
  // Marking ✗ reveals the "were you able to correct it easily?" follow-up,
  // whose Yes/No selection is what distinguishes the yellow/black-outline
  // ("x-corrected") state from the red ("x-not-corrected") one.
  function renderNostrilTracking() {
    if (!currentResultYmd) {
      els.nostrilTracking.setAttribute('hidden', '');
      return;
    }
    const dateIso = ymdToIso(currentResultYmd);
    const today = deviceTodayIso();
    const isToday = dateIso === today;
    const log = loadNostrilLog();
    const logged = log[dateIso]; // 'check' | 'x-corrected' | 'x-not-corrected' | legacy 'x' | undefined
    const kind = nostrilMarkKind(logged);

    if (!isToday && !kind) {
      // Nothing to show for a past/future date that was never logged.
      els.nostrilTracking.setAttribute('hidden', '');
      return;
    }

    els.nostrilTracking.removeAttribute('hidden');
    els.trackingButtons.removeAttribute('hidden');

    els.trackCheckBtn.classList.toggle('selected', kind === 'check');
    const isX = kind === 'x-corrected' || kind === 'x-not-corrected';
    els.trackXBtn.classList.toggle('selected', isX);
    els.trackXBtn.classList.toggle('x-corrected', kind === 'x-corrected');

    if (els.trackCorrectedFollowup) {
      els.trackCorrectedFollowup.toggleAttribute('hidden', !isX);
      if (isX) {
        els.trackCorrectedYesBtn.classList.toggle('selected', kind === 'x-corrected');
        els.trackCorrectedNoBtn.classList.toggle('selected', kind === 'x-not-corrected');
      }
    }

    if (isToday) {
      els.trackCheckBtn.removeAttribute('disabled');
      els.trackXBtn.removeAttribute('disabled');
      if (els.trackCorrectedYesBtn) {
        els.trackCorrectedYesBtn.removeAttribute('disabled');
        els.trackCorrectedNoBtn.removeAttribute('disabled');
      }
    } else {
      // Past/future entries are a record, not editable from here.
      els.trackCheckBtn.setAttribute('disabled', '');
      els.trackXBtn.setAttribute('disabled', '');
      if (els.trackCorrectedYesBtn) {
        els.trackCorrectedYesBtn.setAttribute('disabled', '');
        els.trackCorrectedNoBtn.setAttribute('disabled', '');
      }
    }
  }

  // Tapping ✓ toggles straight to/from 'check' as before. Tapping ✗ tapped
  // again while already marked incorrect (either corrected sub-state)
  // clears back to neutral — otherwise it marks it incorrect, defaulting
  // to 'x-not-corrected' until the follow-up says otherwise (see
  // setNostrilCorrectedToday). Identical semantics to the Practice-tab day
  // popup below, just scoped to "today" on the Today tab.
  function toggleNostrilLogToday(value) {
    const today = deviceTodayIso();
    const log = loadNostrilLog();
    const current = log[today];
    if (value === 'check') {
      setNostrilLogToday(current === 'check' ? null : 'check');
      return;
    }
    const kind = nostrilMarkKind(current);
    const alreadyX = kind === 'x-corrected' || kind === 'x-not-corrected';
    setNostrilLogToday(alreadyX ? null : 'x-not-corrected');
  }

  // Answers the "were you able to correct it easily?" follow-up for today.
  function setNostrilCorrectedToday(corrected) {
    setNostrilLogToday(corrected ? 'x-corrected' : 'x-not-corrected');
  }

  function setNostrilLogToday(value) {
    const today = deviceTodayIso();
    const log = loadNostrilLog();
    if (value === null) {
      delete log[today];
    } else {
      log[today] = value;
    }
    saveNostrilLog(log);
    renderNostrilTracking();
  }

  // --- Chilla tracker -----------------------------------------------------
  //
  // A Chilla is a 40-consecutive-day practice streak. Stored locally on the
  // device. Missing a day resets the streak, but the Chilla itself is never
  // force-ended — the user can keep going indefinitely past day 40, or
  // choose to start a fresh one at any time.

  function loadChilla() {
    const fallback = { active: false, anchorDate: null, checkins: {}, name: '', number: 0 };
    try {
      const raw = localStorage.getItem(CHILLA_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return {
        active: !!parsed.active,
        anchorDate: parsed.anchorDate || null,
        checkins: parsed.checkins && typeof parsed.checkins === 'object' ? parsed.checkins : {},
        name: typeof parsed.name === 'string' ? parsed.name : '',
        number: typeof parsed.number === 'number' ? parsed.number : 0,
      };
    } catch (e) {
      console.error('Could not read Chilla data:', e);
      return fallback;
    }
  }

  function saveChilla(chilla) {
    try {
      localStorage.setItem(CHILLA_KEY, JSON.stringify(chilla));
    } catch (e) {
      console.error('Could not save Chilla data:', e);
    }
  }

  // Tracks the highest Chilla number used so far, so "Chilla 1", "Chilla 2"
  // etc. keep counting up in sequence even across multiple Chillas.
  function nextChillaNumber() {
    try {
      const raw = localStorage.getItem(CHILLA_COUNTER_KEY);
      const n = raw ? parseInt(raw, 10) : 0;
      return (Number.isFinite(n) ? n : 0) + 1;
    } catch (e) {
      console.error('Could not read Chilla counter:', e);
      return 1;
    }
  }

  function saveChillaCounter(number) {
    try {
      localStorage.setItem(CHILLA_COUNTER_KEY, String(number));
    } catch (e) {
      console.error('Could not save Chilla counter:', e);
    }
  }

  // Every ended Chilla (however it ended) is archived here in full,
  // checkins included, so nothing logged is ever lost — the Practice tab's
  // calendar will read from this later.
  function loadChillaHistory() {
    try {
      const raw = localStorage.getItem(CHILLA_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Could not read Chilla history:', e);
      return [];
    }
  }

  function saveChillaHistory(history) {
    try {
      localStorage.setItem(CHILLA_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Could not save Chilla history:', e);
    }
  }

  // Archives the current Chilla (if one was ever actually started) into
  // history, then resets the "current Chilla" slot back to empty. Only one
  // Chilla can ever be active at a time, so both "End Chilla" and "Start a
  // new Chilla" go through this.
  function endCurrentChilla() {
    const chilla = loadChilla();
    if (chilla.number > 0) {
      const history = loadChillaHistory();
      history.push({
        number: chilla.number,
        name: chilla.name,
        anchorDate: chilla.anchorDate,
        endedDate: deviceTodayIso(),
        checkins: chilla.checkins || {},
      });
      saveChillaHistory(history);
    }
    saveChilla({ active: false, anchorDate: null, checkins: {}, name: '', number: 0 });
  }

  // --- Chilla setup screen ---
  //
  // Opened by both "Start a Chilla" and "Start a new Chilla". Nothing is
  // written to storage until Begin is tapped.

  function openChillaSetup() {
    const n = nextChillaNumber();
    els.chillaNameInput.value = `Chilla ${n}`;
    els.chillaSetupOverlay.removeAttribute('hidden');
    els.chillaNameInput.focus();
    els.chillaNameInput.select();
  }

  function closeChillaSetup() {
    els.chillaSetupOverlay.setAttribute('hidden', '');
  }

  function beginChillaFromSetup() {
    const number = nextChillaNumber();
    const typed = els.chillaNameInput.value.trim();
    const name = typed || `Chilla ${number}`;

    const chilla = {
      active: true,
      anchorDate: deviceTodayIso(),
      checkins: {},
      name,
      number,
    };
    saveChilla(chilla);
    saveChillaCounter(number);
    closeChillaSetup();
    renderChilla();
  }

  // Consecutive checked-in days, counting backward from today (or from
  // yesterday if today hasn't been checked yet, so the streak doesn't look
  // broken before the user has had a chance to check in — it only drops to
  // 0 once a full day has passed with nothing logged) down to — but not
  // before — the current Chilla's anchor date. Nothing is cached: this
  // walks the checkins data fresh every time it's called, so logging or
  // un-logging today's box immediately changes the result the next time
  // this runs.
  function computeChillaStreak(chilla, todayIso) {
    if (!chilla.active || !chilla.anchorDate) return 0;

    let cursor;
    if (chilla.checkins[todayIso]) {
      cursor = todayIso;
    } else {
      const yesterday = isoAddDays(todayIso, -1);
      if (chilla.checkins[yesterday] && yesterday >= chilla.anchorDate) {
        cursor = yesterday;
      } else {
        return 0;
      }
    }

    let streak = 0;
    while (cursor >= chilla.anchorDate && chilla.checkins[cursor]) {
      streak++;
      cursor = isoAddDays(cursor, -1);
    }
    return streak;
  }

  // Consecutive LOGGED days (any of check/x-corrected/x-not-corrected all
  // count — this is about practice consistency, not correctness), counting
  // backward from today the same way computeChillaStreak does: if today
  // hasn't been logged yet the streak isn't considered broken until a full
  // day passes with nothing logged.
  function computeNostrilLogStreak() {
    const log = loadNostrilLog();
    const today = deviceTodayIso();
    let cursor;
    if (nostrilMarkKind(log[today])) {
      cursor = today;
    } else {
      const yesterday = isoAddDays(today, -1);
      if (nostrilMarkKind(log[yesterday])) {
        cursor = yesterday;
      } else {
        return 0;
      }
    }
    let streak = 0;
    while (nostrilMarkKind(log[cursor])) {
      streak++;
      cursor = isoAddDays(cursor, -1);
    }
    return streak;
  }

  // Share button on the Practice tab — nostril streak, plus current Chilla
  // day if one is active (per the exact wording requested: "I've logged
  // {streak} consecutive days and am on day {day} of my Chilla ..." when a
  // Chilla is active, otherwise just the streak).
  function sharePracticeProgress() {
    const streak = computeNostrilLogStreak();
    const chilla = loadChilla();
    let text;
    if (chilla.active) {
      const chillaDay = computeChillaStreak(chilla, deviceTodayIso());
      text = pcT('sharePracticeStreakChillaMessage', { streak, day: chillaDay, link: APP_SHARE_URL });
    } else {
      text = pcT('sharePracticeStreakMessage', { streak, link: APP_SHARE_URL });
    }
    pcShareText(text, els.sharePracticeCopiedNote);
  }

  function chillaStreakMessage(streak) {
    if (streak <= 0) {
      return pcT('chillaStreakStart', { length: CHILLA_LENGTH });
    }
    if (streak < CHILLA_LENGTH) {
      return pcT('chillaStreakProgress', { streak, length: CHILLA_LENGTH });
    }
    if (streak === CHILLA_LENGTH) {
      return pcT('chillaStreakComplete', { length: CHILLA_LENGTH });
    }
    return pcT('chillaStreakBeyond', { streak });
  }

  function renderChilla() {
    const chilla = loadChilla();
    const today = deviceTodayIso();

    if (!chilla.active) {
      els.chillaStartRow.removeAttribute('hidden');
      els.chillaActiveRow.setAttribute('hidden', '');
      return;
    }

    els.chillaStartRow.setAttribute('hidden', '');
    els.chillaActiveRow.removeAttribute('hidden');

    const streak = computeChillaStreak(chilla, today);
    els.chillaNameText.textContent = chilla.name || pcT('chillaNumberLabel', { number: chilla.number });
    els.chillaStreakText.textContent = chillaStreakMessage(streak);
    els.chillaTodayCheckbox.checked = !!chilla.checkins[today];
    els.startNewChillaBtn.textContent =
      streak >= CHILLA_LENGTH ? 'Ready to start a new Chilla?' : 'Start a new Chilla';
  }

  // --- Practice tab: calendar + day-detail popup --------------------------
  //
  // Shows every logged nostril check-in and every completed Chilla day on
  // a month grid, and lets the user tap any past or present day to add,
  // change, or clear either piece of data. Nothing is ever locked.

  function initCalendar() {
    const today = new Date();
    calendarYear = today.getFullYear();
    calendarMonth = today.getMonth() + 1;
    renderCalendar();
  }

  function daysInMonth(year, month) {
    // Day 0 of JS month `month` (0-indexed) is the last day of our
    // 1-indexed month `month` — see the identical trick in sunrise.js-style
    // date math used throughout this file.
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function monthLabel(year, month) {
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  function friendlyDateLabel(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  // Finds whichever Chilla (the current active one, or one from history)
  // covers a given date, so the calendar/popup can show and edit that
  // Chilla's check-in for that specific day. Returns null if no Chilla was
  // active on that date.
  function getChillaForDate(dateIso) {
    const current = loadChilla();
    if (current.active && current.anchorDate && dateIso >= current.anchorDate) {
      return { ...current, source: 'current' };
    }
    const history = loadChillaHistory();
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i];
      if (h.anchorDate && h.endedDate && dateIso >= h.anchorDate && dateIso <= h.endedDate) {
        return { ...h, source: 'history', historyIndex: i };
      }
    }
    return null;
  }

  function setChillaCheckinForDate(dateIso, done) {
    const owner = getChillaForDate(dateIso);
    if (!owner) return;
    if (owner.source === 'current') {
      const chilla = loadChilla();
      if (done) chilla.checkins[dateIso] = true;
      else delete chilla.checkins[dateIso];
      saveChilla(chilla);
    } else {
      const history = loadChillaHistory();
      const h = history[owner.historyIndex];
      if (!h) return;
      if (done) h.checkins[dateIso] = true;
      else delete h.checkins[dateIso];
      saveChillaHistory(history);
    }
  }

  function renderCalendar() {
    if (calendarYear === null || calendarMonth === null) return;

    els.calMonthLabel.textContent = monthLabel(calendarYear, calendarMonth);

    const today = deviceTodayIso();
    const nostrilLog = loadNostrilLog();
    const total = daysInMonth(calendarYear, calendarMonth);
    const firstWeekday = pcWeekdayIndex(calendarYear, calendarMonth, 1);

    let html = '';
    for (let i = 0; i < firstWeekday; i++) {
      html += '<div class="calendar-day-empty"></div>';
    }

    for (let day = 1; day <= total; day++) {
      const iso = ymdToIso({ year: calendarYear, month: calendarMonth, day });
      const isFuture = iso > today;
      const isToday = iso === today;

      const markKind = nostrilMarkKind(nostrilLog[iso]); // 'check' | 'x-corrected' | 'x-not-corrected' | null
      const owner = getChillaForDate(iso);
      const chillaDone = !!(owner && owner.checkins && owner.checkins[iso]);
      const dotColor = chillaDone
        ? CHILLA_DOT_COLORS[(owner.number - 1) % CHILLA_DOT_COLORS.length]
        : null;

      let classes = 'calendar-day';
      if (isToday) classes += ' today';
      if (isFuture) classes += ' future';

      html +=
        `<button type="button" class="${classes}" data-date="${iso}"${isFuture ? ' disabled' : ''}>` +
        `<span class="calendar-day-number">${day}</span>` +
        `<span class="calendar-day-marks">` +
        (markKind === 'check' ? '<span class="mark-check">✓</span>' : '') +
        (markKind === 'x-corrected' ? '<span class="mark-x mark-x-corrected">✗</span>' : '') +
        (markKind === 'x-not-corrected' ? '<span class="mark-x mark-x-not-corrected">✗</span>' : '') +
        (dotColor ? `<span class="mark-dot" style="background:${dotColor}"></span>` : '') +
        `</span>` +
        `</button>`;
    }

    const totalCells = firstWeekday + total;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < trailing; i++) {
      html += '<div class="calendar-day-empty"></div>';
    }

    els.calendarGrid.innerHTML = html;
  }

  // --- Today tab: Month View (testing) -------------------------------
  //
  // A plain, no-frills month grid that shows the CALCULATED dominant
  // nostril (L/R) for every day of any month/year at a glance, using
  // whichever location is currently set below on the Today tab. Unlike
  // the Practice tab calendar, this has nothing to do with logged
  // check-ins or Chillas — it's purely a way to eyeball the engine's
  // output (four-day/two-day block placement, balancing-pass flips,
  // etc.) across a whole month without calculating one day at a time.

  function initMonthView() {
    const today = new Date();
    monthViewYear = today.getFullYear();
    monthViewMonth = today.getMonth() + 1;
    renderMonthView();
  }

  // Independent tap-to-expand toggle (same pattern as the Tithi/Nakshatra
  // lines above) — hidden by default, opened by tapping "View Month". Not
  // part of the shared mutually-exclusive .accordion-item group, so
  // opening it never collapses an unrelated accordion elsewhere.
  function toggleMonthView() {
    if (!els.monthViewPanel || !els.monthViewToggle) return;
    monthViewOpen = !monthViewOpen;
    els.monthViewPanel.toggleAttribute('hidden', !monthViewOpen);
    els.monthViewToggle.setAttribute('aria-expanded', monthViewOpen ? 'true' : 'false');
    if (monthViewOpen) renderMonthView();
  }

  function renderMonthView() {
    if (monthViewYear === null || monthViewMonth === null) return;
    if (!els.monthViewMonthLabel || !els.monthViewGrid) return;

    els.monthViewMonthLabel.textContent = monthLabel(monthViewYear, monthViewMonth);

    const loc = getActiveLocation();
    if (!loc) {
      els.monthViewGrid.innerHTML = '';
      els.monthViewStatus.textContent =
        'Select a location below (search a city, or enter coordinates manually) to see the month grid.';
      return;
    }

    // Build the whole year's schedule once (cached — see
    // PC_YEAR_SCHEDULE_CACHE) rather than looking up each day
    // independently, so we also get the cycle list itself: that's what
    // lets us mark ANCHOR days (a new/full moon cycle boundary — may be
    // shifted a day from the moon event itself, see pcComputeAnchor) and
    // the moon event's own local calendar day (🌑/🌕 — from
    // anchor.localMoonDate, which is deliberately kept separate from the
    // anchor day it may have been shifted away from).
    let schedule = null;
    try {
      schedule = pcBuildYearSchedule(monthViewYear, loc.latitude, loc.longitude, loc.timezone);
    } catch (err) {
      console.error('Month View: could not build year schedule:', err);
    }

    const anchorDateMsSet = new Set();
    const moonTypeByDateMs = new Map(); // dateMs of the MOON EVENT's own local day -> 'new' | 'full'
    if (schedule) {
      const markAnchor = (anchor) => {
        anchorDateMsSet.add(anchor.dateMs);
        moonTypeByDateMs.set(pcDateOnlyMs(anchor.localMoonDate), anchor.moonType);
      };
      for (const cycle of schedule.cycles) markAnchor(cycle.anchor);
      // The padded window's very last anchor only ever appears as a
      // `nextAnchor`, never as some cycle's own `.anchor` — include it too
      // so a month right at the edge of the schedule still marks it.
      const lastCycle = schedule.cycles[schedule.cycles.length - 1];
      if (lastCycle) markAnchor(lastCycle.nextAnchor);
    }

    const today = deviceTodayIso();
    // The currently selected date (whatever's loaded into the Date field
    // above) gets the same outline treatment as "today" — both mean "the
    // day currently in focus", just from different sources.
    const selectedIso = (els.dateInput && els.dateInput.value) || null;
    const total = daysInMonth(monthViewYear, monthViewMonth);
    const firstWeekday = pcWeekdayIndex(monthViewYear, monthViewMonth, 1);

    let html = '';
    for (let i = 0; i < firstWeekday; i++) {
      html += '<div class="calendar-day-empty"></div>';
    }

    let errorCount = 0;
    for (let day = 1; day <= total; day++) {
      const iso = ymdToIso({ year: monthViewYear, month: monthViewMonth, day });
      const dateMs = Date.UTC(monthViewYear, monthViewMonth - 1, day);
      const isToday = iso === today;
      const isSelected = selectedIso != null && iso === selectedIso && !isToday;

      let nostrilClass = 'month-view-error';
      let letter = '?';
      if (iso >= MIN_DATE && iso <= MAX_DATE && schedule && schedule.days.has(dateMs)) {
        const nostril = schedule.days.get(dateMs);
        const isLeft = nostril === 'L';
        nostrilClass = isLeft ? 'month-view-left' : 'month-view-right';
        letter = isLeft ? pcT('nostrilLetterLeft') : pcT('nostrilLetterRight');
      } else if (iso >= MIN_DATE && iso <= MAX_DATE) {
        errorCount++;
      }

      const isAnchor = anchorDateMsSet.has(dateMs);
      const moonType = moonTypeByDateMs.get(dateMs); // 'new' | 'full' | undefined
      const moonEmoji = moonType === 'new' ? '🌑' : moonType === 'full' ? '🌕' : '';

      let classes = `calendar-day month-view-day ${nostrilClass}`;
      if (isToday) classes += ' today';
      if (isSelected) classes += ' month-view-selected';
      if (isAnchor) classes += ' month-view-anchor';

      html +=
        `<button type="button" class="${classes}" data-date="${iso}" title="${iso}${isAnchor ? ' — cycle anchor' : ''}">` +
        `<span class="calendar-day-number">${day}</span>` +
        `<span class="month-view-nostril-letter">${letter}</span>` +
        (moonEmoji ? `<span class="month-view-moon-emoji" aria-label="${moonType} moon">${moonEmoji}</span>` : '') +
        `</button>`;
    }

    const totalCells = firstWeekday + total;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < trailing; i++) {
      html += '<div class="calendar-day-empty"></div>';
    }

    els.monthViewGrid.innerHTML = html;

    let status = `${loc.label} (${loc.timezone})`;
    if (errorCount > 0) {
      status += ` — ${errorCount} day(s) outside the supported ${MIN_DATE} to ${MAX_DATE} range or could not be calculated.`;
    }
    els.monthViewStatus.textContent = status;
  }

  function openDayPopup(iso) {
    dayPopupDateIso = iso;
    els.dayPopupDate.textContent = friendlyDateLabel(iso);

    const log = loadNostrilLog();
    updatePopupNostrilButtons(log[iso]);

    const owner = getChillaForDate(iso);
    if (owner) {
      els.popupChillaSection.removeAttribute('hidden');
      els.popupChillaCheckbox.checked = !!(owner.checkins && owner.checkins[iso]);
    } else {
      els.popupChillaSection.setAttribute('hidden', '');
    }

    els.dayPopupOverlay.removeAttribute('hidden');
  }

  function closeDayPopup() {
    els.dayPopupOverlay.setAttribute('hidden', '');
    dayPopupDateIso = null;
  }

  // At a glance the state has to be unambiguous: ✓ selected is filled
  // green, ✗ selected is filled red (or yellow with a black outline once
  // corrected — see nostrilMarkKind), and — critically — neither button is
  // colored at all
  // when nothing is logged, so "cleared" never looks like a dimmed version
  // of an answer. Marking ✗ reveals the "corrected easily?" follow-up here
  // too, exactly like the Today-tab tracker.
  function updatePopupNostrilButtons(value) {
    const kind = nostrilMarkKind(value);
    els.popupCheckBtn.classList.toggle('selected', kind === 'check');
    const isX = kind === 'x-corrected' || kind === 'x-not-corrected';
    els.popupXBtn.classList.toggle('selected', isX);
    els.popupXBtn.classList.toggle('x-corrected', kind === 'x-corrected');

    if (els.popupCorrectedFollowup) {
      els.popupCorrectedFollowup.toggleAttribute('hidden', !isX);
      if (isX) {
        els.popupCorrectedYesBtn.classList.toggle('selected', kind === 'x-corrected');
        els.popupCorrectedNoBtn.classList.toggle('selected', kind === 'x-not-corrected');
      }
    }
  }

  // Tapping ✓ toggles straight to/from 'check'. Tapping ✗ again while
  // already marked incorrect clears back to neutral; otherwise it marks it
  // incorrect, defaulting to 'x-not-corrected' until the follow-up says
  // otherwise (see setPopupNostrilCorrected). The Clear link always clears
  // outright — no confirmation, nothing locked.
  function toggleDayPopupNostril(value) {
    const log = loadNostrilLog();
    const current = dayPopupDateIso ? log[dayPopupDateIso] : undefined;
    if (value === 'check') {
      setDayPopupNostril(current === 'check' ? null : 'check');
      return;
    }
    const kind = nostrilMarkKind(current);
    const alreadyX = kind === 'x-corrected' || kind === 'x-not-corrected';
    setDayPopupNostril(alreadyX ? null : 'x-not-corrected');
  }

  // Answers the "were you able to correct it easily?" follow-up for
  // whichever date the day popup currently has open.
  function setPopupNostrilCorrected(corrected) {
    setDayPopupNostril(corrected ? 'x-corrected' : 'x-not-corrected');
  }

  function setDayPopupNostril(value) {
    if (!dayPopupDateIso) return;
    const log = loadNostrilLog();

    if (value === null) {
      delete log[dayPopupDateIso];
    } else {
      log[dayPopupDateIso] = value;
    }

    saveNostrilLog(log);
    updatePopupNostrilButtons(log[dayPopupDateIso]);
    renderCalendar();

    // Keep the Today-tab tracking widget in sync if it's showing this same
    // date right now.
    if (currentResultYmd && ymdToIso(currentResultYmd) === dayPopupDateIso) {
      renderNostrilTracking();
    }
  }

  // --- Mantra tab: audio players --------------------------------------
  //
  // Each ".mantra-item" in the Mantra tab is fully self-contained (its own
  // play button, progress bar, and <audio>), so adding another mantra
  // later is just adding another block in the HTML — no JS changes needed.

  function formatPlaybackTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function bindMantraPlayers() {
    const items = document.querySelectorAll('.mantra-item');
    const allAudios = Array.from(items)
      .map((item) => item.querySelector('.mantra-audio'))
      .filter(Boolean);

    items.forEach((item) => {
      const audio = item.querySelector('.mantra-audio');
      // Audio now streams from an external host (see js/mantra-catalog.js)
      // rather than a local file — the <audio> tag in index.html carries no
      // `src` attribute anymore, so it's set here from the catalog entry.
      const catalogEntry = typeof MANTRA_CATALOG !== 'undefined' ? MANTRA_CATALOG[item.dataset.mantraKey] : null;
      if (audio && catalogEntry && catalogEntry.audioUrl) {
        audio.src = catalogEntry.audioUrl;
      }
      const playBtn = item.querySelector('.mantra-play-btn');
      const iconPlay = item.querySelector('.icon-play');
      const iconPause = item.querySelector('.icon-pause');
      const elapsedEl = item.querySelector('.mantra-elapsed');
      const durationEl = item.querySelector('.mantra-duration');
      const seekEl = item.querySelector('.mantra-seek'); // native <input type="range">
      if (!audio || !playBtn) return;

      // While the user has the slider handle down, "timeupdate" must not
      // fight them by snapping the slider back to the real playback
      // position mid-drag — it resumes following playback the moment they
      // let go (native "change" fires on mouseup/touchend/keyup).
      let isDragging = false;

      // Some MP3s (particularly VBR files without a proper Xing/duration
      // header) report `duration: Infinity` right after loading — the
      // browser only learns the real duration once it can seek near the
      // end of the file. That's what silently broke the progress bar and
      // the time readout before. The fix: if duration comes back
      // non-finite, force a seek far past the end to make the browser scan
      // the whole file, then snap back to the start once "durationchange"
      // reports the real, finite value.
      let resolvingDuration = false;

      function updateDurationDisplay() {
        if (durationEl) durationEl.textContent = formatPlaybackTime(audio.duration);
        if (seekEl && Number.isFinite(audio.duration)) {
          seekEl.max = String(audio.duration);
        }
      }

      function updateProgress(currentTime) {
        if (elapsedEl) elapsedEl.textContent = formatPlaybackTime(currentTime);
        if (seekEl && !isDragging) seekEl.value = String(currentTime);
      }

      // Toggle the `hidden` attribute explicitly (setAttribute/removeAttribute)
      // rather than assigning the `.hidden` property — SVG elements don't
      // reliably reflect that IDL property in every browser, so a plain
      // `el.hidden = true` can silently do nothing to the actual attribute.
      const showPlaying = (isPlaying) => {
        if (iconPlay) {
          if (isPlaying) iconPlay.setAttribute('hidden', '');
          else iconPlay.removeAttribute('hidden');
        }
        if (iconPause) {
          if (isPlaying) iconPause.removeAttribute('hidden');
          else iconPause.setAttribute('hidden', '');
        }
        playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
      };

      playBtn.addEventListener('click', () => {
        if (audio.paused) {
          // Only one mantra plays at a time — pause every other player first.
          allAudios.forEach((other) => {
            if (other !== audio && !other.paused) other.pause();
          });
          audio.play().catch((err) => {
            console.error('Could not play audio:', err);
            showErrorSafe(
              'Could not play "' + (item.querySelector('.mantra-item-name') || {}).textContent +
                '" — the audio stream may be temporarily unavailable. Please try again in a moment.'
            );
          });
        } else {
          audio.pause();
        }
      });

      audio.addEventListener('play', () => showPlaying(true));
      audio.addEventListener('pause', () => showPlaying(false));

      audio.addEventListener('loadedmetadata', () => {
        console.log('[SEEK DEBUG] loadedmetadata — duration=', audio.duration);
        if (!Number.isFinite(audio.duration)) {
          resolvingDuration = true;
          audio.currentTime = 1e101; // force the browser to scan for the real duration
        } else {
          updateDurationDisplay();
        }
      });

      audio.addEventListener('durationchange', () => {
        console.log('[SEEK DEBUG] durationchange — duration=', audio.duration, '| resolvingDuration was', resolvingDuration);
        updateDurationDisplay();
        if (Number.isFinite(audio.duration) && resolvingDuration) {
          resolvingDuration = false;
          console.log('[SEEK DEBUG] duration now resolved — resetting currentTime to 0 (this is the startup fix-up, not a user seek)');
          audio.currentTime = 0;
        }
      });

      audio.addEventListener('timeupdate', () => {
        // Ignore the huge currentTime produced by the duration-fixing seek
        // above — it isn't real playback position.
        if (resolvingDuration) return;
        updateProgress(audio.currentTime);
      });

      audio.addEventListener('seeking', () => {
        console.log('[SEEK DEBUG] "seeking" event fired — currentTime now=', audio.currentTime, '| readyState=', audio.readyState, '| networkState=', audio.networkState);
      });

      audio.addEventListener('seeked', () => {
        console.log('[SEEK DEBUG] "seeked" event fired (browser finished the seek) — currentTime now=', audio.currentTime, '| paused=', audio.paused);
      });

      audio.addEventListener('ended', () => {
        console.log('[SEEK DEBUG] "ended" event fired — currentTime was', audio.currentTime, 'right before this reset it to 0');
        audio.currentTime = 0;
        updateProgress(0);
        showPlaying(false);
      });

      audio.addEventListener('error', () => {
        const mediaError = audio.error;
        console.error(
          '[SEEK DEBUG] "error" event fired — code=', mediaError && mediaError.code,
          '| message=', mediaError && mediaError.message,
          '| src=', audio.currentSrc || audio.src
        );
      });

      // The native range input does all the real work here — dragging,
      // clicking anywhere on the track, touch, and keyboard (arrow keys,
      // Home/End, Page Up/Down) are all built into the browser's own
      // handling of <input type="range">, rather than reimplemented by
      // hand on a plain div.
      if (seekEl) {
        seekEl.addEventListener('pointerdown', () => {
          isDragging = true;
          console.log('[SEEK DEBUG] pointerdown on seek bar — currentTime before any seek=', audio.currentTime);
        });

        // Fires continuously while dragging (and once per keypress/click) —
        // seek live so the audio actually jumps as the user drags, not just
        // after they let go.
        seekEl.addEventListener('input', () => {
          const t = parseFloat(seekEl.value);
          const before = audio.currentTime;
          if (Number.isFinite(t)) {
            audio.currentTime = t;
            const after = audio.currentTime;
            console.log(
              '[SEEK DEBUG] input event — slider target=', t,
              '| audio.currentTime before assignment=', before,
              '| audio.currentTime immediately after assignment=', after
            );
            if (elapsedEl) elapsedEl.textContent = formatPlaybackTime(t);
          } else {
            console.log('[SEEK DEBUG] input event — slider value did not parse as a finite number:', seekEl.value);
          }
        });

        // Fires once the user releases the handle (mouseup/touchend) or
        // finishes a keyboard adjustment — safe to let "timeupdate" drive
        // the slider again from here.
        seekEl.addEventListener('change', () => {
          isDragging = false;
          console.log('[SEEK DEBUG] change event (handle released) — final currentTime=', audio.currentTime, '| paused=', audio.paused);
        });
      }
    });
  }

  // --- Mantra tab: unlock codes -----------------------------------------
  //
  // Every PAID mantra (MANTRA_CATALOG[key].locked === true) starts locked
  // on a fresh device. Entering its exact unlock code reveals the player
  // and remembers the unlock permanently on that device (localStorage) —
  // each code only ever unlocks its own specific mantra.

  function loadUnlockedMantras() {
    try {
      const raw = localStorage.getItem(UNLOCKED_MANTRAS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      console.error('Could not read unlocked mantras:', e);
      return {};
    }
  }

  function saveUnlockedMantras(unlocked) {
    try {
      localStorage.setItem(UNLOCKED_MANTRAS_KEY, JSON.stringify(unlocked));
    } catch (e) {
      console.error('Could not save unlocked mantras:', e);
    }
  }

  function isMantraUnlocked(key, catalogEntry) {
    if (!catalogEntry || !catalogEntry.locked) return true; // free mantras are always "unlocked"
    return !!loadUnlockedMantras()[key];
  }

  function showMantraUnlockedView(item) {
    const lockedView = item.querySelector('.mantra-locked-view');
    const playerView = item.querySelector('.mantra-player-view');
    if (lockedView) lockedView.setAttribute('hidden', '');
    if (playerView) playerView.removeAttribute('hidden');
  }

  function bindMantraUnlocks() {
    if (typeof MANTRA_CATALOG === 'undefined') return;
    const items = document.querySelectorAll('.mantra-item[data-mantra-key]');

    items.forEach((item) => {
      const key = item.dataset.mantraKey;
      const catalogEntry = MANTRA_CATALOG[key];
      if (!catalogEntry) return;

      // Purchase link — each mantra points at its own specific purchase URL.
      const purchaseBtn = item.querySelector('.mantra-purchase-btn');
      if (purchaseBtn && catalogEntry.purchaseUrl) {
        purchaseBtn.href = catalogEntry.purchaseUrl;
      }

      // Free (or already-unlocked) mantras: skip straight to the player —
      // there may be no locked view in the markup at all for free mantras.
      if (isMantraUnlocked(key, catalogEntry)) {
        showMantraUnlockedView(item);
        return;
      }

      const codeInput = item.querySelector('.mantra-unlock-input');
      const unlockBtn = item.querySelector('.mantra-unlock-btn');
      const errorEl = item.querySelector('.mantra-unlock-error');
      if (!codeInput || !unlockBtn) return;

      function attemptUnlock() {
        const entered = (codeInput.value || '').trim();
        if (!entered) return;
        if (catalogEntry.code && entered.toUpperCase() === catalogEntry.code.toUpperCase()) {
          const unlocked = loadUnlockedMantras();
          unlocked[key] = true;
          saveUnlockedMantras(unlocked);
          if (errorEl) errorEl.setAttribute('hidden', '');
          showMantraUnlockedView(item);
        } else {
          if (errorEl) errorEl.removeAttribute('hidden');
        }
      }

      unlockBtn.addEventListener('click', attemptUnlock);
      codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          attemptUnlock();
        }
      });
      // Typing again after a wrong attempt clears the error instead of
      // leaving it stuck up once the person starts correcting themselves.
      codeInput.addEventListener('input', () => {
        if (errorEl && !errorEl.hasAttribute('hidden')) errorEl.setAttribute('hidden', '');
      });
    });
  }

  // --- Learn tab: accordion sections --------------------------------------
  //
  // Every `.accordion-item` is fully self-contained (its own header button
  // and content panel), the same generic pattern as the Mantra tab's
  // players — adding, removing, or reordering sections in index.html needs
  // no JS changes. Only one section is expected open at a time, so opening
  // one quietly closes whichever other one was open.

  function bindAccordions() {
    const items = document.querySelectorAll('.accordion-item');
    items.forEach((item) => {
      const header = item.querySelector('.accordion-header');
      if (!header) return;
      header.addEventListener('click', () => {
        const alreadyExpanded = item.classList.contains('expanded');
        items.forEach((other) => {
          other.classList.remove('expanded');
          const otherHeader = other.querySelector('.accordion-header');
          if (otherHeader) otherHeader.setAttribute('aria-expanded', 'false');
        });
        if (!alreadyExpanded) {
          item.classList.add('expanded');
          header.setAttribute('aria-expanded', 'true');

          // Whatever section was open before (long or short, or none)
          // finishes collapsing on the same 0.25s transition as this one
          // expanding — waiting the full transition out before scrolling is
          // what makes the newly-opened title land at the top of the
          // viewport every time, rather than wherever it happened to land
          // mid-animation.
          window.setTimeout(() => {
            header.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 260);
        }
      });
    });
  }

  // --- Chakra Assessment quiz ---------------------------------------------
  //
  // A one-time-per-take, multi-page yes/no quiz (content lives in
  // js/chakra-quiz-data.js). Every completed attempt is saved to a growing
  // history list (Quiz 1, Quiz 2, ...); the Today tab always shows whichever
  // saved result is most recent, and deleting a result from the Practice
  // tab's Assessment History re-derives "most recent" from what's left —
  // including falling back to the original "take the quiz" button once
  // nothing is left at all.

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
  }

  function loadChakraQuizHistory() {
    try {
      const raw = localStorage.getItem(CHAKRA_QUIZ_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Could not read Chakra Assessment history:', e);
      return [];
    }
  }

  function saveChakraQuizHistory(history) {
    try {
      localStorage.setItem(CHAKRA_QUIZ_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Could not save Chakra Assessment history:', e);
    }
  }

  function nextChakraQuizNumber() {
    try {
      const raw = localStorage.getItem(CHAKRA_QUIZ_COUNTER_KEY);
      const n = raw ? parseInt(raw, 10) : 0;
      return (Number.isFinite(n) ? n : 0) + 1;
    } catch (e) {
      console.error('Could not read Chakra Assessment counter:', e);
      return 1;
    }
  }

  function saveChakraQuizCounter(number) {
    try {
      localStorage.setItem(CHAKRA_QUIZ_COUNTER_KEY, String(number));
    } catch (e) {
      console.error('Could not save Chakra Assessment counter:', e);
    }
  }

  function loadChakraQuizHidePref() {
    try {
      return localStorage.getItem(CHAKRA_QUIZ_HIDE_KEY) === 'true';
    } catch (e) {
      console.error('Could not read Chakra Assessment hide preference:', e);
      return false;
    }
  }

  function saveChakraQuizHidePref(hidden) {
    try {
      localStorage.setItem(CHAKRA_QUIZ_HIDE_KEY, hidden ? 'true' : 'false');
    } catch (e) {
      console.error('Could not save Chakra Assessment hide preference:', e);
    }
  }

  // Whichever saved result has the highest quiz number — i.e. the most
  // recently completed attempt still present in history (deleted ones are
  // simply no longer candidates).
  function getMostRecentQuizResult() {
    const history = loadChakraQuizHistory();
    if (!history.length) return null;
    return history.reduce((best, entry) => (entry.quizNumber > best.quizNumber ? entry : best), history[0]);
  }

  // --- Today tab: entry point / summary / hide-show -----------------------

  function renderChakraQuizSummary() {
    const history = loadChakraQuizHistory();

    if (!history.length) {
      els.chakraQuizButtonRow.removeAttribute('hidden');
      els.chakraQuizSummaryRow.setAttribute('hidden', '');
      els.chakraQuizShowRow.setAttribute('hidden', '');
      if (els.chakraQuizDeleteBtn) els.chakraQuizDeleteBtn.setAttribute('hidden', '');
      return;
    }

    els.chakraQuizButtonRow.setAttribute('hidden', '');
    // The delete icon lives outside the visible/hidden-state rows below and
    // stays visible in BOTH of them — it's only ever hidden when there's no
    // saved result at all (the branch above).
    if (els.chakraQuizDeleteBtn) els.chakraQuizDeleteBtn.removeAttribute('hidden');

    const mostRecent = getMostRecentQuizResult();
    const hidden = loadChakraQuizHidePref();

    if (hidden) {
      els.chakraQuizSummaryRow.setAttribute('hidden', '');
      els.chakraQuizShowRow.removeAttribute('hidden');
      return;
    }

    els.chakraQuizShowRow.setAttribute('hidden', '');
    els.chakraQuizSummaryRow.removeAttribute('hidden');
    els.chakraQuizSummaryText.textContent = chakraQuizSummaryTextFor(mostRecent);
  }

  // Shared between the Today-tab summary and the Assessment History. Every
  // mode except 'none' carries real `entry.chakras` (including 'gatedYes',
  // where Vasudeva/Narayana are named, and 'gatedNo', where Gayatri is the
  // default) — only 'none' falls through to the generic message below.
  function chakraQuizSummaryTextFor(entry) {
    if (entry.chakras && entry.chakras.length) {
      const parts = entry.chakras.map((c) => {
        const chakraLabel = CHAKRA_KEY_DISPLAY[c.chakraKey] || c.chakraKey;
        return `${c.mantraName} — Chakra ${chakraLabel}`;
      });
      const label = parts.length > 1 ? 'Your Mantras' : 'Your Mantra';
      return `${label}: ${parts.join('; ')}`;
    }
    return 'No clear recommendation from your last quiz — consider retaking it.';
  }

  // --- Quiz overlay: disclaimer -> pages -> results ------------------------

  function openChakraQuiz() {
    quizAnswers = {};
    quizPurificationAnswer = null;
    quizCurrentPageIndex = 0;
    currentQuizResultEntryId = null;
    els.quizDisclaimerText.textContent = pcT('quizDisclaimer');
    els.quizDisclaimerCheckbox.checked = false;
    els.quizBeginBtn.disabled = true;
    els.quizDisclaimerView.removeAttribute('hidden');
    els.quizPageView.setAttribute('hidden', '');
    els.quizResultsView.setAttribute('hidden', '');
    els.chakraQuizOverlay.removeAttribute('hidden');
  }

  function closeChakraQuiz() {
    els.chakraQuizOverlay.setAttribute('hidden', '');
  }

  function beginChakraQuizPages() {
    if (!els.quizDisclaimerCheckbox.checked) return;
    quizCurrentPageIndex = 0;
    quizAnswers = {};
    quizPurificationAnswer = null;
    els.quizDisclaimerView.setAttribute('hidden', '');
    els.quizPageView.removeAttribute('hidden');
    renderQuizPage();
  }

  // Wraps whole-word, case-insensitive matches of each word in `words`
  // inside the given (already HTML-escaped) text with a <strong> tag, so a
  // question can call out a key word (e.g. Chakra 4's "touch") without any
  // extra visual noise elsewhere. A no-op if the word isn't present.
  function emphasizeWords(escapedText, words) {
    if (!words || !words.length) return escapedText;
    let out = escapedText;
    words.forEach((w) => {
      const re = new RegExp('\\b(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b', 'gi');
      out = out.replace(re, '<strong class="quiz-question-emphasis">$1</strong>');
    });
    return out;
  }

  // `questions` here are already normalized (see normalizePageQuestions) —
  // each carries its own `pageKey` (which chakra it scores toward) and
  // `scoreIndex` (its position within THAT chakra's own full question
  // array). For an ordinary single-chakra page these are just the page's
  // own key and array position; the short adaptive quiz's mixed page 6 is
  // the only place they ever differ per-question (see
  // chakra-quiz-data.js). `quizAnswersRef` is the raw `quizAnswers` store
  // keyed by pageKey, so a saved answer is looked up as
  // `quizAnswersRef[q.pageKey][q.scoreIndex]`.
  function renderQuestionsHtml(questions, quizAnswersRef) {
    return questions
      .map((q) => {
        const saved = (quizAnswersRef[q.pageKey] || {})[q.scoreIndex];
        const name = `quiz-${q.pageKey}-${q.scoreIndex}`;
        const qId = q.pageKey + '_q' + q.scoreIndex;
        const questionTextHtml = emphasizeWords(escapeHtml(pcT('quiz_' + qId)), q.emphasize);
        // Soma's Chilla-count question is the one place with three answer
        // options instead of a plain Yes/No pair (see chakra-quiz-data.js —
        // No / Yes, 3 Chillas / Yes, more than 3 Chillas). Its saved value
        // is a raw string ('no'/'yes3'/'yesmore'), not 'yes'/'no'.
        if (q.tripleOptions) {
          const optionsHtml = q.tripleOptions
            .map((opt, optIdx) => {
              const checked = saved === opt.value ? 'checked' : '';
              const optLabel = pcT('quiz_' + qId + '_opt' + optIdx);
              return `<label class="quiz-question-option"><input type="radio" name="${name}" value="${escapeHtml(opt.value)}" ${checked}> ${escapeHtml(optLabel)}</label>`;
            })
            .join('');
          return (
            `<div class="quiz-question">` +
            `<p class="quiz-question-text">${questionTextHtml}</p>` +
            `<div class="quiz-question-options quiz-question-options-triple">${optionsHtml}</div>` +
            `</div>`
          );
        }
        const yesChecked = saved === 'yes' ? 'checked' : '';
        const noChecked = saved === 'no' ? 'checked' : '';
        return (
          `<div class="quiz-question">` +
          `<p class="quiz-question-text">${questionTextHtml}</p>` +
          `<div class="quiz-question-options">` +
          `<label class="quiz-question-option"><input type="radio" name="${name}" value="yes" ${yesChecked}> ${escapeHtml(pcT('yesBtn'))}</label>` +
          `<label class="quiz-question-option"><input type="radio" name="${name}" value="no" ${noChecked}> ${escapeHtml(pcT('noBtn'))}</label>` +
          `</div></div>`
        );
      })
      .join('');
  }

  // Fills in `pageKey`/`scoreIndex` defaults (this page's own key / array
  // position) for a page whose questions don't already specify them —
  // i.e. every ordinary full-length page. The short adaptive quiz's pages
  // (see chakra-quiz-data.js) already carry both explicitly.
  function normalizePageQuestions(page) {
    return page.questions.map((q, idx) => ({
      ...q,
      pageKey: q.pageKey || page.key,
      scoreIndex: typeof q.scoreIndex === 'number' ? q.scoreIndex : idx,
    }));
  }

  // Tier 1 (root/sacral/solarplexus/heart) are always pages 1-4 and always
  // full-length. From page 5 onward, the ADAPTIVE QUIZ decides live: if any
  // Tier 1 chakra has already met its own threshold from the answers given
  // so far, the rest of the quiz shortens to the 2-page short version
  // (Chakra 5 with 2 questions, then "Chakras 6 & 7" with 2 questions) and
  // skips Hrit/Soma entirely — otherwise the full 9-page version continues
  // unchanged. This is re-evaluated every time it's needed (not decided
  // once and frozen), so going Back into Tier 1 and changing an answer
  // correctly changes which path plays out next. Nothing here or in the UI
  // ever tells the user this switch happened — it should feel like one
  // seamless quiz either way.
  function getActiveQuizPages() {
    if (anyTier1ThresholdMet()) {
      // Pages 0-3 (root/sacral/solarplexus/heart) are the exact same first
      // four entries either way — only what comes after page 4 differs —
      // so this can safely be re-evaluated at any point in the quiz,
      // including partway through Tier 1 itself, with no discontinuity.
      return PC_CHAKRA_QUIZ_PAGES.slice(0, 4).concat([PC_CHAKRA_QUIZ_SHORT_PAGE_5, PC_CHAKRA_QUIZ_SHORT_PAGE_6]);
    }
    return PC_CHAKRA_QUIZ_PAGES;
  }

  function anyTier1ThresholdMet() {
    const { scores } = computeChakraQuizScores();
    const tier1Keys = Object.keys(CHAKRA_SCORING_META).filter((k) => CHAKRA_SCORING_META[k].tier === 1);
    return tier1Keys.some((k) => (scores[k] || 0) >= CHAKRA_SCORING_META[k].threshold);
  }

  function renderQuizPage() {
    const pages = getActiveQuizPages();
    const page = pages[quizCurrentPageIndex];
    els.quizPageProgress.textContent = pcT('pageXOfY', { current: quizCurrentPageIndex + 1, total: pages.length });
    // Chakra name/number only while taking the quiz — the mantra name is
    // never shown until the results page.
    els.quizPageLabel.textContent = page.quizLabel || page.label;
    els.quizValidationError.setAttribute('hidden', '');

    const normQuestions = normalizePageQuestions(page);
    let html = '';
    // Soma's page carries the upfront purification gate — worth zero
    // points, read separately from this page's own questions (see
    // computeChakraQuizRecommendation).
    if (page.hasPurificationGate) {
      const yesChecked = quizPurificationAnswer === 'yes' ? 'checked' : '';
      const noChecked = quizPurificationAnswer === 'no' ? 'checked' : '';
      // Note: `page.purificationQuestionNote` (the "this question is not
      // scored..." explanation) is intentionally never rendered here — the
      // user should not see any indication that this question is unscored.
      // The field itself stays in chakra-quiz-data.js purely as an internal
      // comment for future maintainers.
      html +=
        `<div class="quiz-page-purification">` +
        `<p class="quiz-question-text">${escapeHtml(pcT('quiz_' + page.key + '_purification'))}</p>` +
        `<div class="quiz-question-options">` +
        `<label class="quiz-question-option"><input type="radio" name="quizPurification" value="yes" ${yesChecked}> ${escapeHtml(pcT('yesBtn'))}</label>` +
        `<label class="quiz-question-option"><input type="radio" name="quizPurification" value="no" ${noChecked}> ${escapeHtml(pcT('noBtn'))}</label>` +
        `</div>` +
        `</div>`;
    }
    html += renderQuestionsHtml(normQuestions, quizAnswers);
    els.quizQuestionsContainer.innerHTML = html;

    els.quizBackBtn.toggleAttribute('hidden', quizCurrentPageIndex === 0);
    const isLast = quizCurrentPageIndex === pages.length - 1;
    els.quizNextBtn.textContent = isLast ? pcT('seeMyResultsBtn') : pcT('nextBtn');
  }

  function goToPrevQuizPage() {
    if (quizCurrentPageIndex === 0) return;
    quizCurrentPageIndex--;
    renderQuizPage();
  }

  // Returns `{ answersByPageKey, allAnswered }` where `answersByPageKey` is
  // `{ [chakraKey]: { [scoreIndex]: 'yes'|'no' } }` — for an ordinary
  // single-chakra page this has exactly one key (that page's own), but the
  // short adaptive quiz's mixed page 6 produces two, one per chakra, which
  // the caller merges into `quizAnswers` separately (see
  // goToNextQuizPageOrFinish).
  function collectQuestionAnswers(questions) {
    const answersByPageKey = {};
    let allAnswered = true;
    questions.forEach((q) => {
      const name = `quiz-${q.pageKey}-${q.scoreIndex}`;
      const checked = els.quizQuestionsContainer.querySelector(
        `input[name="${CSS.escape(name)}"]:checked`
      );
      if (!checked) {
        allAnswered = false;
        return;
      }
      if (!answersByPageKey[q.pageKey]) answersByPageKey[q.pageKey] = {};
      answersByPageKey[q.pageKey][q.scoreIndex] = checked.value;
    });
    return { answersByPageKey, allAnswered };
  }

  // Validates every question on the current page is answered before
  // advancing (or finishing on the last page) — scoring never shows the
  // user any points, it just silently records Yes/No per question. Soma's
  // page additionally requires the upfront purification question to be
  // answered.
  function goToNextQuizPageOrFinish() {
    const pages = getActiveQuizPages();
    const page = pages[quizCurrentPageIndex];
    const normQuestions = normalizePageQuestions(page);

    let purificationChecked = null;
    if (page.hasPurificationGate) {
      purificationChecked = els.quizQuestionsContainer.querySelector('input[name="quizPurification"]:checked');
    }

    const { answersByPageKey, allAnswered } = collectQuestionAnswers(normQuestions);
    const purificationOk = !page.hasPurificationGate || !!purificationChecked;

    if (!allAnswered || !purificationOk) {
      els.quizValidationError.removeAttribute('hidden');
      return;
    }

    // Merge rather than overwrite — a mixed page (short quiz's page 6)
    // contributes to two different chakras' answer buckets at once, and
    // this must not clobber anything already recorded for either.
    Object.keys(answersByPageKey).forEach((pageKey) => {
      quizAnswers[pageKey] = { ...(quizAnswers[pageKey] || {}), ...answersByPageKey[pageKey] };
    });
    if (page.hasPurificationGate) {
      quizPurificationAnswer = purificationChecked.value;
    }

    // Re-fetch the active page list AFTER merging this page's answers —
    // finishing page 4 (Heart) is exactly the moment the adaptive decision
    // for pages 5+ is made, and getActiveQuizPages reads quizAnswers live.
    const pagesAfter = getActiveQuizPages();
    if (quizCurrentPageIndex < pagesAfter.length - 1) {
      quizCurrentPageIndex++;
      renderQuizPage();
    } else {
      finishChakraQuiz();
    }
  }

  // Raw point scoring: every "Yes" is worth 1 point toward that page's
  // chakra by default, except where a question carries its own explicit
  // `points` override (see PC_CHAKRA_QUIZ_PAGES in chakra-quiz-data.js) —
  // Chakra 3 (Solar Plexus) uses a page-level override via
  // CHAKRA_SCORING_META.pointsPerYes (2 per Yes, applied uniformly), while
  // Chakra 1, Chakra 2, Chakra 4, Soma, and Crown/7th each use a
  // per-question override on just one or two of their questions (see the
  // comment on each in PC_CHAKRA_QUIZ_PAGES for which). These are never
  // percentages — the Tier 1/2 engine below depends on the literal point
  // totals (each Tier 1 chakra's own qualifying threshold lives on
  // CHAKRA_SCORING_META). A question marked `gate: true` (Soma's and
  // Crown's third question, "I have completed at least N previous
  // Chillas") is NEVER added to the score — its Yes/No is only read as that
  // chakra's pass/fail gate, returned here as `gatesPassed`. The separate
  // upfront purification Yes/No question on Soma's page is a different gate
  // again, and is intentionally never read here either — it's read
  // separately, as `quizPurificationAnswer`, by
  // computeChakraQuizRecommendation.
  function computeChakraQuizScores() {
    const scores = {};
    const gatesPassed = {};
    PC_CHAKRA_QUIZ_PAGES.forEach((page) => {
      const meta = CHAKRA_SCORING_META[page.key] || { pointsPerYes: 1 };
      const answers = quizAnswers[page.key] || {};
      let total = 0;
      let allGatesOk = true;
      page.questions.forEach((q, idx) => {
        const isYes = answers[idx] === 'yes';
        if (q.gate) {
          if (!isYes) allGatesOk = false;
          return;
        }
        const pointsPerYes = typeof q.points === 'number' ? q.points : meta.pointsPerYes;
        if (isYes) total += pointsPerYes;
      });
      scores[page.key] = total;
      gatesPassed[page.key] = allGatesOk;
    });
    return { scores, gatesPassed };
  }

  // Tier 1 = Root, Sacral, Solar Plexus, Heart — unchanged from before.
  // Tier 2 = Hrit, Ekongkara/Throat, Gayatri/Third Eye, Soma, Crown/7th, but
  // these five no longer just compete openly on raw score. They now form a
  // SEQUENTIAL LADDER: Hrit -> Chakra 5 -> Chakra 6 -> Soma -> Crown/7th.
  // Each rung is only ever evaluated once the rung below it explicitly
  // unlocks it; a rung that's never unlocked is never considered at all.
  // Falling off the ladder at any of the first three rungs (that rung's own
  // score doesn't qualify) drops back to the OLD "everyone still eligible
  // competes on raw score, ties go to the lower/earlier chakra" comparison —
  // but only among the chakras reached so far, never chakras further up
  // that were never unlocked. Full rules are documented in
  // chakra-quiz-data.js next to CHAKRA_SCORING_META and PC_CHAKRA_QUIZ_PAGES.
  // Returns:
  //   { mode: 'tier1', chakraKeys: [...] } — one or more Tier 1 chakras,
  //                                          highest score first.
  //   { mode: 'tier2', chakraKeys: [key] } — Hrit, Ekongkara, or Gayatri,
  //                                          reached via the ladder or the
  //                                          score/tie fallback.
  //   { mode: 'gatedYes', chakraKeys: [key] } — Soma or Crown/7th — the ONLY
  //     case where Vasudeva/Narayana are ever named. Shown as an ordinary
  //     recommendation (store link included — no purchase lock) plus the
  //     "potential readiness" caution message.
  //   { mode: 'none' }                     — nothing scored anywhere.
  // ('gatedNo' no longer fires — see computeTier2LadderRecommendation.)
  function computeChakraQuizRecommendation(scores, gatesPassed, purificationAnswer) {
    const tier1Keys = Object.keys(CHAKRA_SCORING_META).filter(
      (k) => CHAKRA_SCORING_META[k].tier === 1
    );
    const tier1Qualifiers = tier1Keys
      .filter((k) => (scores[k] || 0) >= CHAKRA_SCORING_META[k].threshold)
      .map((k) => ({ key: k, score: scores[k] || 0, order: CHAKRA_SCORING_META[k].order }));

    if (tier1Qualifiers.length > 0) {
      return { mode: 'tier1', chakraKeys: orderTier1QuizWinners(tier1Qualifiers) };
    }

    // All Tier 1 <= 1 — move to the Tier 2 ladder.
    return computeTier2LadderRecommendation(scores, gatesPassed, purificationAnswer);
  }

  // A Tier 2 chakra "qualifies" for its own ladder rung at a raw score of 3
  // or 4 — i.e. 3 or 4 "Yes" answers out of that chakra's 4 questions. Only
  // ever applied to Hrit, Chakra 5 (Ekongkara), and Chakra 6 (Gayatri) —
  // Soma and Crown/7th have their own real-world prerequisite gates instead
  // (see tier2ChakraEligibleForFallback and computeTier2LadderRecommendation
  // below).
  const TIER2_LADDER_QUALIFY_THRESHOLD = 3;

  // Reads one specific saved answer directly (needed for ladder branching on
  // a *particular* question, not just a chakra's aggregate score).
  function quizAnswerIsYes(chakraKey, questionIndex) {
    const answers = quizAnswers[chakraKey] || {};
    return answers[questionIndex] === 'yes';
  }

  // The sequential ladder itself: Hrit -> Chakra 5 -> Chakra 6 -> Soma ->
  // Crown/7th. Each step's rules:
  //   Hrit: qualifies (score >= 3) AND Q3 Yes -> recommend Hrit.
  //         qualifies AND Q3 No -> Chakra 5 is unlocked (next step).
  //         doesn't qualify -> score/tie fallback among ALL FIVE Tier 2
  //         chakras (Soma/Crown only counted if their own gate is met).
  //   Chakra 5 (only reached if Hrit unlocked it): qualifies AND Q3 Yes ->
  //         recommend Chakra 5. qualifies AND Q3 No -> Chakra 6 unlocked.
  //         doesn't qualify -> score/tie fallback among {Hrit, Chakra 5}.
  //   Chakra 6 (only reached if Chakra 5 unlocked it): qualifies AND Q3 No ->
  //         recommend Chakra 6 outright (ladder arrival takes priority over
  //         score-based tie-breaking with Hrit/Chakra 5). qualifies AND all
  //         4 questions Yes -> Soma unlocked. doesn't qualify (or qualifies
  //         but lands on neither of those two conditions) -> score/tie
  //         fallback among {Hrit, Chakra 5, Chakra 6}.
  //   Soma (only reached if Chakra 6 unlocked it): qualifies only when the
  //         purification-retreat question is Yes AND both scored questions
  //         (1-2) are Yes AND the Chilla-count question is NOT "No". If it
  //         doesn't qualify, recommend Chakra 6 directly (no further
  //         fallback/tie-break at this level). If it qualifies and the
  //         Chilla-count answer is "3 Chillas" -> recommend Soma. If it's
  //         "more than 3 Chillas" -> Crown/7th unlocked.
  //   Crown/7th (only reached if Soma unlocked it): every question,
  //         including the 6-Chilla gate, must be Yes -> recommend Crown/7th.
  //         Any No -> recommend Soma instead (Soma already qualified to
  //         reach this point).
  function computeTier2LadderRecommendation(scores, gatesPassed, purificationAnswer) {
    const hritQualifies = (scores.hrit || 0) >= TIER2_LADDER_QUALIFY_THRESHOLD;
    if (!hritQualifies) {
      return normalTier2Fallback(['hrit', 'throat', 'thirdeye', 'soma', 'crown'], scores, purificationAnswer);
    }
    if (quizAnswerIsYes('hrit', 2)) {
      return { mode: 'tier2', chakraKeys: ['hrit'], tierTieMessage: null };
    }

    // Hrit qualified but its Q3 was "No" — Chakra 5 (Ekongkara) unlocked.
    const throatQualifies = (scores.throat || 0) >= TIER2_LADDER_QUALIFY_THRESHOLD;
    if (!throatQualifies) {
      return normalTier2Fallback(['hrit', 'throat'], scores, purificationAnswer);
    }
    if (quizAnswerIsYes('throat', 2)) {
      return { mode: 'tier2', chakraKeys: ['throat'], tierTieMessage: null };
    }

    // Chakra 5 qualified but its Q3 was "No" — Chakra 6 (Gayatri) unlocked.
    const thirdeyeQualifies = (scores.thirdeye || 0) >= TIER2_LADDER_QUALIFY_THRESHOLD;
    if (!thirdeyeQualifies) {
      return normalTier2Fallback(['hrit', 'throat', 'thirdeye'], scores, purificationAnswer);
    }
    if (!quizAnswerIsYes('thirdeye', 2)) {
      // Ladder arrival at Chakra 6 takes priority over score-based
      // tie-breaking with Hrit/Chakra 5 — recommend it outright.
      return { mode: 'tier2', chakraKeys: ['thirdeye'], tierTieMessage: null };
    }
    const thirdeyeAllFourYes =
      quizAnswerIsYes('thirdeye', 0) &&
      quizAnswerIsYes('thirdeye', 1) &&
      quizAnswerIsYes('thirdeye', 2) &&
      quizAnswerIsYes('thirdeye', 3);
    if (!thirdeyeAllFourYes) {
      // Qualified, but landed on neither "stay" (Q3 No) nor "unlock Soma"
      // (all 4 Yes) — e.g. Q3 Yes with something else No.
      return normalTier2Fallback(['hrit', 'throat', 'thirdeye'], scores, purificationAnswer);
    }

    // Chakra 6 qualified with all four answers Yes — Soma unlocked.
    const somaChillas = (quizAnswers.soma || {})[2]; // 'no' | 'yes3' | 'yesmore'
    const somaQualifies =
      purificationAnswer === 'yes' &&
      quizAnswerIsYes('soma', 0) &&
      quizAnswerIsYes('soma', 1) &&
      !!somaChillas &&
      somaChillas !== 'no';
    if (!somaQualifies) {
      return { mode: 'tier2', chakraKeys: ['thirdeye'], tierTieMessage: null };
    }
    if (somaChillas === 'yes3') {
      return { mode: 'gatedYes', chakraKeys: ['soma'], tierTieMessage: null };
    }

    // somaChillas === 'yesmore' — Crown/7th unlocked.
    const crownAllYes = quizAnswerIsYes('crown', 0) && quizAnswerIsYes('crown', 1) && gatesPassed.crown !== false;
    if (crownAllYes) {
      return { mode: 'gatedYes', chakraKeys: ['crown'], tierTieMessage: null };
    }
    return { mode: 'gatedYes', chakraKeys: ['soma'], tierTieMessage: null };
  }

  // The OLD "everyone still eligible competes on raw score, ties go to the
  // lower/earlier chakra" comparison — now only ever invoked as a ladder
  // FALLBACK, and only among the specific chakras named by `keys` (never
  // the full Tier 2 set unless the ladder never got started at all, i.e.
  // Hrit itself didn't qualify).
  function normalTier2Fallback(keys, scores, purificationAnswer) {
    const candidates = keys
      .filter((k) => tier2ChakraEligibleForFallback(k, purificationAnswer))
      .map((k) => ({ key: k, score: scores[k] || 0, order: CHAKRA_SCORING_META[k].order }));

    const maxScore = candidates.length ? Math.max(...candidates.map((c) => c.score)) : 0;
    if (!candidates.length || maxScore <= 0) {
      return { mode: 'none', chakraKeys: [] };
    }

    const top = candidates.filter((c) => c.score === maxScore);
    const winner = top.reduce((lowest, c) => (c.order < lowest.order ? c : lowest), top[0]);

    // Additive tie messages — layered on top of the winner above, never
    // changing it. See PC_CHAKRA_TIER2_TIE_MESSAGES / the "TIER 2 TIE
    // ADD-ONS" section in chakra-quiz-data.js for exactly when each fires.
    const topKeys = top.map((c) => c.key);
    let tierTieMessage = null;
    if (topKeys.includes('hrit') && topKeys.includes('throat')) {
      tierTieMessage = pcT('tier2Tie_hritThroat');
    } else if (topKeys.includes('thirdeye') && topKeys.includes('soma') && topKeys.includes('crown')) {
      tierTieMessage = pcT('tier2Tie_gayatriHigher');
    }

    if (winner.key === 'soma' || winner.key === 'crown') {
      // Both are only ever candidates here once tier2ChakraEligibleForFallback
      // has already confirmed their own real-world gate (and, for Soma, the
      // purification question) passed — so this is always the "ready"
      // outcome, never a Gayatri-substitute message.
      return { mode: 'gatedYes', chakraKeys: [winner.key], tierTieMessage };
    }
    return { mode: 'tier2', chakraKeys: [winner.key], tierTieMessage };
  }

  // Whether Soma/Crown can even be considered as a candidate in the raw
  // score/tie FALLBACK comparison above — Hrit/Chakra 5/Chakra 6 have no
  // such gate and are always eligible.
  function tier2ChakraEligibleForFallback(key, purificationAnswer) {
    if (key === 'soma') {
      const chillas = (quizAnswers.soma || {})[2];
      return (
        purificationAnswer === 'yes' &&
        quizAnswerIsYes('soma', 0) &&
        quizAnswerIsYes('soma', 1) &&
        !!chillas &&
        chillas !== 'no'
      );
    }
    if (key === 'crown') {
      return quizAnswerIsYes('crown', 0) && quizAnswerIsYes('crown', 1) && quizAnswerIsYes('crown', 2);
    }
    return true;
  }

  // Every qualifying Tier 1 chakra is recommended (not just one), ordered
  // HIGHEST SCORE FIRST. Ties (at any score level, not just the top) always
  // go to the lowest-numbered chakra among those tied — there is no more
  // special-casing for Chakra 3 here (a Solar Plexus score of 4 still beats
  // a Root score of 3 outright since 4 > 3; it's only when scores are
  // EQUAL that chakra order breaks the tie).
  function orderTier1QuizWinners(qualifiers) {
    return [...qualifiers]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.order - b.order;
      })
      .map((q) => q.key);
  }

  // Builds the standard { chakraKey, chakraLabel, chakraNumberLabel,
  // chakraCommonName, mantraName, mantraTabKey, whySentence,
  // additionalMantras, sustainMessage } shape used everywhere a recommended
  // chakra is displayed or stored (results view, Today summary, Assessment
  // History). Soma and Crown are ordinary entries in PC_CHAKRA_QUIZ_PAGES
  // just like every other chakra now that they're separate pages.
  function buildChakraDetail(key) {
    const page = PC_CHAKRA_QUIZ_PAGES.find((p) => p.key === key);
    const mantraInfo =
      PC_CHAKRA_MANTRAS[key] ||
      { mantraName: '', mantraTabKey: null, whySentence: '', additionalMantras: [], sustainMessage: '' };
    return {
      chakraKey: key,
      chakraLabel: page ? page.label : key,
      chakraNumberLabel: page ? page.quizLabel : key,
      chakraCommonName: page ? page.chakraCommonName : '',
      mantraName: mantraInfo.mantraName,
      mantraTabKey: mantraInfo.mantraTabKey,
      // Localized in whatever language is active right now — the quiz
      // results view (and anything saved from it: history, email) is a
      // snapshot in the language the user completed the quiz in, same as
      // every other computed/rendered value in this app.
      whySentence: mantraInfo.whySentence ? pcT('quizMantra_' + key + '_whySentence') : '',
      additionalMantras: (mantraInfo.additionalMantras || []).map((_, i) => pcT('quizMantra_' + key + '_additionalMantras_' + i)),
      sustainMessage: mantraInfo.sustainMessage ? pcT('quizMantra_' + key + '_sustainMessage') : '',
    };
  }

  // The full "recommendation block" markup, laid out exactly as specified:
  //   Header: "Chakra [number] — [Sanskrit name] — [Mantra name] — available
  //     in app" all on one line. This is a real availability claim, not
  //     positional — every chakra this function is ever called for (root
  //     through thirdeye) genuinely has a Mantra-tab player.
  //   Brief why sentence below the header.
  //   A "Mantras for this chakra:" list — first item is this same mantra,
  //     bold/larger, reading "[name] (available in app)"; every additional
  //     mantra reads "[name] (available on website)" with a clickable link
  //     to the store.
  //   Sustain message.
  //   The Tier 2 tie note ("Your scores suggest...") when one applies to
  //     this recommendation — see computeChakraQuizRecommendation.
  // (The Consultation CTA and the store link are single shared elements
  // rendered once at the bottom of the whole results page — see
  // renderChakraQuizResultsView.)
  function buildRecommendationBlockHtml(c, tieMessageHtml) {
    const availableInApp = pcT('quizAvailableInApp');
    const availableOnWebsite = pcT('quizAvailableOnWebsite');
    const headerLine = pcT('chakraResultHeaderLine', {
      chakraNumberLabel: c.chakraNumberLabel,
      chakraCommonName: c.chakraCommonName,
      mantraName: c.mantraName,
      availability: availableInApp,
    });
    const additionalItemsHtml = (c.additionalMantras || [])
      .map(
        (n) =>
          `<li>${escapeHtml(n)} <a href="${PC_CHAKRA_STORE_URL}" target="_blank" rel="noopener">(${escapeHtml(availableOnWebsite)})</a></li>`
      )
      .join('');
    const whyHtml = c.whySentence
      ? `<p class="quiz-result-why">${escapeHtml(c.whySentence)}</p>`
      : '';
    const tieNoteHtml = tieMessageHtml
      ? `<div class="quiz-result-tie-note"><p>${tieMessageHtml}</p></div>`
      : '';
    const sustainHtml = c.sustainMessage
      ? `<p class="quiz-result-encouragement">${escapeHtml(c.sustainMessage)}</p>`
      : '';
    return (
      `<p class="quiz-result-primary">${escapeHtml(headerLine)}</p>` +
      whyHtml +
      `<div class="quiz-result-additional">` +
      `<p class="quiz-result-additional-label">${escapeHtml(pcT('quizMantrasForChakra'))}</p>` +
      `<ul class="quiz-result-additional-list">` +
      `<li class="quiz-result-mantra-primary">${escapeHtml(c.mantraName)} (${escapeHtml(availableInApp)})</li>` +
      additionalItemsHtml +
      `</ul>` +
      `</div>` +
      sustainHtml +
      tieNoteHtml
    );
  }

  function finishChakraQuiz() {
    const { scores, gatesPassed } = computeChakraQuizScores();
    const rec = computeChakraQuizRecommendation(scores, gatesPassed, quizPurificationAnswer);
    const number = nextChakraQuizNumber();

    const chakras = rec.chakraKeys.map(buildChakraDetail);

    const entry = {
      id: 'quiz-' + number,
      quizNumber: number,
      dateIso: deviceTodayIso(),
      mode: rec.mode, // 'tier1' | 'tier2' | 'gatedYes' | 'gatedNo' | 'none'
      chakras, // [] only for 'none'
      purificationAnswer: quizPurificationAnswer, // 'yes' | 'no' | null — audit trail only
      tierTieMessage: rec.tierTieMessage || null,
      scores,
      answers: JSON.parse(JSON.stringify(quizAnswers)), // raw yes/no per question, for "Review my answers"
    };

    const history = loadChakraQuizHistory();
    history.push(entry);
    saveChakraQuizHistory(history);
    saveChakraQuizCounter(number);
    // A freshly-taken quiz always surfaces on the Today tab immediately,
    // overriding any earlier "Hide" choice from a previous result.
    saveChakraQuizHidePref(false);

    currentQuizResultEntryId = entry.id;
    renderChakraQuizResultsView(entry);
    els.quizPageView.setAttribute('hidden', '');
    els.quizResultsView.removeAttribute('hidden');

    renderChakraQuizSummary();
    renderAssessmentHistory();
  }

  // Primary/Secondary labeling only applies when there's more than one
  // recommended chakra (only possible for Tier 1 — every Tier 2 outcome,
  // including the gated ones, has a single winner) — the first entry in
  // `entry.chakras` is always the highest/most-relevant per
  // orderTier1QuizWinners.
  // Share button on the quiz results view — "I just took the Chakra
  // Assessment ... and was recommended {mantra} for {chakra}." Uses the
  // primary/first recommendation only, same as the email-results template.
  function shareQuizResult() {
    if (!currentResultsEntry) return;
    const c = (currentResultsEntry.chakras || [])[0];
    if (!c) return;
    const text = pcT('shareQuizMessage', {
      mantra: c.mantraName,
      chakra: c.chakraCommonName,
      link: APP_SHARE_URL,
    });
    pcShareCardImage(
      'quiz',
      {
        title: pcT('shareCardChakraAssessmentLabel'),
        chakraLine: [c.chakraNumberLabel, c.chakraCommonName].filter(Boolean).join(' — '),
        mantraLabel: pcT('shareCardMantraLabel'),
        mantraName: c.mantraName,
        taglineLine1: pcT('pranaCalendarSubtitleLine1'),
        taglineLine2: pcT('pranaCalendarSubtitleLine2'),
      },
      text,
      els.shareQuizCopiedNote,
      'prana-calendar-chakra-assessment.png'
    );
  }

  function renderTierTieNoteHtml(message) {
    if (!message) return '';
    const escaped = escapeHtml(message);
    const mailtoHtml = `<a href="mailto:${PC_CHAKRA_CONTACT_EMAIL}">${PC_CHAKRA_CONTACT_EMAIL}</a>`;
    return escaped.split(PC_CHAKRA_CONTACT_EMAIL).join(mailtoHtml);
  }

  function renderChakraQuizResultsView(entry) {
    currentResultsEntry = entry;
    els.quizResultRecommendations.innerHTML = '';
    els.quizResultReadyBlock.setAttribute('hidden', '');
    els.quizResultNoneBlock.setAttribute('hidden', '');
    els.quizResultStoreBtn.setAttribute('hidden', '');
    els.quizFooterDisclaimer.textContent = pcT('quizDisclaimer');
    if (els.quizConsultationCta) els.quizConsultationCta.textContent = pcT('quizConsultationCta');
    // A stale open review panel from a previously-viewed entry must never
    // carry over onto a newly-rendered one.
    if (els.quizAnswersReview) {
      els.quizAnswersReview.setAttribute('hidden', '');
      els.quizAnswersReview.innerHTML = '';
      delete els.quizAnswersReview.dataset.populated;
    }
    if (els.quizReviewAnswersBtn) els.quizReviewAnswersBtn.textContent = pcT('reviewAnswersBtn');
    if (els.emailResultsInput) els.emailResultsInput.value = '';
    if (els.emailResultsStatus) {
      els.emailResultsStatus.textContent = '';
      els.emailResultsStatus.className = 'email-results-status';
      els.emailResultsStatus.setAttribute('hidden', '');
    }

    // The tie note is rendered inline inside the relevant recommendation
    // block itself (after the sustain message — see
    // buildRecommendationBlockHtml), not as a separate page-level element,
    // so #quizResultTieNote stays hidden/unused here.
    if (els.quizResultTieNote) els.quizResultTieNote.setAttribute('hidden', '');
    if (els.quizResultTieNoteText) els.quizResultTieNoteText.innerHTML = '';
    const tieMessageHtml = entry.tierTieMessage ? renderTierTieNoteHtml(entry.tierTieMessage) : '';

    if (entry.mode === 'tier1' || entry.mode === 'tier2') {
      const chakras = entry.chakras || [];
      const multi = chakras.length > 1;
      els.quizResultRecommendations.innerHTML = chakras
        .map((c, idx) => {
          const label = multi
            ? `<p class="quiz-recommendation-label">${idx === 0 ? 'Primary Recommendation' : 'Secondary Recommendation'}</p>`
            : '';
          // The tie note only ever applies to a single-winner Tier 2 result,
          // so attach it to the first/primary block only.
          const blockTieHtml = idx === 0 ? tieMessageHtml : '';
          return `<div class="quiz-recommendation-block">${label}${buildRecommendationBlockHtml(c, blockTieHtml)}</div>`;
        })
        .join('');
      els.quizResultStoreBtn.href = PC_CHAKRA_STORE_URL;
      els.quizResultStoreBtn.removeAttribute('hidden');
    } else if (entry.mode === 'gatedYes') {
      // Soma or Crown topped Tier 2 and the user confirmed a recent CI
      // purification — the ONLY case where Vasudeva/Narayana are ever named.
      // Soma/Crown are ordinary purchasable mantras now (no contact-code
      // purchase lock), so this renders exactly like a normal
      // recommendation block — same store link, same "available in app"
      // header — with the readiness/caution message shown alongside it
      // instead of the old "contact us for access" text.
      const c = (entry.chakras || [])[0];
      if (c) {
        els.quizResultRecommendations.innerHTML =
          `<div class="quiz-recommendation-block">${buildRecommendationBlockHtml(c, tieMessageHtml)}</div>`;
        els.quizResultStoreBtn.href = PC_CHAKRA_STORE_URL;
        els.quizResultStoreBtn.removeAttribute('hidden');
      }
      if (els.quizResultReadyText) {
        els.quizResultReadyText.innerHTML =
          'Your scores suggest potential readiness for this higher chakra mantra. We recommend spending ' +
          'significant time with the 6th chakra mantras first — Sri Shyamji created many for this reason, ' +
          'all available on our website. A consultation with the Chakra Institute may also be valuable. ' +
          `Contact us at <a href="mailto:${PC_CHAKRA_CONTACT_EMAIL}">${PC_CHAKRA_CONTACT_EMAIL}</a>.`;
      }
      els.quizResultReadyBlock.removeAttribute('hidden');
    } else if (entry.mode === 'gatedNo') {
      // Soma or Crown topped Tier 2 but there was no recent purification —
      // default to Gayatri, shown exactly like a normal Tier 2 win, plus
      // the retreat-invitation message underneath.
      const c = (entry.chakras || [])[0];
      if (c) {
        els.quizResultRecommendations.innerHTML =
          `<div class="quiz-recommendation-block">${buildRecommendationBlockHtml(c, tieMessageHtml)}</div>`;
        els.quizResultStoreBtn.href = PC_CHAKRA_STORE_URL;
        els.quizResultStoreBtn.removeAttribute('hidden');
      }
      if (els.quizResultReadyText) {
        const mailtoHtml = `<a href="mailto:${PC_CHAKRA_CONTACT_EMAIL}">${PC_CHAKRA_CONTACT_EMAIL}</a>`;
        els.quizResultReadyText.innerHTML = pcT('quizReadyMessage', { emailLink: mailtoHtml });
      }
      els.quizResultReadyBlock.removeAttribute('hidden');
    } else {
      els.quizResultNoneBlock.removeAttribute('hidden');
    }

    // Auto-shown newsletter signup — always shown regardless of outcome.
    showQuizNewsletterSection();
  }

  // Maps one saved raw answer to the { val, cls } shown in "Review my
  // answers" — a plain Yes/No badge for an ordinary question, or the actual
  // chosen option's own label for Soma's three-option Chilla-count question
  // (raw is 'no'/'yes3'/'yesmore' there, not 'yes'/'no').
  function reviewAnswerDisplay(q, raw, qId) {
    if (q.tripleOptions) {
      const optIdx = q.tripleOptions.findIndex((o) => o.value === raw);
      if (optIdx !== -1) return { val: pcT('quiz_' + qId + '_opt' + optIdx), cls: raw === 'no' ? 'no' : 'yes' };
      return { val: '—', cls: 'none' };
    }
    const val = raw === 'yes' ? pcT('yesBtn') : raw === 'no' ? pcT('noBtn') : '—';
    const cls = raw === 'yes' ? 'yes' : raw === 'no' ? 'no' : 'none';
    return { val, cls };
  }

  // Builds the "Review my answers" breakdown for a saved entry: every
  // question on every page, with a Yes/No badge for how it was actually
  // answered. Older entries saved before this feature existed won't have
  // `entry.answers`, so they get a graceful fallback message instead.
  function buildAnswersReviewHtml(entry) {
    if (!entry.answers) {
      return `<p class="quiz-review-unavailable">${escapeHtml(pcT('quizAnswerDetailUnavailable'))}</p>`;
    }
    return PC_CHAKRA_QUIZ_PAGES.map((page) => {
      const pageAnswers = entry.answers[page.key] || {};
      let sectionHtml = `<div class="quiz-review-page"><p class="quiz-review-page-label">${escapeHtml(page.quizLabel || page.label)}</p>`;
      if (page.hasPurificationGate) {
        const val = entry.purificationAnswer === 'yes' ? pcT('yesBtn') : entry.purificationAnswer === 'no' ? pcT('noBtn') : '—';
        const cls = entry.purificationAnswer === 'yes' ? 'yes' : entry.purificationAnswer === 'no' ? 'no' : 'none';
        sectionHtml += `<p class="quiz-review-question"><span class="quiz-review-answer quiz-review-answer-${cls}">${escapeHtml(val)}</span> ${escapeHtml(pcT('quiz_' + page.key + '_purification'))}</p>`;
      }
      sectionHtml += page.questions
        .map((q, idx) => {
          const raw = pageAnswers[idx];
          const qId = page.key + '_q' + idx;
          const { val, cls } = reviewAnswerDisplay(q, raw, qId);
          return `<p class="quiz-review-question"><span class="quiz-review-answer quiz-review-answer-${cls}">${escapeHtml(val)}</span> ${escapeHtml(pcT('quiz_' + qId))}</p>`;
        })
        .join('');
      sectionHtml += '</div>';
      return sectionHtml;
    }).join('');
  }

  // --- Practice tab: Assessment History ------------------------------------

  function renderAssessmentHistory() {
    if (!els.assessmentHistoryList) return;
    const history = loadChakraQuizHistory();

    if (!history.length) {
      els.assessmentHistoryEmpty.removeAttribute('hidden');
      els.assessmentHistoryList.innerHTML = '';
      return;
    }

    els.assessmentHistoryEmpty.setAttribute('hidden', '');

    const sorted = [...history].sort((a, b) => b.quizNumber - a.quizNumber);
    els.assessmentHistoryList.innerHTML = sorted
      .map((entry) => {
        let bodyHtml;
        if (entry.chakras && entry.chakras.length) {
          bodyHtml = entry.chakras
            .map((c) => {
              const additionalList = (c.additionalMantras || []).join(', ') || pcT('quizNoneListed');
              return (
                `<p class="assessment-history-item-summary">${escapeHtml(c.chakraLabel)} — mantra "${escapeHtml(c.mantraName)}"</p>` +
                `<p class="assessment-history-item-additional">${escapeHtml(pcT('quizAlsoLabel', { list: additionalList }))}</p>`
              );
            })
            .join('');
        } else {
          bodyHtml = `<p class="assessment-history-item-summary">${escapeHtml(pcT('quizNoClearRecommendationHistory'))}</p>`;
        }
        return (
          `<div class="assessment-history-item" data-quiz-id="${entry.id}" role="button" tabindex="0">` +
          `<div class="assessment-history-item-header">` +
          `<span class="assessment-history-item-title">${escapeHtml(pcT('quizNumberLabel', { number: entry.quizNumber }))}</span>` +
          `<span class="assessment-history-item-date">${friendlyDateLabel(entry.dateIso)}</span>` +
          `</div>` +
          bodyHtml +
          `<button type="button" class="link-button assessment-history-delete-btn" data-quiz-id="${entry.id}">${escapeHtml(pcT('deleteBtn'))}</button>` +
          `</div>`
        );
      })
      .join('');
  }

  // Opens the full results view (the same overlay/markup used right after
  // taking the quiz) for a saved Assessment History entry — from the
  // Practice tab's history list, or from Today's "See full results" link —
  // so the complete recommendation is readable without retaking the quiz.
  // No unsaved progress is at stake here (this is a past, already-saved
  // attempt), so the bottom nav navigates away immediately with no
  // confirmation (see isChakraQuizInProgress), same as always.
  function openSavedQuizResult(id) {
    if (!id) return;
    const history = loadChakraQuizHistory();
    const entry = history.find((e) => e.id === id);
    if (!entry) return;

    currentQuizResultEntryId = entry.id;
    renderChakraQuizResultsView(entry);
    els.quizDisclaimerView.setAttribute('hidden', '');
    els.quizPageView.setAttribute('hidden', '');
    els.quizResultsView.removeAttribute('hidden');
    els.chakraQuizOverlay.removeAttribute('hidden');
  }

  // Deleting an entry always re-derives the Today tab's summary from
  // whatever remains — if this was the most recent result, the next-most-
  // recent one (if any) takes its place automatically; if history is now
  // empty, the "Find Your Mantra" button returns.
  function deleteAssessmentHistoryEntry(id) {
    if (!id) return;
    let history = loadChakraQuizHistory();
    history = history.filter((entry) => entry.id !== id);
    saveChakraQuizHistory(history);
    renderAssessmentHistory();
    renderChakraQuizSummary();
  }

  // --- EmailJS -------------------------------------------------------------
  //
  // Credentials live in js/emailjs-config.js as placeholders (EMAILJS_
  // PUBLIC_KEY / EMAILJS_SERVICE_ID / EMAILJS_TEMPLATE_ID_ADMIN_NOTIFY /
  // EMAILJS_TEMPLATE_ID_RESULTS) — see that file for what to fill in. Every
  // function here fails SILENTLY (console.warn only) when EmailJS isn't
  // configured yet or the send itself fails, so a missing/placeholder key
  // never blocks the surrounding UI flow (the referral form still saves and
  // shows its confirmation, the results page still shows results) — only
  // the actual outbound email is skipped.

  // True only once emailjs.init() has actually been called successfully —
  // NOT just "the SDK global exists and the key isn't a placeholder". This
  // is what earlier let a load/init failure through as if things were
  // fine: the SDK script can fail to load (network hiccup, ad-blocker,
  // CDN outage) or emailjs.init() can throw, and in both cases `emailjs`
  // may still be defined as an object, or the placeholder check alone
  // would pass — so a raw "is emailjs defined + is the key non-placeholder"
  // check isn't a reliable readiness signal by itself.
  let emailJsInitialized = false;

  // Placeholder detection lives in one place and checks every credential
  // (not just the public key), so a real key alongside e.g. a still-blank
  // service/template ID can't slip through as "ready".
  function emailJsCredentialsLookReal() {
    const placeholderLike = (v) => !v || typeof v !== 'string' || /^YOUR_/i.test(v);
    return (
      !placeholderLike(EMAILJS_PUBLIC_KEY) &&
      !placeholderLike(EMAILJS_SERVICE_ID) &&
      !placeholderLike(EMAILJS_TEMPLATE_ID_RESULTS) &&
      !placeholderLike(EMAILJS_TEMPLATE_ID_REFERRAL)
    );
  }

  function emailJsReady() {
    if (emailJsInitialized) return true;
    // Defensive lazy re-init: if the SDK global exists now but init() never
    // ran (e.g. initEmailJs() happened to run before the CDN script finished
    // — see the comment on initEmailJs — or a prior init() attempt threw),
    // try once more right here instead of permanently giving up. This is
    // what actually fixes "credentials are correct but nothing sends":
    // previously a single failed/skipped init at page load meant every send
    // afterward failed too, with no way to recover without a full reload.
    if (typeof emailjs !== 'undefined' && emailJsCredentialsLookReal()) {
      initEmailJs();
    }
    return emailJsInitialized;
  }

  function initEmailJs() {
    if (typeof emailjs === 'undefined') {
      // Expected if the CDN script (index.html) hasn't finished loading yet
      // or failed outright (network issue, ad-blocker, CDN outage). Because
      // index.html loads it as a plain blocking <script> before app.js, by
      // the time DOMContentLoaded fires (when init() below runs) this
      // should already be defined — if you see this warning, check the
      // Network tab for the @emailjs/browser request specifically.
      console.warn('EmailJS SDK did not load — email features are disabled this session.');
      return;
    }
    if (!emailJsCredentialsLookReal()) {
      console.warn(
        'EmailJS credentials still look like placeholders (js/emailjs-config.js) — email sending is ' +
          'disabled until EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_RESULTS and ' +
          'EMAILJS_TEMPLATE_ID_REFERRAL are all filled in with real values.'
      );
      return;
    }
    try {
      // EmailJS SDK v4's init() takes an options object with `publicKey`
      // (the old v3 signature — and the ancient pre-@emailjs/browser
      // `emailjs-com` package's `userID` — took the key as a bare string).
      // The CDN tag in index.html loads @emailjs/browser@4, so this must
      // match: emailjs.init({ publicKey: '...' }).
      emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
      emailJsInitialized = true;
    } catch (e) {
      console.warn('EmailJS init() threw — email sending is disabled this session:', e);
      emailJsInitialized = false;
    }
  }

  // Short "here's what happened" notifications to admin — used for both the
  // Today-tab referral code entry and the "create my referral code" flow.
  function sendEmailJsAdminNotify(subject, message) {
    if (!emailJsReady()) {
      console.warn('EmailJS not configured — admin notification NOT sent:', subject, '|', message);
      return Promise.resolve({ skipped: true });
    }
    return emailjs
      .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_ADMIN_NOTIFY, {
        to_email: PC_CHAKRA_CONTACT_EMAIL,
        subject,
        message,
      })
      .catch((e) => {
        console.warn('EmailJS admin notify failed:', e);
      });
  }

  // The "Email me my results" send on the quiz results page. Template
  // variables match the quiz-results EmailJS template exactly: to_email,
  // chakra_result, why_sentence, mantra_name, mantra_list, sustain_message.
  function sendEmailJsResults(toEmail, vars) {
    if (!emailJsReady()) {
      console.warn('EmailJS not configured — results email NOT sent to', toEmail);
      return Promise.reject(new Error('emailjs_not_configured'));
    }
    return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_RESULTS, {
      to_email: toEmail,
      chakra_result: vars.chakra_result || '',
      why_sentence: vars.why_sentence || '',
      mantra_name: vars.mantra_name || '',
      mantra_list: vars.mantra_list || '',
      sustain_message: vars.sustain_message || '',
    });
  }

  // The referral-code-entered notification (Today tab, "Were you referred
  // by a friend?"). Template variables: referral_code, referrer_email, date.
  // referrer_email is always sent blank now — the entry form only collects
  // the code itself (see submitReferralEntryForm) — the code alone is
  // enough to track redemptions manually.
  function sendEmailJsReferralNotify(referralCode, dateIso) {
    if (!emailJsReady() || typeof EMAILJS_TEMPLATE_ID_REFERRAL === 'undefined') {
      console.warn('EmailJS not configured — referral notification NOT sent for code', referralCode);
      return Promise.resolve({ skipped: true });
    }
    return emailjs
      .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_REFERRAL, {
        referral_code: referralCode,
        referrer_email: '',
        date: dateIso,
      })
      .catch((e) => {
        console.warn('EmailJS referral notify failed:', e);
      });
  }

  // --- Today tab: quiet "Were you referred by a friend?" referral entry ---
  //
  // No longer a first-launch modal — just a small, easy-to-ignore field at
  // the bottom of the Today tab. A device that has already entered a code
  // (REFERRAL_ENTERED_KEY set) quietly shows the thank-you note instead of
  // the form every time, rather than asking again.

  function renderReferralEntryCard() {
    const alreadyEntered = !!loadReferralEntered();
    if (els.referralEntryFormRow) els.referralEntryFormRow.toggleAttribute('hidden', alreadyEntered);
    if (els.referralEntryThanks) els.referralEntryThanks.toggleAttribute('hidden', !alreadyEntered);
    if (!alreadyEntered && els.referralEntryError) els.referralEntryError.setAttribute('hidden', '');
  }

  function loadReferralEntered() {
    try {
      const raw = localStorage.getItem(REFERRAL_ENTERED_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Could not read referral-entered record:', e);
      return null;
    }
  }

  // Just the code — no friend name or referrer email are collected any
  // more (that was too much friction for a quiet, easy-to-ignore field).
  // The admin notification still carries the code itself, which is enough
  // to track redemptions manually.
  function submitReferralEntryForm() {
    const code = (els.referralEntryCodeInput.value || '').trim();
    if (!code) {
      if (els.referralEntryError) els.referralEntryError.removeAttribute('hidden');
      return;
    }
    if (els.referralEntryError) els.referralEntryError.setAttribute('hidden', '');

    const dateIso = deviceTodayIso();
    try {
      localStorage.setItem(REFERRAL_ENTERED_KEY, JSON.stringify({ code, dateIso }));
    } catch (e) {
      console.error('Could not save referral entry:', e);
    }

    sendEmailJsReferralNotify(code, dateIso);

    renderReferralEntryCard();
    renderEarnMantraCard(); // in case this same device also holds its own referral code (see checkReferralJoinedLocally)
  }

  // --- Mantra tab: "Earn a Free Mantra" -------------------------------------

  function generateReferralCode() {
    // Short, easy to read aloud/type — uppercase letters + digits, no
    // easily-confused characters (0/O, 1/I) excluded.
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  function getMyReferralCode() {
    try {
      return localStorage.getItem(MY_REFERRAL_CODE_KEY);
    } catch (e) {
      console.error('Could not read referral code:', e);
      return null;
    }
  }

  function getMyReferralEmail() {
    try {
      return localStorage.getItem(MY_REFERRAL_EMAIL_KEY);
    } catch (e) {
      console.error('Could not read referral email:', e);
      return null;
    }
  }

  // Renders the card's current state: the email-prompt sub-form until the
  // user has provided their own email (once, ever — after that the code is
  // shown directly every time), and the "your friend joined" banner when
  // this SAME device holds both a referral it created AND a referral it
  // entered under the identical code — see the comment on
  // checkReferralJoinedLocally for why that's the only case this
  // no-backend app can actually detect.
  function renderEarnMantraCard() {
    if (!els.earnMantraCard) return;
    const myEmail = getMyReferralEmail();
    const myCode = getMyReferralCode();

    if (myEmail && myCode) {
      els.referralEmailPromptRow.setAttribute('hidden', '');
      els.referralCodeRow.removeAttribute('hidden');
      els.referralCodeText.textContent = myCode;
    } else {
      els.referralCodeRow.setAttribute('hidden', '');
      els.referralEmailPromptRow.removeAttribute('hidden');
    }

    if (els.referralJoinedBanner) {
      els.referralJoinedBanner.toggleAttribute('hidden', !checkReferralJoinedLocally());
    }
  }

  // IMPORTANT LIMITATION: this app has no backend/server — it's pure
  // localStorage on one device. There is no real way for this device to
  // learn that a friend, on THEIR OWN device, entered this device's
  // referral code — that would need a shared database somewhere, which
  // EmailJS (outbound email only) cannot provide either. What CAN be
  // detected, entirely locally, is the one same-device case: this device
  // both created a referral code (as the referrer) AND separately entered
  // a referral code (as an entered "friend" value) that happens to match —
  // useful for testing/demoing the banner, not a real cross-device signal.
  // A genuine "your friend joined" notification needs a real backend (or a
  // service like Firebase) to look up redemptions server-side.
  function checkReferralJoinedLocally() {
    const myCode = getMyReferralCode();
    if (!myCode) return false;
    try {
      const raw = localStorage.getItem(REFERRAL_ENTERED_KEY);
      if (!raw) return false;
      const entered = JSON.parse(raw);
      return entered && entered.code === myCode;
    } catch (e) {
      return false;
    }
  }

  function submitReferralOwnEmail() {
    const email = (els.referralOwnEmailInput.value || '').trim();
    if (!email) return;
    try {
      localStorage.setItem(MY_REFERRAL_EMAIL_KEY, email);
    } catch (e) {
      console.error('Could not save referral email:', e);
    }
    let code = getMyReferralCode();
    if (!code) {
      code = generateReferralCode();
      try {
        localStorage.setItem(MY_REFERRAL_CODE_KEY, code);
      } catch (e) {
        console.error('Could not save referral code:', e);
      }
    }
    sendEmailJsAdminNotify(
      'Prana Calendar — Referral Code Created',
      `A referral code was just created. Code: ${code}. User email: ${email}. Date: ${deviceTodayIso()}.`
    );
    renderEarnMantraCard();
  }

  function copyReferralCode() {
    const code = getMyReferralCode();
    if (!code) return;
    const showCopied = () => {
      if (!els.referralCopiedNote) return;
      els.referralCopiedNote.removeAttribute('hidden');
      setTimeout(() => els.referralCopiedNote.setAttribute('hidden', ''), 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(showCopied).catch(() => showCopied());
    } else {
      showCopied();
    }
  }

  function shareReferralCode() {
    const code = getMyReferralCode();
    if (!code) return;
    const shareText = `Join me on Prana Calendar! Use my referral code ${code} when you open the app.`;
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    } else {
      copyReferralCode();
    }
  }

  // --- Quiz results: "Email me my results" ----------------------------------

  // Plain-text summary of a saved quiz entry, matching the EmailJS results
  // template's variables exactly: chakra_result, why_sentence, mantra_name,
  // mantra_list, sustain_message. Only the primary/first recommendation is
  // used (the template has one slot for each), with a graceful fallback
  // when the attempt produced no clear recommendation at all ('none' mode).
  function buildResultsEmailVars(entry) {
    const c = (entry.chakras || [])[0];
    if (!c) {
      return {
        chakra_result: 'No clear recommendation from this attempt.',
        why_sentence: '',
        mantra_name: '',
        mantra_list: '',
        sustain_message: '',
      };
    }
    // Matches the exact title line shown above the recommendation in the
    // results view (see buildRecommendationBlockHtml's headerLine) — e.g.
    // "4th — Anahata — Om Namah Shivaya — available in app".
    const chakraResult = `${c.chakraNumberLabel} — ${c.chakraCommonName} — ${c.mantraName} — available in app`;
    // List of the *additional* website mantras only (not the primary
    // mantra_name, which has its own field) — matches the "Mantras for
    // this chakra" list's extra entries in the results view. Joined with
    // <br> rather than a comma so the EmailJS template (which renders this
    // var as raw HTML) displays each mantra on its own line.
    const additionalMantraList = (c.additionalMantras || []).filter(Boolean).join('<br>');
    return {
      chakra_result: chakraResult,
      why_sentence: c.whySentence || '',
      mantra_name: c.mantraName || '',
      mantra_list: additionalMantraList,
      sustain_message: c.sustainMessage || '',
    };
  }

  function submitEmailResults() {
    if (!currentResultsEntry) return;
    const email = (els.emailResultsInput.value || '').trim();
    if (!email) return;

    els.emailResultsStatus.className = 'email-results-status';
    els.emailResultsStatus.textContent = pcT('sendingStatus');
    els.emailResultsStatus.removeAttribute('hidden');

    const vars = buildResultsEmailVars(currentResultsEntry);
    sendEmailJsResults(email, vars)
      .then(() => {
        els.emailResultsStatus.className = 'email-results-status success';
        els.emailResultsStatus.textContent = pcT('sentCheckInbox');
      })
      .catch((e) => {
        els.emailResultsStatus.className = 'email-results-status error';
        // Two genuinely different failure modes get two different
        // messages, instead of one generic "setup isn't finished" message
        // for both — that wording was actively misleading once real
        // credentials were in place, since it kept showing even when the
        // real cause was an EmailJS-side send failure (bad template
        // mapping, an unauthorized origin in the EmailJS dashboard, a
        // rate/quota limit, etc.), not a config problem in this file at all.
        if (e && e.message === 'emailjs_not_configured') {
          els.emailResultsStatus.textContent = pcT('emailNotConfigured');
        } else {
          // The real reason (EmailJS's own error text/status, when
          // present) goes to the console for debugging — it's usually far
          // more specific than anything safe to show inline in the UI
          // (e.g. "The recipients address is empty" or a 403 from an
          // origin not yet whitelisted in the EmailJS dashboard).
          console.error('EmailJS results send failed:', e && e.text ? e.text : e);
          els.emailResultsStatus.textContent = pcT('emailSendFailed');
        }
      });
  }

  // ---------------------------------------------------------------------
  // Newsletter (Constant Contact) — quiz-results auto-shown section.
  //
  // Signup itself is handled entirely by Constant Contact's own inline-form
  // widget script (see the Universal Code + .ctct-inline-form divs in
  // index.html) — it renders and submits the form itself, so there is no
  // iframe, no modal, and no cross-origin restriction to work around here.
  // This app only reveals the wrapping section on the quiz results page
  // (there's no dismiss control any more — tapping another bottom-nav tab
  // is how someone leaves it); the Today-tab copy is always visible (see
  // index.html).
  function showQuizNewsletterSection() {
    if (!els.quizNewsletterSection) return;
    els.quizNewsletterSection.removeAttribute('hidden');
  }


  // -------------------------------------------------------------------------
  // Sacred header / portrait images — all of these reference files that
  // live in images/ and may not have been dropped in yet (see images/
  // README.md). Rather than showing a broken-image icon, each one quietly
  // hides itself if its file 404s. Once the real file is added, a normal
  // page reload picks it up — no code change needed.
  // -------------------------------------------------------------------------
  function bindGracefulImageFallbacks() {
    [
      els.sacredHeaderPhotoToday,
      els.sacredHeaderSignatureToday,
      els.sacredHeaderSignatureMantra,
      els.sacredHeaderSignaturePractice,
      els.sacredHeaderSignatureLearn,
      els.shyamjiPortraitPhoto,
    ].forEach((img) => hideImageIfBroken(img));
  }

  // <img src> starts loading the moment the parser hits the tag — for a
  // fast local 404 that can finish before this script (loaded at the very
  // end of <body>) even runs, so an 'error' listener alone can miss it.
  // Checking complete/naturalWidth up front catches an already-failed load;
  // the listener catches one that fails after this point.
  function hideImageIfBroken(img) {
    if (!img) return null;
    if (img.complete && img.naturalWidth === 0) {
      img.setAttribute('hidden', '');
      return true;
    }
    img.addEventListener(
      'error',
      () => img.setAttribute('hidden', ''),
      { once: true }
    );
    return false;
  }

  // -------------------------------------------------------------------------
  // Once-per-day splash screen — every bit of content (whether it shows at
  // all, and what events it lists) comes from events.json in the project
  // root, so that's the only file anyone needs to touch to update it.
  // -------------------------------------------------------------------------
  function initSplash() {
    if (!els.splashOverlay) return;

    // The logo image is optional — if images/chakra-institute-logo.jpg
    // hasn't been added yet, fall back to a plain text wordmark instead of
    // a broken-image icon. Same already-failed-by-the-time-we-attach
    // concern as hideImageIfBroken() above, so check up front too.
    if (els.splashLogoImg) {
      const showLogoFallback = () => {
        const fallback = document.createElement('p');
        fallback.className = 'splash-logo-fallback';
        fallback.textContent = 'The Chakra Institute';
        els.splashLogoImg.replaceWith(fallback);
      };
      if (els.splashLogoImg.complete && els.splashLogoImg.naturalWidth === 0) {
        showLogoFallback();
      } else {
        els.splashLogoImg.addEventListener('error', showLogoFallback, { once: true });
      }
    }

    safeBind(els.splashCloseBtn, 'click', closeSplash);
    // "Close when tapped anywhere" — the whole card (not just the backdrop)
    // dismisses it; a click on a "Learn More" link still navigates
    // normally (its default action fires before/alongside this handler).
    safeBind(els.splashOverlay, 'click', closeSplash);

    fetch('events.json', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('events.json returned ' + res.status);
        return res.json();
      })
      .then((data) => {
        if (!data || data.show !== true) return;
        // Testing override: a URL of .../?splash=1 always shows the splash,
        // bypassing the once-per-day check entirely — handy for verifying
        // splash content/behavior without having to clear localStorage or
        // wait for the next calendar day.
        const forceShow = new URLSearchParams(window.location.search).get('splash') === '1';
        if (!forceShow && splashAlreadyShownToday()) return;
        renderSplashEvents(Array.isArray(data.events) ? data.events : []);
        els.splashOverlay.removeAttribute('hidden');
        markSplashShownToday();
      })
      .catch((e) => {
        // Missing/invalid events.json should never break the rest of the
        // app — just skip the splash silently (besides this log line).
        console.error('Could not load events.json — splash skipped:', e);
      });
  }

  function splashAlreadyShownToday() {
    try {
      return localStorage.getItem(SPLASH_LAST_SHOWN_KEY) === deviceTodayIso();
    } catch (e) {
      return false;
    }
  }

  function markSplashShownToday() {
    try {
      localStorage.setItem(SPLASH_LAST_SHOWN_KEY, deviceTodayIso());
    } catch (e) {
      console.error('Could not save splash last-shown date:', e);
    }
  }

  function closeSplash() {
    if (!els.splashOverlay) return;
    els.splashOverlay.setAttribute('hidden', '');
  }

  function renderSplashEvents(events) {
    if (!els.splashEventsList) return;
    els.splashEventsList.innerHTML = events
      .map((ev) => {
        const title = escapeHtml(ev && ev.title ? ev.title : '');
        const description = escapeHtml(ev && ev.description ? ev.description : '');
        const link = ev && ev.link ? ev.link : '';
        const linkHtml = link
          ? `<a class="splash-event-link" href="${escapeHtml(link)}" target="_blank" rel="noopener">Learn More</a>`
          : '';
        return (
          `<div class="splash-event-item">` +
          `<p class="splash-event-title">${title}</p>` +
          `<p class="splash-event-description">${description}</p>` +
          linkHtml +
          `</div>`
        );
      })
      .join('');
  }

  function showError(msg) {
    els.errorBox.textContent = msg;
    els.errorBox.removeAttribute('hidden');
  }
  function showErrorSafe(msg) {
    if (els.errorBox) showError(msg);
    else console.error(msg);
  }
  function clearError() {
    els.errorBox.textContent = '';
    els.errorBox.setAttribute('hidden', '');
  }
})();
