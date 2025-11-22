import { actions, Sync } from "@engine";
import { Requesting, Sessioning, UserProfile } from "@concepts";

// --- Create Profile (Authenticated) ---

/**
 * Handles a request to create a user profile, authenticating via session.
 */
export const HandleCreateProfileRequest: Sync = (
  { request, sessionId, displayName, genrePreferences, skillLevel, user },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserProfile/createProfile",
      sessionId,
      displayName,
      genrePreferences,
      skillLevel,
    },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions([
    UserProfile.createProfile,
    { user, displayName, genrePreferences, skillLevel },
  ]),
});

/**
 * Responds to the create profile request after completion.
 */
export const RespondToCreateProfile: Sync = ({ request, profile, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/createProfile" }, { request }],
    [UserProfile.createProfile, {}, { profile, error }],
  ),
  then: actions([Requesting.respond, { request, profile, error }]),
});

// --- Update Display Name (Authenticated) ---

/**
 * Handles a request to update a user's display name, authenticating via session.
 */
export const HandleUpdateDisplayNameRequest: Sync = (
  { request, sessionId, newDisplayName, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/updateDisplayName", sessionId, newDisplayName },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions([UserProfile.updateDisplayName, { user, newDisplayName }]),
});

/**
 * Responds to the update display name request.
 */
export const RespondToUpdateDisplayName: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserProfile/updateDisplayName" },
      { request },
    ],
    // updateDisplayName returns {} on success, so we only need to pattern match on error.
    // If no error, the success case will be an empty object.
    [UserProfile.updateDisplayName, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Update Bio (Authenticated) ---

/**
 * Handles a request to update a user's bio, authenticating via session.
 */
export const HandleUpdateBioRequest: Sync = (
  { request, sessionId, newBio, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/updateBio", sessionId, newBio },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions([UserProfile.updateBio, { user, newBio }]),
});

/**
 * Responds to the update bio request.
 */
export const RespondToUpdateBio: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateBio" }, { request }],
    [UserProfile.updateBio, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Update Avatar (Authenticated) ---

/**
 * Handles a request to update a user's avatar, authenticating via session.
 */
export const HandleUpdateAvatarRequest: Sync = (
  { request, sessionId, newAvatarUrl, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/updateAvatar", sessionId, newAvatarUrl },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions([UserProfile.updateAvatar, { user, newAvatarUrl }]),
});

/**
 * Responds to the update avatar request.
 */
export const RespondToUpdateAvatar: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateAvatar" }, { request }],
    [UserProfile.updateAvatar, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Set Genre Preferences (Authenticated) ---

/**
 * Handles a request to set a user's genre preferences, authenticating via session.
 */
export const HandleSetGenrePreferencesRequest: Sync = (
  { request, sessionId, newGenrePreferences, user },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserProfile/setGenrePreferences",
      sessionId,
      newGenrePreferences,
    },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions([
    UserProfile.setGenrePreferences,
    { user, newGenrePreferences },
  ]),
});

/**
 * Responds to the set genre preferences request.
 */
export const RespondToSetGenrePreferences: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserProfile/setGenrePreferences" },
      { request },
    ],
    [UserProfile.setGenrePreferences, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Change Skill Level (Authenticated) ---

/**
 * Handles a request to change a user's skill level, authenticating via session.
 */
export const HandleChangeSkillLevelRequest: Sync = (
  { request, sessionId, newSkillLevel, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/changeSkillLevel", sessionId, newSkillLevel },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions([UserProfile.changeSkillLevel, { user, newSkillLevel }]),
});

/**
 * Responds to the change skill level request.
 */
export const RespondToChangeSkillLevel: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserProfile/changeSkillLevel" },
      { request },
    ],
    [UserProfile.changeSkillLevel, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Set Target Song (Authenticated) ---

/**
 * Handles a request to set a user's target song, authenticating via session.
 */
export const HandleSetTargetSongRequest: Sync = (
  { request, sessionId, song, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/setTargetSong", sessionId, song },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions([UserProfile.setTargetSong, { user, song }]),
});

/**
 * Responds to the set target song request.
 */
export const RespondToSetTargetSong: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/setTargetSong" }, { request }],
    [UserProfile.setTargetSong, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Remove Target Song (Authenticated) ---

/**
 * Handles a request to remove a user's target song, authenticating via session.
 */
export const HandleRemoveTargetSongRequest: Sync = (
  { request, sessionId, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/removeTargetSong", sessionId },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions([UserProfile.removeTargetSong, { user }]),
});

/**
 * Responds to the remove target song request.
 */
export const RespondToRemoveTargetSong: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserProfile/removeTargetSong" },
      { request },
    ],
    [UserProfile.removeTargetSong, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Delete Profile (Authenticated) ---

/**
 * Handles a request to delete a user's profile, authenticating via session.
 */
export const HandleDeleteProfileRequest: Sync = (
  { request, sessionId, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/deleteProfile", sessionId },
    { request },
  ]),
  where: (frames) =>
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions([UserProfile.deleteProfile, { user }]),
});

/**
 * Responds to the delete profile request.
 */
export const RespondToDeleteProfile: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/deleteProfile" }, { request }],
    [UserProfile.deleteProfile, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
