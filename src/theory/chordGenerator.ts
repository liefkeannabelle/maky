// src/theory/chordGenerator.ts

/**
 * Algorithmic chord diagram generator for guitar.
 * 
 * Uses moveable chord shapes (CAGED system + common barre patterns)
 * to generate fingerings for any chord by transposing base shapes.
 * 
 * This allows us to generate 300-400+ chord diagrams programmatically
 * instead of manually defining each one.
 */

import { ChordDiagram } from "./chordDiagrams.ts";

// ============ MUSIC THEORY CONSTANTS ============

// Chromatic scale (sharps only, for consistency)
const CHROMATIC_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Map flats to sharps for normalization
const FLAT_TO_SHARP: Record<string, string> = {
  "Db": "C#", "Eb": "D#", "Fb": "E", "Gb": "F#", 
  "Ab": "G#", "Bb": "A#", "Cb": "B"
};

// Open string notes (standard tuning: E A D G B E)
const OPEN_STRINGS = ["E", "A", "D", "G", "B", "E"];

// Fret where each open string's note appears in chromatic scale
const STRING_ROOT_INDEX = OPEN_STRINGS.map(note => CHROMATIC_SCALE.indexOf(note));
// [4, 9, 2, 7, 11, 4] for E, A, D, G, B, E

// ============ MOVEABLE CHORD SHAPES ============

/**
 * A chord shape template that can be moved up the fretboard.
 * Frets are relative to the root position (0 = root fret).
 * -1 = muted, null = don't play this string
 */
interface ChordShape {
  name: string;
  rootString: number; // Which string (0-5) contains the root note
  relativeFrets: (number | null)[]; // Frets relative to root position
  fingers: [number, number, number, number, number, number];
  hasBarre: boolean;
  barreStrings?: [number, number]; // [startString, endString] for barre
}

// E-shape barre chord (root on 6th string)
const E_SHAPE_MAJOR: ChordShape = {
  name: "E-shape",
  rootString: 0,
  relativeFrets: [0, 2, 2, 1, 0, 0],
  fingers: [1, 3, 4, 2, 1, 1],
  hasBarre: true,
  barreStrings: [0, 5],
};

const E_SHAPE_MINOR: ChordShape = {
  name: "Em-shape",
  rootString: 0,
  relativeFrets: [0, 2, 2, 0, 0, 0],
  fingers: [1, 3, 4, 1, 1, 1],
  hasBarre: true,
  barreStrings: [0, 5],
};

const E_SHAPE_7: ChordShape = {
  name: "E7-shape",
  rootString: 0,
  relativeFrets: [0, 2, 0, 1, 0, 0],
  fingers: [1, 3, 1, 2, 1, 1],
  hasBarre: true,
  barreStrings: [0, 5],
};

const E_SHAPE_MINOR7: ChordShape = {
  name: "Em7-shape",
  rootString: 0,
  relativeFrets: [0, 2, 0, 0, 0, 0],
  fingers: [1, 3, 1, 1, 1, 1],
  hasBarre: true,
  barreStrings: [0, 5],
};

const E_SHAPE_MAJ7: ChordShape = {
  name: "Emaj7-shape",
  rootString: 0,
  relativeFrets: [0, 2, 1, 1, 0, 0],
  fingers: [1, 4, 2, 3, 1, 1],
  hasBarre: true,
  barreStrings: [0, 5],
};

// A-shape barre chord (root on 5th string)
const A_SHAPE_MAJOR: ChordShape = {
  name: "A-shape",
  rootString: 1,
  relativeFrets: [null, 0, 2, 2, 2, 0],
  fingers: [0, 1, 2, 3, 4, 1],
  hasBarre: true,
  barreStrings: [1, 5],
};

const A_SHAPE_MINOR: ChordShape = {
  name: "Am-shape",
  rootString: 1,
  relativeFrets: [null, 0, 2, 2, 1, 0],
  fingers: [0, 1, 3, 4, 2, 1],
  hasBarre: true,
  barreStrings: [1, 5],
};

const A_SHAPE_7: ChordShape = {
  name: "A7-shape",
  rootString: 1,
  relativeFrets: [null, 0, 2, 0, 2, 0],
  fingers: [0, 1, 2, 1, 3, 1],
  hasBarre: true,
  barreStrings: [1, 5],
};

const A_SHAPE_MINOR7: ChordShape = {
  name: "Am7-shape",
  rootString: 1,
  relativeFrets: [null, 0, 2, 0, 1, 0],
  fingers: [0, 1, 3, 1, 2, 1],
  hasBarre: true,
  barreStrings: [1, 5],
};

const A_SHAPE_MAJ7: ChordShape = {
  name: "Amaj7-shape",
  rootString: 1,
  relativeFrets: [null, 0, 2, 1, 2, 0],
  fingers: [0, 1, 3, 2, 4, 1],
  hasBarre: true,
  barreStrings: [1, 5],
};

// Power chord shapes
const POWER_CHORD_6: ChordShape = {
  name: "Power (6th)",
  rootString: 0,
  relativeFrets: [0, 2, 2, null, null, null],
  fingers: [1, 3, 4, 0, 0, 0],
  hasBarre: false,
};

const POWER_CHORD_5: ChordShape = {
  name: "Power (5th)",
  rootString: 1,
  relativeFrets: [null, 0, 2, 2, null, null],
  fingers: [0, 1, 3, 4, 0, 0],
  hasBarre: false,
};

// Sus chords
const A_SHAPE_SUS2: ChordShape = {
  name: "Asus2-shape",
  rootString: 1,
  relativeFrets: [null, 0, 2, 2, 0, 0],
  fingers: [0, 1, 3, 4, 1, 1],
  hasBarre: true,
  barreStrings: [1, 5],
};

const A_SHAPE_SUS4: ChordShape = {
  name: "Asus4-shape",
  rootString: 1,
  relativeFrets: [null, 0, 2, 2, 3, 0],
  fingers: [0, 1, 2, 3, 4, 1],
  hasBarre: true,
  barreStrings: [1, 5],
};

const E_SHAPE_SUS4: ChordShape = {
  name: "Esus4-shape",
  rootString: 0,
  relativeFrets: [0, 2, 2, 2, 0, 0],
  fingers: [1, 2, 3, 4, 1, 1],
  hasBarre: true,
  barreStrings: [0, 5],
};

// Diminished
const DIM_SHAPE: ChordShape = {
  name: "dim-shape",
  rootString: 1,
  relativeFrets: [null, 0, 1, 2, 1, null],
  fingers: [0, 1, 2, 4, 3, 0],
  hasBarre: false,
};

const DIM7_SHAPE: ChordShape = {
  name: "dim7-shape",
  rootString: 1,
  relativeFrets: [null, 0, 1, 2, 1, 2],
  fingers: [0, 1, 2, 3, 1, 4],
  hasBarre: true,
  barreStrings: [2, 4],
};

// Augmented
const AUG_SHAPE: ChordShape = {
  name: "aug-shape",
  rootString: 1,
  relativeFrets: [null, 0, 3, 2, 2, null],
  fingers: [0, 1, 4, 2, 3, 0],
  hasBarre: false,
};

// Add9
const ADD9_SHAPE: ChordShape = {
  name: "add9-shape",
  rootString: 1,
  relativeFrets: [null, 0, 2, 2, 0, 0],
  fingers: [0, 1, 3, 4, 0, 0],
  hasBarre: false,
};

// 9th chords
const E_SHAPE_9: ChordShape = {
  name: "9-shape",
  rootString: 0,
  relativeFrets: [0, 2, 1, 2, 2, null],
  fingers: [1, 3, 2, 4, 4, 0],
  hasBarre: true,
  barreStrings: [3, 4],
};

const A_SHAPE_MINOR9: ChordShape = {
  name: "m9-shape",
  rootString: 1,
  relativeFrets: [null, 0, 2, 0, 0, 2],
  fingers: [0, 1, 2, 1, 1, 3],
  hasBarre: true,
  barreStrings: [1, 4],
};

// 6th chords
const E_SHAPE_6: ChordShape = {
  name: "6-shape",
  rootString: 0,
  relativeFrets: [0, 2, 2, 1, 2, 0],
  fingers: [1, 2, 3, 1, 4, 1],
  hasBarre: true,
  barreStrings: [0, 5],
};

const A_SHAPE_MINOR6: ChordShape = {
  name: "m6-shape",
  rootString: 1,
  relativeFrets: [null, 0, 2, 1, 2, 0],
  fingers: [0, 1, 3, 2, 4, 1],
  hasBarre: true,
  barreStrings: [1, 5],
};

// ============ JAZZ CHORD SHAPES ============

