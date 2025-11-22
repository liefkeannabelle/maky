import { actions, Sync } from "@engine";
import { Comment, Post, Reaction } from "@concepts";

/**
 * CascadePostDeletion
 *
 * When a post is deleted, automatically removes all associated comments and reactions.
 * This ensures data consistency by cleaning up all related data when a post is removed.
 */
export const CascadePostDeletion: Sync = ({ postId }) => ({
  when: actions(
    [Post.deletePost, { postId }, {}],
  ),
  then: actions(
    [Comment.removeAllCommentsFromPost, { post: postId }],
    [Reaction.removeAllReactionsFromPost, { post: postId }],
  ),
});
