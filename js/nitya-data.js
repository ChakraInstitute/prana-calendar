/*
 * nitya-data.js — the sixteen Nitya goddesses (Tantraraja Tantra tradition).
 *
 * All Nitya-related TEXT for the app lives in this one file on purpose —
 * name, epithet, vowel, Devanagari, and description — so that a future
 * translation only ever has to touch this file, never js/app.js. The
 * calculation that decides WHICH Nitya corresponds to today's tithi (the
 * Classical/Tantraraja vs Nityotsava schemes) is logic, not text, and lives
 * in app.js instead (see pcNityaIndexForTithi).
 *
 * PC_NITYAS is a plain array of 16 entries, index 0-15, matching the
 * traditional Tithi-to-Nitya table 1:1 (index = tithi - 1 under the
 * Classical/Tantraraja scheme — see app.js for the full mapping including
 * the Nityotsava reversal).
 *
 * Nitya 16 — Mahānityā (Lalitā) at index 15 — is stored here for
 * completeness but is NOT tied to any tithi (tithis only run 1-15 within a
 * paksha) and must never be shown in the daily Tithi accordion. app.js
 * enforces this by construction (the index formulas below never produce 15
 * for a valid tithi 1-15), and defensively as well — see
 * renderNityaAccordion.
 */
const PC_NITYAS = [
  {
    name: 'Kāmeśvarī',
    epithet: 'Lady of Desire',
    vowel: 'a',
    devanagari: 'अ',
    description:
      'Red, merciful. She is desire as the primal creative impulse, the first stirring of consciousness toward ' +
      'manifestation. The goddess of passion and the beginning of all cycles. Can take any desired form. Shining ' +
      'of 10 million suns. She is the fulfiller of desires, she is very kind and grants devotees wishes. A day ' +
      'most auspicious for initiations and new commitments of a spiritual nature.',
  },
  {
    name: 'Bhagamālinī',
    epithet: 'Adorned with Fortune',
    vowel: 'aa',
    devanagari: 'आ',
    description:
      'She charms the world. Bhaga means fortune and fullness; she is the blossoming of desire into form and the ' +
      'manifestation of creative abundance. She is the fertile, generative principle, Yoni, and offers protection ' +
      'to pregnant women during gestation and delivery. A day of good fortune for material undertakings, ' +
      'offerings, and celebrating the fruits of effort.',
  },
  {
    name: 'Nityaklinnā',
    epithet: 'Ever Moist',
    vowel: 'E',
    devanagari: 'इ',
    description:
      'Beads of sweat like pearls are the liquefying principle. Wetness is the mark of life. She dissolves rigid ' +
      'boundaries and brings emotional flow, compassion, and the moisture of tears and devotion. She grants unity ' +
      'in the family, bringing mutual love and affinity between parents and children. She dispels fear and is ' +
      'merciful, she is unfathomably kind and soaked in compassion. This day favors emotional healing, nurturing ' +
      'others, and practices that soften the heart.',
  },
  {
    name: 'Bheruṇḍā',
    epithet: 'The Terrifying',
    vowel: 'EE',
    devanagari: 'ई',
    description:
      'Molten golden color, carrying the thunderbolt. She dwells in the corners of the 14-angled figure (the Sri ' +
      "Chakra's outer forms), embodying fierce power. Japa on her name frees one from the three poisons (plants, " +
      "animal, chemical). She is the creator of millions of universes and pervades them all. She is sought to " +
      "destroy the obstacles on a devotee's path, especially internal negative tendencies. Auspicious for " +
      'overcoming fears, clearing away what no longer serves, and facing difficult truths.',
  },
  {
    name: 'Vahnivāsinī',
    epithet: 'She Who Dwells in Fire',
    vowel: 'u',
    devanagari: 'उ',
    description:
      'Burning gold, dressed in yellow, she holds a conch. She is the fire-dweller who assumes the form of the ' +
      'universe itself, the transforming principle of heat and intensity. She burns away impurity and bestows all ' +
      'worldly attainments. She is the form of fire itself, residing coiled as Kundalini at the base, acting as ' +
      'the fiery power of the central channel, and expressing herself through the three lingas of the subtle ' +
      'body. Excellent day for intensive practices, tapas (spiritual discipline), and work that demands ' +
      'transformation.',
  },
  {
    name: 'Mahāvajreśvarī',
    epithet: 'The Protectress Who Bears the Sacred Weapon',
    vowel: 'oo',
    devanagari: 'ऊ',
    description:
      'Red, seated on a throne in a golden boat in an ocean of blood. Surrounded by pomegranate flowers. She ' +
      'embodies mercy and the core powers of manifest consciousness as it desires expression — will, knowledge, ' +
      'and action. The siddhi of her mantras destroys the ignorance at the root of all suffering — the inability ' +
      'to discriminate the real from the unreal. She grants freedom from density in the mind and all troubles one ' +
      'may face. This day favors meditation, contemplation, inner work, and practices aimed at liberation rather ' +
      'than worldly gain.',
  },
  {
    name: 'Śivadūtī',
    epithet: 'The Messenger of Śiva',
    vowel: 'ri',
    devanagari: 'ऋ',
    description:
      'Bright as the mid-day sun, wearing red, crowned with nine gems. The rishis sing her praises. She is the ' +
      'detainer of wickedness, destroyer of aviveka (ignorance). She is eager to grant the desires of her ' +
      'devotees and to destroy injustices. She sends Śiva as her messenger and is thus the grantor of the Śiva ' +
      'state. She assumes a supreme form as Śivadūtī herself. A day good for facing undeniable truths, cutting ' +
      'through illusion, and speaking or acting with absolute alignment and unshakeable clarity.',
  },
  {
    name: 'Tvaritā',
    epithet: 'The Swift',
    vowel: 'rrEE',
    devanagari: 'ॠ',
    description:
      'Quick to grant fruits of practice, she is the accelerating principle; swift movement and rapid change. She ' +
      'represents the auspicious first flush of youth and is of dark color. Adorned with eight serpents of four ' +
      'kinds. Her crystal crown bears a peacock feather; she wears bangles of peacock tails on her arms. ' +
      'According to the Nityotsava reversal rules (during the waning moon), all the other Nitya goddesses change ' +
      'positions except Tvaritā — she is the absolute, unshakeable center point. This day supports rapid ' +
      'fruition, finding your unshakeable center, and remaining perfectly steady.',
  },
  {
    name: 'Kulasundarī',
    epithet: 'The Divine Beauty of the Manifest Universe',
    vowel: 'lri',
    devanagari: 'ऌ',
    description:
      'The beauty and radiance of the manifest universe itself — the divine Shakti expressing through matter and ' +
      'embodied form. Her sadhaka becomes all-knowing; she is supremely kind. In her are contained all the words ' +
      'of the Vedas. She represents the union of vowel with consonant — the principle through which the universe ' +
      'itself comes into being. She is meditated upon for the attainment of learning and the recognition of ' +
      'divinity within all. Auspicious day for learning new skills, expressing creative ideas, and recognizing ' +
      'the profound, divine beauty in life.',
  },
  {
    name: 'Nityā',
    epithet: 'The Eternal',
    vowel: 'lrEE',
    devanagari: 'ॡ',
    description:
      'Existence itself, timeless and unchanging. She is the constant ground beneath all change — neither new ' +
      'nor old, simply ever-present, ancient yet ever-fresh. She is pervasive in all beings; all moving bodies ' +
      'are controlled by her and all jivas dwell in their bodies by her grace. She is consciousness (caitanya) in ' +
      'all. Her sadhaka becomes Śiva (one who moves in space) and blissful. By mere wish, such a one can favor or ' +
      'punish. This is a day for deep spiritual work, for sitting in silence and recognition of oneself as ' +
      'consciousness.',
  },
  {
    name: 'Nīlapatākā',
    epithet: 'She of the Blue Banner (or Sapphire Flag)',
    vowel: 'A',
    devanagari: 'ए',
    description:
      'Victory through steadfast will. Her name invokes the flag planted at the end of battle — in mastery over ' +
      'her senses, mind and energy. She is the triumph of discipline and the reward of sustained effort. Sapphire ' +
      'blue in color, dressed in red, her hand bearing the gesture of granting wishes. She represents steadfast ' +
      'will and hard-won achievement. This day is excellent for completing difficult undertakings, neutralizing ' +
      'toxic patterns, and claiming a major personal victory.',
  },
  {
    name: 'Vijayā',
    epithet: 'The Victorious',
    vowel: 'I',
    devanagari: 'ऐ',
    description:
      'Vijayā is victory in motion — conquering in competition or conflict. Red as the rising sun, with raiment ' +
      'of yellow and a brilliant crown bearing a crescent moon on the forehead. She can be invoked as a terrific ' +
      'aspect for victory in war but is otherwise benignant. She is seated on a lion, with her shaktis seated on ' +
      'tigers. Vijayā subdues the arrogant, she bestows success in verbal debate and war. This is a day ' +
      'auspicious for contests, negotiations, and undertakings requiring active assertion and outer success.',
  },
  {
    name: 'Sarvamaṅgalā',
    epithet: 'All-Auspiciousness',
    vowel: 'o',
    devanagari: 'ओ',
    description:
      'Golden in color, decked with pearls and wearing a ruby crown. Her eyes, full of mercy, are themselves the ' +
      'sun and moon. Her shaktis originate from solar, lunar, and fiery letters — blessing all dimensions of ' +
      'existence. Her sadhaka becomes one who moves freely through the space of pure consciousness (Khecara). She ' +
      'grants wealth, unconditional protection, and good fortune. A day for seeking protection, magnifying good ' +
      'fortune, and performing practices aimed at peace and harmony.',
  },
  {
    name: 'Jvālāmālinī',
    epithet: 'Garlanded with Flames',
    vowel: 'ow',
    devanagari: 'औ',
    description:
      'Lustrous, her body itself is flaming fire, wearing a ruby crown. She is the fierce, purifying power in her ' +
      'final form before dissolution, carrying the symbols of the tortoise and the flame. As the origin of the ' +
      'Veda who draws all creation back into herself, she kindles a blazing fire that completely dissolves the ' +
      'last traces of limitation and illusion. This is a day for drastic energetic clearing, drawing scattered ' +
      'energy back into your center, and completely dissolving old patterns or fears to make room for a fresh ' +
      'beginning.',
  },
  {
    name: 'Citrā',
    epithet: 'The Brilliant One — Multifaceted, Variegated',
    vowel: 'ung',
    devanagari: 'अं',
    description:
      'This is fullness, completion, and the expression of total potential — the multi within the singular. ' +
      'Luminous like the rays of the rising sun, she wears a crown decked with nine kinds of jewels representing ' +
      'the nine planets. She is all bliss, ever-existent, and grants all desires. Seated inside the sacred figure ' +
      'of nine triangles at the core of the Sri Chakra, she is deeply connected to the nakshatras and represents ' +
      'the full manifestation of all potential. Good for celebrating culminations, bringing long-term projects to ' +
      'total completion, and intentionally manifesting your highest goals.',
  },
  {
    // Mahānityā/Lalitā — see the file-level comment above: stored here for
    // completeness, but NEVER shown in the daily Tithi accordion. She has
    // no tithi of her own (tithis run 1-15 within a paksha).
    name: 'Mahānityā (Lalitā)',
    fullName: 'Mahānityā — Lalitā Mahātripurasundarī',
    epithet: 'The Great Eternal',
    vowel: 'ah',
    devanagari: 'अः',
    description:
      'Beyond the tithi count, neither waxing nor waning. She is the totality from which the fifteen emanate and ' +
      'to which they return. The supreme form of desire unified with itself. She is not connected to any tithi.',
  },
];

