// file: src/scripts/clearSongs.ts

import { getDb } from "@utils/database.ts";

async function main() {
  console.log("Connecting to database...");
  const [db] = await getDb();
  
  // We need to clear the "Song.songs" collection where the actual song data lives.
  // (SongLibrary.songs tracks user progress, Song.songs tracks the catalog)
  
  const songCollection = db.collection("Song.songs");
  console.log(`Clearing all entries from 'Song.songs'...`);
  
  try {
    const result = await songCollection.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} songs from the catalog.`);
  } catch (error) {
    console.error("❌ Error clearing songs:", error);
  }
}

if (import.meta.main) {
  main();
}
