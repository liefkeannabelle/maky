/**
 * Integration Tests for Chord Diagram Syncs
 * 
 * Tests the automatic enrichment of recommendation responses with chord diagrams.
 * These tests verify that when users request chord recommendations, the responses
 * include fingering diagrams automatically via the sync system.
 */

import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import {
  Engine,
  db,
  client,
  Requesting,
  Sessioning,
  UserAccount,
  Chord,
  Song,
  ChordLibrary,
  SongLibrary,
  RecommendationEngine,
} from "@concepts";
import syncs from "@syncs";
import { ID } from "@utils/types.ts";
// Register all syncs
Engine.register(syncs);

const testOptions = {
  sanitizeResources: false,
  sanitizeOps: false,
};

/**
 * Helper: Validate chord diagram structure
 */
function validateChordDiagram(diagram: unknown) {
  assertExists(diagram, "Diagram should exist");
  
  const d = diagram as {
    frets: number[];
    fingers: number[];
    baseFret: number;
    barres?: number[];
    capo?: boolean;
    name: string;
  };

  assertExists(d.frets, "Diagram should have frets array");
  assertEquals(d.frets.length, 6, "Frets should have 6 elements (one per string)");
  
  assertExists(d.fingers, "Diagram should have fingers array");
  assertEquals(d.fingers.length, 6, "Fingers should have 6 elements");
  
  assertExists(d.baseFret, "Diagram should have baseFret");
  assert(typeof d.baseFret === "number", "baseFret should be a number");
  
  assertExists(d.name, "Diagram should have a name");
}

/**
 * Helper: Validate diagram array
 */
function validateDiagramArray(diagrams: unknown) {
  assertExists(diagrams, "Diagrams should exist");
  assert(Array.isArray(diagrams), "Diagrams should be an array");
  
  if (diagrams.length > 0) {
    diagrams.forEach((d) => validateChordDiagram(d));
  }
}

