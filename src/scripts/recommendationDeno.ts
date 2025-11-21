// file: src/scripts/recommendationDeno.ts

import { getDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";

import ChordLibraryConcept from "@concepts/ChordLibrary/ChordLibraryConcept.ts";
import SongLibraryConcept from "@concepts/SongLibrary/SongLibraryConcept.ts";
import RecommendationEngineConcept, {
  SongInput,
} from "@concepts/RecommendationEngine/RecommendationEngineConcept.ts";

async function main() {
  const [db] = await getDb();

  const chordLib = new ChordLibraryConcept(db);
  const songLib = new SongLibraryConcept(db);
  const recEngine = new RecommendationEngineConcept(db);

  const user = "user:demo" as ID;

  // --- 0) Reset demo user in ChordLibrary so we get a clean slate each run ---

  try {
    await chordLib.removeUser({ user });
  } catch {
    // ignore if user didn't exist yet
  }

  // (Optional) also reset in SongLibrary if needed
  try {
    await songLib.removeUser({ user });
  } catch {
    // ignore if user didn't exist yet
  }

  // --- 1) Ensure user exists in both concepts ---

  await chordLib.addUser({ user });
  await songLib.addUser({ user });

  // --- 2) Give the user some known chords in ChordLibrary ---

  // Change this array to experiment with different starting skillsets
  const starterChords = ["D", "A"];

  for (const chord of starterChords) {
    await chordLib.addChordToInventory({
      user,
      chord,              // correct param name
      mastery: "mastered",
    });
  }

  // Fetch known chords correctly and filter out any null/empty values
  const knownRecords = await chordLib._getKnownChords({ user });
  const knownChords = knownRecords
    .map((k) => k.chord)
    .filter((c): c is string => c != null && c !== "");

  console.log("Known chords for demo user:", knownChords);

  // --- 3) Fetch all songs from SongLibrary correctly ---

  const allSongRecords = await songLib._getAllSongs({});
  const allSongs = allSongRecords.map((r) => r.song);

  console.log(`Total songs in library: ${allSongs.length}`);

  if (allSongs.length === 0) {
    console.warn("No songs found in library. Did you run seedSongs.ts?");
    return;
  }

  // Map Song[] -> SongInput[] for RecommendationEngine
  const songInputs: SongInput[] = allSongs.map((s) => ({
    _id: s._id,
    chords: s.chords,
    difficulty: s.difficulty,
  }));

  // --- 4) Ask RecommendationEngine for a recommendation ---

  const result = await recEngine.calculateRecommendation({
    user,
    knownChords,
    allSongs: songInputs,
  });

  if (result.recommendationId === ("none" as ID)) {
    console.log(
      "No recommendation available (user already effectively unlocks all songs).",
    );
    return;
  }

  const [rec] = await recEngine._getRecommendation({
    recommendationId: result.recommendationId,
  });

  if (!rec) {
    console.error("Failed to fetch stored recommendation.");
    return;
  }

  console.log("=== Recommendation Result ===");
  console.log("User:", rec.user);
  console.log("Recommended chord:", rec.recommendedChord);
  console.log("Unlocked song IDs:", rec.unlockedSongs);
}

if (import.meta.main) {
  main();
}
