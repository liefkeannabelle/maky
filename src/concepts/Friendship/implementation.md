[@concept-background](../../../design/tools/concept-background.md)


[@Friendship](Friendship.md)


[@FriendshipConcept.ts](FriendshipConcept.ts)

[@Friendship.test.ts](Friendship.test.ts)





# implement (Friendship.removeAllFriendshipsForUser(user)) tests have a compile issue with this error message:Property 'friendship' does not exist on type '{ friendship: FriendshipDoc; } | { error: string; }'.deno-ts(2339). ifx and only givde me that test suite 
# response:

# solution:

The compile error `Property 'friendship' does not exist on type '{ friendship: FriendshipDoc; } | { error: string; }'` occurs because the TypeScript compiler cannot guarantee that the `friendship` property exists when destructuring the result of `sendFriendRequest`. The return type is a union, and the object might be an error object `{ error: "..." }` which lacks the `friendship` property.

To fix this, we must first capture the entire result object and then use a type guard (like checking if the `"error"` property is *not* in the result) to narrow the type before accessing the `friendship` property. I have also added the missing `userD` constant definition.

# file: src\concepts\Friendship\Friendship.test.ts

```typescript
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
  "FriendshipConcept - _areFriends query should return correct status",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const friendshipConcept = new FriendshipConcept(db);
    await friendshipConcept.friendships.deleteMany({});

    // 1. Not friends
    let areFriends = await friendshipConcept._areFriends({
      user1: userA,
      user2: userB,
    });
    assertEquals(areFriends, [{ isFriend: false }]);

    // 2. Pending request
    await friendshipConcept.sendFriendRequest({
      requester: userA,
      recipient: userB,
    });
    areFriends = await friendshipConcept._areFriends({
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
    areFriends = await friendshipConcept._areFriends({
      user1: userA,
      user2: userB,
    });
    assertEquals(areFriends, [{ isFriend: true }]);

    // 4. Accepted request (query with reversed users)
    areFriends = await friendshipConcept._areFriends({
      user1: userB,
      user2: userA,
    });
    assertEquals(areFriends, [{ isFriend: true }]);

    await client.close();
  },
);
```