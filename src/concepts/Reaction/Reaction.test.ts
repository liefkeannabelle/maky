import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ReactionConcept, { ReactionType } from "./ReactionConcept.ts";
import { ID } from "@utils/types.ts";

// Define some static IDs for testing purposes
const userA = "user:Alice" as ID;
const postA = "post:PostA" as ID;
const userB = "user:Bob" as ID;
const postB = "post:PostB" as ID;

Deno.test(
  "ReactionConcept - addReactionToPost",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const reactionConcept = new ReactionConcept(db);
    await reactionConcept.reactions.deleteMany({});

    // 1. Test successful reaction creation
    const addResult = await reactionConcept.addReactionToPost({
      user: userA,
      post: postA,
      type: ReactionType.LIKE,
    });

    assert(!("error" in addResult), "addReactionToPost should succeed");
    assertExists(addResult.reaction);
    assertEquals(addResult.reaction.user, userA);
    assertEquals(addResult.reaction.post, postA);
    assertEquals(addResult.reaction.type, ReactionType.LIKE);
    assertExists(addResult.reaction.createdAt);

    // Verify the reaction is in the database
    const reactionInDb = await reactionConcept.reactions.findOne({
      user: userA,
      post: postA,
    });
    assertExists(reactionInDb);
    assertEquals(reactionInDb._id, addResult.reaction._id);

    // 2. Test adding a duplicate reaction
    const duplicateResult = await reactionConcept.addReactionToPost({
      user: userA,
      post: postA,
      type: ReactionType.LOVE, // different type, but same user/post combo
    });

    assert(
      "error" in duplicateResult,
      "addReactionToPost should fail for a duplicate reaction",
    );
    assertEquals(
      duplicateResult.error,
      "Reaction already exists for this user and post.",
    );

    await client.close();
  },
);

Deno.test(
  "ReactionConcept - changeReactionType",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const reactionConcept = new ReactionConcept(db);
    await reactionConcept.reactions.deleteMany({});

    // Setup: Add a reaction to modify
    await reactionConcept.addReactionToPost({
      user: userB,
      post: postB,
      type: ReactionType.CELEBRATE,
    });

    // 1. Test successful type change
    const changeResult = await reactionConcept.changeReactionType({
      user: userB,
      post: postB,
      newType: ReactionType.LOVE,
    });

    assertEquals(changeResult, { success: true });

    // Verify the change in the database
    const updatedReactionInDb = await reactionConcept.reactions.findOne({
      user: userB,
      post: postB,
    });
    assertExists(updatedReactionInDb);
    assertEquals(updatedReactionInDb.type, ReactionType.LOVE);

    // 2. Test changing a non-existent reaction
    const nonExistentResult = await reactionConcept.changeReactionType({
      user: userA, // This user hasn't reacted to post B
      post: postB,
      newType: ReactionType.LIKE,
    });

    assert(
      "error" in nonExistentResult,
      "changeReactionType should fail for a non-existent reaction",
    );
    assertEquals(
      nonExistentResult.error,
      "Reaction not found for this user and post.",
    );

    await client.close();
  },
);

Deno.test(
  "ReactionConcept - removeReactionFromPost",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const reactionConcept = new ReactionConcept(db);
    await reactionConcept.reactions.deleteMany({});

    // Setup: Add a reaction to remove
    await reactionConcept.addReactionToPost({
      user: userA,
      post: postA,
      type: ReactionType.LIKE,
    });

    // 1. Test successful removal
    const removeResult = await reactionConcept.removeReactionFromPost({
      user: userA,
      post: postA,
    });

    assertEquals(removeResult, { success: true });

    // Verify the reaction is no longer in the database
    const reactionInDb = await reactionConcept.reactions.findOne({
      user: userA,
      post: postA,
    });
    assertEquals(
      reactionInDb,
      null,
      "The reaction should be deleted from the database",
    );

    // 2. Test removing a non-existent reaction
    const nonExistentResult = await reactionConcept.removeReactionFromPost({
      user: userA,
      post: postA, // This was just deleted
    });

    assert(
      "error" in nonExistentResult,
      "removeReactionFromPost should fail for a non-existent reaction",
    );
    assertEquals(
      nonExistentResult.error,
      "Reaction not found for this user and post.",
    );

    await client.close();
  },
);

