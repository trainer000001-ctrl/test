import type { WorldIdentifier } from "./empire-registry";

export interface LuminousAttributeEntry {
  readonly id: string;
  readonly arabic: string;
  readonly transliteration: string;
  readonly meaning: string;
  readonly linkedWorldId: WorldIdentifier;
  readonly worldLabel: string;
  readonly contemplation: string;
  readonly practicePrompt: string;
}

export interface TasbihPhraseEntry {
  readonly id: string;
  readonly arabic: string;
  readonly transliteration: string;
  readonly translation: string;
  readonly targetCount: number;
  readonly heartFocus: string;
}

export const LUMINOUS_NAMES_OF_ALLAH: readonly LuminousAttributeEntry[] = [
  {
    id: "an-nur",
    arabic: "النُّور",
    transliteration: "An-Nūr",
    meaning: "The Source of Infinite Light",
    linkedWorldId: "arsy",
    worldLabel: "ARSY · Zenith Meridian",
    contemplation:
      "Every clarity in reason, beauty in creation, and guidance in conscience is a ray borrowed from His Light.",
    practicePrompt: "Begin each work session seeking clarity of truth over applause.",
  },
  {
    id: "ar-rahman",
    arabic: "الرَّحْمَـٰن",
    transliteration: "Ar-Raḥmān",
    meaning: "The Boundlessly Merciful",
    linkedWorldId: "moonwitness",
    worldLabel: "MOONWITNESS · Sanctuary Archive",
    contemplation:
      "Mercy encompasses creation before judgment; it heals fractured stories while keeping accountable truth intact.",
    practicePrompt:
      "Respond gently to human frailty—starting with clear humility toward your own errors.",
  },
  {
    id: "al-hakim",
    arabic: "الْحَكِيم",
    transliteration: "Al-Ḥakīm",
    meaning: "The All-Wise",
    linkedWorldId: "sidra",
    worldLabel: "SIDRA · Cosmic Order",
    contemplation:
      "From subatomic symmetry to planetary orbits, nothing in His design is careless or accidental.",
    practicePrompt: "Replace hurried noise with deliberate, well-proportioned architecture.",
  },
  {
    id: "ash-shakur",
    arabic: "الشَّكُور",
    transliteration: "Ash-Shakūr",
    meaning: "The Most Appreciative",
    linkedWorldId: "human-pen",
    worldLabel: "HUMAN-PEN · Scriptorium of Gratitude",
    contemplation:
      "He notices every silent kindness, every unseen midnight repair, and multiplies sincere gratitude beyond measure.",
    practicePrompt: "Name three daily blessings right now and thank Him sincerely.",
  },
  {
    id: "as-salam",
    arabic: "السَّلَام",
    transliteration: "As-Salām",
    meaning: "The Source of Wholeness & Peace",
    linkedWorldId: "arsy",
    worldLabel: "ARSY · Stillness Carrier",
    contemplation:
      "True serenity is not the absence of duty, but steady confidence anchored in ethical stewardship.",
    practicePrompt: "Exhale anxiety and align conscience before continuing your craft.",
  },
  {
    id: "al-badi",
    arabic: "الْبَدِيع",
    transliteration: "Al-Badī‘",
    meaning: "The Incomparable Originator",
    linkedWorldId: "rocksoul-dx",
    worldLabel: "ROCKSOUL DX · Sacred Geometry",
    contemplation:
      "Creation unfolds in coherent beauty, symmetry, and living order without fatigue.",
    practicePrompt: "Build with wonder and intellectual humility toward cosmic order.",
  },
  {
    id: "al-quddus",
    arabic: "الْقُدُّوس",
    transliteration: "Al-Quddūs",
    meaning: "The Pure & Sacred",
    linkedWorldId: "human-pen",
    worldLabel: "HUMAN-PEN · Clean Intention",
    contemplation:
      "Transcendent purity invites transparent architecture—free from deceit, vanity, and manipulation.",
    practicePrompt: "Keep output accurate, transparent, and uncorrupted by ego.",
  },
  {
    id: "al-wadud",
    arabic: "الْوَدُود",
    transliteration: "Al-Wadūd",
    meaning: "The Most Loving & Affectionate",
    linkedWorldId: "moonwitness",
    worldLabel: "MOONWITNESS · Testimony of Love",
    contemplation:
      "His tender closeness uplifts the repentant and fills every righteous act of service with warmth.",
    practicePrompt: "Build tools and words that genuinely lighten another soul’s burden.",
  },
  {
    id: "al-alim",
    arabic: "الْعَلِيم",
    transliteration: "Al-‘Alīm",
    meaning: "The All-Knowing Witness",
    linkedWorldId: "sidra",
    worldLabel: "SIDRA · Living Knowledge",
    contemplation:
      "Every hidden variable, unspoken prayer, and unrecorded act of integrity is fully known to Him.",
    practicePrompt: "Write the hidden internals with the same care as the visible threshold.",
  },
] as const;

export const TASBIH_PHRASES: readonly TasbihPhraseEntry[] = [
  {
    id: "subhanallah",
    arabic: "سُبْحَانَ اللَّهِ",
    transliteration: "Subḥānallāh",
    translation: "Glory be to Allah — Pure & exalted above all imperfection.",
    targetCount: 33,
    heartFocus: "Awe at cosmic perfection & liberation from self-importance",
  },
  {
    id: "alhamdulillah",
    arabic: "الْحَمْدُ لِلَّهِ",
    transliteration: "Alḥamdulillāh",
    translation: "All praise & heartfelt gratitude belong solely to Allah.",
    targetCount: 33,
    heartFocus: "Joyful shukr for breath, intellect, sight, and purpose",
  },
  {
    id: "allahu-akbar",
    arabic: "اللَّهُ أَكْبَرُ",
    transliteration: "Allāhu Akbar",
    translation: "Allah is Greater than every fear, deadline, or earthly weight.",
    targetCount: 33,
    heartFocus: "Courage, perspective, and humility of craftsmanship",
  },
  {
    id: "tahlil",
    arabic: "لَا إِلَٰهَ إِلَّا اللَّهُ",
    transliteration: "Lā ilāha illallāh",
    translation: "There is no deity worthy of devotion except Allah alone.",
    targetCount: 33,
    heartFocus: "Monocentric Tawḥīd — anchoring every intention purely in Him",
  },
  {
    id: "istighfar",
    arabic: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ",
    transliteration: "Astaghfirullāh al-‘Aẓīm",
    translation: "I seek forgiveness from Allah, the Supreme & Most Merciful.",
    targetCount: 33,
    heartFocus: "Sincere honesty after stumbles — turning back cleanly toward Light",
  },
] as const;
