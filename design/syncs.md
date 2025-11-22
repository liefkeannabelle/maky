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
Following.removeUserFollowing(user) \
Following.removeUserAsFollower(user) \
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