// The small italic note shown at the bottom of the Nitya accordion, every
// time it's open — kept here (not hardcoded in app.js) for the same
// future-translation reason as everything else in this file. The note
// differs by calculation scheme (see PC_NITYA_SCHEME_LABELS below and
// renderNityaAccordion in app.js, which picks the matching one): Classical
// gets the general devotional note, Nityotsava gets the note explaining
// the historical basis for the Krishna-paksha reversal specifically.
const PC_NITYA_FOOTNOTES = {
  classical:
    'The Nityas are reflections of the Sanskrit vowels and the phases of the moon — belonging to all living beings. ' +
    'While their secret bija mantras require a guru, anyone may connect with the daily Nitya through meditation, ' +
    'devotion, and intention.',
  nityotsava:
    'The Tantraraja Tantra assigns Kāmeśvarī through Citrā sequentially through the bright fortnight (Shukla Paksha) ' +
    'but does not explicitly address the dark fortnight (Krishna Paksha). The Nityotsava (1745) explicitly states to ' +
    'reverse the sequence during Krishna Paksha, beginning again from Citrā and moving back toward Kāmeśvarī. The two ' +
    'schemes are therefore identical for the bright fortnight and differ only during the dark fortnight.',
};

// Labels for the two calculation-scheme toggle buttons.
const PC_NITYA_SCHEME_LABELS = {
  classical: 'Classical (Tantraraja)',
  nityotsava: 'Nityotsava (Reversal)',
};
