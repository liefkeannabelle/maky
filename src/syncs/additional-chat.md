
[@sync-compilation](sync-compilation.md)


# write up an API spec for editPostVisibility, including all the necessary information. include only the added or changed text I should put in api-specification-new.md
# response:

***

### POST /api/Post/editPostVisibility

**Description:** Updates the visibility of an existing post without changing other fields.

**Authentication:** Requires a valid `sessionId`. The editor is automatically extracted from the session.

**Requirements:**

* The `postId` exists. The user associated with `sessionId` is the `author` of the `Post`.
* `newVisibility` must be either `PUBLIC` or `PRIVATE`.

**Effects:**

* Updates the `visibility` of the `Post` identified by `postId` to `newVisibility` and sets `editedAt` to the current DateTime; returns `success: true` on completion.

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