import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "jsr:@std/testing/bdd";

import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { Db, MongoClient } from "npm:mongodb";
import PostConcept from "./PostConcept.ts";

// Shared test context
let db: Db;
let client: MongoClient;
let postConcept: PostConcept;

// Mock User and Item IDs, created statically for testing in isolation.
const userA = "user:test-A" as ID;
const userB = "user:test-B" as ID;
const itemA = "item:test-A" as ID;
const itemB = "item:test-B" as ID;

// Setup: runs once before all tests
beforeAll(async () => {
  [db, client] = await testDb();
  postConcept = new PostConcept(db);
});

// Teardown: runs once after all tests
afterAll(async () => {
  await client.close();
});

// Clean the collection before each test to ensure isolation
beforeEach(async () => {
  await postConcept.posts.deleteMany({});
});

describe("PostConcept", () => {
  describe("createPost", () => {
    it("should create a GENERAL post successfully", async () => {
      const result = await postConcept.createPost({
        author: userA,
        content: "This is a general post.",
        postType: "GENERAL",
        items: [],
        visibility: "PUBLIC",
      });

      assert(!("error" in result), "createPost should not return an error");
      const { postId } = result as { postId: ID };
      assertExists(postId);

      const post = await postConcept.posts.findOne({ _id: postId });
      assertExists(post);
      assertEquals(post.author, userA);
      assertEquals(post.content, "This is a general post.");
      assertEquals(post.postType, "GENERAL");
      assertEquals(post.items, []);
    });

    it("should create a PROGRESS post with an item successfully", async () => {
      const result = await postConcept.createPost({
        author: userB,
        content: "Made progress on this item!",
        postType: "PROGRESS",
        items: [itemA],
        visibility: "PRIVATE",
      });

      assert(!("error" in result), "createPost should not return an error");
      const { postId } = result as { postId: ID };
      assertExists(postId);

      const post = await postConcept.posts.findOne({ _id: postId });
      assertExists(post);
      assertEquals(post.author, userB);
      assertEquals(post.items, [itemA]);
      assertEquals(post.postType, "PROGRESS");
    });

    it("should return an error for an invalid postType", async () => {
      const result = await postConcept.createPost({
        author: userA,
        content: "Invalid post type test.",
        // deno-lint-ignore no-explicit-any
        postType: "INVALID_TYPE" as any,
        items: [],
        visibility: "PUBLIC",
      });

      assert("error" in result, "createPost should return an error");
      const { error } = result as { error: string };
      assertEquals(
        error,
        "Invalid postType specified. Must be 'PROGRESS' or 'GENERAL'.",
      );
    });

    it("should return an error for an invalid visibility", async () => {
      const result = await postConcept.createPost({
        author: userA,
        content: "Invalid visibility",
        postType: "GENERAL",
        items: [],
        // deno-lint-ignore no-explicit-any
        visibility: "HIDDEN" as any,
      });

      assert("error" in result, "createPost should return an error");
      assertEquals(
        (result as { error: string }).error,
        "Invalid visibility specified. Must be 'PUBLIC' or 'PRIVATE'.",
      );
    });
  });

  describe("editPost", () => {
    let postId: ID;

    beforeEach(async () => {
      const createResult = await postConcept.createPost({
        author: userA,
        content: "Original content for editing",
        postType: "GENERAL",
        items: [],
        visibility: "PUBLIC",
      });
      postId = (createResult as { postId: ID }).postId;
    });

    it("should allow the author to edit their post", async () => {
      const result = await postConcept.editPost({
        postId: postId,
        editor: userA,
        newContent: "Updated content!",
        newItems: [itemB],
        newPostType: "PROGRESS",
      });

      assert(!("error" in result), "editPost should succeed for the author");
      assert("success" in result, "editPost should return success flag.");
      assertEquals((result as { success: true }).success, true);
      const post = await postConcept.posts.findOne({ _id: postId });
      assertExists(post);
      assertEquals(post.content, "Updated content!");
      assertEquals(post.items, [itemB]);
      assertEquals(post.postType, "PROGRESS");
      assertExists(post.editedAt);
    });

    it("should leave optional fields unchanged when given UNDEFINED", async () => {
      const result = await postConcept.editPost({
        postId,
        editor: userA,
        newContent: "Content only",
        newItems: "UNDEFINED",
        newPostType: "UNDEFINED",
      });

      assert(!("error" in result));
      assert("success" in result, "editPost should return success flag.");
      assertEquals((result as { success: true }).success, true);
      const post = await postConcept.posts.findOne({ _id: postId });
      assertExists(post);
      assertEquals(post.content, "Content only");
      assertEquals(post.items, []);
      assertEquals(post.postType, "GENERAL");
    });

    it("should return a permission error if the editor is not the author", async () => {
      const result = await postConcept.editPost({
        postId: postId,
        editor: userB, // userB is not the author
        newContent: "This should fail.",
        newItems: "UNDEFINED",
        newPostType: "UNDEFINED",
      });

      assert("error" in result, "editPost should fail for a different user");
      const { error } = result as { error: string };
      assertEquals(
        error,
        "Permission denied: user is not the author of the post",
      );
    });

    it("should return an error if the post does not exist", async () => {
      const result = await postConcept.editPost({
        postId: "nonexistent-post" as ID,
        editor: userA,
        newContent: "This will fail.",
        newItems: "UNDEFINED",
        newPostType: "UNDEFINED",
      });

      assert("error" in result, "editPost should fail for a non-existent post");
      assertEquals((result as { error: string }).error, "Post not found");
    });

    it("should return an error for an invalid newPostType", async () => {
      const result = await postConcept.editPost({
        postId: postId,
        editor: userA,
        newContent: "Testing invalid type edit",
        newItems: "UNDEFINED",
        // deno-lint-ignore no-explicit-any
        newPostType: "ANOTHER_INVALID_TYPE" as any,
      });

      assert("error" in result, "editPost should fail for an invalid postType");
      assertEquals(
        (result as { error: string }).error,
        "Invalid postType specified. Must be 'PROGRESS' or 'GENERAL'.",
      );
    });
  });

  describe("editPostVisibility", () => {
    let postId: ID;

    beforeEach(async () => {
      const createResult = await postConcept.createPost({
        author: userA,
        content: "Privacy test",
        postType: "GENERAL",
        items: [],
        visibility: "PUBLIC",
      });
      postId = (createResult as { postId: ID }).postId;
    });

    it("allows the author to change visibility", async () => {
      const result = await postConcept.editPostVisibility({
        postId,
        editor: userA,
        newVisibility: "PRIVATE",
      });

      assert("success" in result, "editPostVisibility should return success");
      const post = await postConcept.posts.findOne({ _id: postId });
      assertExists(post);
      assertEquals(post.visibility, "PRIVATE");
      assertExists(post.editedAt);
    });

    it("rejects non-authors", async () => {
      const result = await postConcept.editPostVisibility({
        postId,
        editor: userB,
        newVisibility: "PRIVATE",
      });

      assert("error" in result, "Non-authors should be blocked");
      assertEquals(
        (result as { error: string }).error,
        "Permission denied: user is not the author of the post",
      );
    });

    it("rejects invalid visibility values", async () => {
      const result = await postConcept.editPostVisibility({
        postId,
        editor: userA,
        // deno-lint-ignore no-explicit-any
        newVisibility: "FRIENDS" as any,
      });

      assert("error" in result, "Invalid visibilities should error");
      assertEquals(
        (result as { error: string }).error,
        "Invalid visibility specified. Must be 'PUBLIC' or 'PRIVATE'.",
      );
    });
  });

  describe("deletePost", () => {
    let postIdForDeletion: ID;

    beforeEach(async () => {
      // Create a post specifically for delete tests
      const createResult = await postConcept.createPost({
        author: userA,
        content: "This post will be deleted.",
        postType: "GENERAL",
        items: [],
        visibility: "PUBLIC",
      });
      postIdForDeletion = (createResult as { postId: ID }).postId;
    });

    it("should return a permission error if the deleter is not the author", async () => {
      const result = await postConcept.deletePost({
        postId: postIdForDeletion,
        deleter: userB, // userB is not the author
      });
      assert("error" in result, "deletePost should fail for a different user");
      assertEquals(
        (result as { error: string }).error,
        "Permission denied: user is not the author of the post",
      );
      // Verify post still exists
      const post = await postConcept.posts.findOne({ _id: postIdForDeletion });
      assertExists(post);
    });

    it("should allow the author to delete their post", async () => {
      const result = await postConcept.deletePost({
        postId: postIdForDeletion,
        deleter: userA,
      });
      assert(!("error" in result), "deletePost should succeed for the author");
      assert("success" in result, "deletePost should return success flag.");
      assertEquals((result as { success: true }).success, true);
      const post = await postConcept.posts.findOne({ _id: postIdForDeletion });
      assertEquals(post, null);
    });

    it("should return an error if the post does not exist", async () => {
      const result = await postConcept.deletePost({
        postId: "already-deleted-or-nonexistent" as ID,
        deleter: userA,
      });
      assert(
        "error" in result,
        "deletePost should fail for a non-existent post",
      );
      assertEquals((result as { error: string }).error, "Post not found");
    });
  });

  // `_getPostsForUser` and `_getPublicPostsForUser` have been deprecated in favor of
  // `_getPostsViewableToUsers` and `_getPublicPostsForUsers`. Coverage for the new
  // queries (including the single-user cases previously covered above) now lives in
  // the updated describe blocks below.

  describe("_getPrivatePostsForUser", () => {
    it("returns only private posts", async () => {
      await postConcept.createPost({
        author: userA,
        content: "Private post",
        postType: "GENERAL",
        items: [],
        visibility: "PRIVATE",
      });

      await postConcept.createPost({
        author: userA,
        content: "Public post",
        postType: "GENERAL",
        items: [],
        visibility: "PUBLIC",
      });

      const results = await postConcept._getPrivatePostsForUser({
        user: userA,
      });
      assertEquals(results.length, 1);
      assertEquals(results[0].post.content, "Private post");
      assertEquals(results[0].post.visibility, "PRIVATE");
    });
  });

  // `_getPostsViewableToUsers` removed: tests that relied on aggregating public+private
  // results across users have been updated to use per-user queries. Integration-level
  // feed composition is validated in sync-level tests / runtime behavior.

  describe("_getPublicPostsForUsers", () => {
    it("returns only public posts across users", async () => {
      await postConcept.createPost({
        author: userA,
        content: "User A public",
        postType: "GENERAL",
        items: [],
        visibility: "PUBLIC",
      });

      await postConcept.createPost({
        author: userA,
        content: "User A private",
        postType: "GENERAL",
        items: [],
        visibility: "PRIVATE",
      });

      await postConcept.createPost({
        author: userB,
        content: "User B public",
        postType: "GENERAL",
        items: [],
        visibility: "PUBLIC",
      });

      const results = await postConcept._getPublicPostsForUsers({
        users: [userA, userB],
      });

      assertEquals(results.length, 2);
      const contents = results.map((r) => r.post.content);
      assert(contents.includes("User A public"));
      assert(contents.includes("User B public"));
      assert(!contents.includes("User A private"));
    });

    it("returns empty array for empty users list", async () => {
      const results = await postConcept._getPublicPostsForUsers({ users: [] });
      assertEquals(results.length, 0);
    });

    it("returns empty when users have no public posts", async () => {
      await postConcept.createPost({
        author: userA,
        content: "User A private",
        postType: "GENERAL",
        items: [],
        visibility: "PRIVATE",
      });

      const results = await postConcept._getPublicPostsForUsers({
        users: [userA],
      });
      assertEquals(results.length, 0);
    });
  });

  describe("removeAllPostsForUser", () => {
    it("should remove all posts for a user", async () => {
      // Create multiple posts for userA
      await postConcept.createPost({
        author: userA,
        content: "Post 1",
        postType: "GENERAL",
        items: [],
        visibility: "PUBLIC",
      });

      await postConcept.createPost({
        author: userA,
        content: "Post 2",
        postType: "PROGRESS",
        items: [itemA],
        visibility: "PRIVATE",
      });

      // Create a post for userB (should not be deleted)
      const post3 = await postConcept.createPost({
        author: userB,
        content: "User B post",
        postType: "GENERAL",
        items: [],
        visibility: "PUBLIC",
      });
      const post3Id = (post3 as { postId: ID }).postId;

      // Verify setup using public + private queries
      const userAPublicBefore = await postConcept._getPublicPostsForUsers({
        users: [userA],
      });
      const userAPrivateBefore = await postConcept._getPrivatePostsForUser({
        user: userA,
      });
      const userAPostsBeforeCount = userAPublicBefore.length +
        userAPrivateBefore.length;
      assertEquals(userAPostsBeforeCount, 2, "UserA should have 2 posts");

      // Remove all posts for userA
      const result = await postConcept.removeAllPostsForUser({ user: userA });
      assert(!("error" in result), "removeAllPostsForUser should succeed");
      assertEquals((result as { success: true; postIds: ID[] }).success, true);
      assertEquals(
        (result as { success: true; postIds: ID[] }).postIds.length,
        2,
        "Should return 2 post IDs",
      );

      // Verify all posts for userA are removed
      const userAPublicAfter = await postConcept._getPublicPostsForUsers({
        users: [userA],
      });
      const userAPrivateAfter = await postConcept._getPrivatePostsForUser({
        user: userA,
      });
      const userAPostsAfterCount = userAPublicAfter.length +
        userAPrivateAfter.length;
      assertEquals(userAPostsAfterCount, 0, "UserA should have no posts");

      // Verify userB's public post is still intact
      const userBPosts = await postConcept._getPublicPostsForUsers({
        users: [userB],
      });
      assertEquals(userBPosts.length, 1, "UserB should still have 1 post");
      assertEquals(userBPosts[0].post._id, post3Id);
    });

    it("should succeed even if user has no posts", async () => {
      const result = await postConcept.removeAllPostsForUser({ user: userA });
      assert(
        !("error" in result),
        "removeAllPostsForUser should succeed even with no posts",
      );
      assertEquals((result as { success: true; postIds: ID[] }).success, true);
      assertEquals(
        (result as { success: true; postIds: ID[] }).postIds.length,
        0,
        "Should return empty postIds array",
      );
    });
  });
});
