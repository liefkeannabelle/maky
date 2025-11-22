import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import FollowingConcept, { FollowDoc } from "./FollowingConcept.ts";

// Define some static IDs for testing purposes
const userA = "user:A" as ID;
const userB = "user:B" as ID;
const userC = "user:C" as ID;

Deno.test(
  "FollowingConcept - should allow a user to follow another user",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const followingConcept = new FollowingConcept(db);
    await followingConcept.follows.deleteMany({});

    const result = await followingConcept.followUser({
      follower: userA,
      followed: userB,
    });

    assert(!("error" in result), "Follow operation should not return an error");
    const follow = (result as { follow: FollowDoc }).follow;
    assertEquals(follow.follower, userA);
    assertEquals(follow.followed, userB);
    assertExists(follow.followedAt);
    assertExists(follow._id);

    // Verify with a query
    const isFollowing = await followingConcept._isFollowing({
      follower: userA,
      followed: userB,
    });
    assertEquals(isFollowing.isFollowing, true);

    await client.close();
  },
);

Deno.test(
  "FollowingConcept - should prevent a user from following themselves",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const followingConcept = new FollowingConcept(db);
    await followingConcept.follows.deleteMany({});

    const result = await followingConcept.followUser({
      follower: userA,
      followed: userA,
    });

    assert("error" in result, "Should return an error for self-follow");
    assertEquals(result.error, "Users cannot follow themselves.");

    await client.close();
  },
);

Deno.test(
  "FollowingConcept - should prevent a user from following someone they already follow",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const followingConcept = new FollowingConcept(db);
    await followingConcept.follows.deleteMany({});

    // First follow should be successful
    await followingConcept.followUser({
      follower: userA,
      followed: userB,
    });

    // Second attempt should fail
    const result = await followingConcept.followUser({
      follower: userA,
      followed: userB,
    });

    assert("error" in result, "Should return an error for duplicate follow");
    assertEquals(result.error, "User is already following this user.");

    await client.close();
  },
);

Deno.test(
  "FollowingConcept - should allow a user to unfollow another user",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const followingConcept = new FollowingConcept(db);
    await followingConcept.follows.deleteMany({});

    // Setup: A follows B
    await followingConcept.followUser({ follower: userA, followed: userB });

    // Ensure the follow exists first
    const followCheck = await followingConcept._isFollowing({
      follower: userA,
      followed: userB,
    });
    assertEquals(followCheck.isFollowing, true);

    // Perform unfollow
    const result = await followingConcept.unfollowUser({
      follower: userA,
      followed: userB,
    });
    assert(!("error" in result), "Unfollow should not return an error");

    // Verify the follow relationship is gone
    const finalCheck = await followingConcept._isFollowing({
      follower: userA,
      followed: userB,
    });
    assertEquals(finalCheck.isFollowing, false);

    await client.close();
  },
);

Deno.test(
  "FollowingConcept - should return an error when trying to unfollow a user they are not following",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const followingConcept = new FollowingConcept(db);
    await followingConcept.follows.deleteMany({});

    // Attempt to unfollow without a prior follow
    const result = await followingConcept.unfollowUser({
      follower: userA,
      followed: userB,
    });

    assert("error" in result, "Should return an error for non-existent follow");
    assertEquals(result.error, "Follow relationship not found.");

    await client.close();
  },
);

Deno.test(
  "FollowingConcept - should correctly query followers and following lists",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const followingConcept = new FollowingConcept(db);
    await followingConcept.follows.deleteMany({});

    // Setup: A follows C, B follows C
    await followingConcept.followUser({ follower: userA, followed: userC });
    await followingConcept.followUser({ follower: userB, followed: userC });

    // Test: Who is userA following? (Should be just C)
    const aFollowing = await followingConcept._getFollowing({ user: userA });
    assertEquals(aFollowing.following, [userC]);

    // Test: Who is following userC? (Should be A and B)
    const cFollowers = await followingConcept._getFollowers({ user: userC });
    assertEquals(cFollowers.followers.length, 2);
    // Sort for deterministic comparison
    assertEquals(cFollowers.followers.sort(), [userA, userB].sort());

    // Test: Who is userB following? (Should be just C)
    const bFollowing = await followingConcept._getFollowing({ user: userB });
    assertEquals(bFollowing.following, [userC]);

    // Test: Who is following userA? (Should be none)
    const aFollowers = await followingConcept._getFollowers({ user: userA });
    assertEquals(aFollowers.followers.length, 0);

    await client.close();
  },
);
Deno.test(
  "FollowingConcept - should remove all relationships when a user is deleted",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const followingConcept = new FollowingConcept(db);
    await followingConcept.follows.deleteMany({});

    // Setup:
    // A follows B
    // A follows C
    // B follows A
    // C follows A
    await followingConcept.followUser({ follower: userA, followed: userB });
    await followingConcept.followUser({ follower: userA, followed: userC });
    await followingConcept.followUser({ follower: userB, followed: userA });
    await followingConcept.followUser({ follower: userC, followed: userA });

    // Verify initial state
    assertEquals(
      (await followingConcept._getFollowing({ user: userA })).following.length,
      2,
    );
    assertEquals(
      (await followingConcept._getFollowers({ user: userA })).followers.length,
      2,
    );

    // Test removeUserFollowing: removes A's outbound follows (A is the 'follower')
    await followingConcept.removeUserFollowing({ user: userA });

    // Assertions for removeUserFollowing
    // A should now be following no one.
    const aFollowingAfter = await followingConcept._getFollowing({
      user: userA,
    });
    assertEquals(aFollowingAfter.following.length, 0);
    // A's followers (inbound follows) should be unaffected.
    const aFollowersAfter = await followingConcept._getFollowers({
      user: userA,
    });
    assertEquals(aFollowersAfter.followers.length, 2);
    assertEquals(aFollowersAfter.followers.sort(), [userB, userC].sort());

    // Test removeUserAsFollower: removes A's inbound follows (A is the 'followed')
    await followingConcept.removeUserAsFollower({ user: userA });

    // Assertions for removeUserAsFollower
    // A should now have no followers.
    const finalFollowers = await followingConcept._getFollowers({
      user: userA,
    });
    assertEquals(finalFollowers.followers.length, 0);
    // Check from the other side: B and C should no longer be following anyone, as A was their only follow.
    const bFollowing = await followingConcept._getFollowing({ user: userB });
    const cFollowing = await followingConcept._getFollowing({ user: userC });
    assertEquals(bFollowing.following.length, 0);
    assertEquals(cFollowing.following.length, 0);

    await client.close();
  },
);
