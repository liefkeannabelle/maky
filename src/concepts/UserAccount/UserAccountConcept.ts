import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// A simple helper function to hash passwords using the Web Crypto API.
// In a production system, a more robust, salted hashing algorithm like Argon2 or bcrypt would be preferred.
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Collection prefix for this concept
const PREFIX = "UserAccount" + ".";

// Generic types of this concept
type User = ID;

/**
 * a set of Users with
 *  a username String
 *  an email String
 *  a passwordHash String
 *  a isKidAccount Boolean
 */
interface UserDoc {
  _id: User;
  username: string;
  email: string;
  passwordHash: string;
  isKidAccount: boolean;
}

/**
 * @concept UserAccount
 * @purpose to allow users to establish and manage their identity within the app
 */
export default class UserAccountConcept {
  users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    // Ensure username and email are unique at the database level
    this.users.createIndex({ username: 1 }, { unique: true });
    this.users.createIndex({ email: 1 }, { unique: true });
  }

  /**
   * register (username: String, email: String, password: String, isKidAccount: Boolean): (user: User)
   *
   * **requires** No User exists with the given `username` or `email`.
   * **effects** Creates a new User; sets its `username`, `email`, `isKidAccount` status, and a hash of the `password`; returns the new user.
   */
  async register(
    { username, email, password, isKidAccount }: {
      username: string;
      email: string;
      password: string;
      isKidAccount: boolean;
    },
  ): Promise<{ user: User } | { error: string }> {
    try {
      const existingUser = await this.users.findOne({
        $or: [{ username }, { email }],
      });

      if (existingUser) {
        return { error: "Username or email already in use" };
      }

      const passwordHash = await hashPassword(password);
      const newUser: UserDoc = {
        _id: freshID(),
        username,
        email,
        passwordHash,
        isKidAccount,
      };

      await this.users.insertOne(newUser);
      return { user: newUser._id };
    } catch (e: unknown) {
      if (
        typeof e === "object" && e !== null && "code" in e &&
        (e as { code: number }).code === 11000
      ) {
        return { error: "Username or email already in use" };
      }
      throw e;
    }
  }

  /**
   * login (username: String, password: String): (user: User)
   *
   * **requires** A User exists with the given `username` (or email) and the provided `password` matches their `passwordHash`.
   * **effects** Returns the matching user.
   */
  async login(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Allow login with either username or email
    const user = await this.users.findOne({
      $or: [{ username: username }, { email: username }],
    });

    if (!user) {
      return { error: "Invalid credentials" };
    }

    const providedPasswordHash = await hashPassword(password);
    if (user.passwordHash !== providedPasswordHash) {
      return { error: "Invalid credentials" };
    }

    return { user: user._id };
  }

  /**
   * changePassword (user: User, oldPassword: String, newPassword: String): (success: Boolean) | (error: String)
   *
   * **requires** The `user` exists and the provided `oldPassword` matches their current `passwordHash`.
   * **effects** Updates the `passwordHash` for `user` with a hash of `newPassword`; returns `true` as `success`.
   *
   * **requires** The `user` does not exist or the `oldPassword` does not match their current `passwordHash`.
   * **effects** Returns an error message.
   */
  async changePassword(
    { user: userId, oldPassword, newPassword }: {
      user: User;
      oldPassword: string;
      newPassword: string;
    },
  ): Promise<{ success: true } | { error: string }> {
    const user = await this.users.findOne({ _id: userId });

    if (!user) {
      return { error: "User not found" };
    }

    const oldPasswordHash = await hashPassword(oldPassword);
    if (user.passwordHash !== oldPasswordHash) {
      return { error: "Incorrect old password" };
    }

    if (oldPassword === newPassword) {
      return { error: "New password must be different from the old password" };
    }

    const newPasswordHash = await hashPassword(newPassword);
    await this.users.updateOne(
      { _id: userId },
      { $set: { passwordHash: newPasswordHash } },
    );

    return { success: true };
  }

  /**
   * updateCredentials (user: User, newUsername: String, newEmail: String): (success: Boolean)
   *
   * **requires** The `user` exists. The `newUsername` and `newEmail` are not already in use by another User.
   * **effects** Updates the `username` to `newUsername` and `email` to `newEmail` for the given `user`; returns `true` as `success`.
   */
  async updateCredentials(
    { user: userId, newUsername, newEmail }: {
      user: User;
      newUsername: string;
      newEmail: string;
    },
  ): Promise<{ success: true } | { error: string }> {
    const user = await this.users.findOne({ _id: userId });
    if (!user) {
      return { error: "User not found" };
    }

    // Check if new username or email is taken by another user
    const conflictUser = await this.users.findOne({
      $and: [
        { _id: { $ne: userId } },
        { $or: [{ username: newUsername }, { email: newEmail }] },
      ],
    });

    if (conflictUser) {
      return { error: "Username or email already in use by another account" };
    }

    await this.users.updateOne(
      { _id: userId },
      { $set: { username: newUsername, email: newEmail } },
    );

    return { success: true };
  }

  /**
   * setKidAccountStatus (user: User, status: Boolean)
   *
   * **requires** The `user` exists.
   * **effects** Sets the `isKidAccount` status for the given `user` to the provided `status`.
   */
  async setKidAccountStatus(
    { user: userId, status }: { user: User; status: boolean },
  ): Promise<Empty | { error: string }> {
    const result = await this.users.updateOne(
      { _id: userId },
      { $set: { isKidAccount: status } },
    );

    if (result.matchedCount === 0) {
      return { error: "User not found" };
    }

    return {};
  }

  /**
   * deleteAccount (user: User, password: String): (success: Boolean)
   *
   * **requires** The `user` exists and the provided `password` matches their `passwordHash`.
   * **effects** Removes the `user` and all their associated data from the state; returns `true` as `success`.
   */
  async deleteAccount(
    { user: userId, password }: { user: User; password: string },
  ): Promise<{ success: true } | { error: string }> {
    const user = await this.users.findOne({ _id: userId });

    if (!user) {
      return { error: "User not found" };
    }

    const providedPasswordHash = await hashPassword(password);
    if (user.passwordHash !== providedPasswordHash) {
      return { error: "Incorrect password" };
    }

    await this.users.deleteOne({ _id: userId });

    return { success: true };
  }

  /**
   * _getUserByUsername (username: String): (user: User)
   *
   * **requires**: a User with the given `username` exists.
   * **effects**: returns the corresponding User.
   */
  async _getUserByUsername(
    { username }: { username: string },
  ): Promise<{ user: User }[]> {
    const user = await this.users.findOne({ username });
    if (user) {
      return [{ user: user._id }];
    }
    return [];
  }
}
