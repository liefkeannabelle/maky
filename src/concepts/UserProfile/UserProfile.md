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

updateDisplayName (user: User, newDisplayName: String)
*   **requires** The `user` exists and has an associated `Profile`.
*   **effects** Updates the `displayName` in the `user`'s `Profile` to `newDisplayName`.

updateBio (user: User, newBio: optional String)
*   **requires** The `user` exists and has an associated `Profile`.
*   **effects** Updates the `bio` in the `user`'s `Profile` to `newBio`.

updateAvatar (user: User, newAvatarUrl: optional String)
*   **requires** The `user` exists and has an associated `Profile`.
*   **effects** Updates the `avatarUrl` in the `user`'s `Profile` to `newAvatarUrl`.

setGenrePreferences (user: User, newGenrePreferences: set of String)
*   **requires** The `user` exists and has an associated `Profile`.
*   **effects** Replaces the `genrePreferences` in the `user`'s `Profile` with `newGenrePreferences`.

changeSkillLevel (user: User, newSkillLevel: SkillLevel)
*   **requires** The `user` exists and has an associated `Profile`.
*   **effects** Updates the `skillLevel` in the `user`'s `Profile` to `newSkillLevel`.

setTargetSong (user: User, song: Song)
* **requires** The `user` exists and has an associated `Profile`. The `song` exists.
* **effects** Updates the `targetSong` in the `user`'s `Profile` to the provided `song`.

removeTargetSong (user: User)
* **requires** The `user` exists and has an associated `Profile`.
* **effects** Removes the `targetSong` from the `user`'s `Profile` 

deleteProfile (user: User)
*   **requires** The user exists and has an associated `Profile`.
*   **effects** Removes the `Profile` associated with the user from the state. 

**queries**

_searchByDisplayName (query: String): (user: User, displayName: String)
* **requires** true
* **effects** Returns a set of users and their display names that partially match the query string.
```
_getProfile (user: User): (profile: { displayName: String, bio: optional String, avatarUrl: optional String, genrePreferences: set of String, skillLevel: SkillLevel, targetSong: optional String })

* **requires** The `user` exists.
* **effects** Returns the full profile details for the given user if a profile exists.


**notes**
- UserProfile stores more app-specific and user-specific data as compared to UserAccount.
- Genre preferences will be a set of genres, as described by strings, selected from a set bank.
