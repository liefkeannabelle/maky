**concept** Post [User, Item] \
**purpose** to allow users to share their learning progress and musical activities, fostering community and motivation \
**principle** Users can create public posts to share updates, which are then visible on a feed. These posts can be general thoughts or specifically highlight their musical progress. Users maintain control over their own posts, allowing them to edit or delete them.

**state**
> a set of Posts with
>
> > a postId String \
> > an author User \
> > a content String \
> > items List<Item> \
> > a postType of PROGRESS or GENERAL \
> > a createdAt DateTime \
> > an optional editedAt DateTime 

**actions** \
createPost (author: User, content: String, postType: PostType, items: List<Item>): (postId: String)
*   **requires** The `author` (User) exists. Every `item` in `items` must exist.
*   **effects** Creates a new `Post` with a unique `postId`; sets `author`, `content`, `postType`, `items`, and `createdAt` to the current DateTime; returns the `postId`.

deletePost (postId: String, deleter: User)
*   **requires** The `postId` exists. The `deleter` (User) is the `author` of the `Post` or an authorized administrator.
*   **effects** Removes the `Post` identified by `postId` from the state and returns `success: true`.

editPost (postId: String, editor: User, newContent: String, newItems: List<Item> or "UNDEFINED", newPostType: PostType or "UNDEFINED")
*   **requires** The `postId` exists. The `editor` (User) is the `author` of the `Post`. Callers must always provide both `newItems` and `newPostType`; when no change is desired, pass the literal string `"UNDEFINED"` for that argument.
*   **effects** Updates the `content` of the `Post` identified by `postId` to `newContent`. Replaces `items` with `newItems` unless it is `"UNDEFINED"`, and updates `postType` to `newPostType` unless it is `"UNDEFINED"`. Sets `editedAt` to the current DateTime and returns `success: true`.

**notes**
- the items component allows users to associate posts with certain songs or chords that are relevant to the update
- postType will be used to capture the general content a post is focused on: "I mastered this song!", "Just practicing!", or a general update 
