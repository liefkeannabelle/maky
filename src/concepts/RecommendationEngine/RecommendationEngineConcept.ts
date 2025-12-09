import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "RecommendationEngine.";

// Enharmonic equivalents mapping (both directions)
const ENHARMONIC_MAP: Record<string, string> = {
  "A#": "Bb", "Bb": "A#",
  "C#": "Db", "Db": "C#",
  "D#": "Eb", "Eb": "D#",
  "F#": "Gb", "Gb": "F#",
  "G#": "Ab", "Ab": "G#",
};

/**
 * Validate if a chord symbol is well-formed.
 * Rejects malformed chords like "Eno3d", "Ano3d", etc.
 */
function isValidChord(chord: string): boolean {
  if (!chord || chord.length === 0) return false;
  
  // Must start with a valid note (A-G, optionally with # or b)
  const validRootPattern = /^[A-G](#|b)?/;
  if (!validRootPattern.test(chord)) return false;
  
  // Reject chords ending with invalid suffixes like "no3d" (should be "no3")
  // Common valid suffixes: m, maj, 7, 9, 11, 13, sus, add, dim, aug, no3, etc.
  // Invalid patterns: ending with random letters like "d" after a number
  const invalidSuffixPattern = /\d[a-z]+$/i;
  if (invalidSuffixPattern.test(chord) && !chord.match(/sus|add|dim|aug|maj|min/i)) {
    // Exception: "no3" is valid, "no3d" is not
    if (chord.match(/no\d+[a-z]/i)) return false;
  }
  
  return true;
}

/**
 * Normalize a chord to its canonical form (sharps preferred).
 * This ensures "Bb" -> "A#", "Db" -> "C#", etc.
 */
function normalizeToCanonical(chord: string): string {
  // Replace flat roots with sharp equivalents
  for (const [flat, sharp] of Object.entries(ENHARMONIC_MAP)) {
    // Only convert flats to sharps (Bb -> A#, not A# -> Bb)
    if (flat.includes("b") && chord.startsWith(flat)) {
      return chord.replace(flat, sharp);
    }
  }
  return chord;
}

/**
 * Check if a chord is known, considering enharmonic equivalents.
 * For example, if knownSet has "A#", this returns true for both "A#" and "Bb".
 */
function isChordKnown(chord: string, knownSet: Set<string>): boolean {
  // Direct match
  if (knownSet.has(chord)) return true;
  
  // Check enharmonic equivalent
  const normalized = normalizeToCanonical(chord);
  if (knownSet.has(normalized)) return true;
  
  // Check if the chord root has an enharmonic in the set
  for (const [from, to] of Object.entries(ENHARMONIC_MAP)) {
    if (chord.startsWith(from)) {
      const altChord = chord.replace(from, to);
      if (knownSet.has(altChord)) return true;
    }
  }
  
  return false;
}

// We define local interfaces for inputs to maintain Concept Independence.
// We do not import "Song" or "Chord" types from other concepts.

export interface SongInput {
  _id: ID;
  chords: string[];
  difficulty?: number;
}

export interface Recommendation {
  _id: ID;
  user: ID;
  recommendedChord: string;
  unlockedSongs: ID[];
  score: number;
  generatedAt: Date;
}

export default class RecommendationEngineConcept {
  recommendations: Collection<Recommendation>;

  constructor(private readonly db: Db) {
    this.recommendations = this.db.collection(PREFIX + "recommendations");
  }

  /**
   * calculateRecommendation
   * 
   * **requires** `user` exists. `knownChords` and `allSongs` are provided.
   * 
   * **effects** Analyzes the `allSongs` list against `knownChords`. Determines which chord, 
   * if learned, would 'unlock' the highest number of new songs (songs that become fully playable).
   * Creates a new Recommendation record with the result and returns its ID.
   */
  async calculateRecommendation(
    { user, knownChords, allSongs }: { user: ID; knownChords: string[]; allSongs: SongInput[] }
  ): Promise<{ recommendationId: ID }> {
    const knownSet = new Set(knownChords);
    
    // 1. Identify all potential chords (chords in songs that we don't know yet)
    // Use normalized form to avoid duplicates like Bb and A#
    const candidateChords = new Set<string>();
    for (const song of allSongs) {
      if (!song.chords) continue;
      for (const chord of song.chords) {
        // Check if chord is known (considering enharmonic equivalents)
        if (!isChordKnown(chord, knownSet)) {
          // Store the normalized (canonical) form to avoid Bb/A# duplicates
          candidateChords.add(normalizeToCanonical(chord));
        }
      }
    }

    let bestChord: string | null = null;
    let maxUnlocked = -1;
    let bestUnlockedSongs: ID[] = [];
    let bestAvgDifficulty = Number.MAX_VALUE;

    // 2. Evaluate each candidate chord
    for (const candidate of candidateChords) {
      // Temporarily assume we know this candidate (add both forms for matching)
      const testKnown = new Set(knownChords);
      testKnown.add(candidate);
      // Also add the enharmonic equivalent for proper song matching
      for (const [from, to] of Object.entries(ENHARMONIC_MAP)) {
        if (candidate.startsWith(from)) {
          testKnown.add(candidate.replace(from, to));
        }
      }

      const unlockedForCandidate: ID[] = [];
      let totalDifficulty = 0;
      let difficultyCount = 0;

      for (const song of allSongs) {
        if (!song.chords) continue;
        // Check if song is playable with testKnown (considering enharmonics)
        const isPlayableNow = song.chords.every(c => isChordKnown(c, testKnown));
        
        // Check if song was ALREADY playable with just knownChords (we only want NEW unlocks)
        const wasPlayableBefore = song.chords.every(c => isChordKnown(c, knownSet));

        if (isPlayableNow && !wasPlayableBefore) {
          unlockedForCandidate.push(song._id);
          if (song.difficulty !== undefined) {
            totalDifficulty += song.difficulty;
            difficultyCount++;
          }
        }
      }

      const score = unlockedForCandidate.length;
      const avgDiff = difficultyCount > 0 ? totalDifficulty / difficultyCount : 0;

      // 3. Compare and update best
      // Logic: Prefer higher score. Tie-break: lower difficulty. Tie-break: alphabetical.
      let isBetter = false;

      if (score > maxUnlocked) {
        isBetter = true;
      } else if (score === maxUnlocked) {
        // Tie-breaking
        if (avgDiff < bestAvgDifficulty) {
          isBetter = true;
        } else if (avgDiff === bestAvgDifficulty) {
          if (bestChord === null || candidate < bestChord) {
            isBetter = true;
          }
        }
      }

      if (isBetter) {
        bestChord = candidate;
        maxUnlocked = score;
        bestUnlockedSongs = unlockedForCandidate;
        bestAvgDifficulty = avgDiff;
      }
    }

    if (!bestChord) {
      // If no chords left to learn or no songs to unlock, we handle gracefully
      // In a real app, we might recommend a random popular chord or return an error.
      // For this spec, we save a null recommendation or throw.
      // Let's return a specific empty state or "None" to indicate mastery.
      return { recommendationId: "none" as ID }; 
    }

    const recommendation: Recommendation = {
      _id: freshID(),
      user,
      recommendedChord: bestChord,
      unlockedSongs: bestUnlockedSongs,
      score: maxUnlocked,
      generatedAt: new Date(),
    };

    await this.recommendations.insertOne(recommendation);

    return { recommendationId: recommendation._id };
  }

  /**
   * _getRecommendation
   * 
   * **requires** `recommendationId` exists.
   * 
   * **effects** Returns the stored recommendation object found by ID.
   */
  async _getRecommendation(
    { recommendationId }: { recommendationId: ID }
  ): Promise<Recommendation[]> {
    const doc = await this.recommendations.findOne({ _id: recommendationId });
    if (!doc) return [];
    return [doc];
  }

  /**
   * requestChordRecommendation (Stateless Query)
   * 
   * **requires** `knownChords` is a proper subset of `allSongs` chords.
   * 
   * **effects** Pure calculation. Analyzes chord relationships and returns a single chord 
   * that is not present in `knownChords` but is most impactful.
   */
  async requestChordRecommendation(
    { knownChords, allSongs }: { knownChords: string[]; allSongs: SongInput[] }
  ): Promise<Array<{ recommendedChord: string }>> {
    const startTime = Date.now();
    // Re-use logic structure but without DB side effects
    const knownSet = new Set(knownChords);
    
    // Use normalized form to avoid duplicates like Bb and A#
    const candidateChords = new Set<string>();
    for (const song of allSongs) {
      if (!song.chords) continue;
      for (const chord of song.chords) {
        // Skip invalid chords (e.g., "Eno3d" instead of "Eno3")
        if (!isValidChord(chord)) {
          console.log(`[RecEngine] Skipping invalid chord: ${chord}`);
          continue;
        }
        if (!isChordKnown(chord, knownSet)) {
          candidateChords.add(normalizeToCanonical(chord));
        }
      }
    }
    
    console.log(`[RecEngine] Found ${candidateChords.size} candidate chords from ${allSongs.length} songs`);

    // Pre-compute normalized song chords to avoid repeated normalization
    // Filter out invalid chords from songs
    const normalizedSongs = allSongs.map(song => ({
      chords: song.chords ? song.chords.filter(c => isValidChord(c)).map(c => normalizeToCanonical(c)) : [],
      originalChords: song.chords ? song.chords.filter(c => isValidChord(c)) : []
    }));

    let bestChord: string | null = null;
    let maxUnlocked = -1;

    for (const candidate of candidateChords) {
      let score = 0;
      
      // Build a test set that includes the candidate and its enharmonic
      const testKnown = new Set(knownChords);
      testKnown.add(candidate);
      for (const [from, to] of Object.entries(ENHARMONIC_MAP)) {
        if (candidate.startsWith(from)) {
          testKnown.add(candidate.replace(from, to));
        }
      }
      
      for (const normalizedSong of normalizedSongs) {
        if (normalizedSong.chords.length === 0) continue;
        
        // Check if song needs this candidate
        const needsCandidate = normalizedSong.chords.includes(candidate) && 
          !normalizedSong.originalChords.some(c => isChordKnown(c, knownSet));
        
        if (!needsCandidate) continue;
        
        // Check if all other chords are known
        const allOtherChordsKnown = normalizedSong.originalChords.every(c => 
          normalizeToCanonical(c) === candidate || isChordKnown(c, knownSet)
        );
        
        if (allOtherChordsKnown) {
          score++;
        }
      }

      if (score > maxUnlocked || (score === maxUnlocked && (!bestChord || candidate < bestChord))) {
        maxUnlocked = score;
        bestChord = candidate;
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[RecEngine] Computed recommendation in ${elapsed}ms, best: ${bestChord}, unlocks: ${maxUnlocked}`);

    if (!bestChord) return [];
    return [{ recommendedChord: bestChord }];
  }

  /**
   * requestPersonalizedSongRecommendation
   * 
   * **requires** `knownChords` is not empty.
   * 
   * **effects** Filters `allSongs` to find songs playable with `knownChords`.
   * Optionally ranks by `genrePreferences`.
   */
  async requestPersonalizedSongRecommendation(
    { knownChords, allSongs, genrePreferences }: 
    { knownChords: string[]; allSongs: SongInput[]; genrePreferences?: string[] }
  ): Promise<Array<{ recommendedSongs: ID[] }>> {
    const knownSet = new Set(knownChords);
    const playableSongs: SongInput[] = [];

    for (const song of allSongs) {
      if (!song.chords) continue;
      
      // Filter out invalid chords from the song
      const validChords = song.chords.filter(c => isValidChord(c));
      if (validChords.length === 0) continue;
      
      const isPlayable = validChords.every(c => knownSet.has(c));
      if (isPlayable) {
        playableSongs.push(song);
      }
    }

    // Simple ranking: Genre match first, then difficulty (if available), then random/default
    // For now, just filter/sort.
    
    const sortedSongs = playableSongs;

    if (genrePreferences && genrePreferences.length > 0) {
        // TODO: Add genre to SongInput if we want to filter by it here.
        // For now, we assume the caller might have pre-filtered or we just return playable.
        // Since SongInput doesn't have genre in the interface above, we can't filter by it strictly
        // unless we update SongInput.
        // But let's just return all playable for now.
    }

    // Sort by difficulty if available
    sortedSongs.sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));

    return [{ recommendedSongs: sortedSongs.map(s => s._id) }];
  }

  /**
   * recommendNextChordsForTargetSong
   * 
   * **requires** `targetSong` exists.
   * 
   * **effects** Identifies missing chords and returns a learning path.
   */
  async recommendNextChordsForTargetSong(
    { knownChords, targetSong }: 
    { knownChords: string[]; targetSong: SongInput }
  ): Promise<Array<{ recommendedPath: string[] }>> {
    const knownSet = new Set(knownChords);
    const missingChords = targetSong.chords.filter(c => !knownSet.has(c));
    
    // Remove duplicates
    const uniqueMissing = Array.from(new Set(missingChords));

    // Simple path: just return the missing chords. 
    // A smarter engine would order them by "usefulness" in other songs.
    return [{ recommendedPath: uniqueMissing }];
  }

  /**
   * requestSongUnlockRecommendation (Stateless Query)
   * 
   * **requires** `potentialChord` is not in `knownChords`.
   * 
   * **effects** Identifies all songs from `allSongs` that can be played using `knownChords` + `potentialChord`
   * but were NOT playable with `knownChords` alone.
   */
  async requestSongUnlockRecommendation(
    { knownChords, potentialChord, allSongs }: 
    { knownChords: string[]; potentialChord: string; allSongs: SongInput[] }
  ): Promise<Array<{ unlockedSongs: ID[] }>> {
    const knownSet = new Set(knownChords);
    const unlocked: ID[] = [];

    for (const song of allSongs) {
      if (!song.chords) continue;
      
      // Filter out invalid chords from the song
      const validChords = song.chords.filter(c => isValidChord(c));
      if (validChords.length === 0) continue;
      
      const isPlayableWithNew = validChords.every(c => c === potentialChord || knownSet.has(c));
      const wasPlayableBefore = validChords.every(c => knownSet.has(c));

      if (isPlayableWithNew && !wasPlayableBefore) {
        unlocked.push(song._id);
      }
    }

    return [{ unlockedSongs: unlocked }];
  }
}