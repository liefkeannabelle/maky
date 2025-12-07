#!/usr/bin/env node
/**
 * Enrich chordonomicon_songs.json with preview URLs using spotify-preview-finder.
 * 
 * This script scrapes Spotify web pages to get preview URLs since the API
 * no longer reliably returns them.
 * 
 * Usage:
 *   node src/scripts/enrichPreviewUrls.js
 *   node src/scripts/enrichPreviewUrls.js --limit 100
 *   node src/scripts/enrichPreviewUrls.js --resume
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const spotifyPreviewFinder = require('spotify-preview-finder');

const SONGS_PATH = path.join(__dirname, '../../data/chordonomicon_songs.json');
const DELAY_MS = 500; // Delay between requests to avoid rate limiting

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : Infinity;
  const resume = args.includes('--resume');
  
  // Load songs
  console.log(`[info] Loading songs from ${SONGS_PATH}`);
  const songs = JSON.parse(fs.readFileSync(SONGS_PATH, 'utf-8'));
  console.log(`[info] Loaded ${songs.length} songs`);
  
  let enriched = 0;
  let skipped = 0;
  let failed = 0;
  let alreadyHasPreview = 0;
  
  for (let i = 0; i < songs.length && enriched < limit; i++) {
    const song = songs[i];
    
    // Skip if already has preview URL and we're resuming
    if (resume && song.previewUrl) {
      alreadyHasPreview++;
      continue;
    }
    
    // Skip if title or artist is placeholder
    if (!song.title || !song.artist || 
        song.title.startsWith('Chordonomicon Song') ||
        song.artist.startsWith('Artist ') ||
        song.artist === 'Unknown Artist') {
      skipped++;
      continue;
    }
    
    try {
      console.log(`[${i + 1}/${songs.length}] Searching: "${song.title}" by ${song.artist}`);
      
      const result = await spotifyPreviewFinder(song.title, song.artist, 1);
      
      if (result.success && result.results.length > 0) {
        const match = result.results[0];
        
        if (match.previewUrls && match.previewUrls.length > 0) {
          song.previewUrl = match.previewUrls[0];
          enriched++;
          console.log(`  ✓ Found preview: ${song.previewUrl.substring(0, 60)}...`);
        } else {
          console.log(`  ✗ No preview URL in result`);
          failed++;
        }
      } else {
        console.log(`  ✗ No results found`);
        failed++;
      }
      
      // Save progress every 10 songs
      if (enriched % 10 === 0 && enriched > 0) {
        console.log(`\n[save] Saving progress (${enriched} enriched)...`);
        fs.writeFileSync(SONGS_PATH, JSON.stringify(songs, null, 2));
      }
      
      // Delay to avoid rate limiting
      await sleep(DELAY_MS);
      
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
      failed++;
      
      // Longer delay on error
      await sleep(DELAY_MS * 2);
    }
  }
  
  // Final save
  console.log(`\n[save] Final save...`);
  fs.writeFileSync(SONGS_PATH, JSON.stringify(songs, null, 2));
  
  // Summary
  console.log('\n[summary]');
  console.log(`  Total songs:         ${songs.length}`);
  console.log(`  Already had preview: ${alreadyHasPreview}`);
  console.log(`  Skipped (no meta):   ${skipped}`);
  console.log(`  Successfully enriched: ${enriched}`);
  console.log(`  Failed:              ${failed}`);
  
  const withPreview = songs.filter(s => s.previewUrl).length;
  console.log(`  Songs with preview:  ${withPreview} (${(withPreview/songs.length*100).toFixed(1)}%)`);
}

main().catch(console.error);
