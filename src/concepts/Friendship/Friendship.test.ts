import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import FriendshipConcept, { FriendshipStatus } from "./FriendshipConcept.ts";
import { ID } from "@utils/types.ts";

// Define some static IDs for testing purposes
const userA = "user:A" as ID;
const userB = "user:B" as ID;
const userC = "user:C" as ID;
const userD = "user:D" as ID;

Deno.test(
  "FriendshipConcept - should successfully send a friend request",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    const result = await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userB,
    });

    assert(
      !("error" in result),
      "Sending friend request should not produce an error.",
    );
    assertExists(result.friendship);
    assertEquals(result.friendship.requester, userA);
    assertEquals(result.friendship.recipient, userB);
    assertEquals(result.friendship.status, FriendshipStatus.PENDING);

    const friendshipInDb = await friendshipConcept.friendships.findOne({
      _id: result.friendship._id,
    });
    assertExists(friendshipInDb);

    await client.close();
  },
);

Deno.test(
  "FriendshipConcept - should fail to send a friend request to oneself",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    const result = await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userA,
    });

    assert(
      "error" in result,
      "Sending a request to oneself should produce an error.",
    );
    assertEquals(result.error, "Cannot send a friend request to oneself.");

    await client.close();
  },
);

Deno.test(
  "FriendshipConcept - should fail to send a duplicate friend request",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    // Initial successful request
    await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userB,
    });

    // Duplicate in the same direction
    const duplicateResult1 = await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userB,
    });
    assert("error" in duplicateResult1);
    assertEquals(
      duplicateResult1.error,
      "A friendship or friend request already exists between these users.",
    );

    // Duplicate in the opposite direction
    const duplicateResult2 = await friendshipConcept.sendFriendRequest({
      requester: userB,
      recipient: userA,
    });
    assert("error" in duplicateResult2);
    assertEquals(
      duplicateResult2.error,
      "A friendship or friend request already exists between these users.",
    );

    await client.close();
  },
);

Deno.test(
  "FriendshipConcept - should successfully accept a friend request",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userB,
    });

    const result = await friendshipConcept.acceptFriendRequest({
      requester: userA,
      recipient: userB,
    });
    assert(!("error" in result), "Accepting a valid request should succeed.");
    assert("success" in result, "Accept should return success flag.");
    assertEquals(result.success, true);

    const friendshipInDb = await friendshipConcept.friendships.findOne({
      requester: userA,
      recipient: userB,
    });
    assertExists(friendshipInDb);
    assertEquals(friendshipInDb.status, FriendshipStatus.ACCEPTED);

    await client.close();
  },
);

Deno.test(
  "FriendshipConcept - should fail to accept a non-existent friend request",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    const result = await friendshipConcept.acceptFriendRequest({
      requester: userA,
      recipient: userB,
    });
    assert("error" in result, "Accepting a non-existent request should fail.");
    assertEquals(result.error, "No pending friend request found to accept.");

    await client.close();
  },
);

Deno.test(
  "FriendshipConcept - should successfully decline a friend request",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userC,
    });

    const result = await friendshipConcept.declineFriendRequest({
      requester: userA,
      recipient: userC,
    });
    assert(!("error" in result), "Declining a valid request should succeed.");
    assert("success" in result, "Decline should return success flag.");
    assertEquals(result.success, true);

    const friendshipInDb = await friendshipConcept.friendships.findOne({
      requester: userA,
      recipient: userC,
    });
    assertExists(friendshipInDb);
    assertEquals(friendshipInDb.status, FriendshipStatus.DECLINED);

    await client.close();
  },
);

Deno.test(
  "FriendshipConcept - should successfully remove a friend",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userB,
    });
    await friendshipConcept.acceptFriendRequest({
      requester: userA,
      recipient: userB,
    });

    const result = await friendshipConcept.removeFriend({
      user1: userB,
      user2: userA,
    });
    assert(!("error" in result), "Removing a friend should succeed.");
    assert("success" in result, "Remove friend should return success flag.");
    assertEquals(result.success, true);

    const friendshipInDb = await friendshipConcept.friendships.findOne({
      $or: [{ requester: userA, recipient: userB }, {
        requester: userB,
        recipient: userA,
      }],
    });
    assertEquals(friendshipInDb, null, "Friendship should be deleted from DB.");

    await client.close();
  },
);

Deno.test(
  "FriendshipConcept - should fail to remove a non-existent friendship",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    const result = await friendshipConcept.removeFriend({
      user1: userA,
      user2: userB,
    });
    assert(
      "error" in result,
      "Removing a non-existent friendship should fail.",
    );
    assertEquals(
      result.error,
      "No friendship found between these users to remove.",
    );

    await client.close();
  },
);

