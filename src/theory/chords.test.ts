import { assertEquals } from "jsr:@std/assert";
import {
  isValidChordSymbol,
  normalizeChordSymbol,
  parseChordSymbol,
  COMMON_CHORD_SUFFIXES,
  CANONICAL_ROOTS,
} from "./chords.ts";

import curatedSongsData from "../../data/songs.json" with { type: "json" };
import chordonomiconSongsData from "../../data/chordonomicon_songs.json" with {
  type: "json",
};

type RawSong = {
  id: string;
  title: string;
  artist: string;
  chords: string[];
  simplifiedChords?: string[];
  sections?: Array<{
    name: string;
    progression?: string[];
    chords?: string[];
  }>;
};

Deno.test("normalizeChordSymbol uppercases roots", () => {
  assertEquals(normalizeChordSymbol("e"), "E");
  assertEquals(normalizeChordSymbol("ebmaj7"), "D#maj7");
  assertEquals(normalizeChordSymbol("c/e"), "C/E");
});

Deno.test("Chord Theory - All supported suffixes are valid", () => {
  for (const root of CANONICAL_ROOTS) {
    for (const suffix of COMMON_CHORD_SUFFIXES) {
      const chord = suffix === "" ? root : `${root}${suffix}`;
      const isValid = isValidChordSymbol(chord);
      assertEquals(
        isValid,
        true,
        `Chord "${chord}" (${root}${suffix}) should be valid`
      );
    }
  }
});

Deno.test("Chord Theory - Common chord patterns are valid", () => {
  const commonChords = [
    // Basic triads
    "C", "Cm", "D", "Dm", "E", "Em", "F", "Fm", "G", "Gm", "A", "Am", "B", "Bm",
    
    // Seventh chords
    "C7", "Cm7", "Cmaj7", "D7", "Dm7", "Dmaj7", "E7", "Em7", "Emaj7",
    "F7", "Fm7", "Fmaj7", "G7", "Gm7", "Gmaj7", "A7", "Am7", "Amaj7", "B7", "Bm7", "Bmaj7",
    
    // Sus chords
    "Csus2", "Csus4", "Dsus2", "Dsus4", "Esus2", "Esus4", "Fsus2", "Fsus4",
    "Gsus2", "Gsus4", "Asus2", "Asus4", "Bsus4",
    
    // Add chords
    "Cadd9", "Dadd9", "Eadd9", "Fadd9", "Gadd9", "Aadd9",
    
    // Power chords and no-third chords
    "C5", "D5", "E5", "F5", "G5", "A5", "B5",
    "Cno3", "Dno3", "Eno3", "Fno3", "Gno3", "Ano3", "Bno3",
    
    // Extended chords
    "C9", "Cm9", "Cmaj9", "D9", "Dm9", "E9", "F9", "G9", "A9", "B9",
    "C11", "Cm11", "D11", "E11", "F11", "G11", "A11",
    "C13", "Cm13", "D13", "E13", "F13", "G13", "A13",
    
    // Augmented and diminished
    "Caug", "Daug", "Eaug", "Faug", "Gaug", "Aaug", "Baug",
    "Cdim", "Ddim", "Edim", "Fdim", "Gdim", "Adim", "Bdim",
    "Cdim7", "Ddim7", "Edim7", "Fdim7", "Gdim7", "Adim7", "Bdim7",
    
    // Altered chords
    "C7#9", "C7b9", "C7#5", "C7b5", "D7#9", "E7#9", "F7#9", "G7#9", "A7#9", "B7#9",
    "Cm7b5", "Dm7b5", "Em7b5", "Fm7b5", "Gm7b5", "Am7b5", "Bm7b5",
    
    // Slash chords
    "C/E", "C/G", "D/F#", "G/B", "Am/G", "F/C",
    
    // Sharp roots
    "C#", "C#m", "C#7", "C#maj7", "C#sus2", "C#sus4",
    "D#", "D#m", "D#7", "D#sus2", "D#sus4",
    "F#", "F#m", "F#7", "F#maj7", "F#sus2", "F#sus4",
    "G#", "G#m", "G#7", "G#sus2", "G#sus4",
    "A#", "A#m", "A#7", "A#sus2", "A#sus4",
    
    // Flat roots (should normalize to sharps)
    "Bb", "Bbm", "Bb7", "Bbmaj7",
    "Eb", "Ebm", "Eb7", "Ebmaj7",
    "Ab", "Abm", "Ab7", "Abmaj7",
    "Db", "Dbm", "Db7", "Dbmaj7",
    "Gb", "Gbm", "Gb7", "Gbmaj7",
  ];

  for (const chord of commonChords) {
    const isValid = isValidChordSymbol(chord);
    assertEquals(isValid, true, `Common chord "${chord}" should be valid`);
    
    const normalized = normalizeChordSymbol(chord);
    assertEquals(normalized !== null, true, `Chord "${chord}" should normalize successfully`);
  }
});

