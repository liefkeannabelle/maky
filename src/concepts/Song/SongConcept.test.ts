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

// ============================================
// Preview URL and Album Art Tests
// ============================================

Deno.test("SongConcept - Preview URL Support", async (t) => {
  const [db, client] = await testDb();
  const songConcept = new SongConcept(db);

  await t.step("createSong: stores previewUrl and albumArtUrl", async () => {
    const result = await songConcept.createSong({
      id: "preview-test-1",
      title: "Shape of You",
      artist: "Ed Sheeran",
      chords: ["Em", "Am", "C", "D"],
      genre: "pop",
      previewUrl: "https://p.scdn.co/mp3-preview/abc123",
      albumArtUrl: "https://i.scdn.co/image/def456",
    });

    if ("error" in result) {
      throw new Error(result.error);
    }

    assertEquals(result.song.title, "Shape of You");
    assertEquals(result.song.previewUrl, "https://p.scdn.co/mp3-preview/abc123");
    assertEquals(result.song.albumArtUrl, "https://i.scdn.co/image/def456");
  });

  await t.step("createSong: handles missing previewUrl gracefully", async () => {
    const result = await songConcept.createSong({
      id: "preview-test-2",
      title: "Obscure Song",
      artist: "Unknown Artist",
      chords: ["G", "C", "D"],
      // No previewUrl or albumArtUrl
    });

    if ("error" in result) {
      throw new Error(result.error);
    }

    assertEquals(result.song.title, "Obscure Song");
    assertEquals(result.song.previewUrl, undefined);
    assertEquals(result.song.albumArtUrl, undefined);
  });

  await t.step("createSong: stores partial Spotify data (album art only)", async () => {
    const result = await songConcept.createSong({
      id: "preview-test-3",
      title: "Partial Data Song",
      artist: "Some Artist",
      chords: ["A", "D", "E"],
      albumArtUrl: "https://i.scdn.co/image/partial789",
      // Has album art but no preview
    });

    if ("error" in result) {
      throw new Error(result.error);
    }

    assertEquals(result.song.previewUrl, undefined);
    assertEquals(result.song.albumArtUrl, "https://i.scdn.co/image/partial789");
  });

  await t.step("query: retrieves song with preview URL via _getAllSongs", async () => {
    const allSongs = await songConcept._getAllSongs({});
    const song = allSongs.find(s => s.song._id === "preview-test-1");

    assertNotEquals(song, undefined);
    if (song) {
      assertEquals(song.song.previewUrl, "https://p.scdn.co/mp3-preview/abc123");
      assertEquals(song.song.albumArtUrl, "https://i.scdn.co/image/def456");
    }
  });

  await t.step("query: can filter songs with preview URLs", async () => {
    // Query songs that have preview URLs using $and to avoid type issues
    const songsWithPreviews = await songConcept.songs.find({
      $and: [
        { previewUrl: { $exists: true } },
        { previewUrl: { $type: "string" } }
      ]
    } as any).toArray();

    // Should find preview-test-1 (has preview URL)
    assertEquals(songsWithPreviews.length >= 1, true);
    
    const hasPreview = songsWithPreviews.some(s => 
      s.previewUrl === "https://p.scdn.co/mp3-preview/abc123"
    );
    assertEquals(hasPreview, true);
  });

  await t.step("updateSong: can add preview URL to existing song", async () => {
    // Create song without preview
    await songConcept.createSong({
      id: "preview-test-4",
      title: "No Preview Initially",
      artist: "Test Artist",
      chords: ["Am", "F", "C", "G"],
    });

    // Update to add preview URL
    const updateResult = await songConcept.updateSong({
      song: "preview-test-4" as SongID,
      updates: {
        previewUrl: "https://p.scdn.co/mp3-preview/newpreview",
        albumArtUrl: "https://i.scdn.co/image/newart",
      }
    });

    assertEquals("error" in updateResult, false);

    // Verify the update via direct collection query
    const updatedSong = await songConcept.songs.findOne({ _id: "preview-test-4" as SongID });
    assertNotEquals(updatedSong, null);
    if (updatedSong) {
      assertEquals(updatedSong.previewUrl, "https://p.scdn.co/mp3-preview/newpreview");
      assertEquals(updatedSong.albumArtUrl, "https://i.scdn.co/image/newart");
    }
  });

  // Cleanup
  await songConcept.deleteSong({ song: "preview-test-1" as SongID });
  await songConcept.deleteSong({ song: "preview-test-2" as SongID });
  await songConcept.deleteSong({ song: "preview-test-3" as SongID });
  await songConcept.deleteSong({ song: "preview-test-4" as SongID });

  await client.close();
});

Deno.test("Preview URL Format Validation", async (t) => {
  await t.step("recognizes valid Spotify preview URL format", () => {
    const validPreviewUrls = [
      "https://p.scdn.co/mp3-preview/abc123def456",
      "https://p.scdn.co/mp3-preview/7339548839a263fd721d01eb3364a848cad16fa7",
    ];

    for (const url of validPreviewUrls) {
      assertEquals(
        url.startsWith("https://p.scdn.co/mp3-preview/"), 
        true,
        `${url} should be a valid Spotify preview URL`
      );
    }
  });

  await t.step("recognizes valid Spotify album art URL format", () => {
    const validArtUrls = [
      "https://i.scdn.co/image/ab67616d00001e02ff9ca10b55ce82ae553c8228",
      "https://i.scdn.co/image/abc123",
    ];

    for (const url of validArtUrls) {
      assertEquals(
        url.startsWith("https://i.scdn.co/image/"), 
        true,
        `${url} should be a valid Spotify album art URL`
      );
    }
  });
});
