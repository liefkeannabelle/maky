// src/theory/chordDiagrams.ts

/**
 * Guitar chord fingering diagrams for ChordConnect.
 * 
 * Each diagram contains:
 * - frets: array of 6 numbers (low E to high E), -1 = muted, 0 = open
 * - fingers: array of 6 numbers indicating which finger to use (0 = none/open)
 * - barres: optional barre chord info
 * - baseFret: starting fret position (1 for open chords)
 * 
 * Standard tuning: E A D G B E (low to high)
 * String indices: 0=low E, 1=A, 2=D, 3=G, 4=B, 5=high E
 */

export interface ChordDiagram {
  name: string;
  frets: [number, number, number, number, number, number]; // -1 = muted, 0 = open
  fingers: [number, number, number, number, number, number]; // 0 = not pressed, 1-4 = finger
  baseFret: number; // 1 for open position chords
  barres?: number[]; // fret numbers where barres occur
  capo?: boolean; // true if this voicing requires a capo
}

export interface ChordDiagramEntry {
  chord: string;
  diagrams: ChordDiagram[]; // Multiple voicings per chord
}

/**
 * Common beginner-friendly chord diagrams
 * These are the most common open and barre chord shapes
 */
export const CHORD_DIAGRAMS: Record<string, ChordDiagram[]> = {
  // ============ MAJOR CHORDS ============
  "C": [
    {
      name: "C (open)",
      frets: [-1, 3, 2, 0, 1, 0],
      fingers: [0, 3, 2, 0, 1, 0],
      baseFret: 1,
    },
  ],
  "D": [
    {
      name: "D (open)",
      frets: [-1, -1, 0, 2, 3, 2],
      fingers: [0, 0, 0, 1, 3, 2],
      baseFret: 1,
    },
  ],
  "E": [
    {
      name: "E (open)",
      frets: [0, 2, 2, 1, 0, 0],
      fingers: [0, 2, 3, 1, 0, 0],
      baseFret: 1,
    },
  ],
  "F": [
    {
      name: "F (barre)",
      frets: [1, 3, 3, 2, 1, 1],
      fingers: [1, 3, 4, 2, 1, 1],
      baseFret: 1,
      barres: [1],
    },
    {
      name: "F (easy)",
      frets: [-1, -1, 3, 2, 1, 1],
      fingers: [0, 0, 3, 2, 1, 1],
      baseFret: 1,
    },
  ],
  "G": [
    {
      name: "G (open)",
      frets: [3, 2, 0, 0, 0, 3],
      fingers: [2, 1, 0, 0, 0, 3],
      baseFret: 1,
    },
    {
      name: "G (alt)",
      frets: [3, 2, 0, 0, 3, 3],
      fingers: [2, 1, 0, 0, 3, 4],
      baseFret: 1,
    },
  ],
  "A": [
    {
      name: "A (open)",
      frets: [-1, 0, 2, 2, 2, 0],
      fingers: [0, 0, 1, 2, 3, 0],
      baseFret: 1,
    },
  ],
  "B": [
    {
      name: "B (barre)",
      frets: [-1, 2, 4, 4, 4, 2],
      fingers: [0, 1, 2, 3, 4, 1],
      baseFret: 1,
      barres: [2],
    },
  ],

  // ============ MINOR CHORDS ============
  "Am": [
    {
      name: "Am (open)",
      frets: [-1, 0, 2, 2, 1, 0],
      fingers: [0, 0, 2, 3, 1, 0],
      baseFret: 1,
    },
  ],
  "Bm": [
    {
      name: "Bm (barre)",
      frets: [-1, 2, 4, 4, 3, 2],
      fingers: [0, 1, 3, 4, 2, 1],
      baseFret: 1,
      barres: [2],
    },
  ],
  "Cm": [
    {
      name: "Cm (barre)",
      frets: [-1, 3, 5, 5, 4, 3],
      fingers: [0, 1, 3, 4, 2, 1],
      baseFret: 1,
      barres: [3],
    },
  ],
  "Dm": [
    {
      name: "Dm (open)",
      frets: [-1, -1, 0, 2, 3, 1],
      fingers: [0, 0, 0, 2, 3, 1],
      baseFret: 1,
    },
  ],
  "Em": [
    {
      name: "Em (open)",
      frets: [0, 2, 2, 0, 0, 0],
      fingers: [0, 2, 3, 0, 0, 0],
      baseFret: 1,
    },
  ],
  "Fm": [
    {
      name: "Fm (barre)",
      frets: [1, 3, 3, 1, 1, 1],
      fingers: [1, 3, 4, 1, 1, 1],
      baseFret: 1,
      barres: [1],
    },
  ],
  "Gm": [
    {
      name: "Gm (barre)",
      frets: [3, 5, 5, 3, 3, 3],
      fingers: [1, 3, 4, 1, 1, 1],
      baseFret: 1,
      barres: [3],
    },
  ],

  // ============ 7TH CHORDS ============
  "A7": [
    {
      name: "A7 (open)",
      frets: [-1, 0, 2, 0, 2, 0],
      fingers: [0, 0, 1, 0, 2, 0],
      baseFret: 1,
    },
  ],
  "B7": [
    {
      name: "B7 (open)",
      frets: [-1, 2, 1, 2, 0, 2],
      fingers: [0, 2, 1, 3, 0, 4],
      baseFret: 1,
    },
  ],
  "C7": [
    {
      name: "C7 (open)",
      frets: [-1, 3, 2, 3, 1, 0],
      fingers: [0, 3, 2, 4, 1, 0],
      baseFret: 1,
    },
  ],
  "D7": [
    {
      name: "D7 (open)",
      frets: [-1, -1, 0, 2, 1, 2],
      fingers: [0, 0, 0, 2, 1, 3],
      baseFret: 1,
    },
  ],
  "E7": [
    {
      name: "E7 (open)",
      frets: [0, 2, 0, 1, 0, 0],
      fingers: [0, 2, 0, 1, 0, 0],
      baseFret: 1,
    },
  ],
  "F7": [
    {
      name: "F7 (barre)",
      frets: [1, 3, 1, 2, 1, 1],
      fingers: [1, 3, 1, 2, 1, 1],
      baseFret: 1,
      barres: [1],
    },
  ],
  "G7": [
    {
      name: "G7 (open)",
      frets: [3, 2, 0, 0, 0, 1],
      fingers: [3, 2, 0, 0, 0, 1],
      baseFret: 1,
    },
  ],

  // ============ MINOR 7TH CHORDS ============
  "Am7": [
    {
      name: "Am7 (open)",
      frets: [-1, 0, 2, 0, 1, 0],
      fingers: [0, 0, 2, 0, 1, 0],
      baseFret: 1,
    },
  ],
  "Bm7": [
    {
      name: "Bm7 (barre)",
      frets: [-1, 2, 4, 2, 3, 2],
      fingers: [0, 1, 3, 1, 2, 1],
      baseFret: 1,
      barres: [2],
    },
  ],
  "Dm7": [
    {
      name: "Dm7 (open)",
      frets: [-1, -1, 0, 2, 1, 1],
      fingers: [0, 0, 0, 2, 1, 1],
      baseFret: 1,
    },
  ],
  "Em7": [
    {
      name: "Em7 (open)",
      frets: [0, 2, 0, 0, 0, 0],
      fingers: [0, 1, 0, 0, 0, 0],
      baseFret: 1,
    },
  ],

  // ============ MAJOR 7TH CHORDS ============
  "Amaj7": [
    {
      name: "Amaj7 (open)",
      frets: [-1, 0, 2, 1, 2, 0],
      fingers: [0, 0, 2, 1, 3, 0],
      baseFret: 1,
    },
  ],
  "Cmaj7": [
    {
      name: "Cmaj7 (open)",
      frets: [-1, 3, 2, 0, 0, 0],
      fingers: [0, 3, 2, 0, 0, 0],
      baseFret: 1,
    },
  ],
  "Dmaj7": [
    {
      name: "Dmaj7 (open)",
      frets: [-1, -1, 0, 2, 2, 2],
      fingers: [0, 0, 0, 1, 1, 1],
      baseFret: 1,
    },
  ],
  "Emaj7": [
    {
      name: "Emaj7 (open)",
      frets: [0, 2, 1, 1, 0, 0],
      fingers: [0, 3, 1, 2, 0, 0],
      baseFret: 1,
    },
  ],
  "Fmaj7": [
    {
      name: "Fmaj7 (open)",
      frets: [-1, -1, 3, 2, 1, 0],
      fingers: [0, 0, 3, 2, 1, 0],
      baseFret: 1,
    },
    {
      name: "Fmaj7 (barre)",
      frets: [1, 3, 2, 2, 1, 1],
      fingers: [1, 4, 2, 3, 1, 1],
      baseFret: 1,
      barres: [1],
    },
  ],
  "Gmaj7": [
    {
      name: "Gmaj7 (open)",
      frets: [3, 2, 0, 0, 0, 2],
      fingers: [2, 1, 0, 0, 0, 3],
      baseFret: 1,
    },
  ],

  // ============ SUSPENDED CHORDS ============
  "Asus2": [
    {
      name: "Asus2 (open)",
      frets: [-1, 0, 2, 2, 0, 0],
      fingers: [0, 0, 1, 2, 0, 0],
      baseFret: 1,
    },
  ],
  "Asus4": [
    {
      name: "Asus4 (open)",
      frets: [-1, 0, 2, 2, 3, 0],
      fingers: [0, 0, 1, 2, 3, 0],
      baseFret: 1,
    },
  ],
  "Dsus2": [
    {
      name: "Dsus2 (open)",
      frets: [-1, -1, 0, 2, 3, 0],
      fingers: [0, 0, 0, 1, 2, 0],
      baseFret: 1,
    },
  ],
  "Dsus4": [
    {
      name: "Dsus4 (open)",
      frets: [-1, -1, 0, 2, 3, 3],
      fingers: [0, 0, 0, 1, 2, 3],
      baseFret: 1,
    },
  ],
  "Esus4": [
    {
      name: "Esus4 (open)",
      frets: [0, 2, 2, 2, 0, 0],
      fingers: [0, 2, 3, 4, 0, 0],
      baseFret: 1,
    },
  ],
  "Gsus4": [
    {
      name: "Gsus4 (open)",
      frets: [3, 3, 0, 0, 1, 3],
      fingers: [2, 3, 0, 0, 1, 4],
      baseFret: 1,
    },
  ],

  // ============ ADD CHORDS ============
  "Cadd9": [
    {
      name: "Cadd9 (open)",
      frets: [-1, 3, 2, 0, 3, 0],
      fingers: [0, 2, 1, 0, 3, 0],
      baseFret: 1,
    },
  ],
  "Dadd9": [
    {
      name: "Dadd9 (open)",
      frets: [-1, -1, 0, 2, 3, 0],
      fingers: [0, 0, 0, 1, 2, 0],
      baseFret: 1,
    },
  ],
  "Eadd9": [
    {
      name: "Eadd9 (open)",
      frets: [0, 2, 2, 1, 0, 2],
      fingers: [0, 2, 3, 1, 0, 4],
      baseFret: 1,
    },
  ],
  "Gadd9": [
    {
      name: "Gadd9 (open)",
      frets: [3, 0, 0, 2, 0, 3],
      fingers: [2, 0, 0, 1, 0, 3],
      baseFret: 1,
    },
  ],

  // ============ DIMINISHED CHORDS ============
  "Bdim": [
    {
      name: "Bdim",
      frets: [-1, 2, 3, 4, 3, -1],
      fingers: [0, 1, 2, 4, 3, 0],
      baseFret: 1,
    },
  ],
  "Cdim": [
    {
      name: "Cdim",
      frets: [-1, 3, 4, 2, 4, -1],
      fingers: [0, 2, 3, 1, 4, 0],
      baseFret: 1,
    },
  ],
  "Ddim": [
    {
      name: "Ddim",
      frets: [-1, -1, 0, 1, 3, 1],
      fingers: [0, 0, 0, 1, 3, 2],
      baseFret: 1,
    },
  ],

  // ============ AUGMENTED CHORDS ============
  "Caug": [
    {
      name: "Caug",
      frets: [-1, 3, 2, 1, 1, 0],
      fingers: [0, 4, 3, 1, 2, 0],
      baseFret: 1,
    },
  ],
  "Eaug": [
    {
      name: "Eaug",
      frets: [0, 3, 2, 1, 1, 0],
      fingers: [0, 4, 3, 1, 2, 0],
      baseFret: 1,
    },
  ],
  "Gaug": [
    {
      name: "Gaug",
      frets: [3, 2, 1, 0, 0, 3],
      fingers: [3, 2, 1, 0, 0, 4],
      baseFret: 1,
    },
  ],

  // ============ POWER CHORDS (5) ============
  "A5": [
    {
      name: "A5 (power)",
      frets: [-1, 0, 2, 2, -1, -1],
      fingers: [0, 0, 1, 2, 0, 0],
      baseFret: 1,
    },
  ],
  "B5": [
    {
      name: "B5 (power)",
      frets: [-1, 2, 4, 4, -1, -1],
      fingers: [0, 1, 3, 4, 0, 0],
      baseFret: 1,
    },
  ],
  "C5": [
    {
      name: "C5 (power)",
      frets: [-1, 3, 5, 5, -1, -1],
      fingers: [0, 1, 3, 4, 0, 0],
      baseFret: 1,
    },
  ],
  "D5": [
    {
      name: "D5 (power)",
      frets: [-1, -1, 0, 2, 3, -1],
      fingers: [0, 0, 0, 1, 2, 0],
      baseFret: 1,
    },
  ],
  "E5": [
    {
      name: "E5 (power)",
      frets: [0, 2, 2, -1, -1, -1],
      fingers: [0, 1, 2, 0, 0, 0],
      baseFret: 1,
    },
  ],
  "F5": [
    {
      name: "F5 (power)",
      frets: [1, 3, 3, -1, -1, -1],
      fingers: [1, 3, 4, 0, 0, 0],
      baseFret: 1,
    },
  ],
  "G5": [
    {
      name: "G5 (power)",
      frets: [3, 5, 5, -1, -1, -1],
      fingers: [1, 3, 4, 0, 0, 0],
      baseFret: 1,
    },
  ],

  // ============ SHARP/FLAT VARIANTS ============
  // A# / Bb
  "A#": [
    {
      name: "A#/Bb (barre)",
      frets: [-1, 1, 3, 3, 3, 1],
      fingers: [0, 1, 2, 3, 4, 1],
      baseFret: 1,
      barres: [1],
    },
  ],
  "Bb": [
    {
      name: "Bb (barre)",
      frets: [-1, 1, 3, 3, 3, 1],
      fingers: [0, 1, 2, 3, 4, 1],
      baseFret: 1,
      barres: [1],
    },
  ],
  "A#m": [
    {
      name: "A#m/Bbm (barre)",
      frets: [-1, 1, 3, 3, 2, 1],
      fingers: [0, 1, 3, 4, 2, 1],
      baseFret: 1,
      barres: [1],
    },
  ],
  "Bbm": [
    {
      name: "Bbm (barre)",
      frets: [-1, 1, 3, 3, 2, 1],
      fingers: [0, 1, 3, 4, 2, 1],
      baseFret: 1,
      barres: [1],
    },
  ],

  // C# / Db
  "C#": [
    {
      name: "C#/Db (barre)",
      frets: [-1, 4, 6, 6, 6, 4],
      fingers: [0, 1, 2, 3, 4, 1],
      baseFret: 1,
      barres: [4],
    },
  ],
  "Db": [
    {
      name: "Db (barre)",
      frets: [-1, 4, 6, 6, 6, 4],
      fingers: [0, 1, 2, 3, 4, 1],
      baseFret: 1,
      barres: [4],
    },
  ],
  "C#m": [
    {
      name: "C#m/Dbm (barre)",
      frets: [-1, 4, 6, 6, 5, 4],
      fingers: [0, 1, 3, 4, 2, 1],
      baseFret: 1,
      barres: [4],
    },
  ],

  // D# / Eb
  "D#": [
    {
      name: "D#/Eb (barre)",
      frets: [-1, 6, 8, 8, 8, 6],
      fingers: [0, 1, 2, 3, 4, 1],
      baseFret: 1,
      barres: [6],
    },
  ],
  "Eb": [
    {
      name: "Eb (barre)",
      frets: [-1, 6, 8, 8, 8, 6],
      fingers: [0, 1, 2, 3, 4, 1],
      baseFret: 1,
      barres: [6],
    },
  ],
  "D#m": [
    {
      name: "D#m/Ebm (barre)",
      frets: [-1, 6, 8, 8, 7, 6],
      fingers: [0, 1, 3, 4, 2, 1],
      baseFret: 1,
      barres: [6],
    },
  ],
  "Ebm": [
    {
      name: "Ebm (barre)",
      frets: [-1, 6, 8, 8, 7, 6],
      fingers: [0, 1, 3, 4, 2, 1],
      baseFret: 1,
      barres: [6],
    },
  ],

  // F# / Gb
  "F#": [
    {
      name: "F#/Gb (barre)",
      frets: [2, 4, 4, 3, 2, 2],
      fingers: [1, 3, 4, 2, 1, 1],
      baseFret: 1,
      barres: [2],
    },
  ],
  "Gb": [
    {
      name: "Gb (barre)",
      frets: [2, 4, 4, 3, 2, 2],
      fingers: [1, 3, 4, 2, 1, 1],
      baseFret: 1,
      barres: [2],
    },
  ],
  "F#m": [
    {
      name: "F#m/Gbm (barre)",
      frets: [2, 4, 4, 2, 2, 2],
      fingers: [1, 3, 4, 1, 1, 1],
      baseFret: 1,
      barres: [2],
    },
  ],
  "Gbm": [
    {
      name: "Gbm (barre)",
      frets: [2, 4, 4, 2, 2, 2],
      fingers: [1, 3, 4, 1, 1, 1],
      baseFret: 1,
      barres: [2],
    },
  ],

  // G# / Ab
  "G#": [
    {
      name: "G#/Ab (barre)",
      frets: [4, 6, 6, 5, 4, 4],
      fingers: [1, 3, 4, 2, 1, 1],
      baseFret: 1,
      barres: [4],
    },
  ],
  "Ab": [
    {
      name: "Ab (barre)",
      frets: [4, 6, 6, 5, 4, 4],
      fingers: [1, 3, 4, 2, 1, 1],
      baseFret: 1,
      barres: [4],
    },
  ],
  "G#m": [
    {
      name: "G#m/Abm (barre)",
      frets: [4, 6, 6, 4, 4, 4],
      fingers: [1, 3, 4, 1, 1, 1],
      baseFret: 1,
      barres: [4],
    },
  ],
  "Abm": [
    {
      name: "Abm (barre)",
      frets: [4, 6, 6, 4, 4, 4],
      fingers: [1, 3, 4, 1, 1, 1],
      baseFret: 1,
      barres: [4],
    },
  ],
};

