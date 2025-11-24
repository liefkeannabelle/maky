
import { assert, assertEquals } from "jsr:@std/assert";
import { Engine, db, client, Requesting, Sessioning, UserAccount, Chord, Song, ChordLibrary, SongLibrary, RecommendationEngine } from "../concepts/test_concepts.ts";
import * as SongLibrarySyncs from "./songLibrary.sync.ts";
import * as ChordLibrarySyncs from "./chordLibrary.sync.ts";
import * as RecommendationEngineSyncs from "./recommendationEngine.sync.ts";
import { ID } from "@utils/types.ts";

// Register all syncs
const allSyncs: Record<string, any> = {};
Object.entries(SongLibrarySyncs).forEach(([name, sync]) => allSyncs[`songLibrary.${name}`] = sync);
Object.entries(ChordLibrarySyncs).forEach(([name, sync]) => allSyncs[`chordLibrary.${name}`] = sync);
Object.entries(RecommendationEngineSyncs).forEach(([name, sync]) => allSyncs[`recommendationEngine.${name}`] = sync);
Engine.register(allSyncs);

Deno.test("Music System Integration Tests", async (t) => {
  console.log("\n--- Starting Music System Tests ---");

  // Setup: Create User and Session
  let userId: ID;
  let sessionId: ID;
  let username = "music_tester";

  await t.step("Setup: Create User and Session", async () => {
    const userRes = await UserAccount.register({ username, password: "password123", email: "test@example.com", isKidAccount: false });
    if ("error" in userRes) throw new Error(userRes.error);
    userId = userRes.user;

    const sessionRes = await Sessioning.create({ user: userId });
    if ("error" in sessionRes) throw new Error(sessionRes.error as string);
    sessionId = sessionRes.sessionId;

    // Initialize libraries for user
    await ChordLibrary.addUser({ user: userId });
    await SongLibrary.addUser({ user: userId });

    console.log(` -> Created user ${userId} and session ${sessionId}`);
  });

  // Setup: Create Chords and Songs
  await t.step("Setup: Populate Catalog", async () => {
    // Chords
    await Chord.createChord({ name: "C", notes: ["C", "E", "G"] });
    await Chord.createChord({ name: "G", notes: ["G", "B", "D"] });
    await Chord.createChord({ name: "Am", notes: ["A", "C", "E"] });
    await Chord.createChord({ name: "F", notes: ["F", "A", "C"] });

    // Songs
    await Song.createSong({
      title: "Simple Song",
      artist: "Test Artist",
      chords: ["C", "G"],
      genre: "Pop",
      difficulty: 1
    });
    await Song.createSong({
      title: "Complex Song",
      artist: "Test Artist",
      chords: ["C", "G", "Am", "F"],
      genre: "Rock",
      difficulty: 3
    });
    
    console.log(" -> Populated chords and songs");
  });

  // Test 1: ChordLibrary Syncs
  await t.step("ChordLibrary Syncs", async (t) => {
    await t.step("Add Chord to Inventory (via addChordToInventory)", async () => {
      // Add C with 'in progress'
      await ChordLibrary.addChordToInventory({ user: userId, chord: "C", mastery: "in progress" });
      
      const userChords = await ChordLibrary._getKnownChords({ user: userId });
      const hasC = userChords.some(c => c.chord === "C" && c.mastery === "in progress");
      assert(hasC, "User should have C chord with 'in progress' mastery");
    });
  });

    // Test 2: SongLibrary Syncs
  await t.step("SongLibrary Syncs", async (t) => {
    await t.step("Get Playable Songs", async () => {
      // User knows "C". "Simple Song" needs "C", "G". User doesn't know "G".
      // So no playable songs.
      
      // Let's learn "G".
      await ChordLibrary.addChordToInventory({ user: userId, chord: "G", mastery: "mastered" });
      
      // Now user knows C and G. "Simple Song" should be playable.
      const playable = await Song._getPlayableSongs({ knownChords: ["C", "G"] });
      assert(playable.length >= 1, "Should have at least 1 playable song");
      assertEquals(playable[0].song.title, "Simple Song");
    });

    await t.step("Start Learning Song", async () => {
      // Find "Simple Song" ID
      const songs = await Song._getAllSongs({});
      const simpleSong = songs.find(s => s.song.title === "Simple Song");
      if (!simpleSong) throw new Error("Simple Song not found");
      
      // Call concept directly
      await SongLibrary.startLearningSong({
        user: userId,
        song: simpleSong.song._id,
        mastery: "in-progress"
      });
      
      // Verify state
      const progress = await SongLibrary._getSongsInProgress({ user: userId });
      const isLearning = progress.some(p => p.song._id === simpleSong.song._id);
      assert(isLearning, "User should be learning Simple Song");
    });
  });

  // Test 3: RecommendationEngine Syncs
  await t.step("RecommendationEngine Syncs", async (t) => {
    await t.step("Request Chord Recommendation", async () => {
      // User knows C, G.
      // "Complex Song" needs C, G, Am, F.
      // Recommendation should likely be Am or F.
      
      const allSongs = await Song._getAllSongs({});
      const allSongsList = allSongs.map(s => ({
        _id: s.song._id,
        chords: s.song.chords,
        difficulty: s.song.difficulty
      }));
      
      const rec = await RecommendationEngine.requestChordRecommendation({
        knownChords: ["C", "G"],
        allSongs: allSongsList
      });
      
      console.log("Recommended Chord:", rec[0]?.recommendedChord);
      assert(rec.length > 0, "Should return a recommendation");
      assert(["Am", "F"].includes(rec[0].recommendedChord), "Should recommend Am or F");
    });
  });

  await client.close();
});
