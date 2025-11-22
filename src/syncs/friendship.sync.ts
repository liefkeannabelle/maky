import { actions, Frames, Sync } from "@engine";
import { Friendship, Requesting, Sessioning } from "@concepts";

// --- Send Friend Request (Authenticated) ---

/**
 * Handles a request to send a friend request from the authenticated user to a recipient.
 */
export const HandleSendFriendRequest: Sync = (
  { request, sessionId, recipient, requester },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Friendship/sendFriendRequest", sessionId, recipient },
    { request },
  ]),
  // Authenticate the session and get the user ID, aliasing it as 'requester'.
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, {
      user: requester,
    }),
  then: actions([Friendship.sendFriendRequest, { requester, recipient }]),
});

/**
 * Responds to the original request after a send friend request attempt.
 * This handles both success (returns a `friendship` object) and failure (returns an `error`).
 */
export const RespondToSendFriendRequest: Sync = (
  { request, friendship, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Friendship/sendFriendRequest" },
      { request },
    ],
    // Pattern match on the output of the sendFriendRequest action.
    [Friendship.sendFriendRequest, {}, { friendship, error }],
  ),
  then: actions([Requesting.respond, { request, friendship, error }]),
});

// --- Accept Friend Request (Authenticated) ---

/**
 * Handles a request from the authenticated user to accept a friend request from another user.
 */
export const HandleAcceptFriendRequest: Sync = (
  { request, sessionId, requester, recipient },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Friendship/acceptFriendRequest", sessionId, requester },
    { request },
  ]),
  // Authenticate the session and get the user ID, aliasing it as 'recipient'.
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, {
      user: recipient,
    }),
  then: actions([Friendship.acceptFriendRequest, { requester, recipient }]),
});

/**
 * Responds to the accept friend request attempt.
 * The concept action returns an empty object on success, so we only need to pass through the error on failure.
 */
export const RespondToAcceptFriendRequest: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Friendship/acceptFriendRequest" },
      { request },
    ],
    [Friendship.acceptFriendRequest, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Decline Friend Request (Authenticated) ---

/**
 * Handles a request from the authenticated user to decline a friend request from another user.
 */
export const HandleDeclineFriendRequest: Sync = (
  { request, sessionId, requester, recipient },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Friendship/declineFriendRequest", sessionId, requester },
    { request },
  ]),
  // Authenticate the session and get the user ID, aliasing it as 'recipient'.
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, {
      user: recipient,
    }),
  then: actions([Friendship.declineFriendRequest, { requester, recipient }]),
});

/**
 * Responds to the decline friend request attempt.
 */
export const RespondToDeclineFriendRequest: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Friendship/declineFriendRequest" },
      { request },
    ],
    [Friendship.declineFriendRequest, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Remove Friend (Authenticated) ---

/**
 * Handles a request from the authenticated user to remove a friendship with another user.
 */
export const HandleRemoveFriendRequest: Sync = (
  { request, sessionId, otherUser, user1 },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Friendship/removeFriend", sessionId, otherUser },
    { request },
  ]),
  // The concept action takes `user1` and `user2`. We'll map the authenticated user to `user1`.
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, { user: user1 }),
  then: actions([Friendship.removeFriend, { user1, user2: otherUser }]),
});

/**
 * Responds to the remove friend attempt.
 */
export const RespondToRemoveFriend: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Friendship/removeFriend" }, { request }],
    [Friendship.removeFriend, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- _areFriends (Authenticated Query) ---

/**
 * Handles a query to check if the authenticated user is friends with another user.
 */
export const HandleAreFriendsQuery: Sync = (
  { request, sessionId, otherUser, user1 },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Friendship/_areFriends", sessionId, otherUser },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, { user: user1 }),
  then: actions([Friendship._areFriends, { user1, user2: otherUser }]),
});

/**
 * Responds to the _areFriends query with the boolean result.
 * Note: Queries return an array of results. In this case, it will be a single-element array.
 * The sync engine will create one frame, and we extract the `isFriend` property to respond.
 */
export const RespondToAreFriendsQuery: Sync = (
  { request, isFriend, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Friendship/_areFriends" }, { request }],
    // The query returns `[{ isFriend: boolean }]`. The pattern matching extracts `isFriend`.
    [Friendship._areFriends, {}, { isFriend, error }],
  ),
  then: actions([Requesting.respond, { request, isFriend, error }]),
});
/**
 * Handles an authenticated request to retrieve the current user's friend list.
 * This sync demonstrates a common authenticated query pattern:
 * 1. A request is made with a `sessionId`.
 * 2. The `where` clause uses `Sessioning._getUser` to validate the session and get the user ID.
 * 3. The user ID is then used to query the target concept (`Friendship._getFriends`).
 * 4. The results are collected and returned in the response.
 */
export const HandleGetFriendsRequest: Sync = (
  { request, sessionId, user, friend, friends },
) => ({
  // WHEN: A request is made to get the friends list, providing a session ID for authentication.
  when: actions([
    Requesting.request,
    { path: "/Friendship/_getFriends", sessionId },
    { request },
  ]),

  // WHERE: We authenticate the user and fetch the data.
  where: async (frames: Frames) => {
    // Step 1: Get the user from the session. If the session is invalid, `frames` will become empty,
    // and this sync will not proceed to the `then` clause.
    frames = await frames.query(Sessioning._getUser, { session: sessionId }, {
      user,
    });

    // Step 2: Get the list of friends for that user. This query returns one frame per friend.
    frames = await frames.query(Friendship._getFriends, { user }, { friend });

    // Step 3: Collect all the individual `friend` frames into a single `friends` array.
    // This gracefully handles the case of having zero friends (resulting in an empty array).
    return frames.collectAs([friend], friends);
  },

  // THEN: Respond to the original request with the collected list of friends.
  then: actions([
    Requesting.respond,
    // The final JSON response will be an object like: { friends: [{ friend: "..." }, ...] }
    { request, friends },
  ]),
});
