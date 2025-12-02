# ChordConnect Concepts
**concept** UserAccount \
**purpose** to allow users to establish and manage their identity within the app \
**principle** A user registers with a unique username, email, and password. They can later log in using these credentials to access the app. \

**state**
> a set of Users with
>
> > a username String\
> > an email String\
> > a passwordHash String\
> > a isKidAccount Boolean\
> > a isPrivateAccount Boolean

**actions** \
register (username: String, email: String, password: String, isKidAccount: Boolean, isPrivateAccount: Boolean): (user: User)

*   **requires** No User exists with the given `username` or `email`.
*   **effects** Creates a new User; sets its `username`, `email`, `isKidAccount` status, `isPrivateAccount` status, and a hash of the `password`; returns the new user.

login (username: String, password: String): (user: User)

*   **requires** A User exists with the given `username` and the provided `password` matches their `passwordHash`.
*   **effects** Returns the matching user.

changePassword (user: User, oldPassword: String, newPassword: String): (success: Boolean)

*   **requires** The `user` exists and the provided `oldPassword` matches their current `passwordHash`.
*   **effects** Updates the `passwordHash` for `user` with a hash of `newPassword`; returns `true` as `success`.

  
changePassword (user: User, oldPassword: String, newPassword: String): (error: String)

*   **requires** The `user` does not exist or the `oldPassword` does not match their current `passwordHash`.
*   **effects** Returns an error message.

updateCredentials (user: User, newUsername: String, newEmail: String): (success: Boolean)

*   **requires** The `user` exists. The `newUsername` and `newEmail` are not already in use by another User.
*   **effects** Updates the `username` to `newUsername` and `email` to `newEmail` for the given `user`; returns `true` as `success`.


setKidAccountStatus (user: User, status: Boolean): (success: Boolean)

*   **requires** The `user` exists.
*   **effects** Sets the `isKidAccount` status for the given `user` to the provided `status`; returns `true` as `success`.

setPrivateAccountStatus (user: User, status: Boolean): (success: Boolean)

*   **requires** The `user` exists.
*   **effects** Sets the `isPrivateAccount` status for the given `user` to the provided `status`; returns `true` as `success`.

deleteAccount (user: User, password: String): (success: Boolean)

*   **requires** The `user` exists and the provided `password` matches their `passwordHash`.
*   **effects** Removes the `user` and all their associated data from the state; returns `true` as `success`.

**queries**

\_getUserByUsername (username: String): (user: User)

* **requires**: a User with the given `username` exists.
* **effects**: returns the corresponding User.

\_isUserById (user: User): (result: Boolean)

*   **requires**: true
*   **effects**: returns `true` as `result` if a user with the given id exists, `false` otherwise.

\_isKidOrPrivateAccount (user: User): (isKidOrPrivate: Boolean)

*   **requires**: a User with the given `user` id exists.
*   **effects**: returns `true` as `isKidOrPrivate` if the user is a kid account or a private account, `false` otherwise.


**notes**
- The user account will store the core authentification details for a given user as they would appear on functionally any such app. The app-specific preferences are stored instead in UserProfile. 
- The isKidAccount flag will serve to enforce limited social functionality for users marked as children.
- The isPrivateAccount flag limits visibility and interactions for users who prefer tighter privacy controls.
---
**concept** UserProfile [User] \
**purpose** to allow users to personalize their in-app identity and preferences \
**principle** A user maintains a personal profile, separate from their core account credentials, which includes a display name, an optional bio and avatar, and their musical preferences and skill level.

**state**
> a set of Profiles with
>
> > a user User \
> > a displayName String \
> > an optional bio String \
> > an optional avatarUrl String \
> > a set of genrePreferences String \
> > a skillLevel of BEGINNER or INTERMEDIATE or ADVANCED \
> > an optional targetSong String

**actions**

createProfile (user: User, displayName: String, genrePreferences: set of String, skillLevel: SkillLevel): (profile: Profile)
*   **requires** The `user` exists and does not already have a `Profile`.
*   **effects** Creates a new `Profile` for the `user` with the given `displayName`, `genrePreferences`, and `skillLevel`; returns the new `profile`.

