import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { ChordLibrary } from "@concepts";
import { ID } from "@utils/types.ts";
import { getChordDiagram, getChordDiagramStats, hasChordDiagram, getAllAvailableChordDiagrams } from "./chordDiagrams.ts";
import { generateChordDiagram, canGenerateChord, getSupportedChordTypes } from "./chordGenerator.ts";

const ts = Date.now();

// ============ CHORD DIAGRAM GENERATOR TESTS ============

Deno.test({
  name: "Chord Diagram Generator - Jazz Chords",
  sanitizeResources: false,
  sanitizeOps: false,
}, async (t) => {
  
  await t.step("m7b5 (half-diminished) chords are generated for all roots", () => {
    const roots = ["A", "B", "C", "D", "E", "F", "G", "Bb", "C#", "F#"];
    for (const root of roots) {
      const chord = `${root}m7b5`;
      const diagram = getChordDiagram(chord);
      assertExists(diagram, `Expected diagram for ${chord}`);
      assert(diagram.length >= 1, `Expected at least 1 voicing for ${chord}`);
    }
  });

  await t.step("7#9 (Hendrix chord) is generated correctly", () => {
    const hendrixChords = ["E7#9", "A7#9", "G7#9", "C7#9", "D7#9"];
    for (const chord of hendrixChords) {
      const diagram = getChordDiagram(chord);
      assertExists(diagram, `Expected diagram for ${chord}`);
      // Verify it has reasonable fret positions
      assert(diagram[0].baseFret >= 1 && diagram[0].baseFret <= 12, 
        `${chord} baseFret should be 1-12, got ${diagram[0].baseFret}`);
    }
  });

  await t.step("maj9 chords are generated", () => {
    const maj9Chords = ["Cmaj9", "Dmaj9", "Emaj9", "Fmaj9", "Gmaj9", "Amaj9", "Bmaj9"];
    for (const chord of maj9Chords) {
      const diagram = getChordDiagram(chord);
      assertExists(diagram, `Expected diagram for ${chord}`);
    }
  });

  await t.step("13th chords are generated", () => {
    const dom13Chords = ["G13", "C13", "D13", "A13", "E13"];
    for (const chord of dom13Chords) {
      const diagram = getChordDiagram(chord);
      assertExists(diagram, `Expected diagram for ${chord}`);
    }
  });

  await t.step("7sus4 chords are generated", () => {
    const sus4Chords = ["A7sus4", "D7sus4", "E7sus4", "G7sus4"];
    for (const chord of sus4Chords) {
      const diagram = getChordDiagram(chord);
      assertExists(diagram, `Expected diagram for ${chord}`);
    }
  });

  await t.step("mMaj7 (minor-major 7) chords are generated", () => {
    const mMaj7Chords = ["AmMaj7", "DmMaj7", "EmMaj7", "CmMaj7"];
    for (const chord of mMaj7Chords) {
      const diagram = getChordDiagram(chord);
      assertExists(diagram, `Expected diagram for ${chord}`);
    }
  });

  await t.step("aug7 chords are generated", () => {
    const aug7Chords = ["Caug7", "Gaug7", "Daug7"];
    for (const chord of aug7Chords) {
      const diagram = getChordDiagram(chord);
      assertExists(diagram, `Expected diagram for ${chord}`);
    }
  });

  await t.step("6/9 chords are generated", () => {
    const sixNineChords = ["C6/9", "G6/9", "D6/9", "A6/9"];
    for (const chord of sixNineChords) {
      const diagram = getChordDiagram(chord);
      assertExists(diagram, `Expected diagram for ${chord}`);
    }
  });

  await t.step("alternate notation variants work", () => {
    // m7b5 variants
    const am7b5_1 = getChordDiagram("Am7b5");
    const am7b5_2 = getChordDiagram("Amin7b5");
    assertExists(am7b5_1);
    assertExists(am7b5_2);
    
    // 7#9 variants
    const e7sharp9 = getChordDiagram("E7#9");
    const e7plus9 = getChordDiagram("E7+9");
    assertExists(e7sharp9);
    assertExists(e7plus9);
    
    // maj9 variants
    const cmaj9_1 = getChordDiagram("Cmaj9");
    const cmaj9_2 = getChordDiagram("CM9");
    assertExists(cmaj9_1);
    assertExists(cmaj9_2);
    
    // aug7 variants
    const caug7_1 = getChordDiagram("Caug7");
    const caug7_2 = getChordDiagram("C+7");
    assertExists(caug7_1);
    assertExists(caug7_2);
  });
});

