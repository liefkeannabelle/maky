[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@concepts](../../concepts.md)

[@RecommendationEngine](RecommendationEngine.md)

# implement prompt

Implement the **RecommendationEngine** concept for the ChordConnect app.

Use the RecommendationEngine concept specification in `RecommendationEngine.md` as the source of truth for the actions and queries (for example: `calculateRecommendation`, `getRecommendation`, `requestChordRecommendation`, etc.).

Implement a TypeScript class `RecommendationEngineConcept` that:

- Given a user’s current known chords (and optionally their preferences), calculates:
  - A recommended “next best chord” to learn.
  - The set of songs that would be unlocked by learning that chord.
- Optionally stores recommendation results by `recommendationId` so they can be fetched later.

# requirements

- Treat this concept as mostly **stateless logic** over other concepts:

  - Fetch the user’s known chords via `ChordLibrary` (e.g., a query like `getKnownChords(user)`).
  - Fetch songs and their chords via `SongLibrary` (e.g., `getAllSongs()`, `getSongChords(song)`).

- Use the same chord strings as the `songs.json` dataset (e.g., `"C"`, `"G"`, `"Am"`, `"B7"`). If there is a chord-normalization helper elsewhere, reuse it.

- Baseline recommendation rule for “next best chord”:

  1. Let `knownChords` be the set of chords the user currently knows.
  2. Let `allSongs` be the songs in the SongLibrary.
  3. Compute the set of all chords that appear in any song: `allChords`.
  4. Candidate chords are `allChords \ knownChords`.
  5. For each candidate chord `c`:

     - Define `unlockedSongs(c)` as the set of songs `s` such that:
       - Every chord in `s` is in `knownChords ∪ {c}`, and
       - At least one chord in `s` is **not** in `knownChords` (i.e., the song is not already fully playable without `c`).

     - Let `count = |unlockedSongs(c)|`.

     - Optionally, compute an average difficulty:
       - `avgDifficulty(c) = average(difficulty(s) for s in unlockedSongs(c))`, ignoring songs with missing difficulty.

  6. Compute a simple score:

     - `score(c) = count` (or, if you want weighting: `score(c) = count * 10 - avgDifficulty(c)`).

  7. Choose the chord `c` with the highest score as the **recommended chord**.  
     - Break ties by:
       - Lower average difficulty first.
       - Then alphabetical order of the chord name.

- Implement whatever actions/queries are defined for RecommendationEngine in `concepts.md`, for example:

  - `calculateRecommendation(user, goal)`:
    - Pulls `knownChords` from `ChordLibrary`.
    - Pulls all songs from `SongLibrary`.
    - Runs the scoring algorithm described above.
    - Creates a recommendation record with:
      - `recommendedChord`
      - `unlockedSongs` (list of song IDs or song objects)
      - any helpful metadata (e.g., `scores`).
    - Returns a `recommendationId`.

  - `getRecommendation(recommendationId)`:
    - Returns the previously computed recommendation object.

- The RecommendationEngine should **not** directly access the database for chords/songs; it must go through other concepts’ queries so that the logic remains decoupled.

- All actions and queries should:
  - Validate inputs (non-empty user, valid recommendation ID).
  - Return object-shaped results with clear field names.
  - Be deterministic given the same known chords and song library.
# response:

# concept: RecommendationEngine
**purpose** guide a user's learning journey, helping them choose the next best chords to learn and discover relevant songs.

**principle** user requests a chord recommendation, the engine analyzes their current chord inventory against a library of songs and suggests the next chord best to learn that unlocks the most musical possibilities.

**state**
> a set of Recommendations with
> > a user User
> > a recommendedChord String
> > a unlockedSongs set of SongIDs
> > a generatedAt DateTime

**actions**
calculateRecommendation (user: User, knownChords: String[], allSongs: SongData[]): (recommendationId: String)
* **requires** `user` is valid. `knownChords` and `allSongs` are provided.
* **effects** Computes the best chord to learn next based on unlocking the most songs. Stores this result in the state and returns the `recommendationId`.

**queries**
_getRecommendation (recommendationId: String): (recommendation: Recommendation)
* **requires** `recommendationId` exists.
* **effects** Returns the stored recommendation details.

requestChordRecommendation (knownChords: set of Chord, allSongs: set of Song): (recommendedChord: Chord)
* **requires** `knownChords` is not a superset of all available chords in `allSongs`.
* **effects** Pure calculation returning the chord that unlocks the most songs.

requestSongUnlockRecommendation (knownChords: set of Chord, potentialChord: Chord, allSongs: set of Song): (unlockedSongs: set of Song)
* **requires** `potentialChord` is not in `knownChords`.
* **effects** Identifies all songs that become playable if `potentialChord` is added to `knownChords`.

# file: src/concepts/RecommendationEngine/RecommendationEngineConcept.ts
```typescript
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
```