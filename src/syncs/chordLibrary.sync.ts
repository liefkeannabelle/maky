import { actions, Frames, Sync } from "@engine";
import {
  ChordLibrary,
  RecommendationEngine,
  Requesting,
  Sessioning,
  Song,
  SongLibrary,
  Chord,
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
    [SongLibrary.startLearningSong, { user, song }, {}],
  ),
  where: async (frames) => {
    // 1. Get Song Details
    // We need to find the song object to get its chords
    const allSongsObjs = await Song._getAllSongs({});

    // 2. Get User's Known Chords
    // We need to filter out chords the user already knows

    const newFrames = [];
    for (const frame of frames) {
      const currentSongId = frame[song];
      const currentUser = frame[user] as ID;

      const songEntry = allSongsObjs.find((s) =>
        s.song._id === currentSongId
      );
      if (!songEntry) continue;

      const chordsInSong = songEntry.song.chords || [];
      if (chordsInSong.length === 0) continue;

      const knownChordsObjs = await ChordLibrary._getKnownChords({
        user: currentUser,
      });
      const knownChordSet = new Set(knownChordsObjs.map((c) => c.chord));

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
    [Requesting.request, { path: "/chords/add", sessionId, chord }, { request }]
  ),
  where: (frames) => {
    console.log("[Sync] HandleChordAdditionRequest: Checking session");
    return frames.query(Sessioning._getUser, { sessionId }, { user });
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
    [Requesting.request, { path: "/chords/add" }, { request }],
    [ChordLibrary.addChordToInventory, { user, chord }, {}]
  ),
  where: async (frames) => {
    console.log("[Sync] RespondToChordAddition: Success");
    const newFrames = [];
    for (const frame of frames) {
      const currentUser = frame[user] as ID;
      const addedChord = frame[chord] as string;

      // 1. Get Updated Inventory
      const knownChordsObjs = await ChordLibrary._getKnownChords({
        user: currentUser,
      });
      const knownChordsList = knownChordsObjs.map((c) => c.chord);

      // 2. Get Playable Songs
      const playableSongsObjs = await Song._getPlayableSongs({
        knownChords: knownChordsList,
      });
      const playableSongs = playableSongsObjs.map((s) => ({
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
      const allSongsObjs = await Song._getAllSongs({});
      const allSongsList = allSongsObjs.map((s) => ({
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
        recommendedChordDiagram: unknown;
        unlockedSongIds: ID[];
      } = { recommendedChord: null, recommendedChordDiagram: null, unlockedSongIds: [] };
      if (recs.length > 0) {
        const recChord = recs[0].recommendedChord;
        const unlocks = await RecommendationEngine
          .requestSongUnlockRecommendation({
            knownChords: knownChordsList,
            potentialChord: recChord,
            allSongs: allSongsList,
          });
        
        // Fetch diagram for recommended chord
        const diagramResult = await Chord._getChordDiagram({ name: recChord });
        
        recommendation = {
          recommendedChord: recChord,
          recommendedChordDiagram: diagramResult.diagrams,
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
 */
export const RespondToChordAdditionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/chords/add" }, { request }],
    [ChordLibrary.addChordToInventory, {}, { error }]
  ),
  then: actions(
    [Requesting.respond, { request, error }]
  )
});

export const HandleAddUser: Sync = ({ request, sessionId, user }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/addUser", sessionId }, { request }]
  ),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions(
    [ChordLibrary.addUser, { user }]
  )
});

export const RespondToAddUserSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/addUser" }, { request }],
    [ChordLibrary.addUser, {}, {}]
  ),
  then: actions(
    [Requesting.respond, { request, success: true }]
  )
});

export const RespondToAddUserError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/addUser" }, { request }],
    [ChordLibrary.addUser, {}, { error }]
  ),
  then: actions(
    [Requesting.respond, { request, error }]
  )
});

export const HandleRemoveUser: Sync = ({ request, sessionId, user }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/removeUser", sessionId }, { request }]
  ),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions(
    [ChordLibrary.removeUser, { user }]
  )
});

export const RespondToRemoveUserSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/removeUser" }, { request }],
    [ChordLibrary.removeUser, {}, {}]
  ),
  then: actions(
    [Requesting.respond, { request, success: true }]
  )
});

export const RespondToRemoveUserError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/removeUser" }, { request }],
    [ChordLibrary.removeUser, {}, { error }]
  ),
  then: actions(
    [Requesting.respond, { request, error }]
  )
});

