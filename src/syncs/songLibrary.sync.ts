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

// --- SongLibrary Actions ---

export const HandleStartLearningSong: Sync = ({ request, sessionId, song, mastery, user }) => ({
  when: actions(
    [Requesting.request, { path: "/SongLibrary/startLearningSong", sessionId, song, mastery }, { request }]
  ),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions(
    [SongLibrary.startLearningSong, { user, song, mastery }]
  )
});

export const RespondToStartLearningSong: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SongLibrary/startLearningSong" }, { request }],
    [SongLibrary.startLearningSong, {}, { error }]
  ),
  then: actions(
    [Requesting.respond, { request, error }]
  )
});

export const RespondToStartLearningSongSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SongLibrary/startLearningSong" }, { request }],
    [SongLibrary.startLearningSong, {}, {}]
  ),
  then: actions(
    [Requesting.respond, { request, success: true }]
  )
});

export const HandleUpdateSongMastery: Sync = ({ request, sessionId, song, newMastery, user }) => ({
  when: actions(
    [Requesting.request, { path: "/SongLibrary/updateSongMastery", sessionId, song, newMastery }, { request }]
  ),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions(
    [SongLibrary.updateSongMastery, { user, song, newMastery }]
  )
});

export const RespondToUpdateSongMastery: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SongLibrary/updateSongMastery" }, { request }],
    [SongLibrary.updateSongMastery, {}, { error }]
  ),
  then: actions(
    [Requesting.respond, { request, error }]
  )
});

export const RespondToUpdateSongMasterySuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SongLibrary/updateSongMastery" }, { request }],
    [SongLibrary.updateSongMastery, {}, {}]
  ),
  then: actions(
    [Requesting.respond, { request, success: true }]
  )
});

export const HandleStopLearningSong: Sync = ({ request, sessionId, song, user }) => ({
  when: actions(
    [Requesting.request, { path: "/SongLibrary/stopLearningSong", sessionId, song }, { request }]
  ),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions(
    [SongLibrary.stopLearningSong, { user, song }]
  )
});

export const RespondToStopLearningSong: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SongLibrary/stopLearningSong" }, { request }],
    [SongLibrary.stopLearningSong, {}, { error }]
  ),
  then: actions(
    [Requesting.respond, { request, error }]
  )
});

export const RespondToStopLearningSongSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SongLibrary/stopLearningSong" }, { request }],
    [SongLibrary.stopLearningSong, {}, {}]
  ),
  then: actions(
    [Requesting.respond, { request, success: true }]
  )
});

// --- Song Queries ---

export const HandleGetPlayableSongs: Sync = ({ request, sessionId, user, songs }) => ({
  when: actions(
    [Requesting.request, { path: "/Song/_getPlayableSongs", sessionId }, { request }]
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });
    const newFrames = [];
    for (const frame of frames) {
      const currentUser = frame[user] as ID;
      const knownChordsObjs = await ChordLibrary._getKnownChords({ user: currentUser });
      const knownChordsList = knownChordsObjs.map((c) => c.chord);
      const result = await Song._getPlayableSongs({ knownChords: knownChordsList });
      newFrames.push({ ...frame, [songs]: result });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, songs }]
  )
});

export const HandleFilterSongsByGenre: Sync = ({ request, genre, songs }) => ({
  when: actions(
    [Requesting.request, { path: "/Song/_filterSongsByGenre", genre }, { request }]
  ),
  where: async (frames) => {
    const newFrames = [];
    for (const frame of frames) {
      const result = await Song._filterSongsByGenre({ genre: frame[genre] as string });
      newFrames.push({ ...frame, [songs]: result });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, songs }]
  )
});

export const HandleGetAllSongs: Sync = ({ request, songs }) => ({
  when: actions(
    [Requesting.request, { path: "/Song/_getAllSongs" }, { request }]
  ),
  where: async (frames) => {
    const newFrames = [];
    for (const frame of frames) {
      const result = await Song._getAllSongs({});
      newFrames.push({ ...frame, [songs]: result });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, songs }]
  )
});

export const HandleSearchSongs: Sync = ({ request, query, songs }) => ({
  when: actions(
    [Requesting.request, { path: "/Song/_searchByTitleOrArtist", query }, { request }]
  ),
  where: async (frames) => {
    const newFrames = [];
    for (const frame of frames) {
      const result = await Song._searchByTitleOrArtist({ query: frame[query] as string });
      newFrames.push({ ...frame, [songs]: result });
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [Requesting.respond, { request, songs }]
  )
});
