import { actions, Frames, Sync } from "@engine";
import { Comment, Post, Reaction, Requesting, Sessioning } from "@concepts";

/**
 * CascadePostDeletion
 *
 * When a post is deleted, automatically removes all associated comments and reactions.
 * This ensures data consistency by cleaning up all related data when a post is removed.
 */
export const CascadePostDeletion: Sync = ({ postId }) => ({
  when: actions(
    // This sync triggers only on a successful `deletePost` action.
    [Post.deletePost, { postId }, { success: true }],
  ),
  then: actions(
    // The `postId` from the deleted post is used to remove associated comments and reactions.
    [Comment.removeAllCommentsFromPost, { post: postId }],
    [Reaction.removeAllReactionsFromPost, { post: postId }],
  ),
});

// --- Create Post (Authenticated) ---

/**
 * Handles an incoming request to create a new post, including its associated items.
 * It authenticates the user via their session before triggering the `createPost` action.
 */
export const HandleCreatePostRequest: Sync = (
  { request, sessionId, content, postType, items, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/createPost", sessionId, content, postType, items },
    { request },
  ]),
  // The `where` clause authenticates the request by getting the user from the session.
  // If the session is invalid, the query returns no frames, and the sync stops.
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([
    // The `user` from the session is used as the `author` of the post.
    Post.createPost,
    { author: user, content, postType, items },
  ]),
});

/**
 * Responds to the original request after a `createPost` attempt.
 * This single synchronization handles both success (returns a `postId`) and failure (returns an `error`).
 */
export const RespondToCreatePostSuccess: Sync = ({ request, postId }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/createPost" }, { request }],
    [Post.createPost, {}, { postId }],
  ),
  then: actions([Requesting.respond, { request, postId }]),
});

export const RespondToCreatePostError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/createPost" }, { request }],
    [Post.createPost, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Delete Post (Authenticated) ---

/**
 * Handles a request to delete a post, authenticating the user via session.
 */
export const HandleDeletePostRequest: Sync = (
  { request, sessionId, postId, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/deletePost", sessionId, postId },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  // The concept's `deletePost` action is responsible for checking if the `user` (deleter) is authorized.
  then: actions([Post.deletePost, { deleter: user, postId }]),
});

/**
 * Responds to the original request after a `deletePost` attempt.
 */
export const RespondToDeletePost: Sync = ({ request, success, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/deletePost" }, { request }],
    [Post.deletePost, {}, { success, error }],
  ),
  then: actions([Requesting.respond, { request, success, error }]),
});

// --- Edit Post (Authenticated) ---

/**
 * Handles a request to edit an existing post, authenticating the user via session.
 */
export const HandleEditPostRequest: Sync = (
  { request, sessionId, postId, newContent, newItems, newPostType, user },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Post/editPost",
      sessionId,
      postId,
      newContent,
      newItems,
      newPostType,
    },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  // The concept's `editPost` action is responsible for checking if the `user` (editor) is authorized.
  then: actions([
    Post.editPost,
    { editor: user, postId, newContent, newItems, newPostType },
  ]),
});

/**
 * Responds to the original request after an `editPost` attempt.
 */
export const RespondToEditPost: Sync = ({ request, success, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/editPost" }, { request }],
    [Post.editPost, {}, { success, error }],
  ),
  then: actions([Requesting.respond, { request, success, error }]),
});

// --- Get Posts For User (Public Query) ---

/**
 * Handles a public request to get all posts for a specific user.
 */
export const HandleGetPostsForUserRequest: Sync = (
  { request, user, post, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/_getPostsForUser", user },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // Query the Post concept for all posts by the given user.
    // This will create a new frame for each post returned by the query.
    frames = await frames.query(Post._getPostsForUser, { user }, { post });

    // If the query returns no posts, we must explicitly handle this case to avoid a timeout.
    if (frames.length === 0) {
      const responseFrame = { ...originalFrame, [results]: [] };
      return new Frames(responseFrame);
    }

    // Collect all the individual post frames into a single frame with a `results` array.
    return frames.collectAs([post], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Get Posts For Users (Public Query) ---

/**
 * Handles a public request to get all posts for a list of users.
 */
export const HandleGetPostsForUsersRequest: Sync = (
  { request, users, post, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/_getPostsForUsers", users },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Post._getPostsForUsers, { users }, { post });

    if (frames.length === 0) {
      const responseFrame = { ...originalFrame, [results]: [] };
      return new Frames(responseFrame);
    }

    return frames.collectAs([post], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});