/**
 * Sync: GetChordInventory
 * HTTP: GET /chords/inventory?sessionId=<id>
 */
export const GetChordInventory: Sync = (
  { request, sessionId, user, inventory },
) => ({
  when: actions(
    [Requesting.request, { path: "/chords/inventory", sessionId }, { request }]
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

/**
 * Sync: HandleAddChordToInventoryRequest
 *
 * Handles requests to add a chord to inventory via ChordLibrary path.
 * Resolves user from session and adds the chord with specified mastery.
 */
export const HandleAddChordToInventoryRequest: Sync = (
  { request, sessionId, chord, mastery, user },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/ChordLibrary/addChordToInventory",
        sessionId,
        chord,
        mastery,
      },
      { request },
    ],
  ),
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions(
    [ChordLibrary.addChordToInventory, { user, chord, mastery }],
  ),
});

/**
 * Sync: RespondToAddChordToInventory
 *
 * Responds to the add chord to inventory request.
 * Currently, it just responds with the original request data.
 */
export const RespondToAddChordToInventorySuccess: Sync = (
  { request },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ChordLibrary/addChordToInventory" },
      { request },
    ],
    [ChordLibrary.addChordToInventory, {}, {}],
  ),
  then: actions(
    [Requesting.respond, { request, success: true }],
  ),
});

export const RespondToAddChordToInventoryError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ChordLibrary/addChordToInventory" },
      { request },
    ],
    [ChordLibrary.addChordToInventory, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- ChordLibrary Actions ---

export const HandleUpdateChordMastery: Sync = ({ request, sessionId, chord, newMastery, user }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/updateChordMastery", sessionId, chord, newMastery }, { request }]
  ),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions(
    [ChordLibrary.updateChordMastery, { user, chord, newMastery }]
  )
});

export const RespondToUpdateChordMastery: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/updateChordMastery" }, { request }],
    [ChordLibrary.updateChordMastery, {}, { error }]
  ),
  then: actions(
    [Requesting.respond, { request, error }]
  )
});

export const RespondToUpdateChordMasterySuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/updateChordMastery" }, { request }],
    [ChordLibrary.updateChordMastery, {}, {}]
  ),
  then: actions(
    [Requesting.respond, { request, success: true }]
  )
});

export const HandleRemoveChordFromInventory: Sync = ({ request, sessionId, chord, user }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/removeChordFromInventory", sessionId, chord }, { request }]
  ),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions(
    [ChordLibrary.removeChordFromInventory, { user, chord }]
  )
});

export const RespondToRemoveChordFromInventory: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/removeChordFromInventory" }, { request }],
    [ChordLibrary.removeChordFromInventory, {}, { error }]
  ),
  then: actions(
    [Requesting.respond, { request, error }]
  )
});

export const RespondToRemoveChordFromInventorySuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/removeChordFromInventory" }, { request }],
    [ChordLibrary.removeChordFromInventory, {}, {}]
  ),
  then: actions(
    [Requesting.respond, { request, success: true }]
  )
});

export const HandleGetChordMastery: Sync = ({ request, sessionId, chord, user, mastery }) => ({
  when: actions(
    [Requesting.request, { path: "/ChordLibrary/_getChordMastery", sessionId, chord }, { request }]
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });
    const newFrames = [];
    for (const frame of frames) {
      const currentUser = frame[user] as ID;
      const result = await ChordLibrary._getChordMastery({ user: currentUser, chord: frame[chord] as string });
      newFrames.push({ ...frame, [mastery]: result });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, mastery }]
  )
});

// --- Chord Queries ---

export const HandleGetAllChords: Sync = ({ request, chords }) => ({
  when: actions(
    [Requesting.request, { path: "/Chord/_getAllChords" }, { request }]
  ),
  where: async (frames) => {
    const newFrames = [];
    for (const frame of frames) {
      const result = await Chord._getAllChords();
      newFrames.push({ ...frame, [chords]: result.chords });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, chords }]
  )
});

export const HandleGetChordByName: Sync = ({ request, name, chord }) => ({
  when: actions(
    [Requesting.request, { path: "/Chord/_getChordByName", name }, { request }]
  ),
  where: async (frames) => {
    const newFrames = [];
    for (const frame of frames) {
      const result = await Chord._getChordByName({ name: frame[name] as string });
      newFrames.push({ ...frame, [chord]: result.chord });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, chord }]
  )
});
