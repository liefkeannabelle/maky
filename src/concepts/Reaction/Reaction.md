
**concept** Reaction [User, Post] \
**purpose** to allow users to express positive sentiment on posts \
**principle** A user can attach a specific sentiment (such as "like" or "love") to a post. A user provides only one reaction per post, which can be subsequently removed to retract the sentiment.

**state** 
> a set of Reactions with
>
> > a reactionId String
> > a post Post
> > a user User
> > a type of LIKE or LOVE or CELEBRATE
> > a createdAt DateTime
>
> a set of Posts each with
> > a set of Reactions

**actions** \
addReactionToPost (user: User, post: Post, type: ReactionType): (reaction: Reaction)

*   **requires** The `user` and `post` exist. No `Reaction` already exists for this specific combination of `user` and `post`.
*   **effects** Creates a new `Reaction` with a unique `reactionId`; sets the `user`, `post`, `type`, and sets `createdAt` to the current time; adds the new reaction to the `reactions` set of `post`; returns the new `reaction`.

changeReactionType (user: User, post: Post, newType: ReactionType)
*   **requires** A `Reaction` exists for this user and post.
*   **effects** Updates the reaction’s `type` to `newType`.

removeReactionFromPost (user: User, post: Post)

*   **requires** A `Reaction` exists associated with the given `user` and `post`.
*   **effects** Removes the matching `Reaction` from the state and from the `reactions` set of `post`.

**notes**
There are no non-obvious design choices in this concept.