Deno.test("Chord Theory - All chords in song data are valid", () => {
  const curated = curatedSongsData as RawSong[];
  const chordonomicon = chordonomiconSongsData as RawSong[];
  const allSongs: RawSong[] = [...curated, ...chordonomicon];

  const allChords = new Set<string>();
  const invalidChords = new Map<string, string[]>(); // chord -> [song titles]

  for (const song of allSongs) {
    // Collect from main chords array
    if (song.chords && Array.isArray(song.chords)) {
      for (const chord of song.chords) {
        allChords.add(chord);
        if (!isValidChordSymbol(chord)) {
          if (!invalidChords.has(chord)) {
            invalidChords.set(chord, []);
          }
          invalidChords.get(chord)!.push(song.title);
        }
      }
    }

    // Collect from simplifiedChords
    if (song.simplifiedChords && Array.isArray(song.simplifiedChords)) {
      for (const chord of song.simplifiedChords) {
        allChords.add(chord);
        if (!isValidChordSymbol(chord)) {
          if (!invalidChords.has(chord)) {
            invalidChords.set(chord, []);
          }
          invalidChords.get(chord)!.push(`${song.title} (simplified)`);
        }
      }
    }

    // Collect from sections
    if (song.sections && Array.isArray(song.sections)) {
      for (const section of song.sections) {
        if (section.chords && Array.isArray(section.chords)) {
          for (const chord of section.chords) {
            allChords.add(chord);
            if (!isValidChordSymbol(chord)) {
              if (!invalidChords.has(chord)) {
                invalidChords.set(chord, []);
              }
              invalidChords.get(chord)!.push(`${song.title} (section: ${section.name})`);
            }
          }
        }
        if (section.progression && Array.isArray(section.progression)) {
          for (const chord of section.progression) {
            allChords.add(chord);
            if (!isValidChordSymbol(chord)) {
              if (!invalidChords.has(chord)) {
                invalidChords.set(chord, []);
              }
              invalidChords.get(chord)!.push(`${song.title} (progression: ${section.name})`);
            }
          }
        }
      }
    }
  }

  console.log(`\n📊 Chord Data Statistics:`);
  console.log(`   Total songs: ${allSongs.length}`);
  console.log(`   Unique chords: ${allChords.size}`);
  console.log(`   Invalid chords: ${invalidChords.size}`);

  if (invalidChords.size > 0) {
    console.log(`\n❌ Invalid chords found:`);
    for (const [chord, songs] of invalidChords.entries()) {
      console.log(`   "${chord}" (in ${songs.length} songs):`);
      for (const song of songs.slice(0, 3)) {
        console.log(`      - ${song}`);
      }
      if (songs.length > 3) {
        console.log(`      ... and ${songs.length - 3} more`);
      }
    }
  } else {
    console.log(`\n✅ All chords in song data are valid!`);
  }

  assertEquals(
    invalidChords.size,
    0,
    `Found ${invalidChords.size} invalid chord(s): ${Array.from(invalidChords.keys()).join(", ")}`
  );
});
