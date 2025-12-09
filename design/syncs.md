# ChordConnect Syncs
**sync** InitializeNewUser \
**when** 
	UserAccount.register (username, email, password, isKidAccount): (user) \
**then** \
	UserProfile.createProfile (user, displayName: username, ...) \
	ChordLibrary.addUser (user) \
	SongLibrary.addUser (user)

---

**sync** getCommonSongs \
**when** JamGroup.startJamSession(group, creator) \
**where** group is list of users: user[] \
**then**
	for user in user[]: ChordLibrary._getKnownSongs(user: User)

---

**sync** 
	getCommonChords \
**when**
	JamGroup.startJamSession(group, creator) \
**where**
	group is list of users: user[] \
**then**
	for user in user[]: SongLibrary.getPlayableSongs() \
**notes**
- Designed for use with JamGroups
---

**sync** BlockKids \
**when**
Request.joinJamGroup(group, user) \
**where**
      in UserAccount: user newMember has isKidAccount false \
**then**
	JamGroup.addUsertoJamGroup

**notes**
- Enforcement of social limitation on kid accounts
---

**sync** CascadePostDeletion \
**when**
Post.deletePost (postId) \
**then** \ 
Comment.removeAllCommentsFromPost (postId) \
Reaction.removeAllReactionsFromPost (postId)

**note**
- Meant to find all comments and reactions related to the deleted post
---

**sync** CascadeAllPostsDeletionForUser \
**when**
Post.removeAllPostsForUser (user) returns (success: true, postIds: List<Post>) \
**where**
for postId in postIds: post = postId \
**then** \
for post in posts: Comment.removeAllCommentsFromPost (post) \
for post in posts: Reaction.removeAllReactionsFromPost (post)

**note**
- Cascades deletion of comments and reactions when all posts for a user are deleted (e.g., during account deletion)
- Uses the `postIds` array returned by `removeAllPostsForUser` (which contains post IDs before deletion) to iterate over each post and remove associated comments and reactions
---

**sync** TriggerChordRecommendation \
**when**
Requesting.getChordRecommendation (sessionId) \
**where** \
in Sessioning: user of session sessionId is u \
      in ChordLibrary: _getKnownChords(u) returns knownChords \
      in Chord: _getAllChords() returns allChords \
**then** \
      RecommendationEngine.calculateRecommendation(u, knownChords, allChords)

**notes**
- Step 1 of a two part process -> triggers the calculation action
---

**sync** SendChordRecommendationResponse \
**when** 
      RecommendationEngine.calculateRecommendation(...): (recommendationId) \
**where**
in RecommendationEngine: result of recommendationId is recommendedChord \
**then**
    Requesting.sendResponse(...)

**notes**
- Step 2 of a two part process -> posts result once calculation is done

---

**sync** AddFriendToJamGroup \
**when**
	Requesting.addGroupMember (sessionId, group, newMember) \
**where** \
	in Sessioning: user of session sessionId is requester \
	in Friendship: friendship between requester and newMember has status ACCEPTED \
	in UserAccount: user newMember has isKidAccount false \
**then** 
	JamGroup.addMember (group, newMember)

**notes**
- Could also be expanded to allow for a request to be sent if the recipient is friends with anyone already in the jam group
---

**sync** UpdateSongRecs \
**when** 
	User.AddChord(chord) \
**then**
	Library.GetPlayableSongs(User.getChords, UserProfile.getGenrePreferences) \

---

**sync**
	OnDeleteAccount \
**when**
	UserAccount.deleteAccount(user, password) returns true \
**then** \
UserProfile.deleteProfile(user) \
ChordLibrary.removeUser(user) \
SongLibrary.removeUser(user) \
Friendship.removeAllFriendshipsForUser(user) \
JamGroup.removeUserFromAllGroups(user)

**notes**
- Removes all data bound to the deleted user

---

**sync** AutoAddChordsForNewSong \
**when**
    SongLibrary.startLearningSong (user, song, mastery) \
**where**
    in SongLibrary: chords of song contains c \
    not (in ChordLibrary: user has knownChord with chord c) \
