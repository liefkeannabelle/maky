import { actions, Frames, Sync } from "@engine";
import { Comment, Requesting, Sessioning } from "@concepts";

// --- Add Comment (Authenticated) ---

/**
 * Handles a request to add a comment to a post. It authenticates the user
 * via their session before triggering the addCommentToPost action.
 */
export const HandleAddCommentRequest: Sync = (
  { request, sessionId, post, content, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Comment/addCommentToPost", sessionId, post, content },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([Comment.addCommentToPost, { author: user, post, content }]),
});

/**
 * Responds to a successful add comment request with the new comment's ID.
 */
export const RespondToAddCommentSuccess: Sync = ({ request, comment }) => ({
  when: actions(
    [Requesting.request, { path: "/Comment/addCommentToPost" }, { request }],
    [Comment.addCommentToPost, {}, { comment }],
  ),
  then: actions([Requesting.respond, { request, comment }]),
});

/**
 * Responds to a failed add comment request with an error.
 */
export const RespondToAddCommentError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Comment/addCommentToPost" }, { request }],
    [Comment.addCommentToPost, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Delete Comment (Authenticated) ---

/**
 * Handles a request to delete a comment. It authenticates the user
 * via their session before triggering the deleteComment action.
 */
export const HandleDeleteCommentRequest: Sync = (
  { request, sessionId, comment, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Comment/deleteComment", sessionId, comment },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([Comment.deleteComment, { author: user, comment }]),
});

/**
 * Responds to a successful delete comment request.
 */
export const RespondToDeleteCommentSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Comment/deleteComment" }, { request }],
    // Assuming the concept action returns { success: true } on completion.
    [Comment.deleteComment, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * Responds to a failed delete comment request with an error.
 */
export const RespondToDeleteCommentError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Comment/deleteComment" }, { request }],
    [Comment.deleteComment, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Edit Comment (Authenticated) ---

/**
 * Handles a request to edit a comment. It authenticates the user
 * via their session before triggering the editComment action.
 */
export const HandleEditCommentRequest: Sync = (
  { request, sessionId, comment, newContent, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Comment/editComment", sessionId, comment, newContent },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([Comment.editComment, { author: user, comment, newContent }]),
});

/**
 * Responds to a successful edit comment request.
 */
export const RespondToEditCommentSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Comment/editComment" }, { request }],
    [Comment.editComment, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * Responds to a failed edit comment request with an error.
 */
export const RespondToEditCommentError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Comment/editComment" }, { request }],
    [Comment.editComment, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Remove All Comments From Post (Internal/Admin) ---
// This is assumed to be a public or system-level action as per the spec.
// If auth were needed, a 'where' clause would be added.

/**
 * Handles a request to remove all comments from a post.
 */
export const HandleRemoveAllCommentsFromPostRequest: Sync = (
  { request, post },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Comment/removeAllCommentsFromPost", post },
    { request },
  ]),
  then: actions([Comment.removeAllCommentsFromPost, { post }]),
});

/**
 * Responds to a successful remove all comments request.
 */
export const RespondToRemoveAllCommentsFromPostSuccess: Sync = (
  { request },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Comment/removeAllCommentsFromPost" },
      { request },
    ],
    [Comment.removeAllCommentsFromPost, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * Responds to a failed remove all comments request with an error.
 */
export const RespondToRemoveAllCommentsFromPostError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Comment/removeAllCommentsFromPost" },
      { request },
    ],
    [Comment.removeAllCommentsFromPost, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Get Comments for Post (Public Query) ---

/**
 * Handles a request to get all comments for a specific post.
 * This is a public query and does not require authentication.
 */
export const HandleGetCommentsForPostRequest: Sync = (
  { request, post, commentsBundle, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Comment/_getCommentsForPostId", post },
    { request },
  ]),
  where: async (frames) => {
    // Preserve the original frame to keep the `request` binding, especially for the case of no results.
    const originalFrame = frames[0];

    // `_getCommentsForPostId` now returns a single-element array like `[{ comments: [...] }]`.
    frames = await frames.query(
      Comment._getCommentsForPostId,
      { post },
      { comments: commentsBundle },
    );

    // If something goes wrong and no frame is returned, respond with an empty array to avoid a timeout.
    if (frames.length === 0) {
      const responseFrame = { ...originalFrame, [results]: [] };
      return new Frames(responseFrame);
    }

    const firstFrame = frames[0];
    const comments = (firstFrame[commentsBundle] as unknown[]) ?? [];
    const responseFrame = { ...firstFrame, [results]: comments };
    return new Frames(responseFrame);
  },
  then: actions([
    Requesting.respond,
    { request, results }, // Respond with the collected results array
  ]),
});
