# ChordConnect API Specification

This document provides the API specification for the various concepts that make up the ChordConnect application. All endpoints use the `POST` method and communicate via `application/json`.

## API Architecture Overview

### Requesting Concept Flow

All API requests in ChordConnect go through the **Requesting** concept, which acts as a unified entry point for all HTTP requests. This design allows synchronizations to handle request processing, authentication, and response generation.

**How it works:**
1. Frontend makes a `POST` request to `/api/{ConceptName}/{actionName}` (e.g., `POST /api/UserAccount/login`)
2. The Requesting concept's catch-all route (`/api/*`) captures all requests
3. The path is extracted from the URL (e.g., `/UserAccount/login`)
4. A `Requesting.request` action is triggered with the path and request body
5. Synchronizations listen for these requests and process them
6. The synchronization performs the concept action and responds via `Requesting.respond`
7. The response is returned to the frontend

**Request Format:**
- All requests: `POST /api/{path}`
- Path structure: `/{ConceptName}/{actionName}` (e.g., `/UserAccount/login`, `/Post/createPost`)
- Request body: JSON object containing action parameters
- Response: JSON object (for actions) or JSON array (for queries starting with `_`)

### Sessioning Concept - Authentication

After a user logs in, all authenticated API requests should include a `sessionId` in the request body instead of directly passing the `user` parameter. 

**Authentication Flow:**
1. User calls `POST /api/UserAccount/login` with credentials
2. Login response returns both `user` and `sessionId`
3. Frontend stores the `sessionId` (typically in localStorage or sessionStorage)
4. All subsequent authenticated requests include `sessionId` in the request body
5. Synchronizations extract the user from the session using `Sessioning._getUser(sessionId)`

**Note:** Endpoints that don't require authentication (like `register` and `login`) do not need a `sessionId`.

### Important Notes

- **Requesting and Sessioning are internal concepts**: The `Requesting.request`, `Requesting.respond`, `Sessioning.startSession`, `Sessioning.endSession`, and `Sessioning._getUser` endpoints are typically not called directly by the frontend. They are used internally by synchronizations.
- **Query endpoints** (methods starting with `_`) return arrays, while **action endpoints** return single objects.
- **Error responses** always follow the format `{ "error": "error message" }`.

---

# API Specification: UserAccount Concept

**Purpose:** To allow users to establish and manage their identity within the app.

---

## API Endpoints

### POST /api/UserAccount/register

**Description:** Creates a new user account with the provided credentials.

**Requirements:**
- No User exists with the given `username` or `email`.

**Effects:**
- Creates a new User; sets its `username`, `email`, `isKidAccount` status, `isPrivateAccount` status, and a hash of the `password`; returns the new user.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "isKidAccount": "boolean",
  "isPrivateAccount": "boolean"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAccount/login

**Description:** Authenticates a user and returns both their user object and a session ID.

**Requirements:**
- A User exists with the given `username` and the provided `password` matches their `passwordHash`.

