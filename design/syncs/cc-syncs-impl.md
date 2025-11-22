[@syncs](../syncs.md)
[@sync-background](../tools/sync-background.md)
[@implementing-synchronizations](../background/implementing-synchronizations.md)
[@concepts](../concepts.md)

# implement prompt

Implement the ChordConnect synchronizations described in `syncs.md`, focusing on:

- InitializeNewUser
- AutoAddChordsForNewSong
- TriggerChordRecommendation
- SendChordRecommendationResponse

Use the existing concept implementations:

- UserAccountConcept
- UserProfileConcept
- ChordLibraryConcept
- SongLibraryConcept
- RecommendationEngineConcept
- RequestingConcept
- SessioningConcept
- (ChordConcept exists for global chord definitions, but the recommendation syncs do not need to call it directly.)

Generate TypeScript sync implementations under `src/syncs/`, following the patterns in:

- `src/syncs/sample.sync.ts`
- `src/syncs/useracc.sync.ts`

# requirements

## Registration

- Create or update a central `registerSyncs` function (likely in `src/syncs.ts`) that takes the sync manager / concept server and registers:

  - InitializeNewUser
  - AutoAddChordsForNewSong
  - TriggerChordRecommendation
  - SendChordRecommendationResponse

- Ensure these syncs are actually wired into the running backend (same pattern as the existing user/account syncs).

## InitializeNewUser

- Behavior:

  - When `UserAccount.register(username, email, password, isKidAccount)` succeeds and returns a `user`:
    - Call `UserProfile.createProfile({ user, displayName: username, isKidAccount })`.
    - Call `ChordLibrary.addUser({ user })`.
    - Call `SongLibrary.addUser({ user })`.

- Implementation details:

  - Implement this as a sync that listens for successful `UserAccount.register` actions.
  - Use the concept methods (don’t re-touch Mongo directly).
  - Log useful traces (like in `useracc.sync.ts`) but keep business logic in the concepts.

## AutoAddChordsForNewSong

- Behavior:

  - When `SongLibrary.startLearningSong({ user, song, mastery })` is called:
    - Fetch the song’s chord list from `SongLibrary` if not already present in the params.
    - For each chord `c` in that song:
      - If `ChordLibrary` does *not* already have `c` for that user:
        - Call `ChordLibrary.addChordToInventory({ user, chord: c, mastery: "in-progress" })`.

- Implementation details:

  - Implement as a sync that reacts to `SongLibrary.startLearningSong`.
  - Use `ChordLibrary._getKnownChords({ user })` (or similar) to check for duplicates.
  - This sync updates the user’s chord inventory as they start learning songs.

## TriggerChordRecommendation

- Spec (updated):

  ```text
  sync TriggerChordRecommendation
  when
      Requesting.getChordRecommendation(sessionId)
  where
      in Sessioning: user of session sessionId is u
      in ChordLibrary: _getKnownChords(u) returns knownChords
      in SongLibrary: _getAllSongs() returns songs
  then
      RecommendationEngine.calculateRecommendation(u, knownChords, songs)
    ```

* Concrete behavior:

  * When `Requesting.getChordRecommendation(sessionId)` is received:

    1. Use `SessioningConcept` to resolve the `user` for this `sessionId`.
    2. Use `ChordLibraryConcept._getKnownChords({ user })` to get the user’s known chords.

       * Map this to a `string[]` of chord symbols.
    3. Use `SongLibraryConcept._getAllSongs({})` to fetch all songs.

       * Map each `Song` to a `SongInput` for the `RecommendationEngineConcept`:

         * `_id: song._id`
         * `chords: song.chords`
         * `difficulty: song.difficulty`
    4. Call `RecommendationEngineConcept.calculateRecommendation({ user, knownChords, allSongs })`.

       * This should return a `recommendationId` (or a sentinel like `"none"` when no rec is available).
    5. Store any association necessary (e.g., between the original request and `recommendationId`) following the patterns used by existing syncs that connect Requesting → concepts.

  * This sync **does not** send the response to the client; it only triggers the calculation and persistence.

## SendChordRecommendationResponse

* Spec:

  ```text
  sync SendChordRecommendationResponse
  when
      RecommendationEngine.calculateRecommendation(u, knownChords, songs): (recommendationId)
  where
      in RecommendationEngine: _getRecommendation(recommendationId) returns rec
      rec has fields (user, recommendedChord, unlockedSongs)
  then
      Requesting.sendResponse(..., {
          user: rec.user,
          recommendedChord: rec.recommendedChord,
          unlockedSongIds: rec.unlockedSongs
      })
  ```

