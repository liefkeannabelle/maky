import { actions, Frames, Sync } from "@engine";
import { Friendship, Post, Reaction, Requesting, Sessioning } from "@concepts";

// --- Add Reaction to Post (Authenticated) ---

/**
 * Handles a request to add a reaction to a post, authenticating via session.
 */
export const HandleAddReactionRequest: Sync = (
  { request, sessionId, post, type, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Reaction/addReactionToPost", sessionId, post, type },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([Reaction.addReactionToPost, { user, post, type }]),
});

/**
 * Responds to a successful add reaction request by returning the created reaction object.
 */
export const RespondToAddReactionSuccess: Sync = ({ request, reaction }) => ({
  when: actions(
    [Requesting.request, { path: "/Reaction/addReactionToPost" }, { request }],
    [Reaction.addReactionToPost, {}, { reaction }],
  ),
  then: actions([Requesting.respond, { request, reaction }]),
});

/**
 * Responds to a failed add reaction request with an error message.
 */
export const RespondToAddReactionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Reaction/addReactionToPost" }, { request }],
    [Reaction.addReactionToPost, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Change Reaction Type (Authenticated) ---

/**
 * Handles a request to change the type of an existing reaction, authenticating via session.
 */
export const HandleChangeReactionTypeRequest: Sync = (
  { request, sessionId, post, newType, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Reaction/changeReactionType", sessionId, post, newType },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([Reaction.changeReactionType, { user, post, newType }]),
});

/**
 * Responds to a successful change reaction type request by passing along the success flag.
 */
export const RespondToChangeReactionTypeSuccess: Sync = (
  { request, success },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Reaction/changeReactionType" },
      { request },
    ],
    [Reaction.changeReactionType, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed change reaction type request with an error message.
 */
export const RespondToChangeReactionTypeError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Reaction/changeReactionType" },
      { request },
    ],
    [Reaction.changeReactionType, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Remove Reaction from Post (Authenticated) ---

/**
 * Handles a request to remove a reaction from a post, authenticating via session.
 */
export const HandleRemoveReactionRequest: Sync = (
  { request, sessionId, post, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Reaction/removeReactionFromPost", sessionId, post },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([Reaction.removeReactionFromPost, { user, post }]),
});

/**
 * Responds to a successful remove reaction request.
 */
export const RespondToRemoveReactionSuccess: Sync = ({ request, success }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Reaction/removeReactionFromPost" },
      { request },
    ],
    [Reaction.removeReactionFromPost, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed remove reaction request with an error message.
 */
export const RespondToRemoveReactionError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Reaction/removeReactionFromPost" },
      { request },
    ],
    [Reaction.removeReactionFromPost, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Get Reactions for Post (Public Query) ---

/**
 * Handles a request to get the reaction counts for a specific post.
 * This is a public query and does not require a session.
 */
export const HandleGetReactionsForPostRequest: Sync = (
  {
    request,
    sessionId,
    post,
    type,
    count,
    results,
    viewer,
    author,
    friendStatus,
    error,
  },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Reaction/_getReactionsForPostId", sessionId, post },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // Authenticate session
    const withViewer = await frames.query(Sessioning._getUser, { sessionId }, {
      user: viewer,
    });

    if (withViewer.length === 0) {
      return new Frames({
        ...originalFrame,
        [error]: "Invalid session",
        [results]: [],
      });
    }

    // Determine post author
    const withAuthor = await withViewer.query(Post._getPostAuthor, { post }, {
      author,
    });

    if (withAuthor.length === 0) {
      return new Frames({
        ...originalFrame,
        [error]: "Post not found",
        [results]: [],
      });
    }

    const selfAuthorized = withAuthor.filter((frame) =>
      frame[viewer] === frame[author]
    );
    const others = withAuthor.filter((frame) =>
      frame[viewer] !== frame[author]
    );

    let friendAuthorized = new Frames();
    if (others.length > 0) {
      const friendChecked = await new Frames(...others).query(
        Friendship.areFriends,
        { user1: viewer, user2: author },
        { isFriend: friendStatus },
      );

      friendAuthorized = new Frames(
        ...friendChecked.filter((frame) => frame[friendStatus] === true),
      );
    }

    const authorizedFrames = new Frames(...selfAuthorized, ...friendAuthorized);

    if (authorizedFrames.length === 0) {
      return new Frames({
        ...originalFrame,
        [error]: "Unauthorized",
        [results]: [],
      });
    }

    const reactionFrames = await authorizedFrames.query(
      Reaction._getReactionsForPostId,
      { post },
      { type, count },
    );

    if (reactionFrames.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
        [error]: null,
      });
    }

    const collected = reactionFrames.collectAs([type, count], results);
    return new Frames(
      ...collected.map((frame) => ({ ...frame, [error]: null })),
    );
  },
  then: actions([
    Requesting.respond,
    { request, results, error },
  ]),
});
// --- Get Reaction On Post From User (Authenticated Query) ---

/**
 * Handles a request to get the reaction (per-type counts) that a specific user
 * has on a specific post. This requires authentication: the provided
 * `sessionId` must map to the same `user` requested.
 */
export const HandleGetReactionOnPostFromUserRequest: Sync = (
  { request, sessionId, user, post, type, count, results, viewer },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Reaction/_getReactionOnPostFromUser", sessionId, user, post },
    { request },
  ]),
  where: async (frames) => {
    // Verify session -> user mapping
    const withViewer = await frames.query(Sessioning._getUser, { sessionId }, {
      user: viewer,
    });

    // No session or invalid session
    if (withViewer.length === 0) {
      return new Frames();
    }

    // Ensure the session user matches the requested user
    const authorized = withViewer.filter((frame) =>
      frame[viewer] === frame[user]
    );

    if (authorized.length === 0) {
      return new Frames();
    }

    // Query the Reaction concept for the per-type reaction presence (0 or 1)
    const queried = await authorized.query(
      Reaction._getReactionOnPostFromUser,
      { user, post },
      { type, count },
    );

    // If no results (shouldn't happen because the concept returns all types),
    // return an empty results array for robustness.
    if (queried.length === 0) {
      const responseFrame = { ...authorized[0], [results]: [] };
      return new Frames(responseFrame);
    }

    return queried.collectAs([type, count], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});