Deno.test(
  "FriendshipConcept - areFriends query should return correct status",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    // 1. Not friends
    let areFriends = await friendshipConcept.areFriends({
      user1: userA,
      user2: userB,
    });
    assertEquals(areFriends, [{ isFriend: false }]);

    // 2. Pending request
    await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userB,
    });
    areFriends = await friendshipConcept.areFriends({
      user1: userA,
      user2: userB,
    });
    assertEquals(
      areFriends,
      [{ isFriend: false }],
      "Pending request should not count as friends.",
    );

    // 3. Accepted request
    await friendshipConcept.acceptFriendRequest({
      requester: userA,
      recipient: userB,
    });
    areFriends = await friendshipConcept.areFriends({
      user1: userA,
      user2: userB,
    });
    assertEquals(areFriends, [{ isFriend: true }]);

    // 4. Accepted request (query with reversed users)
    areFriends = await friendshipConcept.areFriends({
      user1: userB,
      user2: userA,
    });
    assertEquals(areFriends, [{ isFriend: true }]);

    await client.close();
  },
);
Deno.test(
  "FriendshipConcept - should remove all friendships for a user",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    // Setup: User A has multiple friendships in different states
    // 1. A sent a pending request to B
    await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userB,
    });
    // 2. C sent an accepted request to A
    const result1 = await friendshipConcept.sendFriendRequest({
      requester: userC,
      recipient: userA,
    });
    assert(
      !("error" in result1),
      "Test setup failed: could not send friend request from C to A",
    );
    // Only try to accept if the request was successfully created
    await friendshipConcept.acceptFriendRequest({
      requester: userC,
      recipient: userA,
    });

    // 3. A sent a declined request to D
    const result2 = await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userD,
    });
    assert(
      !("error" in result2),
      "Test setup failed: could not send friend request from A to D",
    );
    // Only try to decline if the request was successfully created
    await friendshipConcept.declineFriendRequest({
      requester: userA,
      recipient: userD,
    });

    // 4. Unrelated friendship between B and C
    await friendshipConcept.sendFriendRequest({
      requester: userB,
      recipient: userC,
    });

    // Action: Remove all friendships for userA
    const result = await friendshipConcept.removeAllFriendshipsForUser({
      user: userA,
    });
    assert(!("error" in result), "Removing all friendships should succeed.");

    // Verification
    const friendshipsOfA = await friendshipConcept.friendships.find({
      $or: [{ requester: userA }, { recipient: userA }],
    }).toArray();

    assertEquals(
      friendshipsOfA.length,
      0,
      "All friendships involving user A should be removed.",
    );

    const unrelatedFriendship = await friendshipConcept.friendships.findOne({
      requester: userB,
      recipient: userC,
    });
    assertExists(
      unrelatedFriendship,
      "The unrelated friendship between B and C should remain.",
    );

    await client.close();
  },
);
Deno.test(
  "FriendshipConcept - _getFriends query should return a list of friends",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    // Setup:
    // A and B are friends
    await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userB,
    });
    await friendshipConcept.acceptFriendRequest({
      requester: userA,
      recipient: userB,
    });

    // A and C are friends
    await friendshipConcept.sendFriendRequest({
      requester: userC,
      recipient: userA,
    });
    await friendshipConcept.acceptFriendRequest({
      requester: userC,
      recipient: userA,
    });

    // A and D have a pending request (not friends)
    await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userD,
    });

    // B and D have a declined request (not friends)
    await friendshipConcept.sendFriendRequest({
      requester: userB,
      recipient: userD,
    });
    await friendshipConcept.declineFriendRequest({
      requester: userB,
      recipient: userD,
    });

    // Test for userA (should have B and C as friends)
    const friendsOfA = await friendshipConcept._getFriends({ user: userA });
    assertEquals(friendsOfA.length, 2, "User A should have 2 friends.");
    const friendAIds = friendsOfA.map((f) => f.friend).sort();
    assertEquals(
      friendAIds,
      [userB, userC].sort(),
      "The friend list for A is incorrect.",
    );

    // Test for userB (should have A as a friend)
    const friendsOfB = await friendshipConcept._getFriends({ user: userB });
    assertEquals(friendsOfB.length, 1, "User B should have 1 friend.");
    assertEquals(
      friendsOfB[0].friend,
      userA,
      "The friend list for B is incorrect.",
    );

    // Test for userD (no friends)
    const friendsOfD = await friendshipConcept._getFriends({ user: userD });
    assertEquals(friendsOfD.length, 0, "User D should have no friends.");

    await client.close();
  },
);
Deno.test(
  "FriendshipConcept - _getPendingFriendships query should return incoming pending requests",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    // Setup:
    // 1. User A sends a pending request TO User B (should appear in B's list)
    await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userB,
    });
    // 2. User C sends a pending request TO User B (should appear in B's list)
    await friendshipConcept.sendFriendRequest({
      requester: userC,
      recipient: userB,
    });
    // 3. User B sends a pending request TO User D (should NOT appear in B's list)
    await friendshipConcept.sendFriendRequest({
      requester: userB,
      recipient: userD,
    });
    // 4. User D sends an ACCEPTED request to User A (should NOT appear)
    await friendshipConcept.sendFriendRequest({
      requester: userD,
      recipient: userA,
    });
    await friendshipConcept.acceptFriendRequest({
      requester: userD,
      recipient: userA,
    });

    // Test for User B, who has two incoming requests
    const resultForB = await friendshipConcept._getPendingFriendships({
      user: userB,
    });
    assertEquals(
      resultForB.length,
      1,
      "The outer array should always have one element.",
    );
    assertExists(resultForB[0].pendingFriendships);
    assertEquals(
      resultForB[0].pendingFriendships.length,
      2,
      "User B should have 2 pending incoming requests.",
    );
    const requestersForB = resultForB[0].pendingFriendships.map((f) =>
      f.requester
    ).sort();
    assertEquals(
      requestersForB,
      [userA, userC].sort(),
      "The list of requesters for B is incorrect.",
    );

    // Test for User A, who has no incoming pending requests
    const resultForA = await friendshipConcept._getPendingFriendships({
      user: userA,
    });
    assertEquals(
      resultForA.length,
      1,
      "The outer array should always have one element for user A.",
    );
    assertExists(resultForA[0].pendingFriendships);
    assertEquals(
      resultForA[0].pendingFriendships.length,
      0,
      "User A should have no pending incoming requests.",
    );

    await client.close();
  },
);
