**concept** Comment [User, Item] \
**purpose** to allow users to interact with items \
**principle** Users can add textual comments to existing items, which are publicly visible to others. Comments can be edited or deleted by their author.

**state**
> a set of Comments with
>
> > a commentId String \
> > a item Item \
> > an author User \
> > a content String \
> > a createdAt DateTime \
> > an optional lastEditedAt DateTime 
>
> a set of Items each with
> > a set of Comments

**actions** \
addCommentToItem (item: Item, author: User, content: String): (comment: Comment)
*   **requires** The `item` exists and the `author` exists.
*   **effects** Creates a new `Comment` with a unique `commentId`, links it to the `item` and `author`, sets its `content` and `createdAt` timestamp; adds it to the comments set of `item`; returns the new `comment`.

deleteComment (comment: Comment, author: User)
*   **requires** The `comment` exists and its `author` matches the provided `author`.
*   **effects** Removes the `comment` from the set of `Comments` and from the `comments` set of `comment.item`.

editComment (comment: Comment, author: User, newContent: String)
*   **requires** The `comment` exists and its `author` matches the provided `author`.
*   **effects** Updates the `content` of the `comment` to `newContent`, sets `lastEditedAt` to the current timestamp, and returns `success: true`.

**queries**
_getCommentsForItemId (item: Item): ([{ comments: {content: String, author: User}[] }])
* **requires** The `item` exists.
* **effects** Returns a single-element array; the element exposes a `comments` property containing the simplified comment objects (`{ content, author }`) for the given `item`.

**notes**
- lastEditedAt will be used to track if/when a comment was edited
---
