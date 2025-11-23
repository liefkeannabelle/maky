import { actions, Frames, Sync } from "@engine";
import {
  ChordLibrary,
  RecommendationEngine,
  Requesting,
  Sessioning,
  SongLibrary,
} from "@concepts";
import { ID } from "@utils/types.ts";

/**
 * Sync: AutoAddChordsForNewSong
 *
 * When a user starts learning a song, this sync checks if the song contains
 * chords the user does not yet know. If so, it adds them to the user's
 * ChordLibrary with 'in-progress' mastery.
 */
export const AutoAddChordsForNewSong: Sync = ({ user, song, chord }) => ({
  when: actions(
    [SongLibrary.startLearningSong, { user, song }],
  ),
  where: async (frames) => {
    // 1. Get Song Details
    // We need to find the song object to get its chords
    const allSongsObjs = await SongLibrary._getAllSongs({});

    // 2. Get User's Known Chords
    // We need to filter out chords the user already knows

    const newFrames = [];
    for (const frame of frames) {
      const currentSongId = frame[song];
      const currentUser = frame[user] as ID;

      const songEntry = allSongsObjs.find((s: any) =>
        s.song._id === currentSongId
      );
      if (!songEntry) continue;

      const chordsInSong = songEntry.song.chords || [];
      if (chordsInSong.length === 0) continue;

      const knownChordsObjs = await ChordLibrary._getKnownChords({
        user: currentUser,
      });
      const knownChordSet = new Set(knownChordsObjs.map((c: any) => c.chord));

      for (const chordSymbol of chordsInSong) {
        if (!knownChordSet.has(chordSymbol)) {
          // Create a new frame for each new chord to add
          newFrames.push({
            ...frame,
            [chord]: chordSymbol,
          });
        }
      }
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [ChordLibrary.addChordToInventory, { user, chord, mastery: "in-progress" }],
  ),
});

/**
 * Sync: HandleChordAdditionRequest
 *
 * Handles POST /chords/add
 * 1. Resolves user from session
 * 2. Adds chord to inventory
 * 3. Triggers response sync
 */
export const HandleChordAdditionRequest: Sync = (
  { request, sessionId, chord, user },
) => ({
  when: actions(
    [Requesting.request, { path: "chords/add", sessionId, chord }, { request }],
  ),
  where: async (frames) => {
    return await frames.query(Sessioning._getUser, { sessionId }, { user });
  },
  then: actions(
    [ChordLibrary.addChordToInventory, { user, chord, mastery: "in-progress" }],
  ),
});

/**
 * Sync: RespondToChordAddition
 *
 * Responds to the chord addition request with updated inventory, playable songs, and recommendation.
 */
export const RespondToChordAddition: Sync = (
  { request, user, chord, response },
) => ({
  when: actions(
    [Requesting.request, { path: "chords/add" }, { request }],
    [ChordLibrary.addChordToInventory, { user, chord }, {}],
  ),
  where: async (frames) => {
    const newFrames = [];
    for (const frame of frames) {
      const currentUser = frame[user] as ID;
      const addedChord = frame[chord] as string;

      // 1. Get Updated Inventory
      const knownChordsObjs = await ChordLibrary._getKnownChords({
        user: currentUser,
      });
      const knownChordsList = knownChordsObjs.map((c: any) => c.chord);

      // 2. Get Playable Songs
      const playableSongsObjs = await SongLibrary._getPlayableSongs({
        knownChords: knownChordsList,
      });
      const playableSongs = playableSongsObjs.map((s: any) => ({
        id: s.song._id,
        title: s.song.title,
        artist: s.song.artist,
        source: s.song.source,
        difficulty: s.song.difficulty,
      }));

      // 3. Get Recommendation (Optional - reusing logic or calling concept)
      // For simplicity, we'll call the stateless query if available or just skip for now to keep it fast
      // Or we can trigger the recommendation engine calculation here.
      // Let's do a quick stateless recommendation query if possible, or just return null.
      // To do it properly, we need all songs.
      const allSongsObjs = await SongLibrary._getAllSongs({});
      const allSongsList = allSongsObjs.map((s: any) => ({
        _id: s.song._id,
        chords: s.song.chords,
        difficulty: s.song.difficulty,
      }));

      const recs = await RecommendationEngine.requestChordRecommendation({
        knownChords: knownChordsList,
        allSongs: allSongsList,
      });

      let recommendation: {
        recommendedChord: string | null;
        unlockedSongIds: ID[];
      } = { recommendedChord: null, unlockedSongIds: [] };
      if (recs.length > 0) {
        const recChord = recs[0].recommendedChord;
        const unlocks = await RecommendationEngine
          .requestSongUnlockRecommendation({
            knownChords: knownChordsList,
            potentialChord: recChord,
            allSongs: allSongsList,
          });
        recommendation = {
          recommendedChord: recChord,
          unlockedSongIds: unlocks.length > 0 ? unlocks[0].unlockedSongs : [],
        };
      }

      const responsePayload = {
        success: true,
        normalizedChord: addedChord, // Assuming input was normalized by concept if successful
        inventory: knownChordsList,
        playableSongs: playableSongs,
        recommendation: recommendation,
      };

      newFrames.push({
        ...frame,
        [response]: responsePayload,
      });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, response }],
  ),
});

