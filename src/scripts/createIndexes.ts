// file: src/scripts/createIndexes.ts

import { getDb } from "@utils/database.ts";

async function main() {
  console.log("Connecting to database...");
  const [db] = await getDb();

  console.log("Creating indexes for Song collection...");
  const songCollection = db.collection("Song.songs");
  
  // Index for title/artist searches
  await songCollection.createIndex({ title: "text", artist: "text" });
  console.log("✅ Created text index on title and artist");
  
  // Index for chord filtering (array queries)
  await songCollection.createIndex({ chords: 1 });
  console.log("✅ Created index on chords array");
  
  // Index for genre filtering
  await songCollection.createIndex({ genre: 1 });
  await songCollection.createIndex({ tags: 1 });
  console.log("✅ Created indexes on genre and tags");
  
  // Index for difficulty sorting
  await songCollection.createIndex({ difficulty: 1 });
  console.log("✅ Created index on difficulty");

  // Compound index for common queries
  await songCollection.createIndex({ difficulty: 1, chords: 1 });
  console.log("✅ Created compound index on difficulty + chords");

  console.log("\nAll indexes created successfully!");
  console.log("\nTo verify indexes, run:");
  console.log("  db.getSiblingDB('your-db-name').getCollection('Song.songs').getIndexes()");
}

if (import.meta.main) {
  main();
}
