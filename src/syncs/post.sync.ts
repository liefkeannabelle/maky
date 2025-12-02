import { actions, Frames, Sync } from "@engine";
import {
  Comment,
  Friendship,
  Post,
  Reaction,
  Requesting,
  Sessioning,
} from "@concepts";
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

// (removed public multi-user handler; feed composition is handled by the
// authenticated `_getPostsViewableToUser` sync which queries per-user endpoints)

// --- Get Posts Viewable To User (Authenticated Query) ---
export const HandleGetPostsViewableToUserRequest: Sync = (
  {
    request,
    sessionId,
    user,
    viewer,
    friend,
    usersList,
    post,
    results,
    error,
  },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/_getPostsViewableToUser", sessionId, user },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // Authenticate session -> viewer
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

    // Ensure the session user matches requested user
    const authorized = withViewer.filter((frame) =>
      frame[viewer] === frame[user]
    );
    if (authorized.length === 0) {
      return new Frames({
        ...originalFrame,
        [error]: "Unauthorized",
        [results]: [],
      });
    }

    // Get accepted friends for the user
    const friendFrames = await authorized.query(Friendship._getFriends, {
      user,
    }, { friend });

    // Build a list of friend IDs (exclude duplicates)
    const friendIds: ID[] = [];
    for (const f of friendFrames) {
      const id = f[friend] as ID | undefined;
      if (id && !friendIds.includes(id)) {
        friendIds.push(id);
      }
    }

    // Collect posts: viewer's private posts + viewer's public posts + each friend's public posts
    const collectedPosts: Array<{ post: unknown }> = [];

    // Viewer private posts
    const privateQueried = await authorized.query(
      Post._getPrivatePostsForUser,
      { user },
      { post },
    );
    for (const f of privateQueried) {
      collectedPosts.push({ post: f[post] });
    }

    // Viewer public posts
    const viewerFrames = authorized.map((frame) => ({
      ...frame,
      [usersList]: [frame[user]],
    }));
    if (viewerFrames.length > 0) {
      const framesForViewerPublic = new Frames(...viewerFrames);
      const viewerPublic = await framesForViewerPublic.query(
        Post._getPublicPostsForUsers,
        { users: usersList },
        { post },
      );
      for (const f of viewerPublic) collectedPosts.push({ post: f[post] });
    }

    // Friends' public posts (bulk query per-friend via a single query by mapping each friend into a frame)
    if (friendIds.length > 0) {
      const framesForFriendsQuery = friendFrames.map((frame) => ({
        ...frame,
        [usersList]: [frame[friend]],
      }));
      const framesForFriends = new Frames(...framesForFriendsQuery);
      const friendsPublic = await framesForFriends.query(
        Post._getPublicPostsForUsers,
        { users: usersList },
        { post },
      );
      for (const f of friendsPublic) collectedPosts.push({ post: f[post] });
    }

    // Deduplicate by _id (in case of overlap) and sort newest-first by createdAt
    const byId = new Map<string, Record<string, unknown>>();
    for (const entry of collectedPosts) {
      const p = entry.post as Record<string, unknown> | undefined;
      if (p && p["_id"]) byId.set(String(p["_id"]), p);
    }

    const merged = Array.from(byId.values()).sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aCreated = a["createdAt"];
        const bCreated = b["createdAt"];
        const ta = typeof aCreated === "string"
          ? Date.parse(aCreated)
          : (aCreated instanceof Date ? aCreated.getTime() : 0);
        const tb = typeof bCreated === "string"
          ? Date.parse(bCreated)
          : (bCreated instanceof Date ? bCreated.getTime() : 0);
        return tb - ta;
      },
    );

    const resultPosts = merged.map((p) => ({ post: p }));

    const responseFrame = {
      ...originalFrame,
      [results]: resultPosts,
      [error]: null,
    };
    return new Frames(responseFrame);
  },
  then: actions([Requesting.respond, { request, results, error }]),
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
  { request, sessionId, user: targetUser, post, results, viewer, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/_getPersonalPrivatePosts", sessionId, user: targetUser },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // Step 1: Authenticate session
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

    // Step 2: Authorize (viewer must be the user they are requesting posts for)
    const authorized = withViewer.filter((frame) =>
      frame[viewer] === frame[targetUser]
    );

    if (authorized.length === 0) {
      return new Frames({
        ...originalFrame,
        [error]: "Unauthorized",
        [results]: [],
      });
    }

    // Step 3: Success path - perform the actual query
    const queried = await authorized.query(
      Post._getPrivatePostsForUser,
      { user: targetUser },
      { post },
    );

    // Handle case where user has no private posts (still a success)
    const posts = queried.map((frame) => ({ post: frame[post] }));
    const responseFrame = {
      ...originalFrame,
      [results]: posts,
      [error]: null,
    };
    return new Frames(responseFrame);
  },
  then: actions([Requesting.respond, { request, results, error }]),
});

export const HandleGetPersonalPublicPostsRequest: Sync = (
  {
    request,
    sessionId,
    user: targetUser,
    post,
    results,
    viewer,
    usersList,
    error,
  },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Post/_getPersonalPublicPosts", sessionId, user: targetUser },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // Step 1: Authenticate session
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

    // Step 2: Authorize (viewer must match the requested user)
    const authorized = withViewer.filter((frame) =>
      frame[viewer] === frame[targetUser]
    );

    if (authorized.length === 0) {
      return new Frames({
        ...originalFrame,
        [error]: "Unauthorized",
        [results]: [],
      });
    }

    // Step 3: Success path - prepare and perform query
    const framesWithUsers = authorized.map((frame) => ({
      ...frame,
      [usersList]: [frame[targetUser]],
    }));

    const framesForQuery = new Frames(...framesWithUsers);
    const queried = await framesForQuery.query(
      Post._getPublicPostsForUsers,
      { users: usersList },
      { post },
    );

    const posts = queried.map((frame) => ({ post: frame[post] }));
    const responseFrame = {
      ...originalFrame,
      [results]: posts,
      [error]: null,
    };
    return new Frames(responseFrame);
  },
  then: actions([Requesting.respond, { request, results, error }]),
});
// // --- Get Public Posts Of Users With Session (future follower checks) ---

// export const HandleGetPublicPostsOfUsersRequest: Sync = (
//   { request, sessionId, users, viewer, post, results },
// ) => ({
//   when: actions([
//     Requesting.request,
//     { path: "/Post/_getPublicPostsOfUsers", sessionId, users },
//     { request },
//   ]),
//   where: async (frames) => {
//     // Authenticate the requesting user; future work will validate follower/friend relationship.
//     const withViewer = await frames.query(Sessioning._getUser, { sessionId }, {
//       user: viewer,
//     });

//     if (withViewer.length === 0) {
//       return new Frames();
//     }

//     const originalFrame = withViewer[0];
//     const queried = await withViewer.query(
//       Post._getPublicPostsForUsers,
//       { users },
//       { post },
//     );

//     if (queried.length === 0) {
//       const responseFrame = { ...originalFrame, [results]: [] };
//       return new Frames(responseFrame);
//     }

//     return queried.collectAs([post], results);
//   },
//   then: actions([Requesting.respond, { request, results }]),
// });