Deno.test(
  "ReactionConcept - removeAllReactionsFromPost",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const reactionConcept = new ReactionConcept(db);
    await reactionConcept.reactions.deleteMany({});

    // Setup: Add multiple reactions to the same post
    await reactionConcept.addReactionToPost({
      user: userA,
      post: postA,
      type: ReactionType.LIKE,
    });
    await reactionConcept.addReactionToPost({
      user: userB,
      post: postA,
      type: ReactionType.LOVE,
    });

    // Add a reaction to a different post to ensure we only delete from postA
    await reactionConcept.addReactionToPost({
      user: userA,
      post: postB,
      type: ReactionType.CELEBRATE,
    });

    // Verify setup: postA should have 2 reactions, postB should have 1
    const reactionsForPostA = await reactionConcept.reactions.find({
      post: postA,
    }).toArray();
    const reactionsForPostB = await reactionConcept.reactions.find({
      post: postB,
    }).toArray();
    assertEquals(reactionsForPostA.length, 2);
    assertEquals(reactionsForPostB.length, 1);

    // 1. Test successful removal of all reactions from postA
    const removeAllResult = await reactionConcept.removeAllReactionsFromPost({
      post: postA,
    });

    assertEquals(removeAllResult, { success: true });

    // Verify all reactions for postA are removed
    const reactionsForPostAAfter = await reactionConcept.reactions.find({
      post: postA,
    }).toArray();
    assertEquals(
      reactionsForPostAAfter.length,
      0,
      "All reactions for postA should be deleted",
    );

    // Verify reactions for postB are still intact
    const reactionsForPostBAfter = await reactionConcept.reactions.find({
      post: postB,
    }).toArray();
    assertEquals(
      reactionsForPostBAfter.length,
      1,
      "Reactions for postB should remain unchanged",
    );

    // 2. Test removing all reactions from a post with no reactions (should still succeed)
    const emptyPostResult = await reactionConcept.removeAllReactionsFromPost({
      post: postA, // Already deleted all reactions
    });

    assertEquals(emptyPostResult, { success: true });

    await client.close();
  },
);