updateDisplayName (user: User, newDisplayName: String): (success: Boolean)
*   **requires** The `user` exists and has an associated `Profile`.
*   **effects** Updates the `displayName` in the `user`'s `Profile` to `newDisplayName`; returns `true` as `success`.

updateBio (user: User, newBio: String or undefined): (success: Boolean)
*   **requires** The `user` exists and has an associated `Profile`. Callers must always provide the `newBio` argument; pass `undefined` when the bio should be cleared.
*   **effects** Updates the `bio` in the `user`'s `Profile` to `newBio` (removing the field when it is `undefined`); returns `true` as `success`.

updateAvatar (user: User, newAvatarUrl: String or undefined): (success: Boolean)
*   **requires** The `user` exists and has an associated `Profile`. Callers must always provide the `newAvatarUrl` argument; pass `undefined` (or the literal string `"UNDEFINED"` when `undefined` cannot be expressed) when the avatar should be cleared.
*   **effects** Updates the `avatarUrl` in the `user`'s `Profile` to `newAvatarUrl` (removing the field when it is `undefined` or `"UNDEFINED"`); returns `true` as `success`.

setGenrePreferences (user: User, newGenrePreferences: set of String): (success: Boolean)
*   **requires** The `user` exists and has an associated `Profile`.
*   **effects** Replaces the `genrePreferences` in the `user`'s `Profile` with `newGenrePreferences`; returns `true` as `success`.

changeSkillLevel (user: User, newSkillLevel: SkillLevel): (success: Boolean)
*   **requires** The `user` exists and has an associated `Profile`.
*   **effects** Updates the `skillLevel` in the `user`'s `Profile` to `newSkillLevel`; returns `true` as `success`.

setTargetSong (user: User, song: Song): (success: Boolean)
* **requires** The `user` exists and has an associated `Profile`. The `song` exists.
* **effects** Updates the `targetSong` in the `user`'s `Profile` to the provided `song`; returns `true` as `success`.

removeTargetSong (user: User): (success: Boolean)
* **requires** The `user` exists and has an associated `Profile`.
* **effects** Removes the `targetSong` from the `user`'s `Profile`; returns `true` as `success`.

deleteProfile (user: User): (success: Boolean)
*   **requires** The user exists and has an associated `Profile`.
*   **effects** Removes the `Profile` associated with the user from the state; returns `true` as `success`. 

**queries**

_searchByDisplayName (query: String): (user: User, displayName: String)
* **requires** true
* **effects** Returns a set of users and their display names that partially match the query string.

_getProfile (user: User): (profile: { displayName: String, bio: optional String, avatarUrl: optional String, genrePreferences: set of String, skillLevel: SkillLevel, targetSong: optional String })

* **requires** The `user` exists.
* **effects** Returns the full profile details for the given user if a profile exists.


**notes**
- UserProfile stores more app-specific and user-specific data as compared to UserAccount.
- Genre preferences will be a set of genres, as described by strings, selected from a set bank.
---

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
> > an optional editedAt DateTime \
> > a visibility of PUBLIC or PRIVATE

**actions** \
createPost (author: User, content: String, postType: PostType, items: List<Item>, visibility: PostVisibility): (postId: String)
*   **requires** The `author` (User) exists. Every `item` in `items` must exist.
*   **effects** Creates a new `Post` with a unique `postId`; sets `author`, `content`, `postType`, `items`, `visibility`, and `createdAt` to the current DateTime; returns the `postId`.

deletePost (postId: String, deleter: User)
*   **requires** The `postId` exists. The `deleter` (User) is the `author` of the `Post` or an authorized administrator.
*   **effects** Removes the `Post` identified by `postId` from the state and returns `success: true`.

