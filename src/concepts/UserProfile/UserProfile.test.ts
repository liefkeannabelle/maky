import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserProfileConcept from "./UserProfileConcept.ts";
import { ID } from "@utils/types.ts";

// Helper function to create a profile for testing and return its ID.
async function createProfile(
  concept: UserProfileConcept,
  details: {
    user: ID;
    displayName: string;
    genrePreferences: string[];
    skillLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  },
): Promise<ID> {
  const result = await concept.createProfile(details);
  if ("error" in result) {
    throw new Error(`Failed to create test profile: ${result.error}`);
  }
  return result.profile;
}

Deno.test(
  "UserProfileConcept - createProfile",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userProfile = new UserProfileConcept(db);
    await userProfile.profiles.deleteMany({});

    const userA = "user:A" as ID;
    const profileDetails = {
      user: userA,
      displayName: "Alice",
      genrePreferences: ["Rock", "Jazz"],
      skillLevel: "INTERMEDIATE" as const,
    };

    // Successful creation
    const result = await userProfile.createProfile(profileDetails);
    assert(!("error" in result), "Profile creation should succeed");
    assertExists(result.profile);

    const profileInDb = await userProfile.profiles.findOne({ user: userA });
    assertExists(profileInDb);
    assertEquals(profileInDb.displayName, "Alice");
    assertEquals(profileInDb.skillLevel, "INTERMEDIATE");
    assertEquals(profileInDb.genrePreferences, ["Rock", "Jazz"]);

    // Test duplicate creation
    const duplicateResult = await userProfile.createProfile(profileDetails);
    assert("error" in duplicateResult, "Should fail on duplicate profile");
    assertEquals(duplicateResult.error, "User already has a profile");

    await client.close();
  },
);

Deno.test(
  "UserProfileConcept - update actions",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userProfile = new UserProfileConcept(db);
    await userProfile.profiles.deleteMany({});

    const userB = "user:B" as ID;
    const songId = "song:1" as ID;
    await createProfile(userProfile, {
      user: userB,
      displayName: "Bob",
      genrePreferences: ["Pop"],
      skillLevel: "BEGINNER",
    });

    // updateDisplayName
    const nameUpdate = await userProfile.updateDisplayName({
      user: userB,
      newDisplayName: "Bobby",
    });
    assert("success" in nameUpdate, "updateDisplayName should succeed");
    assertEquals(nameUpdate.success, true);
    let profileInDb = await userProfile.profiles.findOne({ user: userB });
    assertEquals(profileInDb?.displayName, "Bobby");

    // updateLearningGoals
    const goalsUpdate = await userProfile.updateLearningGoals({
      user: userB,
      newLearningGoals: "Dialing in barre chords",
    });
    assert("success" in goalsUpdate, "updateLearningGoals should succeed");
    assertEquals(goalsUpdate.success, true);
    profileInDb = await userProfile.profiles.findOne({ user: userB });
    assertEquals(profileInDb?.learningGoals, "Dialing in barre chords");

    // updateAvatar
    const avatarUpdate = await userProfile.updateAvatar({
      user: userB,
      newAvatarUrl: "http://example.com/avatar.png",
    });
    assert("success" in avatarUpdate, "updateAvatar should succeed");
    assertEquals(avatarUpdate.success, true);
    profileInDb = await userProfile.profiles.findOne({ user: userB });
    assertEquals(profileInDb?.avatarUrl, "http://example.com/avatar.png");

    // setGenrePreferences
    const genreUpdate = await userProfile.setGenrePreferences({
      user: userB,
      newGenrePreferences: ["Classical", "Blues"],
    });
    assert("success" in genreUpdate, "setGenrePreferences should succeed");
    assertEquals(genreUpdate.success, true);
    profileInDb = await userProfile.profiles.findOne({ user: userB });
    assertEquals(profileInDb?.genrePreferences, ["Classical", "Blues"]);

    // changeSkillLevel
    const skillUpdate = await userProfile.changeSkillLevel({
      user: userB,
      newSkillLevel: "ADVANCED",
    });
    assert("success" in skillUpdate, "changeSkillLevel should succeed");
    assertEquals(skillUpdate.success, true);
    profileInDb = await userProfile.profiles.findOne({ user: userB });
    assertEquals(profileInDb?.skillLevel, "ADVANCED");

    // setTargetSong
    const setSongUpdate = await userProfile.setTargetSong({
      user: userB,
      song: songId,
    });
    assert("success" in setSongUpdate, "setTargetSong should succeed");
    assertEquals(setSongUpdate.success, true);
    profileInDb = await userProfile.profiles.findOne({ user: userB });
    assertEquals(profileInDb?.targetSong, songId);

    // Test updates on non-existent user
    const nonExistentUser = "user:nonexistent" as ID;
    const badUpdate = await userProfile.updateDisplayName({
      user: nonExistentUser,
      newDisplayName: "Ghost",
    });
    assert("error" in badUpdate, "Update should fail for non-existent user");
    assertEquals(badUpdate.error, "Profile not found for this user");

    await client.close();
  },
);

