[@concept-background](../../../design/tools/concept-background.md)

[@UserAccount](UserAccount.md)

[@UserAccountConcept.ts](UserAccountConcept.ts)

[@UserAccount.test.ts](UserAccount.test.ts)

[@api-extraction-from-spec](../../../design/tools/api-extraction-from-spec.md)



# implement: can you implement a getter that returns an output of shape [{result: boolean}]. the name of the function is UserAccount.IsUserById where you give it an id and it verifies that there exists a user in the database with this id. be as minimal as possible. make a deno test for it, then make a concept spec and lastly, make an api spec.
# response:

# file: src\concepts\UserAccount\UserAccountConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// A simple helper function to hash passwords using the Web Crypto API.
// In a production system, a more robust, salted hashing algorithm like Argon2 or bcrypt would be preferred.
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-265", data);
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
   * setKidAccountStatus (user: User, status: Boolean): (success: Boolean)
   *
   * **requires** The `user` exists.
   * **effects** Sets the `isKidAccount` status for the given `user` to the provided `status`; returns `true` as `success`.
   */
  async setKidAccountStatus(
    { user: userId, status }: { user: User; status: boolean },
  ): Promise<{ success: true } | { error: string }> {
    const result = await this.users.updateOne(
      { _id: userId },
      { $set: { isKidAccount: status } },
    );

    if (result.matchedCount === 0) {
      return { error: "User not found" };
    }

    return { success: true };
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
```

# file: src\concepts\UserAccount\UserAccount.test.ts

```typescript
import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAccountConcept from "./UserAccountConcept.ts";
import { ID } from "@utils/types.ts";

// Helper function to create a user for testing and return their ID.
async function createUser(
  concept: UserAccountConcept,
  details: {
    username: string;
    email: string;
    password: string;
    isKidAccount: boolean;
  },
): Promise<ID> {
  const result = await concept.register(details);
  if ("error" in result) {
    throw new Error(`Failed to create test user: ${result.error}`);
  }
  return result.user;
}

Deno.test(
  "UserAccountConcept - register",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userAccount = new UserAccountConcept(db);
    await userAccount.users.deleteMany({});

    const result = await userAccount.register({
      username: "alice",
      email: "alice@example.com",
      password: "password123",
      isKidAccount: false,
    });

    assert(!("error" in result), "Registration should succeed");
    assertExists(result.user);

    const userInDb = await userAccount.users.findOne({ _id: result.user });
    assertExists(userInDb);
    assertEquals(userInDb.username, "alice");
    assertEquals(userInDb.email, "alice@example.com");

    await client.close();
  },
);

Deno.test(
  "UserAccountConcept - register duplicate username/email",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userAccount = new UserAccountConcept(db);
    await userAccount.users.deleteMany({});

    await createUser(userAccount, {
      username: "bob",
      email: "bob@example.com",
      password: "password123",
      isKidAccount: false,
    });

    // Test duplicate username
    const duplicateUsernameResult = await userAccount.register({
      username: "bob",
      email: "another@example.com",
      password: "password456",
      isKidAccount: false,
    });
    assert(
      "error" in duplicateUsernameResult,
      "Should fail on duplicate username",
    );
    assertEquals(
      duplicateUsernameResult.error,
      "Username or email already in use",
    );

    // Test duplicate email
    const duplicateEmailResult = await userAccount.register({
      username: "bobby",
      email: "bob@example.com",
      password: "password789",
      isKidAccount: false,
    });
    assert("error" in duplicateEmailResult, "Should fail on duplicate email");
    assertEquals(
      duplicateEmailResult.error,
      "Username or email already in use",
    );

    await client.close();
  },
);

Deno.test(
  "UserAccountConcept - login",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userAccount = new UserAccountConcept(db);
    await userAccount.users.deleteMany({});

    const userId = await createUser(userAccount, {
      username: "carol",
      email: "carol@example.com",
      password: "password123",
      isKidAccount: false,
    });

    // Successful login with username
    const loginUsernameResult = await userAccount.login({
      username: "carol",
      password: "password123",
    });
    assert(
      !("error" in loginUsernameResult),
      "Login with username should succeed",
    );
    assertEquals(loginUsernameResult.user, userId);

    // Successful login with email
    const loginEmailResult = await userAccount.login({
      username: "carol@example.com",
      password: "password123",
    });
    assert(!("error" in loginEmailResult), "Login with email should succeed");
    assertEquals(loginEmailResult.user, userId);

    // Failed login with wrong password
    const wrongPasswordResult = await userAccount.login({
      username: "carol",
      password: "wrongpassword",
    });
    assert("error" in wrongPasswordResult, "Should fail with wrong password");
    assertEquals(wrongPasswordResult.error, "Invalid credentials");

    // Failed login with non-existent user
    const nonExistentUserResult = await userAccount.login({
      username: "dave",
      password: "password123",
    });
    assert(
      "error" in nonExistentUserResult,
      "Should fail for non-existent user",
    );
    assertEquals(nonExistentUserResult.error, "Invalid credentials");

    await client.close();
  },
);

