/*
 * nakshatra-data.js — the 27 nakshatras (lunar constellations/mansions).
 *
 * All nakshatra-related TEXT lives in this one file, mirroring the pattern
 * used for js/nitya-data.js, so a future translation only has to touch
 * data files, never js/app.js.
 *
 * PC_NAKSHATRAS is a plain array of 27 entries, index 0-26, in the same
 * order as PC_NAKSHATRA_NAMES in js/panchanga.js (Ashwini ... Revati) — so
 * app.js can look a nakshatra up directly with
 * PC_NAKSHATRAS[p.nakshatraNumber - 1].
 */
const PC_NAKSHATRAS = [
  {
    name: 'Ashvini',
    epithet: 'The Horsemen',
    deity: 'Ashvins (the twin celestial physicians)',
    planet: 'Ketu',
    themes: 'Movement, healing, swift beginnings.',
    description:
      'The gateway nakshatra — the point where the zodiac begins. Ashvini carries the energy of the horse: speed, ' +
      'movement, healing, and new starts. It is the nakshatra of physicians, travelers, and those who move quickly ' +
      'between worlds. Associated with dawn, the first light, the flow of vital breath (Prana) and the impulse to ' +
      'begin. Excellent for starting journeys, medical work, and rapid change.',
  },
  {
    name: 'Bharani',
    epithet: 'The Bearers',
    deity: 'Yama (god of death and dharma)',
    planet: 'Venus (Shukra)',
    themes: 'Carrying, testing, transformation through difficulty.',
    description:
      'The nakshatra of responsibility and bearing what must be borne. Bharani carries the weight of karma and ' +
      'consequence. Symbolized by the Yoni (the womb), it is associated with birth, death, and the middle passage ' +
      '— the river crossing. A nakshatra of trials and testing; those born here often carry heavy responsibility. ' +
      'Good for work involving transformation, facing consequences, and deepening through difficulty.',
  },
  {
    name: 'Krittika',
    epithet: 'The Cutters',
    deity: 'Agni (fire god), Kartikeya (the celestial warrior general)',
    planet: 'Sun (Surya)',
    themes: 'Fire, cutting, purification through heat.',
    description:
      'The nakshatra of the sacred fire. Krittika is sharp, clarifying, and purifying — a nakshatra of critics, ' +
      'surgeons, and those who cut away the false to reveal the true. Associated with the Pleiades, it carries the ' +
      'energy of intense focus and laser-like precision. Auspicious for surgical work, intense practices, and ' +
      'situations requiring clarity and discernment.',
  },
  {
    name: 'Rohini',
    epithet: 'The Red One',
    deity: 'Brahma (creator)',
    planet: 'Moon (Chandra/Soma)',
    themes: 'Growth, fertility, beauty, abundance.',
    description:
      'The nakshatra of creation and abundance. Rohini is lush, fertile, and beautiful — a nakshatra of artists, ' +
      "farmers, and those who cultivate. Anchored by the brilliant star Aldebaran, it is the Moon's favorite " +
      'celestial resting place. It is considered one of the most auspicious nakshatras for growth and ' +
      'manifestation. Associated with the red lotus and with rasa (aesthetic experience and emotional flavor). ' +
      'Excellent for planting, creating, cultivating beauty, and all creative work.',
  },
  {
    name: 'Mrigashira',
    epithet: "The Deer's Head",
    deity: 'Soma (moon, the nectarine principle)',
    planet: 'Mars (Mangala)',
    themes: 'Seeking, searching, curiosity, softness.',
    description:
      'The wandering nakshatra — the deer always seeks, always searches. Mrigashira carries the energy of ' +
      'inquiry, exploration, and gentle seeking. It is a nakshatra of poets, scholars, and seekers. Associated ' +
      'with gentleness and the soft approach. Good for research, study, spiritual seeking, and any work involving ' +
      'curiosity and gentle inquiry.',
  },
  {
    name: 'Ardra',
    epithet: 'The Teardrop — The Moist One',
    deity: 'Rudra (the fierce aspect of Shiva)',
    planet: 'Rahu',
    themes: 'Storm, tears, emotional intensity, clearing.',
    description:
      'The naked star — raw, exposed, and weathered. Ardra is a nakshatra of storms (literal and emotional), ' +
      'tears, and the clearing power of intensity. It carries both danger and purification. Associated with ' +
      'sudden change and emotional release. Good for deep emotional work, clearing old patterns, and practices ' +
      'involving catharsis.',
  },
  {
    name: 'Punarvasu',
    epithet: 'The Return to Light',
    deity: 'Aditi (the infinite mother)',
    planet: 'Jupiter (Guru/Brihaspati)',
    themes: 'Renewal, bouncing back, return, mothering.',
    description:
      'The nakshatra of return and renewal. Symbolized by a quiver of arrows, Punarvasu is the star of those who ' +
      'return — after loss, after exile, after difficulty. It carries the energy of resilience and the grace of ' +
      'second chances. Associated with shelter, mothering, and the safety of returning home. Excellent for ' +
      'recovery, new beginnings after endings, and practices of forgiveness and return.',
  },
  {
    name: 'Pushya',
    epithet: 'The Nourisher',
    deity: 'Brihaspati (Jupiter, Guru of the Gods)',
    planet: 'Saturn (Shani)',
    themes: 'Nourishment, teaching, expansion, luck.',
    description:
      'One of the most auspicious nakshatras. Symbolized by the udder of a cow, Pushya is the star of nourishment ' +
      'and growth — spiritual, intellectual, and physical. It is a nakshatra of teachers, healers, and gurus. ' +
      'Associated with blessings, grace, and the outpouring of abundance. Excellent for all learning, teaching, ' +
      'spiritual initiation, and receiving blessings.',
  },
  {
    name: 'Ashlesha',
    epithet: 'The Coiled',
    deity: 'Serpent (Nagas, the wisdom keepers)',
    planet: 'Mercury (Budha)',
    themes: 'Coiling, cunning, hidden wisdom, poison and antidote.',
    description:
      'The nakshatra of the serpent — wisdom hidden in the coils. Ashlesha is mysterious, capable of both poison ' +
      'and healing. It is a nakshatra of secrets, occult knowledge, and deep transformation. Associated with ' +
      'intimacy (the coil), sensuality, and hidden powers. Good for deep inner work, working with shadow, and ' +
      'esoteric study.',
  },
  {
    name: 'Magha',
    epithet: 'The Mighty',
    deity: 'Ancestors (Pitris)',
    planet: 'Ketu',
    themes: 'Power, authority, the ancestral line, the past.',
    description:
      'The nakshatra of power and the throne. Magha is the star of kings and of those who carry ancestral ' +
      'authority and responsibility. It is deeply connected to the past, to family lineage, and to honoring what ' +
      'came before. A nakshatra of gravitas — however, its power demands absolute righteousness. If its regal ' +
      'authority is misused for ego, pride, or revenge, the karmic consequences are swift and severe, leading to ' +
      'a complete fall from grace. Good for honoring ancestors, claiming personal power, and working with family ' +
      'karma.',
  },
  {
    name: 'Purva Phalguni',
    epithet: 'The First Red',
    deity: 'Bhaga (the god of delight, fortune, and marital bliss)',
    planet: 'Venus (Shukra)',
    themes: 'Relaxation, enjoyment, beauty, romance.',
    description:
      'The nakshatra of ease and enjoyment. Purva Phalguni carries the energy of rest after labor, pleasure, and ' +
      'sensual appreciation. It is a nakshatra of beauty, romance, and the arts. Associated with dancing, ' +
      'singing, and celebration. Good for artistic work, romance, and allowing yourself to rest and enjoy the ' +
      'fruits of labor.',
  },
  {
    name: 'Uttara Phalguni',
    epithet: 'The Second Red',
    deity: 'Aryaman (the god of societal contracts, chivalry, and enduring unions)',
    planet: 'Sun (Surya)',
    themes: 'Steadiness, loyalty, finishing work, responsibility.',
    description:
      'The nakshatra of completion and steadiness. Where Purva Phalguni is relaxation, Uttara Phalguni is the ' +
      'return to responsibility and the finishing of work. It carries the energy of the sun — steadfast, loyal, ' +
      'and responsible. A nakshatra of those who complete what they start. Good for finishing projects, ' +
      'deepening commitment, and bearing authority with integrity.',
  },
  {
    name: 'Hasta',
    epithet: 'The Hand',
    deity: 'Savitur (the solar awakener)',
    planet: 'Moon (Chandra/Soma)',
    themes: 'Skill, craft, dexterity, cleverness, adaptability.',
    description:
      'The nakshatra of the hand — skillful, dexterous, and clever. Hasta carries the energy of artisans, ' +
      'craftspeople, and those who work with their hands. It is also the nakshatra of quick thinking and ' +
      'adaptation. Associated with messaging and communication through gesture and skill. Good for crafts, ' +
      'detail work, communication, and any work requiring manual skill and precision.',
  },
  {
    name: 'Chitra',
    epithet: 'The Bright One',
    deity: 'Tvastar (the cosmic artisan)',
    planet: 'Mars (Mangala)',
    themes: 'Beauty, design, creation, magic.',
    description:
      'The nakshatra of the cosmic artist. Chitra carries the energy of beauty, creative design, and the magic ' +
      'of bringing form into being. It is a nakshatra of architects, artists, designers, and magicians. ' +
      'Associated with vision and the ability to manifest beauty. Excellent for creative work, building, ' +
      'designing, and manifesting your vision into the world.',
  },
  {
    name: 'Swati',
    epithet: 'The Self-Going',
    deity: 'Vayu (god of wind, intelligence)',
    planet: 'Rahu',
    themes: 'Independence, movement, adaptability, intellect.',
    description:
      'The nakshatra of the individual and the free wind. Swati carries the energy of independence and the ' +
      'ability to move freely. It is a nakshatra of thinkers, philosophers, and those who question authority. ' +
      'Associated with intellect and the discriminating mind. Good for intellectual work, standing alone, ' +
      'independence, and clear thinking.',
  },
  {
    name: 'Vishakha',
    epithet: 'The Forked',
    deity: 'Indra and Agni (dual power)',
    planet: 'Jupiter (Guru)',
    themes: 'Duality, conflict, passion, transformation through struggle.',
    description:
      'The nakshatra of the fork in the road — choice and duality. Vishakha carries passionate energy and the ' +
      'ability to navigate between opposing forces. It is a nakshatra of warriors and those who transform ' +
      'struggle into power. Associated with perseverance through difficulty. Good for situations requiring ' +
      'choice, overcoming obstacles, and transforming conflict.',
  },
  {
    name: 'Anuradha',
    epithet: 'The Following Star',
    deity: 'Mitra (god of friendship and contracts)',
    planet: 'Saturn (Shani)',
    themes: 'Devotion, friendship, alliance, focused practice, following the path.',
    description:
      'The nakshatra of following and friendship. It carries a beautiful, gentle energy of unconditional ' +
      'loyalty, pure devotion, and cooperative growth. It represents the power to blossom like a lotus even in ' +
      'muddy or difficult surroundings. This is the energy of the dedicated student or companion who stays true ' +
      'to the path. Good for deepening your spiritual practice, building trustworthy partnerships, honoring a ' +
      'student-teacher bond, and performing group work focused on harmony and connection.',
  },
  {
    name: 'Jyeshtha',
    epithet: 'The Eldest',
    deity: 'Indra (King of the Gods)',
    planet: 'Mercury (Budha)',
    themes: 'Cosmic authority, seniority, absolute protection, intelligence through trial.',
    description:
      'The nakshatra of the eldest and the victorious. Jyeshtha carries the fierce, defensive power of the ' +
      'veteran warrior or the eldest protector. It is a star of immense psychological and spiritual authority ' +
      'won through surviving deep trials, crises, and challenges. It represents hard-earned wisdom, the mastery ' +
      'of hidden forces, and the power to defend your territory against all odds. Jyeshtha carries the energy of ' +
      'one who has overcome and proven themselves. Good for overcoming challenges, claiming authority, and ' +
      'practices involving discernment and intelligence.',
  },
  {
    name: 'Mula',
    epithet: 'The Root',
    deity: 'Nirṛti (Mahakali)',
    planet: 'Ketu',
    themes: 'Uprooting, cosmic extraction, the unmanifested abyss, radical truth.',
    description:
      'Physically aligning with the Galactic Center (the supermassive black hole at the heart of our galaxy), ' +
      'Mula is the ultimate cosmic vortex. Ruled by Mahakali, it represents a fierce, absolute force that does ' +
      'not just prune the branches — it digs straight into the deepest soil of the universe and your mind to ' +
      'pull illusions out by their very roots. It is the energy of total breakdown, severe detangling of old ' +
      'karma, and the violent but necessary destruction of the ego to uncover the primordial truth. Good for ' +
      'drastic psychological breakthroughs, forcefully tearing out toxic habits or ancestral loops, demanding ' +
      'absolute truth from yourself, and completely resetting your life from the absolute foundation.',
  },
  {
    name: 'Purva Ashadha',
    epithet: 'The First Undefeated',
    deity: 'Āpaḥ (also spelled Apas), the Goddess of the Cosmic Waters',
    planet: 'Venus (Shukra)',
    themes: 'Victory, invincibility, beauty, illusion.',
    description:
      'The nakshatra of triumph and beauty. Purva Ashadha carries the energy of the victor — it is called "the ' +
      'undefeated." It is also the nakshatra of illusion and seduction. Associated with beauty, charm, and the ' +
      'power to attract. Good for projects aimed at victory, artistic work, and all things involving beauty and ' +
      'magnetism.',
  },
  {
    name: 'Uttara Ashadha',
    epithet: 'The Second Undefeated',
    deity: 'The Vishvadevas (the Universal Gods)',
    planet: 'Sun (Surya)',
    themes: 'Leadership, universal victory, deep integrity.',
    description:
      'Anchored by the brilliant, blue-white star Vega (known in Sanskrit as Abhijit, the victorious star), this ' +
      'nakshatra shifts victory away from personal ego and toward cosmic law (dharma). Due to the ' +
      "Earth's 26,000-year precession wobble, Vega will become our North Star in 14,000 years, serving as the " +
      'celestial anchor during the absolute apex of the Satya Yuga (the Golden Age). It is the ultimate celestial ' +
      'anchor of unbending truth, fairness, and permanent success. It represents the steady, enduring triumph ' +
      'that comes from absolute honesty and a commitment to the greater good. It is the star of the righteous ' +
      'leader whose authority is built on pure integrity. Good for stepping into roles of heavy responsibility, ' +
      'making long-term commitments, serving a cause greater than yourself, and anchoring your intentions in ' +
      'unshakeable truth and honor.',
  },
  {
    name: 'Shravana',
    epithet: 'The Hearing',
    deity: 'Vishnu (preservation)',
    planet: 'Moon (Chandra/Soma)',
    themes: 'Listening, learning, transmission, the ear.',
    description:
      'The nakshatra of the ear and of deep listening. Shravana carries the energy of one who silently receives ' +
      'teachings, making it the star of students, disciples, and those who preserve knowledge through oral ' +
      'tradition. Esoterically, it is the ultimate anchor for Nada Yoga — the meditation on sacred sound ' +
      'vibrations. It governs the shift from listening to external speech to tuning inward to hear the subtle, ' +
      'unstruck melodies of cosmic consciousness. Excellent for learning, receiving initiation, practicing Nada ' +
      'Yoga or chanting mantras, studying complex teachings, and cultivating deep, receptive silence.',
  },
  {
    name: 'Dhanishtha',
    epithet: 'The Wealthiest',
    deity: 'The Ashta Vasus (the Eight Gods of Abundance)',
    planet: 'Mars (Mangala)',
    themes: 'Timing, rhythm, material prosperity, warrior prowess, cosmic vibration.',
    description:
      "Symbolized by Lord Shiva's drum (the Damaru) and the flute, Dhanishtha carries the raw, pulsing rhythm of " +
      'life itself. Driven by the explosive power of Mars, it represents the victorious warrior who achieves ' +
      'massive abundance through flawless execution and cosmic timing. Like a drum creating sound from its ' +
      'hollow interior, this star teaches that true prosperity is birthed when we clear our internal noise and ' +
      'move in perfect harmony with the universe. Good for structuring major financial plans, matching your ' +
      'daily actions to flawless timing, stepping into high-energy or competitive projects, and using music, ' +
      'rhythm, or mantra to synchronize your mind.',
  },
  {
    name: 'Shatabhisha',
    epithet: 'The Hundred Physicians',
    deity: 'Varuna (god of cosmic waters and hidden laws)',
    planet: 'Rahu',
    themes: 'Mystical healing, the collective void, isolation, unconventional truth.',
    description:
      'Symbolized by a closed circle, Shatabhisha rules over solutions that conventional methods cannot reach. ' +
      'It is inherently the star of the "Wounded Healer" — those whose profound curative gifts are born directly ' +
      'from navigating their own intense isolation, crises, or betrayal by society. Driven by Rahu\'s ' +
      'boundary-breaking vision, its unconventional medicine is frequently misunderstood, feared, or rejected by ' +
      'standard institutions before its brilliance is realized. It teaches that the ultimate cure is found by ' +
      'going into the quiet, inner space to transmute pain into wisdom. It is a nakshatra of those who work with ' +
      'the occult and with the secrets of nature. Associated with water, electricity, and invisible forces. Good ' +
      'for healing work, working with hidden knowledge, confronting long-hidden emotional wounds, initiating ' +
      'complex or alternative therapies, defending your truth in the face of judgment, and stepping back into ' +
      'intentional solitude to recharge.',
  },
  {
    name: 'Purva Bhadrapada',
    epithet: 'The First of the Fortunate',
    deity: 'Aja Ekapada (the one-footed cosmic serpent/fire dragon)',
    planet: 'Jupiter (Brihaspati/Guru)',
    themes: 'Purifying fire (Tapas), radical transformation, spiritual warfare.',
    description:
      'The nakshatra of the spiritual warrior. Purva Bhadrapada is a nakshatra of those who seek the spiritual ' +
      'with intensity and dedication. Representing the front legs of the funeral cot, this is the star of the ' +
      'fierce spiritual revolutionary. It carries a blazing, passionate energy of intense self-discipline and ' +
      'austerity. Under the influence of the storm-serpent Aja Ekapada, it forces a practitioner to confront ' +
      'harsh dualities and burn away the final illusions of ego and comfort to raise their spiritual evolution. ' +
      'Good for intense spiritual practice, undergoing radical lifestyle purges, breaking away from material ' +
      'stagnation, and cutting through deep delusions with sharp discernment.',
  },
  {
    name: 'Uttara Bhadrapada',
    epithet: 'The Second of the Fortunate',
    deity: 'Ahirbudhnya (the serpent of the deep ocean of consciousness)',
    planet: 'Saturn (Shani)',
    themes: 'Yogic stillness, deep containment, emotional maturity, permanent foundations.',
    description:
      'The nakshatra of fulfillment and completion. Representing the rear legs of the funeral cot, this star ' +
      'brings the fierce fire of the previous star into perfect, cool stabilization. Governed by Saturn and the ' +
      'primordial Naga Ahirbudhnya, it represents the quiet fulfillment of long-term practice — the serene, ' +
      'unshakeable depth of a master who needs no external validation. It brings the "cosmic rain" that sustains ' +
      'and grounds spiritual maturity. Good for entering quiet meditation or yogic sleep (Yoga Nidra), anchoring ' +
      'permanent stability in your life, practicing silent patience, and bringing a long spiritual cycle to a ' +
      'peaceful completion.',
  },
  {
    name: 'Revati',
    epithet: 'The Rich',
    deity: 'Pushan (the cosmic guide)',
    planet: 'Mercury (Budha)',
    themes: 'Abundance, protection, total completion, crossing the threshold.',
    description:
      'The final nakshatra — the one standing at the threshold of the next cycle. Under the care of Pushan, the ' +
      'protector of travelers, Revati is associated with wealth in all its forms, safety, and smooth passage ' +
      'over the thresholds of life. It is the nakshatra of the compassionate guide who ensures no one is left ' +
      'behind. It carries a deeply nurturing energy that protects the vulnerable and blesses completions. Good ' +
      'for completing cycles, safe travel, and all work involving protection and guidance.',
  },
];

// The small note shown at the bottom of the Nakshatra accordion, explaining
// how nakshatras differ conceptually from Nityas — kept here for the same
// future-translation reason as everything else in this file.
const PC_NAKSHATRA_DIFF_NOTE =
  'How Nakshatras Differ from Nityas: The nakshatras are the 27 stations through which the moon travels in a ' +
  'sidereal month. Each has a presiding deity, a ruling planet, and distinct qualities. Unlike the Nityas (which ' +
  'measure lunar phases), the nakshatras measure the moon’s journey through the constellations — a spatial ' +
  'rather than temporal division.';
