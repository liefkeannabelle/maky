import { actions, Frames, Sync } from "@engine";
import {
  ChordLibrary,
  Comment,
  Following,
  Friendship,
  Post,
  Reaction,
  Requesting,
  Sessioning,
  SongLibrary,
  UserAccount,
  UserProfile,
} from "@concepts";
// --- Registration (Public) ---

/**
 * Cat`ch`es a request to register a new user and triggers the UserAccount.register action.
 * This is a public endpoint and does not require a session.
 */
export const HandleRegisterRequest: Sync = (
  { request, username, email, password, isKidAccount, isPrivateAccount },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/UserAccount/register",
        username,
        email,
        password,
        isKidAccount,
        isPrivateAccount,
      },
      { request },
    ],
  ),
  then: actions(
    [UserAccount.register, {
      username,
      email,
      password,
      isKidAccount,
      isPrivateAccount,
    }],
  ),
});

/**
 * Responds to the original request after a user registration attempt.
 * This single synchronization handles both success (returns a `user`) and failure (returns an `error`).
 */
export const RespondToRegisterSuccess: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAccount/register" }, { request }],
    [UserAccount.register, {}, { user }],
  ),
  then: actions(
    [Requesting.respond, { request, user }],
  ),
});

export const RespondToRegisterError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAccount/register" }, { request }],
    [UserAccount.register, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * After a successful user registration, this sync initializes the user's data
 * in other related concepts like UserProfile, ChordLibrary, and SongLibrary.
 */
export const InitializeNewUser: Sync = ({ user, username }) => ({
  // This sync triggers only when a UserAccount.register action is successful (i.e., returns a `user`).
  when: actions([
    UserAccount.register,
    { username }, // Capture the username from the input.
    { user }, // Capture the new user ID from the output.
  ]),
  // It then fires off the necessary setup actions in other concepts.
  then: actions(
    [
      UserProfile.createProfile,
      {
        user,
        displayName: username, // Use the username as the default display name.
        genrePreferences: [], // Default to empty genre preferences.
        skillLevel: "BEGINNER", // Default to BEGINNER skill level.
      },
    ],
    [ChordLibrary.addUser, { user }, { success: true }],
    [SongLibrary.addUser, { user }, { success: true }],
  ),
});

// --- Login (Public) ---

/**
 * Catches a request to log in and triggers the UserAccount.login action.
 * This is a public endpoint.
 */
export const HandleLoginRequest: Sync = ({ request, username, password }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/login", username, password },
      { request },
    ],
  ),
  then: actions(
    [UserAccount.login, { username, password }],
  ),
});

/**
 * When a login is successful, this synchronization automatically creates a new session for that user.
 */
export const CreateSessionOnLogin: Sync = ({ request, user }) => ({
  when: actions(
    // Tie session creation to the specific login request so the created session
    // is correlated with that request's flow.
    [Requesting.request, { path: "/UserAccount/login" }, { request }],
    [UserAccount.login, {}, { user }], // Fires only on successful login.
  ),
  then: actions(
    [Sessioning.create, { user }],
  ),
});

/**
 * Responds to a successful login request after both the login and session creation have completed.
 * It returns both the user ID and the new session ID to the client.
 */
export const RespondToLoginSuccess: Sync = ({ request, user, sessionId }) => ({
  when: actions(
    // This `when` clause ensures all three actions occurred in the same flow.
    [Requesting.request, { path: "/UserAccount/login" }, { request }],
    [UserAccount.login, {}, { user }],
    // Sessioning.create now returns `{ sessionId: <id> }` so bind `sessionId` here.
    [Sessioning.create, { user }, { sessionId }],
  ),
  then: actions(
    // Respond with `sessionId` to match frontend expectation.
    [Requesting.respond, { request, user, sessionId }],
  ),
});

/**
 * Responds to a failed login attempt with an error message.
 */