Deno.test(
  "UserAccountConcept - changePassword",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userAccount = new UserAccountConcept(db);
    await userAccount.users.deleteMany({});

    const userId = await createUser(userAccount, {
      username: "eve",
      email: "eve@example.com",
      password: "oldPassword",
      isKidAccount: false,
    });

    // Successful change
    const successResult = await userAccount.changePassword({
      user: userId,
      oldPassword: "oldPassword",
      newPassword: "newPassword",
    });
    assert("success" in successResult, "Password change should succeed");

    // Verify password changed by trying to log in with new password
    const loginResult = await userAccount.login({
      username: "eve",
      password: "newPassword",
    });
    assert("user" in loginResult, "Login with new password should succeed");

    // Fail with incorrect old password
    const failResult = await userAccount.changePassword({
      user: userId,
      oldPassword: "wrongOldPassword",
      newPassword: "anotherPassword",
    });
    assert("error" in failResult, "Should fail with incorrect old password");
    assertEquals(failResult.error, "Incorrect old password");

    // Fail with non-existent user
    const nonExistentUserResult = await userAccount.changePassword({
      user: "nonexistent" as ID,
      oldPassword: "a",
      newPassword: "b",
    });
    assert(
      "error" in nonExistentUserResult,
      "Should fail for non-existent user",
    );
    assertEquals(nonExistentUserResult.error, "User not found");

    await client.close();
  },
);

Deno.test(
  "UserAccountConcept - updateCredentials",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userAccount = new UserAccountConcept(db);
    await userAccount.users.deleteMany({});

    const userId1 = await createUser(userAccount, {
      username: "frank",
      email: "frank@example.com",
      password: "password123",
      isKidAccount: false,
    });
    await createUser(userAccount, {
      username: "grace",
      email: "grace@example.com",
      password: "password123",
      isKidAccount: false,
    });

    // Successful update
    const successResult = await userAccount.updateCredentials({
      user: userId1,
      newUsername: "frank_new",
      newEmail: "frank_new@example.com",
    });
    assert("success" in successResult, "Credentials update should succeed");

    const updatedUser = await userAccount.users.findOne({ _id: userId1 });
    assertEquals(updatedUser?.username, "frank_new");
    assertEquals(updatedUser?.email, "frank_new@example.com");

    // Fail with existing username
    const failUsernameResult = await userAccount.updateCredentials({
      user: userId1,
      newUsername: "grace",
      newEmail: "frank_another@example.com",
    });
    assert("error" in failUsernameResult, "Should fail with existing username");
    assertEquals(
      failUsernameResult.error,
      "Username or email already in use by another account",
    );

    // Fail with existing email
    const failEmailResult = await userAccount.updateCredentials({
      user: userId1,
      newUsername: "frank_again",
      newEmail: "grace@example.com",
    });
    assert("error" in failEmailResult, "Should fail with existing email");
    assertEquals(
      failEmailResult.error,
      "Username or email already in use by another account",
    );

    await client.close();
  },
);

Deno.test(
  "UserAccountConcept - setKidAccountStatus",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userAccount = new UserAccountConcept(db);
    await userAccount.users.deleteMany({});

    const userId = await createUser(userAccount, {
      username: "heidi",
      email: "heidi@example.com",
      password: "password123",
      isKidAccount: false,
    });

    // Set to true
    const setResult = await userAccount.setKidAccountStatus({
      user: userId,
      status: true,
    });
    assert(!("error" in setResult), "Setting kid status should succeed");

    let userDoc = await userAccount.users.findOne({ _id: userId });
    assertEquals(userDoc?.isKidAccount, true);

    // Set back to false
    const unSetResult = await userAccount.setKidAccountStatus({
      user: userId,
      status: false,
    });
    assert(!("error" in unSetResult), "Unsetting kid status should succeed");

    userDoc = await userAccount.users.findOne({ _id: userId });
    assertEquals(userDoc?.isKidAccount, false);

    // Fail for non-existent user
    const failResult = await userAccount.setKidAccountStatus({
      user: "nonexistent" as ID,
      status: true,
    });
    assert("error" in failResult, "Should fail for non-existent user");
    assertEquals(failResult.error, "User not found");

    await client.close();
  },
);

