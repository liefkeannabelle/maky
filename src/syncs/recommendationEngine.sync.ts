import { actions, Frames, Sync } from "@engine";
import {
  Chord,
  ChordLibrary,
  RecommendationEngine,
  Requesting,
  Sessioning,
  Song,
  UserProfile,
} from "@concepts";
import { ID } from "@utils/types.ts";

/**
 * Sync: TriggerChordRecommendation
 *
 * When a request for "getChordRecommendation" comes in:
 * 1. Get the user from the session.
 * 2. Gather known chords and all songs.
 * 3. Trigger the recommendation calculation.
 */
export const TriggerChordRecommendation: Sync = (
  { request, sessionId, user, knownChords, allSongs, recommendationId },
) => ({
  when: actions(
    [Requesting.request, { path: "getChordRecommendation", sessionId }, {
      request,
    }],
  ),
  where: async (frames) => {
    // 1. Resolve User from Session
    frames = await frames.query(Sessioning._getUser, { sessionId: sessionId }, {
      user,
    });

    // 2. Gather Data (Known Chords & All Songs)
    // We use a manual map over frames to call concept queries directly,
    // ensuring we can handle data transformation and collection in one pass.
    const newFrames = [];
    for (const frame of frames) {
      const currentUser = frame[user] as ID;

      // Get Known Chords
      const knownChordsObjs = await ChordLibrary._getKnownChords({
        user: currentUser,
      });
      const knownChordsList = knownChordsObjs.map((c) => c.chord);

      // Get All Songs (optimized projection)
      const allSongsList = await Song._getAllSongsForRecommendation({});

      newFrames.push({
        ...frame,
        [knownChords]: knownChordsList,
        [allSongs]: allSongsList,
      });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [RecommendationEngine.calculateRecommendation, {
      user,
      knownChords,
      allSongs,
    }, { recommendationId }],
  ),
});

/**
 * Sync: SendChordRecommendationResponse
 *
 * When the recommendation calculation is complete:
 * 1. Retrieve the recommendation result.
 * 2. Format the response payload.
 * 3. Respond to the original request.
 */
export const SendChordRecommendationResponse: Sync = (
  { request, recommendationId, recommendation, payload },
) => ({
  when: actions(
    [Requesting.request, { path: "getChordRecommendation" }, { request }],
    [RecommendationEngine.calculateRecommendation, {}, { recommendationId }],
  ),
  where: async (frames) => {
    // Get recommendation details
    frames = await frames.query(RecommendationEngine._getRecommendation, {
      recommendationId,
    }, { recommendation });

    const newFrames = frames.map((frame) => {
      const rec = frame[recommendation] as unknown as { user: ID; recommendedChord: string; unlockedSongs: ID[] } | null;
      let payloadVal;
      if (!rec || !rec.recommendedChord) {
        payloadVal = {
          recommendedChord: null,
          unlockedSongIds: [],
        };
      } else {
        payloadVal = {
          userId: rec.user,
          recommendedChord: rec.recommendedChord,
          unlockedSongIds: rec.unlockedSongs,
        };
      }
      return { ...frame, [payload]: payloadVal };
    });
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, payload }],
  ),
});

/**
 * Sync: HandleRequestChordRecommendation
 *
 * When a request for chord recommendation comes in:
 * 1. Get all songs for recommendation
 * 2. Calculate the recommended chord
 * 3. Fetch the chord diagram for the recommendation
 * 4. Respond with both the chord and its diagram
 */
export const HandleRequestChordRecommendation: Sync = ({ request, knownChords, allSongs, recommendedChord, diagram }) => ({
  when: actions(
    [Requesting.request, { path: "/RecommendationEngine/requestChordRecommendation", knownChords, allSongs }, { request }]
  ),
  where: async (frames) => {
    // allSongs is now passed from the frontend request
    const allSongsList = await Song._getAllSongsForRecommendation({});

    const newFrames = [];
    for (const frame of frames) {
      const kChords = frame[knownChords] as string[];
      const result = await RecommendationEngine.requestChordRecommendation({
        knownChords: kChords,
        allSongs: allSongsList
      });
      // result is Array<{ recommendedChord: string }>
      const rec = result.length > 0 ? result[0].recommendedChord : null;
      
      // Fetch diagram for the recommended chord
      let diagramResult = null;
      if (rec) {
        const diagrams = await Chord._getChordDiagram({ name: rec });
        diagramResult = diagrams.diagrams;
      }
      
      newFrames.push({ 
        ...frame, 
        [recommendedChord]: rec,
        [diagram]: diagramResult
      });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, recommendedChord, diagram }]
  )
});

