[@sync-background](../../design/tools/sync-background.md)

[@api-specification](../../design/api-specification.md)

[@UserProfile](../concepts/UserProfile/UserProfile.md)

[@UserProfileConcept.ts](../concepts/UserProfile/UserProfileConcept.ts)


[@useracc.sync.ts](useracc.sync.ts)

[@sample.sync.ts](sample.sync.ts)


[@SessioningConcept.ts](../concepts/Sessioning/SessioningConcept.ts)

[@RequestingConcept.ts](../concepts/Requesting/RequestingConcept.ts)


# Look at what api spec we have on user profile. based on successful examples of a auth and sample syncs, provide syncs for the actions and getters of the user account sync. they will need to use sessioning to authenticate. follow the sync background for guidelines and structure on how this should go. you need to have both a success response and an error sresponse, the same way it is shown in example.ts. first tell me the syncs you are doing and then output a correct, compilable code. Very good examples are sample.sync.ts, userac.sync.ts
# response:

Of course. Based on the provided `UserProfileConcept` specification and the existing synchronization patterns in `useracc.sync.ts`, I will create a new synchronization file to handle all the API endpoints for the UserProfile concept.

All these actions require an authenticated user. The standard pattern is to:
1.  Create a "Request" synchronization that listens for a specific `Requesting.request` path (e.g., `/UserProfile/createProfile`).
2.  This synchronization will extract the `sessionId` from the request body.
3.  It will use a `where` clause to query `Sessioning._getUser` with the `sessionId` to get the actual `user` ID. If the session is invalid, the sync will not proceed.
4.  If the session is valid, the `then` clause will trigger the corresponding `UserProfile` action, passing the authenticated `user` ID along with other parameters from the request.
5.  Create a "Response" synchronization that listens for the completion of the `UserProfile` action.
6.  This synchronization will match on both success and error outputs from the concept action and use `Requesting.respond` to send the result back to the original client.

Here is the list of synchronizations I will implement:

*   **Create Profile:** `HandleCreateProfileRequest` and `RespondToCreateProfile`
*   **Update Display Name:** `HandleUpdateDisplayNameRequest` and `RespondToUpdateDisplayName`
*   **Update Bio:** `HandleUpdateBioRequest` and `RespondToUpdateBio`
*   **Update Avatar:** `HandleUpdateAvatarRequest` and `RespondToUpdateAvatar`
*   **Set Genre Preferences:** `HandleSetGenrePreferencesRequest` and `RespondToSetGenrePreferences`
*   **Change Skill Level:** `HandleChangeSkillLevelRequest` and `RespondToChangeSkillLevel`
*   **Set Target Song:** `HandleSetTargetSongRequest` and `RespondToSetTargetSong`
*   **Remove Target Song:** `HandleRemoveTargetSongRequest` and `RespondToRemoveTargetSong`
*   **Delete Profile:** `HandleDeleteProfileRequest` and `RespondToDeleteProfile`

Here is the complete, compilable code for the new synchronization file.

# file: src/syncs/userprofile.sync.ts

```typescript

```