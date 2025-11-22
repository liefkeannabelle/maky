import { Collection, Db, UpdateFilter } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix for this concept
const PREFIX = "Post" + ".";

// Generic types from spec: Post[User, Item]
type User = ID;
type Item = ID;

// PostType enum from spec
type PostType = "PROGRESS" | "GENERAL";

/**
 * a set of Posts with
 *  a postId String (becomes _id)
 *  an author User
 *  a content String
 *  an optional item Item
 *  a postType of PROGRESS or GENERAL
 *  a createdAt DateTime
 *  an optional editedAt DateTime
 */
interface PostDoc {
  _id: ID;
  author: User;
  content: string;
  item?: Item;
  postType: PostType;
  createdAt: Date;
  editedAt?: Date;
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
   * createPost (author: User, content: String, postType: PostType, item: optional Item): (postId: String)
   *
   * **requires** The `author` (User) exists. If `item` is provided, the `item` must exist.
   * **effects** Creates a new `Post` with a unique `postId`; sets `author`, `content`, `postType`, `item` (if provided), and `createdAt` to the current DateTime; returns the `postId`.
   */
  async createPost(
    { author, content, postType, item }: {
      author: User;
      content: string;
      postType: PostType;
      item?: Item;
    },
  ): Promise<{ postId: ID } | { error: string }> {
    if (postType !== "PROGRESS" && postType !== "GENERAL") {
      return {
        error: "Invalid postType specified. Must be 'PROGRESS' or 'GENERAL'.",
      };
    }

    const post: PostDoc = {
      _id: freshID(),
      author,
      content,
      postType,
      createdAt: new Date(),
    };

    if (item) {
      post.item = item;
    }

    await this.posts.insertOne(post);
    return { postId: post._id };
  }

  /**
   * deletePost (postId: String, deleter: User)
   *
   * **requires** The `postId` exists. The `deleter` (User) is the `author` of the `Post`.
   * **effects** Removes the `Post` identified by `postId` from the state.
   */
  async deletePost(
    { postId, deleter }: { postId: ID; deleter: User },
  ): Promise<Empty | { error: string }> {
    const post = await this.posts.findOne({ _id: postId });
    if (!post) {
      return { error: "Post not found" };
    }

    if (post.author !== deleter) {
      return { error: "Permission denied: user is not the author of the post" };
    }

    await this.posts.deleteOne({ _id: postId });
    return {};
  }

  /**
   * editPost (postId: String, editor: User, newContent: String, newItem: optional Item, newPostType: optional PostType)
   *
   * **requires** The `postId` exists. The `editor` (User) is the `author` of the `Post`.
   * **effects** Updates the `content` of the `Post` identified by `postId` to `newContent`. Optionally updates `item` to `newItem` and `postType` to `newPostType`. Sets `editedAt` to the current DateTime.
   */
  async editPost(
    { postId, editor, newContent, newItem, newPostType }: {
      postId: ID;
      editor: User;
      newContent: string;
      newItem?: Item;
      newPostType?: PostType;
    },
  ): Promise<Empty | { error: string }> {
    const post = await this.posts.findOne({ _id: postId });
    if (!post) {
      return { error: "Post not found" };
    }

    if (post.author !== editor) {
      return { error: "Permission denied: user is not the author of the post" };
    }

    if (
      newPostType && newPostType !== "PROGRESS" && newPostType !== "GENERAL"
    ) {
      return {
        error: "Invalid postType specified. Must be 'PROGRESS' or 'GENERAL'.",
      };
    }

    const updates: Partial<PostDoc> = {
      content: newContent,
      editedAt: new Date(),
    };

    if (newPostType !== undefined) {
      updates.postType = newPostType;
    }

    const updateQuery: UpdateFilter<PostDoc> = { $set: updates };

    // The `newItem` is optional. If provided, it sets/updates the item.
    // If we wanted to support removing an item, the type might be `newItem?: Item | null`.
    // With the current signature, we only update if it's provided.
    if (newItem !== undefined) {
      (updateQuery.$set as Partial<PostDoc>).item = newItem;
    }

    await this.posts.updateOne({ _id: postId }, updateQuery);

    return {};
  }
}
