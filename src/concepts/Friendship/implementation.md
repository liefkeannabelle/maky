[@concept-background](../../../design/tools/concept-background.md)

[@api-specification](../../../design/api-specification.md)

[@api-extraction-from-spec](../../../design/tools/api-extraction-from-spec.md)



[@Friendship](Friendship.md)


[@FriendshipConcept.ts](FriendshipConcept.ts)

[@Friendship.test.ts](Friendship.test.ts)



_getFriends (user: User): (friend: User)

* **requires** The user `user` exists.
* **effects** Returns a set of all users `f` for whom a `Friendship` exists with `status` `ACCEPTED` between `user` and `f`.
  

# write an api spec for friendship._getfriends that I will add in Friendship.md

# response:

# API Specification: Friendship Concept

**Purpose:** to allow users to establish and manage mutual connections

---

## API Endpoints

### POST /api/Friendship/sendFriendRequest

**Description:** Sends a friend request from one user to another.

**Requirements:**
- The `requester` and `recipient` are distinct Users.
- No `Friendship` exists between these two users (regardless of who is requester or recipient).

**Effects:**
- Creates a new `Friendship`; sets `requester` and `recipient`; sets `status` to `PENDING`; sets `initiatedAt` to the current time; returns the new `friendship`.

**Request Body:**
```json
{
  "requester": "string",
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

**Requirements:**
- A `Friendship` exists where the `requester` is the requester, the `recipient` is the recipient, and the `status` is `PENDING`.

**Effects:**
- Updates the `status` of the existing `Friendship` to `ACCEPTED`.

**Request Body:**
```json
{
  "requester": "string",
  "recipient": "string"
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
### POST /api/Friendship/declineFriendRequest

**Description:** Declines a pending friend request.

**Requirements:**
- A `Friendship` exists where the `requester` is the requester, the `recipient` is the recipient, and the `status` is `PENDING`.

**Effects:**
- Updates the `status` of the existing `Friendship` to `DECLINED`.

**Request Body:**
```json
{
  "requester": "string",
  "recipient": "string"
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
### POST /api/Friendship/removeFriend

**Description:** Removes an existing friendship between two users.

**Requirements:**
- A `Friendship` exists between `user1` and `user2` (where one is the requester and the other is the recipient).

**Effects:**
- Removes the `Friendship` object associated with these two users from the state.

**Request Body:**
```json
{
  "user1": "string",
  "user2": "string"
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
### POST /api/Friendship/removeAllFriendshipsForUser

**Description:** Removes all friend requests and established friendships associated with a specific user.

**Requirements:**
- This action can always be performed.

**Effects:**
- Removes all `Friendship` objects from the state where the given `user` is either the `requester` or the `recipient`, regardless of the friendship's `status`.

**Request Body:**
```json
{
  "user": "string"
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
### POST /api/Friendship/_areFriends

**Description:** Checks if two users have an accepted friendship.

**Requirements:**
- The users `user1` and `user2` exist.

**Effects:**
- Returns `true` if there exists a `Friendship` `f` such that `f.status` is `ACCEPTED` and the pair (`f.requester`, `f.recipient`) matches (`user1`, `user2`) in either order. Otherwise returns `false`.

**Request Body:**
```json
{
  "user1": "string",
  "user2": "string"
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

# response:

