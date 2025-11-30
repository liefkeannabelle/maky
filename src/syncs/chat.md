


[@sync-compilation](sync-compilation.md)


[@trace-snippets](trace-snippets.md)



#  FIX PROBLEM: my Post.editPostVisibility doesn't work, and I have snippets of the backend trace that are relevant. analyze, find out the bug and propose a fix. only output the pieces of code you added or changed. don't include in the answer code that wasn't changed. the issue is in editPostAvaialbility. why is editPostavailabulity failibg but others syncs aren't failing like that? wht is different?

# response:

Excellent analysis of the problem. Based on the log traces and the code you provided, the issue is not with the logic of your synchronization itself, but with how the API request is being routed by the server.

### The Root Cause

The request to `/api/Post/editPostVisibility` is being handled by the **passthrough route** mechanism instead of your `HandleEditPostVisibilityRequest` synchronization.

Here's why that causes the error:

1.  The passthrough route takes the raw JSON body from the frontend (`{ "sessionId": "...", "postId": "...", "newVisibility": "..." }`) and passes it directly to the `PostConcept.editPostVisibility` action.
2.  The `editPostVisibility` action expects its argument to have an `editor` property for the authorization check: `if (post.author !== editor)`.
3.  Since the passthrough route sends `sessionId` instead of `editor`, the `editor` parameter inside the action is `undefined`. The check `post.author !== undefined` is always true, causing the "Permission denied" error.

Your other authenticated actions (like `createPost` and `deletePost`) likely work because their routes are correctly configured to be **excluded** from passthrough, which forces the request to be handled by their respective synchronizations. The sync then correctly uses the `sessionId` to look up the user and passes that user ID as the `author` or `deleter` parameter to the concept action.

### The Solution

To fix this, you must explicitly exclude the `/api/Post/editPostVisibility` route from the passthrough mechanism. This will ensure your `HandleEditPostVisibilityRequest` synchronization is triggered to handle the request correctly.

#### file: src/concepts/Requesting/passthrough.ts

```typescript
// Add the route for editPostVisibility to the exclusions array.
// This ensures that the passthrough handler ignores it, and the
// Requesting concept fires a `Requesting.request` action instead,
// which will be caught by your synchronization.

// ... (existing inclusions)

export const exclusions: string[] = [
  "/api/UserAccount/register",
  "/api/UserAccount/login",
  "/api/UserAccount/changePassword",
  "/api/UserAccount/updateCredentials",
  "/api/UserAccount/deleteAccount",
  "/api/UserProfile/createProfile",
  "/api/UserProfile/updateDisplayName",
  "/api/UserProfile/updateBio",
  "/api/UserProfile/updateAvatar",
  "/api/UserProfile/setGenrePreferences",
  "/api/UserProfile/changeSkillLevel",
  "/api/Post/createPost",
  "/api/Post/deletePost",
  "/api/Post/editPost",
  "/api/Post/editPostVisibility", // <--- ADD THIS LINE
  "/api/Comment/addCommentToPost",
  "/api/Comment/deleteComment",
  "/api/Comment/editComment",
  "/api/Reaction/addReactionToPost",
  "/api/Reaction/changeReactionType",
  "/api/Reaction/removeReactionFromPost",
  "/api/Friendship/sendFriendRequest",
  "/api/Friendship/acceptFriendRequest",
  "/api/Friendship/declineFriendRequest",
  "/api/Friendship/removeFriend",
  // ... any other existing exclusions
];
```