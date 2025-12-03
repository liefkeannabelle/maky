import { actions, Sync } from "@engine";
import { JamSession, Requesting, Sessioning } from "@concepts";

// --- Schedule JamSession (Authenticated) ---

/**
 * Handles an authenticated request to schedule a jam session.
 */
export const HandleScheduleJamSession: Sync = (
  { request, sessionId, group, startTime, creator },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamSession/scheduleJamSession", sessionId, group, startTime },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId }, { user: creator }),
  then: actions([JamSession.scheduleJamSession, { group, startTime }]),
});

/**
 * Responds to a successful session scheduling.
 */
export const RespondToScheduleSessionSuccess: Sync = (
  { request, session },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/JamSession/scheduleJamSession" },
      { request },
    ],
    [JamSession.scheduleJamSession, {}, { session }],
  ),
  then: actions([Requesting.respond, { request, session }]),
});

/**
 * Responds to a failed session scheduling.
 */
export const RespondToScheduleSessionError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/JamSession/scheduleJamSession" },
      { request },
    ],
    [JamSession.scheduleJamSession, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Start JamSession (Authenticated) ---

/**
 * Handles an authenticated request to start a jam session.
 */
export const HandleStartJamSession: Sync = (
  { request, sessionId, group, creator },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamSession/startJamSession", sessionId, group },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId }, { user: creator }),
  then: actions([JamSession.startJamSession, { group, creator }]),
});

/**
 * Responds to a successful session start.
 */
export const RespondToStartSessionSuccess: Sync = ({ request, session }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/JamSession/startJamSession" },
      { request },
    ],
    [JamSession.startJamSession, {}, { session }],
  ),
  then: actions([Requesting.respond, { request, session }]),
});

/**
 * Responds to a failed session start.
 */
export const RespondToStartSessionError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/JamSession/startJamSession" },
      { request },
    ],
    [JamSession.startJamSession, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Join JamSession (Authenticated) ---

/**
 * Handles an authenticated request to join a jam session.
 */
export const HandleJoinSession: Sync = (
  { request, sessionId, session, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamSession/joinSession", sessionId, session },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([JamSession.joinSession, { session, user }]),
});

/**
 * Responds to a successful session join.
 */
export const RespondToJoinSessionSuccess: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/JamSession/joinSession" }, { request }],
    [JamSession.joinSession, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed session join.
 */
export const RespondToJoinSessionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/JamSession/joinSession" }, { request }],
    [JamSession.joinSession, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Share Song in Session (Authenticated) ---

/**
 * Handles an authenticated request to share a song in a session.
 */
export const HandleShareSongInSession: Sync = (
  { request, sessionId, session, song, currentStatus, participant },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/JamSession/shareSongInSession",
      sessionId,
      session,
      song,
      currentStatus,
    },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId }, { user: participant }),
  then: actions([
    JamSession.shareSongInSession,
    { session, participant, song, currentStatus },
  ]),
});

/**
 * Responds to a successful song share.
 */
export const RespondToShareSongSuccess: Sync = ({ request, success }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/JamSession/shareSongInSession" },
      { request },
    ],
    [JamSession.shareSongInSession, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed song share.
 */
export const RespondToShareSongError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/JamSession/shareSongInSession" },
      { request },
    ],
    [JamSession.shareSongInSession, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Update Shared Song Status (Authenticated) ---

/**
 * Handles an authenticated request to update a shared song's status.
 */
export const HandleUpdateSharedSongStatus: Sync = (
  { request, sessionId, session, song, newStatus, participant },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/JamSession/updateSharedSongStatus",
      sessionId,
      session,
      song,
      newStatus,
    },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId }, { user: participant }),
  then: actions([
    JamSession.updateSharedSongStatus,
    { session, participant, song, newStatus },
  ]),
});

/**
 * Responds to a successful status update.
 */
export const RespondToUpdateStatusSuccess: Sync = ({ request, success }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/JamSession/updateSharedSongStatus" },
      { request },
    ],
    [JamSession.updateSharedSongStatus, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed status update.
 */
export const RespondToUpdateStatusError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/JamSession/updateSharedSongStatus" },
      { request },
    ],
    [JamSession.updateSharedSongStatus, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- End JamSession (Authenticated) ---

/**
 * Handles an authenticated request to end a jam session.
 */
export const HandleEndJamSession: Sync = (
  { request, sessionId, session, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamSession/endJamSession", sessionId, session },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([JamSession.endJamSession, { session }]),
});

/**
 * Responds to a successful session end.
 */
export const RespondToEndSessionSuccess: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/JamSession/endJamSession" }, { request }],
    [JamSession.endJamSession, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed session end.
 */
export const RespondToEndSessionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/JamSession/endJamSession" }, { request }],
    [JamSession.endJamSession, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
