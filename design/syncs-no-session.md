# Syncs That Don't Require `sessionId`

This file lists API endpoints (syncs) from `design/api-specification-new.md` that do not require a `sessionId` in the request body. Use this as a quick reference for public queries/endpoints. Review before exposing to production; some endpoints may be intended for internal use only.

---

## UserAccount

- `POST /api/UserAccount/register`
  - Description: Create a new user account.
  - Request Body: `{ "username": "string", "email": "string", "password": "string", "isKidAccount": "boolean", "isPrivateAccount": "boolean" }`
  - Note: No `sessionId` required.

- `POST /api/UserAccount/login`
  - Description: Authenticate user and create session.
  - Request Body: `{ "username": "string", "password": "string" }`
  - Success Response: `{ "user": "string", "sessionId": "string" }`
  - Note: No `sessionId` required (this is how the frontend obtains the `sessionId`).

- `POST /api/UserAccount/_isUserById`
  - Description: Check whether a user exists for a given user ID.
  - Request Body: `{ "user": "ID" }`
  - Success Response (Query): `[ { "result": true | false } ]`
  - Note: This query can always be executed (public).

---

## UserProfile

- `POST /api/UserProfile/_searchByDisplayName`
  - Description: Public search for profiles by display name (partial match).
  - Request Body: `{ "query": "string" }`
  - Success Response (Query): `[ { "user": "string", "displayName": "string" } ]`
  - Note: Explicitly public; no `sessionId` required.

---

## Post

- `POST /api/Post/_getPostsViewableToUsers`
  - Description: Retrieve posts authored by any of the specified users (combined feed helper).
  - Request Body: `{ "users": ["string"] }`
  - Success Response (Query): Array of posts (newest first). Returns empty array when none.
  - Note: No `sessionId` required in the spec.

---

## Comment

- `POST /api/Comment/_getCommentsForPostId`
  - Description: Retrieve simplified list of comments for a specific post (single-element array containing `comments`).
  - Request Body: `{ "post": "Post" }`
  - Success Response (Query): `[ { "comments": [ { "commentId": "string", "content": "string", "author": "User" } ] } ]`
  - Note: No `sessionId` required in the spec.

---

## Reaction

- `POST /api/Reaction/_getReactionsForPostId`
  - Description: Retrieve reaction counts grouped by type for a post.
  - Request Body: `{ "post": "string" }`
  - Success Response (Query): Array of `{ "type": "LIKE|LOVE|CELEBRATE", "count": number }` (includes zero counts).
  - Note: No `sessionId` required in the spec.

- `POST /api/Reaction/_getReactionOnPostFromUser`
  - Description: Retrieve the reaction of a specific user on a specific post.
  - Request Body: `{ "user": "string", "post": "string" }`
  - Success Response (Query): Array of `{ "type": "LIKE|LOVE|CELEBRATE", "count": 0|1 }`.
  - Note: No `sessionId` required in the spec.

---

## ChordLibrary

- `POST /api/ChordLibrary/_filterSongsByGenre`
  - Description: Get all songs in a given genre (public query).
  - Request Body: `{ "genre": "string" }`
  - Success Response (Query): `[ { "songs": "string[]" } ]`.
  - Note: Explicitly public; no `sessionId` required.

---

## Notes & Next Steps

- This list was derived from `design/api-specification-new.md` (the copy you provided). It includes endpoints that explicitly state they are public or whose request format does not include a `sessionId` and whose Authentication section does not demand one.
- Recommendation: Review each included endpoint and confirm intent. Some endpoints may be "internal-only" (called by syncs) and not intended for direct public exposure.
- If you want, I can:
  - Add explicit `Authentication` guidance per endpoint (e.g., `public` vs `requires sessionId`) and mark endpoints intended for internal use.
  - Generate a JSON or CSV export of these endpoints for audit purposes.

---

_File generated from `design/api-specification-new.md`._