// Half-diminished (m7b5) - THE classic jazz chord
// Notes: R, b3, b5, b7
// Corrected voicing: includes all 4 chord tones
const M7B5_SHAPE_A: ChordShape = {
  name: "m7b5-A-shape",
  rootString: 1,
  // x R b5 b7 b3 x - all 4 chord tones present
  relativeFrets: [null, 0, 1, 0, 1, null],
  fingers: [0, 1, 2, 1, 3, 0],
  hasBarre: true,
  barreStrings: [1, 3],
};

// Alternative m7b5 voicing from 6th string
const M7B5_SHAPE_E: ChordShape = {
  name: "m7b5-E-shape",
  rootString: 0,
  // R x b7 b3 b5 x - common jazz voicing
  relativeFrets: [0, null, -1, 0, -1, null],
  fingers: [1, 0, 0, 2, 0, 0],
  hasBarre: false,
};

// Dominant 7#9 (Hendrix chord)
const DOM7_SHARP9_SHAPE: ChordShape = {
  name: "7#9-shape",
  rootString: 0,
  relativeFrets: [0, 2, 1, 2, 3, null],
  fingers: [1, 3, 2, 4, 4, 0],
  hasBarre: false,
};

// Dominant 7b9
const DOM7_FLAT9_SHAPE: ChordShape = {
  name: "7b9-shape",
  rootString: 0,
  relativeFrets: [0, 2, 1, 2, 1, null],
  fingers: [1, 3, 2, 4, 2, 0],
  hasBarre: true,
  barreStrings: [2, 4],
};

// Major 9
const MAJ9_SHAPE: ChordShape = {
  name: "maj9-shape",
  rootString: 1,
  relativeFrets: [null, 0, 2, 1, 0, 0],
  fingers: [0, 1, 3, 2, 0, 0],
  hasBarre: false,
};

// Dominant 13
const DOM13_SHAPE: ChordShape = {
  name: "13-shape",
  rootString: 0,
  relativeFrets: [0, 2, 1, 2, 0, 2],
  fingers: [1, 2, 1, 3, 1, 4],
  hasBarre: true,
  barreStrings: [0, 4],
};

// Minor 11
const MINOR11_SHAPE: ChordShape = {
  name: "m11-shape",
  rootString: 1,
  relativeFrets: [null, 0, 0, 0, 0, 0],
  fingers: [0, 1, 1, 1, 1, 1],
  hasBarre: true,
  barreStrings: [1, 5],
};

// 7sus4
const DOM7_SUS4_SHAPE: ChordShape = {
  name: "7sus4-shape",
  rootString: 0,
  relativeFrets: [0, 2, 0, 2, 0, 0],
  fingers: [1, 3, 1, 4, 1, 1],
  hasBarre: true,
  barreStrings: [0, 5],
};

// Dominant 7b5
const DOM7_FLAT5_SHAPE: ChordShape = {
  name: "7b5-shape",
  rootString: 1,
  relativeFrets: [null, 0, 1, 2, 2, null],
  fingers: [0, 1, 2, 3, 4, 0],
  hasBarre: false,
};

// Minor-major 7 (mMaj7)
const MINOR_MAJ7_SHAPE: ChordShape = {
  name: "mMaj7-shape",
  rootString: 1,
  relativeFrets: [null, 0, 2, 1, 1, 0],
  fingers: [0, 1, 4, 2, 3, 1],
  hasBarre: true,
  barreStrings: [1, 5],
};

// Augmented 7
const AUG7_SHAPE: ChordShape = {
  name: "aug7-shape",
  rootString: 0,
  relativeFrets: [0, null, 0, 1, 1, null],
  fingers: [1, 0, 1, 2, 3, 0],
  hasBarre: true,
  barreStrings: [0, 2],
};

// 6/9 chord (jazz voicing)
const SIX_NINE_SHAPE: ChordShape = {
  name: "6/9-shape",
  rootString: 0,
  relativeFrets: [0, 2, 1, 1, 2, 0],
  fingers: [1, 3, 2, 2, 4, 1],
  hasBarre: true,
  barreStrings: [0, 5],
};

// Minor 7b5b9 (for very jazzy progressions)
const M7B5_FLAT9_SHAPE: ChordShape = {
  name: "m7b5b9-shape",
  rootString: 1,
  relativeFrets: [null, 0, 1, 1, 1, null],
  fingers: [0, 1, 2, 3, 4, 0],
  hasBarre: false,
};

// add11/add4
const ADD11_SHAPE: ChordShape = {
  name: "add11-shape",
  rootString: 1,
  relativeFrets: [null, 0, 0, 2, 2, 0],
  fingers: [0, 1, 1, 3, 4, 1],
  hasBarre: true,
  barreStrings: [1, 5],
};

