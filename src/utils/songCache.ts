/**
 * Song Cache Utility
 * 
 * Caches the songs list to avoid fetching 2000+ songs on every recommendation request.
 * This dramatically improves response times, especially with remote MongoDB (Atlas).
 * 
 * Configure via environment variable:
 *   SONG_CACHE_TTL_MINUTES - cache duration in minutes (default: 30)
 */

import { Song } from "@concepts";
import { ID } from "@utils/types.ts";
import "jsr:@std/dotenv/load";

const SONG_CACHE_TTL_MINUTES = parseInt(
  Deno.env.get("SONG_CACHE_TTL_MINUTES") ?? "30",
  10,
);

export interface SongForRec {
  _id: ID;
  chords: string[];
  difficulty?: number;
}

let cachedSongs: SongForRec[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = SONG_CACHE_TTL_MINUTES * 60 * 1000;

/**
 * Get songs for recommendation, using cache if available.
 */
export async function getCachedSongsForRecommendation(): Promise<SongForRec[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedSongs && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedSongs;
  }
  
  // Fetch fresh data
  console.log("[SongCache] Refreshing song cache...");
  const songs = await Song._getAllSongsForRecommendation({});
  cachedSongs = songs;
  cacheTimestamp = now;
  console.log(`[SongCache] Cached ${songs.length} songs (TTL: ${SONG_CACHE_TTL_MINUTES} minutes)`);
  
  return songs;
}

/**
 * Pre-warm the song cache on server startup.
 * Call this during application initialization to avoid first-request delays.
 */
export async function warmSongCache(): Promise<void> {
  console.log("[SongCache] Pre-warming song cache on startup...");
  try {
    await getCachedSongsForRecommendation();
    console.log("[SongCache] Song cache warmed successfully");
  } catch (error) {
    console.error("[SongCache] Failed to warm song cache:", error);
  }
}

/**
 * Invalidate the song cache (e.g., when songs are added/removed).
 */
export function invalidateSongCache(): void {
  cachedSongs = null;
  cacheTimestamp = 0;
  console.log("[SongCache] Cache invalidated");
}