editPost (postId: String, editor: User, newContent: String, newItem: optional Item, newPostType: optional PostType)
*   **requires** The `postId` exists. The `editor` (User) is the `author` of the `Post`.
*   **effects** Updates the `content` of the `Post` identified by `postId` to `newContent`. Optionally updates `item` to `newItem` and `postType` to `newPostType`. Sets `editedAt` to the current DateTime and returns `success: true`.

editPostVisibility (postId: String, editor: User, newVisibility: PostVisibility)
*   **requires** The `postId` exists and the `editor` is the author of the `Post`. `newVisibility` is either `PUBLIC` or `PRIVATE`.
*   **effects** Updates the `visibility` of the `Post` and sets `editedAt` to the current DateTime; returns `success: true`.

removeAllPostsForUser (user: User): (success: Boolean, postIds: List<Post>)
*   **requires** The `user` exists.
*   **effects** Removes all `Post`s authored by the given `user` from the state; returns `success: true` and `postIds` array containing the IDs of all deleted posts.

**queries** \
// Note: multi-user feed aggregation is composed by sync logic using per-user
// queries (`_getPrivatePostsForUser` and `_getPublicPostsForUsers`). The
// `_getPostsViewableToUsers` helper was removed to avoid ambiguity in visibility rules.

_getPrivatePostsForUser (user: User): (post: Post)
*   **requires** The `user` exists.
*   **effects** Returns all `PRIVATE` posts authored by the given `user`, ordered by creation date (newest first).

_getPublicPostsForUsers (users: set of User): (post: Post)
*   **requires** All `users` exist.
*   **effects** Returns all `PUBLIC` posts authored by any of the given `users`, ordered by creation date (newest first).

**notes**
- the optional item component will allow users to associate posts with certain songs or chords that are relevant to the update
- postType will be used to capture the general content a post is focused on: "I mastered this song!", "Just practicing!", or a general update 
---

**concept** Comment [User, Post] \
**purpose** to let users respond to posts with short messages and conversations \
**principle** Users attach textual comments to posts created by themselves or others. Comments can later be edited or deleted by their author, and are included whenever a post is displayed.

**state**
> a set of Comments with
>
> > a commentId String \
> > a post Post \
> > an author User \
> > a content String \
> > a createdAt DateTime \
> > an optional lastEditedAt DateTime

**actions** \
addCommentToPost (post: Post, author: User, content: String): (comment: Comment)
*   **requires** The `post` exists and the `author` exists.
*   **effects** Creates a new `Comment` with a unique `commentId`, links it to the `post` and `author`, sets its `content` and `createdAt` timestamp, and returns the new `comment`.

deleteComment (comment: Comment, author: User)
*   **requires** The `comment` exists and its `author` matches the provided `author`.
*   **effects** Removes the `comment` from the state.

editComment (comment: Comment, author: User, newContent: String)
*   **requires** The `comment` exists and its `author` matches the provided `author`.
*   **effects** Updates the `content` of the `comment` to `newContent`, sets `lastEditedAt` to the current timestamp, and returns `success: true`.

removeAllCommentsFromPost (post: Post)
*   **requires** The `post` exists.
*   **effects** Removes all `Comment`s associated with the given `post` from the state; returns `success: true`.

removeAllCommentsForUser (user: User)
*   **requires** The `user` exists.
*   **effects** Removes all `Comment`s authored by the given `user` from the state; returns `success: true`.

**queries**

_getCommentsForPost (post: Post): (comments: CommentDoc[])
*   **requires** The `post` exists.
*   **effects** Returns the full comment documents for the given `post`, ordered by creation date.

_getCommentById (comment: Comment): (comment: CommentDoc | null)
*   **requires** The `comment` exists.
*   **effects** Returns the comment document with the specified `commentId`, or `null` if missing.

_getCommentsForPostId (post: Post): ([{ comments: { commentId: Comment, content: String, author: User }[] }])
*   **requires** The `post` exists.
*   **effects** Returns a single-element array whose object contains a `comments` array of simplified comment objects with `commentId`, `content`, and `author` fields. This is the optimized query used by the sync and API response.

