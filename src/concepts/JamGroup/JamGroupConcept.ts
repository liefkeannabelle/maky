import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Generic types used by this concept
type User = ID;
type JamGroup = ID;

// Collection prefix, using the concept name
const PREFIX = "JamGroup" + ".";

/**
 * Represents the state of a single JamGroup.
 * state: a set of JamGroups with
 *   a groupId String (represented by _id)
 *   a name String
 *   a description String
 *   a creator User
 *   a members set of User
 *   a createdAt DateTime
 */
interface JamGroupDoc {
  _id: JamGroup;
  name: string;
  description: string;
  creator: User;
  members: User[];
  createdAt: Date;
}

/**
 * @concept JamGroup
 * @purpose To allow users to create and manage private groups for collaborative jamming.
 */
export default class JamGroupConcept {
  jamGroups: Collection<JamGroupDoc>;

  constructor(private readonly db: Db) {
    this.jamGroups = this.db.collection<JamGroupDoc>(PREFIX + "jamGroups");
  }

  /**
   * createJamGroup (creator: User, name: String, description: String): (group: JamGroup)
   *
   * **requires** The `creator` exists. (Note: Existence of external types like User is checked by syncs, not the concept itself).
   *
   * **effects** Creates a new `JamGroup` with a unique `groupId`; sets `name`, `description`, and `creator`;
   *           adds the `creator` to the `members` set; sets `createdAt` to the current time; returns the new `group`.
   */
  async createJamGroup(
    { creator, name, description }: {
      creator: User;
      name: string;
      description: string;
    },
  ): Promise<{ group: JamGroup }> {
    const newGroup: JamGroupDoc = {
      _id: freshID(),
      name,
      description,
      creator,
      members: [creator], // Creator is the first member
      createdAt: new Date(),
    };

    await this.jamGroups.insertOne(newGroup);
    return { group: newGroup._id };
  }

  /**
   * addMember (group: JamGroup, newMember: User): {success: true} | {error: string}
   *
   * **requires** The `group` exists, and `newMember` exists. The `newMember` is not already in the `members` set.
   *            (Note: The requirement that `newMember` is a friend of an existing member must be enforced by a synchronization rule).
   *
   * **effects** Adds `newMember` to the `members` set of the `group`.
   */
  async addMember(
    { group, newMember }: { group: JamGroup; newMember: User },
  ): Promise<{ success: true } | { error: string }> {
    const result = await this.jamGroups.updateOne(
      { _id: group },
      { $addToSet: { members: newMember } },
    );

    if (result.matchedCount === 0) {
      return { error: `JamGroup with id ${group} not found.` };
    }
    if (result.modifiedCount === 0) {
      return {
        error: `User ${newMember} is already a member of JamGroup ${group}.`,
      };
    }

    return { success: true };
  }

  /**
   * removeUserFromJamGroup (group: JamGroup, user: User): {success: true} | {error: string}
   *
   * **requires** The `group` exists and the `user` is currently in the `members` set.
   *
   * **effects** Removes the `user` from the `members` set of the `group`.
   */
  async removeUserFromJamGroup(
    { group, user }: { group: JamGroup; user: User },
  ): Promise<{ success: true } | { error: string }> {
    const result = await this.jamGroups.updateOne(
      { _id: group },
      { $pull: { members: user } },
    );

    if (result.matchedCount === 0) {
      return { error: `JamGroup with id ${group} not found.` };
    }
    if (result.modifiedCount === 0) {
      return { error: `User ${user} was not a member of JamGroup ${group}.` };
    }

    return { success: true };
  }

  /**
   * disbandJamGroup (group: JamGroup, requester: User): {success: true} | {error: string}
   *
   * **requires** The `group` exists. The `requester` is the `creator` of the `group`.
   *
   * **effects** Removes the `group` and all its associated data from the state.
   */
  async disbandJamGroup(
    { group, requester }: { group: JamGroup; requester: User },
  ): Promise<{ success: true } | { error: string }> {
    const result = await this.jamGroups.deleteOne({
      _id: group,
      creator: requester,
    });

    if (result.deletedCount === 0) {
      return {
        error: "JamGroup not found or user is not the creator",
      };
    }

    return { success: true };
  }

  /**
   * _getJamGroupsForUser (user: User): (group: JamGroupDoc)
   *
   * **requires** The `user` exists.
   * **effects** Returns all jam groups where the user is a member.
   */
  async _getJamGroupsForUser(
    { user }: { user: User },
  ): Promise<JamGroupDoc[]> {
    const groups = await this.jamGroups.find({ members: user }).sort({
      createdAt: -1,
    }).toArray();
    return groups;
  }

  /**
   * _getJamGroupById (group: JamGroup): (group: JamGroupDoc)
   *
   * **requires** true
   * **effects** Returns the jam group with the given id, or an empty array if not found.
   */
  async _getJamGroupById(
    { group }: { group: JamGroup },
  ): Promise<JamGroupDoc[]> {
    const foundGroup = await this.jamGroups.findOne({ _id: group });
    return foundGroup ? [foundGroup] : [];
  }
}
