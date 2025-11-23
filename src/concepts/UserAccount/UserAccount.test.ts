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

Deno.test(
  "UserAccountConcept - _isUserById",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userAccount = new UserAccountConcept(db);
    await userAccount.users.deleteMany({});

    const userId = await createUser(userAccount, {
      username: "isUser",
      email: "isuser@example.com",
      password: "password123",
      isKidAccount: false,
    });

    // Test with existing user
    const existsResult = await userAccount._isUserById({ user: userId });
    assertEquals(existsResult.length, 1);
    assertEquals(existsResult[0], { result: true });

    // Test with non-existent user
    const notExistsResult = await userAccount._isUserById({
      user: "nonexistent-user-id" as ID,
    });
    assertEquals(notExistsResult.length, 1);
    assertEquals(notExistsResult[0], { result: false });

    await client.close();
  },
);