**notes**
- `lastEditedAt` tracks whether a comment has been edited after creation.
- The simplified `_getCommentsForPostId` query maps directly to the public API response shape (`[{ "comments": [...] }]`).
---

**concept** Reaction [User, Item] \
**purpose** to allow users to express positive sentiment on items \
**principle** A user can attach a specific sentiment (such as "like" or "love") to a item. A user provides only one reaction per item, which can be subsequently removed to retract the sentiment.

**state** 
> a set of Reactions with
>
> > a reactionId String
> > a item Item
> > a user User
> > a type of LIKE or LOVE or CELEBRATE
> > a createdAt DateTime
>
> a set of Items each with
> > a set of Reactions

**actions** \
addReactionToItem (user: User, item: Item, type: ReactionType): (reaction: Reaction)

*   **requires** The `user` and `item` exist. No `Reaction` already exists for this specific combination of `user` and `item`.
*   **effects** Creates a new `Reaction` with a unique `reactionId`; sets the `user`, `item`, `type`, and sets `createdAt` to the current time; adds the new reaction to the `reactions` set of `item`; returns the new `reaction`.

changeReactionType (user: User, item: Item, newType: ReactionType)
*   **requires** A `Reaction` exists for this user and item.
*   **effects** Updates the reaction’s `type` to `newType`.

removeReactionFromItem (user: User, item: Item)

*   **requires** A `Reaction` exists associated with the given `user` and `item`.
*   **effects** Removes the matching `Reaction` from the state and from the `reactions` set of `item`.

removeAllReactionsFromItem (item: Item)

*   **requires** The `item` exists.
*   **effects** Removes all `Reaction`s associated with the given `item` from the state and from the `reactions` set of `item`.

removeAllReactionsForUser (user: User)
*   **requires** The `user` exists.
*   **effects** Removes all `Reaction`s created by the given `user` from the state; returns `success: true`.

**queries**
_getReactionsForItemId (item: Item): (type: ReactionType, count: number)

*   **requires** The `item` exists.
*   **effects** Returns an array of objects, each containing a reaction type and its total count for the given `item`. Includes types with a count of 0.

_getReactionOnItemFromUser (user: User, item: Item): (type: ReactionType, count: number)

*   **requires** The `user` and `item` exist.
*   **effects** Returns an array of objects, each containing a reaction type and its count (0 or 1) for the given `user` and `item`.


---
**concept** Friendship [User] \
**purpose** to allow users to establish and manage mutual connections \
**principle** A user can initiate a connection by sending a friend request to another user. The recipient can either accept the request to establish a friendship or decline it. Once connected, either user can terminate the friendship.

**state**
> a set of Friendships with
>
> > a requester User
> > a recipient User
> > a status of PENDING or ACCEPTED or DECLINED
> > a initiatedAt DateTime

**actions** \
sendFriendRequest (requester: User, recipient: User): (friendship: Friendship)

*   **requires** The `requester` and `recipient` are distinct Users. No `Friendship` exists between these two users (regardless of who is requester or recipient).
*   **effects** Creates a new `Friendship`; sets `requester` and `recipient`; sets `status` to `PENDING`; sets `initiatedAt` to the current time; returns the new `friendship`.

acceptFriendRequest (requester: User, recipient: User)

*   **requires** A `Friendship` exists where the `requester` is the requester, the `recipient` is the recipient, and the `status` is `PENDING`.
*   **effects** Updates the `status` of the existing `Friendship` to `ACCEPTED` and returns `success: true`.

declineFriendRequest (requester: User, recipient: User)

*   **requires** A `Friendship` exists where the `requester` is the requester, the `recipient` is the recipient, and the `status` is `PENDING`.
*   **effects** Updates the `status` of the existing `Friendship` to `DECLINED` and returns `success: true`.

removeFriend (user1: User, user2: User)

*   **requires** A `Friendship` exists between `user1` and `user2` (where one is the requester and the other is the recipient).
*   **effects** Removes the `Friendship` object associated with these two users from the state and returns `success: true`.

removeAllFriendshipsForUser (user: User)

