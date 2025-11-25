import { actions, Frames, Sync } from "@engine";
import { Post, Reaction, Requesting, Sessioning } from "@concepts";

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
export const RespondToChangeReactionTypeSuccess: Sync = ({ request, success }) => ({
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
  { request, post, type, count, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Reaction/_getReactionsForPostId", post },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // The _getReactionsForPostId query returns an array like [{type: "LIKE", count: 5}, ...].
    // The frames.query helper will create a new frame for each object in this array.
    frames = await frames.query(
      Reaction._getReactionsForPostId,
      { post }, // Input to the query
      { type, count }, // Bind `type` and `count` from each result object
    );

    // The query is designed to always return an array of all reaction types, even with count 0.
    // So, `frames` should not be empty unless the post does not exist.
    // Handling the empty case is good practice for robustness.
    if (frames.length === 0) {
      const responseFrame = { ...originalFrame, [results]: [] };
      return new Frames(responseFrame);
    }

    // `collectAs` groups the frames back into a single result.
    // It collects the `type` and `count` variables into an array named `results`.
    return frames.collectAs([type, count], results);
  },
  then: actions([
    Requesting.respond,
    { request, results },
  ]),
});
