import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import CommentConcept from "./CommentConcept.ts";
import { ID } from "@utils/types.ts";

// Mock IDs for testing
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;
const post1 = "post:1" as ID;
const post2 = "post:2" as ID;

Deno.test(
  "CommentConcept - addCommentToPost",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const commentConcept = new CommentConcept(db);
    await commentConcept.comments.deleteMany({});

    // Test successful comment creation
    const content = "This is a great post!";
    const result = await commentConcept.addCommentToPost({
      post: post1,
      author: userA,
      content,
    });

    assert(!("error" in result), "Adding a valid comment should succeed.");
    assertExists(result.comment, "A comment ID should be returned on success.");

    const commentInDb = await commentConcept.comments.findOne({
      _id: result.comment,
    });
    assertExists(commentInDb, "The comment should exist in the database.");
    assertEquals(commentInDb.post, post1);
    assertEquals(commentInDb.author, userA);
    assertEquals(commentInDb.content, content);
    assertExists(commentInDb.createdAt);
    assertEquals(commentInDb.lastEditedAt, undefined);

    // Test adding a comment with empty content
    const emptyContentResult = await commentConcept.addCommentToPost({
      post: post1,
      author: userB,
      content: "   ", // Whitespace only
    });

    assert(
      "error" in emptyContentResult,
      "Adding an empty comment should fail.",
    );
    assertEquals(
      emptyContentResult.error,
      "Comment content cannot be empty",
      "Error message for empty content should be correct.",
    );

    await client.close();
  },
);

Deno.test(
  "CommentConcept - deleteComment",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const commentConcept = new CommentConcept(db);
    await commentConcept.comments.deleteMany({});

    // Setup: add a comment to delete
    const addResult = await commentConcept.addCommentToPost({
      post: post1,
      author: userA,
      content: "A comment to be deleted.",
    });
    assert("comment" in addResult, "Test setup failed: could not add comment.");
    const commentId = addResult.comment;

    // Test deleting a comment by someone who is not the author
    const wrongUserResult = await commentConcept.deleteComment({
      comment: commentId,
      author: userB, // Wrong user
    });

    assert("error" in wrongUserResult, "Deletion by a non-author should fail.");
    assertEquals(
      wrongUserResult.error,
      "Comment not found or user is not the author",
    );

    // Verify the comment still exists
    let commentInDb = await commentConcept.comments.findOne({ _id: commentId });
    assertExists(commentInDb, "Comment should not be deleted by wrong user.");

    // Test deleting a non-existent comment
    const nonExistentId = "comment:nonexistent" as ID;
    const nonExistentResult = await commentConcept.deleteComment({
      comment: nonExistentId,
      author: userA,
    });
    assert(
      "error" in nonExistentResult,
      "Deleting a non-existent comment should fail.",
    );

    // Test successful deletion by the author
    const successResult = await commentConcept.deleteComment({
      comment: commentId,
      author: userA, // Correct user
    });

    assert(
      !("error" in successResult),
      "Deletion by the author should succeed.",
    );
    assertEquals(
      successResult.success,
      true,
      "Delete response should include success: true",
    );
    commentInDb = await commentConcept.comments.findOne({ _id: commentId });
    assertEquals(
      commentInDb,
      null,
      "Comment should be deleted from the database.",
    );

    await client.close();
  },
);

Deno.test(
  "CommentConcept - editComment",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const commentConcept = new CommentConcept(db);
    await commentConcept.comments.deleteMany({});

    // Setup: add a comment to edit
    const addResult = await commentConcept.addCommentToPost({
      post: post1,
      author: userA,
      content: "Original content.",
    });
    assert("comment" in addResult, "Test setup failed: could not add comment.");
    const commentId = addResult.comment;

    // Test successful edit by the author
    const newContent = "This has been updated.";
    const successResult = await commentConcept.editComment({
      comment: commentId,
      author: userA,
      newContent,
    });
    assert(!("error" in successResult), "Editing by author should succeed.");
    assertEquals(
      successResult.success,
      true,
      "Success response should contain success: true.",
    );

    let commentInDb = await commentConcept.comments.findOne({ _id: commentId });
    assertExists(commentInDb);
    assertEquals(commentInDb.content, newContent);
    assertExists(
      commentInDb.lastEditedAt,
      "lastEditedAt should be set after an edit.",
    );

    // Test editing by a non-author
    const wrongUserResult = await commentConcept.editComment({
      comment: commentId,
      author: userB, // Wrong user
      newContent: "Attempted hijack!",
    });

    assert("error" in wrongUserResult, "Editing by a non-author should fail.");
    assertEquals(
      wrongUserResult.error,
      "Comment not found or user is not the author",
    );

    // Verify content did not change
    commentInDb = await commentConcept.comments.findOne({ _id: commentId });
    assertEquals(
      commentInDb?.content,
      newContent,
      "Content should not change after a failed edit.",
    );

    // Test editing with empty content
    const emptyContentResult = await commentConcept.editComment({
      comment: commentId,
      author: userA,
      newContent: " ",
    });

    assert(
      "error" in emptyContentResult,
      "Editing to empty content should fail.",
    );
    assertEquals(emptyContentResult.error, "Comment content cannot be empty");

    await client.close();
  },
);

