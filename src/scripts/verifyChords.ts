#!/usr/bin/env -S deno run -A
/**
 * Chord Verification Script
 * 
 * Verifies that chord diagrams are working correctly across the system.
 * Run with: deno run -A src/scripts/verifyChords.ts
 */

import { 
  getChordDiagram, 
  getAllAvailableChordDiagrams, 
  getChordDiagramStats,
  hasChordDiagram,
  ChordDiagram
} from "../theory/chordDiagrams.ts";
import { generateChordVocabulary, CANONICAL_ROOTS } from "../theory/chords.ts";
import { canGenerateChord, getSupportedChordTypes } from "../theory/chordGenerator.ts";

// ============ VERIFICATION UTILITIES ============

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: string[];
}

function verify(name: string, fn: () => VerificationResult): void {
  const result = fn();
  const icon = result.passed ? "✅" : "❌";
  console.log(`${icon} ${name}: ${result.message}`);
  if (result.details?.length) {
    result.details.forEach(d => console.log(`   ${d}`));
  }
}

function validateDiagram(diagram: ChordDiagram): string[] {
  const errors: string[] = [];
  
  if (!Array.isArray(diagram.frets) || diagram.frets.length !== 6) {
    errors.push(`Invalid frets: expected 6 elements, got ${diagram.frets?.length}`);
  }
  
  if (!Array.isArray(diagram.fingers) || diagram.fingers.length !== 6) {
    errors.push(`Invalid fingers: expected 6 elements, got ${diagram.fingers?.length}`);
  }
  
  if (typeof diagram.baseFret !== 'number' || diagram.baseFret < 1 || diagram.baseFret > 24) {
    errors.push(`Invalid baseFret: ${diagram.baseFret}`);
  }
  
  // Check fret values are valid (-1 for muted, 0 for open, 1-4 typical frets)
  diagram.frets.forEach((fret, i) => {
    if (typeof fret !== 'number' || fret < -1 || fret > 5) {
      errors.push(`Invalid fret value at string ${i}: ${fret}`);
    }
  });
  
  // Check finger values are valid (0 for not pressed, 1-4 for fingers)
  diagram.fingers.forEach((finger, i) => {
    if (typeof finger !== 'number' || finger < 0 || finger > 4) {
      errors.push(`Invalid finger value at string ${i}: ${finger}`);
    }
  });
  
  return errors;
}

// ============ VERIFICATIONS ============

console.log("\n🎸 CHORD DIAGRAM VERIFICATION REPORT\n");
console.log("=".repeat(50));

// 1. Stats Check
verify("Statistics Check", () => {
  const stats = getChordDiagramStats();
  const issues: string[] = [];
  
  if (stats.handCrafted < 50) {
    issues.push(`Only ${stats.handCrafted} hand-crafted diagrams (expected 50+)`);
  }
  if (stats.generatable < 400) {
    issues.push(`Only ${stats.generatable} generatable diagrams (expected 400+)`);
  }
  if (stats.totalAvailable < 450) {
    issues.push(`Only ${stats.totalAvailable} total diagrams (expected 450+)`);
  }
  
  return {
    passed: issues.length === 0,
    message: `${stats.totalAvailable} total diagrams (${stats.handCrafted} hand-crafted, ${stats.generatable} generated)`,
    details: issues,
  };
});

// 2. Basic Major Chords
verify("Basic Major Chords (all 12 roots)", () => {
  const missing: string[] = [];
  const invalid: string[] = [];
  
  for (const root of CANONICAL_ROOTS) {
    const diagram = getChordDiagram(root);
    if (!diagram) {
      missing.push(root);
    } else {
      const errors = validateDiagram(diagram[0]);
      if (errors.length) {
        invalid.push(`${root}: ${errors.join(", ")}`);
      }
    }
  }
  
  return {
    passed: missing.length === 0 && invalid.length === 0,
    message: missing.length === 0 ? "All 12 major chords have valid diagrams" : `Missing: ${missing.join(", ")}`,
    details: invalid,
  };
});