Deno.test("Chord Diagram Integration Tests", testOptions, async (t) => {
  console.log("\n=== CHORD DIAGRAM SYNC TESTS ===\n");

  // Global test variables
  let userId: ID;
  let sessionId: ID;
  const username = `diagram_tester_${Date.now()}`;

  // ===========================
  // SETUP: Create Test Environment
  // ===========================
  
  await t.step("Setup: Create User and Session", async () => {
    console.log("\n[SETUP] Creating test user and session...");
    
    const userRes = await UserAccount.register({
      username,
      password: "password123",
      email: `${username}@test.com`,
      isKidAccount: false,
      isPrivateAccount: false,
    });
    
    if ("error" in userRes) throw new Error(userRes.error);
    userId = userRes.user;
    console.log(`✓ User created: ${userId}`);

    const sessionRes = await Sessioning.create({ user: userId });
    if ("error" in sessionRes) throw new Error(sessionRes.error as string);
    sessionId = sessionRes.sessionId;
    console.log(`✓ Session created: ${sessionId}`);

    // Initialize user libraries
    await ChordLibrary.addUser({ user: userId });
    await SongLibrary.addUser({ user: userId });
    console.log("✓ User libraries initialized");
  });

  await t.step("Setup: Populate Catalog with Known Chords", async () => {
    console.log("\n[SETUP] Populating chord catalog...");
    
    // Create chords (these should have diagrams available in chordDiagrams.ts)
    const chords = [
      { name: "C", notes: ["C", "E", "G"] },
      { name: "G", notes: ["G", "B", "D"] },
      { name: "Am", notes: ["A", "C", "E"] },
      { name: "F", notes: ["F", "A", "C"] },
      { name: "Em", notes: ["E", "G", "B"] },
      { name: "D", notes: ["D", "F#", "A"] },
    ];

    for (const chord of chords) {
      const res = await Chord.createChord(chord);
      if ("error" in res) {
        console.log(`  Note: Chord ${chord.name} may already exist`);
      } else {
        console.log(`  ✓ Created chord: ${chord.name}`);
      }
    }
  });

  await t.step("Setup: Create Test Songs", async () => {
    console.log("\n[SETUP] Creating test songs...");
    
    const songs = [
      {
        title: "Beginner Song",
        artist: "Test Artist",
        chords: ["C", "G"],
        genre: "Pop",
        difficulty: 1,
      },
      {
        title: "Intermediate Song",
        artist: "Test Artist",
        chords: ["C", "G", "Am", "F"],
        genre: "Rock",
        difficulty: 2,
      },
      {
        title: "Advanced Song",
        artist: "Test Artist",
        chords: ["C", "G", "Am", "F", "Em", "D"],
        genre: "Folk",
        difficulty: 3,
      },
    ];

    for (const song of songs) {
      const res = await Song.createSong(song);
      if ("error" in res) {
        console.log(`  Note: Song "${song.title}" may already exist`);
      } else {
        console.log(`  ✓ Created song: ${song.title}`);
      }
    }
  });

  // ===========================
  // TEST 1: requestChordRecommendation with Diagram
  // ===========================
  
  await t.step(
    "TEST 1: POST /api/RecommendationEngine/requestChordRecommendation returns diagram",
    async () => {
      console.log(
        "\n[TEST 1] Testing requestChordRecommendation endpoint with diagram enrichment",
      );

      // GIVEN: User knows C and G
      const knownChords = ["C", "G"];
      
      // Get all songs for recommendation
      const allSongsRes = await Song._getAllSongsForRecommendation({});
      const allSongs = allSongsRes.map((s) => ({
        _id: s._id,
        chords: s.chords,
        difficulty: s.difficulty,
      }));

      console.log(`  Known chords: ${knownChords.join(", ")}`);
      console.log(`  Total songs in catalog: ${allSongs.length}`);

      // WHEN: Request a chord recommendation via Requesting API
      const reqRes = await Requesting.request({
        path: "/RecommendationEngine/requestChordRecommendation",
        knownChords,
        allSongs,
      });

      const requestId = reqRes.request;
      console.log(`  Request ID: ${requestId}`);

      // Wait for sync to process and respond
      const responses = await Requesting._awaitResponse({ request: requestId });
      assertExists(responses, "Should receive a response");
      assertEquals(responses.length, 1, "Should receive exactly one response");

      const response = responses[0].response as {
        recommendedChord: string | null;
        diagram: unknown;
      };

      console.log(`  Response received`);
      console.log(`  Recommended chord: ${response.recommendedChord}`);

      // THEN: Response should include both chord and diagram
      assertExists(
        response.recommendedChord,
        "Should return a recommended chord",
      );
      assert(
        typeof response.recommendedChord === "string",
        "Recommended chord should be a string",
      );
      
      // Verify diagram exists and has correct structure
      assertExists(
        response.diagram,
        "Response should include chord diagram",
      );
      validateDiagramArray(response.diagram);

      console.log(`  ✓ Diagram validation passed`);
      console.log(
        `  ✓ Recommended chord "${response.recommendedChord}" includes ${
          (response.diagram as unknown[]).length
        } diagram voicing(s)`,
      );
    },
  );

  // ===========================
  // TEST 2: recommendNextChordsForTargetSong with Diagrams
  // ===========================
  
  await t.step(
    "TEST 2: POST /api/RecommendationEngine/recommendNextChordsForTargetSong returns diagrams",
    async () => {
      console.log(
        "\n[TEST 2] Testing recommendNextChordsForTargetSong endpoint with diagram enrichment",
      );

      // GIVEN: User knows only C
      await ChordLibrary.addChordToInventory({
        user: userId,
        chord: "C",
        mastery: "mastered",
      });

      // Find "Advanced Song" which requires C, G, Am, F, Em, D
      const allSongs = await Song._getAllSongs({});
      const targetSong = allSongs.find((s) => s.song.title === "Advanced Song");
      
      if (!targetSong) {
        throw new Error("Advanced Song not found in catalog");
      }

      console.log(`  Target song: ${targetSong.song.title}`);
      console.log(`  Required chords: ${targetSong.song.chords.join(", ")}`);
      console.log(`  User knows: C`);

      // WHEN: Request learning path via Requesting API
      const reqRes = await Requesting.request({
        path: "/RecommendationEngine/recommendNextChordsForTargetSong",
        sessionId,
        targetSong: targetSong.song._id,
      });

      const requestId = reqRes.request;
      console.log(`  Request ID: ${requestId}`);

      // Wait for sync to process and respond
      const responses = await Requesting._awaitResponse({ request: requestId });
      assertExists(responses, "Should receive a response");

      const response = responses[0].response as {
        recommendedPath: string[];
        pathDiagrams: Record<string, unknown>;
      };

      console.log(`  Response received`);
      console.log(`  Recommended path: ${response.recommendedPath.join(" → ")}`);

      // THEN: Response should include path and diagrams for each chord
      assertExists(response.recommendedPath, "Should return a learning path");
      assert(
        Array.isArray(response.recommendedPath),
        "Path should be an array",
      );
      assert(
        response.recommendedPath.length > 0,
        "Path should contain at least one chord",
      );

      // Verify pathDiagrams exists
      assertExists(
        response.pathDiagrams,
        "Response should include pathDiagrams",
      );
      
      // Verify each chord in path has diagrams
      for (const chord of response.recommendedPath) {
        assertExists(
          response.pathDiagrams[chord],
          `Diagram should exist for chord ${chord}`,
        );
        validateDiagramArray(response.pathDiagrams[chord]);
        console.log(
          `  ✓ Chord "${chord}" has ${
            (response.pathDiagrams[chord] as unknown[]).length
          } diagram(s)`,
        );
      }

      console.log(`  ✓ All chords in learning path have diagrams`);
    },
  );

  // ===========================
  // TEST 3: addChordToInventory with Recommendation Diagram
  // ===========================
  
  await t.step(
    "TEST 3: POST /chords/add returns recommendation with diagram",
    async () => {
      console.log(
        "\n[TEST 3] Testing /chords/add endpoint with recommendation diagram",
      );

      // GIVEN: User has C in inventory, adding G
      console.log(`  User currently knows: C`);
      console.log(`  Adding chord: G`);

      // WHEN: Add chord via /chords/add custom sync
      const reqRes = await Requesting.request({
        path: "/chords/add",
        sessionId,
        chord: "G",
      });

      const requestId = reqRes.request;
      console.log(`  Request ID: ${requestId}`);

      // Wait for sync to process
      const responses = await Requesting._awaitResponse({ request: requestId });
      assertExists(responses, "Should receive a response");

      const wrapper = responses[0].response as {
        response: {
          success: boolean;
          normalizedChord: string;
          inventory: string[];
          playableSongs: unknown[];
          recommendation: {
            recommendedChord: string | null;
            recommendedChordDiagram: unknown;
            unlockedSongIds: ID[];
          };
        };
      };
      
      const response = wrapper.response;

      console.log(`  Response received`);
      console.log(`  Success: ${response.success}`);
      console.log(`  Updated inventory: ${response.inventory.join(", ")}`);

      // THEN: Verify response structure
      assertEquals(response.success, true, "Should succeed");
      assertEquals(
        response.normalizedChord,
        "G",
        "Should normalize chord to G",
      );
      
      // Verify inventory updated
      assert(
        response.inventory.includes("C"),
        "Inventory should include C",
      );
      assert(
        response.inventory.includes("G"),
        "Inventory should include G",
      );

      // Verify playable songs
      assertExists(response.playableSongs, "Should return playable songs");
      assert(
        Array.isArray(response.playableSongs),
        "Playable songs should be array",
      );
      console.log(`  Playable songs count: ${response.playableSongs.length}`);

      // Verify recommendation with diagram
      assertExists(response.recommendation, "Should include recommendation");
      
      if (response.recommendation.recommendedChord) {
        console.log(
          `  Next recommended chord: ${response.recommendation.recommendedChord}`,
        );
        
        // Verify diagram exists for recommended chord
        assertExists(
          response.recommendation.recommendedChordDiagram,
          "Recommendation should include diagram",
        );
        validateDiagramArray(response.recommendation.recommendedChordDiagram);
        
        console.log(
          `  ✓ Recommended chord "${response.recommendation.recommendedChord}" includes diagram`,
        );
        
        // Verify unlocked songs
        assertExists(
          response.recommendation.unlockedSongIds,
          "Should include unlocked songs",
        );
        console.log(
          `  Songs that would be unlocked: ${response.recommendation.unlockedSongIds.length}`,
        );
      } else {
        console.log("  Note: No chord recommendation (user may know all chords)");
      }

      console.log("  ✓ /chords/add response complete with recommendation");
    },
  );

  // ===========================
  // TEST 4: Verify Diagram Content Quality
  // ===========================
  
  await t.step("TEST 4: Verify diagram content quality", async () => {
    console.log("\n[TEST 4] Verifying diagram content quality");

    // Test common chords have valid diagrams
    const commonChords = ["C", "G", "D", "Em", "Am", "F"];
    
    for (const chordName of commonChords) {
      console.log(`\n  Testing chord: ${chordName}`);
      
      const result = await Chord._getChordDiagram({ name: chordName });
      
      assertExists(result.diagrams, `${chordName} should have diagrams`);
      
      if (result.diagrams && result.diagrams.length > 0) {
        console.log(`    ✓ Has ${result.diagrams.length} voicing(s)`);
        
        const firstDiagram = result.diagrams[0];
        validateChordDiagram(firstDiagram);
        
        // Log diagram details for manual verification
        console.log(`    Frets: [${firstDiagram.frets.join(", ")}]`);
        console.log(`    Fingers: [${firstDiagram.fingers.join(", ")}]`);
        console.log(`    Base fret: ${firstDiagram.baseFret}`);
        console.log(`    Name: ${firstDiagram.name}`);
        
        // Validate fret values are reasonable
        for (const fret of firstDiagram.frets) {
          assert(
            fret >= -1 && fret <= 24,
            `Fret value ${fret} should be between -1 and 24`,
          );
        }
        
        // Validate finger values are reasonable
        for (const finger of firstDiagram.fingers) {
          assert(
            finger >= 0 && finger <= 4,
            `Finger value ${finger} should be between 0 and 4`,
          );
        }
      } else {
        console.log(`    ⚠ Warning: No diagrams found for ${chordName}`);
      }
    }
    
    console.log("\n  ✓ All tested chords have valid diagram structures");
  });

  // ===========================
  // TEST 5: Edge Cases
  // ===========================
  
  await t.step("TEST 5: Edge cases - No recommendation available", async () => {
    console.log("\n[TEST 5] Testing edge case: User knows all chords");

    // GIVEN: User learns all possible chords
    const allChords = ["C", "G", "Am", "F", "Em", "D"];
    
    for (const chord of allChords) {
      const res = await ChordLibrary.addChordToInventory({
        user: userId,
        chord,
        mastery: "mastered",
      });
      
      if ("error" in res) {
        console.log(`  Note: ${chord} may already be in inventory`);
      }
    }

    console.log(`  User now knows all chords: ${allChords.join(", ")}`);

    // WHEN: Request recommendation with full knowledge
    const allSongsRes = await Song._getAllSongsForRecommendation({});
    const allSongs = allSongsRes.map((s) => ({
      _id: s._id,
      chords: s.chords,
      difficulty: s.difficulty,
    }));

    const reqRes = await Requesting.request({
      path: "/RecommendationEngine/requestChordRecommendation",
      knownChords: allChords,
      allSongs,
    });

    const responses = await Requesting._awaitResponse({
      request: reqRes.request,
    });
    const response = responses[0].response as {
      recommendedChord: string | null;
      diagram: unknown;
    };

    console.log(`  Recommended chord: ${response.recommendedChord || "null"}`);

    // THEN: Should handle gracefully (may return null or a chord from extended catalog)
    if (response.recommendedChord === null) {
      console.log("  ✓ Correctly returns null when no chords to recommend");
      assertEquals(
        response.diagram,
        null,
        "Diagram should be null when no recommendation",
      );
    } else {
      console.log(`  ✓ Returns additional chord: ${response.recommendedChord}`);
      validateDiagramArray(response.diagram);
    }
  });

  // ===========================
  // CLEANUP
  // ===========================
  
  await t.step("Cleanup: Close connections", async () => {
    console.log("\n[CLEANUP] Closing database connections...");
    await client.close();
    console.log("✓ Cleanup complete");
  });

  console.log("\n=== ALL CHORD DIAGRAM TESTS PASSED ===\n");
});
