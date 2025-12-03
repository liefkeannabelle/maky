import { actions, Frames, Sync } from "@engine";
import { JamSession, Requesting, Sessioning } from "@concepts";

// --- Get Jam Sessions for Group (Authenticated) ---

/**
 * Handles an authenticated request to get all jam sessions for a group.
 */
export const HandleGetJamSessionsForGroup: Sync = (
  { request, sessionId, group, user, session, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamSession/_getJamSessionsForGroup", sessionId, group },
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

    // Query for all sessions for the group
    frames = await frames.query(
      JamSession._getJamSessionsForGroup,
      { group },
      { session },
    );

    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
      });
    }

    return frames.collectAs([session], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Get Jam Session by ID (Authenticated) ---

/**
 * Handles an authenticated request to get a specific jam session's details.
 */
export const HandleGetJamSessionById: Sync = (
  { request, sessionId, session: sessionIdParam, user, sessionData, results },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/JamSession/_getJamSessionById",
      sessionId,
      session: sessionIdParam,
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

    // Query for the specific session
    frames = await frames.query(
      JamSession._getJamSessionById,
      { session: sessionIdParam },
      { sessionData },
    );

    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
      });
    }

    return frames.collectAs([sessionData], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Get Active Session for Group (Authenticated) ---

/**
 * Handles an authenticated request to get the active jam session for a group.
 */
export const HandleGetActiveSessionForGroup: Sync = (
  { request, sessionId, group, user, session, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamSession/_getActiveSessionForGroup", sessionId, group },
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

    // Query for the active session for the group
    frames = await frames.query(
      JamSession._getActiveSessionForGroup,
      { group },
      { session },
    );

    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
      });
    }

    return frames.collectAs([session], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

