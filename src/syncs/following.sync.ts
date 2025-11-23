import { actions, Sync } from "@engine";
import { Following, Requesting, Sessioning } from "@concepts";

// --- Follow User (Authenticated) ---

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
 * Responds to the original /Following/followUser request after the action completes.
 * This synchronization handles both success (returning the new `follow` object) and failure (returning an `error`).
 */
export const RespondToFollowUser: Sync = ({ request, follow, error }) => ({
  when: actions(
    // Matches the original request in the same flow.
    [Requesting.request, { path: "/Following/followUser" }, { request }],
    // Matches the result of the followUser action, binding `follow` on success or `error` on failure.
    [Following.followUser, {}, { follow, error }],
  ),
  // Responds to the client with the outcome.
  then: actions([Requesting.respond, { request, follow, error }]),
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
 * Responds to the original /Following/unfollowUser request after the action completes.
 * This handles both success (empty object) and failure (error object).
 */
export const RespondToUnfollowUser: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Following/unfollowUser" }, { request }],
    // The unfollowUser action returns an empty object `{}` on success, so we only need
    // to explicitly pattern match on the `error` case. If `error` is not present,
    // the response will correctly be an empty object.
    [Following.unfollowUser, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