// ============ CHORD TYPE TO SHAPES MAPPING ============

const CHORD_SHAPES: Record<string, ChordShape[]> = {
  // Major (empty suffix)
  "": [E_SHAPE_MAJOR, A_SHAPE_MAJOR],
  // Minor
  "m": [E_SHAPE_MINOR, A_SHAPE_MINOR],
  // Dominant 7
  "7": [E_SHAPE_7, A_SHAPE_7],
  // Minor 7
  "m7": [E_SHAPE_MINOR7, A_SHAPE_MINOR7],
  // Major 7
  "maj7": [E_SHAPE_MAJ7, A_SHAPE_MAJ7],
  // Power chords
  "5": [POWER_CHORD_6, POWER_CHORD_5],
  // Sus chords
  "sus2": [A_SHAPE_SUS2],
  "sus4": [E_SHAPE_SUS4, A_SHAPE_SUS4],
  // Diminished
  "dim": [DIM_SHAPE],
  "dim7": [DIM7_SHAPE],
  // Augmented
  "aug": [AUG_SHAPE],
  // Add9
  "add9": [ADD9_SHAPE],
  // 9th chords
  "9": [E_SHAPE_9],
  "m9": [A_SHAPE_MINOR9],
  // 6th chords
  "6": [E_SHAPE_6],
  "m6": [A_SHAPE_MINOR6],
  
  // ========== JAZZ CHORDS ==========
  // Half-diminished (minor 7 flat 5) - using only the proven A-shape
  "m7b5": [M7B5_SHAPE_A],
  "ø": [M7B5_SHAPE_A],       // Symbol notation
  "ø7": [M7B5_SHAPE_A],      // With 7
  "min7b5": [M7B5_SHAPE_A],  // Alternate spelling
  "-7b5": [M7B5_SHAPE_A],    // Jazz notation
  
  // Altered dominants
  "7#9": [DOM7_SHARP9_SHAPE],      // Hendrix chord
  "7b9": [DOM7_FLAT9_SHAPE],
  "7b5": [DOM7_FLAT5_SHAPE],
  "7+9": [DOM7_SHARP9_SHAPE],      // Alternate notation
  
  // Extended chords
  "maj9": [MAJ9_SHAPE],
  "M9": [MAJ9_SHAPE],              // Alternate notation
  "13": [DOM13_SHAPE],
  "m11": [MINOR11_SHAPE],
  "min11": [MINOR11_SHAPE],
  
  // Suspended dominant
  "7sus4": [DOM7_SUS4_SHAPE],
  "7sus": [DOM7_SUS4_SHAPE],
  
  // Minor-major 7
  "mMaj7": [MINOR_MAJ7_SHAPE],
  "m(maj7)": [MINOR_MAJ7_SHAPE],
  "minMaj7": [MINOR_MAJ7_SHAPE],
  "-Δ7": [MINOR_MAJ7_SHAPE],       // Jazz notation
  
  // Augmented 7
  "aug7": [AUG7_SHAPE],
  "+7": [AUG7_SHAPE],
  "7#5": [AUG7_SHAPE],
  
  // 6/9 chord
  "6/9": [SIX_NINE_SHAPE],
  "69": [SIX_NINE_SHAPE],
  
  // add11
  "add11": [ADD11_SHAPE],
  "add4": [ADD11_SHAPE],
};

// ============ HELPER FUNCTIONS ============

/**
 * Normalize a root note to use sharps (e.g., "Bb" -> "A#")
 */
function normalizeRoot(root: string): string {
  if (FLAT_TO_SHARP[root]) {
    return FLAT_TO_SHARP[root];
  }
  return root;
}

/**
 * Get the semitone offset from one note to another
 */
function getSemitoneOffset(from: string, to: string): number {
  const fromIndex = CHROMATIC_SCALE.indexOf(normalizeRoot(from));
  const toIndex = CHROMATIC_SCALE.indexOf(normalizeRoot(to));
  
  if (fromIndex === -1 || toIndex === -1) return -1;
  
  let offset = toIndex - fromIndex;
  if (offset < 0) offset += 12;
  return offset;
}

/**
 * Parse a chord symbol into root and suffix
 * e.g., "Am7" -> { root: "A", suffix: "m7" }
 */
function parseChord(symbol: string): { root: string; suffix: string } | null {
  // Match root (A-G optionally followed by # or b)
  const match = symbol.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;
  
  return {
    root: match[1],
    suffix: match[2],
  };
}

