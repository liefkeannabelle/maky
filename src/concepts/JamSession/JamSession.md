**concept** JamSession [User, Group, Item] \
**purpose** to facilitate real-time or asynchronous collaborative music sessions within a jam group \
**principle** A jam session can be scheduled for the future or started immediately within a group. During an active session, participants can join and log the specific songs they are practicing, updating how frequently they have practiced them to coordinate with others. The session is explicitly ended to mark its completion.

**state**

> a set of JamSessions with
>
> > a sessionId String
> > a jamGroup Group
> > a startTime DateTime
> > an optional endTime DateTime
> > a participants set of User
> > a songsLog set of SongsLog entries
> > a status of ACTIVE or COMPLETED or SCHEDULED
>
> a set of SongsLog entries with
>
> > a song Item
> > a participant User
> > a frequency Number

**actions**

scheduleJamSession (group: Group, startTime: DateTime): (session: JamSession)

*   **requires** The `group` exists. The `startTime` is in the future.
*   **effects** Creates a new `JamSession` with a unique `sessionId`; sets `jamGroup`, `startTime`, and `status` to `SCHEDULED`; initializes empty sets for `participants` and `songsLog`; returns the new `session`.

startJamSession (group: Group, creator: User): (session: JamSession)

*   **requires** The `group` exists and the `creator` is permitted to start a session for the `group`.
*   **effects** Creates a new `JamSession` with a unique `sessionId`; sets `jamGroup`, `status` to `ACTIVE`, and `startTime` to the current time; adds `creator` to `participants`; returns the new `session`.

joinSession (session: JamSession, user: User)

*   **requires** The `session` exists and is `ACTIVE`. The `user` is permitted to join sessions for the associated `Group` and is not already in `participants`.
*   **effects** Adds the `user` to the `participants` set of the `session`.

bulkJoinUsers (session: JamSession, users: sequence of User)

*   **requires** The `session` exists and is not `COMPLETED`.
*   **effects** Adds all provided `users` to the `participants` set, ignoring duplicates and existing members.

shareSongInSession (session: JamSession, participant: User, song: Item, frequency: Number)

*   **requires** The `session` exists and is `ACTIVE`. The `participant` is in the `participants` set. The `song` is not already logged by this `participant` in this `session`.
*   **effects** Creates a new SongsLog entry with `song`, `participant`, and `frequency` and adds it to the `songsLog` set of the `session`.

updateSongLogFrequency (session: JamSession, participant: User, song: Item, newFrequency: Number)

*   **requires** The `session` exists and is `ACTIVE`. A SongsLog entry exists in the `session` for this `participant` and `song`.
*   **effects** Updates the `frequency` of the matching SongsLog entry to `newFrequency`.

endJamSession (session: JamSession)

*   **requires** The `session` exists and is `ACTIVE`.
*   **effects** Updates the `status` to `COMPLETED` and sets `endTime` to the current time.

**notes**
- A JamSession is meant to *support* in-person jam session of a jam group.
- Synchronizations automatically call `bulkJoinUsers` after a session is created to invite every member of the associated JamGroup.