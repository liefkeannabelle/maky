import { Collection, Db, type UpdateFilter } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix for this concept
const PREFIX = "UserProfile" + ".";

// Generic types of this concept
type User = ID;
type Profile = ID;
type Song = ID;

// Defines the possible skill levels for a user
type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

/**
 * a set of Profiles with
 *  a user User
 *  a displayName String
 *  an optional bio String
 *  an optional avatarUrl String
 *  a set of genrePreferences String
 *  a skillLevel of BEGINNER or INTERMEDIATE or ADVANCED
 *  an optional targetSong String
 */
interface ProfileDoc {
  _id: Profile;
  user: User;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  genrePreferences: string[];
  skillLevel: SkillLevel;
  targetSong?: Song;
}

/**
 * @concept UserProfile
 * @purpose to allow users to personalize their in-app identity and preferences
 */
export default class UserProfileConcept {
  profiles: Collection<ProfileDoc>;

  constructor(private readonly db: Db) {
    this.profiles = this.db.collection(PREFIX + "profiles");
    // Ensure that each user can only have one profile.
    this.profiles.createIndex({ user: 1 }, { unique: true });
  }

  /**
   * createProfile (user: User, displayName: String, genrePreferences: set of String, skillLevel: SkillLevel): (profile: Profile)
   *
   * **requires** The `user` exists and does not already have a `Profile`.
   * **effects** Creates a new `Profile` for the `user` with the given `displayName`, `genrePreferences`, and `skillLevel`; returns the new `profile`.
   */
  async createProfile(
    { user, displayName, genrePreferences, skillLevel }: {
      user: User;
      displayName: string;
      genrePreferences: string[];
      skillLevel: SkillLevel;
    },
  ): Promise<{ profile: Profile } | { error: string }> {
    try {
      const existingProfile = await this.profiles.findOne({ user });
      if (existingProfile) {
        return { error: "User already has a profile" };
      }

      const newProfile: ProfileDoc = {
        _id: freshID(),
        user,
        displayName,
        genrePreferences,
        skillLevel,
      };

      await this.profiles.insertOne(newProfile);
      return { profile: newProfile._id };
    } catch (e: unknown) {
      // Catch potential race condition where index prevents duplicate creation
      if (
        typeof e === "object" && e !== null && "code" in e &&
        (e as { code: number }).code === 11000
      ) {
        return { error: "User already has a profile" };
      }
      // Re-throw unexpected errors
      throw e;
    }
  }

  /**
   * updateDisplayName (user: User, newDisplayName: String)
   *
   * **requires** The `user` exists and has an associated `Profile`.
   * **effects** Updates the `displayName` in the `user`'s `Profile` to `newDisplayName`.
   */
  async updateDisplayName(
    { user, newDisplayName }: { user: User; newDisplayName: string },
  ): Promise<{ success: true } | { error: string }> {
    const result = await this.profiles.updateOne({ user }, {
      $set: { displayName: newDisplayName },
    });
    if (result.matchedCount === 0) {
      return { error: "Profile not found for this user" };
    }
    return { success: true };
  }

  /**
   * updateBio (user: User, newBio: optional String)
   *
   * **requires** The `user` exists and has an associated `Profile`.
   * **effects** Updates the `bio` in the `user`'s `Profile` to `newBio`.
   */
  async updateBio(
    { user, newBio }: { user: User; newBio?: string },
  ): Promise<{ success: true } | { error: string }> {
    const updateOp: UpdateFilter<ProfileDoc> = newBio === undefined
      ? { $unset: { bio: "" } }
      : { $set: { bio: newBio } };
    const result = await this.profiles.updateOne({ user }, updateOp);
    if (result.matchedCount === 0) {
      return { error: "Profile not found for this user" };
    }
    return { success: true };
  }

  /**
   * updateAvatar (user: User, newAvatarUrl: optional String)
   *
   * **requires** The `user` exists and has an associated `Profile`.
   * **effects** Updates the `avatarUrl` in the `user`'s `Profile` to `newAvatarUrl`.
   */
  async updateAvatar(
    { user, newAvatarUrl }: { user: User; newAvatarUrl?: string },
  ): Promise<{ success: true } | { error: string }> {
    const updateOp: UpdateFilter<ProfileDoc> = newAvatarUrl === undefined
      ? { $unset: { avatarUrl: "" } }
      : { $set: { avatarUrl: newAvatarUrl } };
    const result = await this.profiles.updateOne({ user }, updateOp);
    if (result.matchedCount === 0) {
      return { error: "Profile not found for this user" };
    }
    return { success: true };
  }
  /**
   * setGenrePreferences (user: User, newGenrePreferences: set of String)
   *
   * **requires** The `user` exists and has an associated `Profile`.
   * **effects** Replaces the `genrePreferences` in the `user`'s `Profile` with `newGenrePreferences`.
   */
  async setGenrePreferences(
    { user, newGenrePreferences }: {
      user: User;
      newGenrePreferences: string[];
    },
  ): Promise<{ success: true } | { error: string }> {
    const result = await this.profiles.updateOne({ user }, {
      $set: { genrePreferences: newGenrePreferences },
    });
    if (result.matchedCount === 0) {
      return { error: "Profile not found for this user" };
    }
    return { success: true };
  }

