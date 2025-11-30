import { actions, Frames, Sync } from "@engine";
import { Comment, Post, Reaction, Requesting, Sessioning } from "@concepts";
import { ID } from "@utils/types.ts";

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

/**
 * CascadeAllPostsDeletionForUser
 *
 * When all posts for a user are deleted (via removeAllPostsForUser), automatically removes
 * all associated comments and reactions for each of those posts. This ensures data consistency
 * by cleaning up all related data when a user's posts are bulk-deleted (e.g., during account deletion).
 */
export const CascadeAllPostsDeletionForUser: Sync = ({ postIds, post }) => ({
  when: actions(
    // This sync triggers only on a successful `removeAllPostsForUser` action.
    // The action returns `postIds` array containing all deleted post IDs.
    [Post.removeAllPostsForUser, {}, { success: true, postIds }],
  ),
  where: async (frames) => {
    // Expand the postIds array into individual frames, one per post.
    // This allows us to iterate over each post and delete its comments and reactions.
    const newFrames: Array<Record<string, unknown>> = [];
    for (const frame of frames) {
      const ids = frame[postIds] as ID[] | undefined;
      if (ids && ids.length > 0) {
        for (const postId of ids) {
          newFrames.push({ ...frame, [post]: postId });
        }
      }
    }
    // If no posts were deleted, return empty frames to avoid errors
    if (newFrames.length === 0) {
      return new Frames();
    }
    return new Frames(...newFrames);
  },
  then: actions(
    // For each post, remove all associated comments and reactions.
    // The `post` binding comes from the expansion in the `where` clause.
    [Comment.removeAllCommentsFromPost, { post }],
    [Reaction.removeAllReactionsFromPost, { post }],
  ),
});

// --- Create Post (Authenticated) ---

/**
 * Handles an incoming request to create a new post, including its associated items.
 * It authenticates the user via their session before triggering the `createPost` action.
 */
export const HandleCreatePostRequest: Sync = (
  { request, sessionId, content, postType, items, visibility, user },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Post/createPost",
      sessionId,
      content,
      postType,
      items,
      visibility,
    },
    { request },
  ]),
  // The `where` clause authenticates the request by getting the user from the session.
  // If the session is invalid, the query returns no frames, and the sync stops.
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([
    // The `user` from the session is used as the `author` of the post.
    Post.createPost,
    { author: user, content, postType, items, visibility },
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
 * Responds to a successful delete post attempt.
 */
export const RespondToDeletePostSuccess: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/deletePost" }, { request }],
    // Match on the success case, which returns a `success` object.
    [Post.deletePost, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed delete post attempt.
 */
export const RespondToDeletePostError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/deletePost" }, { request }],
    // Match on the failure case, which returns an `error` object.
    [Post.deletePost, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
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
 * Responds to a successful edit post attempt.
 */
export const RespondToEditPostSuccess: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/editPost" }, { request }],
    [Post.editPost, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed edit post attempt.
 */
export const RespondToEditPostError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/editPost" }, { request }],
    [Post.editPost, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Edit Post Visibility (Authenticated) ---

/**
 * Handles a request to edit the visibility of an existing post.
 */
export const HandleEditPostVisibilityRequest: Sync = (
  { request, sessionId, postId, newVisibility, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/editPostVisibility", sessionId, postId, newVisibility },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([
    Post.editPostVisibility,
    { editor: user, postId, newVisibility },
  ]),
});
export const RespondToEditPostVisibilitySuccess: Sync = (
  { request, success },
) => ({
  when: actions(
    [Requesting.request, { path: "/Post/editPostVisibility" }, { request }],
    [Post.editPostVisibility, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const RespondToEditPostVisibilityError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Post/editPostVisibility" }, { request }],
    [Post.editPostVisibility, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
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

// --- Get Public Posts For User (Public Query) ---

export const HandleGetPublicPostsForUserRequest: Sync = (
  { request, user, post, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/_getPublicPostsForUser", user },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Post._getPublicPostsForUser, { user }, {
      post,
    });

    if (frames.length === 0) {
      const responseFrame = { ...originalFrame, [results]: [] };
      return new Frames(responseFrame);
    }

    return frames.collectAs([post], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Get Private Posts For User (Private Data Query) ---

export const HandleGetPrivatePostsForUserRequest: Sync = (
  { request, user, post, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/_getPrivatePostsForUser", user },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Post._getPrivatePostsForUser, { user }, {
      post,
    });

    if (frames.length === 0) {
      const responseFrame = { ...originalFrame, [results]: [] };
      return new Frames(responseFrame);
    }

    return frames.collectAs([post], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Personal Post Queries (Authenticated) ---

const requireViewerMatchesUser = async (
  frames: Frames,
  sessionId: symbol,
  userSymbol: symbol,
  viewerSymbol: symbol,
) => {
  const withViewer = await frames.query(Sessioning._getUser, { sessionId }, {
    user: viewerSymbol,
  });

  if (withViewer.length === 0) {
    return new Frames();
  }

  const authorized = withViewer.filter((frame) =>
    frame[viewerSymbol] === frame[userSymbol]
  );
  if (authorized.length === 0) {
    return new Frames();
  }

  return authorized;
};

export const HandleGetPersonalPrivatePostsRequest: Sync = (
  { request, sessionId, user, post, results, viewer },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/_getPersonalPrivatePosts", sessionId, user },
    { request },
  ]),
  where: async (frames) => {
    const authorized = await requireViewerMatchesUser(
      frames,
      sessionId,
      user,
      viewer,
    );

    if (authorized.length === 0) {
      return authorized;
    }

    const queried = await authorized.query(
      Post._getPrivatePostsForUser,
      { user },
      { post },
    );

    if (queried.length === 0) {
      const responseFrame = { ...authorized[0], [results]: [] };
      return new Frames(responseFrame);
    }

    return queried.collectAs([post], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

export const HandleGetPersonalPublicPostsRequest: Sync = (
  { request, sessionId, user, post, results, viewer },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/_getPersonalPublicPosts", sessionId, user },
    { request },
  ]),
  where: async (frames) => {
    const authorized = await requireViewerMatchesUser(
      frames,
      sessionId,
      user,
      viewer,
    );

    if (authorized.length === 0) {
      return authorized;
    }

    const queried = await authorized.query(
      Post._getPublicPostsForUser,
      { user },
      { post },
    );

    if (queried.length === 0) {
      const responseFrame = { ...authorized[0], [results]: [] };
      return new Frames(responseFrame);
    }

    return queried.collectAs([post], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Get Public Posts Of Users With Session (future follower checks) ---

export const HandleGetPublicPostsOfUsersRequest: Sync = (
  { request, sessionId, users, viewer, post, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/_getPublicPostsOfUsers", sessionId, users },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the requesting user; future work will validate follower/friend relationship.
    const withViewer = await frames.query(Sessioning._getUser, { sessionId }, {
      user: viewer,
    });

    if (withViewer.length === 0) {
      return new Frames();
    }

    const originalFrame = withViewer[0];
    const queried = await withViewer.query(
      Post._getPublicPostsForUsers,
      { users },
      { post },
    );

    if (queried.length === 0) {
      const responseFrame = { ...originalFrame, [results]: [] };
      return new Frames(responseFrame);
    }

    return queried.collectAs([post], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});
