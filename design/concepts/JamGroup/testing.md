[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# implement: tests for JamGroup


# response:

Here is the implementation of the `JamGroupConcept` with added queries for testing, followed by the test file and a trace of the principle.

# file: src/concepts/JamGroup/JamGroupConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
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
  async createJamGroup({ creator, name, description }: { creator: User; name: string; description: string }): Promise<{ group: JamGroup }> {
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
   * addMember (group: JamGroup, newMember: User): Empty | {error: string}
   *
   * **requires** The `group` exists, and `newMember` exists. The `newMember` is not already in the `members` set.
   *            (Note: The requirement that `newMember` is a friend of an existing member must be enforced by a synchronization rule).
   *
   * **effects** Adds `newMember` to the `members` set of the `group`.
   */
  async addMember({ group, newMember }: { group: JamGroup; newMember: User }): Promise<Empty | { error: string }> {
    const result = await this.jamGroups.updateOne(
      { _id: group },
      { $addToSet: { members: newMember } },
    );

    if (result.matchedCount === 0) {
      return { error: `JamGroup with id ${group} not found.` };
    }
    if (result.modifiedCount === 0) {
      return { error: `User ${newMember} is already a member of JamGroup ${group}.` };
    }

    return {};
  }

  /**
   * removeUserFromJamGroup (group: JamGroup, user: User): Empty | {error: string}
   *
   * **requires** The `group` exists and the `user` is currently in the `members` set.
   *
   * **effects** Removes the `user` from the `members` set of the `group`.
   */
  async removeUserFromJamGroup({ group, user }: { group: JamGroup; user: User }): Promise<Empty | { error: string }> {
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

    return {};
  }

  /**
   * disbandJamGroup (group: JamGroup, requester: User): Empty | {error: string}
   *
   * **requires** The `group` exists. The `requester` is the `creator` of the `group`.
   *
   * **effects** Removes the `group` and all its associated data from the state.
   */
  async disbandJamGroup({ group, requester }: { group: JamGroup; requester: User }): Promise<Empty | { error: string }> {
    const result = await this.jamGroups.deleteOne({
      _id: group,
      creator: requester,
    });

    if (result.deletedCount === 0) {
      // We check if the group exists to give a more specific error.
      const groupDoc = await this.jamGroups.findOne({ _id: group });
      if (!groupDoc) {
        return { error: `JamGroup with id ${group} not found.` };
      }
      if (groupDoc.creator !== requester) {
        return { error: `User ${requester} is not the creator of JamGroup ${group}.` };
      }
      // This case should theoretically not be reached if the above two cover all failures.
      return { error: "Failed to disband JamGroup." };
    }

    return {};
  }

  // ========== QUERIES (for testing and application use) ==========

  /**
   * _getGroupById (group: JamGroup): (groupDoc: JamGroupDoc)
   *
   * **requires** The `group` exists.
   * **effects** Returns the full document for the specified `group`.
   */
  async _getGroupById({ group }: { group: JamGroup }): Promise<{ groupDoc: JamGroupDoc }[]> {
    const doc = await this.jamGroups.findOne({ _id: group });
    return doc ? [{ groupDoc: doc }] : [];
  }

  /**
   * _getMembers (group: JamGroup): (member: User)
   *
   * **requires** The `group` exists.
   * **effects** Returns each member of the specified `group`.
   */
  async _getMembers({ group }: { group: JamGroup }): Promise<{ member: User }[]> {
    const groupDoc = await this.jamGroups.findOne({ _id: group }, { projection: { members: 1 } });
    return groupDoc ? groupDoc.members.map((m) => ({ member: m })) : [];
  }
}
```

# file: src/concepts/JamGroup/JamGroupConcept.test.ts

```typescript
import { assertEquals, assert, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import JamGroupConcept from "./JamGroupConcept.ts";
import { ID } from "@utils/types.ts";

// Mock data
const userAlice = "user:alice" as ID;
const userBob = "user:bob" as ID;
const userCharlie = "user:charlie" as ID;
const nonExistentGroup = "group:nonexistent" as ID;

Deno.test("JamGroupConcept: Action `createJamGroup`", async (t) => {
  const [db, client] = await testDb();
  const jamGroup = new JamGroupConcept(db);

  await t.step("effects: should create a group with correct initial state", async () => {
    console.log("  - Creating a group named 'The Jazz Cats' with creator Alice.");
    const result = await jamGroup.createJamGroup({ creator: userAlice, name: "The Jazz Cats", description: "Cool cats playing jazz" });
    assertExists(result.group);
    const groupId = result.group;

    console.log("  - Verifying the created group's state.");
    const [retrieved] = await jamGroup._getGroupById({ group: groupId });
    assertExists(retrieved);
    const groupDoc = retrieved.groupDoc;

    assertEquals(groupDoc.name, "The Jazz Cats");
    assertEquals(groupDoc.creator, userAlice);
    assertEquals(groupDoc.members.length, 1);
    assertEquals(groupDoc.members[0], userAlice);
  });

  await client.close();
});

Deno.test("JamGroupConcept: Action `addMember`", async (t) => {
  const [db, client] = await testDb();
  const jamGroup = new JamGroupConcept(db);

  // Setup: create a group first
  const { group: groupId } = await jamGroup.createJamGroup({ creator: userAlice, name: "The Rockers", description: "Rock and roll!" });

  await t.step("effects: should add a new member successfully", async () => {
    console.log(`  - Adding Bob to group ${groupId}.`);
    const result = await jamGroup.addMember({ group: groupId, newMember: userBob });
    assertEquals(result, {});

    console.log("  - Verifying Bob is now a member.");
    const membersResult = await jamGroup._getMembers({ group: groupId });
    const members = membersResult.map((m) => m.member);
    assertEquals(members.length, 2);
    assert(members.includes(userAlice));
    assert(members.includes(userBob));
  });

  await t.step("requires: should return error for non-existent group", async () => {
    console.log("  - Attempting to add Charlie to a non-existent group.");
    const result = await jamGroup.addMember({ group: nonExistentGroup, newMember: userCharlie });
    assert("error" in result, "Expected an error for non-existent group.");
    assertEquals(result.error, `JamGroup with id ${nonExistentGroup} not found.`);
  });

  await t.step("requires: should return error if member already exists", async () => {
    console.log(`  - Attempting to add Bob to group ${groupId} again.`);
    const result = await jamGroup.addMember({ group: groupId, newMember: userBob });
    assert("error" in result, "Expected an error for duplicate member.");
    assertEquals(result.error, `User ${userBob} is already a member of JamGroup ${groupId}.`);
  });

  await client.close();
});

Deno.test("JamGroupConcept: Action `removeUserFromJamGroup`", async (t) => {
  const [db, client] = await testDb();
  const jamGroup = new JamGroupConcept(db);

  // Setup: create a group and add a member
  const { group: groupId } = await jamGroup.createJamGroup({ creator: userAlice, name: "The Funkmasters", description: "All about funk" });
  await jamGroup.addMember({ group: groupId, newMember: userBob });

  await t.step("effects: should remove an existing member", async () => {
    console.log(`  - Removing Bob from group ${groupId}.`);
    const result = await jamGroup.removeUserFromJamGroup({ group: groupId, user: userBob });
    assertEquals(result, {});

    console.log("  - Verifying Bob is no longer a member.");
    const membersResult = await jamGroup._getMembers({ group: groupId });
    const members = membersResult.map((m) => m.member);
    assertEquals(members.length, 1);
    assertEquals(members[0], userAlice);
  });

  await t.step("requires: should return error for non-existent group", async () => {
    console.log("  - Attempting to remove a user from a non-existent group.");
    const result = await jamGroup.removeUserFromJamGroup({ group: nonExistentGroup, user: userAlice });
    assert("error" in result);
    assertEquals(result.error, `JamGroup with id ${nonExistentGroup} not found.`);
  });

  await t.step("requires: should return error if user is not a member", async () => {
    console.log(`  - Attempting to remove Charlie (not a member) from group ${groupId}.`);
    const result = await jamGroup.removeUserFromJamGroup({ group: groupId, user: userCharlie });
    assert("error" in result);
    assertEquals(result.error, `User ${userCharlie} was not a member of JamGroup ${groupId}.`);
  });

  await client.close();
});

Deno.test("JamGroupConcept: Action `disbandJamGroup`", async (t) => {
  const [db, client] = await testDb();
  const jamGroup = new JamGroupConcept(db);

  // Setup: create a group with Alice as creator and Bob as a member
  const { group: groupId } = await jamGroup.createJamGroup({ creator: userAlice, name: "The Blues Crew", description: "Playing the blues" });
  await jamGroup.addMember({ group: groupId, newMember: userBob });

  await t.step("requires: should prevent a non-creator from disbanding the group", async () => {
    console.log(`  - Bob (a member, not creator) attempts to disband group ${groupId}.`);
    const result = await jamGroup.disbandJamGroup({ group: groupId, requester: userBob });
    assert("error" in result);
    assertEquals(result.error, `User ${userBob} is not the creator of JamGroup ${groupId}.`);
  });

  await t.step("effects: should allow the creator to disband the group", async () => {
    console.log(`  - Alice (the creator) attempts to disband group ${groupId}.`);
    const result = await jamGroup.disbandJamGroup({ group: groupId, requester: userAlice });
    assertEquals(result, {});

    console.log("  - Verifying the group no longer exists.");
    const retrieved = await jamGroup._getGroupById({ group: groupId });
    assertEquals(retrieved.length, 0);
  });

  await t.step("requires: should return error for a non-existent group", async () => {
    console.log("  - Attempting to disband a group that has already been disbanded.");
    const result = await jamGroup.disbandJamGroup({ group: nonExistentGroup, requester: userAlice });
    assert("error" in result);
    assertEquals(result.error, `JamGroup with id ${nonExistentGroup} not found.`);
  });

  await client.close();
});

Deno.test("JamGroupConcept: Principle Trace", async () => {
  console.log("\nTesting the principle: 'A user can create a jam group and becomes its creator. Other users can be added... The creator can disband the group.'");
  const [db, client] = await testDb();
  const jamGroup = new JamGroupConcept(db);

  // 1. A user creates a jam group and becomes its creator.
  console.log("1. Alice creates the group 'Funk Fusion'.");
  const { group: groupId } = await jamGroup.createJamGroup({ creator: userAlice, name: "Funk Fusion", description: "Let's jam" });
  const [retrieved] = await jamGroup._getGroupById({ group: groupId });
  assertEquals(retrieved.groupDoc.creator, userAlice, "Principle Step 1 Failed: Alice is not the creator.");
  assert(retrieved.groupDoc.members.includes(userAlice), "Principle Step 1 Failed: Alice is not a member.");
  console.log("   -> Verified: Alice is the creator and a member.");

  // 2. Other users can be added to the group as members.
  console.log("2. Bob is added to 'Funk Fusion'.");
  await jamGroup.addMember({ group: groupId, newMember: userBob });
  const membersResult = await jamGroup._getMembers({ group: groupId });
  const members = membersResult.map((m) => m.member);
  assert(members.includes(userBob), "Principle Step 2 Failed: Bob was not added.");
  console.log("   -> Verified: Bob is now a member.");

  // 3. The creator can disband the group.
  console.log("3. Alice disbands the group 'Funk Fusion'.");
  const disbandResult = await jamGroup.disbandJamGroup({ group: groupId, requester: userAlice });
  assertEquals(disbandResult, {}, "Principle Step 3 Failed: Disband action returned an error.");
  const finalCheck = await jamGroup._getGroupById({ group: groupId });
  assertEquals(finalCheck.length, 0, "Principle Step 3 Failed: Group still exists after disbanding.");
  console.log("   -> Verified: The group has been successfully disbanded.");

  console.log("Principle test passed!");
  await client.close();
});
```

# trace:

The principle is: "A user can create a jam group and becomes its creator. Other users can be added to the group as members. The creator can disband the group."

This principle can be fulfilled with the following trace of actions:

1.  **`createJamGroup (creator: userAlice, name: "Funk Fusion", ...)`**
    *   **when**: Alice wants to start a new collaborative group.
    *   **then**: A new `JamGroup` is created in the state.
    *   **state check**: Querying the state for the new group's ID shows that `creator` is `userAlice` and the `members` set contains `userAlice`.

2.  **`addMember (group: <id_from_step_1>, newMember: userBob)`**
    *   **when**: Alice (or another member, via a sync) invites Bob to the group.
    *   **then**: The `addMember` action is called.
    *   **state check**: Querying the `members` of the group now shows that the set contains both `userAlice` and `userBob`.

3.  **`disbandJamGroup (group: <id_from_step_1>, requester: userAlice)`**
    *   **when**: The group has served its purpose, and Alice, the creator, decides to delete it.
    *   **then**: The `disbandJamGroup` action is called with Alice as the requester.
    *   **state check**: Querying for the group's ID now returns nothing, confirming the group has been removed from the state.