Deno.test(
  "UserAccountConcept - deleteAccount",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userAccount = new UserAccountConcept(db);
    await userAccount.users.deleteMany({});

    const userId = await createUser(userAccount, {
      username: "ivan",
      email: "ivan@example.com",
      password: "password123",
      isKidAccount: false,
    });

    // Fail with wrong password
    const failResult = await userAccount.deleteAccount({
      user: userId,
      password: "wrongpassword",
    });
    assert("error" in failResult, "Should fail with wrong password");
    assertEquals(failResult.error, "Incorrect password");

    // Succeed with correct password
    const successResult = await userAccount.deleteAccount({
      user: userId,
      password: "password123",
    });
    assert("success" in successResult, "Account deletion should succeed");

    const userDoc = await userAccount.users.findOne({ _id: userId });
    assertEquals(userDoc, null, "User should be deleted from database");

    await client.close();
  },
);

Deno.test(
  "UserAccountConcept - _getUserByUsername",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userAccount = new UserAccountConcept(db);
    await userAccount.users.deleteMany({});

    const userId = await createUser(userAccount, {
      username: "judy",
      email: "judy@example.com",
      password: "password123",
      isKidAccount: false,
    });

    // Find existing user
    const foundResult = await userAccount._getUserByUsername({
      username: "judy",
    });
    assertEquals(foundResult.length, 1, "Should find one user");
    assertEquals(foundResult[0].user, userId);

    // Don't find non-existent user
    const notFoundResult = await userAccount._getUserByUsername({
      username: "nonexistent",
    });
    assertEquals(notFoundResult.length, 0, "Should not find any user");

    await client.close();
  },
);

```

# Updated Concept Specification

**concept** UserAccount \
**purpose** to allow users to establish and manage their identity within the app \
**principle** A user registers with a unique username, email, and password. They can later log in using these credentials to access the app. \\

**state**

> a set of Users with
>
> > a username String\
> > an email String\
> > a passwordHash String\
> > a isKidAccount Boolean

**actions** \
register (username: String, email: String, password: String, isKidAccount: Boolean): (user: User)

* **requires** No User exists with the given `username` or `email`.
* **effects** Creates a new User; sets its `username`, `email`, `isKidAccount` status, and a hash of the `password`; returns the new user.

login (username: String, password: String): (user: User)

* **requires** A User exists with the given `username` and the provided `password` matches their `passwordHash`.
* **effects** Returns the matching user.

changePassword (user: User, oldPassword: String, newPassword: String): (success: Boolean)

* **requires** The `user` exists and the provided `oldPassword` matches their current `passwordHash`.
* **effects** Updates the `passwordHash` for `user` with a hash of `newPassword`; returns `true` as `success`.

changePassword (user: User, oldPassword: String, newPassword: String): (error: String)

* **requires** The `user` does not exist or the `oldPassword` does not match their current `passwordHash`.
* **effects** Returns an error message.

updateCredentials (user: User, newUsername: String, newEmail: String): (success: Boolean)

* **requires** The `user` exists. The `newUsername` and `newEmail` are not already in use by another User.
* **effects** Updates the `username` to `newUsername` and `email` to `newEmail` for the given `user`; returns `true` as `success`.


setKidAccountStatus (user: User, status: Boolean): (success: Boolean)

* **requires** The `user` exists.
* **effects** Sets the `isKidAccount` status for the given `user` to the provided `status`; returns `true` as `success`.

deleteAccount (user: User, password: String): (success: Boolean)

* **requires** The `user` exists and the provided `password` matches their `passwordHash`.
* **effects** Removes the `user` and all their associated data from the state; returns `true` as `success`.


**notes**

* The user account will store the core authentification details for a given user as they would appear on functionally any such app. The app-specific preferences are stored instead in UserProfile.
* The isKidAccount flag will serve to enforce limited social functionality for users marked as children.

# API Specification

