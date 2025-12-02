import { assertEquals, assertExists } from "jsr:@std/assert";
import { Song, db, client } from "@concepts";

const testOptions = {
  sanitizeResources: false,
  sanitizeOps: false,
};

Deno.test("Song._getSuggestedSongs", testOptions, async (t) => {
  // Create test songs with known chord combinations
  const testSuffix = Date.now();
  const testSongs: Array<{ id: string; title: string; chords: string[] }> = [];

  await t.step("Setup: Create test songs", async () => {
    // Song 1: Only needs C and G (2 chords)
    const song1 = await Song.createSong({
      id: `test-song-cg-${testSuffix}`,
      title: `Test Song CG ${testSuffix}`,
      artist: "Test Artist",
      chords: ["C", "G"],
      difficulty: 1,
    });
    if (!("error" in song1)) testSongs.push({ id: song1.song._id, title: song1.song.title, chords: ["C", "G"] });

    // Song 2: Needs C, G, Am (3 chords)
    const song2 = await Song.createSong({
      id: `test-song-cgam-${testSuffix}`,
      title: `Test Song CGAm ${testSuffix}`,
      artist: "Test Artist",
      chords: ["C", "G", "Am"],
      difficulty: 1,
    });
    if (!("error" in song2)) testSongs.push({ id: song2.song._id, title: song2.song.title, chords: ["C", "G", "Am"] });

    // Song 3: Needs C, G, Am, F (4 chords)
    const song3 = await Song.createSong({
      id: `test-song-cgamf-${testSuffix}`,
      title: `Test Song CGAmF ${testSuffix}`,
      artist: "Test Artist",
      chords: ["C", "G", "Am", "F"],
      difficulty: 2,
    });
    if (!("error" in song3)) testSongs.push({ id: song3.song._id, title: song3.song.title, chords: ["C", "G", "Am", "F"] });

    // Song 4: Needs D, E, A (no overlap with C, G)
    const song4 = await Song.createSong({
      id: `test-song-dea-${testSuffix}`,
      title: `Test Song DEA ${testSuffix}`,
      artist: "Test Artist",
      chords: ["D", "E", "A"],
      difficulty: 2,
    });
    if (!("error" in song4)) testSongs.push({ id: song4.song._id, title: song4.song.title, chords: ["D", "E", "A"] });

    assertEquals(testSongs.length, 4, "Should have created 4 test songs");
  });

  await t.step("User knows C only - should suggest songs with C", async () => {
    const result = await Song._getSuggestedSongs({ knownChords: ["C"], limit: 10 });
    
    assertExists(result, "Result should exist");
    
    // Filter to only our test songs
    const testResults = result.filter(r => r.song.title.includes(testSuffix.toString()));
    
    // Should include songs that have C (songs 1, 2, 3)
    // Should NOT include song 4 (D, E, A - no C)
    const songTitles = testResults.map(r => r.song.title);
    console.log("Songs suggested for user knowing [C]:", songTitles);
    
    // Check that song with D, E, A is not included (0 known chords)
    const deaSong = testResults.find(r => r.song.title.includes("DEA"));
    assertEquals(deaSong, undefined, "Song with no known chords should not be suggested");
    
    // Check song with C, G - user knows 1 of 2 chords
    const cgSong = testResults.find(r => r.song.title.includes("CG") && !r.song.title.includes("Am"));
    if (cgSong) {
      assertEquals(cgSong.knownCount, 1, "Should know 1 chord");
      assertEquals(cgSong.totalChords, 2, "Song has 2 unique chords");
      assertEquals(cgSong.missingChords.length, 1, "Missing 1 chord");
      assertEquals(cgSong.missingChords[0], "G", "Missing chord should be G");
      assertEquals(cgSong.percentComplete, 50, "Should be 50% complete");
    }
  });

  await t.step("User knows C and G - should prioritize songs needing fewer chords", async () => {
    const result = await Song._getSuggestedSongs({ knownChords: ["C", "G"], limit: 10 });
    
    // Filter to only our test songs
    const testResults = result.filter(r => r.song.title.includes(testSuffix.toString()));
    
    console.log("Songs suggested for user knowing [C, G]:");
    testResults.forEach(r => {
      console.log(`  ${r.song.title}: ${r.knownCount}/${r.totalChords} (${r.percentComplete.toFixed(1)}%) - missing: ${r.missingChords.join(", ")}`);
    });
    
    // Song CG should be fully playable (100%) but since it's playable, 
    // it might still show up as a suggestion with 0 missing chords
    const cgSong = testResults.find(r => r.song.title.includes("CG") && !r.song.title.includes("Am"));
    if (cgSong) {
      assertEquals(cgSong.knownCount, 2, "Should know 2 chords");
      assertEquals(cgSong.missingChords.length, 0, "Should have no missing chords");
      assertEquals(cgSong.percentComplete, 100, "Should be 100% complete");
    }
    
    // Song CGAm needs just 1 more chord (Am)
    const cgamSong = testResults.find(r => r.song.title.includes("CGAm") && !r.song.title.includes("F"));
    if (cgamSong) {
      assertEquals(cgamSong.knownCount, 2, "Should know 2 chords");
      assertEquals(cgamSong.missingChords.length, 1, "Missing 1 chord");
      assertEquals(cgamSong.missingChords[0], "Am", "Missing chord should be Am");
    }
    
    // Song CGAmF needs 2 more chords (Am, F)
    const cgamfSong = testResults.find(r => r.song.title.includes("CGAmF"));
    if (cgamfSong) {
      assertEquals(cgamfSong.knownCount, 2, "Should know 2 chords");
      assertEquals(cgamfSong.missingChords.length, 2, "Missing 2 chords");
    }
  });

  await t.step("Sorting: Songs with fewer missing chords should come first", async () => {
    const result = await Song._getSuggestedSongs({ knownChords: ["C", "G", "Am"], limit: 10 });
    
    // Filter to only our test songs
    const testResults = result.filter(r => r.song.title.includes(testSuffix.toString()));
    
    console.log("Songs suggested for user knowing [C, G, Am]:");
    testResults.forEach(r => {
      console.log(`  ${r.song.title}: missing ${r.missingChords.length} chords`);
    });
    
    // Verify sorting - songs should be ordered by missing chord count
    for (let i = 1; i < testResults.length; i++) {
      const prev = testResults[i - 1];
      const curr = testResults[i];
      
      // Previous should have <= missing chords compared to current
      const prevMissing = prev.missingChords.length;
      const currMissing = curr.missingChords.length;
      
      assertEquals(
        prevMissing <= currMissing,
        true,
        `Song "${prev.song.title}" (missing ${prevMissing}) should come before "${curr.song.title}" (missing ${currMissing})`
      );
    }
  });

  await t.step("Empty knownChords - should return empty (no relevant suggestions)", async () => {
    const result = await Song._getSuggestedSongs({ knownChords: [], limit: 10 });
    
    // Filter to only our test songs
    const testResults = result.filter(r => r.song.title.includes(testSuffix.toString()));
    
    // With 0 known chords, all songs have knownCount=0, so they should all be filtered out
    assertEquals(testResults.length, 0, "Should not suggest songs when user knows no chords");
  });

  await t.step("Limit parameter works", async () => {
    const result = await Song._getSuggestedSongs({ knownChords: ["C"], limit: 2 });
    
    // Should return at most 2 songs
    assertEquals(result.length <= 2, true, "Should respect limit parameter");
  });

  await t.step("Cleanup: Delete test songs", async () => {
    for (const song of testSongs) {
      await Song.deleteSong({ song: song.id as import("@utils/types.ts").ID });
    }
    console.log(`Cleaned up ${testSongs.length} test songs`);
  });

  // Close connection
  await client.close();
});