Deno.test(
  "UserProfileConcept - remove optional fields",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userProfile = new UserProfileConcept(db);
    await userProfile.profiles.deleteMany({});

    const userC = "user:C" as ID;
    const songId = "song:2" as ID;
    await createProfile(userProfile, {
      user: userC,
      displayName: "Carol",
      genrePreferences: [],
      skillLevel: "INTERMEDIATE",
    });

    // Set optional fields first
    const goalsSet = await userProfile.updateLearningGoals({
      user: userC,
      newLearningGoals: "Goals to be removed",
    });
    assert("success" in goalsSet, "Setting learning goals should succeed");
    assertEquals(goalsSet.success, true);
    let profileInDb = await userProfile.profiles.findOne({ user: userC });
    assertEquals(profileInDb?.learningGoals, "Goals to be removed");

    const avatarSet = await userProfile.updateAvatar({
      user: userC,
      newAvatarUrl: "url_to_remove",
    });
    assert("success" in avatarSet, "Setting avatar should succeed");
    assertEquals(avatarSet.success, true);
    profileInDb = await userProfile.profiles.findOne({ user: userC });
    assertEquals(profileInDb?.avatarUrl, "url_to_remove");

    const songSet = await userProfile.setTargetSong({
      user: userC,
      song: songId,
    });
    assert("success" in songSet, "Setting target song should succeed");
    assertEquals(songSet.success, true);
    profileInDb = await userProfile.profiles.findOne({ user: userC });
    assertEquals(profileInDb?.targetSong, songId);

    // Remove avatar via literal sentinel first
    const avatarRemoveSentinel = await userProfile.updateAvatar({
      user: userC,
      newAvatarUrl: "UNDEFINED",
    });
    assert(
      "success" in avatarRemoveSentinel,
      "Removing avatar with sentinel should succeed",
    );
    assertEquals(avatarRemoveSentinel.success, true);
    profileInDb = await userProfile.profiles.findOne({ user: userC });
    assertEquals(profileInDb?.avatarUrl, undefined);

    // Re-set avatar so we can test removing it via explicit undefined as well
    const avatarReset = await userProfile.updateAvatar({
      user: userC,
      newAvatarUrl: "url_to_remove_again",
    });
    assert("success" in avatarReset, "Re-setting avatar should succeed");
    assertEquals(avatarReset.success, true);
    profileInDb = await userProfile.profiles.findOne({ user: userC });
    assertEquals(profileInDb?.avatarUrl, "url_to_remove_again");

    // Remove learning goals
    const goalsRemove = await userProfile.updateLearningGoals({
      user: userC,
      newLearningGoals: undefined,
    });
    assert("success" in goalsRemove, "Removing learning goals should succeed");
    assertEquals(goalsRemove.success, true);
    profileInDb = await userProfile.profiles.findOne({ user: userC });
    assertEquals(profileInDb?.learningGoals, undefined);

    // Remove avatar
    const avatarRemove = await userProfile.updateAvatar({
      user: userC,
      newAvatarUrl: undefined,
    });
    assert("success" in avatarRemove, "Removing avatar should succeed");
    assertEquals(avatarRemove.success, true);
    profileInDb = await userProfile.profiles.findOne({ user: userC });
    assertEquals(profileInDb?.avatarUrl, undefined);

    // Remove target song
    const songRemove = await userProfile.removeTargetSong({ user: userC });
    assert("success" in songRemove, "Removing target song should succeed");
    assertEquals(songRemove.success, true);
    profileInDb = await userProfile.profiles.findOne({ user: userC });
    assertEquals(profileInDb?.targetSong, undefined);

    await client.close();
  },
);

