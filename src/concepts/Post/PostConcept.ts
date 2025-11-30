import { Collection, Db, UpdateFilter } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix for this concept
const PREFIX = "Post" + ".";

// Generic types from spec: Post[User, Item]
type User = ID;
type Item = ID;

// PostType enum from spec
type PostType = "PROGRESS" | "GENERAL";
type PostVisibility = "PUBLIC" | "PRIVATE";

const UNDEFINED_SENTINEL = "UNDEFINED" as const;
type MaybeProvided<T> = T | typeof UNDEFINED_SENTINEL;

const isValidVisibility = (value: unknown): value is PostVisibility =>
  value === "PUBLIC" || value === "PRIVATE";

/**
 * a set of Posts with
 *  a postId String (becomes _id)
 *  an author User
 *  a content String
 *  items Item[]
 *  a postType of PROGRESS or GENERAL
 *  a createdAt DateTime
 *  an optional editedAt DateTime
 *  a visibility PrivacyLevel
 */
interface PostDoc {
  _id: ID;
  author: User;
  content: string;
  items: Item[];
  postType: PostType;
  createdAt: Date;
  editedAt?: Date;
  visibility: PostVisibility;
}

/**
 * @concept Post
 * @purpose to allow users to share their learning progress and musical activities, fostering community and motivation
 */
export default class PostConcept {
  posts: Collection<PostDoc>;

  constructor(private readonly db: Db) {
    this.posts = this.db.collection(PREFIX + "posts");
  }

  /**
   * createPost (author: User, content: String, postType: PostType, items: List<Item>, visibility: PostVisibility): (postId: String)
   *
   * **requires** The `author` (User) exists. Every `item` in `items` must exist. `visibility` must be either `PUBLIC` or `PRIVATE`.
   * **effects** Creates a new `Post` with a unique `postId`; sets `author`, `content`, `postType`, `items`, `visibility`, and `createdAt` to the current DateTime; returns the `postId`.
   */
  async createPost(
    { author, content, postType, items, visibility }: {
      author: User;
      content: string;
      postType: PostType;
      items: Item[];
      visibility: PostVisibility;
    },
  ): Promise<{ postId: ID } | { error: string }> {
    if (postType !== "PROGRESS" && postType !== "GENERAL") {
      return {
        error: "Invalid postType specified. Must be 'PROGRESS' or 'GENERAL'.",
      };
    }

    if (!isValidVisibility(visibility)) {
      return {
        error: "Invalid visibility specified. Must be 'PUBLIC' or 'PRIVATE'.",
      };
    }

    const post: PostDoc = {
      _id: freshID(),
      author,
      content,
      items,
      postType,
      createdAt: new Date(),
      visibility,
    };

    await this.posts.insertOne(post);
    return { postId: post._id };
  }

  /**
   * deletePost (postId: String, deleter: User)
   *
   * **requires** The `postId` exists. The `deleter` (User) is the `author` of the `Post`.
   * **effects** Removes the `Post` identified by `postId` from the state and returns `success: true`.
   */
  async deletePost(
    { postId, deleter }: { postId: ID; deleter: User },
  ): Promise<{ success: true } | { error: string }> {
    const post = await this.posts.findOne({ _id: postId });
    if (!post) {
      return { error: "Post not found" };
    }

    if (post.author !== deleter) {
      return { error: "Permission denied: user is not the author of the post" };
    }

    await this.posts.deleteOne({ _id: postId });
    return { success: true };
  }

  /**
   * editPost (postId: String, editor: User, newContent: String, newItems: List<Item> or "UNDEFINED", newPostType: PostType or "UNDEFINED")
   *
   * **requires** The `postId` exists. The `editor` (User) is the `author` of the `Post`. Callers must always provide `newItems` and `newPostType`; pass the literal string "UNDEFINED" to leave either value unchanged.
   * **effects** Updates the `content` of the `Post` identified by `postId` to `newContent`. Replaces `items` with `newItems` unless it is "UNDEFINED", and updates `postType` to `newPostType` unless it is "UNDEFINED". Sets `editedAt` to the current DateTime and returns `success: true`.
   */
  async editPost(
    { postId, editor, newContent, newItems, newPostType }: {
      postId: ID;
      editor: User;
      newContent: string;
      newItems: MaybeProvided<Item[]>;
      newPostType: MaybeProvided<PostType>;
    },
  ): Promise<{ success: true } | { error: string }> {
    const post = await this.posts.findOne({ _id: postId });
    if (!post) {
      return { error: "Post not found" };
    }

    if (post.author !== editor) {
      return { error: "Permission denied: user is not the author of the post" };
    }

    const resolvedPostType = newPostType === UNDEFINED_SENTINEL
      ? undefined
      : newPostType;

    if (
      resolvedPostType !== undefined &&
      resolvedPostType !== "PROGRESS" &&
      resolvedPostType !== "GENERAL"
    ) {
      return {
        error: "Invalid postType specified. Must be 'PROGRESS' or 'GENERAL'.",
      };
    }

    const updates: Partial<PostDoc> = {
      content: newContent,
      editedAt: new Date(),
    };

    if (resolvedPostType !== undefined) {
      updates.postType = resolvedPostType;
    }

    const updateQuery: UpdateFilter<PostDoc> = { $set: updates };

    const resolvedItems = newItems === UNDEFINED_SENTINEL
      ? undefined
      : newItems;

    // The `newItems` array is provided on every call; "UNDEFINED" indicates no change.
    if (resolvedItems !== undefined) {
      (updateQuery.$set as Partial<PostDoc>).items = resolvedItems;
    }

    await this.posts.updateOne({ _id: postId }, updateQuery);

    return { success: true };
  }

