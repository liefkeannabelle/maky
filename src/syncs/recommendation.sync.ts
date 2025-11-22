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