* Concrete behavior:

  * When `calculateRecommendation` finishes and yields `recommendationId`:

    1. Call `RecommendationEngineConcept._getRecommendation({ recommendationId })` to fetch `rec`.

       * `rec` includes at least: `user`, `recommendedChord`, `unlockedSongs` (array of song IDs).
    2. If there is no `rec` or `recommendedChord` is `null` (or `recommendationId` was `"none"`):

       * Send a response via `Requesting.sendResponse` with:

         ```ts
         {
           recommendedChord: null,
           unlockedSongIds: [],
         }
         ```
    3. Otherwise, construct a JSON-friendly payload:

       ```ts
       {
         userId: rec.user,
         recommendedChord: rec.recommendedChord,
         unlockedSongIds: rec.unlockedSongs,
       }
       ```
    4. Use `RequestingConcept.sendResponse` (or the appropriate helper) to send this payload back to the original `getChordRecommendation` request’s session.

  * For this first version, it is OK that we only send song IDs.

    * Later we can extend this sync (or add a second one) to use `SongLibrary._getSongsByIds` to enrich with titles/artists/difficulty.

## Style & testing
    * Follow the coding style and logging of `sample.sync.ts` and `useracc.sync.ts`:

  * Keep sync functions small and focused.
  * Surface errors through logs or simple error payloads, not thrown exceptions, where appropriate.

* Add minimal tests (in the same style as other sync tests) to cover:

  * `InitializeNewUser`:

    * After `UserAccount.register`, the user exists in `ChordLibrary` and `SongLibrary`.
  * `TriggerChordRecommendation` + `SendChordRecommendationResponse`:

    * For a user with a small chord inventory and seeded songs, a chord recommendation is calculated and a response is sent with a non-null `recommendedChord` and at least one `unlockedSongId`.

# response:

Here are the implementations for the requested syncs.

### `src/syncs/initializeNewUser.sync.ts`

```typescript
import { Concept } from "../concepts";

/**
 * Sync: InitializeNewUser
 * 
 * When a new user registers via UserAccount, this sync initializes their
 * presence in the UserProfile, ChordLibrary, and SongLibrary concepts.
 */
export function initializeNewUserSync(concepts: any) {
  // Listen for successful registration
  concepts.userAccount.on("register", async (result: any) => {
    const { user, username, isKidAccount } = result;
    
    console.log(`[Sync] InitializeNewUser: specific setup for user ${user}`);

    try {
      // 1. Create Profile
      await concepts.userProfile.createProfile({
        user,
        displayName: username,
        isKidAccount: !!isKidAccount
      });

      // 2. Add to Chord Library
      await concepts.chordLibrary.addUser({ user });

      // 3. Add to Song Library
      await concepts.songLibrary.addUser({ user });

      console.log(`[Sync] InitializeNewUser: Completed setup for ${username}`);
    } catch (err) {
      console.error(`[Sync] InitializeNewUser: Failed to initialize user ${user}`, err);
    }
  });
}
```

### `src/syncs/autoAddChords.sync.ts`

```typescript
/**
 * Sync: AutoAddChordsForNewSong
 * 
 * When a user starts learning a song, this sync checks if the song contains
 * chords the user does not yet know. If so, it adds them to the user's 
 * ChordLibrary with 'in-progress' mastery.
 */
export function autoAddChordsSync(concepts: any) {
  concepts.songLibrary.on("startLearningSong", async (payload: any) => {
    const { user, song } = payload;

    console.log(`[Sync] AutoAddChords: Checking chords for user ${user} learning song ${song._id}`);

    try {
      // 1. Get the list of chords required for the song
      // Assuming 'song' object in payload is complete, otherwise we might need to fetch it
      const songChords: string[] = song.chords || [];

      if (songChords.length === 0) {
        return;
      }

      // 2. Get user's currently known chords to check for duplicates
      const knownChordsObjs = await concepts.chordLibrary.getKnownChords({ user });
      // Map to a Set of chord symbols (e.g., "Am", "G") for O(1) lookup
      const knownChordSet = new Set(knownChordsObjs.map((c: any) => c.chord || c.symbol));

      // 3. Iterate and add missing chords
      for (const chordSymbol of songChords) {
        if (!knownChordSet.has(chordSymbol)) {
          console.log(`[Sync] AutoAddChords: Adding new chord ${chordSymbol} to inventory`);
          
          await concepts.chordLibrary.addChordToInventory({
            user,
            chord: chordSymbol,
            mastery: "in-progress"
          });
        }
      }
    } catch (err) {
      console.error(`[Sync] AutoAddChords: Error processing song ${song?._id}`, err);
    }
  });
}
```

