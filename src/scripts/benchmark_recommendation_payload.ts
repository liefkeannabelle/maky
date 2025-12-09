/**
 * Benchmark: Recommendation Request Payload Size
 * 
 * This script compares the payload sizes and serialization times for:
 * 1. OLD WAY: Sending all songs in the request body
 * 2. NEW WAY: Only sending knownChords (backend uses cache)
 * 
 * Run with: deno run -A src/scripts/benchmark_recommendation_payload.ts
 */

import { Song } from "@concepts";
import "jsr:@std/dotenv/load";

interface SongForRec {
  _id: string;
  title: string;
  artist: string;
  chords: string[];
  difficulty?: number;
  genre?: string;
}

// Simulated known chords (typical user might know 5-15 chords)
const KNOWN_CHORDS = ["C", "G", "Am", "F", "D", "Em", "A", "E", "Dm", "Bm"];

async function fetchAllSongsFromDB(): Promise<SongForRec[]> {
  console.log("📊 Fetching all songs from database...");
  const songs = await Song._getAllSongsForRecommendation({});
  console.log(`   Found ${songs.length} songs in database\n`);
  return songs as unknown as SongForRec[];
}

function measurePayloadSize(payload: unknown): number {
  const json = JSON.stringify(payload);
  return Buffer.from(json).length;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)} µs`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

async function benchmarkOldWay(songs: SongForRec[]) {
  console.log("🔴 OLD WAY: Sending all songs in request body");
  console.log("=" .repeat(60));
  
  const payload = {
    knownChords: KNOWN_CHORDS,
    allSongs: songs,
  };
  
  // Measure serialization time
  const serializeStart = performance.now();
  const json = JSON.stringify(payload);
  const serializeTime = performance.now() - serializeStart;
  
  // Measure deserialization time
  const deserializeStart = performance.now();
  JSON.parse(json);
  const deserializeTime = performance.now() - deserializeStart;
  
  const payloadSize = Buffer.from(json).length;
  
  console.log(`   Payload size: ${formatBytes(payloadSize)}`);
  console.log(`   Serialization time: ${formatTime(serializeTime)}`);
  console.log(`   Deserialization time: ${formatTime(deserializeTime)}`);
  console.log(`   Total overhead: ${formatTime(serializeTime + deserializeTime)}`);
  console.log(`   Known chords: ${KNOWN_CHORDS.length}`);
  console.log(`   Songs included: ${songs.length}`);
  
  // Estimate network time (assuming 1 Mbps upload/download on slow connection)
  const networkTimeMs = (payloadSize * 8) / (1 * 1024 * 1024) * 1000;
  console.log(`   Estimated network time (1 Mbps): ${formatTime(networkTimeMs)}`);
  console.log(`   Estimated total time: ${formatTime(serializeTime + networkTimeMs + deserializeTime)}`);
  console.log();
  
  return {
    payloadSize,
    serializeTime,
    deserializeTime,
    networkTimeMs,
    total: serializeTime + networkTimeMs + deserializeTime,
  };
}

async function benchmarkNewWay(songs: SongForRec[]) {
  console.log("🟢 NEW WAY: Only sending knownChords (backend uses cache)");
  console.log("=" .repeat(60));
  
  const payload = {
    knownChords: KNOWN_CHORDS,
  };
  
  // Measure serialization time
  const serializeStart = performance.now();
  const json = JSON.stringify(payload);
  const serializeTime = performance.now() - serializeStart;
  
  // Measure deserialization time
  const deserializeStart = performance.now();
  JSON.parse(json);
  const deserializeTime = performance.now() - deserializeStart;
  
  const payloadSize = Buffer.from(json).length;
  
  console.log(`   Payload size: ${formatBytes(payloadSize)}`);
  console.log(`   Serialization time: ${formatTime(serializeTime)}`);
  console.log(`   Deserialization time: ${formatTime(deserializeTime)}`);
  console.log(`   Total overhead: ${formatTime(serializeTime + deserializeTime)}`);
  console.log(`   Known chords: ${KNOWN_CHORDS.length}`);
  console.log(`   Songs included: 0 (backend cache handles this)`);
  
  // Estimate network time
  const networkTimeMs = (payloadSize * 8) / (1 * 1024 * 1024) * 1000;
  console.log(`   Estimated network time (1 Mbps): ${formatTime(networkTimeMs)}`);
  console.log(`   Estimated total time: ${formatTime(serializeTime + networkTimeMs + deserializeTime)}`);
  console.log();
  
  return {
    payloadSize,
    serializeTime,
    deserializeTime,
    networkTimeMs,
    total: serializeTime + networkTimeMs + deserializeTime,
  };
}

function printComparison(oldWay: any, newWay: any) {
  console.log("📊 COMPARISON");
  console.log("=" .repeat(60));
  
  const sizeDiff = oldWay.payloadSize - newWay.payloadSize;
  const sizeReduction = (sizeDiff / oldWay.payloadSize) * 100;
  console.log(`   Payload size reduction: ${formatBytes(sizeDiff)} (${sizeReduction.toFixed(1)}%)`);
  
  const timeDiff = oldWay.total - newWay.total;
  const timeReduction = (timeDiff / oldWay.total) * 100;
  console.log(`   Time saved: ${formatTime(timeDiff)} (${timeReduction.toFixed(1)}% faster)`);
  
  const speedup = oldWay.total / newWay.total;
  console.log(`   Speedup: ${speedup.toFixed(1)}x faster`);
  
  console.log();
  console.log("   Network bandwidth saved per request: " + formatBytes(sizeDiff));
  console.log("   For 1000 requests: " + formatBytes(sizeDiff * 1000));
  console.log("   For 10000 requests: " + formatBytes(sizeDiff * 10000));
  console.log();
  
  // Check if it would timeout
  const TIMEOUT_MS = 10000;
  console.log(`   Timeout threshold: ${TIMEOUT_MS}ms`);
  console.log(`   Old way total time: ${formatTime(oldWay.total)}`);
  console.log(`   New way total time: ${formatTime(newWay.total)}`);
  
  if (oldWay.total > TIMEOUT_MS) {
    console.log(`   ⚠️  OLD WAY EXCEEDS TIMEOUT! Would fail in production.`);
  } else {
    console.log(`   ✓ Old way within timeout (but slow)`);
  }
  
  if (newWay.total > TIMEOUT_MS) {
    console.log(`   ⚠️  NEW WAY EXCEEDS TIMEOUT! Something is wrong.`);
  } else {
    console.log(`   ✓ New way within timeout`);
  }
  console.log();
}

async function runBenchmark() {
  console.log("\n");
  console.log("🚀 RECOMMENDATION REQUEST PAYLOAD BENCHMARK");
  console.log("=" .repeat(60));
  console.log("Testing the impact of sending allSongs vs using backend cache");
  console.log("=" .repeat(60));
  console.log();
  
  try {
    const songs = await fetchAllSongsFromDB();
    
    if (songs.length === 0) {
      console.error("❌ No songs found in database. Please seed the database first.");
      Deno.exit(1);
    }
    
    const oldWay = await benchmarkOldWay(songs);
    const newWay = await benchmarkNewWay(songs);
    printComparison(oldWay, newWay);
    
    console.log("✅ Benchmark complete!");
    console.log();
    
  } catch (error) {
    console.error("❌ Benchmark failed:", error);
    Deno.exit(1);
  }
}

// Run the benchmark
runBenchmark();
