/**
 * Sync: InitializeNewUser
 * 
 * When a new user registers via UserAccount, this sync initializes their
 * presence in the UserProfile, ChordLibrary, and SongLibrary concepts.
 */
export function initializeNewUserSync(concepts: any) {
  // Listen for successful registration
  concepts.userAccount.on("register", async (result: any) => {
    const { user, username, isKidAccount } = result;
    
    console.log(`[Sync] InitializeNewUser: specific setup for user ${user}`);

    try {
      // 1. Create Profile
      await concepts.userProfile.createProfile({
        user,
        displayName: username,
        isKidAccount: !!isKidAccount
      });

      // 2. Add to Chord Library
      await concepts.chordLibrary.addUser({ user });

      // 3. Add to Song Library
      await concepts.songLibrary.addUser({ user });

      console.log(`[Sync] InitializeNewUser: Completed setup for ${username}`);
    } catch (err) {
      console.error(`[Sync] InitializeNewUser: Failed to initialize user ${user}`, err);
    }
  });
}