  /**
   * changeSkillLevel (user: User, newSkillLevel: SkillLevel)
   *
   * **requires** The `user` exists and has an associated `Profile`.
   * **effects** Updates the `skillLevel` in the `user`'s `Profile` to `newSkillLevel`.
   */
  async changeSkillLevel(
    { user, newSkillLevel }: { user: User; newSkillLevel: SkillLevel },
  ): Promise<{ success: true } | { error: string }> {
    const result = await this.profiles.updateOne({ user }, {
      $set: { skillLevel: newSkillLevel },
    });
    if (result.matchedCount === 0) {
      return { error: "Profile not found for this user" };
    }
    return { success: true };
  }

  /**
   * setTargetSong (user: User, song: Song)
   *
   * **requires** The `user` exists and has an associated `Profile`. The `song` exists.
   * **effects** Updates the `targetSong` in the `user`'s `Profile` to the provided `song`.
   */
  async setTargetSong(
    { user, song }: { user: User; song: Song },
  ): Promise<{ success: true } | { error: string }> {
    const result = await this.profiles.updateOne({ user }, {
      $set: { targetSong: song },
    });
    if (result.matchedCount === 0) {
      return { error: "Profile not found for this user" };
    }
    return { success: true };
  }

  /**
   * removeTargetSong (user: User)
   *
   * **requires** The `user` exists and has an associated `Profile`.
   * **effects** Removes the `targetSong` from the `user`'s `Profile`.
   */
  async removeTargetSong(
    { user }: { user: User },
  ): Promise<{ success: true } | { error: string }> {
    const result = await this.profiles.updateOne({ user }, {
      $unset: { targetSong: "" },
    });
    if (result.matchedCount === 0) {
      return { error: "Profile not found for this user" };
    }
    return { success: true };
  }

  /**
   * deleteProfile (user: User)
   *
   * **requires** The user exists and has an associated `Profile`.
   * **effects** Removes the `Profile` associated with the user from the state.
   */
  async deleteProfile(
    { user }: { user: User },
  ): Promise<{ success: true } | { error: string }> {
    const result = await this.profiles.deleteOne({ user });
    if (result.deletedCount === 0) {
      return { error: "Profile not found for this user" };
    }
    return { success: true };
  }
  /**
   * _searchByDisplayName (query: String): (profiles: {user: User, displayName: String}[])
   *
   * **requires** true
   * **effects** Returns a set of users and their display names that partially match the query string.
   */
  async _searchByDisplayName(
    { query }: { query: string },
  ): Promise<Array<{ user: User; displayName: string }>> {
    if (!query || query.trim() === "") {
      return [];
    }

    // Using a case-insensitive regex for partial matching.
    // In production, for better performance on large datasets, consider a text index.
    const results = await this.profiles.find({
      displayName: { $regex: query, $options: "i" },
    }).limit(20) // Add a limit to prevent huge result sets
      .toArray();

    return results.map((p) => ({ user: p.user, displayName: p.displayName }));
  }
  /**
   * _getProfile (user: User): (profile: { displayName: String, bio: optional String, avatarUrl: optional String, genrePreferences: set of String, skillLevel: SkillLevel, targetSong: optional String })
   *
   * **requires** The `user` exists.
   * **effects** Returns the full profile details for the given user if a profile exists, otherwise returns an empty array.
   */
  async _getProfile(
    { user }: { user: User },
  ): Promise<
    Array<{
      profile: {
        displayName: string;
        bio?: string;
        avatarUrl?: string;
        genrePreferences: string[];
        skillLevel: SkillLevel;
        targetSong?: Song;
      };
    }>
  > {
    const profileDoc = await this.profiles.findOne({ user });
    if (!profileDoc) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, user: _, ...profileData } = profileDoc;

    return [{ profile: profileData }];
  }
}
