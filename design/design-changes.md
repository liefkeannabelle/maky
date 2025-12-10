# Design changes


## Beta Checkpoint

### Spec Changes

- Removed the Following concept, and only keeping the Friendship concept. 
  - Because they were fairly similar in nature, only one socializing concept was kept.
  - The friendship concepts seems more inline with how we want users to be interacting with the app (striving for more one-on-one connections than influecing opportunities)

- UserAccount has a Private status as well.
  - For visibility, this is treated the same as the Kid Account status (it functions to hid the "Feed" Page, and subsequent socializing components for the app)

- Posts have visibility statuses now
  - The user has a Journal entry with private posts, and a public posts entry in the Feed page. 

### Sync changes

- The following actions and querries are now requiring authenticationremoveAllCommentsFromPost (and other remove functions)
  - _getFriends
  - _getPendingFriendships
  - _getPostsViewableToUser
  - _getProfile
  - _getCommentsForPostId
  - _getReactionsForPostId


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

- Implemented `JamGroup` concept
  - Purpose: To allow users to create and manage private groups for collaborative jamming
  - Actions: `createJamGroup`, `addMember`, `removeUserFromJamGroup`, `disbandJamGroup`
  - Queries: `_getJamGroupsForUser`, `_getJamGroupById`
  - All actions return `{ success: true }` for consistency with other concepts
  - Creator is automatically added as first member
  - Comprehensive test coverage (7 tests, all passing)

- Implemented `JamSession` concept
  - Purpose: To facilitate real-time or asynchronous collaborative music sessions within a jam group
  - Actions: `scheduleJamSession`, `startJamSession`, `joinSession`, `bulkJoinUsers`, `shareSongInSession`, `updateSongLogFrequency`, `endJamSession`
  - Queries: `_getJamSessionsForGroup`, `_getJamSessionById`, `_getActiveSessionForGroup`
  - Session status management: ACTIVE, COMPLETED, SCHEDULED
  - Shared songs tracking with participant status updates
  - Comprehensive test coverage (10 tests, all passing)

- Created JamGroup synchronizations (`jamGroup.sync.ts`)
  - 9 syncs: 4 action handlers + 4 success/error responders + 1 disband handler
  - `HandleAddMemberToJamGroup` enforces friendship requirement and blocks kid/private accounts
  - All actions require authentication via `Sessioning._getUser`
  - Creator-only disband enforcement handled by concept

- Created JamSession synchronizations (`jamSession.sync.ts`)
  - 12 syncs: 6 action handlers + 6 success/error responders
  - All actions require authentication via `Sessioning._getUser`
  - Session state validation (ACTIVE/COMPLETED/SCHEDULED) handled by concept
  - Participant membership checks handled by concept

- Created JamGroup query synchronizations (`jamGroupQueries.sync.ts`)
  - 4 syncs for data retrieval and analysis
  - `HandleGetJamGroupsForUser` - Returns user's group memberships
  - `HandleGetJamGroupById` - Returns specific group details
  - `HandleGetCommonChordsForGroup` - **CRITICAL** - Computes intersection of all members' known chords by querying ChordLibrary for each member
  - `HandleGetPlayableSongsForGroup` - **CRITICAL** - Returns songs playable by entire group based on common chords, essential for jam session recommendations

- Created JamSession query synchronizations (`jamSessionQueries.sync.ts`)
  - 3 syncs for session data retrieval
  - `HandleGetJamSessionsForGroup` - Returns all sessions (past and present) for a group
  - `HandleGetJamSessionById` - Returns specific session details with participants and shared songs
  - `HandleGetActiveSessionForGroup` - Returns currently active session for real-time coordination

- Updated API specification with JamGroup and JamSession endpoints
  - 8 JamGroup endpoints (4 actions + 4 queries)
  - 9 JamSession endpoints (6 actions + 3 queries)
  - All success responses updated to `{ "success": true }` for consistency
  - Fixed `removeUserFromJamGroup` to accept `user` parameter (not just self-removal)
  - Documented authentication requirements and request/response formats
  - Added critical common chords and playable songs endpoints for frontend integration

- Fixed `_getOverlappingChords` to support single-user groups
  - Purpose: To enable single-user jam groups to function properly (solo practice mode)
  - Modified `ChordLibrary._getOverlappingChords` to handle single user case by returning all their known chords in the same format as multi-user results
  - Updated concept method to return user's full chord inventory with proper mastery levels for 1-user input
  - Simplified `HandleGetCommonChordsForGroup` and `HandleGetPlayableSongsForGroup` syncs to always use `_getOverlappingChords` (removed special-case code)
  - Updated API specification: changed requirement from "at least two user IDs" to "at least one user ID"
  - Updated concept docstring to reflect new behavior
  - Fixes bug where single-user jam groups returned empty chord arrays

- Re-fixed `_getOverlappingChords` single-user handling (regression fix)
  - Purpose: Fix regression where single-user jam groups were returning empty chord arrays again
  - Issue: Early return check `if (userIds.length < 2)` was preventing single-user handling code from executing
  - Fix: Removed early return for `< 2` users, reordered logic to check for empty array first (returns empty), then single user (returns all their chords), then multiple users (returns overlapping chords)
  - Updated test in `ChordLibrary.test.ts`: Changed "returns empty for less than 2 users" to "returns all chords for single user" and added separate test for zero users case
  - Behavior: Now correctly returns all known chords for a single user, empty results only for zero users
  - Fixes bug where jam group common chords feature was not working for one person