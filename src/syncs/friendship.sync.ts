import { actions, Frames, Sync } from "@engine";
import { Friendship, Requesting, Sessioning, UserAccount } from "@concepts";

// --- Send Friend Request (Authenticated) ---

/**
 * Handles a request to send a friend request from the authenticated user to a recipient.
 * It first verifies that the recipient is a valid user before proceeding.
 */

export const HandleSendFriendRequest: Sync = (
  { request, sessionId, recipient, requester, recipientExists },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Friendship/sendFriendRequest", sessionId, recipient },
    { request },
  ]),
  // Authenticate the requester and verify the recipient exists.
  where: async (frames: Frames) => {
    // Step 1: Authenticate the session and get the user ID, aliasing it as 'requester'.
    frames = await frames.query(Sessioning._getUser, { sessionId }, {
      user: requester,
    });

    // Step 2: Verify that the recipient user ID corresponds to an actual user.
    frames = await frames.query(
      UserAccount._isUserById,
      { user: recipient },
      { result: recipientExists },
    );

    // Step 3: Only proceed if the recipient exists. If not, the request silently fails.
    // An alternative implementation could respond with a specific "user not found" error.
    return frames.filter(($) => $[recipientExists]);
  },
  then: actions([Friendship.sendFriendRequest, { requester, recipient }]),
});

/**
 * Responds to a successful send friend request attempt.
 */
export const RespondToSendFriendRequestSuccess: Sync = (
  { request, friendship },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Friendship/sendFriendRequest" },
      { request },
    ],
    // Match on the success case, which returns a `friendship` object.
    [Friendship.sendFriendRequest, {}, { friendship }],
  ),
  then: actions([Requesting.respond, { request, friendship }]),
});

/**
 * Responds to a failed send friend request attempt.
 */
export const RespondToSendFriendRequestError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Friendship/sendFriendRequest" },
      { request },
    ],
    // Match on the failure case, which returns an `error` object.
    [Friendship.sendFriendRequest, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
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
    frames.query(Sessioning._getUser, { sessionId }, {
      user: recipient,
    }),
  then: actions([Friendship.acceptFriendRequest, { requester, recipient }]),
});

/**
 * Responds to a successful accept friend request attempt.
 */
export const RespondToAcceptFriendRequestSuccess: Sync = (
  { request, success },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Friendship/acceptFriendRequest" },
      { request },
    ],
    // Match on the success output of the action. Assumes { success: true } is returned
    // by the concept action to allow for distinct pattern matching.
    [Friendship.acceptFriendRequest, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed accept friend request attempt.
 */
export const RespondToAcceptFriendRequestError: Sync = (
  { request, error },
) => ({
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
    frames.query(Sessioning._getUser, { sessionId }, {
      user: recipient,
    }),
  then: actions([Friendship.declineFriendRequest, { requester, recipient }]),
});

/**
 * Responds to a successful decline friend request attempt.
 */
export const RespondToDeclineFriendRequestSuccess: Sync = (
  { request, success },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Friendship/declineFriendRequest" },
      { request },
    ],
    [Friendship.declineFriendRequest, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed decline friend request attempt.
 */
export const RespondToDeclineFriendRequestError: Sync = (
  { request, error },
) => ({
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
    frames.query(Sessioning._getUser, { sessionId }, { user: user1 }),
  then: actions([Friendship.removeFriend, { user1, user2: otherUser }]),
});
/**
 * Responds to a successful remove friend attempt.
 */
export const RespondToRemoveFriendSuccess: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/Friendship/removeFriend" }, { request }],
    [Friendship.removeFriend, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed remove friend attempt.
 */
export const RespondToRemoveFriendError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Friendship/removeFriend" }, { request }],
    [Friendship.removeFriend, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- areFriends (Authenticated Query) ---

/**
 * Handles a query to check if the authenticated user is friends with another user.
 * This sync authenticates the request, performs the query, processes the array result,
 * and sends the final boolean response.
 */
export const HandleAreFriendsQuery: Sync = (
  { request, sessionId, otherUser, user1, isFriend, queryResult },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Friendship/areFriends", sessionId, otherUser },
    { request },
  ]),
  where: async (frames: Frames) => {
    // Step 1: Authenticate the session and get the user ID, aliasing it as 'user1'.
    frames = await frames.query(Sessioning._getUser, { sessionId }, {
      user: user1,
    });

    // Step 2: Perform the `areFriends` query. The query returns `[{ isFriend: boolean }]`.
    // We bind the entire result array to a temporary variable `queryResult`.
    frames = await frames.query(
      Friendship.areFriends,
      { user1, user2: otherUser },
      { queryResult },
    );

    // Step 3: Extract the boolean value from the result array and bind it to `isFriend`.
    // This safely handles cases where the query might return an empty or unexpected result.
    return frames.map(($) => {
      const rawResult = $[queryResult];
      const arrayResult = Array.isArray(rawResult) ? rawResult : [];
      const result = typeof arrayResult[0]?.isFriend === "boolean"
        ? arrayResult[0]!.isFriend
        : false;
      return { ...$, [isFriend]: result };
    });
  },
  then: actions([Requesting.respond, { request, isFriend }]),
});

/**
 * Responds to a successful areFriends query with the boolean result.
 * @deprecated This synchronization is now handled by the consolidated HandleAreFriendsQuery.
 */
export const RespondToAreFriendsQuerySuccess: Sync = (
  { request, isFriend },
) => ({
  when: actions(
    [Requesting.request, { path: "/Friendship/areFriends" }, { request }],
    // The query returns `[{ isFriend: boolean }]`. The pattern matching extracts `isFriend`.
    [Friendship.areFriends, {}, { isFriend }],
  ),
  then: actions([Requesting.respond, { request, isFriend }]),
});

/**
 * Responds to a failed areFriends query.
 * @deprecated This synchronization is now handled by the consolidated HandleAreFriendsQuery.
 */
export const RespondToAreFriendsQueryError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Friendship/areFriends" }, { request }],
    // Match on the failure case, which returns an `error`.
    [Friendship.areFriends, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
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
    frames = await frames.query(Sessioning._getUser, { sessionId }, {
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
/**
 * Handles a request to get all pending friend requests for a specific user.
 * This is a public query; it does not require a session as it fetches data based on the provided user ID.
 */
export const HandleGetPendingFriendshipsRequest: Sync = (
  { request, user, pendingFriendships, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Friendship/_getPendingFriendships", user },
    { request },
  ]),
  where: async (frames) => {
    // Keep the original frame to preserve the `request` binding, especially for the zero-match case.
    const originalFrame = frames[0];

    // The Friendship._getPendingFriendships query returns an array with a single object: `[{ pendingFriendships: [...] }]`.
    // The output pattern `{ pendingFriendships }` extracts the inner array `[...]` and binds it to the `pendingFriendships` variable.
    frames = await frames.query(
      Friendship._getPendingFriendships,
      { user }, // input to the query
      { pendingFriendships }, // output variable binding
    );

    // If the query returns an empty array (e.g., if the user ID does not exist),
    // we must respond explicitly with an empty result to avoid a request timeout.
    if (frames.length === 0) {
      const responseFrame = { ...originalFrame, [results]: [] };
      return new Frames(responseFrame);
    }

    // The `collectAs` helper is used to format the final response.
    // It will create a `results` variable containing an array with a single object: `[{ pendingFriendships: [...] }]`.
    // This matches the response format convention used by other query synchronizations.
    return frames.collectAs([pendingFriendships], results);
  },
  then: actions([
    Requesting.respond,
    { request, results },
  ]),
});
