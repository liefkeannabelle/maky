import { actions, Sync } from "@engine";
import { UserAccount, UserProfile, ChordLibrary, SongLibrary } from "@concepts";

/**
 * Sync: InitializeNewUser
 * 
 * When a new user registers via UserAccount, this sync initializes their
 * presence in the UserProfile, ChordLibrary, and SongLibrary concepts.
 */
export const InitializeNewUser: Sync = ({ user, username, isKidAccount }) => ({
  when: actions(
    [UserAccount.register, { username, isKidAccount }, { user }]
  ),
  then: actions(
    [UserProfile.createProfile, { user, displayName: username, isKidAccount }],
    [ChordLibrary.addUser, { user }],
    [SongLibrary.addUser, { user }]
  )
});
