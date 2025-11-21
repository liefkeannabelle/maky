import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import RecommendationEngineConcept, { SongInput } from "./RecommendationEngineConcept.ts";

Deno.test("RecommendationEngineConcept", async (t) => {
  const [db, client] = await testDb();
  const engine = new RecommendationEngineConcept(db);

  // --- Test Data Setup ---
  const user = "user:Alice" as ID;

  // IDs for songs
  const idSongA = freshID(); // C, G (Diff 1)
  const idSongB = freshID(); // C, Am (Diff 5)
  const idSongC = freshID(); // G, D (Diff 2)
  const idSongD = freshID(); // C, G, Am (Diff 3)
  const idSongE = freshID(); // E (Diff 1)

  const allSongs: SongInput[] = [
    { _id: idSongA, chords: ["C", "G"], difficulty: 1 },
    { _id: idSongB, chords: ["C", "Am"], difficulty: 5 },
    { _id: idSongC, chords: ["G", "D"], difficulty: 2 },
    { _id: idSongD, chords: ["C", "G", "Am"], difficulty: 3 },
    { _id: idSongE, chords: ["E"], difficulty: 1 },
  ];

  await t.step("Action: calculateRecommendation (Basic Unlock)", async () => {
    console.log("Test: Calculate recommendation for a user knowing only 'C'");
    // User knows "C".
    // Candidates:
    // - "G": Unlocks Song A (needs C, G).
    // - "Am": Unlocks Song B (needs C, Am).
    // - "D": Needs "G" as well for Song C. Unlocks 0.
    // - "E": Unlocks Song E.
    //
    // Comparison:
    // "G" unlocks 1 (Song A, diff 1).
    // "Am" unlocks 1 (Song B, diff 5).
    // "E" unlocks 1 (Song E, diff 1).
    //
    // Tie-break: G (diff 1) vs E (diff 1). Alphabetical: 'E' < 'G'.
    // Expectation: 'E' should be recommended.
    
    const result = await engine.calculateRecommendation({
      user,
      knownChords: ["C"],
      allSongs,
    });

    assertNotEquals(result.recommendationId, "none");

    const stored = await engine._getRecommendation({ recommendationId: result.recommendationId });
    assertEquals(stored.length, 1);
    assertEquals(stored[0].recommendedChord, "E");
    assertEquals(stored[0].score, 1); // Unlocks 1 song
    assertEquals(stored[0].unlockedSongs, [idSongE]);
    
    console.log("-> Recommendation calculated: E (unlocks 1 song, lowest diff, alpha priority)");
  });

  await t.step("Action: calculateRecommendation (Tie-breaking by Difficulty)", async () => {
    console.log("Test: Tie-breaking where count is equal but difficulty differs");
    // Let's pretend user knows "C" and "E".
    // Remaining:
    // - "G": Unlocks Song A (C, G -> diff 1).
    // - "Am": Unlocks Song B (C, Am -> diff 5).
    //
    // Both unlock 1 song. G has difficulty 1, Am has 5.
    // Expectation: "G".

    const result = await engine.calculateRecommendation({
      user,
      knownChords: ["C", "E"],
      allSongs,
    });

    const stored = await engine._getRecommendation({ recommendationId: result.recommendationId });
    assertEquals(stored[0].recommendedChord, "G");
    assertEquals(stored[0].unlockedSongs, [idSongA]);
    
    console.log("-> Recommendation calculated: G (lower difficulty wins tie)");
  });

  await t.step("Action: calculateRecommendation (Multi-song Unlock)", async () => {
    console.log("Test: Chord unlocks multiple songs");
    // User knows "C" and "G".
    // Song A (C, G) is already playable.
    // Candidates:
    // - "Am":
    //    - Unlocks Song B (C, Am).
    //    - Unlocks Song D (C, G, Am).
    //    - Total: 2 songs.
    // - "D":
    //    - Unlocks Song C (G, D).
    //    - Total: 1 song.
    // Expectation: "Am" because count (2) > count (1).

    const result = await engine.calculateRecommendation({
      user,
      knownChords: ["C", "G"],
      allSongs,
    });

    const stored = await engine._getRecommendation({ recommendationId: result.recommendationId });
    assertEquals(stored[0].recommendedChord, "Am");
    assertEquals(stored[0].score, 2);
    assertEquals(stored[0].unlockedSongs.sort(), [idSongB, idSongD].sort());
    
    console.log("-> Recommendation calculated: Am (unlocks 2 songs)");
  });

  await t.step("Action: calculateRecommendation (No valuable recommendation)", async () => {
    console.log("Test: User knows almost everything, or remaining chords unlock nothing immediately");
    // User knows C, G, Am, D, E.
    // All songs in library are playable.
    // No candidates left.
    
    const result = await engine.calculateRecommendation({
      user,
      knownChords: ["C", "G", "Am", "D", "E"],
      allSongs,
    });

    assertEquals(result.recommendationId, "none");
    console.log("-> No recommendation available (all songs unlocked)");
  });

  await t.step("Query: requestChordRecommendation (Stateless)", async () => {
    console.log("Test: Stateless query logic check");
    // Same logic as "Multi-song Unlock" scenario
    const results = await engine.requestChordRecommendation({
      knownChords: ["C", "G"],
      allSongs,
    });

    assertEquals(results.length, 1);
    assertEquals(results[0].recommendedChord, "Am");
    console.log("-> Stateless query confirmed 'Am'");
  });

  await t.step("Query: requestSongUnlockRecommendation (Stateless)", async () => {
    console.log("Test: Check specific unlocks for a specific chord");
    // If we learn "Am" given we know "C" and "G", what do we get?
    // Should match Song B and Song D.

    const results = await engine.requestSongUnlockRecommendation({
      knownChords: ["C", "G"],
      potentialChord: "Am",
      allSongs,
    });

    assertEquals(results.length, 1);
    const unlocked = results[0].unlockedSongs.sort();
    const expected = [idSongB, idSongD].sort();
    assertEquals(unlocked, expected);
    console.log("-> Stateless unlock query confirmed songs B and D");
  });

  await client.close();
});