**Effects:**
- Returns the matching user and creates a new session, returning the `sessionId`. The `sessionId` should be stored by the frontend and included in all subsequent authenticated requests.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string",
  "sessionId": "string"
}
```

**Note:** A synchronization automatically creates a Sessioning session upon successful login. The frontend should store the `sessionId` and include it in all authenticated API requests.

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAccount/changePassword

**Description:** Updates an existing user's password after verifying the old password.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists and the provided `oldPassword` matches their current `passwordHash`.
- If the session is invalid, user does not exist, or the `oldPassword` does not match, an error is returned.

**Effects:**
- On success, updates the `passwordHash` for the authenticated user with a hash of `newPassword`; returns `true` as `success`.
- On failure, returns an error message.

**Request Body:**
```json
{
  "sessionId": "string",
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAccount/updateCredentials

**Description:** Updates a user's username and email.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists. The `newUsername` and `newEmail` are not already in use by another User.

**Effects:**
- Updates the `username` to `newUsername` and `email` to `newEmail` for the authenticated user; returns `true` as `success`.

**Request Body:**
```json
{
  "sessionId": "string",
  "newUsername": "string",
  "newEmail": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAccount/setKidAccountStatus

**Description:** Sets the 'isKidAccount' status for a given user.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists.

**Effects:**
- Sets the `isKidAccount` status for the authenticated user to the provided `status`; returns `true` as `success`.

**Request Body:**
```json
{
  "sessionId": "string",
  "status": "boolean"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAccount/setPrivateAccountStatus

**Description:** Sets the 'isPrivateAccount' status for a given user.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists.

**Effects:**
- Sets the `isPrivateAccount` status for the authenticated user to the provided `status`; returns `true` as `success`.

**Request Body:**
```json
{
  "sessionId": "string",
  "status": "boolean"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAccount/deleteAccount

**Description:** Deletes a user's account after verifying their password.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists and the provided `password` matches their `passwordHash`.

**Effects:**
- Removes the authenticated user and all their associated data from the state; returns `true` as `success`.

**Request Body:**
```json
{
  "sessionId": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAccount/_isUserById

**Description:** Checks if a user exists for a given user ID.

**Requirements:**
- This query can always be executed.

**Effects:**
- Returns `true` as `result` if a user with the given ID exists, `false` otherwise.

**Request Body:**
```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "result": true
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAccount/_isKidOrPrivateAccount

**Description:** Determines if a user account is marked as a kid account, a private account, or both.

**Authentication:** Requires a valid `sessionId`. The requester must match the `user` being queried.

**Requirements:**
- A User exists with the given `user` ID and the session corresponds to that user.

**Effects:**
- Returns `true` as `isKidOrPrivate` if the user is a kid account or a private account (or both), `false` otherwise. The HTTP response is wrapped in `{ "results": [...], "error": string | null }` to reflect authentication failures.

**Request Body:**
```json
{
  "sessionId": "string",
  "user": "ID"
}
```

**Success Response Body (Query):**
```json
{
  "results": [
    {
      "isKidOrPrivate": true
    }
  ],
  "error": null
}
```

**Error Response Body:**
```json
{
  "results": [],
  "error": "string" // e.g., "Invalid session" or "Unauthorized"
}
```
---

# API Specification: UserProfile Concept

**Purpose:** To allow users to personalize their in-app identity and preferences.

---

## API Endpoints

### POST /api/UserProfile/createProfile

**Description:** Creates a new profile for a user with their display name and musical preferences.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists and does not already have a `Profile`.

**Effects:**
- Creates a new `Profile` for the authenticated user with the given `displayName`, `genrePreferences`, and `skillLevel`; returns the new `profile`.

**Request Body:**
```json
{
  "sessionId": "string",
  "displayName": "string",
  "genrePreferences": "string[]",
  "skillLevel": "string" // "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
}
```

**Success Response Body (Action):**
```json
{
  "profile": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserProfile/updateDisplayName

**Description:** Updates the display name in a user's profile.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists and has an associated `Profile`.

**Effects:**
- Updates the `displayName` in the authenticated user's `Profile` to `newDisplayName`.

**Request Body:**
```json
{
  "sessionId": "string",
  "newDisplayName": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserProfile/updateLearningGoals

**Description:** Updates the optional learning-goals blurb in a user's profile (what they're currently practicing toward).

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists and has an associated `Profile`.

**Effects:**
- Updates the `learningGoals` in the authenticated user's `Profile` to `newLearningGoals` (or removes it when omitted).

**Request Body:**
```json
{
  "sessionId": "string",
  "newLearningGoals": "string" // optional
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserProfile/updateAvatar

**Description:** Updates the optional avatar URL in a user's profile.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists and has an associated `Profile`.

**Effects:**
- Updates the `avatarUrl` in the authenticated user's `Profile` to `newAvatarUrl`, removing the field when the literal string `"UNDEFINED"` is supplied; returns `true` as `success`.

**Request Body:**
```json
{
  "sessionId": "string",
  "newAvatarUrl": "string" // always include; send "UNDEFINED" to clear the avatar
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserProfile/setGenrePreferences

**Description:** Replaces the genre preferences in a user's profile.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists and has an associated `Profile`.

**Effects:**
- Replaces the `genrePreferences` in the authenticated user's `Profile` with `newGenrePreferences`; returns `true` as `success`.

**Request Body:**
```json
{
  "sessionId": "string",
  "newGenrePreferences": "string[]"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserProfile/changeSkillLevel

**Description:** Updates the skill level in a user's profile.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists and has an associated `Profile`.

**Effects:**
- Updates the `skillLevel` in the authenticated user's `Profile` to `newSkillLevel`; returns `true` as `success`.

**Request Body:**
```json
{
  "sessionId": "string",
  "newSkillLevel": "string" // "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserProfile/setTargetSong

**Description:** Sets a target song for the user to learn.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists and has an associated `Profile`. The `song` exists.

**Effects:**
- Updates the `targetSong` in the authenticated user's `Profile` to the provided `song`; returns `true` as `success`.

**Request Body:**
```json
{
  "sessionId": "string",
  "song": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserProfile/removeTargetSong

**Description:** Removes the target song from a user's profile.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists and has an associated `Profile`.

**Effects:**
- Removes the `targetSong` from the authenticated user's `Profile`; returns `true` as `success`.

**Request Body:**
```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserProfile/deleteProfile

**Description:** Deletes a user's profile.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists and has an associated `Profile`.

**Effects:**
- Removes the `Profile` associated with the authenticated user from the state; returns `true` as `success`.

**Request Body:**
```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

### POST /api/UserProfile/_searchByDisplayName

**Description:** Searches for user profiles by a partial match on their display name.

**Requirements:**
- This is a public query and does not require authentication.

**Effects:**
- Returns a set of users and their display names that partially match the query string.

**Request Body:**
```json
{
  "query": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "string",
    "displayName": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserProfile/_getProfile

**Description:** Retrieves all profile information for a given user.

**Authentication:** Requires a valid `sessionId`. The session user must either match the requested `user` or already be accepted friends with that user.    

**Requirements:**
- The `user` must exist. The requester must be the same user or an accepted friend.

**Effects:**
- Returns an array containing a single profile object for the specified user (or an empty array when no profile exists) and wraps it in the `{ "results": [...], "error": string | null }` envelope used by authenticated queries. Each profile highlights the user's display name, optional `learningGoals` blurb (a short note about what they're practicing toward), avatar, genre preferences, skill level, and target song.

**Request Body:**
```json
{
  "sessionId": "string",
  "user": "string"
}
```

**Success Response Body (Query):**
```json
{
  "results": [
    {
      "profile": {
        "displayName": "string",
        "learningGoals": "string",
        "avatarUrl": "string",
        "genrePreferences": ["string"],
        "skillLevel": "string",
        "targetSong": "string"
      }
    }
  ],
  "error": null
}
```

**Error Response Body:**
```json
{
  "results": [],
  "error": "string"
}
```
---
# API Specification: Post Concept

**Purpose:** To allow users to share their learning progress and musical activities, fostering community and motivation.

---

## API Endpoints

### POST /api/Post/createPost

**Description:** Creates a new post for a user to share an update.

**Authentication:** Requires a valid `sessionId`. The author is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists. Every `item` in `items` must exist. `visibility` must be either `PUBLIC` or `PRIVATE`.

**Effects:**
- Creates a new `Post` with a unique `postId`; sets `author` to the authenticated user, `content`, `postType`, `items`, `visibility`, and `createdAt` to the current DateTime; returns the `postId`.

**Request Body:**
```json
{
  "sessionId": "string",
  "content": "string",
  "postType": "string", // "PROGRESS" | "GENERAL"
  "items": ["string"],
  "visibility": "string" // "PUBLIC" | "PRIVATE"
}
```

**Success Response Body (Action):**
```json
{
  "postId": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Post/deletePost

**Description:** Deletes a post created by a user.

**Authentication:** Requires a valid `sessionId`. The deleter is automatically extracted from the session.

**Requirements:**
- The `postId` exists. The user associated with `sessionId` is the `author` of the `Post` or an authorized administrator.

**Effects:**
- Removes the `Post` identified by `postId` from the state; returns `success: true` on completion.

**Request Body:**
```json
{
  "sessionId": "string",
  "postId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Post/editPost

**Description:** Edits the content and properties of an existing post.

**Authentication:** Requires a valid `sessionId`. The editor is automatically extracted from the session.

**Requirements:**
- The `postId` exists. The user associated with `sessionId` is the `author` of the `Post`.
- Requests must still include `newItems` and `newPostType`; supply the literal string `"UNDEFINED"` for any field that should remain unchanged.

**Effects:**
- Updates the `content` of the `Post` identified by `postId` to `newContent`. Replaces `items` with `newItems` unless the literal string `"UNDEFINED"` is provided, and updates `postType` to `newPostType` unless it is `"UNDEFINED"`. Sets `editedAt` to the current DateTime; returns `success: true` on completion.

**Request Body:**
```json
{
  "sessionId": "string",
  "postId": "string",
  "newContent": "string",
  "newItems": ["string"], // always include; send "UNDEFINED" to leave items unchanged
  "newPostType": "string" // "PROGRESS" | "GENERAL"; send "UNDEFINED" to leave postType unchanged
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Post/editPostVisibility

**Description:** Updates the visibility of an existing post without changing other fields.

**Authentication:** Requires a valid `sessionId`. The editor is automatically extracted from the session.

**Requirements:**
- The `postId` exists. The user associated with `sessionId` is the `author` of the `Post`.
- `newVisibility` must be either `PUBLIC` or `PRIVATE`.

**Effects:**
- Updates the `visibility` of the `Post` identified by `postId` to `newVisibility` and sets `editedAt` to the current DateTime; returns `success: true` on completion.

**Request Body:**
```json
{
  "sessionId": "string",
  "postId": "string",
  "newVisibility": "string" // "PUBLIC" | "PRIVATE"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

### POST /api/Post/_getPostsViewableToUser

**Description:** Retrieves the personalized feed for a single viewer. The synchronization layer gathers the viewer's accepted friends (plus the viewer) and queries per-user endpoints (private/public) to assemble the feed according to friendship rules.

**Authentication:** Requires a valid `sessionId`. The session user must match the `user` provided in the request.

**Requirements:**
- The `user` exists and matches the authenticated session.
- Friendship data is used server-side; nothing extra is required from the client beyond the viewer's identity.

**Effects:**
- Returns all posts authored by the viewer or their accepted friends, ordered by creation date (newest first), wrapped in the `{ "results": [...], "error": string | null }` query envelope. Private posts only show up when authored by the viewer; friends contribute their public posts.

**Request Body:**
```json
{
  "sessionId": "string",
  "user": "string"
}
```

**Success Response Body (Query):**
```json
{
  "results": [
    {
      "post": {
        "_id": "string",
        "author": "string",
        "content": "string",
        "items": ["string"],
        "postType": "string",
        "visibility": "string",
        "createdAt": "string",
        "editedAt": "string"
      }
    }
  ],
  "error": null
}
```

**Error Response Body:**
```json
{
  "results": [],
  "error": "string"
}
```

---

### POST /api/Post/removeAllPostsForUser

**Description:** Removes all posts authored by a specific user. This is typically used for cascade deletion when a user account is deleted.

**Authentication:** This endpoint is typically called internally by synchronizations and may not require user authentication. However, if exposed directly, it should require appropriate authorization (e.g., the user themselves or an administrator).

**Requirements:**
- The `user` exists.

**Effects:**
- Removes all `Post`s authored by the specified `user` from the state; returns `success: true` and `postIds` array containing the IDs of all deleted posts.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": true,
  "postIds": ["string"]
}
```

**Note:** The `postIds` array contains the IDs of all posts that were deleted. This is used internally by the `CascadeAllPostsDeletionForUser` synchronization to cascade deletion of comments and reactions for each deleted post.

**Error Response Body:**
```json
{
  "error": "string"
}
```


### POST /api/Post/_getPersonalPrivatePosts

**Description:** Retrieves all private posts for the authenticated user. Although the request includes a `user` parameter, the server validates that the session user matches the requested user before returning data.

**Authentication:** Requires a valid `sessionId` for the user whose private posts are being viewed.

**Requirements:**
- The `sessionId` is valid and belongs to the same user provided in `user`.

**Effects:**
- Returns all `PRIVATE` posts authored by the authenticated user, ordered by creation date (newest first), inside the `{ "results": [...], "error": string | null }` envelope so authentication failures can be surfaced consistently.

**Request Body:**
```json
{
  "sessionId": "string",
  "user": "string"
}
```

**Success Response Body (Query):**
```json
{
  "results": [
    {
      "post": {
        "_id": "string",
        "author": "string",
        "content": "string",
        "items": ["string"],
        "postType": "string",
        "visibility": "string",
        "createdAt": "string",
        "editedAt": "string"
      }
    }
  ],
  "error": null
}
```

**Error Response Body:**
```json
{
  "results": [],
  "error": "string"
}
```
---

### POST /api/Post/_getPersonalPublicPosts

**Description:** Retrieves all public posts for the authenticated user. Despite including `user` in the request, the server ensures that the session user matches the requested user before serving data.

**Authentication:** Requires a valid `sessionId`.

**Requirements:**
- The `sessionId` belongs to the same user identified by `user`.

**Effects:**
- Returns all `PUBLIC` posts authored by the authenticated user, ordered by creation date (newest first), wrapped in the `{ "results": [...], "error": string | null }` envelope.

**Request Body:**
```json
{
  "sessionId": "string",
  "user": "string"
}
```

**Success Response Body (Query):**
```json
{
  "results": [
    {
      "post": {
        "_id": "string",
        "author": "string",
        "content": "string",
        "items": ["string"],
        "postType": "string",
        "visibility": "string",
        "createdAt": "string",
        "editedAt": "string"
      }
    }
  ],
  "error": null
}
```

**Error Response Body:**
```json
{
  "results": [],
  "error": "string"
}
```
---

### POST /api/Post/_getPublicPostsOfUsers

**Description:** Retrieves public posts from a supplied list of users. A `sessionId` is required so that future logic can verify follower or friend relationships for the requesting user.

**Authentication:** Requires a valid `sessionId`.

**Requirements:**
- The `sessionId` is valid. All `users` in the request must exist.

**Effects:**
- Returns all `PUBLIC` posts authored by any of the specified `users`, ordered by creation date (newest first).

**Request Body:**
```json
{
  "sessionId": "string",
  "users": ["string"]
}
```

**Success Response Body (Query):**
```json
[
  {
    "post": {
      "_id": "string",
      "author": "string",
      "content": "string",
      "items": ["string"],
      "postType": "string",
      "visibility": "string",
      "createdAt": "string",
      "editedAt": "string"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

---
# API Specification: Comment Concept

**Purpose:** To allow users to interact with posts.

---

## API Endpoints

### POST /api/Comment/addCommentToPost

**Description:** Adds a new comment to an existing post.

**Authentication:** Requires a valid `sessionId`. The author is automatically extracted from the session.

**Requirements:**
- The `post` exists and the user associated with `sessionId` exists.

**Effects:**
- Creates a new `Comment` with a unique `commentId`, links it to the `post` and authenticated user, sets its `content` and `createdAt` timestamp; adds it to the comments set of `post`; returns the new `comment`.

**Request Body:**
```json
{
  "sessionId": "string",
  "post": "string",
  "content": "string"
}
```

**Success Response Body (Action):**
```json
{
  "comment": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Comment/deleteComment

**Description:** Deletes a comment written by the user.

**Authentication:** Requires a valid `sessionId`. The author is automatically extracted from the session.

**Requirements:**
- The `comment` exists and its `author` matches the user associated with `sessionId`.

**Effects:**
- Removes the `comment` from the set of `Comments` and from the `comments` set of `comment.post`.

**Request Body:**
```json
{
  "sessionId": "string",
  "comment": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Comment/editComment

**Description:** Edits the content of a comment written by the user.

**Authentication:** Requires a valid `sessionId`. The author is automatically extracted from the session.

**Requirements:**
- The `comment` exists and its `author` matches the user associated with `sessionId`.

**Effects:**
- Updates the `content` of the `comment` to `newContent`, sets `lastEditedAt` to the current timestamp, and returns `success: true`.

**Request Body:**
```json
{
  "sessionId": "string",
  "comment": "string",
  "newContent": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Comment/removeAllCommentsFromPost

**Description:** Removes all comments from a post. This is typically used for cascade deletion when a post is deleted.

**Authentication:** This endpoint is typically called internally by synchronizations and may not require user authentication. However, if exposed directly, it should require appropriate authorization (e.g., post author or administrator).

**Requirements:**
- The `post` exists.

**Effects:**
- Removes all `Comment`s associated with the specified `post` from the state and from the `comments` set of `post`; returns `success: true`.

**Request Body:**
```json
{
  "post": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Comment/removeAllCommentsForUser

**Description:** Removes all comments authored by a specific user. This is typically used for cascade deletion when a user account is deleted.

**Authentication:** This endpoint is typically called internally by synchronizations and may not require user authentication. However, if exposed directly, it should require appropriate authorization (e.g., the user themselves or an administrator).

**Requirements:**
- The `user` exists.

**Effects:**
- Removes all `Comment`s authored by the specified `user` from the state; returns `success: true`.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": true
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Comment/_getCommentsForPostId

**Description:** Retrieves a simplified list of comments for a specific post. Requires authentication so only the post author or their accepted friends can view the thread.

**Authentication:** Requires a valid `sessionId` belonging to either the post author or an accepted friend of the author.

**Requirements:**
- The `post` must exist.

**Effects:**
- Returns a single-element array; the element contains a `comments` property holding the simplified comment objects (`{ commentId, content, author }`), wrapped in the `{ "results": [...], "error": string | null }` envelope.

**Request Body:**
```json
{
  "sessionId": "string",
  "post": "string"
}
```

**Success Response Body (Query):**
```json
{
  "results": [
    {
      "comments": [
        {
          "commentId": "string",
          "content": "string",
          "author": "string"
        }
      ]
    }
  ],
  "error": null
}
```

**Error Response Body:**
```json
{
  "results": [],
  "error": "string"
}
```
---

# API Specification: Reaction Concept

**Purpose:** To allow users to express positive sentiment on posts.

---

## API Endpoints

### POST /api/Reaction/addReactionToPost

**Description:** Adds a reaction of a specific type to a post.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` and `post` exist. No `Reaction` already exists for this specific combination of user and `post`.

**Effects:**
- Creates a new `Reaction` with a unique `reactionId`; sets the authenticated user, `post`, `type`, and sets `createdAt` to the current time; adds the new reaction to the `reactions` set of `post`; returns the new `reaction`.

**Request Body:**
```json
{
  "sessionId": "string",
  "post": "string",
  "type": "string" // "LIKE" | "LOVE" | "CELEBRATE"
}
```

**Success Response Body (Action):**
```json
{
  "reaction": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Reaction/changeReactionType

**Description:** Changes the type of an existing reaction on a post.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- A `Reaction` exists for the user associated with `sessionId` and the specified post.

**Effects:**
- Updates the reaction's `type` to `newType`.

**Request Body:**
```json
{
  "sessionId": "string",
  "post": "string",
  "newType": "string" // "LIKE" | "LOVE" | "CELEBRATE"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Reaction/removeReactionFromPost

**Description:** Removes a user's reaction from a post.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- A `Reaction` exists associated with the user associated with `sessionId` and the specified `post`.

**Effects:**
- Removes the matching `Reaction` from the state and from the `reactions` set of `post`.

**Request Body:**
```json
{
  "sessionId": "string",
  "post": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Reaction/removeAllReactionsFromPost

**Description:** Removes all reactions from a post. This is typically used for cascade deletion when a post is deleted.

**Authentication:** This endpoint is typically called internally by synchronizations and may not require user authentication. However, if exposed directly, it should require appropriate authorization (e.g., post author or administrator).

**Requirements:**
- The `post` exists.

**Effects:**
- Removes all `Reaction`s associated with the specified `post` from the state and from the `reactions` set of `post`.

**Request Body:**
```json
{
  "post": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Reaction/removeAllReactionsForUser

**Description:** Removes all reactions created by a specific user. This is typically used for cascade deletion when a user account is deleted.

**Authentication:** This endpoint is typically called internally by synchronizations and may not require user authentication. However, if exposed directly, it should require appropriate authorization (e.g., the user themselves or an administrator).

**Requirements:**
- The `user` exists.

**Effects:**
- Removes all `Reaction`s created by the specified `user` from the state; returns `success: true`.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": true
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Reaction/_getReactionsForPostId
**Description:** Retrieves a summary of reaction counts, grouped by type, for a specific post. Requires authentication so only the post author or their accepted friends can view aggregate reactions.

**Authentication:** Requires a valid `sessionId` that belongs to the post author or an accepted friend of the author.

**Requirements:**
- The `post` exists.

**Effects:**
- Returns an array of objects, each containing a reaction `type` and its total `count` for the given `post` (including types with a count of 0), wrapped in the `{ "results": [...], "error": string | null }` envelope.

**Request Body:**
```json
{
  "sessionId": "string",
  "post": "string"
}
```

**Success Response Body (Query):**
```json
{
  "results": [
    {
      "type": "LIKE",
      "count": 5
    },
    {
      "type": "LOVE",
      "count": 2
    },
    {
      "type": "CELEBRATE",
      "count": 0
    }
  ],
  "error": null
}
```

**Error Response Body:**
```json
{
  "results": [],
  "error": "string"
}
```

---

### POST /api/Reaction/_getReactionOnPostFromUser
**Description:** Retrieves the reaction of a specific user on a specific post.

**Requirements:**
- The `user` and `post` exist.

**Effects:**
- Returns an array of objects, each containing a reaction `type` and its `count` (0 or 1) for the given `user` and `post`.

**Request Body:**
```json
{
  "user": "string",
  "post": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "type": "LIKE",
    "count": 1
  },
  {
    "type": "LOVE",
    "count": 0
  },
  {
    "type": "CELEBRATE",
    "count": 0
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: Friendship Concept

**Purpose:** To allow users to establish and manage mutual connections.

---

## API Endpoints

### POST /api/Friendship/sendFriendRequest

**Description:** Sends a friend request from one user to another.

**Authentication:** Requires a valid `sessionId`. The requester is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` and `recipient` are distinct Users. No `Friendship` exists between these two users (regardless of who is requester or recipient).

**Effects:**
- Creates a new `Friendship`; sets `requester` to the authenticated user and `recipient`; sets `status` to `PENDING`; sets `initiatedAt` to the current time; returns the new `friendship`.

**Request Body:**
```json
{
  "sessionId": "string",
  "recipient": "string"
}
```

**Success Response Body (Action):**
```json
{
  "friendship": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Friendship/acceptFriendRequest

**Description:** Accepts a pending friend request.

**Authentication:** Requires a valid `sessionId`. The recipient is automatically extracted from the session.

**Requirements:**
- A `Friendship` exists where the `requester` is specified and the user associated with `sessionId` is the recipient, and the `status` is `PENDING`.

**Effects:**
- Updates the `status` of the existing `Friendship` to `ACCEPTED`; returns `success: true` on completion.

**Request Body:**
```json
{
  "sessionId": "string",
  "requester": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Friendship/declineFriendRequest

**Description:** Declines a pending friend request.

**Authentication:** Requires a valid `sessionId`. The recipient is automatically extracted from the session.

**Requirements:**
- A `Friendship` exists where the `requester` is specified and the user associated with `sessionId` is the recipient, and the `status` is `PENDING`.

**Effects:**
- Updates the `status` of the existing `Friendship` to `DECLINED`; returns `success: true` on completion.

**Request Body:**
```json
{
  "sessionId": "string",
  "requester": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Friendship/removeFriend

**Description:** Removes an existing friendship between two users.

**Authentication:** Requires a valid `sessionId`. The authenticated user is automatically extracted from the session.

**Requirements:**
- A `Friendship` exists between the user associated with `sessionId` and `otherUser` (where one is the requester and the other is the recipient).

**Effects:**
- Removes the `Friendship` object associated with these two users from the state; returns `success: true` on completion.

**Request Body:**
```json
{
  "sessionId": "string",
  "otherUser": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Friendship/areFriends

**Description:** Checks if two users have an accepted friendship.

**Authentication:** Requires a valid `sessionId`. One of the users is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` and `otherUser` exist.

**Effects:**
- Returns `true` if there exists a `Friendship` `f` such that `f.status` is `ACCEPTED` and the pair (`f.requester`, `f.recipient`) matches (authenticated user, `otherUser`) in either order. Otherwise returns `false`.

**Request Body:**
```json
{
  "sessionId": "string",
  "otherUser": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "isFriend": "boolean"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Friendship/_getFriends

**Description:** Retrieves a list of all users who are friends with the specified user.

**Authentication:** Requires a valid `sessionId`. The session user must match the requested `user`.

**Requirements:**
- The user `user` exists and matches the authenticated session.

**Effects:**
- Returns a set of all users `f` for whom a `Friendship` exists with `status` `ACCEPTED` between `user` and `f`, wrapped in the `{ "results": [...], "error": string | null }` response envelope used by authenticated queries.

**Request Body:**
```json
{
  "sessionId": "string",
  "user": "string"
}
```

**Success Response Body (Query):**
```json
{
  "results": [
    {
      "friend": "string"
    }
  ],
  "error": null
}
```

**Error Response Body:**
```json
{
  "results": [],
  "error": "string"
}
```

---
---
### POST /api/Friendship/_getPendingFriendships

**Description:** Retrieves a list of all incoming friend requests that are pending for a specific user.

**Authentication:** Requires a valid `sessionId`. The session user must match the requested `user`.

**Requirements:**
- The user `user` exists and matches the authenticated session.

**Effects:**
- Returns a one-element array (inside the `{ "results": [...], "error": string | null }` envelope) whose object has a single key `pendingFriendships` with all pending requests where the specified `user` is the `recipient`. Each entry in the set contains the `requester`.

**Request Body:**
```json
{
  "sessionId": "string",
  "user": "string"
}
```

**Success Response Body (Query):**
```json
{
  "results": [
    {
      "pendingFriendships": [
        {
          "requester": "string"
        }
      ]
    }
  ],
  "error": null
}
```

**Error Response Body:**
```json
{
  "results": [],
  "error": "string"
}
```
---

# API Specification: JamGroup Concept

**Purpose:** To allow users to create and manage private groups for collaborative jamming.

---

## API Endpoints

### POST /api/JamGroup/createJamGroup

**Description:** Creates a new jam group with the user as its creator.

**Authentication:** Requires a valid `sessionId`. The creator is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists.

**Effects:**
- Creates a new `JamGroup` with a unique `groupId`; sets `name`, `description`, and `creator` to the authenticated user; adds the creator to the `members` set; sets `createdAt` to the current time; returns the new `group`.

**Request Body:**
```json
{
  "sessionId": "string",
  "name": "string",
  "description": "string"
}
```

**Success Response Body (Action):**
```json
{
  "group": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/JamGroup/addMember

**Description:** Adds a new member to an existing jam group.

**Authentication:** Requires a valid `sessionId`. The requester is automatically extracted from the session.

**Requirements:**
- The `group` exists, and `newMember` exists. The `newMember` is not already in the `members` set and is a friend of the requester. The `newMember` must not be a kid account or private account.

**Effects:**
- Adds `newMember` to the `members` set of the `group`.

**Request Body:**
```json
{
  "sessionId": "string",
  "group": "string",
  "newMember": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": true
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/JamGroup/removeUserFromJamGroup

**Description:** Removes a specified user from a jam group.

**Authentication:** Requires a valid `sessionId`. The requester is automatically extracted from the session.

**Requirements:**
- The `group` exists and the specified `user` is currently in the `members` set.

**Effects:**
- Removes the specified `user` from the `members` set of the `group`.

**Request Body:**
```json
{
  "sessionId": "string",
  "group": "string",
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": true
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/JamGroup/disbandJamGroup

**Description:** Deletes a jam group, only available to the group's creator.

**Authentication:** Requires a valid `sessionId`. The requester is automatically extracted from the session.

**Requirements:**
- The `group` exists. The user associated with `sessionId` is the `creator` of the `group`.

**Effects:**
- Removes the `group` and all its associated data from the state.

**Request Body:**
```json
{
  "sessionId": "string",
  "group": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": true
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/JamGroup/_getJamGroupsForUser

**Description:** Retrieves all jam groups where the authenticated user is a member.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists.

**Effects:**
- Returns all jam groups where the user is a member, ordered by creation date (newest first).

**Request Body:**
```json
{
  "sessionId": "string"
}
```

**Success Response Body (Query):**
```json
{
  "results": [
    {
      "group": {
        "_id": "string",
        "name": "string",
        "description": "string",
        "creator": "string",
        "members": ["string"],
        "createdAt": "string"
      }
    }
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/JamGroup/_getJamGroupById

**Description:** Retrieves details for a specific jam group.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists.

**Effects:**
- Returns the jam group with the given id, or an empty array if not found.

**Request Body:**
```json
{
  "sessionId": "string",
  "group": "string"
}
```

**Success Response Body (Query):**
```json
{
  "results": [
    {
      "groupData": {
        "_id": "string",
        "name": "string",
        "description": "string",
        "creator": "string",
        "members": ["string"],
        "createdAt": "string"
      }
    }
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/JamGroup/_getCommonChordsForGroup

**Description:** Retrieves the intersection of all members' known chords for a jam group. This is critical for determining what songs the group can play together.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The `group` exists and the user associated with `sessionId` is authenticated.

**Effects:**
- Queries each member's known chords from ChordLibrary and computes the intersection. Returns the set of chords that ALL members know.

**Request Body:**
```json
{
  "sessionId": "string",
  "group": "string"
}
```

**Success Response Body:**
```json
{
  "commonChords": ["string"]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/JamGroup/_getPlayableSongsForGroup

**Description:** Retrieves songs that can be played by the jam group based on their common chords. This is critical for song recommendations during jam sessions.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The `group` exists and the user associated with `sessionId` is authenticated.

**Effects:**
- Computes the group's common chords and queries SongLibrary for songs that can be played with those chords. Returns playable songs for the group.

**Request Body:**
```json
{
  "sessionId": "string",
  "group": "string"
}
```

**Success Response Body (Query):**
```json
{
  "results": [
    {
      "song": {
        "_id": "string",
        "title": "string",
        "artist": "string",
        "chords": ["string"],
        "genre": "string"
      }
    }
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
# API Specification: JamSession Concept

**Purpose:** To facilitate real-time or asynchronous collaborative music sessions within a JamGroup.

---

## API Endpoints

### POST /api/JamSession/scheduleJamSession

**Description:** Schedules a jam session for a group at a future time.

**Authentication:** Requires a valid `sessionId`. The scheduler is automatically extracted from the session.

**Requirements:**
- The `group` exists and the user associated with `sessionId` is a member. The `startTime` is in the future.

**Effects:**
- Creates a new `JamSession` with a unique `sessionId`; sets `jamGroup`, `startTime`, and `status` to `SCHEDULED`; initializes empty sets for `participants` and `sharedSongs`; returns the new `session`.

**Request Body:**
```json
{
  "sessionId": "string",
  "group": "string",
  "startTime": "string"
}
```

**Success Response Body (Action):**
```json
{
  "session": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/JamSession/startJamSession

**Description:** Starts an immediate jam session for a group.

**Authentication:** Requires a valid `sessionId`. The creator is automatically extracted from the session.

**Requirements:**
- The `group` exists and the user associated with `sessionId` is a member of the group.

**Effects:**
- Creates a new `JamSession` with a unique `sessionId`; sets `jamGroup`, `status` to `ACTIVE`, and `startTime` to the current time; adds the authenticated user to `participants`; returns the new `session`.

**Request Body:**
```json
{
  "sessionId": "string",
  "group": "string"
}
```

**Success Response Body (Action):**
```json
{
  "session": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/JamSession/joinSession

**Description:** Allows a user to join an active jam session.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The `session` exists and is `ACTIVE`. The user associated with `sessionId` is a member of the associated `JamGroup` and is not already in `participants`.

**Effects:**
- Adds the authenticated user to the `participants` set of the `session`.

**Request Body:**
```json
{
  "sessionId": "string",
  "session": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": true
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/JamSession/shareSongInSession

**Description:** Allows a participant to share a song they are practicing in the session.

**Authentication:** Requires a valid `sessionId`. The participant is automatically extracted from the session.

**Requirements:**
- The `session` exists and is `ACTIVE`. The user associated with `sessionId` is in the `participants` set. The `song` is not already shared by this participant in this `session`.

**Effects:**
- Creates a new `SharedSong` with `song`, authenticated user as `participant`, and `currentStatus` and adds it to the `sharedSongs` set of the `session`.

**Request Body:**
```json
{
  "sessionId": "string",
  "session": "string",
  "song": "string",
  "currentStatus": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": true
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/JamSession/updateSharedSongStatus

**Description:** Updates the status of a song a participant is sharing in the session.

**Authentication:** Requires a valid `sessionId`. The participant is automatically extracted from the session.

**Requirements:**
- The `session` exists and is `ACTIVE`. A `SharedSong` exists in the `session` for the user associated with `sessionId` and the specified `song`.

**Effects:**
- Updates the `currentStatus` of the matching `SharedSong` to `newStatus`.

**Request Body:**
```json
{
  "sessionId": "string",
  "session": "string",
  "song": "string",
  "newStatus": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": true
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/JamSession/endJamSession

**Description:** Ends an active jam session.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The `session` exists and is `ACTIVE`.

**Effects:**
- Updates the `status` to `COMPLETED` and sets `endTime` to the current time.

**Request Body:**
```json
{
  "sessionId": "string",
  "session": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": true
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/JamSession/_getJamSessionsForGroup

**Description:** Retrieves all jam sessions for a specific jam group.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The `group` exists and the user associated with `sessionId` is authenticated.

**Effects:**
- Returns all jam sessions for the given group, ordered by start time (newest first).

**Request Body:**
```json
{
  "sessionId": "string",
  "group": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "jamGroup": "string",
    "startTime": "string",
    "endTime": "string",
    "participants": ["string"],
    "sharedSongs": [
      {
        "song": "string",
        "participant": "string",
        "currentStatus": "string"
      }
    ],
    "status": "ACTIVE | COMPLETED | SCHEDULED"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/JamSession/_getJamSessionById

**Description:** Retrieves details for a specific jam session.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` is authenticated.

**Effects:**
- Returns the jam session with the given id, or an empty array if not found.

**Request Body:**
```json
{
  "sessionId": "string",
  "session": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "jamGroup": "string",
    "startTime": "string",
    "endTime": "string",
    "participants": ["string"],
    "sharedSongs": [
      {
        "song": "string",
        "participant": "string",
        "currentStatus": "string"
      }
    ],
    "status": "ACTIVE | COMPLETED | SCHEDULED"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/JamSession/_getActiveSessionForGroup

**Description:** Retrieves the currently active jam session for a group, if any exists.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The `group` exists and the user associated with `sessionId` is authenticated.

**Effects:**
- Returns the active jam session for the given group, or an empty array if no session is currently active.

**Request Body:**
```json
{
  "sessionId": "string",
  "group": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "jamGroup": "string",
    "startTime": "string",
    "participants": ["string"],
    "sharedSongs": [
      {
        "song": "string",
        "participant": "string",
        "currentStatus": "string"
      }
    ],
    "status": "ACTIVE"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

# API Specification: SongLibrary Concept

**Purpose:** Manage a user's personal progress in learning songs.

---

## API Endpoints

### POST /api/SongLibrary/addUser

**Description:** Initializes a user's song tracking journal.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The user associated with `sessionId` does not already exist in the SongLibrary.

**Effects:**

*   Adds the authenticated user to the SongLibrary with an empty progress list.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/SongLibrary/removeUser

**Description:** Removes a user's song tracking journal.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The user associated with `sessionId` exists in the SongLibrary.

**Effects:**

*   Removes the user and all their associated `SongProgress` entries from the state.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---
### POST /api/SongLibrary/addSong

**Description:** Adds a new song to the global song library.

**Authentication:** Requires a valid `sessionId`. Typically restricted to administrators.

**Requirements:**
- No Song with the given `name` already exists.
- Requests must always include `genre`; supply the literal string `"UNDEFINED"` when the song should have no genre.

**Effects:**
- Creates a new Song; sets the `title`, `artist`, `chords`, and stores `genre` unless it is `"UNDEFINED"`; returns the new song.

**Request Body:**
```json
{
  "sessionId": "string",
  "title": "string",
  "artist": "string",
  "chords": "string[]",
  "genre": "string" // always include; send "UNDEFINED" to leave genre unspecified
}
```

**Success Response Body (Action):**
```json
{
  "song": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/SongLibrary/removeSong

**Description:** Removes a song from the global song library.

**Authentication:** Requires a valid `sessionId`. Typically restricted to administrators.

**Requirements:**
- The Song `song` exists.

**Effects:**
- Removes the `song` from the set of Songs. Also removes all `SongProgress` entries across all users that reference this `song`.

**Request Body:**
```json
{
  "sessionId": "string",
  "song": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---


### POST /api/SongLibrary/startLearningSong

**Description:** Adds a song to a user's learning journal.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The `song` exists. The user associated with `sessionId` exists and is not already tracking this `song`.

**Effects:**

*   Creates a new `SongProgress` entry for the authenticated user, associating them with the specified `song` and `mastery` level.

**Request Body:**

```json
{
  "sessionId": "string",
  "song": "string",
  "mastery": "string" // "in-progress" | "mastered" | "na"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/SongLibrary/updateSongMastery

**Description:** Updates the mastery level of a song in a user's journal.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The user associated with `sessionId` is already tracking the specified `song`.

**Effects:**

*   Updates the `mastery` level for the specific song entry.

**Request Body:**

```json
{
  "sessionId": "string",
  "song": "string",
  "newMastery": "string" // "in-progress" | "mastered" | "na"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/SongLibrary/stopLearningSong

**Description:** Removes a song from a user's learning journal.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The user associated with `sessionId` is currently tracking the specified `song`.

**Effects:**

*   Deletes the `SongProgress` entry for the authenticated user and `song`.

**Request Body:**

```json
{
  "sessionId": "string",
  "song": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/SongLibrary/_getSongsInProgress

**Description:** Retrieves all songs a user is currently learning with their mastery levels.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The user associated with `sessionId` exists.

**Effects:**

*   Returns an array of objects containing the full song details and the user's current mastery level.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "song": {
      "_id": "string",
      "title": "string",
      "artist": "string",
      "chords": ["string"]
    },
    "mastery": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---
---
### POST /api/SongLibrary/_getPlayableSongs

**Description:** Gets all songs that a user can play with their current chord knowledge.

**Authentication:** Requires a valid `sessionId`. The user's known chords are automatically retrieved from the session.

**Requirements:**
- The user associated with `sessionId` exists.

**Effects:**
- Returns the set of all `Songs` whose `chords` are a subset of the user's `knownChords`. If `genres` are provided, the result is further filtered to only include songs whose genre is in the `genres` set.

**Request Body:**
```json
{
  "sessionId": "string",
  "genres": "string[]" // optional
}
```

**Success Response Body (Query):**
```json
[
  {
    "songs": "string[]"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/SongLibrary/_getSongsInProgress

**Description:** Gets all songs a user is currently learning with their mastery levels.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists.

**Effects:**
- Returns the set of all `SongProgress` entries for the authenticated user, each containing a song and its mastery level.

**Request Body:**
```json
{
  "sessionId": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "song": "string",
    "mastery": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/SongLibrary/_filterSongsByGenre

**Description:** Gets all songs in a specific genre.

**Requirements:**
- No authentication required for this public query.

**Effects:**
- Returns the set of all `Songs` that are associated with the specified `genre`.

**Request Body:**
```json
{
  "genre": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "songs": "string[]"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---


# API Specification: ChordLibrary Concept

**Purpose:** Maintain an inventory of chords known by each user and their proficiency.

---

## API Endpoints

### POST /api/ChordLibrary/addUser

**Description:** Adds a user to the chord library system.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The user associated with `sessionId` does not already exist in the ChordLibrary.

**Effects:**

*   Adds the authenticated user to the concept, creating an empty inventory.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/ChordLibrary/addChordToInventory

**Description:** Adds a chord to a user's inventory with a mastery level.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The user associated with `sessionId` exists. The chord symbol is valid. The user does not already have this chord in their inventory.

**Effects:**

*   Normalizes the chord symbol and creates a new `KnownChord` entry. Additionally, through the `/chords/add` sync, returns updated inventory, playable songs, and a next chord recommendation with diagram.

**Request Body:**

```json
{
  "sessionId": "string",
  "chord": "string",
  "mastery": "string" // "not started" | "in progress" | "proficient" | "mastered"
}
```

**Success Response Body (Action):**

```json
{
  "success": true,
  "normalizedChord": "string",
  "inventory": ["string"],
  "playableSongs": [
    {
      "id": "string",
      "title": "string",
      "artist": "string",
      "source": "string",
      "difficulty": "number"
    }
  ],
  "recommendation": {
    "recommendedChord": "string | null",
    "recommendedChordDiagram": [
      {
        "frets": ["number"],
        "fingers": ["number"],
        "baseFret": "number",
        "barres": ["number"],
        "name": "string"
      }
    ],
    "unlockedSongIds": ["string"]
  }
}
```

**Note:** When adding a chord via the `/chords/add` sync (handled internally), the response is enriched with:
- Updated `inventory`: All known chords after adding the new chord
- `playableSongs`: Songs that can now be played with the updated chord inventory
- `recommendation`: Next chord to learn, including its diagram and which songs it would unlock

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/ChordLibrary/updateChordMastery

**Description:** Updates the mastery level of a known chord.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The user associated with `sessionId` has the specified `chord` in their inventory.

**Effects:**

*   Updates the `mastery` of the existing entry to `newMastery`.

**Request Body:**

```json
{
  "sessionId": "string",
  "chord": "string",
  "newMastery": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/ChordLibrary/removeChordFromInventory

**Description:** Removes a chord from a user's inventory.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The user associated with `sessionId` has the specified `chord` in their inventory.

**Effects:**

*   Deletes the `KnownChord` entry.

**Request Body:**

```json
{
  "sessionId": "string",
  "chord": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/ChordLibrary/removeUser

**Description:** Removes a user from the chord library system.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The user associated with `sessionId` exists.

**Effects:**

*   Removes the user and all their known chords from the state.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/ChordLibrary/_getKnownChords

**Description:** Retrieves all known chords for a user.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The user associated with `sessionId` exists.

**Effects:**

*   Returns the set of all chords known by the user and their mastery levels.

**Request Body:**

```json
{
  "sessionId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "chord": "string",
    "mastery": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/ChordLibrary/_getChordMastery

**Description:** Retrieves the mastery level for a specific chord for a user.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   The user associated with `sessionId` exists and knows the chord.

**Effects:**

*   Returns the mastery level for the requested chord.

**Request Body:**

```json
{
  "sessionId": "string",
  "chord": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "mastery": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---
---
### POST /api/ChordLibrary/_getKnownChords

**Description:** Retrieves all known chords for a user with their mastery levels.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**
- The user associated with `sessionId` exists.

**Effects:**
- Returns the set of all `KnownChord` entries for the authenticated user, each containing a chord and its mastery level.

**Request Body:**
```json
{
  "sessionId": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "chord": "string",
    "mastery": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/ChordLibrary/_getOverlappingChords

**Description:** Finds chords that all specified users have in common. Designed for jam groups to identify shared musical vocabulary.

**Authentication:** Requires a valid `sessionId`.

**Requirements:**

*   At least two user IDs are provided.
*   All specified users exist in ChordLibrary.

**Effects:**

*   Returns the set of chords that ALL specified users have in common, sorted by minimum mastery level (highest first).
*   For each overlapping chord, includes the minimum mastery level across users (the "weakest link" for group playing).
*   Also returns the total chord count for each user.

**Request Body:**

```json
{
  "sessionId": "string",
  "userIds": ["string", "string"]
}
```

**Success Response Body (Query):**

```json
{
  "overlappingChords": [
    {
      "chord": "string",
      "minMastery": "not started" | "in progress" | "proficient" | "mastered",
      "userMasteries": [
        {
          "userId": "string",
          "mastery": "not started" | "in progress" | "proficient" | "mastered"
        }
      ]
    }
  ],
  "userChordCounts": [
    {
      "userId": "string",
      "chordCount": 4
    }
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---


# API Specification: Chord Concept

**Purpose:** Define fundamental musical chords (Admin management).

---

## API Endpoints

### POST /api/Chord/createChord

**Description:** Creates a new chord definition in the system.

**Authentication:** Requires a valid `sessionId` (typically Admin).

**Requirements:**

*   No Chord with the given `name` already exists.

**Effects:**

*   Creates a new Chord entity with the specified notes.

**Request Body:**

```json
{
  "sessionId": "string",
  "name": "string",
  "notes": ["string"]
}
```

**Success Response Body (Action):**

```json
{
  "chord": {
    "_id": "string",
    "name": "string",
    "notes": ["string"]
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Chord/deleteChord

**Description:** Deletes a chord definition.

**Authentication:** Requires a valid `sessionId` (typically Admin).

**Requirements:**

*   The Chord `chord` exists.

**Effects:**

*   Removes the Chord from the state.

**Request Body:**

```json
{
  "sessionId": "string",
  "chord": "string" // ID
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Chord/_getChordByName

**Description:** Look up a chord by its name (e.g., "C", "Am7").

**Requirements:**

*   None.

**Effects:**

*   Returns the chord object if found.

**Request Body:**

```json
{
  "name": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "chord": {
      "_id": "string",
      "name": "string",
      "notes": ["string"]
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Chord/_getAllChords

**Description:** Retrieves all defined chords.

**Requirements:**

*   None.

**Effects:**

*   Returns a list of all chords sorted by name.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "chords": [
      {
        "_id": "string",
        "name": "string",
        "notes": ["string"]
      }
    ]
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Chord/_getChordDiagram

**Description:** Get guitar fingering diagram(s) for a specific chord name. Returns multiple voicings if available, or null if no diagram exists for this chord.

**Requirements:**

*   None.

**Effects:**

*   Returns an array of chord diagrams (different voicings) for the requested chord, or null if not found.

**Request Body:**

```json
{
  "name": "string" // e.g., "C", "Am", "Gmaj7"
}
```

**Success Response Body (Query):**

```json
{
  "diagrams": [
    {
      "frets": [0, 3, 2, 0, 1, 0],
      "fingers": [0, 3, 2, 0, 1, 0],
      "baseFret": 1,
      "barres": []
    }
  ]
}
```

**Note:** `diagrams` will be `null` if no diagram exists for the chord.

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Chord/_getChordDiagrams

**Description:** Get guitar fingering diagrams for multiple chords at once. Efficient for fetching diagrams for an entire song's chord progression.

**Requirements:**

*   None.

**Effects:**

*   Returns a map object where keys are chord names and values are arrays of diagrams. If a chord has no diagram, its value will be an empty array.

**Request Body:**

```json
{
  "names": ["string"] // e.g., ["C", "Am", "F", "G"]
}
```

**Success Response Body (Query):**

```json
{
  "diagrams": {
    "C": [
      {
        "frets": [0, 3, 2, 0, 1, 0],
        "fingers": [0, 3, 2, 0, 1, 0],
        "baseFret": 1,
        "barres": []
      }
    ],
    "Am": [
      {
        "frets": [0, 0, 2, 2, 1, 0],
        "fingers": [0, 0, 2, 3, 1, 0],
        "baseFret": 1,
        "barres": []
      }
    ],
    "F": [],
    "G": [
      {
        "frets": [3, 2, 0, 0, 0, 3],
        "fingers": [2, 1, 0, 0, 0, 3],
        "baseFret": 1,
        "barres": []
      }
    ]
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Chord/_getAvailableChordDiagrams

**Description:** Get a list of all chord names that have guitar diagrams available in the system. Useful for checking which chords can be visualized.

**Requirements:**

*   None.

**Effects:**

*   Returns an array of chord name strings.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
{
  "chords": ["C", "Cm", "C7", "Cmaj7", "D", "Dm", "D7", "Dmaj7", "E", "Em", "E7", "F", "Fm", "G", "Gm", "G7", "A", "Am", "A7", "B", "Bm", "B7"]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Chord/_hasChordDiagram

**Description:** Check if a diagram exists for a given chord name without fetching the full diagram data.

**Requirements:**

*   None.

**Effects:**

*   Returns a boolean indicating whether a diagram is available.

**Request Body:**

```json
{
  "name": "string" // e.g., "C"
}
```

**Success Response Body (Query):**

```json
{
  "exists": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Chord/_getChordVocabulary

**Description:** Returns all possible chord symbols that the system recognizes. Generated from the theory module (12 roots × 53 suffixes). Use this to build a chord dictionary or reference page.

**Authentication:** None required (public query).

**Requirements:**

*   None.

**Effects:**

*   Returns the complete chord vocabulary with metadata about roots, suffixes, and which chords have diagrams available.

**Request Body:**

```json
{
  "includeSlashChords": false  // optional, default false. If true, includes slash chords like "C/E", "Am/G"
}
```

**Success Response Body (Query):**

```json
{
  "chords": ["A", "A#", "A#11", "A#13", "A#13sus4", "...", "Gsus4"],
  "roots": ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"],
  "suffixes": ["", "m", "sus2", "sus4", "add2", "add9", "add4", "..."],
  "totalCount": 636,
  "chordsWithDiagrams": ["A", "A#", "A#m", "A5", "A7", "Ab", "..."]
}
```

**Notes:**

- `includeSlashChords: false` returns 636 basic chords
- `includeSlashChords: true` returns 900 chords (includes inversions)
- `chordsWithDiagrams` lists chords that have guitar fingering diagrams available
- Use `roots` and `suffixes` to build filtering/grouping UI

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

# API Specification: Song Concept

**Purpose:** Manage the global catalog of songs.

---

## API Endpoints

### POST /api/Song/createSong

**Description:** Creates a new song in the catalog.

**Authentication:** Requires a valid `sessionId` (typically Admin).

**Requirements:**

*   No Song with the exact same `title` and `artist` exists.

**Effects:**

*   Creates a new Song with the provided metadata.

**Request Body:**

```json
{
  "sessionId": "string",
  "title": "string",
  "artist": "string",
  "chords": ["string"],
  "genre": "string", // optional
  "key": "string", // optional
  "tempo": "number", // optional
  "difficulty": "number", // optional
  "tags": ["string"], // optional
  "source": "string" // optional
}
```

**Success Response Body (Action):**

```json
{
  "song": {
    "_id": "string",
    "title": "string",
    "artist": "string"
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Song/deleteSong

**Description:** Deletes a song from the catalog.

**Authentication:** Requires a valid `sessionId` (typically Admin).

**Requirements:**

*   The Song `song` exists.

**Effects:**

*   Removes the song from the state.

**Request Body:**

```json
{
  "sessionId": "string",
  "song": "string" // ID
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Song/_getPlayableSongs

**Description:** Finds songs that can be played given a specific set of known chords.

**Requirements:**

*   None.

**Effects:**

*   Returns songs where every chord in the song is present in the `knownChords` list. Optionally filters by genre.

**Request Body:**

```json
{
  "knownChords": ["string"],
  "genres": ["string"] // optional
}
```

**Success Response Body (Query):**

```json
[
  {
    "song": {
      "_id": "string",
      "title": "string",
      "artist": "string",
      "chords": ["string"]
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Song/_filterSongsByGenre

**Description:** Retrieves all songs matching a specific genre.

**Requirements:**

*   None.

**Effects:**

*   Returns songs where the `genre` field or `tags` array contains the specified string.

**Request Body:**

```json
{
  "genre": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "song": "Object"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Song/_searchByTitleOrArtist

**Description:** Searches for songs by title or artist name (partial match).

**Requirements:**

*   None.

**Effects:**

*   Returns up to 20 songs matching the query string.

**Request Body:**

```json
{
  "query": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "song": "Object"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

# API Specification: RecommendationEngine Concept

**Purpose:** Calculate optimal learning paths and chord suggestions.

---

## API Endpoints

### POST /api/RecommendationEngine/calculateRecommendation

**Description:** Performs a heavy calculation to determine the best next chord to learn and saves the result as a `Recommendation` record.

**Authentication:** Requires a valid `sessionId`. The user is automatically extracted from the session.

**Requirements:**

*   User must exist. `knownChords` and `allSongs` must be provided.

**Effects:**

*   Analyzes the provided song list against known chords. Creates a persisted `Recommendation` containing the best chord and the list of songs it unlocks.

**Request Body:**

```json
{
  "sessionId": "string",
  "knownChords": ["string"],
  "allSongs": [
    {
      "_id": "string",
      "chords": ["string"],
      "difficulty": "number"
    }
  ]
}
```

**Success Response Body (Action):**

```json
{
  "recommendationId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/RecommendationEngine/requestChordRecommendation

**Description:** A stateless version of the recommendation logic. Suggests the next chord to learn.

**Requirements:**

*   `knownChords` is a proper subset of chords in `allSongs`.

**Effects:**

*   Returns a single chord string that maximizes song unlock potential.

**Request Body:**

```json
{
  "knownChords": ["string"],
  "allSongs": [
    {
      "_id": "string",
      "chords": ["string"]
    }
  ]
}
```

**Success Response Body (Action):**

```json
{
  "recommendedChord": "string",
  "diagram": [
    {
      "frets": ["number", "number", "number", "number", "number", "number"],
      "fingers": ["number", "number", "number", "number", "number", "number"],
      "baseFret": "number",
      "barres": ["number"],
      "capo": "boolean",
      "name": "string"
    }
  ]
}
```

**Note:** The `diagram` field contains an array of chord diagram voicings for the recommended chord. Each diagram includes:
- `frets`: Array of 6 numbers (one per string, -1 means not played, 0 means open)
- `fingers`: Array of 6 numbers (finger positions, 0 means open/not played)
- `baseFret`: Starting fret position (1 for open position)
- `barres`: Optional array of fret numbers where barres occur
- `capo`: Optional boolean indicating if this is a capo position
- `name`: Display name for this voicing

**Error Response Body:**

```json
{
  "error": "string"
}
```

---
---
### POST /api/RecommendationEngine/requestPersonalizedSongRecommendation

**Description:** Gets personalized song recommendations based on the user's known chords and genre preferences.

**Authentication:** Requires a valid `sessionId`. The user's known chords and genre preferences are automatically retrieved from the session.

**Requirements:**
- The set of `knownChords` for the user associated with `sessionId` is not empty.

**Effects:**
- Filters the set of `allSongs` to find all songs that are playable with the user's current `knownChords`. Further filters and ranks this result based on the user's `genrePreferences`. Returns a ranked list of playable songs tailored to the user's tastes as `recommendedSongs`.

**Request Body:**
```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "recommendedSongs": "string[]"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

---
### POST /api/RecommendationEngine/recommendNextChordsForTargetSong

**Description:** Provides a learning path of chords to learn in order to play a target song.

**Authentication:** Requires a valid `sessionId`. The user's known chords are automatically retrieved from the session.

**Requirements:**
- The `targetSong` exists. The set of chords required by `targetSong` is not a subset of the user's `knownChords`.

**Effects:**
- Identifies the set of `missingChords` required to play the `targetSong` that are not present in the user's `knownChords` set. It then orders these `missingChords` into a sequence based on pedagogical principles (e.g., prioritizing foundational chords, chords with simpler fingerings, or chords that unlock the most other songs). Returns this ordered learning path as `recommendedPath`.

**Request Body:**
```json
{
  "sessionId": "string",
  "targetSong": "string"
}
```

**Success Response Body (Action):**
```json
{
  "recommendedPath": "string[]",
  "pathDiagrams": {
    "chordName": [
      {
        "frets": ["number", "number", "number", "number", "number", "number"],
        "fingers": ["number", "number", "number", "number", "number", "number"],
        "baseFret": "number",
        "barres": ["number"],
        "capo": "boolean",
        "name": "string"
      }
    ]
  }
}
```

**Note:** The `pathDiagrams` field is a map from chord name to an array of diagram voicings. Each chord in `recommendedPath` will have a corresponding entry in `pathDiagrams` with fingering diagrams to help users learn the chord.

**Error Response Body:**
```json
{
  "error": "string"
}
```
---


### POST /api/RecommendationEngine/requestSongUnlockRecommendation

**Description:** Identifies specifically which songs would become playable if a specific chord were learned.

**Requirements:**

*   `potentialChord` is not in `knownChords`.

**Effects:**

*   Returns a list of song IDs that require `potentialChord` (plus any subset of `knownChords`) but were not previously playable.

**Request Body:**

```json
{
  "knownChords": ["string"],
  "potentialChord": "string",
  "allSongs": [
    {
      "_id": "string",
      "chords": ["string"]
    }
  ]
}
```

**Success Response Body (Action):**

```json
{
  "unlockedSongs": ["string"] // List of Song IDs
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/RecommendationEngine/_getRecommendation

**Description:** Retrieves a previously calculated recommendation by ID.

**Requirements:**

*   The `recommendationId` exists.

**Effects:**

*   Returns the full recommendation object including score, timestamp, and unlocked songs list.

**Request Body:**

```json
{
  "recommendationId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "user": "string",
    "recommendedChord": "string",
    "unlockedSongs": ["string"],
    "score": "number",
    "generatedAt": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

# API Specification: Requesting Concept

**Purpose:** To encapsulate an API server, modeling incoming requests and outgoing responses as concept actions.

**Important Note:** The Requesting concept is an **internal system concept**. Frontend applications should **not** directly call `Requesting.request` or `Requesting.respond`. Instead, all requests should be made to `/api/*` endpoints, which automatically flow through the Requesting concept via synchronizations. These endpoints are documented here for completeness and understanding the architecture, but are typically only used internally by the system.

---

## Internal Endpoints (Not typically called by frontend)

### POST /api/Requesting/request

**Description:** Internal system action that captures incoming HTTP requests.

**Note:** This is automatically triggered by the Requesting server when a request is made to any `/api/*` endpoint. Frontend should not call this directly.

**Request Body:**
```json
{
  "path": "string",
  "...": "any other request parameters"
}
```

**Success Response Body (Action):**
```json
{
  "request": "string"
}
```
---
### POST /api/Requesting/respond

**Description:** Internal system action that sends a response to a pending request.

**Note:** This is typically called by synchronizations after processing a request. Frontend should not call this directly.

**Request Body:**
```json
{
  "request": "string",
  "...": "response data"
}
```

**Success Response Body (Action):**
```json
{
  "request": "string"
}
```
---
# API Specification: Sessioning Concept

**Purpose:** To maintain a user's logged-in state across multiple requests without re-sending credentials.

**Important Note:** The Sessioning concept is primarily used **internally** by synchronizations. The `startSession` action is typically triggered automatically by a sync after successful login. The `endSession` action (or `logout`) can be called by the frontend to log out. The `_getUser` query is used internally by syncs to extract the user from a session.

---

## API Endpoints

### POST /api/Sessioning/startSession

**Description:** Creates a new session for a user.

**Note:** This is typically called automatically by a synchronization after successful login. The frontend receives the `sessionId` as part of the login response and should store it for future authenticated requests.

**Requirements:**
- The `user` exists and is authenticated.

**Effects:**
- Creates a new `Session` with a unique `sessionId` and associates it with the given `user`; returns the `sessionId`.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{
  "sessionId": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Sessioning/removeAllSessionsForUser

**Description:** Removes all sessions associated with a specific user. This is typically used for cascade deletion when a user account is deleted.

**Authentication:** This endpoint is typically called internally by synchronizations and may not require user authentication. However, if exposed directly, it should require appropriate authorization (e.g., the user themselves or an administrator).

**Requirements:**
- The `user` exists.

**Effects:**
- Removes all `Session`s associated with the specified `user` from the state; returns `success: true`.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{
  "success": true
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Sessioning/endSession

**Description:** Ends a user session (logout).

**Authentication:** Requires a valid `sessionId`. The session to end is specified by `sessionId`.

**Requirements:**
- The `sessionId` exists.

**Effects:**
- Removes the `Session` identified by `sessionId` from the state. After calling this, the `sessionId` is no longer valid and should not be used for authenticated requests.

**Request Body:**
```json
{
  "sessionId": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Sessioning/_getUser

**Description:** Gets the user associated with a session.

**Note:** This is an internal query used by synchronizations to extract the user from a `sessionId`. Frontend should not need to call this directly, as synchronizations handle user extraction automatically.

**Requirements:**
- The `sessionId` exists.

**Effects:**
- Returns the `user` associated with the `Session` identified by `sessionId`.

**Request Body:**
```json
{
  "sessionId": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
