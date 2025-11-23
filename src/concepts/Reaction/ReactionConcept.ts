import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to avoid name clashes
const PREFIX = "Reaction";

// Generic types for the concept
type User = ID;
type Post = ID;
type Reaction = ID;

// Enum for the different types of reactions
export enum ReactionType {
  LIKE = "LIKE",
  LOVE = "LOVE",
  CELEBRATE = "CELEBRATE",
}

/**
 * Represents the state of a single reaction in the database.
 * Corresponds to: `a set of Reactions with ...`
 */
export interface ReactionDoc {
  _id: Reaction; // Corresponds to reactionId
  user: User;
  post: Post;
  type: ReactionType;
  createdAt: Date;
}

/**
 * @concept Reaction
 * @purpose to allow users to express positive sentiment on posts
 */
export default class ReactionConcept {
  public readonly reactions: Collection<ReactionDoc>;

  constructor(private readonly db: Db) {
    this.reactions = this.db.collection<ReactionDoc>(`${PREFIX}.reactions`);
  }

  /**
   * addReactionToPost (user: User, post: Post, type: ReactionType): (reaction: ReactionDoc)
   *
   * @requires The `user` and `post` exist. No `Reaction` already exists for this specific combination of `user` and `post`.
   * @effects Creates a new `Reaction` with a unique `reactionId`; sets the `user`, `post`, `type`, and sets `createdAt` to the current time; returns the new `reaction`.
   */
  async addReactionToPost(
    { user, post, type }: { user: User; post: Post; type: ReactionType },
  ): Promise<{ reaction: ReactionDoc } | { error: string }> {
    const existingReaction = await this.reactions.findOne({ user, post });
    if (existingReaction) {
      return { error: "Reaction already exists for this user and post." };
    }

    const newReaction: ReactionDoc = {
      _id: freshID(),
      user,
      post,
      type,
      createdAt: new Date(),
    };

    const result = await this.reactions.insertOne(newReaction);
    if (!result.acknowledged) {
      return { error: "Failed to add reaction." };
    }

    return { reaction: newReaction };
  }

  /**
   * changeReactionType (user: User, post: Post, newType: ReactionType)
   *
   * @requires A `Reaction` exists for this user and post.
   * @effects Updates the reaction’s `type` to `newType`.
   */
  async changeReactionType(
    { user, post, newType }: { user: User; post: Post; newType: ReactionType },
  ): Promise<Empty | { error: string }> {
    const result = await this.reactions.updateOne(
      { user, post },
      { $set: { type: newType } },
    );

    if (result.matchedCount === 0) {
      return { error: "Reaction not found for this user and post." };
    }

    return {};
  }

  /**
   * removeReactionFromPost (user: User, post: Post)
   *
   * @requires A `Reaction` exists associated with the given `user` and `post`.
   * @effects Removes the matching `Reaction` from the state.
   */
  async removeReactionFromPost(
    { user, post }: { user: User; post: Post },
  ): Promise<Empty | { error: string }> {
    const result = await this.reactions.deleteOne({ user, post });

    if (result.deletedCount === 0) {
      return { error: "Reaction not found for this user and post." };
    }

    return {};
  }

  /**
   * removeAllReactionsFromPost (post: Post)
   *
   * @requires The `post` exists.
   * @effects Removes all `Reaction`s associated with the given `post` from the state.
   */
  async removeAllReactionsFromPost(
    { post }: { post: Post },
  ): Promise<Empty | { error: string }> {
    await this.reactions.deleteMany({ post });
    return {};
  }

  /**
   * _getReactionsForPostId (post: Post): (type: ReactionType, count: number)
   *
   * @requires The `post` exists.
   * @effects Returns an array of objects, each containing a reaction type and its total count for the given `post`. Includes types with a count of 0.
   */
  async _getReactionsForPostId(
    { post }: { post: Post },
  ): Promise<{ type: ReactionType; count: number }[]> {
    // Use MongoDB's aggregation pipeline to group reactions by type and count them
    const pipeline = [
      { $match: { post } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ];

    const aggregationResult = await this.reactions.aggregate(pipeline)
      .toArray() as { _id: ReactionType; count: number }[];

    // Create a map of the results for efficient lookup
    const countsMap = new Map<ReactionType, number>();
    for (const result of aggregationResult) {
      countsMap.set(result._id, result.count);
    }

    // Build the final array, ensuring all reaction types are included, defaulting to a count of 0
    const finalCounts: { type: ReactionType; count: number }[] = [];
    for (const type of Object.values(ReactionType)) {
      finalCounts.push({
        type: type,
        count: countsMap.get(type) || 0,
      });
    }

    return finalCounts;
  }
}
