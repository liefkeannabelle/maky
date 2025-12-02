import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix for this concept
const PREFIX = "Comment" + ".";

// Generic types of this concept
type User = ID;
type Post = ID;
type Comment = ID;

/**
 * a set of Comments with
 *  a commentId String (represented by _id)
 *  a post Post
 *  an author User
 *  a content String
 *  a createdAt DateTime
 *  an optional lastEditedAt DateTime
 */
interface CommentDoc {
  _id: Comment;
  post: Post;
  author: User;
  content: string;
  createdAt: Date;
  lastEditedAt?: Date;
}

/**
 * @concept Comment
 * @purpose to allow users to interact with posts
 */
export default class CommentConcept {
  comments: Collection<CommentDoc>;

  constructor(private readonly db: Db) {
    this.comments = this.db.collection(PREFIX + "comments");
  }

  /**
   * addCommentToPost (post: Post, author: User, content: String): (comment: Comment)
   *
   * **requires** The `post` exists and the `author` exists.
   * **effects** Creates a new `Comment` with a unique `commentId`, links it to the `post` and `author`, sets its `content` and `createdAt` timestamp; adds it to the comments set of `post`; returns the new `comment`.
   */
  async addCommentToPost(
    { post, author, content }: { post: Post; author: User; content: string },
  ): Promise<{ comment: Comment } | { error: string }> {
    if (!content.trim()) {
      return { error: "Comment content cannot be empty" };
    }

    const newComment: CommentDoc = {
      _id: freshID(),
      post,
      author,
      content,
      createdAt: new Date(),
    };

    await this.comments.insertOne(newComment);
    return { comment: newComment._id };
  }

  /**
   * deleteComment (comment: Comment, author: User)
   *
   * **requires** The `comment` exists and its `author` matches the provided `author`.
   * **effects** Removes the `comment` from the set of `Comments`.
   */
  async deleteComment(
    { comment, author }: { comment: Comment; author: User },
  ): Promise<{ success: true } | { error: string }> {
    const result = await this.comments.deleteOne({ _id: comment, author });

    if (result.deletedCount === 0) {
      return { error: "Comment not found or user is not the author" };
    }

    return { success: true };
  }

  /**
   * editComment (comment: Comment, author: User, newContent: String)
   *
   * **requires** The `comment` exists and its `author` matches the provided `author`.
   * **effects** Updates the `content` of the `comment` to `newContent` and sets `lastEditedAt` to the current timestamp.
   */
  async editComment(
    { comment, author, newContent }: {
      comment: Comment;
      author: User;
      newContent: string;
    },
  ): Promise<{ success: true } | { error: string }> {
    if (!newContent.trim()) {
      return { error: "Comment content cannot be empty" };
    }

    const result = await this.comments.updateOne(
      { _id: comment, author },
      { $set: { content: newContent, lastEditedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      return { error: "Comment not found or user is not the author" };
    }

    return { success: true };
  }

  /**
   * _getCommentsForPost (post: Post): (comments: CommentDoc[])
   *
   * **requires** The `post` exists.
   * **effects** Returns all comments associated with the given `post`, ordered by creation date.
   */
  async _getCommentsForPost(
    { post }: { post: Post },
  ): Promise<{ comments: CommentDoc[] }> {
    const comments = await this.comments.find({ post }).sort({ createdAt: 1 })
      .toArray();
    return { comments };
  }

  /**
   * _getCommentById (comment: Comment): (comment: CommentDoc)
   *
   * **requires** The `comment` exists.
   * **effects** Returns the comment document with the given id.
   */
  async _getCommentById(
    { comment }: { comment: Comment },
  ): Promise<{ comment: CommentDoc | null }> {
    const foundComment = await this.comments.findOne({ _id: comment });
    return { comment: foundComment };
  }

  /**
   * removeAllCommentsFromPost (post: Post)
   *
   * **requires** The `post` exists.
   * **effects** Removes all `Comment`s associated with the given `post` from the state.
   */
  async removeAllCommentsFromPost(
    { post }: { post: Post },
  ): Promise<{ success: true } | { error: string }> {
    await this.comments.deleteMany({ post });
    return { success: true };
  }

  /**
   * removeAllCommentsForUser (user: User)
   *
   * **requires** The `user` exists.
   * **effects** Removes all `Comment`s authored by the given `user` from the state; returns `success: true`.
   */
  async removeAllCommentsForUser(
    { user }: { user: User },
  ): Promise<{ success: true } | { error: string }> {
    await this.comments.deleteMany({ author: user });
    return { success: true };
  }
  /**
   * _getCommentsForPostId (post: Post): ([{ comments: {commentId: Comment, content: String, author: User}[] }])
   *
   * **requires** The `post` exists.
   * **effects** Returns a single-element array, where the first element wraps the list of
   * simplified comment objects (`{ commentId, content, author }`) for the given `post`.
   */
  async _getCommentsForPostId(
    { post }: { post: Post },
  ): Promise<
    Array<{ comments: { commentId: Comment; content: string; author: User }[] }>
  > {
    const comments = await this.comments
      .find({ post })
      .project<{ _id: Comment; content: string; author: User }>({
        _id: 1,
        content: 1,
        author: 1,
      })
      .sort({ createdAt: 1 })
      .toArray();

    const simplified = comments.map(({ _id, content, author }) => ({
      commentId: _id,
      content,
      author,
    }));

    return [{ comments: simplified }];
  }
}