* **requires** true
* **effects** Removes all `Friendship` objects from the state where the given `user` is either the `requester` or the `recipient`, regardless of the friendship's `status`.

**queries** \
areFriends (user1: User, user2: User): (isFriend: Boolean)
*   **requires** The users `user1` and `user2` exist.
*   **effects** Returns `true` if there exists a `Friendship` `f` such that `f.status` is `ACCEPTED` and the pair (`f.requester`, `f.recipient`) matches (`user1`, `user2`) in either order. Otherwise returns `false`.

_getFriends (user: User): (friend: User)

* **requires** The user `user` exists.
* **effects** Returns a set of all users `f` for whom a `Friendship` exists with `status` `ACCEPTED` between `user` and `f`.


**notes**
- Friendship will represent a mutual relationship between two users. 
- A declined friend request does not prevent a user from sending another (i.e. blocking). Our app does not currently have any such functionality.
---
**concept** JamGroup [User] \
**purpose** to allow users to create and manage private groups for collaborative jamming \
**principle** A user can create a jam group and becomes its creator. Other users can be added to the group as members. The creator can disband the group.

**state**

> a set of JamGroups with
>
> > a groupId String
> > a name String
> > a description String
> > a creator User
> > a members set of User
> > a createdAt DateTime

**actions**

createJamGroup (creator: User, name: String, description: String): (group: JamGroup)

*   **requires** The `creator` exists.
*   **effects** Creates a new `JamGroup` with a unique `groupId`; sets `name`, `description`, and `creator`; adds the `creator` to the `members` set; sets `createdAt` to the current time; returns the new `group`.

addMember (group: JamGroup, newMember: User)

*   **requires** The `group` exists, and `newMember` exists. The `newMember` is not already in the `members` set and is a friend of one of the members in the group.
*   **effects** Adds `newMember` to the `members` set of the `group`.

removeUserFromJamGroup (group: JamGroup, user: User)

*   **requires** The `group` exists and the `user` is currently in the `members` set.
*   **effects** Removes the `user` from the `members` set of the `group`.

disbandJamGroup (group: JamGroup, requester: User)

*   **requires** The `group` exists. The `requester` is the `creator` of the `group`.
*   **effects** Removes the `group` and all its associated data from the state.

**notes**
- A JamGroup is a set of users that will allow them to create jam sessions.
---
**concept** JamSession [User, Song] \
**purpose** to facilitate real-time or asynchronous collaborative music sessions within a JamGroup \
**principle** A jam session can be scheduled for the future or started immediately within a group. During an active session, participants can join and share the specific songs they are practicing, updating their status (e.g., "soloing", "practicing verse") to coordinate with others. The session is explicitly ended to mark its completion.

**state**

> a set of JamSessions with
>
> > a sessionId String
> > a jamGroup JamGroup
> > a startTime DateTime
> > an optional endTime DateTime
> > a participants set of User
> > a sharedSongs set of SharedSongs
> > a status of ACTIVE or COMPLETED or SCHEDULED
>
> a set of SharedSongs with
>
> > a song Song
> > a participant User
> > a currentStatus String

**actions**

scheduleJamSession (group: JamGroup, startTime: DateTime): (session: JamSession)

*   **requires** The `group` exists. The `startTime` is in the future.
*   **effects** Creates a new `JamSession` with a unique `sessionId`; sets `jamGroup`, `startTime`, and `status` to `SCHEDULED`; initializes empty sets for `participants` and `sharedSongs`; returns the new `session`.

startJamSession (group: JamGroup, creator: User): (session: JamSession)

*   **requires** The `group` exists and the `creator` is a member of the group.
*   **effects** Creates a new `JamSession` with a unique `sessionId`; sets `jamGroup`, `status` to `ACTIVE`, and `startTime` to the current time; adds `creator` to `participants`; returns the new `session`.

joinSession (session: JamSession, user: User)

*   **requires** The `session` exists and is `ACTIVE`. The `user` is a member of the associated `JamGroup` and is not already in `participants`.
*   **effects** Adds the `user` to the `participants` set of the `session`.

