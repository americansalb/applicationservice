// Per-metro Limited English Proficiency (LEP) language data for the Phase 0
// wizard. It lets an institution see the language reality of the community it
// serves and lets us compute coverage gaps against that reality.
//
// These are AALB's published figures, the same data behind languages.aalb.org,
// derived from the U.S. Census Bureau ACS 2020 to 2024 5-Year PUMS. That site
// exposes no JSON/CSV/API, and scraping HTML on every render would be fragile
// and slow, so the figures for current client metros are snapshotted here for
// reliability. getMetroProfile is the single seam: a live feed or shared data
// package can replace this snapshot later without touching the wizard.

export type MetroLanguage = {
  name: string;
  // Residents who speak this language and report speaking English less than
  // "very well" (the Census LEP threshold).
  lepCount: number;
  // Share of that language's speakers who are LEP, as a percentage.
  lepRate: number;
};

export type MetroProfile = {
  slug: string; // matches languages.aalb.org/metro/{slug}
  name: string;
  lepTotal: number; // total LEP residents across all languages in the metro
  source: string;
  languages: MetroLanguage[]; // ordered by lepCount, descending
};

const SOURCE = "U.S. Census Bureau, ACS 2020 to 2024 5-Year PUMS";

const METROS: MetroProfile[] = [
  {
    slug: "new-york-newark-jersey-city-ny-nj-pa",
    name: "New York-Newark-Jersey City, NY-NJ-PA",
    lepTotal: 3238693,
    source: SOURCE,
    languages: [
      { name: "Spanish", lepCount: 1709026, lepRate: 45.9 },
      { name: "Chinese", lepCount: 244554, lepRate: 60.2 },
      { name: "Russian", lepCount: 131369, lepRate: 50.9 },
      { name: "Mandarin Chinese", lepCount: 92297, lepRate: 60.2 },
      { name: "Bengali", lepCount: 83075, lepRate: 50.5 },
      { name: "Korean", lepCount: 80772, lepRate: 52.9 },
      { name: "Yiddish", lepCount: 80600, lepRate: 49.2 },
      { name: "Haitian Creole", lepCount: 77448, lepRate: 38.7 },
      { name: "Cantonese", lepCount: 64124, lepRate: 58.5 },
      { name: "Arabic", lepCount: 59949, lepRate: 34.6 },
      { name: "Portuguese", lepCount: 55744, lepRate: 40.1 },
      { name: "Polish", lepCount: 47172, lepRate: 40.5 },
      { name: "Italian", lepCount: 43348, lepRate: 29.6 },
      { name: "French", lepCount: 34695, lepRate: 24.2 },
      { name: "Urdu", lepCount: 33782, lepRate: 34.5 },
    ],
  },
  {
    slug: "los-angeles-long-beach-anaheim-ca",
    name: "Los Angeles-Long Beach-Anaheim, CA",
    lepTotal: 2721808,
    source: SOURCE,
    languages: [
      { name: "Spanish", lepCount: 1723306, lepRate: 40.7 },
      { name: "Vietnamese", lepCount: 164803, lepRate: 60.6 },
      { name: "Chinese", lepCount: 146718, lepRate: 54.8 },
      { name: "Korean", lepCount: 131267, lepRate: 55.9 },
      { name: "Armenian", lepCount: 82476, lepRate: 44.0 },
      { name: "Tagalog", lepCount: 71580, lepRate: 32.0 },
      { name: "Mandarin Chinese", lepCount: 55373, lepRate: 54.8 },
      { name: "Cantonese", lepCount: 53439, lepRate: 57.8 },
      { name: "Persian", lepCount: 43209, lepRate: 38.6 },
      { name: "Russian", lepCount: 29221, lepRate: 44.9 },
      { name: "Japanese", lepCount: 27014, lepRate: 41.8 },
      { name: "Arabic", lepCount: 24309, lepRate: 30.7 },
      { name: "Khmer", lepCount: 17030, lepRate: 54.7 },
      { name: "Filipino", lepCount: 14371, lepRate: 29.7 },
      { name: "Thai", lepCount: 13585, lepRate: 56.7 },
    ],
  },
  {
    slug: "chicago-naperville-elgin-il-in-wi",
    name: "Chicago-Naperville-Elgin, IL-IN-WI",
    lepTotal: 999077,
    source: SOURCE,
    languages: [
      { name: "Spanish", lepCount: 624403, lepRate: 39.0 },
      { name: "Polish", lepCount: 68742, lepRate: 42.7 },
      { name: "Chinese", lepCount: 26305, lepRate: 47.1 },
      { name: "Arabic", lepCount: 20361, lepRate: 30.6 },
      { name: "Gujarati", lepCount: 18810, lepRate: 39.5 },
      { name: "Korean", lepCount: 17709, lepRate: 49.6 },
      { name: "Russian", lepCount: 17665, lepRate: 40.7 },
      { name: "Ukrainian", lepCount: 17572, lepRate: 58.6 },
      { name: "Urdu", lepCount: 14986, lepRate: 25.8 },
      { name: "Tagalog", lepCount: 14635, lepRate: 25.3 },
      { name: "Vietnamese", lepCount: 10456, lepRate: 51.4 },
      { name: "Mandarin Chinese", lepCount: 9928, lepRate: 47.1 },
      { name: "Cantonese", lepCount: 8826, lepRate: 61.0 },
      { name: "Hindi", lepCount: 6669, lepRate: 16.3 },
      { name: "Romanian", lepCount: 6669, lepRate: 32.9 },
    ],
  },
  {
    slug: "miami-fort-lauderdale-pompano-beach-fl",
    name: "Miami-Fort Lauderdale-Pompano Beach, FL",
    lepTotal: 1446513,
    source: SOURCE,
    languages: [
      { name: "Spanish", lepCount: 1194345, lepRate: 46.7 },
      { name: "Haitian Creole", lepCount: 127038, lepRate: 42.1 },
      { name: "Portuguese", lepCount: 30175, lepRate: 36.6 },
      { name: "Russian", lepCount: 14377, lepRate: 43.6 },
      { name: "French", lepCount: 13196, lepRate: 26.6 },
      { name: "Chinese", lepCount: 8454, lepRate: 53.4 },
      { name: "Vietnamese", lepCount: 8081, lepRate: 61.2 },
      { name: "Italian", lepCount: 4190, lepRate: 23.2 },
      { name: "Arabic", lepCount: 4009, lepRate: 20.7 },
      { name: "Bengali", lepCount: 3246, lepRate: 42.9 },
      { name: "Mandarin Chinese", lepCount: 3191, lepRate: 53.4 },
      { name: "Hebrew", lepCount: 2569, lepRate: 14.5 },
      { name: "Romanian", lepCount: 2452, lepRate: 32.6 },
      { name: "Polish", lepCount: 2372, lepRate: 32.9 },
      { name: "Turkish", lepCount: 2074, lepRate: 36.2 },
    ],
  },
];

// Options for the location question, alphabetized by name.
export const METRO_LIST: { slug: string; name: string }[] = METROS.map((m) => ({
  slug: m.slug,
  name: m.name,
})).sort((a, b) => a.name.localeCompare(b.name));

export function normalizeMetroSlug(input: string | null | undefined): string {
  return (input || "").trim().toLowerCase();
}

// Resolve a metro by slug. Returns null for an unknown or "not listed" slug; the
// wizard treats null as the fallback path (no profile or gap screens) and never
// blocks on a missing metro.
export function getMetroProfile(
  slug: string | null | undefined
): MetroProfile | null {
  const s = normalizeMetroSlug(slug);
  if (!s) return null;
  return METROS.find((m) => m.slug === s) ?? null;
}

// Top languages by LEP population. Used to seed selectable options and to flag
// high-prevalence languages an institution has not accounted for.
export function topMetroLanguages(
  profile: MetroProfile,
  n: number
): MetroLanguage[] {
  return profile.languages.slice(0, n);
}
