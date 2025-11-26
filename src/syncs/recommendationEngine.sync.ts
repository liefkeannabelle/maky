import { actions, Frames, Sync } from "@engine";
import {
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
      const knownChordsList = knownChordsObjs.map((c: any) => c.chord);

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
      const rec = frame[recommendation] as any;
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

export const HandleRequestChordRecommendation: Sync = ({ request, knownChords, recommendedChord }) => ({
  when: actions(
    [Requesting.request, { path: "/RecommendationEngine/requestChordRecommendation", knownChords }, { request }]
  ),
  where: async (frames) => {
    // Fetch all songs once (optimized projection)
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
      newFrames.push({ ...frame, [recommendedChord]: rec });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, recommendedChord }]
  )
});

export const HandleRequestSongUnlockRecommendation: Sync = ({ request, knownChords, potentialChord, unlockedSongs }) => ({
  when: actions(
    [Requesting.request, { path: "/RecommendationEngine/requestSongUnlockRecommendation", knownChords, potentialChord }, { request }]
  ),
  where: async (frames) => {
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
    console.log("DEBUG: HandleRequestPersonalizedSongRecommendation started");
    try {
      frames = await frames.query(Sessioning._getUser, { sessionId }, { user });
      console.log("DEBUG: User resolved");

      const allSongsList = await Song._getAllSongsForRecommendation({});
      console.log(`DEBUG: Fetched ${allSongsList.length} songs`);

      const newFrames = [];
      for (const frame of frames) {
        const currentUser = frame[user] as ID;
        console.log(`DEBUG: Processing for user ${currentUser}`);
        
        // Get Known Chords
        const knownChordsObjs = await ChordLibrary._getKnownChords({ user: currentUser });
        const knownChordsList = knownChordsObjs.map((c) => c.chord);
        console.log(`DEBUG: Known chords: ${knownChordsList.length}`);

        // Get User Profile for Genre Preferences
        const profileObjs = await UserProfile._getProfile({ user: currentUser });
        const genrePreferences = profileObjs.length > 0 ? profileObjs[0].profile.genrePreferences : [];
        console.log(`DEBUG: Genre prefs: ${genrePreferences}`);

        const result = await RecommendationEngine.requestPersonalizedSongRecommendation({
          knownChords: knownChordsList,
          allSongs: allSongsList,
          genrePreferences
        });
        console.log("DEBUG: Recommendation calculated");
        
        const recs = result.length > 0 ? result[0].recommendedSongs : [];
        newFrames.push({ ...frame, [recommendedSongs]: recs });
      }
      return new Frames(...newFrames);
    } catch (e) {
      console.error("DEBUG: Error in HandleRequestPersonalizedSongRecommendation", e);
      throw e;
    }
  },
  then: actions(
    [Requesting.respond, { request, recommendedSongs }]
  )
});

export const HandleRecommendNextChordsForTargetSong: Sync = ({ request, sessionId, targetSong, user, recommendedPath }) => ({
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
          newFrames.push({ ...frame, [recommendedPath]: [] }); // Or error
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
      newFrames.push({ ...frame, [recommendedPath]: path });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, recommendedPath }]
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