shareSongInSession (session: JamSession, participant: User, song: Song, currentStatus: String)

*   **requires** The `session` exists and is `ACTIVE`. The `participant` is in the `participants` set. The `song` is not already shared by this `participant` in this `session`.
*   **effects** Creates a new `SharedSong` with `song`, `participant`, and `currentStatus` and adds it to the `sharedSongs` set of the `session`.

updateSharedSongStatus (session: JamSession, participant: User, song: Song, newStatus: String)

*   **requires** The `session` exists and is `ACTIVE`. A `SharedSong` exists in the `session` for this `participant` and `song`.
*   **effects** Updates the `currentStatus` of the matching `SharedSong` to `newStatus`.

endJamSession (session: JamSession)

*   **requires** The `session` exists and is `ACTIVE`.
*   **effects** Updates the `status` to `COMPLETED` and sets `endTime` to the current time.

**notes**
- A JamSession is meant to *support* in-person jam session of a JamGroup.
---
**concept** Chord [Note] \
**purpose** define fundamental musical chords \
**principle** administrator defines chords that can be used widely by the users

**state**
> a set of Chords with
  >> a name String\
  >> a Notes sequence

**actions**

createChord (name: String, notes: sequence of Note): (chord: Chord)

*   **requires** No Chord with the given `name` already exists.
*   **effects** Creates a new Chord `c`; sets the name of `c` to `name` and its `notes` to the provided sequence; returns the new Chord `c` as `chord`.

deleteChord (chord: Chord)
*   **requires** The Chord `chord` exists.
*   **effects** Removes the Chord `chord` and all its associated data from the state.

**notes**
There are no non-obvious design choices for this concept.

---
**concept** ChordLibrary [User, Chord] \
**purpose** maintain an inventory of chords known by each user, along with their self-reported mastery level for each chord. \
**principle** when a user learns a new chord, they add it to their library with an initial mastery level. As they practice and become more proficient, they update the chord's mastery level. The user gets playable songs from the cords they know.

**state**

> a set of Chords\
> a set of Users with
>> a set of knownChords each with
>>> a Chord string \
>>> a MasteryLevel enum {‘na’, ‘in progress’, ‘mastered’}


**actions**

addUser (user: User)
*   **requires** The `user` does not already exist in the set of Users.
*   **effects** Adds the given `user` to the set of Users, creating an empty inventory for them.

addChordToInventory (user: User, chord: Chord, mastery: MasteryLevel)

*   **requires** The `user` exists. The `user` does not already have the specified `chord` in their inventory.
*   **effects** Creates a new `KnownChord` entry associating the `user`, `chord`, and `mastery` level.

updateChordMastery (user: User, chord: Chord, newMastery: MasteryLevel)

*   **requires** A `KnownChord` entry exists for the given `user` and `chord`.
*   **effects** Updates the `mastery` of the existing `KnownChord` entry for the `user` and `chord` to `newMastery`.

removeChordFromInventory (user: User, chord: Chord)

*   **requires** A `KnownChord` entry exists for the given `user` and `chord`.
*   **effects** Deletes the `KnownChord` entry for the specified `user` and `chord`.

removeUser (user: User)

*   **requires** The `user` exists in the set of Users.
*   **effects** Removes the `user` from the set of Users and deletes all `KnownChord` entries associated with that `user`.

**queries**

_getKnownChords (user: User): (knownChords: {chord: Chord, mastery: MasteryLevel})

*   **requires** The `user` exists.
*   **effects** Returns the set of all `KnownChord` entries for the given `user`, each containing a chord and its mastery level.

**notes**
- We are still working through how best to divide the "mastery" of a chord while supporting the song recommendation feature.
- Like the song library, the state has both a library of all chords and the set known by each user with their mastery level.

---

**concept** RecommendationEngine \
**purpose** guide a user's learning journey, helping them choose the next best chords to learn and discover relevant songs. \
**principle** user requests a chord recommendation, the engine analyzes their current chord inventory against a library of songs and suggests the next chord best to learn