// ============ MAIN GENERATOR FUNCTION ============

/**
 * Generate chord diagrams for a given chord symbol.
 * 
 * @param chordSymbol - e.g., "Fm7", "C#", "Bbmaj7"
 * @returns Array of ChordDiagram objects, or null if unsupported
 */
export function generateChordDiagram(chordSymbol: string): ChordDiagram[] | null {
  const parsed = parseChord(chordSymbol);
  if (!parsed) return null;
  
  const { root, suffix } = parsed;
  const normalizedRoot = normalizeRoot(root);
  
  // Get shapes for this chord type
  const shapes = CHORD_SHAPES[suffix];
  if (!shapes) return null; // Unsupported chord type
  
  const diagrams: ChordDiagram[] = [];
  
  for (const shape of shapes) {
    // Find where the root note appears on the root string
    const openNote = OPEN_STRINGS[shape.rootString];
    const fretOffset = getSemitoneOffset(openNote, normalizedRoot);
    
    if (fretOffset === -1) continue;
    
    // Convert relative frets to absolute frets
    const absoluteFrets: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
    
    for (let i = 0; i < 6; i++) {
      const relativeFret = shape.relativeFrets[i];
      if (relativeFret === null) {
        absoluteFrets[i] = -1; // Muted
      } else if (relativeFret === -1) {
        absoluteFrets[i] = -1; // Explicitly muted
      } else {
        absoluteFrets[i] = relativeFret + fretOffset;
      }
    }
    
    // Determine base fret (for display purposes)
    const playedFrets = absoluteFrets.filter(f => f > 0);
    const minFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 1;
    const baseFret = minFret > 4 ? minFret : 1;
    
    // Adjust frets for display relative to base fret
    const displayFrets: [number, number, number, number, number, number] = [...absoluteFrets];
    if (baseFret > 1) {
      for (let i = 0; i < 6; i++) {
        if (displayFrets[i] > 0) {
          displayFrets[i] = displayFrets[i] - baseFret + 1;
        }
      }
    }
    
    // Build the diagram
    const diagram: ChordDiagram = {
      name: `${chordSymbol} (${shape.name})`,
      frets: displayFrets,
      fingers: shape.fingers,
      baseFret: baseFret,
    };
    
    // Add barre info if applicable
    if (shape.hasBarre && fretOffset > 0) {
      diagram.barres = [1]; // Barre is always at the "first" fret of the shape
    }
    
    diagrams.push(diagram);
  }
  
  return diagrams.length > 0 ? diagrams : null;
}

/**
 * Get list of chord suffixes that can be generated algorithmically
 */
export function getSupportedChordTypes(): string[] {
  return Object.keys(CHORD_SHAPES);
}

/**
 * Check if a chord can be generated algorithmically
 */
export function canGenerateChord(chordSymbol: string): boolean {
  const parsed = parseChord(chordSymbol);
  if (!parsed) return false;
  return CHORD_SHAPES[parsed.suffix] !== undefined;
}

/**
 * Generate all possible chords for a given suffix
 * e.g., generateAllForSuffix("m7") returns diagrams for Am7, A#m7, Bm7, etc.
 */
export function generateAllForSuffix(suffix: string): Record<string, ChordDiagram[]> {
  const results: Record<string, ChordDiagram[]> = {};
  
  for (const root of CHROMATIC_SCALE) {
    const chordSymbol = suffix === "" ? root : `${root}${suffix}`;
    const diagrams = generateChordDiagram(chordSymbol);
    if (diagrams) {
      results[chordSymbol] = diagrams;
    }
  }
  
  return results;
}

/**
 * Generate a comprehensive chord dictionary with all supported chords
 */
export function generateFullChordDictionary(): Record<string, ChordDiagram[]> {
  const dictionary: Record<string, ChordDiagram[]> = {};
  
  for (const suffix of Object.keys(CHORD_SHAPES)) {
    const chordsForSuffix = generateAllForSuffix(suffix);
    Object.assign(dictionary, chordsForSuffix);
  }
  
  return dictionary;
}

/**
 * Get count of how many chords can be generated
 */
export function getGeneratableChordCount(): { byType: Record<string, number>; total: number } {
  const byType: Record<string, number> = {};
  let total = 0;
  
  for (const suffix of Object.keys(CHORD_SHAPES)) {
    const count = 12; // 12 roots per suffix
    const typeName = suffix === "" ? "major" : suffix;
    byType[typeName] = count;
    total += count;
  }
  
  return { byType, total };
}
