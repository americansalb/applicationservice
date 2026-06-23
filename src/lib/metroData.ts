// Per-metro Limited English Proficiency (LEP) language data for the Phase 0
// wizard, plus the full language catalog. This is AALB's published data (the
// same figures behind languages.aalb.org), derived from the U.S. Census Bureau
// ACS 2020 to 2024 5-Year PUMS, snapshotted here so the wizard does not depend
// on scraping HTML at runtime. The dataset covers all 366 metros and 118
// languages; getMetroProfile / searchMetros / aggregateLanguages are the seams.

import metrosData from "./data/metros.json";
import { LANGUAGE_CATALOG } from "./data/languageCatalog";

export type MetroLanguage = {
  name: string;
  lepCount: number; // residents who speak English less than "very well"
  lepRate: number; // percent of that language's speakers who are LEP
};

export type MetroProfile = {
  slug: string; // matches languages.aalb.org/metro/{slug}
  name: string;
  lepTotal: number | null;
  languages: MetroLanguage[]; // ordered by lepCount, descending
};

export type MetroSummary = { slug: string; name: string; lepTotal: number | null };

export const SOURCE = "U.S. Census Bureau, ACS 2020 to 2024 5-Year PUMS";

const METROS = metrosData as MetroProfile[];
const BY_SLUG = new Map(METROS.map((m) => [m.slug, m]));

export const METRO_COUNT = METROS.length;
export { LANGUAGE_CATALOG };

export function getMetroProfile(
  slug: string | null | undefined
): MetroProfile | null {
  if (!slug) return null;
  return BY_SLUG.get(slug) ?? null;
}

// Type-ahead for the footprint picker: case-insensitive match on the metro
// name, largest (by LEP population) first, capped.
export function searchMetros(query: string, limit = 8): MetroSummary[] {
  const q = query.trim().toLowerCase();
  const pool = q
    ? METROS.filter((m) => m.name.toLowerCase().includes(q))
    : METROS;
  return pool
    .slice()
    .sort((a, b) => (b.lepTotal ?? 0) - (a.lepTotal ?? 0))
    .slice(0, limit)
    .map((m) => ({ slug: m.slug, name: m.name, lepTotal: m.lepTotal }));
}

export type AggregatedLanguage = {
  name: string;
  lepCount: number; // summed across the selected metros
  metroCount: number; // how many of the selected metros it appears in
};

export type Aggregate = {
  lepTotal: number; // summed LEP residents across selected metros
  languages: AggregatedLanguage[]; // combined, descending by lepCount
  knownSlugs: string[]; // selected slugs that resolved to real metros
};

// Combine the language reality across every metro the institution serves, so a
// multi-site system sees one picture instead of several. Languages are summed
// by LEP count; we also track how many of their metros each shows up in.
export function aggregateLanguages(slugs: string[]): Aggregate {
  const byLang = new Map<string, { lepCount: number; metroCount: number }>();
  let lepTotal = 0;
  const knownSlugs: string[] = [];
  for (const slug of slugs) {
    const m = BY_SLUG.get(slug);
    if (!m) continue;
    knownSlugs.push(slug);
    lepTotal += m.lepTotal ?? 0;
    for (const l of m.languages) {
      const cur = byLang.get(l.name) ?? { lepCount: 0, metroCount: 0 };
      cur.lepCount += l.lepCount;
      cur.metroCount += 1;
      byLang.set(l.name, cur);
    }
  }
  const languages = [...byLang.entries()]
    .map(([name, v]) => ({ name, lepCount: v.lepCount, metroCount: v.metroCount }))
    .sort((a, b) => b.lepCount - a.lepCount);
  return { lepTotal, languages, knownSlugs };
}