**queries**

requestChordRecommendation (knownChords: set of Chord, allChords: set of Chord): (recommendedChord: Chord)
	
*   **requires** The set of `knownChords` is a proper subset of `allChords` (meaning there is at least one chord the user has not yet learned).
*   **effects** Analyzes the relationships between all chords (e.g., frequency in common progressions, popularity in songs). Returns a single `Chord` as `recommendedChord` that is not present in the user's `knownChords`. This recommendation is optimized to be the most impactful next step for the user's learning.

requestSongUnlockRecommendation (knownChords: set of Chord, potentialChord: Chord, allSongs: set of Song): (unlockedSongs: set of Song)

*   **requires** The `potentialChord` is not in the set of `knownChords`. The set of `allSongs` (each with its required chords) is available.
*   **effects** Identifies all songs from `allSongs` that can be played using the combined set of `knownChords` and the `potentialChord`. From this set, it filters out any songs that could already be played with `knownChords` alone. Returns the resulting list of newly playable songs as `unlockedSongs`.

requestPersonalizedSongRecommendation (knownChords: set of Chord, genrePreferences: set of Genre, allSongs: set of Song): (recommendedSongs: set of Song)

*   **requires** The set of `knownChords` is not empty.
*   **effects** Filters the set of `allSongs` to find all songs that are playable with the user's current `knownChords`. Further filters and ranks this result based on the user's `genrePreferences`. Returns a ranked list of playable songs tailored to the user's tastes as `recommendedSongs`.

recommendNextChordsForTargetSong (knownChords: set of Chord, targetSong: Song): (recommendedPath: sequence of Chord)
*   **requires** The `targetSong` exists. The set of chords required by `targetSong` is not a subset of the user's `knownChords`.
*   **effects** Identifies the set of `missingChords` required to play the `targetSong` that are not present in the `knownChords` set. It then orders these `missingChords` into a sequence based on pedagogical principles (e.g., prioritizing foundational chords, chords with simpler fingerings, or chords that unlock the most other songs). Returns this ordered learning path as `recommendedPath`.

**notes**
- The user will be presented with the recommendations of each of the different types -- captured by the different functions -- and will be able to choose which of them to follow.
---
**concept** SongLibrary[User, Song] \
**purpose** manage a global catalog of songs and track each user's progress in learning them. \
**principle** a user with a known set of chords can query the library to find songs they can play. They can then add a song to their personal learning journal, track their progress from "in-progress" to "mastered," and their journal will reflect their musical journey.

**state**
> a set of Songs with
>> a chords set of Chord\
>> an optional Genre \
> a set of Users each with
>> a set of SongProgresses
>>> a Song\
>>> a MasteryLevel

**actions**
addSong (title: String, artist: String, chords: String[], genre: Genre or undefined): (song: Song)
*   **requires** No Song with the given `name` already exists. Callers always pass the `genre` argument; omit a value (or pass `undefined`) when the song should remain unclassified.
*   **effects** Creates a new Song; sets the `name`, `chords`, and stores `genre` when provided; otherwise the field remains `undefined`; returns the new song.

removeSong (song: Song)
*   **requires** The Song `song` exists.
*   **effects** Removes the `song` from the set of Songs. Also removes all `SongProgress` entries across all users that reference this `song`.

startLearningSong (user: User, song: Song, mastery: MasteryLevel)
*   **requires** The `user` and `song` exist. The user does not already have a `SongProgress` entry for this `song`.
*   **effects** Creates a new `SongProgress` entry for the given `user`, associating them with the specified `song` and initial `mastery` level.

updateSongMastery (user: User, song: Song, newMastery: MasteryLevel)
*   **requires** A `SongProgress` entry exists for the given `user` and `song`.
*   **effects** Updates the `mastery` of the existing `SongProgress` entry for the `user` and `song` to `newMastery`.

stopLearningSong (user: User, song: Song)
*   **requires** A `SongProgress` entry exists for the given `user` and `song`.
*   **effects** Deletes the `SongProgress` entry that associates the `user` with the `song`.

