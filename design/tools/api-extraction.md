[@implementing-concepts](../background/implementing-concepts.md)
[@api-extraction-from-code](api-extraction-from-code.md)

[@api-specification-new](../api-specification-new.md)

# Prompt: Please extract an API for this app from the following concepts (also refer to your previous api-spec.md implementation to see how detailed and in depth it should be):

**CRITICAL INSTRUCTION**:
For the concepts listed below, we have implemented **Synchronization Logic** (`.sync.ts` files) that wraps the raw Concept actions.
The API Specification MUST reflect the **public HTTP API** defined in these syncs, NOT the internal Concept methods.
- **Authentication**: If a sync takes `sessionId` and resolves it to `user`, the API Endpoint requires `sessionId` in the Request Body, and the Description should state "Authentication: Requires a valid `sessionId`".
- **Parameters**: Use the `when` clause in the sync to determine the actual JSON parameters expected from the frontend.
- **Passthrough**: If no sync exists for an action, assume it uses the default passthrough (which might expose internal IDs directly, but check if it's excluded in `passthrough.ts` if that file was provided - otherwise assume direct mapping).

ONLY CHANGE WHATEVER I LISTED.

## SongLibrary

Specification: 

[@SongLibrary](../concepts/SongLibrary/SongLibrary.md)


Code:

[@SongLibraryConcept.ts](../../src/concepts/SongLibrary/SongLibraryConcept.ts)

Syncs (Public API Definition):
[@songLibrary.sync.ts](../../src/syncs/songLibrary.sync.ts)

## ChordLibrary
Specification:

[@ChordLibrary](../concepts/ChordLibrary/ChordLibrary.md)


Code:

[@ChordLibraryConcept.ts](../../src/concepts/ChordLibrary/ChordLibraryConcept.ts)

Syncs (Public API Definition):
[@chordLibrary.sync.ts](../../src/syncs/chordLibrary.sync.ts)

## Chord

Specification:

[@Chord](../concepts/Chord/Chord.md)


Code:

[@ChordConcept.ts](../../src/concepts/Chord/ChordConcept.ts)

Syncs (Public API Definition):
(Note: Chord queries are handled in chordLibrary.sync.ts)
[@chordLibrary.sync.ts](../../src/syncs/chordLibrary.sync.ts)

## Song
Specification:
(Note: Song concept was extracted from SongLibrary. Refer to code for actions like createSong, deleteSong, and queries.)

Code:

[@SongConcept.ts](../../src/concepts/Song/SongConcept.ts)

Syncs (Public API Definition):
(Note: Song queries are handled in songLibrary.sync.ts)
[@songLibrary.sync.ts](../../src/syncs/songLibrary.sync.ts)

## RecommendationEngine

Specification:

[@RecommendationEngine](../concepts/RecommendationEngine/RecommendationEngine.md)

Code:

[@RecommendationEngineConcept.ts](../../src/concepts/RecommendationEngine/RecommendationEngineConcept.ts)

Syncs (Public API Definition):
[@recommendationEngine.sync.ts](../../src/syncs/recommendationEngine.sync.ts)


# response:

# API Specification: SongLibrary Concept

**Purpose:** Manage a user's personal progress in learning songs.

***

## API Endpoints

### POST /api/SongLibrary/addUser

**Description:** Initializes a user's song tracking journal.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* The user associated with `sessionId` does not already exist in the SongLibrary.

**Effects:**

* Adds the authenticated user to the SongLibrary with an empty progress list.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/SongLibrary/removeUser

**Description:** Removes a user's song tracking journal.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* The user associated with `sessionId` exists in the SongLibrary.

**Effects:**

* Removes the user and all their associated `SongProgress` entries from the state.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/SongLibrary/startLearningSong

**Description:** Adds a song to a user's learning journal.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* The `song` exists. The user associated with `sessionId` exists and is not already tracking this `song`.

**Effects:**

* Creates a new `SongProgress` entry for the authenticated user, associating them with the specified `song` and `mastery` level.

**Request Body:**

```json
{
  "sessionId": "string",
  "song": "string",
  "mastery": "string" // "in-progress" | "mastered" | "na"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/SongLibrary/updateSongMastery

**Description:** Updates the mastery level of a song in a user's journal.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* The user associated with `sessionId` is already tracking the specified `song`.

**Effects:**

* Updates the `mastery` level for the specific song entry.

**Request Body:**

```json
{
  "sessionId": "string",
  "song": "string",
  "newMastery": "string" // "in-progress" | "mastered" | "na"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/SongLibrary/stopLearningSong

**Description:** Removes a song from a user's learning journal.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* The user associated with `sessionId` is currently tracking the specified `song`.

**Effects:**

* Deletes the `SongProgress` entry for the authenticated user and `song`.

**Request Body:**

```json
{
  "sessionId": "string",
  "song": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/SongLibrary/\_getSongsInProgress

**Description:** Retrieves all songs a user is currently learning with their mastery levels.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* The user associated with `sessionId` exists.

**Effects:**

* Returns an array of objects containing the full song details and the user's current mastery level.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "song": {
      "_id": "string",
      "title": "string",
      "artist": "string",
      "chords": ["string"]
    },
    "mastery": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/SongLibrary/\_getPlayableSongs

**Description:** Gets all songs that a user can play with their current chord knowledge.

**Authentication:** Requires a valid `sessionId`. The user's known chords are automatically retrieved from the session (via ChordLibrary).

**Requirements:**

* The user associated with `sessionId` exists.

**Effects:**

* Returns the set of all `Songs` whose `chords` are a subset of the user's known chords. If `genres` are provided, the result is further filtered to only include songs whose genre is in the `genres` set.

**Request Body:**

```json
{
  "sessionId": "string",
  "genres": ["string"] // optional
}
```

**Success Response Body (Query):**

```json
[
  {
    "song": {
      "_id": "string",
      "title": "string",
      "artist": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

# API Specification: ChordLibrary Concept

**Purpose:** Maintain an inventory of chords known by each user and their proficiency.

***

## API Endpoints

### POST /api/ChordLibrary/addUser

**Description:** Adds a user to the chord library system.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* The user associated with `sessionId` does not already exist in the ChordLibrary.

**Effects:**

* Adds the authenticated user to the concept, creating an empty inventory.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ChordLibrary/addChordToInventory

**Description:** Adds a chord to a user's inventory with a mastery level.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* The user associated with `sessionId` exists. The chord symbol is valid. The user does not already have this chord in their inventory.

**Effects:**

* Normalizes the chord symbol and creates a new `KnownChord` entry.

**Request Body:**

```json
{
  "sessionId": "string",
  "chord": "string",
  "mastery": "string" // "not started" | "in progress" | "proficient" | "mastered"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ChordLibrary/updateChordMastery

**Description:** Updates the mastery level of a known chord.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* The user associated with `sessionId` has the specified `chord` in their inventory.

**Effects:**

* Updates the `mastery` of the existing entry to `newMastery`.

**Request Body:**

```json
{
  "sessionId": "string",
  "chord": "string",
  "newMastery": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ChordLibrary/removeChordFromInventory

**Description:** Removes a chord from a user's inventory.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* The user associated with `sessionId` has the specified `chord` in their inventory.

**Effects:**

* Deletes the `KnownChord` entry.

**Request Body:**

```json
{
  "sessionId": "string",
  "chord": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ChordLibrary/removeUser

**Description:** Removes a user from the chord library system.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**


* The user associated with `sessionId` exists.

**Effects:**

* Removes the user and all their known chords from the state.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ChordLibrary/\_getKnownChords

**Description:** Retrieves all known chords for a user with their mastery levels.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* The user associated with `sessionId` exists.

**Effects:**

* Returns the set of all `KnownChord` entries for the authenticated user, each containing a chord and its mastery level.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "chord": "string",
    "mastery": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ChordLibrary/\_getChordMastery

**Description:** Retrieves the mastery level for a specific chord for a user.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* The user associated with `sessionId` exists and knows the chord.

**Effects:**

* Returns the mastery level for the requested chord.

**Request Body:**

```json
{
  "sessionId": "string",
  "chord": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "mastery": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

# API Specification: Chord Concept

**Purpose:** Define fundamental musical chords (Admin management).

***

## API Endpoints

### POST /api/Chord/createChord

**Description:** Creates a new chord definition in the system.

**Authentication:** Requires a valid `sessionId` (typically Admin).

**Requirements:**

* No Chord with the given `name` already exists.

**Effects:**

* Creates a new Chord entity with the specified notes.

**Request Body:**

```json
{
  "sessionId": "string",
  "name": "string",
  "notes": ["string"]
}
```

**Success Response Body (Action):**

```json
{
  "chord": {
    "_id": "string",
    "name": "string",
    "notes": ["string"]
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Chord/deleteChord

**Description:** Deletes a chord definition.

**Authentication:** Requires a valid `sessionId` (typically Admin).

**Requirements:**

* The Chord `chord` exists.

**Effects:**

* Removes the Chord from the state.

**Request Body:**

```json
{
  "sessionId": "string",
  "chord": "string" // ID
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Chord/\_getChordByName

**Description:** Look up a chord by its name (e.g., "C", "Am7").

**Requirements:**

* None.

**Effects:**

* Returns the chord object if found.

**Request Body:**

```json
{
  "name": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "chord": {
      "_id": "string",
      "name": "string",
      "notes": ["string"]
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Chord/\_getAllChords

**Description:** Retrieves all defined chords.

**Requirements:**

* None.

**Effects:**

* Returns a list of all chords sorted by name.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "chords": [
      {
        "_id": "string",
        "name": "string",
        "notes": ["string"]
      }
    ]
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

# API Specification: Song Concept

**Purpose:** Manage the global catalog of songs.

***

## API Endpoints

### POST /api/Song/createSong

**Description:** Creates a new song in the catalog.

**Authentication:** Requires a valid `sessionId` (typically Admin).

**Requirements:**

* No Song with the exact same `title` and `artist` exists.

**Effects:**

* Creates a new Song with the provided metadata.

**Request Body:**

```json
{
  "sessionId": "string",
  "title": "string",
  "artist": "string",
  "chords": ["string"],
  "genre": "string", // optional
  "key": "string", // optional
  "tempo": "number", // optional
  "difficulty": "number", // optional
  "tags": ["string"], // optional
  "source": "string" // optional
}
```

**Success Response Body (Action):**

```json
{
  "song": {
    "_id": "string",
    "title": "string",
    "artist": "string"
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Song/deleteSong

**Description:** Deletes a song from the catalog.

**Authentication:** Requires a valid `sessionId` (typically Admin).

**Requirements:**

* The Song `song` exists.

**Effects:**

* Removes the song from the state.

**Request Body:**

```json
{
  "sessionId": "string",
  "song": "string" // ID
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Song/\_getPlayableSongs

**Description:** Finds songs that can be played given a specific set of known chords. This is the raw query version used if you want to explicitly check a set of chords, rather than the authenticated user's profile.

**Requirements:**

* None.

**Effects:**

* Returns songs where every chord in the song is present in the `knownChords` list. Optionally filters by genre.

**Request Body:**

```json
{
  "knownChords": ["string"],
  "genres": ["string"] // optional
}
```

**Success Response Body (Query):**

```json
[
  {
    "song": {
      "_id": "string",
      "title": "string",
      "artist": "string",
      "chords": ["string"]
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Song/\_filterSongsByGenre

**Description:** Retrieves all songs matching a specific genre.

**Requirements:**

* None.

**Effects:**

* Returns songs where the `genre` field or `tags` array contains the specified string.

**Request Body:**

```json
{
  "genre": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "song": "Object"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Song/\_searchByTitleOrArtist

**Description:** Searches for songs by title or artist name (partial match).

**Requirements:**

* None.

**Effects:**

* Returns up to 20 songs matching the query string.

**Request Body:**

```json
{
  "query": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "song": "Object"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Song/\_getAllSongs

**Description:** Retrieves all songs in the catalog.

**Requirements:**

* None.

**Effects:**

* Returns all songs.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "song": "Object"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

# API Specification: RecommendationEngine Concept

**Purpose:** Calculate optimal learning paths and chord suggestions.

***

## API Endpoints

### POST /api/RecommendationEngine/calculateRecommendation

**Description:** Performs a heavy calculation to determine the best next chord to learn and saves the result as a `Recommendation` record.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

* User must exist. `knownChords` and `allSongs` are automatically retrieved by the synchronization from the respective libraries.

**Effects:**

* Analyzes the library songs against the user's known chords. Creates a persisted `Recommendation` containing the best chord and the list of songs it unlocks.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**

```json
{
  "recommendationId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/RecommendationEngine/requestChordRecommendation

**Description:** A stateless version of the recommendation logic. Suggests the next chord to learn based on raw inputs.

**Requirements:**

* `knownChords` is a proper subset of chords in `allSongs`.

**Effects:**

* Returns a single chord string that maximizes song unlock potential.

**Request Body:**

```json
{
  "knownChords": ["string"],
  "allSongs": [
    {
      "_id": "string",
      "chords": ["string"]
    }
  ]
}
```

**Success Response Body (Action):**

```json
{
  "recommendedChord": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/RecommendationEngine/requestPersonalizedSongRecommendation

**Description:** Gets personalized song recommendations based on the user's known chords and genre preferences.

**Authentication:** Requires a valid `sessionId`. The user's known chords and genre preferences are automatically retrieved from the session.

**Requirements:**

* The set of `knownChords` for the user associated with `sessionId` is not empty.

**Effects:**

* Filters the set of `allSongs` to find all songs that are playable with the user's current `knownChords`. Further filters and ranks this result based on the user's `genrePreferences`. Returns a ranked list of playable songs tailored to the user's tastes as `recommendedSongs`.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**

```json
{
  "recommendedSongs": "string[]"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/RecommendationEngine/recommendNextChordsForTargetSong

**Description:** Provides a learning path of chords to learn in order to play a target song.

**Authentication:** Requires a valid `sessionId`. The user's known chords are automatically retrieved from the session.

**Requirements:**

* The `targetSong` exists. The set of chords required by `targetSong` is not a subset of the user's `knownChords`.

**Effects:**

* Identifies the set of `missingChords` required to play the `targetSong` that are not present in the user's `knownChords` set. Returns an ordered learning path as `recommendedPath`.

**Request Body:**

```json
{
  "sessionId": "string",
  "targetSong": "string"
}
```

**Success Response Body (Action):**

```json
{
  "recommendedPath": "string[]"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/RecommendationEngine/requestSongUnlockRecommendation

**Description:** Identifies specifically which songs would become playable if a specific chord were learned. This is a stateless query.

**Requirements:**

* `potentialChord` is not in `knownChords`.

**Effects:**

* Returns a list of song IDs that require `potentialChord` (plus any subset of `knownChords`) but were not previously playable.

**Request Body:**

```json
{
  "knownChords": ["string"],
  "potentialChord": "string",
  "allSongs": [
    {
      "_id": "string",
      "chords": ["string"]
    }
  ]
}
```

**Success Response Body (Action):**

```json
{
  "unlockedSongs": ["string"] // List of Song IDs
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/RecommendationEngine/\_getRecommendation

**Description:** Retrieves a previously calculated recommendation by ID.

**Requirements:**

* The `recommendationId` exists.

**Effects:**

* Returns the full recommendation object including score, timestamp, and unlocked songs list.

**Request Body:**

```json
{
  "recommendationId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "user": "string",
    "recommendedChord": "string",
    "unlockedSongs": ["string"],
    "score": "number",
    "generatedAt": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```