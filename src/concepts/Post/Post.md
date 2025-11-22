**concept** Post [User, Item] \
**purpose** to allow users to share their learning progress and musical activities, fostering community and motivation \
**principle** Users can create public posts to share updates, which are then visible on a feed. These posts can be general thoughts or specifically highlight their musical progress. Users maintain control over their own posts, allowing them to edit or delete them.

**state**
> a set of Posts with
>
> > a postId String \
> > an author User \
> > a content String \
> > an optional item Item \
> > a postType of PROGRESS or GENERAL \
> > a createdAt DateTime \
> > an optional editedAt DateTime 

**actions** \
createPost (author: User, content: String, postType: PostType, item: optional Item): (postId: String)
*   **requires** The `author` (User) exists. If `item` is provided, the `item` must exist.
*   **effects** Creates a new `Post` with a unique `postId`; sets `author`, `content`, `postType`, `item` (if provided), and `createdAt` to the current DateTime; returns the `postId`.

deletePost (postId: String, deleter: User)
*   **requires** The `postId` exists. The `deleter` (User) is the `author` of the `Post` or an authorized administrator.
*   **effects** Removes the `Post` identified by `postId` from the state. 

editPost (postId: String, editor: User, newContent: String, newItem: optional Item, newPostType: optional PostType)
*   **requires** The `postId` exists. The `editor` (User) is the `author` of the `Post`.
*   **effects** Updates the `content` of the `Post` identified by `postId` to `newContent`. Optionally updates `item` to `newItem` and `postType` to `newPostType`. Sets `editedAt` to the current DateTime.

**notes**
- the optional item component will allow users to associate posts with certain songs or chords that are relevant to the update
- postType will be used to capture the general content a post is focused on: "I mastered this song!", "Just practicing!", or a general update 
