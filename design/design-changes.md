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