import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to avoid name clashes
const PREFIX = "Friendship";

// Generic types for the concept
type User = ID;
type Friendship = ID;

// Enum for the different friendship statuses
export enum FriendshipStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
}

/**
 * Represents the state of a single friendship in the database.
 * Corresponds to: `a set of Friendships with ...`
 */
export interface FriendshipDoc {
  _id: Friendship;
  requester: User;
  recipient: User;
  status: FriendshipStatus;
  initiatedAt: Date;
}

/**
 * @concept Friendship
 * @purpose to allow users to establish and manage mutual connections
 */
export default class FriendshipConcept {
  public readonly friendships: Collection<FriendshipDoc>;

  constructor(private readonly db: Db) {
    this.friendships = this.db.collection<FriendshipDoc>(
      `${PREFIX}.friendships`,
    );
  }

  /**
   * sendFriendRequest (requester: User, recipient: User): (friendship: Friendship)
   *
   * @requires The `requester` and `recipient` are distinct Users. No `Friendship` exists between these two users (regardless of who is requester or recipient).
   * @effects Creates a new `Friendship`; sets `requester` and `recipient`; sets `status` to `PENDING`; sets `initiatedAt` to the current time; returns the new `friendship`.
   */
  async sendFriendRequest(
    { requester, recipient }: { requester: User; recipient: User },
  ): Promise<{ friendship: FriendshipDoc } | { error: string }> {
    if (requester === recipient) {
      return { error: "Cannot send a friend request to oneself." };
    }

    const existingFriendship = await this.friendships.findOne({
      $or: [
        { requester, recipient },
        { requester: recipient, recipient: requester },
      ],
    });

    if (existingFriendship) {
      return {
        error:
          "A friendship or friend request already exists between these users.",
      };
    }

    const newFriendship: FriendshipDoc = {
      _id: freshID(),
      requester,
      recipient,
      status: FriendshipStatus.PENDING,
      initiatedAt: new Date(),
    };

    const result = await this.friendships.insertOne(newFriendship);
    if (!result.acknowledged) {
      return { error: "Failed to send friend request." };
    }

    return { friendship: newFriendship };
  }

  /**
   * acceptFriendRequest (requester: User, recipient: User)
   *
   * @requires A `Friendship` exists where the `requester` is the requester, the `recipient` is the recipient, and the `status` is `PENDING`.
   * @effects Updates the `status` of the existing `Friendship` to `ACCEPTED`.
   */
  async acceptFriendRequest(
    { requester, recipient }: { requester: User; recipient: User },
  ): Promise<Empty | { error: string }> {
    const result = await this.friendships.updateOne(
      { requester, recipient, status: FriendshipStatus.PENDING },
      { $set: { status: FriendshipStatus.ACCEPTED } },
    );

    if (result.matchedCount === 0) {
      return { error: "No pending friend request found to accept." };
    }

    return {};
  }

  /**
   * declineFriendRequest (requester: User, recipient: User)
   *
   * @requires A `Friendship` exists where the `requester` is the requester, the `recipient` is the recipient, and the `status` is `PENDING`.
   * @effects Updates the `status` of the existing `Friendship` to `DECLINED`.
   */
  async declineFriendRequest(
    { requester, recipient }: { requester: User; recipient: User },
  ): Promise<Empty | { error: string }> {
    const result = await this.friendships.updateOne(
      { requester, recipient, status: FriendshipStatus.PENDING },
      { $set: { status: FriendshipStatus.DECLINED } },
    );

    if (result.matchedCount === 0) {
      return { error: "No pending friend request found to decline." };
    }

    return {};
  }

  /**
   * removeFriend (user1: User, user2: User)
   *
   * @requires A `Friendship` exists between `user1` and `user2` (where one is the requester and the other is the recipient).
   * @effects Removes the `Friendship` object associated with these two users from the state.
   */
  async removeFriend(
    { user1, user2 }: { user1: User; user2: User },
  ): Promise<Empty | { error: string }> {
    const result = await this.friendships.deleteOne({
      $or: [
        { requester: user1, recipient: user2 },
        { requester: user2, recipient: user1 },
      ],
    });

    if (result.deletedCount === 0) {
      return { error: "No friendship found between these users to remove." };
    }

    return {};
  }

  /**
   * _areFriends (user1: User, user2: User): (isFriend: Boolean)
   *
   * @requires The users `user1` and `user2` exist.
   * @effects Returns `true` if there exists a `Friendship` `f` such that `f.status` is `ACCEPTED` and the pair (`f.requester`, `f.recipient`) matches (`user1`, `user2`) in either order. Otherwise returns `false`.
   */
  async _areFriends(
    { user1, user2 }: { user1: User; user2: User },
  ): Promise<{ isFriend: boolean }[]> {
    const friendship = await this.friendships.findOne({
      status: FriendshipStatus.ACCEPTED,
      $or: [
        { requester: user1, recipient: user2 },
        { requester: user2, recipient: user1 },
      ],
    });

    return [{ isFriend: !!friendship }];
  }
  /**
   * removeAllFriendshipsForUser (user: User)
   *
   * @requires true
   * @effects Removes all `Friendship` objects from the state where the given `user` is either the `requester` or the `recipient`, regardless of the friendship's `status`.
   */
  async removeAllFriendshipsForUser(
    { user }: { user: User },
  ): Promise<Empty> {
    await this.friendships.deleteMany({
      $or: [{ requester: user }, { recipient: user }],
    });
    return {};
  }
  /**
   * _getFriends (user: User): (friend: User)
   *
   * @requires The user `user` exists.
   * @effects Returns an array of User IDs for all accepted friendships where the input `user` is either the requester or the recipient.
   */
  async _getFriends(
    { user }: { user: User },
  ): Promise<{ friend: User }[]> {
    const friendships = await this.friendships.find({
      status: FriendshipStatus.ACCEPTED,
      $or: [
        { requester: user },
        { recipient: user },
      ],
    }).toArray();

    const friends = friendships.map((friendship) => {
      const friendId = friendship.requester === user
        ? friendship.recipient
        : friendship.requester;
      return { friend: friendId };
    });

    return friends;
  }
}