export const RespondToLoginError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAccount/login" }, { request }],
    [UserAccount.login, {}, { error }], // Fires only on a failed login.
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Change Password (Authenticated) ---

/**
 * Handles a request to change a password. It authenticates the user via their session
 * before triggering the changePassword action.
 */
export const HandleChangePasswordRequest: Sync = (
  { request, sessionId, oldPassword, newPassword, user },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/UserAccount/changePassword",
        sessionId,
        oldPassword,
        newPassword,
      },
      { request },
    ],
  ),
  // The 'where' clause is crucial for authentication. It queries the Sessioning concept
  // to get the user associated with the provided sessionId. If no user is found, the sync stops.
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId: sessionId }, { user }),
  then: actions(
    [UserAccount.changePassword, { user, oldPassword, newPassword }],
  ),
});

/**
 * Responds to a successful password change attempt.
 */
export const RespondToChangePasswordSuccess: Sync = (
  { request, success },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAccount/changePassword" }, { request }],
    [UserAccount.changePassword, {}, { success }],
  ),
  then: actions(
    [Requesting.respond, { request, success }],
  ),
});

/**
 * Responds to a failed password change attempt.
 */
export const RespondToChangePasswordError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAccount/changePassword" }, { request }],
    [UserAccount.changePassword, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Update Credentials (Authenticated) ---

/**
 * Handles a request to update a user's username and email, authenticating via session.
 */
export const HandleUpdateCredentialsRequest: Sync = (
  { request, sessionId, newUsername, newEmail, user },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/UserAccount/updateCredentials",
        sessionId,
        newUsername,
        newEmail,
      },
      { request },
    ],
  ),
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId: sessionId }, { user }),
  then: actions(
    [UserAccount.updateCredentials, { user, newUsername, newEmail }],
  ),
});

/**
 * Responds to a successful update credentials attempt.
 */
export const RespondToUpdateCredentialsSuccess: Sync = (
  { request, success },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/updateCredentials" },
      { request },
    ],
    [UserAccount.updateCredentials, {}, { success }],
  ),
  then: actions(
    [Requesting.respond, { request, success }],
  ),
});

/**
 * Responds to a failed update credentials attempt.
 */
export const RespondToUpdateCredentialsError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/updateCredentials" },
      { request },
    ],
    [UserAccount.updateCredentials, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- Set Kid Account Status (Authenticated) ---

/**
 * Handles a request to set the 'isKidAccount' status, authenticating via session.
 */
export const HandleSetKidStatusRequest: Sync = (
  { request, sessionId, status, user },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/setKidAccountStatus", sessionId, status },
      { request },
    ],
  ),
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId: sessionId }, { user }),
  then: actions(
    [UserAccount.setKidAccountStatus, { user, status }],
  ),
});

/**
 * Responds to a successful 'isKidAccount' status update.
 */
export const RespondToSetKidStatusSuccess: Sync = (
  { request, success },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/setKidAccountStatus" },
      { request },
    ],
    [UserAccount.setKidAccountStatus, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed 'isKidAccount' status update.
 */
export const RespondToSetKidStatusError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/setKidAccountStatus" },
      { request },
    ],
    [UserAccount.setKidAccountStatus, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Handles a request to set the 'isPrivateAccount' status, authenticating via session.
 */
export const HandleSetPrivateStatusRequest: Sync = (
  { request, sessionId, status, user },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/setPrivateAccountStatus", sessionId, status },
      { request },
    ],
  ),
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId: sessionId }, { user }),
  then: actions(
    [UserAccount.setIsPrivateAccountStatus, { user, status }],
  ),
});

/**
 * Responds to a successful 'isPrivateAccount' status update.
 */
