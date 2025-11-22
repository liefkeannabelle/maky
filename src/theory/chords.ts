// src/theory/chords.ts

/**
 * Chord vocabulary + parsing utilities for ChordConnect.
 *
 * Based on standard lead-sheet chord notation and a large
 * guitar chord-type list (triads, sus/add, 6/7/9/11/13,
 * altered 7 chords, m7b5, maj7#5, etc.).
 */

// 12 canonical roots (sharp spelling) we use for generation / storage.
export const CANONICAL_ROOTS = [
  "A",
  "A#",
  "B",
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
] as const;

export type ChordRoot = (typeof CANONICAL_ROOTS)[number];

// All root spellings we accept on input (incl. flats), mapped to canonical.
const ROOT_ALIASES: Record<string, ChordRoot> = {
  // canonical spellings map to themselves
  A: "A",
  "A#": "A#",
  B: "B",
  C: "C",
  "C#": "C#",
  D: "D",
  "D#": "D#",
  E: "E",
  F: "F",
  "F#": "F#",
  G: "G",
  "G#": "G#",

  // flat spellings -> enharmonic sharps
  Bb: "A#",
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
};

// For parsing roots, we want to match the longest possible symbol first
// (e.g. "C#" before "C").
const ROOT_SYMBOLS_DESC = Object.keys(ROOT_ALIASES).sort(
  (a, b) => b.length - a.length,
);

/**
 * A curated set of chord suffixes (types) we explicitly support.
 * These are suffixes AFTER the root, e.g. "m7", "maj7", "sus2", "add9", "7#9"...
 *
 * Derived from a large guitar chord dictionary of chord types:
 *  - major, m, sus2, sus4
 *  - add2, add9, add4, madd2, madd9, madd4, add2add4, madd2add4
 *  - aug, dim, dim7, 5 (power chord)
 *  - 6, m6, 6/9, m6/9, 6/7, m6/7, maj6/7
 *  - 7, m7, maj7, 7sus4, 7sus2, 7add4, m7add4
 *  - 9, m9, maj9, 9sus4
 *  - 11, m11, maj11
 *  - 13, m13, maj13, 13sus4
 *  - mmaj7, mmaj9
 *  - altered dominants: 7#9, 7b9, 7#5, 7b5, 9#5, 9b5
 *  - altered minors/majors: m7#5, m7b5, maj7#5, maj7b5
 *
 * Plain major triads use the empty string "".
 */
export const COMMON_CHORD_SUFFIXES = [
  "", // plain major triad, e.g. "C"

  "m",
  "sus2",
  "sus4",
  "add2",
  "add9",
  "add4",
  "madd2",
  "madd9",
  "madd4",
  "add2add4",
  "madd2add4",

  "aug",
  "dim",
  "dim7",
  "5",

  "6",
  "m6",
  "6/9",
  "m6/9",
  "6/7",
  "m6/7",
  "maj6/7",

  "7",
  "m7",
  "maj7",
  "7sus4",
  "7sus2",
  "7add4",
  "m7add4",

  "9",
  "m9",
  "maj9",
  "9sus4",

  "11",
  "m11",
  "maj11",

  "13",
  "m13",
  "maj13",
  "13sus4",

  "mmaj7",
  "mmaj9",

  "7#9",
  "7b9",
  "7#5",
  "7b5",
  "m7#5",
  "m7b5",
  "maj7#5",
  "maj7b5",
  "9#5",
  "9b5",
] as const;

export type ChordSuffix = (typeof COMMON_CHORD_SUFFIXES)[number];

export interface ParsedChordSymbol {
  /** Normalized root (sharps only, e.g. "A#", "C#", "F#"). */
  root: ChordRoot;
  /** Suffix/type, e.g. "m", "maj7", "add9", "7#9" or "" for a plain major triad. */
  suffix: ChordSuffix;
  /**
   * Optional bass note for slash chords, normalized to canonical root spelling.
   * E.g. "G" in "Cmaj7/G".
   */
  bass?: ChordRoot;
}

/**
 * Convert Unicode sharps/flats and odd spacing to ASCII.
 * This runs BEFORE we parse.
 */
export function sanitizeChordInput(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, "") // remove internal spaces
    .replace(/♭/g, "b")
    .replace(/♯/g, "#")
    .replace(/–/g, "-");
}

/**
 * Try to parse a chord symbol into (root, suffix, bass).
 *
 * Supports:
 *  - roots in sharps or flats: C, C#, Db, Eb, etc.
 *  - suffixes from COMMON_CHORD_SUFFIXES
 *  - optional slash chord bass note, e.g. "Cmaj7/G"
 */
