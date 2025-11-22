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
      });

      assert(!("error" in result), "createPost should not return an error");
      const { postId } = result as { postId: ID };
      assertExists(postId);

      const post = await postConcept.posts.findOne({ _id: postId });
      assertExists(post);
      assertEquals(post.author, userA);
      assertEquals(post.content, "This is a general post.");
      assertEquals(post.postType, "GENERAL");
      assertEquals(post.item, undefined);
    });

    it("should create a PROGRESS post with an item successfully", async () => {
      const result = await postConcept.createPost({
        author: userB,
        content: "Made progress on this item!",
        postType: "PROGRESS",
        item: itemA,
      });

      assert(!("error" in result), "createPost should not return an error");
      const { postId } = result as { postId: ID };
      assertExists(postId);

      const post = await postConcept.posts.findOne({ _id: postId });
      assertExists(post);
      assertEquals(post.author, userB);
      assertEquals(post.item, itemA);
      assertEquals(post.postType, "PROGRESS");
    });

    it("should return an error for an invalid postType", async () => {
      const result = await postConcept.createPost({
        author: userA,
        content: "Invalid post type test.",
        // deno-lint-ignore no-explicit-any
        postType: "INVALID_TYPE" as any,
      });

      assert("error" in result, "createPost should return an error");
      const { error } = result as { error: string };
      assertEquals(
        error,
        "Invalid postType specified. Must be 'PROGRESS' or 'GENERAL'.",
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
      });
      postId = (createResult as { postId: ID }).postId;
    });

    it("should allow the author to edit their post", async () => {
      const result = await postConcept.editPost({
        postId: postId,
        editor: userA,
        newContent: "Updated content!",
        newItem: itemB,
        newPostType: "PROGRESS",
      });

      assert(!("error" in result), "editPost should succeed for the author");
      const post = await postConcept.posts.findOne({ _id: postId });
      assertExists(post);
      assertEquals(post.content, "Updated content!");
      assertEquals(post.item, itemB);
      assertEquals(post.postType, "PROGRESS");
      assertExists(post.editedAt);
    });

    it("should return a permission error if the editor is not the author", async () => {
      const result = await postConcept.editPost({
        postId: postId,
        editor: userB, // userB is not the author
        newContent: "This should fail.",
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
      });

      assert("error" in result, "editPost should fail for a non-existent post");
      assertEquals((result as { error: string }).error, "Post not found");
    });

    it("should return an error for an invalid newPostType", async () => {
      const result = await postConcept.editPost({
        postId: postId,
        editor: userA,
        newContent: "Testing invalid type edit",
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

  describe("deletePost", () => {
    let postIdForDeletion: ID;

    beforeEach(async () => {
      // Create a post specifically for delete tests
      const createResult = await postConcept.createPost({
        author: userA,
        content: "This post will be deleted.",
        postType: "GENERAL",
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
});
