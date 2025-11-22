// file: src/scripts/clearSongs.ts

import { getDb } from "@utils/database.ts";
import SongLibraryConcept from "@concepts/SongLibrary/SongLibraryConcept.ts";

async function main() {
  const [db] = await getDb();
  const songLib = new SongLibraryConcept(db);

  // This is the collection you defined in the concept:
  // const PREFIX = "SongLibrary" + ".";
  // this.songs = this.db.collection(PREFIX + "songs");
  const result = await songLib.songs.deleteMany({});

  console.log(`Cleared songs collection. Deleted ${result.deletedCount} document(s).`);
}

if (import.meta.main) {
  main();
}