**then**
    ChordLibrary.addChordToInventory(user, c, mastery: 'in progress') \

**notes**
- For each chord 'c' required by the new song, checks if the user does NOT already have it in their library
- If the user doesn't know the chord, it is added to their inventory with a starting mastery level

---

**sync** TriggerChordRecommendation \
**when**
    Requesting.getChordRecommendation(sessionId) \
**where**
    in Sessioning: user of session sessionId is u \
    in ChordLibrary: _getKnownChords(u) returns knownChords \
    in SongLibrary: _getAllSongs() returns songs \
**then**
    RecommendationEngine.calculateRecommendation(u, knownChords, songs)

---

**sync** SendChordRecommendationResponse \
**when**
    RecommendationEngine.calculateRecommendation(u, knownChords, songs): (recommendationId) \
**where**
    in RecommendationEngine: _getRecommendation(recommendationId) returns rec \
    rec has fields (user, recommendedChord, unlockedSongs) \
**then**
    Requesting.sendResponse(..., {
        user: rec.user,
        recommendedChord: rec.recommendedChord,
        unlockedSongIds: rec.unlockedSongs
    })

---

**sync** HandleCreateJamGroup \
**when**
    Requesting.request (path: "/JamGroup/createJamGroup", sessionId, name, description) \
**where**
    in Sessioning: user of session sessionId is creator \
**then**
    JamGroup.createJamGroup (creator, name, description)

**notes**
- Authenticates the user before creating a jam group
- Creator is automatically added as the first member

---

**sync** HandleAddMemberToJamGroup \
**when**
    Requesting.request (path: "/JamGroup/addMember", sessionId, group, newMember) \
**where**
    in Sessioning: user of session sessionId is requester \
    in Friendship: friendship between requester and newMember has status ACCEPTED \
    in UserAccount: user newMember has isKidAccount false and isPrivateAccount false \
**then**
    JamGroup.addMember (group, newMember)

**notes**
- Enforces that new members must be friends with the requester
- Blocks kid accounts and private accounts from joining jam groups
- Ensures social safety and appropriate group composition

---

**sync** HandleStartJamSession \
**when**
    Requesting.request (path: "/JamSession/startJamSession", sessionId, group) \
**where**
    in Sessioning: user of session sessionId is creator \
**then**
    JamSession.startJamSession (group, creator)

**notes**
- Authenticates the user before starting a session
- Creator is automatically added as the first participant
- Group membership verification should be handled by sync if needed

---

**sync** AutoInviteMembersForScheduledSession \
**when**
    JamSession.scheduleJamSession (group) -> session \
**where**
    JamGroup._getJamGroupById (group) provides members \
**then**
    JamSession.bulkJoinUsers (session, members)

**notes**
- Automatically invites every member of the JamGroup right after a session is scheduled
- Uses `bulkJoinUsers` to avoid duplicates or missing participants

---

**sync** AutoInviteMembersForStartedSession \
**when**
    JamSession.startJamSession (group) -> session \
**where**
    JamGroup._getJamGroupById (group) provides members \
**then**
    JamSession.bulkJoinUsers (session, members)

**notes**
- Ensures instant sessions also include all JamGroup members without manual joins
- Complements the scheduled auto-invite so both creation paths behave consistently

---

**sync** HandleJoinSession \
**when**
    Requesting.request (path: "/JamSession/joinSession", sessionId, session) \
**where**
    in Sessioning: user of session sessionId is user \
**then**
    JamSession.joinSession (session, user)

**notes**
- Authenticates the user before joining a session
- Session must be ACTIVE for join to succeed (enforced by concept)

---

**sync** HandleShareSongInSession \
**when**
    Requesting.request (path: "/JamSession/shareSongInSession", sessionId, session, song, frequency) \
**where**
    in Sessioning: user of session sessionId is participant \
**then**
    JamSession.shareSongInSession (session, participant, song, frequency)

**notes**
- Authenticates the user before sharing a song
- Participant must be in the session (enforced by concept)
- Enables real-time coordination of how often each person is practicing