export function parseChordSymbol(raw: string): ParsedChordSymbol | null {
  const input = sanitizeChordInput(raw);
  if (!input) return null;

  // Handle slash chords: split into head and bass.
  let head = input;
  let bassPart: string | undefined;
  const slashIndex = input.indexOf("/");
  if (slashIndex >= 0) {
    head = input.slice(0, slashIndex);
    bassPart = input.slice(slashIndex + 1);
  }

  // Parse head: find the longest root symbol at the start.
  let matchedRootAlias: string | null = null;
  for (const candidate of ROOT_SYMBOLS_DESC) {
    if (head.startsWith(candidate)) {
      matchedRootAlias = candidate;
      break;
    }
  }

  if (!matchedRootAlias) {
    return null; // no recognizable root at the start
  }

  const canonicalRoot = ROOT_ALIASES[matchedRootAlias] as ChordRoot;
  const suffixRaw = head.slice(matchedRootAlias.length);
  const suffix = normalizeSuffix(suffixRaw);

  if (!COMMON_CHORD_SUFFIXES.includes(suffix)) {
    return null; // unknown/unsupported chord type
  }

  let bass: ChordRoot | undefined;
  if (bassPart) {
    const bassRoot = parseBassRoot(bassPart);
    if (!bassRoot) return null;
    bass = bassRoot;
  }

  return {
    root: canonicalRoot,
    suffix,
    bass,
  };
}

/**
 * Normalize the suffix string into one of our common suffixes.
 *
 * Here we can fold simple synonyms, e.g. "min" -> "m".
 * More elaborate synonym handling can be added as needed.
 */
function normalizeSuffix(rawSuffix: string): ChordSuffix {
  const s = rawSuffix.trim();

  if (s === "" || s === "maj" || s === "M") {
    // plain major triad (C, F, etc.)
    return "" as ChordSuffix;
  }

  // Basic synonyms for minor
  if (s === "min" || s === "-") return "m" as ChordSuffix;

  // We could add more synonym mapping here (e.g. "Δ7" -> "maj7"),
  // but for now we keep it minimal and rely mostly on the canonical list.
  const found = COMMON_CHORD_SUFFIXES.find((suffix) => suffix === s);
  return (found ?? ("__INVALID__" as ChordSuffix));
}

/**
 * Parse a bass root (right side of a slash chord).
 * Accepts sharps/flats, normalizes to canonical spelling.
 */
function parseBassRoot(rawBass: string): ChordRoot | null {
  const bassInput = rawBass.trim();
  for (const candidate of ROOT_SYMBOLS_DESC) {
    if (bassInput === candidate) {
      return ROOT_ALIASES[candidate] ?? null;
    }
  }
  return null;
}

/**
 * Check if a chord symbol is valid according to:
 *  - recognizable root (with sharps/flats normalized)
 *  - suffix in our COMMON_CHORD_SUFFIXES list (after normalization)
 *  - optional valid slash bass root
 */
export function isValidChordSymbol(raw: string): boolean {
  const parsed = parseChordSymbol(raw);
  return parsed !== null;
}

/**
 * Normalize a chord symbol to a canonical form:
 *  - root in sharps (e.g. "Bb" -> "A#")
 *  - suffix from COMMON_CHORD_SUFFIXES
 *  - bass root (if present) also canonical
 *
 * Returns null if the symbol is invalid.
 *
 * Examples:
 *   "Bbmaj7" -> "A#maj7"
 *   "cmin7"  -> "Cm7"
 *   "D/F#"   -> "D/F#"
 */
export function normalizeChordSymbol(raw: string): string | null {
  const parsed = parseChordSymbol(raw);
  if (!parsed) return null;

  const { root, suffix, bass } = parsed;
  const head = suffix === "" ? root : `${root}${suffix}`;
  if (bass) return `${head}/${bass}`;
  return head;
}

/**
 * Generate a large vocabulary of "common guitar chords" by:
 *  - combining each canonical root with each suffix
 *  - optionally generating slash chords (simple inversions)
 */
export interface GenerateChordVocabularyOptions {
  includeSlashChords?: boolean;
}

/**
 * Generate chord names like:
 *  C, Cm, C7, Cmaj7, Csus2, Cadd9, C6/9, C7#9, C9b5, ...
 *  in all 12 roots.
 *
 * If includeSlashChords is true, also generate simple
 * slash chords for major and minor triads:
 *  - e.g. "C/E", "C/G", "Am/G", etc.
 */
export function generateChordVocabulary(
  options: GenerateChordVocabularyOptions = {},
): string[] {
  const { includeSlashChords = false } = options;

  const names: string[] = [];

  for (const root of CANONICAL_ROOTS) {
    for (const suffix of COMMON_CHORD_SUFFIXES) {
      const name = suffix === "" ? root : `${root}${suffix}`;
      names.push(name);
    }
  }

  if (includeSlashChords) {
    // Only generate slash chords for plain major/minor triads
    const baseMajorMinor = CANONICAL_ROOTS.flatMap((root) => [
      root,
      `${root}m`,
    ]);

    for (const base of baseMajorMinor) {
      const baseRoot = base.replace("m", "") as ChordRoot;
      for (const bass of CANONICAL_ROOTS) {
        if (bass === baseRoot) continue; // avoid e.g. "C/C"
        names.push(`${base}/${bass}`);
      }
    }
  }

  // Ensure uniqueness and sort for stability.
  return Array.from(new Set(names)).sort();
}

export function listChordSymbols(): string[] {
  // If you have generateChordVocabulary:
  return generateChordVocabulary({ includeSlashChords: true });
}