Deno.test(
  "ReactionConcept - removeAllReactionsForUser",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const reactionConcept = new ReactionConcept(db);
    await reactionConcept.reactions.deleteMany({});

    // Setup: Add multiple reactions by userA to different posts
    await reactionConcept.addReactionToPost({
      user: userA,
      post: postA,
      type: ReactionType.LIKE,
    });
    await reactionConcept.addReactionToPost({
      user: userA,
      post: postB,
      type: ReactionType.LOVE,
    });

    // Add a reaction by userB to ensure we only delete userA's reactions
    await reactionConcept.addReactionToPost({
      user: userB,
      post: postA,
      type: ReactionType.CELEBRATE,
    });

    // Verify setup: userA should have 2 reactions, userB should have 1
    const userAReactionsBefore = await reactionConcept.reactions.find({
      user: userA,
    }).toArray();
    const userBReactionsBefore = await reactionConcept.reactions.find({
      user: userB,
    }).toArray();
    assertEquals(userAReactionsBefore.length, 2);
    assertEquals(userBReactionsBefore.length, 1);

    // 1. Test successful removal of all reactions by userA
    const removeAllResult = await reactionConcept.removeAllReactionsForUser({
      user: userA,
    });

    assert(
      !("error" in removeAllResult),
      "removeAllReactionsForUser should succeed",
    );
    assertEquals(
      removeAllResult.success,
      true,
      "removeAllReactionsForUser should return success: true",
    );

    // Verify all reactions by userA are removed
    const userAReactionsAfter = await reactionConcept.reactions.find({
      user: userA,
    }).toArray();
    assertEquals(
      userAReactionsAfter.length,
      0,
      "All reactions by userA should be deleted",
    );

    // Verify reactions by userB are still intact
    const userBReactionsAfter = await reactionConcept.reactions.find({
      user: userB,
    }).toArray();
    assertEquals(
      userBReactionsAfter.length,
      1,
      "Reactions by userB should remain unchanged",
    );

    // 2. Test removing all reactions for a user with no reactions (should still succeed)
    const emptyUserResult = await reactionConcept.removeAllReactionsForUser({
      user: userA, // Already deleted all reactions
    });

    assert(
      !("error" in emptyUserResult),
      "removeAllReactionsForUser should succeed even if no reactions exist",
    );
    assertEquals(
      emptyUserResult.success,
      true,
      "removeAllReactionsForUser should return success: true even when no reactions",
    );

    await client.close();
  },
);
Deno.test(
  "ReactionConcept - _getReactionsForPostId",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const reactionConcept = new ReactionConcept(db);
    await reactionConcept.reactions.deleteMany({});

    // Setup: Add 2 likes to postA and 1 love to postB
    await reactionConcept.addReactionToPost({
      user: userA,
      post: postA,
      type: ReactionType.LIKE,
    });
    await reactionConcept.addReactionToPost({
      user: userB,
      post: postA,
      type: ReactionType.LIKE,
    });
    await reactionConcept.addReactionToPost({
      user: userA,
      post: postB,
      type: ReactionType.LOVE,
    });

    // 1. Test counts for postA
    const resultA = await reactionConcept._getReactionsForPostId({
      post: postA,
    });
    resultA.sort((a, b) => a.type.localeCompare(b.type)); // Sort for deterministic test

    assertEquals(resultA, [
      { type: ReactionType.CELEBRATE, count: 0 },
      { type: ReactionType.LIKE, count: 2 },
      { type: ReactionType.LOVE, count: 0 },
    ]);

    // 2. Test counts for a post with no reactions
    const postC = "post:PostC" as ID;
    const resultC = await reactionConcept._getReactionsForPostId({
      post: postC,
    });
    resultC.sort((a, b) => a.type.localeCompare(b.type)); // Sort for deterministic test

    assertEquals(resultC, [
      { type: ReactionType.CELEBRATE, count: 0 },
      { type: ReactionType.LIKE, count: 0 },
      { type: ReactionType.LOVE, count: 0 },
    ]);

    await client.close();
  },
);

Deno.test(
  "ReactionConcept - _getReactionOnPostFromUser",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const reactionConcept = new ReactionConcept(db);
    await reactionConcept.reactions.deleteMany({});

    // Setup: Add a LIKE reaction from userA to postA
    await reactionConcept.addReactionToPost({
      user: userA,
      post: postA,
      type: ReactionType.LIKE,
    });

    // 1. Test getting reaction for userA on postA (should be LIKE)
    const resultA = await reactionConcept._getReactionOnPostFromUser({
      user: userA,
      post: postA,
    });
    resultA.sort((a, b) => a.type.localeCompare(b.type));

    assertEquals(resultA, [
      { type: ReactionType.CELEBRATE, count: 0 },
      { type: ReactionType.LIKE, count: 1 },
      { type: ReactionType.LOVE, count: 0 },
    ]);

    // 2. Test getting reaction for userB on postA (should be none)
    const resultB = await reactionConcept._getReactionOnPostFromUser({
      user: userB,
      post: postA,
    });
    resultB.sort((a, b) => a.type.localeCompare(b.type));

    assertEquals(resultB, [
      { type: ReactionType.CELEBRATE, count: 0 },
      { type: ReactionType.LIKE, count: 0 },
      { type: ReactionType.LOVE, count: 0 },
    ]);

    await client.close();
  },
);