  /**
   * editPostVisibility (postId: String, editor: User, newVisibility: PostVisibility)
   *
   * **requires** The `postId` exists. The `editor` is the author of the `Post`. `newVisibility` must be either `PUBLIC` or `PRIVATE`.
   * **effects** Updates the `visibility` of the `Post` to `newVisibility` and sets `editedAt` to the current DateTime.
   */
  async editPostVisibility(
    { postId, editor, newVisibility }: {
      postId: ID;
      editor: User;
      newVisibility: PostVisibility;
    },
  ): Promise<{ success: true } | { error: string }> {
    console.error("HELLO[editPostVisibility] invoked", {
      postId,
      editor,
      newVisibility,
    });
    if (!isValidVisibility(newVisibility)) {
      return {
        error: "Invalid visibility specified. Must be 'PUBLIC' or 'PRIVATE'.",
      };
    }

    const post = await this.posts.findOne({ _id: postId });
    if (!post) {
      return { error: "Post not found" };
    }

    if (post.author !== editor) {
      console.error(
        "[editPostVisibility] author mismatch",
        { postAuthor: post.author, editor },
      );
      return {
        error: "Permission denied: user is not the author of the post",
      };
    }

    console.error(
      "[editPostVisibility] author match",
      { postAuthor: post.author, editor },
    );

    await this.posts.updateOne(
      { _id: postId },
      { $set: { visibility: newVisibility, editedAt: new Date() } },
    );

    console.error(
      "[editPostVisibility] updated visibility",
      { postId, editor, newVisibility },
    );

    return { success: true };
  }

  /**
   * _getPostsForUser (user: User): (post: PostDoc)
   *
   * **requires** The `user` exists.
   * **effects** Returns all posts authored by the given `user`, ordered by creation date (newest first).
   */
  async _getPostsForUser(
    { user }: { user: User },
  ): Promise<{ post: PostDoc }[]> {
    const posts = await this.posts.find({ author: user })
      .sort({ createdAt: -1 })
      .toArray();
    return posts.map((post) => ({ post }));
  }

  /**
   * _getPublicPostsForUser (user: User): (post: PostDoc)
   *
   * **requires** The `user` exists.
   * **effects** Returns all `PUBLIC` posts authored by the given `user`, ordered by creation date (newest first).
   */
  async _getPublicPostsForUser(
    { user }: { user: User },
  ): Promise<{ post: PostDoc }[]> {
    const posts = await this.posts.find({ author: user, visibility: "PUBLIC" })
      .sort({ createdAt: -1 })
      .toArray();
    return posts.map((post) => ({ post }));
  }

  /**
   * _getPrivatePostsForUser (user: User): (post: PostDoc)
   *
   * **requires** The `user` exists.
   * **effects** Returns all `PRIVATE` posts authored by the given `user`, ordered by creation date (newest first).
   */
  async _getPrivatePostsForUser(
    { user }: { user: User },
  ): Promise<{ post: PostDoc }[]> {
    const posts = await this.posts.find({ author: user, visibility: "PRIVATE" })
      .sort({ createdAt: -1 })
      .toArray();
    return posts.map((post) => ({ post }));
  }

  /**
   * _getPostsForUsers (users: set of User): (post: PostDoc)
   *
   * **requires** All `users` exist.
   * **effects** Returns all posts authored by any of the given `users`, ordered by creation date (newest first).
   */
  async _getPostsForUsers(
    { users }: { users: User[] },
  ): Promise<{ post: PostDoc }[]> {
    if (!users || users.length === 0) {
      return [];
    }
    const posts = await this.posts.find({ author: { $in: users } })
      .sort({ createdAt: -1 })
      .toArray();
    return posts.map((post) => ({ post }));
  }

  /**
   * _getPublicPostsForUsers (users: set of User): (post: PostDoc)
   *
   * **requires** All `users` exist.
   * **effects** Returns all PUBLIC posts authored by any of the given `users`, ordered by creation date (newest first).
   */
  async _getPublicPostsForUsers(
    { users }: { users: User[] },
  ): Promise<{ post: PostDoc }[]> {
    if (!users || users.length === 0) {
      return [];
    }
    const posts = await this.posts.find({
      author: { $in: users },
      visibility: "PUBLIC",
    })
      .sort({ createdAt: -1 })
      .toArray();
    return posts.map((post) => ({ post }));
  }

  /**
   * removeAllPostsForUser (user: User)
   *
   * **requires** The `user` exists.
   * **effects** Removes all `Post`s authored by the given `user` from the state; returns `success: true` and `postIds` array of deleted post IDs.
   */
  async removeAllPostsForUser(
    { user }: { user: User },
  ): Promise<{ success: true; postIds: ID[] } | { error: string }> {
    // First, get all post IDs before deletion so they can be used for cascade deletion
    const postsToDelete = await this.posts.find({ author: user })
      .project({ _id: 1 })
      .toArray();
    const postIds = postsToDelete.map((post) => post._id);

    // Then delete all posts
    await this.posts.deleteMany({ author: user });
    return { success: true, postIds };
  }
}
