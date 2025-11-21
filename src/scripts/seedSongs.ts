// file: src/scripts/seedSongs.ts

import songsData from "../../data/songs.json" with { type: "json" };
import { getDb } from "@utils/database.ts";
import SongLibraryConcept, {
  Song,
} from "@concepts/SongLibrary/SongLibraryConcept.ts";

/**
 * Shape of each entry in data/songs.json.
 * Adjust if your JSON has slightly different field names.
 */
type RawSong = {
  title: string;
  artist: string;
  key?: string;
  tempo?: number;
  chords: string[];
  simplifiedChords?: string[];
  sections?: Song["sections"];
  difficulty?: number;
  tags?: string[];
  source?: string;
};

async function main() {
  const rawSongs = songsData as RawSong[];

  // Use the real DB, not testDb
  const [db /*, client*/] = await getDb();

  const songLibrary = new SongLibraryConcept(db);

  console.log(`Seeding ${rawSongs.length} songs into SongLibrary...`);

  for (const [idx, s] of rawSongs.entries()) {
    try {
      await songLibrary.addSong({
        title: s.title,
        artist: s.artist ?? "Unknown",
        chords: s.chords,
        // genre is optional; you can derive it from tags if you want
        genre: undefined,
        key: s.key,
        tempo: s.tempo,
        simplifiedChords: s.simplifiedChords,
        sections: s.sections,
        difficulty: s.difficulty,
        tags: s.tags,
        source: s.source ?? "curated",
      });

      console.log(
        `[${idx}] Seeded: "${s.title}" – ${s.artist}`,
      );
    } catch (err) {
      // SongLibraryConcept throws this on duplicates:
      // "Song already exists in SongLibrary"
      if (err instanceof Error && err.message.includes("Song already exists")) {
        console.log(`Skipping duplicate: "${s.title}" – ${s.artist}`);
      } else {
        console.error(`Error seeding "${s.title}" – ${s.artist}:`, err);
      }
    }
  }

  console.log("Done seeding songs.");
  // If getDb() returns a client, you can close it here if you want:
  // await client.close();
}

if (import.meta.main) {
  main();
}
