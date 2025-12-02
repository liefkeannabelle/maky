import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import JamGroupConcept from "./JamGroupConcept.ts";
import { ID } from "@utils/types.ts";

// Mock IDs for testing
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;
const userC = "user:Charlie" as ID;

Deno.test(
  "JamGroupConcept - createJamGroup",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamGroupConcept = new JamGroupConcept(db);
    await jamGroupConcept.jamGroups.deleteMany({});

    // Test successful group creation
    const name = "Jazz Ensemble";
    const description = "A group for jazz enthusiasts";
    const result = await jamGroupConcept.createJamGroup({
      creator: userA,
      name,
      description,
    });

    assert(
      !("error" in result),
      "Creating a valid jam group should succeed.",
    );
    assertExists(result.group, "A group ID should be returned on success.");

    const groupInDb = await jamGroupConcept.jamGroups.findOne({
      _id: result.group,
    });
    assertExists(groupInDb, "The group should exist in the database.");
    assertEquals(groupInDb.name, name);
    assertEquals(groupInDb.description, description);
    assertEquals(groupInDb.creator, userA);
    assertEquals(
      groupInDb.members.length,
      1,
      "Creator should be automatically added as a member.",
    );
    assertEquals(
      groupInDb.members[0],
      userA,
      "Creator should be the first member.",
    );
    assertExists(groupInDb.createdAt, "createdAt should be set.");

    await client.close();
  },
);

Deno.test(
  "JamGroupConcept - addMember",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamGroupConcept = new JamGroupConcept(db);
    await jamGroupConcept.jamGroups.deleteMany({});

    // Setup: create a group
    const createResult = await jamGroupConcept.createJamGroup({
      creator: userA,
      name: "Test Group",
      description: "Test description",
    });
    assert(
      "group" in createResult,
      "Test setup failed: could not create group.",
    );
    const groupId = createResult.group;

    // Test successful member addition
    const addResult = await jamGroupConcept.addMember({
      group: groupId,
      newMember: userB,
    });

    assert(
      !("error" in addResult),
      "Adding a valid member should succeed.",
    );
    assertEquals(
      addResult.success,
      true,
      "Add member response should include success: true",
    );

    // Verify member was added
    const groupInDb = await jamGroupConcept.jamGroups.findOne({ _id: groupId });
    assertExists(groupInDb);
    assertEquals(
      groupInDb.members.length,
      2,
      "Group should have 2 members after adding userB.",
    );
    assert(
      groupInDb.members.includes(userB),
      "UserB should be in the members array.",
    );

    // Test adding member to non-existent group
    const nonExistentGroupId = "group:nonexistent" as ID;
    const nonExistentResult = await jamGroupConcept.addMember({
      group: nonExistentGroupId,
      newMember: userC,
    });

    assert(
      "error" in nonExistentResult,
      "Adding member to non-existent group should fail.",
    );
    assertEquals(
      nonExistentResult.error,
      `JamGroup with id ${nonExistentGroupId} not found.`,
    );

    // Test adding duplicate member
    const duplicateResult = await jamGroupConcept.addMember({
      group: groupId,
      newMember: userB, // Already a member
    });

    assert(
      "error" in duplicateResult,
      "Adding a duplicate member should fail.",
    );
    assertEquals(
      duplicateResult.error,
      `User ${userB} is already a member of JamGroup ${groupId}.`,
    );

    // Verify member count didn't change
    const groupAfterDuplicate = await jamGroupConcept.jamGroups.findOne({
      _id: groupId,
    });
    assertExists(groupAfterDuplicate);
    assertEquals(
      groupAfterDuplicate.members.length,
      2,
      "Member count should not change after duplicate add attempt.",
    );

    await client.close();
  },
);

