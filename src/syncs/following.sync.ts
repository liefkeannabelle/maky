import { actions, Sync } from "@engine";
import { Following, Requesting, Sessioning } from "@concepts";
/**
 * Handles a request for one user to follow another.
 * It authenticates the requester via their session before triggering the followUser action.
 */
export const HandleFollowUserRequest: Sync = (
  { request, sessionId, followed, user },
) => ({
  when: actions([
    Requesting.request,
    // Catches the specific API request.
    { path: "/Following/followUser", sessionId, followed },
    { request },
  ]),
  // The 'where' clause authenticates the request by getting the user from the session.
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  // If authentication is successful, it triggers the concept action.
  // The 'follower' parameter is mapped from the authenticated 'user' variable.
  then: actions([Following.followUser, { follower: user, followed }]),
});

/**
 * Responds successfully to the original /Following/followUser request.
 * This handles the success case, returning the new `follow` object.
 */
export const RespondToFollowUserSuccess: Sync = ({ request, follow }) => ({
  when: actions(
    // Matches the original request in the same flow.
    [Requesting.request, { path: "/Following/followUser" }, { request }],
    // Matches the successful result of the followUser action, binding `follow`.
    [Following.followUser, {}, { follow }],
  ),
  // Responds to the client with the new follow object.
  then: actions([Requesting.respond, { request, follow }]),
});

/**
 * Responds with an error to the original /Following/followUser request.
 * This handles the failure case, returning an `error` object.
 */
export const RespondToFollowUserError: Sync = ({ request, error }) => ({
  when: actions(
    // Matches the original request in the same flow.
    [Requesting.request, { path: "/Following/followUser" }, { request }],
    // Matches the failed result of the followUser action, binding `error`.
    [Following.followUser, {}, { error }],
  ),
  // Responds to the client with the error.
  then: actions([Requesting.respond, { request, error }]),
});

// --- Unfollow User (Authenticated) ---

/**
 * Handles a request for one user to unfollow another.
 * It authenticates the requester via their session before triggering the unfollowUser action.
 */
export const HandleUnfollowUserRequest: Sync = (
  { request, sessionId, followed, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Following/unfollowUser", sessionId, followed },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([Following.unfollowUser, { follower: user, followed }]),
});

/**
 * Responds successfully to the original /Following/unfollowUser request.
 * This handles the success case where the action returns `{ success: true }`.
 */
export const RespondToUnfollowUserSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Following/unfollowUser" }, { request }],
    [Following.unfollowUser, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * Responds with an error to the original /Following/unfollowUser request.
 * This handles the failure case where the action returns an error object.
 */
export const RespondToUnfollowUserError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Following/unfollowUser" }, { request }],
    // This pattern specifically matches when the output contains an 'error' key.
    [Following.unfollowUser, {}, { error }],
  ),
  // Respond to the client with the specific error.
  then: actions([Requesting.respond, { request, error }]),
});
