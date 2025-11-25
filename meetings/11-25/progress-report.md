# 11-25 Meeting Progress Report
## Status Update
Since our last meeting, our focus has been implementing the front and back end for the alpha checkpoint deadline. We met Saturday to tackle the bulk of our core functionality with pair programming. On Sunday, we met to align our goals and divide tasks to finish our alpha checkpoint goals. On Monday evening, we met to walk through our user journey on Render and tie up a few loose ends.

## Design Changes
As we worked through implementing the core learning functionality and basic social functions, we realized we had to add a few additional actions to a few of our concepts:

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


- Modified `addCommentToPost` to only accept if the requester is friends with the poster

- Modified `createPost` to attach multiple Items (a.k.a. songs and chords) in their posts.


## Issues
Having reached the alpha checkpoint, we are very satisifed with the degree of functionality ChordConnect has. We have a handful of specific improvements or additions that we will add for the beta checkpoint and/or final submission:

- In our song data base, the genre identifier is being read as null as reflect in our Mongo DB and on the frontend. To be able to incorprate the user's genre preferences to the song recommendations, we will need to get these values to fill correctly. 
- Currently, the chord recommendations are loading very slow because there are 5000 songs in the dataset that it iterates through the get the best chord to learn. We are looking for ways to optimize this to move more quickly.
- The song seed script is parsing in songs that don't have valid titles or artists. To fix this, we will update script to filter that out.
- With our current, "unlocking songs" approach, no chords are recommended if the user only knows a few chords. There are a few different approaches we are considering (i.e. other recommendations, hard coding first recs) and will need to decide which is best to implement.
- Ideally, we would be able to generate a script or work on script that generates clean chord visuals for front-end.
- Some getters & one action in the social features need to have users in their arguments: 
  -  `removeAllCommentsFromPost`
  -   `_getFriends`
  -   `_getPendingFriendships`
  -   `_getReactionsForPost`
- Did our database get wiped?

## Plans & Decisions
The key decisions that must be made are in regard to the issues outlined above. In doing so, we will determine the more zoomed in functionality of ChordConnect. We have talked over a few options on how to address each issue and will meet to decide what best to do moving forward. In regards to plans, we have updated our [development plan](/design/alpha-dev-plan.md) to reflect the current state of our project and our next steps moving forward.