Deno.test(
  "JamGroupConcept - removeUserFromJamGroup",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamGroupConcept = new JamGroupConcept(db);
    await jamGroupConcept.jamGroups.deleteMany({});

    // Setup: create a group and add members
    const createResult = await jamGroupConcept.createJamGroup({
      creator: userA,
      name: "Test Group",
      description: "Test description",
    });
    assert(
      "group" in createResult,
      "Test setup failed: could not create group.",
    );
    const groupId = createResult.group;

    await jamGroupConcept.addMember({ group: groupId, newMember: userB });
    await jamGroupConcept.addMember({ group: groupId, newMember: userC });

    // Verify setup: should have 3 members (creator + 2 added)
    let groupInDb = await jamGroupConcept.jamGroups.findOne({ _id: groupId });
    assertExists(groupInDb);
    assertEquals(groupInDb.members.length, 3);

    // Test successful member removal
    const removeResult = await jamGroupConcept.removeUserFromJamGroup({
      group: groupId,
      user: userB,
    });

    assert(
      !("error" in removeResult),
      "Removing a valid member should succeed.",
    );
    assertEquals(
      removeResult.success,
      true,
      "Remove member response should include success: true",
    );

    // Verify member was removed
    groupInDb = await jamGroupConcept.jamGroups.findOne({ _id: groupId });
    assertExists(groupInDb);
    assertEquals(
      groupInDb.members.length,
      2,
      "Group should have 2 members after removing userB.",
    );
    assert(
      !groupInDb.members.includes(userB),
      "UserB should not be in the members array.",
    );
    assert(
      groupInDb.members.includes(userA),
      "Creator should still be a member.",
    );
    assert(
      groupInDb.members.includes(userC),
      "UserC should still be a member.",
    );

    // Test removing from non-existent group
    const nonExistentGroupId = "group:nonexistent" as ID;
    const nonExistentResult = await jamGroupConcept.removeUserFromJamGroup({
      group: nonExistentGroupId,
      user: userA,
    });

    assert(
      "error" in nonExistentResult,
      "Removing member from non-existent group should fail.",
    );
    assertEquals(
      nonExistentResult.error,
      `JamGroup with id ${nonExistentGroupId} not found.`,
    );

    // Test removing user who is not a member
    const notMemberResult = await jamGroupConcept.removeUserFromJamGroup({
      group: groupId,
      user: userB, // Already removed
    });

    assert(
      "error" in notMemberResult,
      "Removing a non-member should fail.",
    );
    assertEquals(
      notMemberResult.error,
      `User ${userB} was not a member of JamGroup ${groupId}.`,
    );

    await client.close();
  },
);

Deno.test(
  "JamGroupConcept - disbandJamGroup",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamGroupConcept = new JamGroupConcept(db);
    await jamGroupConcept.jamGroups.deleteMany({});

    // Setup: create a group and add members
    const createResult = await jamGroupConcept.createJamGroup({
      creator: userA,
      name: "Test Group",
      description: "Test description",
    });
    assert(
      "group" in createResult,
      "Test setup failed: could not create group.",
    );
    const groupId = createResult.group;

    await jamGroupConcept.addMember({ group: groupId, newMember: userB });
    await jamGroupConcept.addMember({ group: groupId, newMember: userC });

    // Verify setup: group exists
    let groupInDb = await jamGroupConcept.jamGroups.findOne({ _id: groupId });
    assertExists(groupInDb, "Group should exist before disbanding.");

    // Test successful disband by creator
    const disbandResult = await jamGroupConcept.disbandJamGroup({
      group: groupId,
      requester: userA, // Creator
    });

    assert(
      !("error" in disbandResult),
      "Disbanding by creator should succeed.",
    );
    assertEquals(
      disbandResult.success,
      true,
      "Disband response should include success: true",
    );

    // Verify group was deleted
    groupInDb = await jamGroupConcept.jamGroups.findOne({ _id: groupId });
    assertEquals(
      groupInDb,
      null,
      "Group should be deleted from the database.",
    );

    // Test disbanding non-existent group
    const nonExistentGroupId = "group:nonexistent" as ID;
    const nonExistentResult = await jamGroupConcept.disbandJamGroup({
      group: nonExistentGroupId,
      requester: userA,
    });

    assert(
      "error" in nonExistentResult,
      "Disbanding a non-existent group should fail.",
    );
    assertEquals(
      nonExistentResult.error,
      "JamGroup not found or user is not the creator",
    );

    // Setup: create another group for testing non-creator disband
    const createResult2 = await jamGroupConcept.createJamGroup({
      creator: userA,
      name: "Another Group",
      description: "Another description",
    });
    assert(
      "group" in createResult2,
      "Test setup failed: could not create second group.",
    );
    const groupId2 = createResult2.group;

    // Test disbanding by non-creator
    const nonCreatorResult = await jamGroupConcept.disbandJamGroup({
      group: groupId2,
      requester: userB, // Not the creator
    });

    assert(
      "error" in nonCreatorResult,
      "Disbanding by non-creator should fail.",
    );
    assertEquals(
      nonCreatorResult.error,
      "JamGroup not found or user is not the creator",
    );

    // Verify group still exists
    groupInDb = await jamGroupConcept.jamGroups.findOne({ _id: groupId2 });
    assertExists(
      groupInDb,
      "Group should still exist after failed disband attempt by non-creator.",
    );

    await client.close();
  },
);

