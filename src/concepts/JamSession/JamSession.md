**concept** JamSession [User, Group, Item] \
**purpose** to facilitate real-time or asynchronous collaborative music sessions within a jam group \
**principle** A jam session can be scheduled for the future or started immediately within a group. During an active session, participants can join and share the specific songs they are practicing, updating their status (e.g., "soloing", "practicing verse") to coordinate with others. The session is explicitly ended to mark its completion.

**state**

> a set of JamSessions with
>
> > a sessionId String
> > a jamGroup Group
> > a startTime DateTime
> > an optional endTime DateTime
> > a participants set of User
> > a sharedSongs set of SharedSongs
> > a status of ACTIVE or COMPLETED or SCHEDULED
>
> a set of SharedSongs with
>
> > a song Item
> > a participant User
> > a currentStatus String

**actions**

scheduleJamSession (group: Group, startTime: DateTime): (session: JamSession)

*   **requires** The `group` exists. The `startTime` is in the future.
*   **effects** Creates a new `JamSession` with a unique `sessionId`; sets `jamGroup`, `startTime`, and `status` to `SCHEDULED`; initializes empty sets for `participants` and `sharedSongs`; returns the new `session`.

startJamSession (group: Group, creator: User): (session: JamSession)

*   **requires** The `group` exists and the `creator` is permitted to start a session for the `group`.
*   **effects** Creates a new `JamSession` with a unique `sessionId`; sets `jamGroup`, `status` to `ACTIVE`, and `startTime` to the current time; adds `creator` to `participants`; returns the new `session`.

joinSession (session: JamSession, user: User)

*   **requires** The `session` exists and is `ACTIVE`. The `user` is permitted to join sessions for the associated `Group` and is not already in `participants`.
*   **effects** Adds the `user` to the `participants` set of the `session`.

shareSongInSession (session: JamSession, participant: User, song: Item, currentStatus: String)

*   **requires** The `session` exists and is `ACTIVE`. The `participant` is in the `participants` set. The `song` is not already shared by this `participant` in this `session`.
*   **effects** Creates a new `SharedSong` with `song`, `participant`, and `currentStatus` and adds it to the `sharedSongs` set of the `session`.

updateSharedSongStatus (session: JamSession, participant: User, song: Item, newStatus: String)

*   **requires** The `session` exists and is `ACTIVE`. A `SharedSong` exists in the `session` for this `participant` and `song`.
*   **effects** Updates the `currentStatus` of the matching `SharedSong` to `newStatus`.

endJamSession (session: JamSession)

*   **requires** The `session` exists and is `ACTIVE`.
*   **effects** Updates the `status` to `COMPLETED` and sets `endTime` to the current time.

**notes**
- A JamSession is meant to *support* in-person jam session of a jam group.