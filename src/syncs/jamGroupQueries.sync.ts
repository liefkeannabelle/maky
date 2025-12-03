import { actions, Frames, Sync } from "@engine";
import {
  ChordLibrary,
  JamGroup,
  Requesting,
  Sessioning,
  Song,
} from "@concepts";
import { ID } from "@utils/types.ts";

// Helpers to wrap concept queries with structured outputs so sync bindings receive data.
const wrapGetJamGroupsForUser = async (
  { user }: { user: ID },
): Promise<Array<{ group: unknown }>> => {
  const groups = await JamGroup._getJamGroupsForUser({ user });
  return groups.map((group) => ({ group }));
};

const wrapGetJamGroupById = async (
  { group }: { group: ID },
): Promise<Array<{ groupData: unknown }>> => {
  const groups = await JamGroup._getJamGroupById({ group });
  return groups.map((groupData) => ({ groupData }));
};

// --- Get Jam Groups for User (Authenticated) ---

/**
 * Handles an authenticated request to get all jam groups for a user.
 */
export const HandleGetJamGroupsForUser: Sync = (
  { request, sessionId, user, group, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamGroup/_getJamGroupsForUser", sessionId },
    { request },
  ]),
  where: async (frames: Frames) => {
    const originalFrame = frames[0];

    // Authenticate the session
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });

    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
      });
    }

    // Query for all groups where user is a member
    frames = await frames.query(wrapGetJamGroupsForUser, { user }, {
      group,
    });

    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
      });
    }

    return frames.collectAs([group], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Get Jam Group by ID (Authenticated) ---

/**
 * Handles an authenticated request to get a specific jam group's details.
 */
export const HandleGetJamGroupById: Sync = (
  { request, sessionId, group: groupId, user, groupData, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamGroup/_getJamGroupById", sessionId, group: groupId },
    { request },
  ]),
  where: async (frames: Frames) => {
    const originalFrame = frames[0];

    // Authenticate the session
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });

    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
      });
    }

    // Query for the specific group
    frames = await frames.query(
      wrapGetJamGroupById,
      { group: groupId },
      { groupData },
    );

    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
      });
    }

    return frames.collectAs([groupData], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Get Common Chords for Group (Authenticated) ---

/**
 * Handles an authenticated request to get common chords for a jam group.
 * Returns the intersection of all members' known chords.
 */
export const HandleGetCommonChordsForGroup: Sync = (
  {
    request,
    sessionId,
    group: groupId,
    user,
    groupData,
    member,
    memberChords,
    commonChords,
  },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamGroup/_getCommonChordsForGroup", sessionId, group: groupId },
    { request },
  ]),
  where: async (frames: Frames) => {
    const originalFrame = frames[0];

    // Authenticate the session
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });

    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        [commonChords]: [],
      });
    }

    // Get the group details to access members
    frames = await frames.query(
      wrapGetJamGroupById,
      { group: groupId },
      { groupData },
    );

    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        [commonChords]: [],
      });
    }

    // Extract members array from the group
    const frame = frames[0];
    const group = frame[groupData] as { members: ID[] } | undefined;
    if (!group || !group.members || group.members.length === 0) {
      return new Frames({
        ...originalFrame,
        [commonChords]: [],
      });
    }

    // Get chords for each member
    const allMemberChords: Set<string>[] = [];
    for (const memberId of group.members) {
      const memberFrames = new Frames({
        ...originalFrame,
        [member]: memberId,
      });
      const chordFrames = await memberFrames.query(
        ChordLibrary._getKnownChords,
        { user: member },
        { chord: memberChords },
      );

      const chordSet = new Set<string>();
      for (const cf of chordFrames) {
        const chordData = cf[memberChords] as unknown;
        if (
          chordData && typeof chordData === "object" && "chord" in chordData
        ) {
          const chord = (chordData as { chord: string }).chord;
          chordSet.add(chord);
        }
      }
      allMemberChords.push(chordSet);
    }

    // Compute intersection of all members' chords
    if (allMemberChords.length === 0) {
      return new Frames({
        ...originalFrame,
        [commonChords]: [],
      });
    }

    let intersection = allMemberChords[0];
    for (let i = 1; i < allMemberChords.length; i++) {
      intersection = new Set(
        [...intersection].filter((chord) => allMemberChords[i].has(chord)),
      );
    }

    return new Frames({
      ...originalFrame,
      [commonChords]: Array.from(intersection),
    });
  },
  then: actions([Requesting.respond, { request, commonChords }]),
});

// --- Get Playable Songs for Group (Authenticated) ---

/**
 * Handles an authenticated request to get playable songs for a jam group.
 * Returns songs that can be played using the group's common chords.
 */
export const HandleGetPlayableSongsForGroup: Sync = (
  {
    request,
    sessionId,
    group: groupId,
    user,
    groupData,
    member,
    memberChords,
    commonChords,
    song,
    results,
  },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/JamGroup/_getPlayableSongsForGroup",
      sessionId,
      group: groupId,
    },
    { request },
  ]),
  where: async (frames: Frames) => {
    const originalFrame = frames[0];

    // Authenticate the session
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });

    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
      });
    }

    // Get the group details to access members
    frames = await frames.query(
      wrapGetJamGroupById,
      { group: groupId },
      { groupData },
    );

    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
      });
    }

    // Extract members array from the group
    const frame = frames[0];
    const group = frame[groupData] as { members: ID[] } | undefined;
    if (!group || !group.members || group.members.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
      });
    }

    // Get chords for each member
    const allMemberChords: Set<string>[] = [];
    for (const memberId of group.members) {
      const memberFrames = new Frames({
        ...originalFrame,
        [member]: memberId,
      });
      const chordFrames = await memberFrames.query(
        ChordLibrary._getKnownChords,
        { user: member },
        { chord: memberChords },
      );

      const chordSet = new Set<string>();
      for (const cf of chordFrames) {
        const chordData = cf[memberChords] as unknown;
        if (
          chordData && typeof chordData === "object" && "chord" in chordData
        ) {
          const chord = (chordData as { chord: string }).chord;
          chordSet.add(chord);
        }
      }
      allMemberChords.push(chordSet);
    }

    // Compute intersection of all members' chords
    if (allMemberChords.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
      });
    }

    let intersection = allMemberChords[0];
    for (let i = 1; i < allMemberChords.length; i++) {
      intersection = new Set(
        [...intersection].filter((chord) => allMemberChords[i].has(chord)),
      );
    }

    const commonChordsArray = Array.from(intersection);

    // Query for playable songs using common chords
    const songsFrames = new Frames({
      ...originalFrame,
      [commonChords]: commonChordsArray,
    });

    const playableSongs = await songsFrames.query(
      Song._getPlayableSongs,
      { knownChords: commonChords },
      { song },
    );

    if (playableSongs.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
      });
    }

    return playableSongs.collectAs([song], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});
