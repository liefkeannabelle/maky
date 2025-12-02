import { actions, Frames, Sync } from "@engine";
import { Friendship, Requesting, Sessioning, UserProfile } from "@concepts";

const UNDEFINED_SENTINEL = "UNDEFINED";
const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value !== UNDEFINED_SENTINEL ? value : undefined;

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
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([
    UserProfile.createProfile,
    { user, displayName, genrePreferences, skillLevel },
  ]),
});

/**
 * Responds to a successful create profile request.
 */
export const RespondToCreateProfileSuccess: Sync = (
  { request, profile },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/createProfile" }, { request }],
    [UserProfile.createProfile, {}, { profile }],
  ),
  then: actions([Requesting.respond, { request, profile }]),
});

/**
 * Responds to a failed create profile request.
 */
export const RespondToCreateProfileError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/createProfile" }, { request }],
    [UserProfile.createProfile, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
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
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([UserProfile.updateDisplayName, { user, newDisplayName }]),
});

/**
 * Responds to the update display name request.
 */
export const RespondToUpdateDisplayNameSuccess: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserProfile/updateDisplayName" },
      { request },
    ],
    [UserProfile.updateDisplayName, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RespondToUpdateDisplayNameError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserProfile/updateDisplayName" },
      { request },
    ],
    [UserProfile.updateDisplayName, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Update Learning Goals (Authenticated) ---

/**
 * Handles a request to update a user's learning goals, authenticating via session.
 */
export const HandleUpdateLearningGoalsRequest: Sync = (
  { request, sessionId, newLearningGoals, user, normalizedLearningGoals },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/updateLearningGoals", sessionId, newLearningGoals },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { sessionId }, { user });

    const newFrames = [];
    for (const frame of frames) {
      const incomingLearningGoals = frame[newLearningGoals];
      const sanitizedLearningGoals = normalizeOptionalString(
        incomingLearningGoals,
      );
      newFrames.push({
        ...frame,
        [normalizedLearningGoals]: sanitizedLearningGoals,
      });
    }

    return new Frames(...newFrames);
  },
  then: actions([UserProfile.updateLearningGoals, {
    user,
    newLearningGoals: normalizedLearningGoals,
  }]),
});

/**
 * Responds to the update learning goals request.
 */
export const RespondToUpdateLearningGoalsSuccess: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserProfile/updateLearningGoals" },
      { request },
    ],
    [UserProfile.updateLearningGoals, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RespondToUpdateLearningGoalsError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserProfile/updateLearningGoals" },
      { request },
    ],
    [UserProfile.updateLearningGoals, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Update Avatar (Authenticated) ---

/**
 * Handles a request to update a user's avatar, authenticating via session.
 */
export const HandleUpdateAvatarRequest: Sync = (
  { request, sessionId, newAvatarUrl, user },
) => {
  // Treat the literal UNDEFINED sentinel the same as an omitted value.
  const normalizedAvatar = normalizeOptionalString(newAvatarUrl);
  return {
    when: actions([
      Requesting.request,
      { path: "/UserProfile/updateAvatar", sessionId, newAvatarUrl },
      { request },
    ]),
    where: (frames) =>
      frames.query(Sessioning._getUser, { sessionId }, { user }),
    then: actions([UserProfile.updateAvatar, {
      user,
      newAvatarUrl: normalizedAvatar,
    }]),
  };
};

/**
 * Responds to the update avatar request.
 */
export const RespondToUpdateAvatarSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateAvatar" }, { request }],
    [UserProfile.updateAvatar, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RespondToUpdateAvatarError: Sync = ({ request, error }) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([
    UserProfile.setGenrePreferences,
    { user, newGenrePreferences },
  ]),
});

/**
 * Responds to the set genre preferences request.
 */
export const RespondToSetGenrePreferencesSuccess: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserProfile/setGenrePreferences" },
      { request },
    ],
    [UserProfile.setGenrePreferences, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RespondToSetGenrePreferencesError: Sync = (
  { request, error },
) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([UserProfile.changeSkillLevel, { user, newSkillLevel }]),
});

/**
 * Responds to the change skill level request.
 */
export const RespondToChangeSkillLevelSuccess: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserProfile/changeSkillLevel" },
      { request },
    ],
    [UserProfile.changeSkillLevel, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RespondToChangeSkillLevelError: Sync = ({ request, error }) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([UserProfile.setTargetSong, { user, song }]),
});

/**
 * Responds to the set target song request.
 */
export const RespondToSetTargetSongSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/setTargetSong" }, { request }],
    [UserProfile.setTargetSong, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RespondToSetTargetSongError: Sync = ({ request, error }) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([UserProfile.removeTargetSong, { user }]),
});

