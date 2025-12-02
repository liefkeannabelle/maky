import { actions, Frames, Sync } from "@engine";
import { Comment, Friendship, Post, Requesting, Sessioning } from "@concepts";

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
  {
    request,
    sessionId,
    post,
    comments,
    results,
    viewer,
    author,
    friendStatus,
    error,
  },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Comment/_getCommentsForPostId", sessionId, post },
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

    // Fetch the author of the post
    const withAuthor = await withViewer.query(
      Post._getPostAuthor,
      { post },
      { author },
    );

    if (withAuthor.length === 0) {
      return new Frames({
        ...originalFrame,
        [error]: "Post not found",
        [results]: [],
      });
    }

    // Split into self vs. others
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

    const commentFrames = await authorizedFrames.query(
      Comment._getCommentsForPostId,
      { post },
      { comments },
    );

    if (commentFrames.length === 0) {
      return new Frames({
        ...originalFrame,
        [results]: [],
        [error]: null,
      });
    }

    const collected = commentFrames.collectAs([comments], results);
    return new Frames(
      ...collected.map((frame) => ({ ...frame, [error]: null })),
    );
  },
  then: actions([
    Requesting.respond,
    { request, results, error },
  ]),
});
