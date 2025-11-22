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