export const HandleRequestSongUnlockRecommendation: Sync = ({ request, knownChords, allSongs, potentialChord, unlockedSongs }) => ({
  when: actions(
    [Requesting.request, { path: "/RecommendationEngine/requestSongUnlockRecommendation", knownChords, allSongs, potentialChord }, { request }]
  ),
  where: async (frames) => {
    // allSongs is now passed from the frontend request  
    const allSongsObjs = await Song._getAllSongsForRecommendation({});
    const allSongsList = allSongsObjs;

    const newFrames = [];
    for (const frame of frames) {
      const kChords = frame[knownChords] as string[];
      const pChord = frame[potentialChord] as string;
      const result = await RecommendationEngine.requestSongUnlockRecommendation({
        knownChords: kChords,
        potentialChord: pChord,
        allSongs: allSongsList
      });
      // result is Array<{ unlockedSongs: ID[] }>
      const unlocked = result.length > 0 ? result[0].unlockedSongs : [];
      newFrames.push({ ...frame, [unlockedSongs]: unlocked });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, unlockedSongs }]
  )
});

export const HandleRequestPersonalizedSongRecommendation: Sync = ({ request, sessionId, user, recommendedSongs }) => ({
  when: actions(
    [Requesting.request, { path: "/RecommendationEngine/requestPersonalizedSongRecommendation", sessionId }, { request }]
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });

    const allSongsList = await Song._getAllSongsForRecommendation({});

    const newFrames = [];
    for (const frame of frames) {
      const currentUser = frame[user] as ID;
      
      // Get Known Chords
      const knownChordsObjs = await ChordLibrary._getKnownChords({ user: currentUser });
      const knownChordsList = knownChordsObjs.map((c) => c.chord);

      // Get User Profile for Genre Preferences
      const profileObjs = await UserProfile._getProfile({ user: currentUser });
      const genrePreferences = profileObjs.length > 0 ? profileObjs[0].profile.genrePreferences : [];

      const result = await RecommendationEngine.requestPersonalizedSongRecommendation({
        knownChords: knownChordsList,
        allSongs: allSongsList,
        genrePreferences
      });
      
      const recs = result.length > 0 ? result[0].recommendedSongs : [];
      newFrames.push({ ...frame, [recommendedSongs]: recs });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, recommendedSongs }]
  )
});

/**
 * Sync: HandleRecommendNextChordsForTargetSong
 *
 * When a request for learning path comes in:
 * 1. Resolve user from session
 * 2. Get user's known chords
 * 3. Calculate learning path to target song
 * 4. Fetch diagrams for all chords in the path
 * 5. Respond with path and diagrams
 */
export const HandleRecommendNextChordsForTargetSong: Sync = ({ request, sessionId, targetSong, user, recommendedPath, pathDiagrams }) => ({
  when: actions(
    [Requesting.request, { path: "/RecommendationEngine/recommendNextChordsForTargetSong", sessionId, targetSong }, { request }]
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });

    const allSongsObjs = await Song._getAllSongsForRecommendation({});
    
    const newFrames = [];
    for (const frame of frames) {
      const currentUser = frame[user] as ID;
      const targetSongId = frame[targetSong] as ID;

      // Get Known Chords
      const knownChordsObjs = await ChordLibrary._getKnownChords({ user: currentUser });
      const knownChordsList = knownChordsObjs.map((c) => c.chord);

      // Find Target Song
      const targetSongObj = allSongsObjs.find(s => s._id === targetSongId);
      
      if (!targetSongObj) {
          newFrames.push({ ...frame, [recommendedPath]: [], [pathDiagrams]: {} });
          continue;
      }

      const targetSongInput = {
          _id: targetSongObj._id,
          chords: targetSongObj.chords,
          difficulty: targetSongObj.difficulty
      };

      const result = await RecommendationEngine.recommendNextChordsForTargetSong({
        knownChords: knownChordsList,
        targetSong: targetSongInput
      });
      
      const path = result.length > 0 ? result[0].recommendedPath : [];
      
      // Fetch diagrams for all chords in the path
      let diagrams: Record<string, unknown> = {};
      if (path.length > 0) {
        const diagramsResult = await Chord._getChordDiagrams({ names: path });
        diagrams = diagramsResult.diagrams;
      }
      
      newFrames.push({ 
        ...frame, 
        [recommendedPath]: path,
        [pathDiagrams]: diagrams
      });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, recommendedPath, pathDiagrams }]
  )
});

export const HandleCalculateRecommendation: Sync = ({ request, sessionId, user, knownChords, allSongs, recommendationId }) => ({
  when: actions(
    [Requesting.request, { path: "/RecommendationEngine/calculateRecommendation", sessionId }, { request }]
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });

    const newFrames = [];
    for (const frame of frames) {
      const currentUser = frame[user] as ID;

      const knownChordsObjs = await ChordLibrary._getKnownChords({ user: currentUser });
      const knownChordsList = knownChordsObjs.map((c) => c.chord);

      const allSongsList = await Song._getAllSongsForRecommendation({});

      newFrames.push({
        ...frame,
        [knownChords]: knownChordsList,
        [allSongs]: allSongsList,
      });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [RecommendationEngine.calculateRecommendation, { user, knownChords, allSongs }, { recommendationId }]
  )
});

export const RespondToCalculateRecommendation: Sync = ({ request, recommendationId }) => ({
  when: actions(
    [Requesting.request, { path: "/RecommendationEngine/calculateRecommendation" }, { request }],
    [RecommendationEngine.calculateRecommendation, {}, { recommendationId }]
  ),
  then: actions(
    [Requesting.respond, { request, recommendationId }]
  )
});