### `src/syncs/recommendation.sync.ts`

```typescript
/**
 * Syncs: TriggerChordRecommendation & SendChordRecommendationResponse
 * 
 * These two syncs handle the decoupled process of:
 * 1. Receiving a request -> Triggering calculation
 * 2. Calculation finishing -> Sending response back to client
 */

// In-memory map to link the asynchronous Recommendation Job ID to the original Request ID
const recommendationRequestMap = new Map<string, string>();

export function recommendationSyncs(concepts: any) {
  
  // --- Sync: TriggerChordRecommendation ---
  concepts.requesting.on("getChordRecommendation", async (req: any) => {
    const { id: requestId, sessionId } = req;
    
    console.log(`[Sync] TriggerChordRecommendation: Processing request ${requestId}`);

    try {
      // 1. Resolve User from Session
      const user = await concepts.sessioning.getUser({ sessionId });
      if (!user) {
        throw new Error("User not found for session");
      }

      // 2. Get Known Chords (mapped to string array)
      const knownChordsObjs = await concepts.chordLibrary.getKnownChords({ user });
      const knownChords = knownChordsObjs.map((c: any) => c.chord || c.symbol);

      // 3. Get All Songs (mapped to SongInput format for engine)
      const allSongsObjs = await concepts.songLibrary.getAllSongs({});
      const songs = allSongsObjs.map((s: any) => ({
        _id: s._id,
        chords: s.chords,
        difficulty: s.difficulty
      }));

      // 4. Trigger Calculation
      // This returns an ID immediately (or via promise) representing the calculation job
      const recommendationId = await concepts.recommendationEngine.calculateRecommendation({
        user,
        knownChords,
        songs
      });

      // 5. Store association for the response step
      if (recommendationId && recommendationId !== "none") {
        recommendationRequestMap.set(recommendationId, requestId);
      } else {
        // If no recommendation possible immediately, send empty response now
        await concepts.requesting.sendResponse(requestId, {
            recommendedChord: null,
            unlockedSongIds: []
        });
      }

    } catch (err) {
      console.error(`[Sync] TriggerChordRecommendation: Failed for req ${requestId}`, err);
      // Send error response
      await concepts.requesting.sendResponse(requestId, { error: "Failed to generate recommendation" });
    }
  });


  // --- Sync: SendChordRecommendationResponse ---
  concepts.recommendationEngine.on("calculateRecommendation", async (result: any) => {
    // The result from the event might be the ID or the object depending on implementation.
    // Assuming the event passes the recommendationId produced by the action.
    const recommendationId = typeof result === 'string' ? result : result.recommendationId;

    console.log(`[Sync] SendChordRecommendationResponse: Result ready for job ${recommendationId}`);

    // 1. Find original request
    const requestId = recommendationRequestMap.get(recommendationId);
    if (!requestId) {
        // This calculation wasn't triggered by a live request (or server restarted)
        return;
    }

    try {
        // 2. Fetch the full recommendation details
        const rec = await concepts.recommendationEngine.getRecommendation({ recommendationId });
        
        let payload;
        
        // 3. Construct Payload
        if (!rec || !rec.recommendedChord) {
            payload = {
                recommendedChord: null,
                unlockedSongIds: []
            };
        } else {
            payload = {
                userId: rec.user,
                recommendedChord: rec.recommendedChord,
                unlockedSongIds: rec.unlockedSongs
            };
        }

        // 4. Send Response
        await concepts.requesting.sendResponse(requestId, payload);
        
        // Cleanup
        recommendationRequestMap.delete(recommendationId);

    } catch (err) {
        console.error(`[Sync] SendChordRecommendationResponse: Error sending response for ${requestId}`, err);
        recommendationRequestMap.delete(recommendationId);
    }
  });
}
```

### `src/syncs.ts`

```typescript
import { initializeNewUserSync } from "./syncs/initializeNewUser.sync";
import { autoAddChordsSync } from "./syncs/autoAddChords.sync";
import { recommendationSyncs } from "./syncs/recommendation.sync";

/**
 * Registers all synchronization logic (listeners) with the concept backend.
 * @param concepts The collection of instantiated concepts (UserAccount, ChordLibrary, etc.)
 */
export function registerSyncs(concepts: any) {
  console.log("Registering ChordConnect Syncs...");

  // User Lifecycle
  initializeNewUserSync(concepts);

  // Library Management
  autoAddChordsSync(concepts);

  // Recommendation Flow
  recommendationSyncs(concepts);

  console.log("ChordConnect Syncs Registered.");
}
```