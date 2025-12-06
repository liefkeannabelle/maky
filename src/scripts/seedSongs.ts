// file: src/scripts/seedSongs.ts

import curatedSongsData from "../../data/songs.json" with { type: "json" };
import chordonomiconSongsData from "../../data/chordonomicon_songs.json" with {
  type: "json",
};

import { getDb } from "@utils/database.ts";
import SongConcept, {
  Song,
} from "@concepts/Song/SongConcept.ts";

/**
 * Shape of each entry in our song JSON files.
 * Supports both curated_songs and chordonomicon_songs.
 */
type RawSong = {
  id: string;
  title: string;
  artist: string;
  genre?: string | null;  // Primary genre from Spotify
  key?: string | null;
  tempo?: number | null;
  chords: string[];
  simplifiedChords?: string[];
  sections?: Song["sections"];
  difficulty?: number;
  tags?: string[];
  source?: string;
  // Spotify metadata
  previewUrl?: string | null;   // 30s audio preview (may be null)
  albumArtUrl?: string | null;  // Album cover image
};

async function main() {
  const curated = curatedSongsData as RawSong[];
  const chordonomicon = chordonomiconSongsData as RawSong[];

  const rawSongs: RawSong[] = [...curated, ...chordonomicon];

  // Use the real DB, not testDb
  const [db /*, client*/] = await getDb();

  const songConcept = new SongConcept(db);

  console.log(`Seeding ${rawSongs.length} songs into Song...`);

  let seeded = 0;
  let skipped_invalid = 0;

  for (const [idx, s] of rawSongs.entries()) {
    console.log(`[debug] rawSongs[${idx}].id =`, s.id);

    // Filter out placeholder songs
    // if (s.title.startsWith("Chordonomicon Song") || 
    //     s.artist.startsWith("Artist ") || 
    //     s.artist === "Unknown Artist" ||
    //     s.artist.includes("Unknown")) {
    //   console.log(`[${idx}] Skipping invalid metadata: "${s.title}" – ${s.artist}`);
    //   skipped_invalid++;
    //   continue;
    // }

    try {
      await songConcept.createSong({
        id: s.id,
        title: s.title,
        artist: s.artist ?? "Unknown",
        chords: s.chords,
        // Use genre from JSON if available, otherwise undefined
        genre: s.genre ?? undefined,
        key: s.key ?? undefined,
        tempo: s.tempo ?? undefined,
        simplifiedChords: s.simplifiedChords,
        sections: s.sections,
        difficulty: s.difficulty,
        tags: s.tags,
        source: s.source ?? "curated",
        // Spotify metadata
        previewUrl: s.previewUrl ?? undefined,
        albumArtUrl: s.albumArtUrl ?? undefined,
      });

      console.log(
        `[${idx}] Seeded: "${s.title}" – ${s.artist} [source: ${
          s.source ?? "curated"
        }]`,
      );
      seeded++;
    } catch (err) {
      // SongConcept throws this on duplicates:
      // "Song already exists"
      if (err instanceof Error && err.message.includes("Song already exists")) {
        console.log(`Skipping duplicate: "${s.title}" – ${s.artist}`);
      } else {
        console.error(`Error seeding "${s.title}" – ${s.artist}:`, err);
      }
    }
  }

  console.log(`Done seeding songs. Seeded: ${seeded}, Skipped invalid: ${skipped_invalid}`);
  // If getDb() returns a client, you can close it here if you want:
  // await client.close();
}

if (import.meta.main) {
  main();
}
