# Design changes

## What you need to update when adding/changing an action:
- concept implementation
- concept spec
- concept tests
- sync spec (and implementation if it exists already)
- passthrough
- API spec (make sure you add it to the frontend as well)
- this file


## Alpha Checkpoint

- Added `removeAllReactionsFromPost` action to Reaction concept
  - Purpose: Enables efficient cascade deletion of all reactions when a post is deleted
  - Implementation: Uses `deleteMany` to remove all reactions for a given post in a single operation
  - Updated `CascadePostDeletion` sync to use this new action instead of iterating through individual reactions
  - Added to passthrough exclusions (internal action used by synchronizations)
  - Added comprehensive tests covering multiple reactions and edge cases

- Added `removeAllCommentsFromPost` action to Comment concept
  - Purpose: Enables efficient cascade deletion of all comments when a post is deleted
  - Implementation: Uses `deleteMany` to remove all comments for a given post in a single operation
  - Updated `CascadePostDeletion` sync to use this new action instead of iterating through individual comments
  - Added to passthrough exclusions (internal action used by synchronizations)
  - Added comprehensive tests covering multiple comments and edge cases

- Added `_getPostsForUser` query to Post concept
  - Purpose: Retrieves all posts authored by a specific user, ordered by creation date (newest first)
  - Implementation: Uses MongoDB `find` with `author` filter and `sort` by `createdAt` descending
  - Returns array of post documents for use in user profiles and feeds
  - Added to passthrough exclusions (queries should go through Requesting for authentication/authorization)
  - Added comprehensive tests covering ordering, filtering, and edge cases

- Added `_getPostsForUsers` query to Post concept
  - Purpose: Retrieves all posts authored by any of the specified users, useful for building feeds
  - Implementation: Uses MongoDB `find` with `$in` operator to match multiple authors and `sort` by `createdAt` descending
  - Returns array of post documents from multiple users, ordered by creation date (newest first)
  - Added to passthrough exclusions (queries should go through Requesting for authentication/authorization)
  - Added comprehensive tests covering multiple users, ordering, filtering, and edge cases

- Added `removeAllPostsForUser` action to Post concept
  - Purpose: Enables efficient cascade deletion of all posts when a user account is deleted
  - Implementation: Uses `find` to retrieve all post IDs, then `deleteMany` to remove all posts for a given user in a single operation
  - Returns `success: true` and `postIds` array containing all deleted post IDs (used by `CascadeAllPostsDeletionForUser` sync)
  - Updated `OnDeleteAccount` sync to use this new action
  - Added to passthrough exclusions (internal action used by synchronizations)
  - Added comprehensive tests covering multiple posts and edge cases

- Added `removeAllCommentsForUser` action to Comment concept
  - Purpose: Enables efficient cascade deletion of all comments when a user account is deleted
  - Implementation: Uses `deleteMany` to remove all comments for a given user in a single operation
  - Updated `OnDeleteAccount` sync to use this new action
  - Added to passthrough exclusions (internal action used by synchronizations)
  - Added comprehensive tests covering multiple comments and edge cases

- Added `removeAllReactionsForUser` action to Reaction concept
  - Purpose: Enables efficient cascade deletion of all reactions when a user account is deleted
  - Implementation: Uses `deleteMany` to remove all reactions for a given user in a single operation
  - Updated `OnDeleteAccount` sync to use this new action
  - Added to passthrough exclusions (internal action used by synchronizations)
  - Added comprehensive tests covering multiple reactions and edge cases

- Added `removeAllSessionsForUser` action to Sessioning concept
  - Purpose: Enables efficient cascade deletion of all sessions when a user account is deleted
  - Implementation: Uses `deleteMany` to remove all sessions for a given user in a single operation
  - Updated `OnDeleteAccount` sync to use this new action
  - Added to passthrough exclusions (internal action used by synchronizations)
  - Created Sessioning.test.ts with comprehensive tests covering multiple sessions and edge cases

- Added `CascadeAllPostsDeletionForUser` sync
  - Purpose: Ensures data integrity by cascading deletion of comments and reactions when all posts for a user are deleted via `removeAllPostsForUser`
  - Implementation: Triggers when `Post.removeAllPostsForUser` succeeds, queries all posts for that user using `Post._getPostsForUser`, then deletes all comments and reactions for each post
  - This sync complements `CascadePostDeletion` which handles single post deletions, ensuring consistent cleanup behavior for both individual and bulk post deletions
  - Follows the same pattern as `CascadePostDeletion` but handles bulk deletion scenarios (e.g., during account deletion)

- Modified `addCommentToPost` to only accept if the requester is friends with the poster

- Modified `createPost` to attach multiple Items (a.k.a. songs and chords) in their posts.

- Refactored `JamSession` concept for improved modularity
  - Purpose: To decouple the `JamSession` concept from specific implementations of groups and items, making it more abstract and reusable across different contexts.
  - Replaced concrete types like `Song` and `JamGroup` with generic dependencies `Item` and `Group`.
  - Updated `requires` clauses for `startJamSession` and `joinSession` to use abstract permission checks (e.g., "user is permitted to...") instead of concrete membership checks. This delegates authorization logic to the `Group` concept, improving separation of concerns.