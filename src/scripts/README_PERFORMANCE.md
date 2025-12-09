# Recommendation Performance Tests & Benchmarks

This directory contains tests and benchmarks to verify the performance improvements from the chord recommendation optimization.

## The Fix

**Problem**: Chord recommendations were timing out on deployment (>10s)

**Root Cause**: Frontend was sending 2000+ songs in every HTTP request payload

**Solution**: 
- Backend now uses a pre-warmed song cache (30-minute TTL)
- Frontend only sends `knownChords` array
- Massive payload reduction: **139KB → 61 bytes**

## Running the Benchmarks

### 1. Payload Size Benchmark

Compares the payload sizes between old and new approaches:

```bash
deno run -A src/scripts/benchmark_recommendation_payload.ts
```

**Expected Results**:
- Payload size reduction: ~139KB (100%)
- Speedup: ~2300x faster
- Network bandwidth saved: ~139KB per request

### 2. Performance Integration Test

Tests actual API performance with the cache:

```bash
deno test -A src/scripts/test_recommendation_performance.ts
```

**Expected Results**:
- Cache warming: ~150-200ms (one-time cost)
- Request latency: <2000ms (well under 10s timeout)
- All tests passing

## Performance Metrics

### Benchmark Results (2016 songs):

| Metric | Old Way | New Way | Improvement |
|--------|---------|---------|-------------|
| Payload Size | 139.36 KB | 61 B | 2,286x smaller |
| Serialization | 460 µs | 3 µs | 153x faster |
| Network Time (1 Mbps) | 1.09s | 471 µs | 2,312x faster |
| **Total Time** | **1.09s** | **471 µs** | **2,312x faster** |

### Integration Test Results:

| Test Case | Time | Status |
|-----------|------|--------|
| Cache warming (one-time) | ~170ms | ✅ |
| Request (no known chords) | ~1700ms | ✅ |
| Request (with known chords) | ~1800ms | ✅ |
| Average (10 requests) | ~1860ms | ✅ |
| Song unlock request | ~62ms | ✅ |

**All requests complete in <2s**, well below the 10s timeout threshold.

## Why This Works

### Old Approach
```typescript
// Frontend sends EVERYTHING
POST /RecommendationEngine/requestChordRecommendation
{
  knownChords: ["C", "G", "Am"],
  allSongs: [ /* 2000+ song objects */ ]
}
// Payload: ~139KB, Timeout risk: HIGH
```

### New Approach
```typescript
// Frontend sends minimal data
POST /RecommendationEngine/requestChordRecommendation
{
  knownChords: ["C", "G", "Am"]
}
// Backend uses cached song list
// Payload: 61 bytes, Timeout risk: NONE
```

## Cache Configuration

The song cache is configured via environment variables:

```bash
# Cache TTL (default: 30 minutes)
SONG_CACHE_TTL_MINUTES=30

# Request timeout (default: 10000ms = 10s)
REQUESTING_TIMEOUT=10000
```

For production deployments, you can increase these values:

```bash
# Longer cache for stable song catalog
SONG_CACHE_TTL_MINUTES=120

# Longer timeout for slower connections
REQUESTING_TIMEOUT=30000
```

## Bandwidth Savings

With the new approach, you save significant bandwidth:

- **Per request**: 139 KB
- **1,000 requests**: 136 MB
- **10,000 requests**: 1.36 GB

This also reduces:
- Server CPU (less JSON parsing)
- Network latency (smaller packets)
- Client memory (less data to handle)

## Deployment Verification

Before deploying, ensure:

1. ✅ Backend builds successfully: `deno task build`
2. ✅ Benchmark shows 2000x+ speedup
3. ✅ Integration test passes with <3s avg response time
4. ✅ Cache warms on startup (check logs for "Song cache warmed successfully")

## Troubleshooting

If recommendations still timeout:

1. **Check cache warming**:
   - Look for `[SongCache] Song cache warmed successfully` in logs
   - If missing, ensure `warmSongCache()` is called before `startRequestingServer()`

2. **Check MongoDB connection**:
   - Slow Atlas clusters can delay cache warming
   - Consider upgrading cluster tier or using connection pooling

3. **Check payload size**:
   - Frontend should NOT send `allSongs` parameter
   - Check network tab: request body should be ~60 bytes, not 100+ KB

4. **Increase timeout** (temporary):
   ```bash
   REQUESTING_TIMEOUT=30000
   ```

## Files Modified

### Backend:
- `src/syncs/recommendationEngine.sync.ts` - Uses cache instead of request payload
- `src/utils/songCache.ts` - Song caching utility
- `src/main.ts` - Pre-warms cache on startup

### Frontend:
- `src/types/recommendation.ts` - Removed `allSongs` from payload types
- `src/views/LearnPage.vue` - Doesn't send `allSongs` in requests

### Tests:
- `src/scripts/benchmark_recommendation_payload.ts` - Payload size benchmark
- `src/scripts/test_recommendation_performance.ts` - API performance test