addUser (user: User)
*   **requires** The `user` does not already exist in the set of Users.
*   **effects** Adds the `user` to the set of Users with an empty set of `SongProgresses`.

removeUser (user: User)
*   **requires** The `user` exists.
*   **effects** Removes the `user` and all their associated `SongProgress` entries from the state.

_getPlayableSongs (knownChords: set of Chord, genres: optional set of Genre): (songs: set of Song)
*   **requires** `true`
*   **effects** Returns the set of all `Songs` whose `chords` are a 
subset of the provided `knownChords`. If `genres` are provided, the result is further filtered to only include songs whose genre is in the `genres` set.

_getSongsInProgress (user: User): (progresses: set of {song: Song, mastery: MasteryLevel})

*   **requires** The `user` exists.
*   **effects** Returns the set of all `SongProgress` entries for the given `user`, each containing a song and its mastery level.

_filterSongsByGenre (genre: Genre): (songs: set of Song)
*   **requires** `true`
*   **effects** Returns the set of all `Songs` that are associated with the specified `genre`.

**notes**
- The state depicts both a general song library and the song banks of each user.

---
**concept** Requesting \
**purpose** to encapsulate an API server, modeling incoming requests and outgoing responses as concept actions \
**principle** External HTTP requests trigger `request` actions, capturing input parameters. Synchronizations then process these requests and use `respond` actions to send back a corresponding response.

**state**
> a set of Requests with
>
> > a requestId String \
> > a path String \
> > a method String \ # e.g., "GET", "POST", "PUT", "DELETE"
> > an inputParameters Map<String, String> \ # Key-value pairs of query params, body data etc.
> > a receivedAt DateTime \
> > an optional responseBody String \ # The body of the outgoing response
> > an optional responseStatus Number \ # HTTP status code, e.g., 200, 404, 500
> > an optional respondedAt DateTime

**actions**

handleRequest (path: String, method: String, inputParameters: Map<String, String>): (requestId: String)
*   **requires** True (any valid incoming request can be handled).
*   **effects** Creates a new `Request` with a unique `requestId`; sets `path`, `method`, `inputParameters`, and `receivedAt`; returns the `requestId`.

sendResponse (requestId: String, responseStatus: Number, responseBody: optional String)
*   **requires** A `Request` with the given `requestId` exists and has not yet been responded to (i.e., `responseStatus` is null).
*   **effects** Sets the `responseStatus` and `responseBody` for the `Request` identified by `requestId`; sets `respondedAt` to now.

_awaitResponse (requestId: String): (responseStatus: Number, responseBody: optional String)
*   **requires** A `Request` with the given `requestId` exists and has already been responded to (i.e., `responseStatus` is not null).
*   **effects** Returns the `responseStatus` and `responseBody` associated with the `Request` identified by `requestId`, waiting if necessary until the response is available (up to an implicit timeout).
---
**concept** Sessioning [User] \
**purpose** to maintain a user's logged-in state across multiple requests without re-sending credentials \
**principle** A session token is created upon successful user login and uniquely associated with a user. This token can then be used to retrieve the associated user for subsequent authenticated requests until the session is explicitly deleted.

**state**
> a set of Sessions with
>
> > a sessionId String \
> > a user User

**actions**

startSession (user: User): (sessionId: String)
*   **requires** The `user` exists and is authenticated.
*   **effects** Creates a new `Session` with a unique `sessionId` and associates it with the given `user`; returns the `sessionId`.

endSession (sessionId: String)
*   **requires** The `sessionId` exists.
*   **effects** Removes the `Session` identified by `sessionId` from the state.

removeAllSessionsForUser (user: User)
*   **requires** The `user` exists.
*   **effects** Removes all `Session`s associated with the given `user` from the state; returns `success: true`.

_getUser (sessionId: String): (user: User)
*   **requires** The `sessionId` exists.
*   **effects** Returns the `user` associated with the `Session` identified by `sessionId`.