/**
 * Get chord diagram(s) for a given chord name.
 * Returns multiple voicings if available.
 */
export function getChordDiagram(chordName: string): ChordDiagram[] | null {
  // Direct lookup
  if (CHORD_DIAGRAMS[chordName]) {
    return CHORD_DIAGRAMS[chordName];
  }

  // Try enharmonic equivalents
  const enharmonics: Record<string, string> = {
    "A#": "Bb", "Bb": "A#",
    "C#": "Db", "Db": "C#",
    "D#": "Eb", "Eb": "D#",
    "F#": "Gb", "Gb": "F#",
    "G#": "Ab", "Ab": "G#",
  };

  // Check if the root has an enharmonic equivalent
  for (const [from, to] of Object.entries(enharmonics)) {
    if (chordName.startsWith(from)) {
      const altName = chordName.replace(from, to);
      if (CHORD_DIAGRAMS[altName]) {
        return CHORD_DIAGRAMS[altName];
      }
    }
  }

  return null;
}

/**
 * Get all available chord names that have diagrams
 */
export function getAvailableChordDiagrams(): string[] {
  return Object.keys(CHORD_DIAGRAMS).sort();
}

/**
 * Check if a chord diagram exists for a given chord name
 */
export function hasChordDiagram(chordName: string): boolean {
  return getChordDiagram(chordName) !== null;
}
