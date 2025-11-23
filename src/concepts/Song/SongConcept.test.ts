import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import SongConcept, { SongID } from "./SongConcept.ts";

Deno.test("SongConcept - Action Tests", async (t) => {
  const [db, client] = await testDb();
  const songConcept = new SongConcept(db);

  // Shared data
  const songId = "song:sunrise-groove" as SongID;

  await t.step(
    "createSong: requires unique song; effects creates song",
    async () => {
      const result = await songConcept.createSong({
        id: songId,
        title: "Sunrise Groove",
        artist: "Kelpy G",
        chords: ["G", "C", "D"],
        genre: "Jazz",
        difficulty: 1,
      });

      if ("error" in result) {
        throw new Error(result.error);
      }
      assertNotEquals(
        result.song,
        undefined,
        "Should return the created song",
      );
      const song = result.song;
      assertEquals(song.title, "Sunrise Groove");
      assertEquals(song._id, songId);

      // Test Requirement: Unique song
      const duplicate = await songConcept.createSong({
        title: "Sunrise Groove",
        artist: "Kelpy G",
        chords: ["A"],
      });
      if (!("error" in duplicate)) {
        throw new Error("Should have failed");
      }
      assertEquals(
        duplicate.error,
        "Song already exists",
        "Should fail to add duplicate song",
      );
    },
  );

  await t.step(
    "deleteSong: effects removes song",
    async () => {
      const result = await songConcept.deleteSong({ song: songId });
      assertEquals(result, {}, "Should remove song successfully");

      // Verify song gone
      const songs = await songConcept._getAllSongs({});
      const exists = songs.find((s) => s.song._id === songId);
      assertEquals(exists, undefined);
    },
  );

  await client.close();
});

Deno.test("SongConcept - Query Logic", async (t) => {
  const [db, client] = await testDb();
  const songConcept = new SongConcept(db);

  // Seed songs
  await songConcept.createSong({
    title: "Simple",
    artist: "A",
    chords: ["C", "G"],
    genre: "Folk",
  });
  await songConcept.createSong({
    title: "Medium",
    artist: "B",
    chords: ["C", "G", "Am"],
    genre: "Pop",
  });
  await songConcept.createSong({
    title: "Complex",
    artist: "C",
    chords: ["C", "G", "Am", "F"],
    genre: "Rock",
  });

  await t.step(
    "_getPlayableSongs: filters by subset of known chords",
    async () => {
      // Case 1: Know C and G
      const result1 = await songConcept._getPlayableSongs({
        knownChords: ["C", "G"],
      });
      assertEquals(result1.length, 1);
      assertEquals(result1[0].song.title, "Simple");

      // Case 2: Know C, G, Am
      const result2 = await songConcept._getPlayableSongs({
        knownChords: ["C", "G", "Am"],
      });
      assertEquals(result2.length, 2); // Simple + Medium

      // Case 3: Know nothing
      const result3 = await songConcept._getPlayableSongs({ knownChords: [] });
      assertEquals(result3.length, 0);
    },
  );

  await t.step("_getPlayableSongs: filters by genre", async () => {
    const result = await songConcept._getPlayableSongs({
      knownChords: ["C", "G", "Am", "F"],
      genres: ["Rock"],
    });
    assertEquals(result.length, 1);
    assertEquals(result[0].song.title, "Complex");
  });

  await client.close();
});
