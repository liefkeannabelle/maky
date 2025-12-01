import { assertEquals } from "jsr:@std/assert";
import {
  ChordLibrary,
  Engine,
  Requesting,
  Sessioning,
  Song,
  SongLibrary,
} from "../concepts/test_concepts.ts";
import syncs from "@syncs";
import { ID } from "@utils/types.ts";

// Register syncs with the test engine
Engine.register(syncs);

const testOptions = {
  sanitizeResources: false,
  sanitizeOps: false,
};

Deno.test("Integration: Auto-Add Chords", testOptions, async () => {
  // 1. Setup
  const suffix = Math.floor(Math.random() * 100000);
  const user = `user:test-integration-${suffix}` as ID;

  // Initialize libraries for user
  await SongLibrary.addUser({ user });
  await ChordLibrary.addUser({ user });

  // Create a song
  const songRes = await Song.createSong({
    title: `Integration Song ${suffix}`,
    artist: "Tester",
    chords: ["C", "G"],
  });
  if ("error" in songRes) throw new Error(songRes.error);
  const songId = songRes.song._id;

  // 2. Action: Start Learning
  // This should trigger AutoAddChordsForNewSong
  await SongLibrary.startLearningSong({
    user,
    song: songId,
    mastery: "in-progress",
  });

  // 3. Verify
  // Wait a bit for async syncs to complete if necessary (though awaitResponse usually handles it, here we don't have a request/response pair for the trigger)
  // AutoAddChordsForNewSong is triggered by startLearningSong.
  // The sync runs 'then' action: ChordLibrary.addChordToInventory.
  // We need to wait for that to happen.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const known = await ChordLibrary._getKnownChords({ user });
  const chordNames = known.map((c) => c.chord).sort();
  assertEquals(chordNames, ["C", "G"]);
});

Deno.test("Integration: Search Sync", testOptions, async () => {
  // 1. Setup
  const suffix = Math.floor(Math.random() * 100000);
  const title = `Searchable Song ${suffix}`;
  await Song.createSong({
    title: title,
    artist: "Finder",
    chords: ["Am"],
  });

  // 2. Action: Request Search
  const reqRes = await Requesting.request({
    path: "songs/search",
    query: title,
  });
  const requestId = reqRes.request;

  // 3. Wait for Response
  const responses = await Requesting._awaitResponse({ request: requestId });
  const response = responses[0].response as { results: { title: string }[] };

  // 4. Verify
  // The sync returns { results: [...] }
  assertEquals(response.results.length, 1);
  assertEquals(response.results[0].title, title);
});

Deno.test(
  "Integration: Chord Addition & Recommendation",
  testOptions,
  async () => {
    // 1. Setup
    const suffix = Math.floor(Math.random() * 100000);
    const user = `user:chord-adder-${suffix}` as ID;
    await ChordLibrary.addUser({ user });

    // Create session
    const sessionRes = await Sessioning.create({ user });
    const sessionId = sessionRes.sessionId;

    // Create some songs to recommend
    await Song.createSong({
      title: `Rec Song ${suffix}`,
      artist: "Rec",
      chords: ["C", "Am"], // Needs C and Am
    });

    // 2. Action: Add Chord 'C'
    // This triggers HandleChordAdditionRequest -> RespondToChordAddition
    const reqRes = await Requesting.request({
      path: "/chords/add",
      sessionId,
      chord: "C",
    });
    const requestId = reqRes.request;

    // 3. Wait for Response
    const responses = await Requesting._awaitResponse({ request: requestId });
    const responseWrapper = responses[0].response as {
      response: {
        success: boolean;
        normalizedChord: string;
        inventory: string[];
        recommendation: { recommendedChord: string | null };
      };
    };
    const response = responseWrapper.response;

    // 4. Verify
    // Response should contain: success, inventory, playableSongs, recommendation
    assertEquals(response.success, true);
    assertEquals(response.normalizedChord, "C");

    // Inventory should have C
    assertEquals(response.inventory.includes("C"), true);

    // Recommendation should suggest something
    if (response.recommendation && response.recommendation.recommendedChord) {
      console.log(
        "Recommended chord:",
        response.recommendation.recommendedChord,
      );
      // We accept any recommendation as valid for this integration test
      // since the DB has many songs influencing the algorithm.
      assertEquals(typeof response.recommendation.recommendedChord, "string");
    } else {
      console.log("No recommendation returned.");
    }
  },
);