/**
 * Sync: RespondToChordAdditionError
 *
 * Handles errors when adding a chord (e.g. invalid symbol, duplicate).
 * Note: The engine doesn't natively catch errors from actions in 'then' clauses of other syncs easily
 * to trigger another sync.
 * However, if ChordLibrary.addChordToInventory returns an error object, we can't easily match it
 * unless we have a separate sync that matches on the error return if we changed the action signature.
 *
 * Given the current architecture, if `addChordToInventory` fails (throws or returns error),
 * the `RespondToChordAddition` sync won't fire because the action didn't complete successfully
 * (or the event wasn't emitted).
 *
 * For this implementation, we'll assume success for the happy path.
 * Handling specific logic errors (like duplicates) might require the concept to emit an event even on failure
 * or a different flow.
 *
 * If `addChordToInventory` returns `{ error: ... }`, it is technically a successful execution of the function
 * returning a value. If the concept emits an event only on success, we miss it.
 *
 * Let's assume for now we only handle the success case as requested for the main flow.
 * If the user adds a duplicate, `addChordToInventory` in the concept returns `{ error: ... }`.
 * If the concept does NOT emit an event on error, we need a way to respond.
 *
 * WORKAROUND: We can have a sync that matches on the REQUEST only, and checks if the chord exists.
 * But that duplicates logic.
 *
 * Ideally, we'd have `ChordLibrary.addChordToInventory` emit an event even on failure, or we check beforehand.
 *
 * Let's add a check in `HandleChordAdditionRequest`'s `where` clause?
 * No, `where` is for filtering.
 *
 * We will stick to the happy path for now.
 */

/**
 * Sync: GetChordInventory
 * HTTP: GET /chords/inventory?sessionId=<id>
 */
export const GetChordInventory: Sync = (
  { request, sessionId, user, inventory },
) => ({
  when: actions(
    [Requesting.request, { path: "chords/inventory", sessionId }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });

    const newFrames = [];
    for (const frame of frames) {
      const currentUser = frame[user] as ID;
      const knownChordsObjs = await ChordLibrary._getKnownChords({
        user: currentUser,
      });
      // Return full objects including mastery
      newFrames.push({
        ...frame,
        [inventory]: knownChordsObjs,
      });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, inventory }],
  ),
});

/**
 * Sync: HandleKnownChordsQuery
 * Handles POST /ChordLibrary/_getKnownChords requests (non-passthrough).
 * Resolves the user from the provided sessionId and responds with their known chords.
 */
export const HandleKnownChordsQuery: Sync = (
  { request, sessionId, user, knownChords },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ChordLibrary/_getKnownChords", sessionId },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });

    const newFrames = [];
    for (const frame of frames) {
      const currentUser = frame[user] as ID;
      const chords = await ChordLibrary._getKnownChords({ user: currentUser });
      newFrames.push({
        ...frame,
        [knownChords]: chords,
      });
    }

    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, knownChords }],
  ),
});