Deno.test(
  "CommentConcept - Queries",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const commentConcept = new CommentConcept(db);
    await commentConcept.comments.deleteMany({});

    // Setup: add multiple comments
    const comment1Result = await commentConcept.addCommentToPost({
      post: post1,
      author: userA,
      content: "First comment",
    });
    await new Promise((r) => setTimeout(r, 10)); // ensure different timestamps
    const comment2Result = await commentConcept.addCommentToPost({
      post: post2,
      author: userB,
      content: "Comment on another post",
    });
    await new Promise((r) => setTimeout(r, 10));
    const comment3Result = await commentConcept.addCommentToPost({
      post: post1,
      author: userB,
      content: "Second comment on first post",
    });

    // Test _getCommentsForPost
    const { comments: post1Comments } = await commentConcept
      ._getCommentsForPost({ post: post1 });
    assertEquals(
      post1Comments.length,
      2,
      "Should retrieve only comments for the specified post.",
    );
    assert("comment" in comment1Result);
    assert("comment" in comment3Result);
    assertEquals(
      post1Comments[0]._id,
      comment1Result.comment,
      "Comments should be sorted by creation time.",
    );
    assertEquals(
      post1Comments[1]._id,
      comment3Result.comment,
      "Comments should be sorted by creation time.",
    );

    const { comments: post2Comments } = await commentConcept
      ._getCommentsForPost({ post: post2 });
    assertEquals(
      post2Comments.length,
      1,
      "Should retrieve correct number of comments for post 2.",
    );
    assert("comment" in comment2Result);
    assertEquals(post2Comments[0]._id, comment2Result.comment);

    // Test _getCommentById
    assert("comment" in comment1Result);
    const { comment: foundComment } = await commentConcept._getCommentById({
      comment: comment1Result.comment,
    });
    assertExists(foundComment);
    assertEquals(foundComment._id, comment1Result.comment);
    assertEquals(foundComment.content, "First comment");

    const nonExistentId = "comment:nonexistent" as ID;
    const { comment: notFoundComment } = await commentConcept._getCommentById({
      comment: nonExistentId,
    });
    assertEquals(
      notFoundComment,
      null,
      "Should return null for a non-existent comment ID.",
    );

    await client.close();
  },
);

Deno.test(
  "CommentConcept - removeAllCommentsFromPost",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const commentConcept = new CommentConcept(db);
    await commentConcept.comments.deleteMany({});

    // Setup: Add multiple comments to the same post
    await commentConcept.addCommentToPost({
      post: post1,
      author: userA,
      content: "First comment on post1",
    });
    await commentConcept.addCommentToPost({
      post: post1,
      author: userB,
      content: "Second comment on post1",
    });

    // Add a comment to a different post to ensure we only delete from post1
    await commentConcept.addCommentToPost({
      post: post2,
      author: userA,
      content: "Comment on post2",
    });

    // Verify setup: post1 should have 2 comments, post2 should have 1
    const { comments: post1Comments } = await commentConcept
      ._getCommentsForPost({ post: post1 });
    const { comments: post2Comments } = await commentConcept
      ._getCommentsForPost({ post: post2 });
    assertEquals(post1Comments.length, 2);
    assertEquals(post2Comments.length, 1);

    // 1. Test successful removal of all comments from post1
    const removeAllResult = await commentConcept.removeAllCommentsFromPost({
      post: post1,
    });

    assert(
      !("error" in removeAllResult),
      "removeAllCommentsFromPost should succeed",
    );
    assertEquals(
      removeAllResult.success,
      true,
      "removeAllCommentsFromPost should return success: true",
    );

    // Verify all comments for post1 are removed
    const { comments: post1CommentsAfter } = await commentConcept
      ._getCommentsForPost({ post: post1 });
    assertEquals(
      post1CommentsAfter.length,
      0,
      "All comments for post1 should be deleted",
    );

    // Verify comments for post2 are still intact
    const { comments: post2CommentsAfter } = await commentConcept
      ._getCommentsForPost({ post: post2 });
    assertEquals(
      post2CommentsAfter.length,
      1,
      "Comments for post2 should remain unchanged",
    );

    // 2. Test removing all comments from a post with no comments (should still succeed)
    const emptyPostResult = await commentConcept.removeAllCommentsFromPost({
      post: post1, // Already deleted all comments
    });

    assert(
      !("error" in emptyPostResult),
      "removeAllCommentsFromPost should succeed even if no comments exist",
    );
    assertEquals(
      emptyPostResult.success,
      true,
      "removeAllCommentsFromPost should return success: true even when no comments",
    );

    await client.close();
  },
);
Deno.test(
  "CommentConcept - _getCommentsForPostId",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const commentConcept = new CommentConcept(db);
    await commentConcept.comments.deleteMany({});

    // Setup: add comments
    await commentConcept.addCommentToPost({
      post: post1,
      author: userA,
      content: "First",
    });
    await commentConcept.addCommentToPost({
      post: post1,
      author: userB,
      content: "Second",
    });
    await commentConcept.addCommentToPost({
      post: post2,
      author: userA,
      content: "On another post",
    });

    // Test the query
    const [{ comments }] = await commentConcept._getCommentsForPostId({
      post: post1,
    });

    assertEquals(comments.length, 2);
    assertEquals(comments[0], { content: "First", author: userA });
    assertEquals(comments[1], { content: "Second", author: userB });

    // Check that it doesn't have other fields
    assert(
      !("_id" in comments[0]),
      "Projected comments should not have _id",
    );
    assert(
      !("createdAt" in comments[0]),
      "Projected comments should not have createdAt",
    );

    await client.close();
  },
);