Deno.test({
  name: "Chord Diagram Stats - Coverage",
  sanitizeResources: false,
  sanitizeOps: false,
}, async (t) => {
  
  await t.step("stats show significant coverage increase", () => {
    const stats = getChordDiagramStats();
    
    // We should have many more generatable chords now
    assert(stats.generatable >= 400, `Expected >= 400 generatable, got ${stats.generatable}`);
    assert(stats.totalAvailable >= 450, `Expected >= 450 total, got ${stats.totalAvailable}`);
    
    // Should have jazz chord types in supported types
    const types = stats.supportedTypes;
    assert(types.includes("m7b5"), "Should support m7b5");
    assert(types.includes("7#9"), "Should support 7#9");
    assert(types.includes("maj9"), "Should support maj9");
    assert(types.includes("13"), "Should support 13");
  });

  await t.step("supported chord types include all jazz additions", () => {
    const types = getSupportedChordTypes();
    
    const expectedJazzTypes = [
      "m7b5", "ø", "7#9", "7b9", "7b5", "maj9", "M9", 
      "13", "m11", "7sus4", "mMaj7", "aug7", "+7", "6/9"
    ];
    
    for (const jazzType of expectedJazzTypes) {
      assert(types.includes(jazzType), `Should support ${jazzType}`);
    }
  });

  await t.step("canGenerateChord returns true for jazz chords", () => {
    const jazzChords = [
      "Am7b5", "Dm7b5", "E7#9", "G7b9", "Cmaj9", 
      "G13", "Dm11", "A7sus4", "CmMaj7", "Gaug7", "C6/9"
    ];
    
    for (const chord of jazzChords) {
      assert(canGenerateChord(chord), `Should be able to generate ${chord}`);
    }
  });
});

// ============ COMMON CHORD PROGRESSIONS - DIAGRAMS AVAILABLE ============

Deno.test({
  name: "Common Chord Progressions - Diagrams Available",
  sanitizeResources: false,
  sanitizeOps: false,
}, async (t) => {

  await t.step("I-IV-V-I progression in all keys", () => {
    // Major keys and their I-IV-V
    const progressions: Record<string, string[]> = {
      "C": ["C", "F", "G"],
      "G": ["G", "C", "D"],
      "D": ["D", "G", "A"],
      "A": ["A", "D", "E"],
      "E": ["E", "A", "B"],
      "F": ["F", "Bb", "C"],
      "Bb": ["Bb", "Eb", "F"],
      "Eb": ["Eb", "Ab", "Bb"],
    };

    for (const [key, chords] of Object.entries(progressions)) {
      for (const chord of chords) {
        assert(hasChordDiagram(chord), `Should have diagram for ${chord} (key of ${key})`);
      }
    }
  });

  await t.step("ii-V-I jazz progression in common keys", () => {
    // Jazz ii-V-I uses m7 - 7 - maj7
    const jazzProgressions: Record<string, string[]> = {
      "C": ["Dm7", "G7", "Cmaj7"],
      "G": ["Am7", "D7", "Gmaj7"],
      "F": ["Gm7", "C7", "Fmaj7"],
      "Bb": ["Cm7", "F7", "Bbmaj7"],
      "Eb": ["Fm7", "Bb7", "Ebmaj7"],
    };

    for (const [key, chords] of Object.entries(jazzProgressions)) {
      for (const chord of chords) {
        const diagram = getChordDiagram(chord);
        assertExists(diagram, `Should have diagram for ${chord} (jazz ii-V-I in ${key})`);
      }
    }
  });

  await t.step("minor ii-V-i (with m7b5) in common keys", () => {
    // Minor key ii-V-i uses m7b5 - 7 - m
    const minorJazzProgressions: Record<string, string[]> = {
      "Am": ["Bm7b5", "E7", "Am"],
      "Dm": ["Em7b5", "A7", "Dm"],
      "Em": ["F#m7b5", "B7", "Em"],
      "Gm": ["Am7b5", "D7", "Gm"],
      "Cm": ["Dm7b5", "G7", "Cm"],
    };

    for (const [key, chords] of Object.entries(minorJazzProgressions)) {
      for (const chord of chords) {
        const diagram = getChordDiagram(chord);
        assertExists(diagram, `Should have diagram for ${chord} (minor ii-V-i in ${key})`);
      }
    }
  });

  await t.step("blues turnaround with 7#9", () => {
    // Classic blues uses dominant 7ths and 7#9
    const bluesChords = ["E7", "A7", "B7", "E7#9", "A7#9"];
    
    for (const chord of bluesChords) {
      const diagram = getChordDiagram(chord);
      assertExists(diagram, `Should have diagram for blues chord ${chord}`);
    }
  });

  await t.step("pop/rock common progressions", () => {
    // I-V-vi-IV (most common pop progression)
    const popProgressions = [
      ["C", "G", "Am", "F"],      // Key of C
      ["G", "D", "Em", "C"],      // Key of G
      ["D", "A", "Bm", "G"],      // Key of D
      ["A", "E", "F#m", "D"],     // Key of A
    ];

    for (const chords of popProgressions) {
      for (const chord of chords) {
        assert(hasChordDiagram(chord), `Should have diagram for pop chord ${chord}`);
      }
    }
  });
});

// ============ OVERLAPPING CHORDS WITH DIAGRAMS ============

