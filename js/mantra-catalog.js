/*
 * mantra-catalog.js — data for every mantra player on the Mantra tab.
 *
 * All audio now streams directly from an external host (no local files in
 * this project). Each PAID mantra (`locked: true`) requires its own unlock
 * code to be entered once on a device — after that it stays unlocked on
 * that device forever via localStorage. FREE mantras play immediately.
 *
 * `mantraTabKey` in js/chakra-quiz-data.js's PC_CHAKRA_MANTRAS must match a
 * key here (for the 9 chakra-tied mantras) so the quiz results page can
 * link out correctly.
 */

const MANTRA_CATALOG = {
  'jai-guru-dev': {
    name: 'Jai Guru Dev',
    locked: false,
    audioUrl: 'https://files.cdn-files-a.com/uploads/5662047/normal_694539201f9af.mp3',
  },
  'shree-radhay': {
    name: 'Shree Radhay — Heart Chakra Mantra',
    locked: false,
    audioUrl: 'https://files.cdn-files-a.com/uploads/5662047/normal_6945371b08414.mp3',
  },
  'ganapati-deva': {
    name: 'Ganapati Deva',
    chakraLabel: 'Chakra 1',
    locked: true,
    code: 'GANA-1400',
    purchaseUrl: 'https://www.chakrainstitute.com/store/1st-chakra-ganapati-deva-app-purchase',
    audioUrl: 'https://files.cdn-files-a.com/uploads/5662047/normal_6aa338533be93.mp3',
  },
  'bajaranga-bali': {
    name: 'Bajaranga Bali',
    chakraLabel: 'Chakra 2',
    locked: true,
    code: 'BAJA-1022',
    purchaseUrl: 'https://www.chakrainstitute.com/store/2nd-chakra-bajaranga-bali-app-purchase',
    audioUrl: 'https://files.cdn-files-a.com/uploads/5662047/normal_6aa33961429fe.mp3',
  },
  'rama-chandra-raghuvira': {
    name: 'Rama Chandra Raghuvira',
    chakraLabel: 'Chakra 3',
    locked: true,
    code: 'RAMA-4030',
    purchaseUrl: 'https://www.chakrainstitute.com/store/3rd-chakra-rama-chandra-raghivira-app-purchase',
    audioUrl: 'https://files.cdn-files-a.com/uploads/5662047/normal_6aa339a83d3d5.mp3',
  },
  'santoshi-mata': {
    name: 'Santoshi Mata',
    chakraLabel: 'Chakra 4',
    locked: true,
    code: 'SATO-1202',
    purchaseUrl: 'https://www.chakrainstitute.com/store/4th-chakra-santoshi-mata-app-purchase',
    audioUrl: 'https://files.cdn-files-a.com/uploads/5662047/normal_6aa33a5b41f28.mp3',
  },
  'krishna-radhay-bol': {
    name: 'Krishna Radhay Bol',
    chakraLabel: 'Hrit Chakra',
    locked: true,
    code: 'KRSH-3011',
    purchaseUrl: 'https://www.chakrainstitute.com/store/hrit-chakra-krishna-radhay-bol-app-purchase',
    audioUrl: 'https://files.cdn-files-a.com/uploads/5662047/normal_6aa33abea479c.mp3',
  },
  'ekongkara': {
    name: 'Ekongkara',
    chakraLabel: 'Chakra 5',
    locked: true,
    code: 'EKNG-4020',
    purchaseUrl: 'https://www.chakrainstitute.com/store/5th-chakra-ekongkara-app-purchase',
    audioUrl: 'https://files.cdn-files-a.com/uploads/5662047/normal_6aa33ae2ebe29.mp3',
  },
  'gayatri': {
    name: 'Gayatri',
    chakraLabel: 'Chakra 6',
    locked: true,
    code: 'GAYA-6011',
    purchaseUrl: 'https://www.chakrainstitute.com/store/6th-chakra-gayatri-app-purchase',
    audioUrl: 'https://files.cdn-files-a.com/uploads/5662047/normal_6aa33b036af0c.mp3',
  },
  'narayana': {
    name: 'Vasudeva',
    chakraLabel: 'Soma Chakra',
    locked: true,
    code: 'SOMA-3221',
    purchaseUrl: 'https://www.chakrainstitute.com/store/soma-chakra-narayana-app-purchase',
    audioUrl: 'https://files.cdn-files-a.com/uploads/5662047/normal_6aa33b1f904b1.mp3',
  },
  'om': {
    name: 'Narayana',
    chakraLabel: 'Chakra 7',
    locked: true,
    code: 'AUM-5410',
    purchaseUrl: 'https://www.chakrainstitute.com/store/7th-chakra-aum-om-app-purchase',
    audioUrl: 'https://files.cdn-files-a.com/uploads/5662047/normal_6aa33b3c11e02.mp3',
  },
};
