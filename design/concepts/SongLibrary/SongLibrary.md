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
addSong (title: String, artist: String, chords: String[], genre: optional Genre): (song: Song)
*   **requires** No Song with the given `name` already exists.
*   **effects** Creates a new Song; sets the `name`, `chords`, and optional `genre` of `s`; returns the new song.

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
