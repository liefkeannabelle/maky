import { assertEquals, assertExists } from "jsr:@std/assert";
import { ChordLibrary } from "@concepts";
import { ID } from "@utils/types.ts";

const ts = Date.now();

Deno.test({
  name: "ChordLibrary._getOverlappingChords",
  sanitizeResources: false,
  sanitizeOps: false,
}, async (t) => {
  // Create test users with unique IDs
  const user1 = `overlap-test-user1-${ts}` as ID;
  const user2 = `overlap-test-user2-${ts}` as ID;
  const user3 = `overlap-test-user3-${ts}` as ID;

  await t.step("setup: create users and add chords", async () => {
    // Add users to ChordLibrary
    await ChordLibrary.addUser({ user: user1 });
    await ChordLibrary.addUser({ user: user2 });
    await ChordLibrary.addUser({ user: user3 });

    // User 1 knows: C, G, Am, F (mastered: C, G; proficient: Am, F)
    await ChordLibrary.addChordToInventory({
      user: user1,
      chord: "C",
      mastery: "mastered",
    });
    await ChordLibrary.addChordToInventory({
      user: user1,
      chord: "G",
      mastery: "mastered",
    });
    await ChordLibrary.addChordToInventory({
      user: user1,
      chord: "Am",
      mastery: "proficient",
    });
    await ChordLibrary.addChordToInventory({
      user: user1,
      chord: "F",
      mastery: "proficient",
    });

    // User 2 knows: C, G, D, Em (in progress: C; proficient: G, D, Em)
    await ChordLibrary.addChordToInventory({
      user: user2,
      chord: "C",
      mastery: "in progress",
    });
    await ChordLibrary.addChordToInventory({
      user: user2,
      chord: "G",
      mastery: "proficient",
    });
    await ChordLibrary.addChordToInventory({
      user: user2,
      chord: "D",
      mastery: "proficient",
    });
    await ChordLibrary.addChordToInventory({
      user: user2,
      chord: "Em",
      mastery: "proficient",
    });

    // User 3 knows: C, G, Am, D, E (mastered: C; in progress: G, Am, D, E)
    await ChordLibrary.addChordToInventory({
      user: user3,
      chord: "C",
      mastery: "mastered",
    });
    await ChordLibrary.addChordToInventory({
      user: user3,
      chord: "G",
      mastery: "in progress",
    });
    await ChordLibrary.addChordToInventory({
      user: user3,
      chord: "Am",
      mastery: "in progress",
    });
    await ChordLibrary.addChordToInventory({
      user: user3,
      chord: "D",
      mastery: "in progress",
    });
    await ChordLibrary.addChordToInventory({
      user: user3,
      chord: "E",
      mastery: "in progress",
    });
  });

  await t.step(
    "two users overlap: user1 and user2 share C and G",
    async () => {
      const result = await ChordLibrary._getOverlappingChords({
        userIds: [user1, user2],
      });

      assertExists(result.overlappingChords);
      assertEquals(result.overlappingChords.length, 2);

      // Should have C and G
      const chordNames = result.overlappingChords.map((c) => c.chord).sort();
      assertEquals(chordNames, ["C", "G"]);

      // Check minMastery for C: user1=mastered, user2=in progress → min is "in progress"
      const cChord = result.overlappingChords.find((c) => c.chord === "C");
      assertExists(cChord);
      assertEquals(cChord.minMastery, "in progress");

      // Check minMastery for G: user1=mastered, user2=proficient → min is "proficient"
      const gChord = result.overlappingChords.find((c) => c.chord === "G");
      assertExists(gChord);
      assertEquals(gChord.minMastery, "proficient");

      // G should come first since proficient > in progress
      assertEquals(result.overlappingChords[0].chord, "G");
    }
  );

  await t.step(
    "three users overlap: user1, user2, user3 share only C and G",
    async () => {
      const result = await ChordLibrary._getOverlappingChords({
        userIds: [user1, user2, user3],
      });

      assertEquals(result.overlappingChords.length, 2);

      const chordNames = result.overlappingChords.map((c) => c.chord).sort();
      assertEquals(chordNames, ["C", "G"]);

      // C: user1=mastered, user2=in progress, user3=mastered → min is "in progress"
      const cChord = result.overlappingChords.find((c) => c.chord === "C");
      assertEquals(cChord?.minMastery, "in progress");

      // G: user1=mastered, user2=proficient, user3=in progress → min is "in progress"
      const gChord = result.overlappingChords.find((c) => c.chord === "G");
      assertEquals(gChord?.minMastery, "in progress");

      // Both have same minMastery, so order might vary
      assertEquals(result.userChordCounts.length, 3);
    }
  );

  await t.step("user chord counts are correct", async () => {
    const result = await ChordLibrary._getOverlappingChords({
      userIds: [user1, user2, user3],
    });

    const user1Count = result.userChordCounts.find(
      (u) => u.userId === user1
    );
    const user2Count = result.userChordCounts.find(
      (u) => u.userId === user2
    );
    const user3Count = result.userChordCounts.find(
      (u) => u.userId === user3
    );

    assertEquals(user1Count?.chordCount, 4); // C, G, Am, F
    assertEquals(user2Count?.chordCount, 4); // C, G, D, Em
    assertEquals(user3Count?.chordCount, 5); // C, G, Am, D, E
  });

  await t.step("returns empty for less than 2 users", async () => {
    const result = await ChordLibrary._getOverlappingChords({
      userIds: [user1],
    });

    assertEquals(result.overlappingChords.length, 0);
    assertEquals(result.userChordCounts.length, 0);
  });

  await t.step("returns empty when no overlap exists", async () => {
    // Create a user with completely different chords
    const user4 = `overlap-test-user4-${ts}` as ID;
    await ChordLibrary.addUser({ user: user4 });
    await ChordLibrary.addChordToInventory({
      user: user4,
      chord: "Bm",
      mastery: "mastered",
    });
    await ChordLibrary.addChordToInventory({
      user: user4,
      chord: "F#m",
      mastery: "mastered",
    });

    const result = await ChordLibrary._getOverlappingChords({
      userIds: [user1, user4],
    });

    assertEquals(result.overlappingChords.length, 0);
    // But should still have chord counts
    assertEquals(result.userChordCounts.length, 2);
  });

  await t.step("userMasteries contains per-user breakdown", async () => {
    const result = await ChordLibrary._getOverlappingChords({
      userIds: [user1, user2],
    });

    const cChord = result.overlappingChords.find((c) => c.chord === "C");
    assertExists(cChord);
    assertEquals(cChord.userMasteries.length, 2);

    const user1Mastery = cChord.userMasteries.find((u) => u.userId === user1);
    const user2Mastery = cChord.userMasteries.find((u) => u.userId === user2);

    assertEquals(user1Mastery?.mastery, "mastered");
    assertEquals(user2Mastery?.mastery, "in progress");
  });

  await t.step("cleanup: remove test users", async () => {
    await ChordLibrary.removeUser({ user: user1 });
    await ChordLibrary.removeUser({ user: user2 });
    await ChordLibrary.removeUser({ user: user3 });
    await ChordLibrary.removeUser({ user: `overlap-test-user4-${ts}` as ID });
  });
});
