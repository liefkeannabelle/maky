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

_getOverlappingChords (userIds: User[]): (overlappingChords: {chord: Chord, minMastery: MasteryLevel, userMasteries: {userId: User, mastery: MasteryLevel}[]}[], userChordCounts: {userId: User, chordCount: number}[])

*   **requires** At least one user ID is provided. All users exist in ChordLibrary.
*   **effects** Returns the set of chords that ALL specified users have in common. For a single user, returns all their known chords. For multiple users, returns only chords that all users share. Returns the minimum mastery level across users for each chord (representing the "weakest link" for group playing). Also returns the chord count for each user. Results are sorted by mastery level (highest first).

**notes**
- We are still working through how best to divide the "mastery" of a chord while supporting the song recommendation feature.
- Like the song library, the state has both a library of all chords and the set known by each user with their mastery level.