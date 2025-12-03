import { actions, Frames, Sync } from "@engine";
import {
  Friendship,
  JamGroup,
  Requesting,
  Sessioning,
  UserAccount,
} from "@concepts";

// --- Create JamGroup (Authenticated) ---

/**
 * Handles an authenticated request to create a new jam group.
 */
export const HandleCreateJamGroup: Sync = (
  { request, sessionId, name, description, creator },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamGroup/createJamGroup", sessionId, name, description },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId }, { user: creator }),
  then: actions([JamGroup.createJamGroup, { creator, name, description }]),
});

/**
 * Responds to a successful jam group creation.
 */
export const RespondToCreateJamGroupSuccess: Sync = ({ request, group }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/JamGroup/createJamGroup" },
      { request },
    ],
    [JamGroup.createJamGroup, {}, { group }],
  ),
  then: actions([Requesting.respond, { request, group }]),
});

/**
 * Responds to a failed jam group creation.
 */
export const RespondToCreateJamGroupError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/JamGroup/createJamGroup" },
      { request },
    ],
    [JamGroup.createJamGroup, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Add Member to JamGroup (Authenticated with Friendship Check) ---

/**
 * Handles an authenticated request to add a member to a jam group.
 * Enforces that the new member must be friends with the requester and not a kid account.
 */
export const HandleAddMemberToJamGroup: Sync = (
  {
    request,
    sessionId,
    group,
    newMember,
    requester,
    isFriend,
    isKidOrPrivate,
  },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamGroup/addMember", sessionId, group, newMember },
    { request },
  ]),
  where: async (frames: Frames) => {
    // Step 1: Authenticate the session
    frames = await frames.query(Sessioning._getUser, { sessionId }, {
      user: requester,
    });

    // Step 2: Check if requester and newMember are friends
    frames = await frames.query(
      Friendship.areFriends,
      { user1: requester, user2: newMember },
      { isFriend },
    );

    // Filter: only proceed if they are friends
    frames = frames.filter(($) => $[isFriend] === true);

    // Step 3: Check if newMember is a kid or private account
    frames = await frames.query(
      UserAccount._isKidOrPrivateAccount,
      { user: newMember },
      { isKidOrPrivate },
    );

    // Filter: only proceed if NOT a kid or private account
    return frames.filter(($) => $[isKidOrPrivate] === false);
  },
  then: actions([JamGroup.addMember, { group, newMember }]),
});

/**
 * Responds to a successful member addition.
 */
export const RespondToAddMemberSuccess: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/JamGroup/addMember" }, { request }],
    [JamGroup.addMember, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed member addition.
 */
export const RespondToAddMemberError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/JamGroup/addMember" }, { request }],
    [JamGroup.addMember, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Remove User from JamGroup (Authenticated) ---

/**
 * Handles an authenticated request to remove a user from a jam group.
 * The requester must be authenticated.
 */
export const HandleRemoveUserFromJamGroup: Sync = (
  { request, sessionId, group, user, requester },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamGroup/removeUserFromJamGroup", sessionId, group, user },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId }, { user: requester }),
  then: actions([JamGroup.removeUserFromJamGroup, { group, user }]),
});

/**
 * Responds to a successful user removal.
 */
export const RespondToRemoveUserSuccess: Sync = ({ request, success }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/JamGroup/removeUserFromJamGroup" },
      { request },
    ],
    [JamGroup.removeUserFromJamGroup, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed user removal.
 */
export const RespondToRemoveUserError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/JamGroup/removeUserFromJamGroup" },
      { request },
    ],
    [JamGroup.removeUserFromJamGroup, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Disband JamGroup (Authenticated) ---

/**
 * Handles an authenticated request to disband a jam group.
 * Only the creator can disband the group.
 */
export const HandleDisbandJamGroup: Sync = (
  { request, sessionId, group, requester },
) => ({
  when: actions([
    Requesting.request,
    { path: "/JamGroup/disbandJamGroup", sessionId, group },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId }, { user: requester }),
  then: actions([JamGroup.disbandJamGroup, { group, requester }]),
});

/**
 * Responds to a successful group disband.
 */
export const RespondToDisbandSuccess: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/JamGroup/disbandJamGroup" }, { request }],
    [JamGroup.disbandJamGroup, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed group disband.
 */
export const RespondToDisbandError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/JamGroup/disbandJamGroup" }, { request }],
    [JamGroup.disbandJamGroup, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
