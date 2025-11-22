import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, ChordLibrary, SongLibrary, RecommendationEngine } from "@concepts";
import { ID } from "@utils/types.ts";

/**
 * Sync: TriggerChordRecommendation
 * 
 * When a request for "getChordRecommendation" comes in:
 * 1. Get the user from the session.
 * 2. Gather known chords and all songs.
 * 3. Trigger the recommendation calculation.
 */
export const TriggerChordRecommendation: Sync = ({ request, sessionId, user, knownChords, allSongs, recommendationId }) => ({
  when: actions(
    [Requesting.request, { path: "getChordRecommendation", sessionId }, { request }]
  ),
  where: async (frames) => {
    // 1. Resolve User from Session
    frames = await frames.query(Sessioning._getUser, { session: sessionId }, { user });
    
    // 2. Gather Data (Known Chords & All Songs)
    // We use a manual map over frames to call concept queries directly, 
    // ensuring we can handle data transformation and collection in one pass.
    const newFrames = [];
    for (const frame of frames) {
        const currentUser = frame[user] as ID;
        
        // Get Known Chords
        const knownChordsObjs = await ChordLibrary._getKnownChords({ user: currentUser });
        const knownChordsList = knownChordsObjs.map((c: any) => c.chord);

        // Get All Songs
        const allSongsObjs = await SongLibrary._getAllSongs({});
        const allSongsList = allSongsObjs.map((s: any) => ({
            _id: s.song._id,
            chords: s.song.chords,
            difficulty: s.song.difficulty
        }));

        newFrames.push({ 
            ...frame, 
            [knownChords]: knownChordsList, 
            [allSongs]: allSongsList 
        });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [RecommendationEngine.calculateRecommendation, { user, knownChords, allSongs }, { recommendationId }]
  )
});

/**
 * Sync: SendChordRecommendationResponse
 * 
 * When the recommendation calculation is complete:
 * 1. Retrieve the recommendation result.
 * 2. Format the response payload.
 * 3. Respond to the original request.
 */
export const SendChordRecommendationResponse: Sync = ({ request, recommendationId, recommendation, payload }) => ({
  when: actions(
    [Requesting.request, { path: "getChordRecommendation" }, { request }],
    [RecommendationEngine.calculateRecommendation, {}, { recommendationId }]
  ),
  where: async (frames) => {
    // Get recommendation details
    frames = await frames.query(RecommendationEngine._getRecommendation, { recommendationId }, { recommendation });
    
    const newFrames = frames.map(frame => {
        const rec = frame[recommendation] as any;
        let payloadVal;
        if (!rec || !rec.recommendedChord) {
            payloadVal = {
                recommendedChord: null,
                unlockedSongIds: []
            };
        } else {
            payloadVal = {
                userId: rec.user,
                recommendedChord: rec.recommendedChord,
                unlockedSongIds: rec.unlockedSongs
            };
        }
        return { ...frame, [payload]: payloadVal };
    });
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, payload }]
  )
});
