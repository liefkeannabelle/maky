import { actions, Frames, Sync } from "@engine";
import { ChordLibrary, Requesting, Sessioning, Song, SongLibrary } from "@concepts";
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
      const knownChordsList = knownChordsObjs.map((c) => c.chord);

      // 3. Get Playable Songs
      const playableSongsObjs = await Song._getPlayableSongs({
        knownChords: knownChordsList,
      });
      const formattedSongs = playableSongsObjs.map((s) => ({
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

/**
 * Sync: HandleGetSongsInProgress
 * HTTP: GET /songs/in-progress?sessionId=<id>
 */
export const HandleGetSongsInProgress: Sync = (
  { request, sessionId, user, songs },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/SongLibrary/_getSongsInProgress", sessionId },
      { request },
    ],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });
    const newFrames = [];
    for (const frame of frames) {
      const currentUser = frame[user] as ID;
      const result = await SongLibrary._getSongsInProgress({ user: currentUser });
      newFrames.push({ ...frame, [songs]: result });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, songs }],
  ),
});
