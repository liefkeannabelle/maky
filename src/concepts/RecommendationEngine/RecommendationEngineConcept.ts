import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "RecommendationEngine.";

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
    const candidateChords = new Set<string>();
    for (const song of allSongs) {
      for (const chord of song.chords) {
        if (!knownSet.has(chord)) {
          candidateChords.add(chord);
        }
      }
    }

    let bestChord: string | null = null;
    let maxUnlocked = -1;
    let bestUnlockedSongs: ID[] = [];
    let bestAvgDifficulty = Number.MAX_VALUE;

    // 2. Evaluate each candidate chord
    for (const candidate of candidateChords) {
      // Temporarily assume we know this candidate
      const testKnown = new Set(knownChords);
      testKnown.add(candidate);

      const unlockedForCandidate: ID[] = [];
      let totalDifficulty = 0;
      let difficultyCount = 0;

      for (const song of allSongs) {
        // Check if song is playable with testKnown
        const isPlayableNow = song.chords.every(c => testKnown.has(c));
        
        // Check if song was ALREADY playable with just knownChords (we only want NEW unlocks)
        const wasPlayableBefore = song.chords.every(c => knownSet.has(c));

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
    // Re-use logic structure but without DB side effects
    // Note: In a real implementation, we might extract the logic to a private method.
    // For this file constraint, I will duplicate the core pure logic briefly or simulate the result.
    
    // To avoid duplication in this specific output block, we perform the same search:
    const knownSet = new Set(knownChords);
    const candidateChords = new Set<string>();
    for (const song of allSongs) {
      for (const chord of song.chords) {
        if (!knownSet.has(chord)) candidateChords.add(chord);
      }
    }

    let bestChord: string | null = null;
    let maxUnlocked = -1;

    for (const candidate of candidateChords) {
      let score = 0;
      for (const song of allSongs) {
        const needsCandidate = song.chords.includes(candidate);
        const remainderKnown = song.chords.every(c => c === candidate || knownSet.has(c));
        // If the song needs this candidate AND all other chords are known, it's an unlock.
        if (needsCandidate && remainderKnown) {
            score++;
        }
      }

      if (score > maxUnlocked || (score === maxUnlocked && (!bestChord || candidate < bestChord))) {
        maxUnlocked = score;
        bestChord = candidate;
      }
    }

    if (!bestChord) return [];
    return [{ recommendedChord: bestChord }];
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
      const isPlayableWithNew = song.chords.every(c => c === potentialChord || knownSet.has(c));
      const wasPlayableBefore = song.chords.every(c => knownSet.has(c));

      if (isPlayableWithNew && !wasPlayableBefore) {
        unlocked.push(song._id);
      }
    }

    return [{ unlockedSongs: unlocked }];
  }
}