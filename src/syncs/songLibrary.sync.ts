import { actions, Frames, Sync } from "@engine";
import { ChordLibrary, Requesting, Sessioning, SongLibrary } from "@concepts";
import { ID } from "@utils/types.ts";

/**
 * Sync: GetPlayableSongs
 * HTTP: GET /songs/playable?sessionId=<id>
 */
export const GetPlayableSongs: Sync = (
  { request, sessionId, user, playableSongs },
) => ({
  when: actions(
    [Requesting.request, { path: "songs/playable", sessionId }, { request }],
  ),
  where: async (frames) => {
    // 1. Resolve User
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });

    const newFrames = [];
    for (const frame of frames) {
      const currentUser = frame[user] as ID;

      // 2. Get Known Chords
      const knownChordsObjs = await ChordLibrary._getKnownChords({
        user: currentUser,
      });
      const knownChordsList = knownChordsObjs.map((c: any) => c.chord);

      // 3. Get Playable Songs
      const playableSongsObjs = await SongLibrary._getPlayableSongs({
        knownChords: knownChordsList,
      });
      const formattedSongs = playableSongsObjs.map((s: any) => ({
        id: s.song._id,
        title: s.song.title,
        artist: s.song.artist,
        source: s.song.source,
        difficulty: s.song.difficulty,
      }));

      newFrames.push({
        ...frame,
        [playableSongs]: formattedSongs,
      });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, playableSongs }],
  ),
});