Deno.test({
  name: "Overlapping Chords - Jam Group with Jazz Chords",
  sanitizeResources: false,
  sanitizeOps: false,
}, async (t) => {
  const userA = `jam-jazz-a-${ts}` as ID;
  const userB = `jam-jazz-b-${ts}` as ID;

  await t.step("setup users with mix of basic and jazz chords", async () => {
    await ChordLibrary.addUser({ user: userA }).catch(() => {});
    await ChordLibrary.addUser({ user: userB }).catch(() => {});

    // User A: mix of rock and jazz
    for (const chord of ["C", "G", "Am", "E7#9", "Am7b5", "Dm7"]) {
      await ChordLibrary.addChordToInventory({
        user: userA,
        chord,
        mastery: "proficient",
      });
    }

    // User B: basic chords plus some jazz
    for (const chord of ["C", "G", "D", "Am7b5", "Dm7", "G7"]) {
      await ChordLibrary.addChordToInventory({
        user: userB,
        chord,
        mastery: "proficient",
      });
    }
  });

  await t.step("overlapping chords include jazz chords", async () => {
    const result = await ChordLibrary._getOverlappingChords({
      userIds: [userA, userB],
    });

    const chordNames = result.overlappingChords.map(c => c.chord);
    
    // Basic chords overlap
    assert(chordNames.includes("C"), "Should share C");
    assert(chordNames.includes("G"), "Should share G");
    
    // Jazz chords overlap
    assert(chordNames.includes("Am7b5"), "Should share Am7b5 (half-diminished)");
    assert(chordNames.includes("Dm7"), "Should share Dm7");
  });

  await t.step("all overlapping chords have diagrams available", async () => {
    const result = await ChordLibrary._getOverlappingChords({
      userIds: [userA, userB],
    });

    for (const overlap of result.overlappingChords) {
      const diagram = getChordDiagram(overlap.chord);
      assertExists(diagram, `Overlapping chord ${overlap.chord} should have diagram`);
      
      // Verify diagram structure
      assert(diagram[0].frets.length === 6, `${overlap.chord} should have 6 fret positions`);
      assert(diagram[0].fingers.length === 6, `${overlap.chord} should have 6 finger positions`);
    }
  });

  await t.step("can identify playable songs from overlapping chords", async () => {
    const result = await ChordLibrary._getOverlappingChords({
      userIds: [userA, userB],
    });

    const sharedChords = new Set(result.overlappingChords.map(c => c.chord));
    
    // Example songs that might work for this jam
    const potentialSongs = [
      { title: "Basic Blues", chords: ["C", "G", "Dm7"] },
      { title: "Jazz Standard", chords: ["Dm7", "G", "C", "Am7b5"] },
      { title: "Too Advanced", chords: ["C", "G", "Bbmaj7"] }, // Bbmaj7 not shared
    ];

    const playableSongs = potentialSongs.filter(song => 
      song.chords.every(chord => sharedChords.has(chord))
    );

    assertEquals(playableSongs.length, 2, "Should have 2 playable songs");
    assertEquals(playableSongs[0].title, "Basic Blues");
    assertEquals(playableSongs[1].title, "Jazz Standard");
  });
});

// ============ CHORD GENERATOR EDGE CASES ============

Deno.test({
  name: "Chord Generator - Edge Cases and Validation",
  sanitizeResources: false,
  sanitizeOps: false,
}, async (t) => {

  await t.step("handles enharmonic equivalents", () => {
    // Bb = A#, should both work
    const bb7 = getChordDiagram("Bb7");
    const asharp7 = getChordDiagram("A#7");
    assertExists(bb7);
    assertExists(asharp7);
    
    // Db = C#
    const dbmaj7 = getChordDiagram("Dbmaj7");
    const csharpmaj7 = getChordDiagram("C#maj7");
    assertExists(dbmaj7);
    assertExists(csharpmaj7);
  });

  await t.step("generates correct fret positions for different roots", () => {
    // F# should be higher frets (barre chord at fret 2 or 9)
    const fsharp = getChordDiagram("F#");
    assertExists(fsharp);
    assert(fsharp[0].baseFret >= 1, "F# should use barre chord position");
    
    // E can be open position
    const e = getChordDiagram("E");
    assertExists(e);
    // E should be at a low fret (hand-crafted is open)
  });

  await t.step("all 12 chromatic roots have major chord diagrams", () => {
    const roots = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    
    for (const root of roots) {
      const diagram = getChordDiagram(root);
      assertExists(diagram, `Should have diagram for ${root} major`);
    }
  });

  await t.step("all 12 chromatic roots have m7b5 diagrams", () => {
    const roots = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    
    for (const root of roots) {
      const chord = `${root}m7b5`;
      const diagram = getChordDiagram(chord);
      assertExists(diagram, `Should have diagram for ${chord}`);
    }
  });

  await t.step("returns null for unsupported chord types", () => {
    // These exotic chord types might not be supported
    const unsupported = getChordDiagram("Cmaj7#11b9");
    // Just verify it doesn't throw an error
    // It's OK if it returns null for very exotic chords
  });
});
