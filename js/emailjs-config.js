/*
 * emailjs-config.js — EmailJS credentials.
 *
 * Two purposes are wired up with real credentials below:
 *   1. EMAILJS_TEMPLATE_ID_RESULTS — the "Email me my results" button on the
 *      quiz results page, sent to the user themselves. Template variables:
 *      {{to_email}}, {{chakra_result}}, {{why_sentence}}, {{mantra_name}},
 *      {{mantra_list}}, {{sustain_message}}.
 *   2. EMAILJS_TEMPLATE_ID_REFERRAL — sent when someone enters a referral
 *      code (Today tab, "Were you referred by a friend?"). Template
 *      variables: {{referral_code}}, {{referrer_email}}, {{date}}.
 *
 * EMAILJS_TEMPLATE_ID_ADMIN_NOTIFY is a separate, OPTIONAL third template
 * (used only for the "create my referral code" confirmation notice) that
 * was never given a real ID — it stays a placeholder, so that one specific
 * notification silently no-ops (console warning only) until/unless a real
 * template ID is filled in here. It does not affect purposes 1 or 2 above.
 */
const EMAILJS_PUBLIC_KEY = 'FiyKqq9KWA12NM1A-';
const EMAILJS_SERVICE_ID = 'service_uogpo5e';
const EMAILJS_TEMPLATE_ID_RESULTS = 'template_b005lt5';
const EMAILJS_TEMPLATE_ID_REFERRAL = 'template_xtq8pm7';
const EMAILJS_TEMPLATE_ID_ADMIN_NOTIFY = 'YOUR_TEMPLATE_ID';
