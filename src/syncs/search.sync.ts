// import { actions, Sync } from "@engine";
// import {
//   Chord, // Assuming Chord concept is exported from @concepts
//   Requesting,
//   SongLibrary,
//   UserProfile,
// } from "@concepts";

// /**
//  * Handles a global search request from the frontend.
//  * It queries multiple concepts in parallel and aggregates the results.
//  */
// export const HandleGlobalSearchRequest: Sync = (
//   { request, query, results },
// ) => ({
//   // Triggered when a request is made to the `/search` path.
//   when: actions([
//     Requesting.request,
//     { path: "/search", query }, // Captures the search term into the 'query' variable
//     { request },
//   ]),

//   // The 'where' clause performs the data fetching and transformation.
//   where: async (frames) => {
//     // There will only be one frame for this request.
//     const frame = frames[0];
//     const queryString = frame[query] as string;

//     if (!queryString || queryString.trim() === "") {
//       // If the query is empty, return an empty result set immediately.
//       frame[results] = [];
//       return frames;
//     }

//     // Run all search queries in parallel for maximum efficiency.
//     const [userResults, songResults, chordResults] = await Promise.all([
//       UserProfile._searchByDisplayName({ query: queryString }),
//       SongLibrary._searchByTitleOrArtist({ query: queryString }),
//       Chord._searchByName({ query: queryString }),
//     ]);

//     // Format results to include a 'type' field, which is very helpful for the frontend
//     // to render different types of results correctly.
//     const formattedUsers = userResults.map((r) => ({ ...r, type: "user" }));
//     const formattedSongs = songResults.map((r) => ({ ...r, type: "song" }));
//     const formattedChords = chordResults.map((r) => ({ ...r, type: "chord" }));

//     // Combine all results into a single flat array.
//     const combinedResults = [
//       ...formattedUsers,
//       ...formattedSongs,
//       ...formattedChords,
//     ];

//     // Attach the final, combined result set to the frame.
//     frame[results] = combinedResults;
//     return frames;
//   },

//   // The 'then' clause sends the aggregated results back to the client.
//   then: actions([
//     Requesting.respond,
//     { request, results },
//   ]),
// });

import { actions, Sync, Frames } from "@engine";
import { Requesting, Song } from "@concepts";

/**
 * Sync: SearchSongs
 * 
 * Handles song search requests by title or artist.
 * HTTP: GET /songs/search?query=<string>
 */
export const SearchSongs: Sync = ({ request, query, results }) => ({
  when: actions(
    [Requesting.request, { path: "songs/search", query }, { request }]
  ),
  where: async (frames) => {
    const newFrames = [];
    for (const frame of frames) {
      const q = frame[query] as string;
      const songs = await Song._searchByTitleOrArtist({ query: q });
      
      const formattedResults = songs.map(r => ({
          id: r.song._id,
          title: r.song.title,
          artist: r.song.artist,
          source: r.song.source,
          difficulty: r.song.difficulty,
          genre: r.song.genre,
          tags: r.song.tags
      }));

      newFrames.push({
        ...frame,
        [results]: formattedResults
      });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, results }]
  )
});