// 3. Basic Minor Chords
verify("Basic Minor Chords (all 12 roots)", () => {
  const missing: string[] = [];
  
  for (const root of CANONICAL_ROOTS) {
    const chord = `${root}m`;
    if (!hasChordDiagram(chord)) {
      missing.push(chord);
    }
  }
  
  return {
    passed: missing.length === 0,
    message: missing.length === 0 ? "All 12 minor chords available" : `Missing: ${missing.join(", ")}`,
  };
});

// 4. Seventh Chords
verify("Seventh Chords (7, m7, maj7)", () => {
  const testChords = [
    "C7", "G7", "D7", "A7", "E7", "F7",
    "Am7", "Dm7", "Em7", "Bm7",
    "Cmaj7", "Gmaj7", "Fmaj7", "Dmaj7"
  ];
  const missing: string[] = [];
  
  for (const chord of testChords) {
    if (!hasChordDiagram(chord)) {
      missing.push(chord);
    }
  }
  
  return {
    passed: missing.length === 0,
    message: missing.length === 0 ? `All ${testChords.length} seventh chords available` : `Missing: ${missing.join(", ")}`,
  };
});

// 5. Jazz Chords (m7b5, 7#9, etc.)
verify("Jazz Chords (m7b5, 7#9, maj9, 13)", () => {
  const jazzChords = [
    "Am7b5", "Bm7b5", "Cm7b5", "Dm7b5", "Em7b5", "F#m7b5",
    "E7#9", "A7#9", "G7#9",
    "Cmaj9", "Gmaj9", "Fmaj9",
    "G13", "C13", "D13",
    "A7sus4", "D7sus4", "E7sus4",
  ];
  const missing: string[] = [];
  const available: string[] = [];
  
  for (const chord of jazzChords) {
    if (hasChordDiagram(chord)) {
      available.push(chord);
    } else {
      missing.push(chord);
    }
  }
  
  return {
    passed: missing.length === 0,
    message: `${available.length}/${jazzChords.length} jazz chords available`,
    details: missing.length ? [`Missing: ${missing.join(", ")}`] : undefined,
  };
});

// 6. Enharmonic Equivalents
verify("Enharmonic Equivalents (Bb=A#, Db=C#, etc.)", () => {
  const pairs = [
    ["Bb", "A#"],
    ["Db", "C#"],
    ["Eb", "D#"],
    ["Gb", "F#"],
    ["Ab", "G#"],
  ];
  const issues: string[] = [];
  
  for (const [flat, sharp] of pairs) {
    const flatDiagram = getChordDiagram(flat);
    const sharpDiagram = getChordDiagram(sharp);
    
    if (!flatDiagram && !sharpDiagram) {
      issues.push(`Neither ${flat} nor ${sharp} has a diagram`);
    } else if (!flatDiagram) {
      issues.push(`${flat} missing (but ${sharp} exists)`);
    } else if (!sharpDiagram) {
      issues.push(`${sharp} missing (but ${flat} exists)`);
    }
  }
  
  return {
    passed: issues.length === 0,
    message: issues.length === 0 ? "All enharmonic pairs accessible" : "Some pairs have issues",
    details: issues,
  };
});

// 7. Diagram Structure Validation
verify("Diagram Structure Validation (sample of 50 chords)", () => {
  const allChords = getAllAvailableChordDiagrams();
  const sampleSize = Math.min(50, allChords.length);
  const sample = allChords.slice(0, sampleSize);
  const invalid: string[] = [];
  
  for (const chord of sample) {
    const diagrams = getChordDiagram(chord);
    if (diagrams) {
      for (const diagram of diagrams) {
        const errors = validateDiagram(diagram);
        if (errors.length) {
          invalid.push(`${chord}: ${errors.join(", ")}`);
        }
      }
    }
  }
  
  return {
    passed: invalid.length === 0,
    message: invalid.length === 0 ? `All ${sampleSize} sampled diagrams are structurally valid` : `${invalid.length} invalid diagrams`,
    details: invalid.slice(0, 5),
  };
});