/**
 * Responds to the remove target song request.
 */
export const RespondToRemoveTargetSongSuccess: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserProfile/removeTargetSong" },
      { request },
    ],
    [UserProfile.removeTargetSong, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RespondToRemoveTargetSongError: Sync = (
  { request, error },
) => ({
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
  where: (frames) => frames.query(Sessioning._getUser, { sessionId }, { user }),
  then: actions([UserProfile.deleteProfile, { user }]),
});

/**
 * Responds to the delete profile request.
 */
export const RespondToDeleteProfileSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/deleteProfile" }, { request }],
    [UserProfile.deleteProfile, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RespondToDeleteProfileError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/deleteProfile" }, { request }],
    [UserProfile.deleteProfile, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Handles a request to search for users by their display name.
 * This is treated as a public query, so no session authentication is performed.
 * It responds with an array of matching profiles.
 */
export const HandleSearchByDisplayNameRequest: Sync = (
  { request, query, user, displayName, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/_searchByDisplayName", query },
    { request },
  ]),
  where: async (frames) => {
    // Grab the original frame to preserve the `request` binding, in case the query returns no results.
    const originalFrame = frames[0];

    // The `_searchByDisplayName` method returns an array of objects `{ user, displayName }`.
    // The `frames.query` method will expand this, creating a new frame for each result.
    frames = await frames.query(
      UserProfile._searchByDisplayName,
      { query }, // Input to the query
      { user, displayName }, // Output pattern to bind from each result
    );

    // If the query returns no results, the `frames` array will be empty.
    // We must handle this explicitly to prevent a request timeout.
    if (frames.length === 0) {
      // Create a new Frames object containing the original `request` binding
      // and a `results` binding with an empty array.
      const responseFrame = { ...originalFrame, [results]: [] };
      return new Frames(responseFrame);
    }

    // If there are results, collect all the expanded frames back into a single frame.
    // The result will be one frame with a `results` property containing an array of `{ user, displayName }` objects.
    return frames.collectAs([user, displayName], results);
  },
  then: actions([
    Requesting.respond,
    { request, results }, // Respond with the collected results
  ]),
});
/**
 * Handles a request to get the full profile for a specific user.
 * Requires authentication and only allows the session user to access their own profile.
 */

/**
 * Handles a request to get the full profile for a specific user.
 * Requires authentication and allows access if the session user is either the
 * user whose profile is being requested, or is friends with that user.
 */
export const HandleGetProfileRequest: Sync = (
  {
    request,
    sessionId,
    user: targetUser,
    sessionUser,
    areFriendsResult,
    profile,
    results,
    error,
  },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserProfile/_getProfile",
      sessionId,
      user: targetUser,
    },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate: Get the user from the session
    const withSessionUser = await frames.query(Sessioning._getUser, {
      sessionId,
    }, {
      user: sessionUser,
    });

    if (withSessionUser.length === 0) {
      return new Frames({
        ...originalFrame,
        [error]: "Invalid session",
        [results]: [],
      });
    }

    // 2. Authorize: Check if the requester is viewing their own profile or a friend's profile
    const authorizedFrames = new Frames();
    for (const frame of withSessionUser) {
      const isSelf = frame[sessionUser] === frame[targetUser];
      if (isSelf) {
        authorizedFrames.push(frame);
        continue; // Authorized, move to next frame
      }

      // If not viewing self, check friendship status
      const singleFrame = new Frames(frame);
      const friendCheck = await singleFrame.query(
        Friendship.areFriends,
        { user1: sessionUser, user2: targetUser },
        { isFriend: areFriendsResult },
      );

      const isFriend = friendCheck.some((resultFrame) =>
        resultFrame[areFriendsResult] === true
      );

      if (isFriend) {
        authorizedFrames.push(frame); // Authorized as a friend
      }
    }

    if (authorizedFrames.length === 0) {
      return new Frames({
        ...originalFrame,
        [error]: "Unauthorized",
        [results]: [],
      });
    }

    // 3. Query Profile: If authorized, fetch the profile data for the target user
    const profileFrames = await authorizedFrames.query(
      UserProfile._getProfile,
      { user: targetUser },
      { profile },
    );

    // 4. Format Response: Handle case where profile may not exist (which is a valid success)
    if (profileFrames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [], [error]: null });
    }

    const payload = profileFrames.map((frame) => ({ profile: frame[profile] }));
    return new Frames({ ...originalFrame, [results]: payload, [error]: null });
  },
  then: actions([
    Requesting.respond,
    { request, results, error },
  ]),
});