Deno.test(
  "JamGroupConcept - Principle: Create group, add members, remove members, disband",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamGroupConcept = new JamGroupConcept(db);
    await jamGroupConcept.jamGroups.deleteMany({});

    // Principle scenario: A user creates a jam group, adds friends, manages membership, and eventually disbands it

    // 1. Alice creates a jam group
    const createResult = await jamGroupConcept.createJamGroup({
      creator: userA,
      name: "Weekend Jammers",
      description: "A group for weekend music sessions",
    });
    assert("group" in createResult, "Alice should be able to create a group.");
    const groupId = createResult.group;

    let groupInDb = await jamGroupConcept.jamGroups.findOne({ _id: groupId });
    assertExists(groupInDb);
    assertEquals(
      groupInDb.members.length,
      1,
      "Group should start with creator.",
    );

    // 2. Alice adds Bob as a member
    const addBobResult = await jamGroupConcept.addMember({
      group: groupId,
      newMember: userB,
    });
    assert(!("error" in addBobResult), "Alice should be able to add Bob.");

    // 3. Alice adds Charlie as a member
    const addCharlieResult = await jamGroupConcept.addMember({
      group: groupId,
      newMember: userC,
    });
    assert(
      !("error" in addCharlieResult),
      "Alice should be able to add Charlie.",
    );

    groupInDb = await jamGroupConcept.jamGroups.findOne({ _id: groupId });
    assertExists(groupInDb);
    assertEquals(
      groupInDb.members.length,
      3,
      "Group should have 3 members: Alice, Bob, and Charlie.",
    );

    // 4. Alice removes Bob from the group
    const removeBobResult = await jamGroupConcept.removeUserFromJamGroup({
      group: groupId,
      user: userB,
    });
    assert(
      !("error" in removeBobResult),
      "Alice should be able to remove Bob.",
    );

    groupInDb = await jamGroupConcept.jamGroups.findOne({ _id: groupId });
    assertExists(groupInDb);
    assertEquals(
      groupInDb.members.length,
      2,
      "Group should have 2 members after removing Bob.",
    );
    assert(
      !groupInDb.members.includes(userB),
      "Bob should not be a member anymore.",
    );

    // 5. Alice disbands the group
    const disbandResult = await jamGroupConcept.disbandJamGroup({
      group: groupId,
      requester: userA,
    });
    assert(
      !("error" in disbandResult),
      "Alice should be able to disband the group.",
    );

    // Verify group is gone
    groupInDb = await jamGroupConcept.jamGroups.findOne({ _id: groupId });
    assertEquals(groupInDb, null, "Group should be completely removed.");

    await client.close();
  },
);
