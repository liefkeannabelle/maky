import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
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
  ): Promise<Empty | { error: string }> {
    const result = await this.comments.deleteOne({ _id: comment, author });

    if (result.deletedCount === 0) {
      return { error: "Comment not found or user is not the author" };
    }

    return {};
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
  ): Promise<Empty | { error: string }> {
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

    return {};
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
}