Deno.test(
  "UserProfileConcept - deleteProfile",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userProfile = new UserProfileConcept(db);
    await userProfile.profiles.deleteMany({});

    const userD = "user:D" as ID;
    await createProfile(userProfile, {
      user: userD,
      displayName: "Dave",
      genrePreferences: ["Funk"],
      skillLevel: "ADVANCED",
    });

    // Successful deletion
    const deleteResult = await userProfile.deleteProfile({ user: userD });
    assert("success" in deleteResult, "Profile deletion should succeed");
    assertEquals(deleteResult.success, true);

    const profileInDb = await userProfile.profiles.findOne({ user: userD });
    assertEquals(profileInDb, null, "Profile should be deleted from database");

    // Test deleting a non-existent profile
    const nonExistentDelete = await userProfile.deleteProfile({ user: userD });
    assert(
      "error" in nonExistentDelete,
      "Should fail to delete non-existent profile",
    );
    assertEquals(
      nonExistentDelete.error,
      "Profile not found for this user",
    );

    await client.close();
  },
);
Deno.test(
  "UserProfileConcept - _searchByDisplayName",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const userProfile = new UserProfileConcept(db);
    await userProfile.profiles.deleteMany({});

    // Create test data
    await userProfile.createProfile({
      user: "user:1" as ID,
      displayName: "Alice Wonderland",
      genrePreferences: ["Pop"],
      skillLevel: "BEGINNER",
    });
    await userProfile.createProfile({
      user: "user:2" as ID,
      displayName: "Bob Builder",
      genrePreferences: ["Rock"],
      skillLevel: "INTERMEDIATE",
    });
    await userProfile.createProfile({
      user: "user:3" as ID,
      displayName: "Alicia Keys",
      genrePreferences: ["R&B"],
      skillLevel: "ADVANCED",
    });
    await userProfile.createProfile({
      user: "user:4" as ID,
      displayName: "Charlie Chaplin",
      genrePreferences: ["Classical"],
      skillLevel: "ADVANCED",
    });

    // Test 1: Partial, case-insensitive match returning multiple results
    const multiMatchResult = await userProfile._searchByDisplayName({
      query: "ali",
    });
    assertEquals(
      multiMatchResult.length,
      2,
      "Should find 'Alice' and 'Alicia'",
    );
    assert(
      multiMatchResult.some((p) => p.displayName === "Alice Wonderland"),
      "Should contain Alice Wonderland",
    );
    assert(
      multiMatchResult.some((p) => p.displayName === "Alicia Keys"),
      "Should contain Alicia Keys",
    );

    // Test 2: Exact match
    const exactMatchResult = await userProfile._searchByDisplayName({
      query: "Bob Builder",
    });
    assertEquals(exactMatchResult.length, 1, "Should find exact match");
    assertEquals(exactMatchResult[0].displayName, "Bob Builder");
    assertEquals(exactMatchResult[0].user, "user:2" as ID);

    // Test 3: No match
    const noMatchResult = await userProfile._searchByDisplayName({
      query: "Zelda",
    });
    assertEquals(noMatchResult.length, 0, "Should find no matches");

    // Test 4: Empty query
    const emptyQueryResult = await userProfile._searchByDisplayName({
      query: "",
    });
    assertEquals(
      emptyQueryResult.length,
      0,
      "Should return empty array for empty query",
    );

    // Test 5: Whitespace query
    const whitespaceQueryResult = await userProfile._searchByDisplayName({
      query: "   ",
    });
    assertEquals(
      whitespaceQueryResult.length,
      0,
      "Should return empty array for whitespace query",
    );

    // Test 6: Another partial match
    const partialMatchResult = await userProfile._searchByDisplayName({
      query: "Chap",
    });
    assertEquals(
      partialMatchResult.length,
      1,
      "Should find 'Charlie Chaplin' from 'Chap'",
    );
    assertEquals(partialMatchResult[0].displayName, "Charlie Chaplin");

    await client.close();
  },
);
