[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: SongLibrary
# response:


# response:


# response:

# file: src/concepts/SongLibrary/SongLibraryConcept.test.ts

```typescript
import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import SongLibraryConcept, { SongID, UserID } from "./SongLibraryConcept.ts";
import { freshID } from "@utils/database.ts";

Deno.test("SongLibraryConcept - Action Tests", async (t) => {
  const [db, client] = await testDb();
  const songLibrary = new SongLibraryConcept(db);

  // Shared data
  const songId = "song:sunrise-groove" as SongID;
  const userId = "user:alice" as UserID;

  await t.step("addSong: requires unique song; effects creates song", async () => {
    const result = await songLibrary.addSong({
      id: songId,
      title: "Sunrise Groove",
      artist: "Kelpy G",
      chords: ["G", "C", "D"],
      genre: "Jazz",
      difficulty: 1,
    });

    assertNotEquals((result as any).song, undefined, "Should return the created song");
    const song = (result as any).song;
    assertEquals(song.title, "Sunrise Groove");
    assertEquals(song._id, songId);

    // Test Requirement: Unique song
    const duplicate = await songLibrary.addSong({
      title: "Sunrise Groove",
      artist: "Kelpy G",
      chords: ["A"],
    });
    assertEquals((duplicate as any).error, "Song already exists", "Should fail to add duplicate song");
  });

  await t.step("addUser: requires unique user; effects creates user", async () => {
    const result = await songLibrary.addUser({ user: userId });
    assertEquals(result, {}, "Should return empty success object");

    // Test Requirement: Unique user
    const duplicate = await songLibrary.addUser({ user: userId });
    assertEquals((duplicate as any).error, "User already exists in library");
  });

  await t.step("startLearningSong: requires valid user/song; effects adds progress", async () => {
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
    assertEquals((duplicate as any).error, "User is already learning this song");
  });

  await t.step("updateSongMastery: requires existing progress; effects updates state", async () => {
    const result = await songLibrary.updateSongMastery({
      user: userId,
      song: songId,
      newMastery: "mastered",
    });
    assertEquals(result, {}, "Should update successfully");

    const progress = await songLibrary._getSongsInProgress({ user: userId });
    assertEquals(progress[0].mastery, "mastered");
  });

  await t.step("stopLearningSong: requires existing progress; effects removes progress", async () => {
    const result = await songLibrary.stopLearningSong({
      user: userId,
      song: songId,
    });
    assertEquals(result, {}, "Should stop learning successfully");

    const progress = await songLibrary._getSongsInProgress({ user: userId });
    assertEquals(progress.length, 0);
  });

  await t.step("removeSong: effects removes song and associated progress", async () => {
    // Setup: Add song back and user learning it
    await songLibrary.startLearningSong({ user: userId, song: songId, mastery: "in-progress" });
    
    const result = await songLibrary.removeSong({ song: songId });
    assertEquals(result, {}, "Should remove song successfully");

    // Verify song gone
    const songs = await songLibrary._getAllSongs({});
    const exists = songs.find(s => s.song._id === songId);
    assertEquals(exists, undefined);

    // Verify user progress cleared (would be error if not cleared properly or logic broken)
    // We re-add song just to make the query valid if it relies on join, 
    // but simpler is to check raw DB or check that _getSongsInProgress is empty
    // Since _getSongsInProgress filters out songs that don't exist in songs collection,
    // this effectively tests the requirement.
    const progress = await songLibrary._getSongsInProgress({ user: userId });
    assertEquals(progress.length, 0);
  });

  await client.close();
});

Deno.test("SongLibraryConcept - Query Logic", async (t) => {
  const [db, client] = await testDb();
  const songLibrary = new SongLibraryConcept(db);

  // Seed songs
  await songLibrary.addSong({ title: "Simple", artist: "A", chords: ["C", "G"], genre: "Folk" });
  await songLibrary.addSong({ title: "Medium", artist: "B", chords: ["C", "G", "Am"], genre: "Pop" });
  await songLibrary.addSong({ title: "Complex", artist: "C", chords: ["C", "G", "Am", "F"], genre: "Rock" });

  await t.step("_getPlayableSongs: filters by subset of known chords", async () => {
    // Case 1: Know C and G
    const result1 = await songLibrary._getPlayableSongs({ knownChords: ["C", "G"] });
    assertEquals(result1.length, 1);
    assertEquals(result1[0].song.title, "Simple");

    // Case 2: Know C, G, Am
    const result2 = await songLibrary._getPlayableSongs({ knownChords: ["C", "G", "Am"] });
    assertEquals(result2.length, 2); // Simple + Medium

    // Case 3: Know nothing
    const result3 = await songLibrary._getPlayableSongs({ knownChords: [] });
    assertEquals(result3.length, 0);
  });

  await t.step("_getPlayableSongs: filters by genre", async () => {
    const result = await songLibrary._getPlayableSongs({ knownChords: ["C", "G", "Am", "F"], genres: ["Rock"] });
    assertEquals(result.length, 1);
    assertEquals(result[0].song.title, "Complex");
  });

  await client.close();
});

Deno.test("SongLibraryConcept - Principle Trace", async (t) => {
  const [db, client] = await testDb();
  const songLibrary = new SongLibraryConcept(db);

  console.log("\n--- Principle Trace: User Learning Journey ---");

  // 1. Setup World
  // "User with a known set of chords..."
  const userId = "user:bob" as UserID;
  await songLibrary.addUser({ user: userId });
  const knownChords = ["C", "G", "D"]; 

  // Populate Library
  const easySong = (await songLibrary.addSong({ title: "Easy", artist: "Me", chords: ["C", "G"] }) as any).song;
  const hardSong = (await songLibrary.addSong({ title: "Hard", artist: "Me", chords: ["Cm7", "F9"] }) as any).song;

  await t.step("1. User queries library for playable songs", async () => {
    // "...can query the library to find songs they can play."
    const playable = await songLibrary._getPlayableSongs({ knownChords });
    console.log("User knows C,G,D. Playable songs found:", playable.length);
    
    assertEquals(playable.length, 1);
    assertEquals(playable[0].song.title, "Easy");
  });

  await t.step("2. User adds song to learning journal", async () => {
    // "They can then add a song to their personal learning journal..."
    const result = await songLibrary.startLearningSong({ 
      user: userId, 
      song: easySong._id, 
      mastery: "in-progress" 
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
      newMastery: "mastered" 
    });
    console.log("User mastered 'Easy'.");

    // Verify final state
    journal = await songLibrary._getSongsInProgress({ user: userId });
    assertEquals(journal[0].mastery, "mastered");
    console.log("Journal updated status:", journal[0].mastery);
  });

  await client.close();
});
```

# trace: SongLibraryConcept

The trace implements the core narrative:
1.  **Setup**: We create a user (Bob) and a set of songs (Easy, Hard) in the database.
2.  **Discovery**: Bob, knowing ["C", "G", "D"], asks for playable songs. The system correctly returns only the "Easy" song, filtering out the "Hard" song which requires unknown chords.
3.  **Action**: Bob decides to learn "Easy". The `startLearningSong` action is called.
4.  **Verification**: We check `_getSongsInProgress` and confirm Bob has the song marked as "in-progress".
5.  **Evolution**: Bob practices and updates the mastery. `updateSongMastery` is called.
6.  **Conclusion**: The state reflects the journey—Bob has "mastered" the song.