import { actions, Sync } from "@engine";
import {
  ChordLibrary,
  Requesting,
  Sessioning,
  SongLibrary,
  UserAccount,
  UserProfile,
} from "@concepts";

// --- Registration (Public) ---

/**
 * Catches a request to register a new user and triggers the UserAccount.register action.
 * This is a public endpoint and does not require a session.
 */
export const HandleRegisterRequest: Sync = (
  { request, username, email, password, isKidAccount },
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
      },
      { request },
    ],
  ),
  then: actions(
    [UserAccount.register, { username, email, password, isKidAccount }],
  ),
});

/**
 * Responds to the original request after a user registration attempt.
 * This single synchronization handles both success (returns a `user`) and failure (returns an `error`).
 */
export const RespondToRegister: Sync = ({ request, user, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAccount/register" }, { request }],
    // Pattern matches on the output of the register action, binding `user` on success or `error` on failure.
    [UserAccount.register, {}, { user, error }],
  ),
  then: actions(
    [Requesting.respond, { request, user, error }],
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
    [ChordLibrary.addUser, { user }],
    [SongLibrary.addUser, { user }],
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
export const CreateSessionOnLogin: Sync = ({ user }) => ({
  when: actions(
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
export const RespondToLoginSuccess: Sync = ({ request, user, session }) => ({
  when: actions(
    // This `when` clause ensures all three actions occurred in the same flow.
    [Requesting.request, { path: "/UserAccount/login" }, { request }],
    [UserAccount.login, {}, { user }],
    [Sessioning.create, { user }, { session }],
  ),
  then: actions(
    [Requesting.respond, { request, user, sessionId: session }],
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
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions(
    [UserAccount.changePassword, { user, oldPassword, newPassword }],
  ),
});

/**
 * Responds to the original request after a change password attempt (success or failure).
 */
export const RespondToChangePassword: Sync = (
  { request, success, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAccount/changePassword" }, { request }],
    [UserAccount.changePassword, {}, { success, error }],
  ),
  then: actions(
    [Requesting.respond, { request, success, error }],
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
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions(
    [UserAccount.updateCredentials, { user, newUsername, newEmail }],
  ),
});

/**
 * Responds to the update credentials request after completion.
 */
export const RespondToUpdateCredentials: Sync = (
  { request, success, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/updateCredentials" },
      { request },
    ],
    [UserAccount.updateCredentials, {}, { success, error }],
  ),
  then: actions(
    [Requesting.respond, { request, success, error }],
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
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions(
    [UserAccount.setKidAccountStatus, { user, status }],
  ),
});

/**
 * Responds to the set 'isKidAccount' status request after completion.
 * This single synchronization handles both success and error responses.
 */
export const RespondToSetKidStatus: Sync = ({ request, success, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/setKidAccountStatus" },
      { request },
    ],
    // Assumes the action returns {success: true} on success and {error} on failure.
    [UserAccount.setKidAccountStatus, {}, { success, error }],
  ),
  then: actions([Requesting.respond, { request, success, error }]),
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
    frames.query(Sessioning._getUser, { session: sessionId }, { user }),
  then: actions(
    [UserAccount.deleteAccount, { user, password }],
  ),
});

/**
 * Responds to the delete account request after completion.
 */
export const RespondToDeleteAccount: Sync = ({ request, success, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAccount/deleteAccount" }, { request }],
    [UserAccount.deleteAccount, {}, { success, error }],
  ),
  then: actions(
    [Requesting.respond, { request, success, error }],
  ),
});
