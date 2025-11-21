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
    assert(!("error" in nameUpdate), "updateDisplayName should succeed");
    let profileInDb = await userProfile.profiles.findOne({ user: userB });
    assertEquals(profileInDb?.displayName, "Bobby");

    // updateBio
    const bioUpdate = await userProfile.updateBio({
      user: userB,
      newBio: "Just a test bio",
    });
    assert(!("error" in bioUpdate), "updateBio should succeed");
    profileInDb = await userProfile.profiles.findOne({ user: userB });
    assertEquals(profileInDb?.bio, "Just a test bio");

    // updateAvatar
    const avatarUpdate = await userProfile.updateAvatar({
      user: userB,
      newAvatarUrl: "http://example.com/avatar.png",
    });
    assert(!("error" in avatarUpdate), "updateAvatar should succeed");
    profileInDb = await userProfile.profiles.findOne({ user: userB });
    assertEquals(profileInDb?.avatarUrl, "http://example.com/avatar.png");

    // setGenrePreferences
    const genreUpdate = await userProfile.setGenrePreferences({
      user: userB,
      newGenrePreferences: ["Classical", "Blues"],
    });
    assert(!("error" in genreUpdate), "setGenrePreferences should succeed");
    profileInDb = await userProfile.profiles.findOne({ user: userB });
    assertEquals(profileInDb?.genrePreferences, ["Classical", "Blues"]);

    // changeSkillLevel
    const skillUpdate = await userProfile.changeSkillLevel({
      user: userB,
      newSkillLevel: "ADVANCED",
    });
    assert(!("error" in skillUpdate), "changeSkillLevel should succeed");
    profileInDb = await userProfile.profiles.findOne({ user: userB });
    assertEquals(profileInDb?.skillLevel, "ADVANCED");

    // setTargetSong
    const setSongUpdate = await userProfile.setTargetSong({
      user: userB,
      song: songId,
    });
    assert(!("error" in setSongUpdate), "setTargetSong should succeed");
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
    await userProfile.updateBio({ user: userC, newBio: "Bio to be removed" });
    await userProfile.updateAvatar({
      user: userC,
      newAvatarUrl: "url_to_remove",
    });
    await userProfile.setTargetSong({ user: userC, song: songId });

    let profileInDb = await userProfile.profiles.findOne({ user: userC });
    assertExists(profileInDb?.bio);
    assertExists(profileInDb?.avatarUrl);
    assertExists(profileInDb?.targetSong);

    // Remove bio
    const bioRemove = await userProfile.updateBio({ user: userC });
    assert(!("error" in bioRemove), "Removing bio should succeed");
    profileInDb = await userProfile.profiles.findOne({ user: userC });
    assertEquals(profileInDb?.bio, undefined);

    // Remove avatar
    const avatarRemove = await userProfile.updateAvatar({ user: userC });
    assert(!("error" in avatarRemove), "Removing avatar should succeed");
    profileInDb = await userProfile.profiles.findOne({ user: userC });
    assertEquals(profileInDb?.avatarUrl, undefined);

    // Remove target song
    const songRemove = await userProfile.removeTargetSong({ user: userC });
    assert(!("error" in songRemove), "Removing target song should succeed");
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
    assert(!("error" in deleteResult), "Profile deletion should succeed");

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
