**concept** RecommendationEngine \
**purpose** guide a user's learning journey, helping them choose the next best chords to learn and discover relevant songs. \
**principle** user requests a chord recommendation, the engine analyzes their current chord inventory against a library of songs and suggests the next chord best to learn

**queries**

requestChordRecommendation (knownChords: set of Chord, allChords: set of Chord): (recommendedChord: Chord)
	
*   **requires** The set of `knownChords` is a proper subset of `allChords` (meaning there is at least one chord the user has not yet learned).
*   **effects** Analyzes the relationships between all chords (e.g., frequency in common progressions, popularity in songs). Returns a single `Chord` as `recommendedChord` that is not present in the user's `knownChords`. This recommendation is optimized to be the most impactful next step for the user's learning.

requestSongUnlockRecommendation (knownChords: set of Chord, potentialChord: Chord, allSongs: set of Song): (unlockedSongs: set of Song)

*   **requires** The `potentialChord` is not in the set of `knownChords`. The set of `allSongs` (each with its required chords) is available.
*   **effects** Identifies all songs from `allSongs` that can be played using the combined set of `knownChords` and the `potentialChord`. From this set, it filters out any songs that could already be played with `knownChords` alone. Returns the resulting list of newly playable songs as `unlockedSongs`.

requestPersonalizedSongRecommendation (knownChords: set of Chord, genrePreferences: set of Genre, allSongs: set of Song): (recommendedSongs: set of Song)

*   **requires** The set of `knownChords` is not empty.
*   **effects** Filters the set of `allSongs` to find all songs that are playable with the user's current `knownChords`. Further filters and ranks this result based on the user's `genrePreferences`. Returns a ranked list of playable songs tailored to the user's tastes as `recommendedSongs`.

recommendNextChordsForTargetSong (knownChords: set of Chord, targetSong: Song): (recommendedPath: sequence of Chord)
*   **requires** The `targetSong` exists. The set of chords required by `targetSong` is not a subset of the user's `knownChords`.
*   **effects** Identifies the set of `missingChords` required to play the `targetSong` that are not present in the `knownChords` set. It then orders these `missingChords` into a sequence based on pedagogical principles (e.g., prioritizing foundational chords, chords with simpler fingerings, or chords that unlock the most other songs). Returns this ordered learning path as `recommendedPath`.

**notes**
- The user will be presented with the recommendations of each of the different types -- captured by the different functions -- and will be able to choose which of them to follow.