export const RespondToSetPrivateStatusSuccess: Sync = (
  { request, success },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/setPrivateAccountStatus" },
      { request },
    ],
    [UserAccount.setIsPrivateAccountStatus, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

/**
 * Responds to a failed 'isPrivateAccount' status update.
 */
export const RespondToSetPrivateStatusError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/setPrivateAccountStatus" },
      { request },
    ],
    [UserAccount.setIsPrivateAccountStatus, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Responds when a private-status update is attempted with an invalid session.
 */
export const RespondToSetPrivateStatusInvalidSession: Sync = (
  { request, sessionId, _user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAccount/setPrivateAccountStatus", sessionId },
    { request },
  ]),
  where: async (frames: Frames) => {
    const originalFrame = frames[0];
    const sessionFrames = await frames.query(
      Sessioning._getUser,
      { sessionId },
      { user: _user },
    );
    if (sessionFrames.length === 0) {
      return new Frames({ ...originalFrame });
    }
    return sessionFrames.filter(() => false);
  },
  then: actions([
    Requesting.respond,
    { request, error: "Invalid session" },
  ]),
});

/**
 * Handles a request to determine whether a user is a kid account or a private account.
 * This is treated as a public query.
 */
export const HandleIsKidOrPrivateAccountRequest: Sync = (
  { request, user, isKidOrPrivate, results },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAccount/_isKidOrPrivateAccount", user },
    { request },
  ]),
  where: async (frames: Frames) => {
    const originalFrame = frames[0];

    frames = await frames.query(
      UserAccount._isKidOrPrivateAccount,
      { user },
      { isKidOrPrivate },
    );

    if (frames.length === 0) {
      const responseFrame = { ...originalFrame, [results]: [] };
      return new Frames(responseFrame);
    }

    return frames.collectAs([isKidOrPrivate], results);
  },
  then: actions([
    Requesting.respond,
    { request, results },
  ]),
});

// --- Delete Account (Authenticated) ---

/**
 * Handles a request to delete a user account, authenticating via session and verifying password.
 */
export const HandleDeleteAccountRequest: Sync = (
  { request, sessionId, password, user },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/deleteAccount", sessionId, password },
      { request },
    ],
  ),
  where: (frames) =>
    frames.query(Sessioning._getUser, { sessionId: sessionId }, { user }),
  then: actions(
    [UserAccount.deleteAccount, { user, password }],
  ),
});

/**
 * Responds to a successful account deletion attempt.
 */
export const RespondToDeleteAccountSuccess: Sync = (
  { request, success },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAccount/deleteAccount" }, { request }],
    [UserAccount.deleteAccount, {}, { success }],
  ),
  then: actions(
    [Requesting.respond, { request, success }],
  ),
});

/**
 * Responds to a failed account deletion attempt.
 */
export const RespondToDeleteAccountError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAccount/deleteAccount" }, { request }],
    [UserAccount.deleteAccount, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * When a user account is successfully deleted, this synchronization cascades the deletion
 * to all other concepts that hold user-specific data. This ensures data integrity
 * and cleanup across the application.
 */
export const OnDeleteAccount: Sync = ({ user }) => ({
  // This sync triggers only when a UserAccount.deleteAccount action is successful.
  // It captures the `user` ID from the input of the successful action.
  when: actions([UserAccount.deleteAccount, { user }, { success: true }]),
  // It then fires off deletion/cleanup actions in all related concepts.
  then: actions(
    [UserProfile.deleteProfile, { user }],
    [ChordLibrary.removeUser, { user }],
    [SongLibrary.removeUser, { user }],
    [Friendship.removeAllFriendshipsForUser, { user }],
    [Following.removeUserFollowing, { user }], // Removes user's outbound follows
    [Following.removeUserAsFollower, { user }], // Removes user's inbound follows
    [Post.removeAllPostsForUser, { user }], // Removes all posts by the user
    [Comment.removeAllCommentsForUser, { user }], // Removes all comments by the user
    [Reaction.removeAllReactionsForUser, { user }], // Removes all reactions by the user
    [Sessioning.removeAllSessionsForUser, { user }], // Removes all sessions for the user
    // [JamGroup.removeUserFromAllGroups, { user }], // Uncomment when JamGroup concept is implemented
  ),
});
