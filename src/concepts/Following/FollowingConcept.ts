import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to avoid name clashes
const PREFIX = "Following";

// Generic types for the concept
type User = ID;
type Follow = ID;

/**
 * Represents the state of a follow relationship in the database.
 * Corresponds to: `a set of Follows with ...`
 */
export interface FollowDoc {
  _id: Follow;
  follower: User;
  followed: User;
  followedAt: Date;
}

/**
 * @concept Following
 * @purpose to allow users to subscribe to content and updates from other users
 */
export default class FollowingConcept {
  public readonly follows: Collection<FollowDoc>;

  constructor(private readonly db: Db) {
    this.follows = this.db.collection<FollowDoc>(`${PREFIX}.follows`);
  }

  /**
   * followUser (follower: User, followed: User): (follow: Follow)
   *
   * @requires The `follower` and `followed` are distinct Users. The `follower` is not currently following the `followed` (no `Follow` object exists for this pair).
   * @effects Creates a new `Follow` object; sets `follower` and `followed`; sets `followedAt` to the current time; returns the new `follow` object.
   */
  async followUser(
    { follower, followed }: { follower: User; followed: User },
  ): Promise<{ follow: FollowDoc } | { error: string }> {
    // Requires: `follower` and `followed` are distinct
    if (follower === followed) {
      return { error: "Users cannot follow themselves." };
    }

    // Requires: `follower` is not currently following `followed`
    const existingFollow = await this.follows.findOne({ follower, followed });
    if (existingFollow) {
      return { error: "User is already following this user." };
    }

    // Effects: Create a new Follow object
    const newFollow: FollowDoc = {
      _id: freshID(),
      follower,
      followed,
      followedAt: new Date(),
    };

    // Effects: Persist the new Follow object
    const result = await this.follows.insertOne(newFollow);
    if (!result.acknowledged) {
      return { error: "Failed to create follow relationship." };
    }

    // Effects: Return the new follow object
    return { follow: newFollow };
  }

  /**
   * unfollowUser (follower: User, followed: User)
   *
   * @requires A `Follow` object exists where `follower` is the follower and `followed` is the followed user.
   * @effects Removes the matching `Follow` object from the state.
   */
  async unfollowUser(
    { follower, followed }: { follower: User; followed: User },
  ): Promise<Empty | { error: string }> {
    // Effects: Removes the matching `Follow` object
    const result = await this.follows.deleteOne({ follower, followed });

    // Requires check: if nothing was deleted, the follow didn't exist
    if (result.deletedCount === 0) {
      return { error: "Follow relationship not found." };
    }

    return {};
  }

  /**
   * _getFollowers (user: User): (followers: User[])
   * @requires user exists
   * @effects returns a set of all users following the given user
   */
  async _getFollowers(
    { user }: { user: User },
  ): Promise<{ followers: User[] }> {
    const followersDocs = await this.follows.find({ followed: user }).toArray();
    const followers = followersDocs.map((doc) => doc.follower);
    return { followers };
  }

  /**
   * _getFollowing (user: User): (following: User[])
   * @requires user exists
   * @effects returns a set of all users the given user is following
   */
  async _getFollowing(
    { user }: { user: User },
  ): Promise<{ following: User[] }> {
    const followingDocs = await this.follows.find({ follower: user }).toArray();
    const following = followingDocs.map((doc) => doc.followed);
    return { following };
  }

  /**
   * _isFollowing (follower: User, followed: User): (isFollowing: boolean)
   * @requires follower and followed users exist
   * @effects returns true if the follower is following the followed user, false otherwise
   */
  async _isFollowing(
    { follower, followed }: { follower: User; followed: User },
  ): Promise<{ isFollowing: boolean }> {
    const follow = await this.follows.findOne({ follower, followed });
    return { isFollowing: !!follow };
  }
}