---

**sync** HandleUpdateSongLogFrequency \
**when**
    Requesting.request (path: "/JamSession/updateSongLogFrequency", sessionId, session, song, newFrequency) \
**where**
    in Sessioning: user of session sessionId is participant \
**then**
    JamSession.updateSongLogFrequency (session, participant, song, newFrequency)

**notes**
- Authenticates the user before updating their log entry
- Allows participants to update their practice frequency for a song

---

**sync** HandleEndJamSession \
**when**
    Requesting.request (path: "/JamSession/endJamSession", sessionId, session) \
**where**
    in Sessioning: user of session sessionId is user \
**then**
    JamSession.endJamSession (session)

**notes**
- Authenticates the user before ending a session
- Any participant can end the session
- Sets status to COMPLETED and records endTime

---

**sync** HandleGetJamGroupsForUser \
**when**
    Requesting.request (path: "/JamGroup/_getJamGroupsForUser", sessionId) \
**where**
    in Sessioning: user of session sessionId is user \
**then**
    JamGroup._getJamGroupsForUser (user)

**notes**
- Returns all groups where the authenticated user is a member
- Ordered by creation date (newest first)

---

**sync** HandleGetJamGroupById \
**when**
    Requesting.request (path: "/JamGroup/_getJamGroupById", sessionId, group) \
**where**
    in Sessioning: user of session sessionId is user \
**then**
    JamGroup._getJamGroupById (group)

**notes**
- Returns full details of a specific jam group
- Returns empty array if group not found

---

**sync** HandleGetCommonChordsForGroup \
**when**
    Requesting.request (path: "/JamGroup/_getCommonChordsForGroup", sessionId, group) \
**where**
    in Sessioning: user of session sessionId is user \
    in JamGroup: group has members m[] \
    for each member in m[]: in ChordLibrary: _getKnownChords(member) returns chords \
**then**
    compute intersection of all members' chords \
    respond with commonChords

**notes**
- CRITICAL for jam feature
- Computes the intersection of all members' known chords
- These are the chords the entire group can play together
- Used to determine playable songs for the group

---

**sync** HandleGetPlayableSongsForGroup \
**when**
    Requesting.request (path: "/JamGroup/_getPlayableSongsForGroup", sessionId, group) \
**where**
    in Sessioning: user of session sessionId is user \
    in JamGroup: group has members m[] \
    for each member in m[]: in ChordLibrary: _getKnownChords(member) returns chords \
    compute commonChords as intersection of all chords \
    in SongLibrary: _getPlayableSongs(commonChords) returns songs \
**then**
    respond with songs

**notes**
- CRITICAL for jam feature
- Returns songs that can be played by the entire group
- Based on the intersection of all members' known chords
- Essential for song recommendations during jam sessions

---

**sync** HandleGetJamSessionsForGroup \
**when**
    Requesting.request (path: "/JamSession/_getJamSessionsForGroup", sessionId, group) \
**where**
    in Sessioning: user of session sessionId is user \
**then**
    JamSession._getJamSessionsForGroup (group)

**notes**
- Returns all sessions (past and present) for a group
- Ordered by start time (newest first)
- Includes ACTIVE, COMPLETED, and SCHEDULED sessions

---

**sync** HandleGetJamSessionById \
**when**
    Requesting.request (path: "/JamSession/_getJamSessionById", sessionId, session) \
**where**
    in Sessioning: user of session sessionId is user \
**then**
    JamSession._getJamSessionById (session)

**notes**
- Returns full details of a specific session
- Includes all participants and shared songs
- Returns empty array if session not found

---

**sync** HandleGetActiveSessionForGroup \
**when**
    Requesting.request (path: "/JamSession/_getActiveSessionForGroup", sessionId, group) \
**where**
    in Sessioning: user of session sessionId is user \
**then**
    JamSession._getActiveSessionForGroup (group)

**notes**
- Returns the currently active session for a group
- Returns empty array if no active session
- Useful for checking if a group is currently jamming