// 8. Common Progressions
verify("Common Chord Progressions Covered", () => {
  const progressions = {
    "I-IV-V (C)": ["C", "F", "G"],
    "I-IV-V (G)": ["G", "C", "D"],
    "ii-V-I jazz (C)": ["Dm7", "G7", "Cmaj7"],
    "ii-V-i minor (Am)": ["Bm7b5", "E7", "Am"],
    "I-V-vi-IV pop": ["C", "G", "Am", "F"],
    "12-bar blues (E)": ["E7", "A7", "B7"],
  };
  
  const issues: string[] = [];
  
  for (const [name, chords] of Object.entries(progressions)) {
    const missing = chords.filter(c => !hasChordDiagram(c));
    if (missing.length) {
      issues.push(`${name}: missing ${missing.join(", ")}`);
    }
  }
  
  return {
    passed: issues.length === 0,
    message: issues.length === 0 ? "All common progressions fully covered" : "Some progressions have gaps",
    details: issues,
  };
});

// 9. API Consistency
verify("API Function Consistency", () => {
  const issues: string[] = [];
  
  // getAllAvailableChordDiagrams should include everything hasChordDiagram returns true for
  const all = new Set(getAllAvailableChordDiagrams().map(c => c.toLowerCase()));
  const testChords = ["C", "Am", "G7", "Dm7", "Am7b5", "E7#9", "Cmaj9"];
  
  for (const chord of testChords) {
    const has = hasChordDiagram(chord);
    const inAll = all.has(chord.toLowerCase());
    
    if (has && !inAll) {
      issues.push(`${chord}: hasChordDiagram=true but not in getAllAvailableChordDiagrams`);
    }
  }
  
  // getChordDiagram should return something for everything in the list
  const sampleFromAll = getAllAvailableChordDiagrams().slice(0, 20);
  for (const chord of sampleFromAll) {
    const diagram = getChordDiagram(chord);
    if (!diagram) {
      issues.push(`${chord}: in list but getChordDiagram returns null`);
    }
  }
  
  return {
    passed: issues.length === 0,
    message: issues.length === 0 ? "All API functions are consistent" : "API inconsistencies found",
    details: issues,
  };
});

// 10. Coverage Summary
console.log("\n" + "=".repeat(50));
console.log("📊 COVERAGE SUMMARY\n");

const stats = getChordDiagramStats();
const vocabulary = generateChordVocabulary();
const availableDiagrams = getAllAvailableChordDiagrams();

const coverage = (availableDiagrams.length / vocabulary.length * 100).toFixed(1);

console.log(`Total chord vocabulary: ${vocabulary.length} chords`);
console.log(`Chords with diagrams: ${availableDiagrams.length} (${coverage}% coverage)`);
console.log(`  - Hand-crafted: ${stats.handCrafted}`);
console.log(`  - Generated: ${stats.generatable}`);
console.log(`\nSupported chord types: ${stats.supportedTypes.length}`);
console.log(`  ${stats.supportedTypes.slice(0, 20).join(", ")}${stats.supportedTypes.length > 20 ? "..." : ""}`);

// List some chords that DON'T have diagrams
const vocabSet = new Set(vocabulary);
const availableSet = new Set(availableDiagrams.map(c => c));
const missing = vocabulary.filter(c => !availableSet.has(c)).slice(0, 10);

if (missing.length) {
  console.log(`\nSample chords WITHOUT diagrams (first 10):`);
  console.log(`  ${missing.join(", ")}`);
}

console.log("\n" + "=".repeat(50));
console.log("✅ Verification complete!\n");
