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