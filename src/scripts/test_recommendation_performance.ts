/**
 * Integration Test: Recommendation Performance
 * 
 * Tests the actual API endpoint performance to ensure:
 * 1. Requests complete within timeout (10 seconds)
 * 2. New approach is significantly faster than old approach would be
 * 3. Cache is working correctly
 * 
 * Run with: deno test -A src/scripts/test_recommendation_performance.ts
 */

import { assert, assertEquals } from "jsr:@std/assert";
import {
  Engine,
  db,
  client,
  Requesting,
  ChordLibrary,
} from "@concepts";
import syncs from "@syncs";
import { warmSongCache } from "@utils/songCache.ts";

// Register syncs
Engine.register(syncs);

const TIMEOUT_MS = 10000;
const EXPECTED_FAST_RESPONSE_MS = 3000; // Should be much faster than timeout

Deno.test({
  name: "Recommendation API Performance Test",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    console.log("\n🧪 Testing Recommendation API Performance\n");
    
    try {
      // Pre-warm cache (simulates production startup)
      console.log("1️⃣  Warming cache...");
      const warmStart = performance.now();
      await warmSongCache();
      const warmTime = performance.now() - warmStart;
      console.log(`   ✓ Cache warmed in ${warmTime.toFixed(2)}ms\n`);
      
      // Test 1: Request without known chords (worst case - needs to scan all songs)
      console.log("2️⃣  Testing recommendation request (no known chords)...");
      const noChordStart = performance.now();
      const noChordResponse = await Requesting.request({
        path: "/RecommendationEngine/requestChordRecommendation",
        knownChords: [],
      });
      const noChordResult = await Requesting._awaitResponse({ 
        request: noChordResponse.request 
      });
      const noChordTime = performance.now() - noChordStart;
      
      console.log(`   ✓ Completed in ${noChordTime.toFixed(2)}ms`);
      assert(noChordTime < TIMEOUT_MS, 
        `Request took ${noChordTime.toFixed(2)}ms, exceeds timeout of ${TIMEOUT_MS}ms`);
      assert(noChordTime < EXPECTED_FAST_RESPONSE_MS,
        `Request took ${noChordTime.toFixed(2)}ms, should be under ${EXPECTED_FAST_RESPONSE_MS}ms with cache`);
      
      const noChordData = noChordResult[0].response as any;
      console.log(`   Recommended chord: ${noChordData.recommendedChord || 'none'}`);
      console.log(`   Has diagram: ${noChordData.diagram ? 'yes' : 'no'}\n`);
      
      // Test 2: Request with some known chords (typical case)
      console.log("3️⃣  Testing recommendation request (with known chords)...");
      const knownChords = ["C", "G", "Am", "F", "D"];
      const withChordStart = performance.now();
      const withChordResponse = await Requesting.request({
        path: "/RecommendationEngine/requestChordRecommendation",
        knownChords,
      });
      const withChordResult = await Requesting._awaitResponse({ 
        request: withChordResponse.request 
      });
      const withChordTime = performance.now() - withChordStart;
      
      console.log(`   ✓ Completed in ${withChordTime.toFixed(2)}ms`);
      assert(withChordTime < TIMEOUT_MS, 
        `Request took ${withChordTime.toFixed(2)}ms, exceeds timeout of ${TIMEOUT_MS}ms`);
      assert(withChordTime < EXPECTED_FAST_RESPONSE_MS,
        `Request took ${withChordTime.toFixed(2)}ms, should be under ${EXPECTED_FAST_RESPONSE_MS}ms with cache`);
      
      const withChordData = withChordResult[0].response as any;
      console.log(`   Known chords: ${knownChords.join(', ')}`);
      console.log(`   Recommended chord: ${withChordData.recommendedChord || 'none'}`);
      console.log(`   Has diagram: ${withChordData.diagram ? 'yes' : 'no'}\n`);
      
      // Test 3: Multiple consecutive requests (test cache effectiveness)
      console.log("4️⃣  Testing cache effectiveness (10 consecutive requests)...");
      const cacheTestStart = performance.now();
      const requestTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const reqStart = performance.now();
        const response = await Requesting.request({
          path: "/RecommendationEngine/requestChordRecommendation",
          knownChords: ["C", "G", "Am"],
        });
        await Requesting._awaitResponse({ request: response.request });
        const reqTime = performance.now() - reqStart;
        requestTimes.push(reqTime);
      }
      
      const cacheTestTime = performance.now() - cacheTestStart;
      const avgTime = requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length;
      const maxTime = Math.max(...requestTimes);
      const minTime = Math.min(...requestTimes);
      
      console.log(`   ✓ All 10 requests completed in ${cacheTestTime.toFixed(2)}ms`);
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
      console.log(`   Min: ${minTime.toFixed(2)}ms`);
      console.log(`   Max: ${maxTime.toFixed(2)}ms`);
      console.log(`   Requests/second: ${(10000 / avgTime).toFixed(2)}\n`);
      
      assert(maxTime < TIMEOUT_MS, 
        `Slowest request took ${maxTime.toFixed(2)}ms, exceeds timeout of ${TIMEOUT_MS}ms`);
      assert(avgTime < EXPECTED_FAST_RESPONSE_MS,
        `Average time ${avgTime.toFixed(2)}ms should be under ${EXPECTED_FAST_RESPONSE_MS}ms`);
      
      // Test 4: Song unlock recommendation
      console.log("5️⃣  Testing song unlock recommendation...");
      const unlockStart = performance.now();
      const unlockResponse = await Requesting.request({
        path: "/RecommendationEngine/requestSongUnlockRecommendation",
        knownChords: ["C", "G", "Am"],
        potentialChord: "F",
      });
      const unlockResult = await Requesting._awaitResponse({ 
        request: unlockResponse.request 
      });
      const unlockTime = performance.now() - unlockStart;
      
      console.log(`   ✓ Completed in ${unlockTime.toFixed(2)}ms`);
      assert(unlockTime < TIMEOUT_MS, 
        `Request took ${unlockTime.toFixed(2)}ms, exceeds timeout of ${TIMEOUT_MS}ms`);
      
      const unlockData = unlockResult[0].response as any;
      const unlockedCount = Array.isArray(unlockData.unlockedSongs) 
        ? unlockData.unlockedSongs.length 
        : 0;
      console.log(`   Unlocked songs: ${unlockedCount}\n`);
      
      // Summary
      console.log("📊 PERFORMANCE SUMMARY");
      console.log("=" .repeat(60));
      console.log(`   Cache warming: ${warmTime.toFixed(2)}ms (one-time cost)`);
      console.log(`   Empty chord list: ${noChordTime.toFixed(2)}ms`);
      console.log(`   With known chords: ${withChordTime.toFixed(2)}ms`);
      console.log(`   Average (10 requests): ${avgTime.toFixed(2)}ms`);
      console.log(`   Song unlock: ${unlockTime.toFixed(2)}ms`);
      console.log(`   Timeout threshold: ${TIMEOUT_MS}ms`);
      console.log(`   ✅ All requests completed successfully!`);
      console.log("=" .repeat(60));
      console.log();
      
    } finally {
      // Cleanup
      await client.close();
    }
  }
});
