# images/

Drop the following files directly into this folder, with these exact
filenames (matching case included). The app already references them by
these names — nothing else needs to change once they're here.

- `Shyamji_website_pic.webp` — black-and-white portrait, shown at the top of
  the Today tab.
- `Shyamji_Signature_no_background.png` — Sri Shyamji's signature graphic, shown
  below the portrait on the Today tab and at the top of the Mantra,
  Practice, and Learn tabs.
- `IMG_2278.jpg` — Sri Shyamji's photo shown at the top of the "Who was Sri
  Shyamji Bhatnagar?" section in the Learn tab (visible once that accordion
  item is expanded).
- `chakra-institute-logo.jpg` — optional. The splash screen references this
  file for the Chakra Institute logo. If it isn't present, the splash shows
  a plain text "The Chakra Institute" heading instead, so the splash still
  works fine without it. Also used by the three Share buttons' generated
  image cards (js/share-card.js) — it's drawn prominently at the top of
  each card. If it isn't present, a card falls back to a small drawn mark
  next to the "Prana Calendar" wordmark instead of a broken image.
- `prana-calendar-icon.png` — the app's home-screen/install icon, 512x512.
  Referenced by `manifest.json` (for both its 192x192 and 512x512 entries —
  the browser scales the one file down as needed) and by the
  `apple-touch-icon`/favicon `<link>` tags in `index.html`, which is what
  lets "Add to Home Screen" on iPhone and "Install app" on Android show the
  real Prana Calendar icon instead of a blank/default one.

Until a given file is added, the app quietly hides that image (no broken
image icon) rather than breaking anything else.

If an image still won't load once the filename above matches exactly, run
`node server.js` and watch its terminal output — every request under
`images/` is logged with the exact path it checked, and the folder's actual
contents on a miss, so any mismatch is visible immediately.
