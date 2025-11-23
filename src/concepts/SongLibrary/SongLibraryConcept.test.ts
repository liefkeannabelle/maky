import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import SongLibraryConcept, { SongID, UserID } from "./SongLibraryConcept.ts";
import SongConcept from "../Song/SongConcept.ts";

Deno.test("SongLibraryConcept - Action Tests", async (t) => {
  const [db, client] = await testDb();
  const songLibrary = new SongLibraryConcept(db);
  const songConcept = new SongConcept(db);

  // Shared data
  const songId = "song:sunrise-groove" as SongID;
  const userId = "user:alice" as UserID;

  // Setup: Create song
  await songConcept.createSong({
    id: songId,
    title: "Sunrise Groove",
    artist: "Kelpy G",
    chords: ["G", "C", "D"],
    genre: "Jazz",
    difficulty: 1,
  });

  await t.step(
    "addUser: requires unique user; effects creates user",
    async () => {
      const result = await songLibrary.addUser({ user: userId });
      assertEquals(result, { success: true }, "Should return success object");

      // Test Requirement: Unique user
      const duplicate = await songLibrary.addUser({ user: userId });
      if (!("error" in duplicate)) throw new Error("Should have failed");
      assertEquals(duplicate.error, "User already exists in library");
    },
  );

  await t.step(
    "startLearningSong: requires valid user/song; effects adds progress",
    async () => {
      const result = await songLibrary.startLearningSong({
        user: userId,
        song: songId,
        mastery: "in-progress",
      });
      assertEquals(result, {}, "Should start learning successfully");

      // Verify state directly via query
      const progress = await songLibrary._getSongsInProgress({ user: userId });
      assertEquals(progress.length, 1);
      assertEquals(progress[0].song._id, songId);
      assertEquals(progress[0].mastery, "in-progress");

      // Test Requirement: Cannot learn twice
      const duplicate = await songLibrary.startLearningSong({
        user: userId,
        song: songId,
        mastery: "mastered",
      });
      if (!("error" in duplicate)) throw new Error("Should have failed");
      assertEquals(
        duplicate.error,
        "User is already learning this song",
      );
    },
  );

  await t.step(
    "updateSongMastery: requires existing progress; effects updates state",
    async () => {
      const result = await songLibrary.updateSongMastery({
        user: userId,
        song: songId,
        newMastery: "mastered",
      });
      assertEquals(result, {}, "Should update successfully");

      const progress = await songLibrary._getSongsInProgress({ user: userId });
      assertEquals(progress[0].mastery, "mastered");
    },
  );

  await t.step(
    "stopLearningSong: requires existing progress; effects removes progress",
    async () => {
      const result = await songLibrary.stopLearningSong({
        user: userId,
        song: songId,
      });
      assertEquals(result, {}, "Should stop learning successfully");

      const progress = await songLibrary._getSongsInProgress({ user: userId });
      assertEquals(progress.length, 0);
    },
  );

  await client.close();
});

Deno.test("SongLibraryConcept - Principle Trace", async (t) => {
  const [db, client] = await testDb();
  const songLibrary = new SongLibraryConcept(db);
  const songConcept = new SongConcept(db);

  console.log("\n--- Principle Trace: User Learning Journey ---");

  // 1. Setup World
  // "User with a known set of chords..."
  const userId = "user:bob" as UserID;
  await songLibrary.addUser({ user: userId });
  const knownChords = ["C", "G", "D"];

  // Populate Library
  const easySongRes = await songConcept.createSong({
    title: "Easy",
    artist: "Me",
    chords: ["C", "G"],
  });
  if ("error" in easySongRes) throw new Error(easySongRes.error);
  const easySong = easySongRes.song;

  const hardSongRes = await songConcept.createSong({
    title: "Hard",
    artist: "Me",
    chords: ["Cm7", "F9"],
  });
  if ("error" in hardSongRes) throw new Error(hardSongRes.error);
  const hardSong = hardSongRes.song;

  await t.step("1. User queries library for playable songs", async () => {
    // "...can query the library to find songs they can play."
    // Note: This query moved to SongConcept, but for the trace we can use SongConcept
    const playable = await songConcept._getPlayableSongs({ knownChords });
    console.log("User knows C,G,D. Playable songs found:", playable.length);

    assertEquals(playable.length, 1);
    assertEquals(playable[0].song.title, "Easy");
  });

  await t.step("2. User adds song to learning journal", async () => {
    // "They can then add a song to their personal learning journal..."
    const result = await songLibrary.startLearningSong({
      user: userId,
      song: easySong._id,
      mastery: "in-progress",
    });
    assertEquals(result, {});
    console.log("User started learning 'Easy'.");
  });

  await t.step("3. User tracks progress", async () => {
    // "...track their progress from 'in-progress' to 'mastered'..."

    // Check initial state
    let journal = await songLibrary._getSongsInProgress({ user: userId });
    assertEquals(journal[0].mastery, "in-progress");
    console.log("Journal status:", journal[0].mastery);

    // Update mastery
    await songLibrary.updateSongMastery({
      user: userId,
      song: easySong._id,
      newMastery: "mastered",
    });
    console.log("User mastered 'Easy'.");

    // Verify final state
    journal = await songLibrary._getSongsInProgress({ user: userId });
    assertEquals(journal[0].mastery, "mastered");
    console.log("Journal updated status:", journal[0].mastery);
  });

  await client.close();
});
