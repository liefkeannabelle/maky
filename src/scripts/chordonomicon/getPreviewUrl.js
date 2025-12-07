#!/usr/bin/env node
/**
 * Helper script to get preview URL for a single song.
 * Called by the Python build script.
 * 
 * Usage: node getPreviewUrl.js "Song Title" "Artist Name"
 * Output: JSON with previewUrl or null
 */

require('dotenv').config();
const spotifyPreviewFinder = require('spotify-preview-finder');

async function main() {
  const title = process.argv[2];
  const artist = process.argv[3];
  
  if (!title || !artist) {
    console.log(JSON.stringify({ previewUrl: null, error: 'Missing title or artist' }));
    process.exit(0);
  }
  
  try {
    const result = await spotifyPreviewFinder(title, artist, 1);
    
    if (result.success && result.results.length > 0) {
      const match = result.results[0];
      if (match.previewUrls && match.previewUrls.length > 0) {
        console.log(JSON.stringify({ previewUrl: match.previewUrls[0] }));
      } else {
        console.log(JSON.stringify({ previewUrl: null }));
      }
    } else {
      console.log(JSON.stringify({ previewUrl: null }));
    }
  } catch (error) {
    console.log(JSON.stringify({ previewUrl: null, error: error.message }));
  }
}

main();
