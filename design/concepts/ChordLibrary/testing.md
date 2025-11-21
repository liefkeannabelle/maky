[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: ChordLibrary
# response:

# trace: ChordLibrary Principle

The principle of the **ChordLibrary** is that a user maintains an inventory of chords, updating their mastery as they learn.

1.  **Setup**: Create a user `user:Bob`.
2.  **Learning New Chord**: Bob encounters the "C" chord. He adds it to his inventory with mastery `not started`.
    *   *Check*: `_getKnownChords` returns "C" with "not started".
3.  **Practicing**: Bob practices "C". He updates the mastery to `in progress`.
    *   *Check*: `_getChordMastery` for "C" is now `in progress`.
4.  **Proficiency**: Bob gets better. He updates "C" to `proficient`.
5.  **Mastery**: Bob finally masters the chord. He updates "C" to `mastered`.
    *   *Check*: The state reflects "mastered".
6.  **Cleanup**: Bob decides to reset. He removes the chord from his inventory.
    *   *Check*: The chord is gone from the list.

# file: src/concepts/ChordLibrary/ChordLibraryConcept.test.ts

```typescript
import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ChordLibraryConcept, { MasteryLevel } from "./ChordLibraryConcept.ts";

Deno.test("ChordLibrary Concept", async (t) => {
  const [db, client] = await testDb();
  const chordLib = new ChordLibraryConcept(db);

  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;

  // ==========================================
  // 1. Test: addUser
  // ==========================================
  await t.step("addUser: enforces uniqueness and creates user context", async () => {
    console.log("--> Action: addUser(Alice)");
    const result = await chordLib.addUser({ user: userAlice });
    assertEquals(result, {}, "Should return empty success object");

    console.log("--> Action: addUser(Alice) [Duplicate]");
    const errResult = await chordLib.addUser({ user: userAlice });
    assertNotEquals((errResult as any).error, undefined, "Should error on duplicate user");
    console.log(`    Error received: ${(errResult as any).error}`);
  });

  // ==========================================
  // 2. Test: addChordToInventory
  // ==========================================
  await t.step("addChordToInventory: validates user existence and duplicate chords", async () => {
    // Failure: User doesn't exist
    const nonUser = "user:Ghost" as ID;
    const failRes = await chordLib.addChordToInventory({
      user: nonUser,
      chord: "G",
      mastery: "not started",
    });
    assertNotEquals((failRes as any).error, undefined, "Should fail if user does not exist");

    // Success: Alice adds 'G'
    console.log("--> Action: addChordToInventory(Alice, 'G', 'not started')");
    const successRes = await chordLib.addChordToInventory({
      user: userAlice,
      chord: "G",
      mastery: "not started",
    });
    assertEquals(successRes, {}, "Should succeed");

    // Verify effect
    const chords = await chordLib._getKnownChords({ user: userAlice });
    assertEquals(chords.length, 1);
    assertEquals(chords[0].chord, "G");
    assertEquals(chords[0].mastery, "not started");

    // Failure: Duplicate chord
    console.log("--> Action: addChordToInventory(Alice, 'G') [Duplicate]");
    const dupRes = await chordLib.addChordToInventory({
      user: userAlice,
      chord: "G",
      mastery: "mastered",
    });
    assertNotEquals((dupRes as any).error, undefined, "Should fail on duplicate chord");
  });

  // ==========================================
  // 3. Test: Principle Scenario (The User Journey)
  // ==========================================
  await t.step("Principle: User adds chord, practices, and updates mastery", async () => {
    // 1. Setup Bob
    await chordLib.addUser({ user: userBob });

    // 2. Bob starts learning "C"
    console.log("--> Principle: Bob adds 'C' as 'not started'");
    await chordLib.addChordToInventory({
      user: userBob,
      chord: "C",
      mastery: "not started",
    });

    let masteryRes = await chordLib._getChordMastery({ user: userBob, chord: "C" });
    assertEquals(masteryRes[0].mastery, "not started");

    // 3. Bob practices -> updates to "in progress"
    console.log("--> Principle: Bob updates 'C' to 'in progress'");
    const update1 = await chordLib.updateChordMastery({
      user: userBob,
      chord: "C",
      newMastery: "in progress",
    });
    assertEquals(update1, {}, "Update should succeed");
    
    masteryRes = await chordLib._getChordMastery({ user: userBob, chord: "C" });
    assertEquals(masteryRes[0].mastery, "in progress", "State should reflect new mastery");

    // 4. Bob masters it
    console.log("--> Principle: Bob updates 'C' to 'mastered'");
    await chordLib.updateChordMastery({
      user: userBob,
      chord: "C",
      newMastery: "mastered",
    });

    const finalState = await chordLib._getKnownChords({ user: userBob });
    const cChord = finalState.find(c => c.chord === "C");
    assertEquals(cChord?.mastery, "mastered", "Bob should have mastered the chord");
  });

  // ==========================================
  // 4. Test: removeChordFromInventory
  // ==========================================
  await t.step("removeChordFromInventory: removes specific chord", async () => {
    console.log("--> Action: removeChordFromInventory(Alice, 'G')");
    const delRes = await chordLib.removeChordFromInventory({
      user: userAlice,
      chord: "G",
    });
    assertEquals(delRes, {}, "Deletion should succeed");

    const chords = await chordLib._getKnownChords({ user: userAlice });
    assertEquals(chords.length, 0, "Alice should have no chords left");

    // Failure: Remove non-existent
    const failDel = await chordLib.removeChordFromInventory({
      user: userAlice,
      chord: "Z",
    });
    assertNotEquals((failDel as any).error, undefined, "Should error when removing missing chord");
  });

  // ==========================================
  // 5. Test: removeUser (Cascading Delete)
  // ==========================================
  await t.step("removeUser: removes user and all their chords", async () => {
    // Setup: Ensure Bob has chords
    const bobChords = await chordLib._getKnownChords({ user: userBob });
    assertNotEquals(bobChords.length, 0, "Bob should have chords before deletion");

    console.log("--> Action: removeUser(Bob)");
    const res = await chordLib.removeUser({ user: userBob });
    assertEquals(res, {}, "User removal should succeed");

    // Verify User is gone (addUser should succeed again if they are truly gone)
    const reAdd = await chordLib.addUser({ user: userBob });
    assertEquals(reAdd, {}, "Should be able to re-add user after deletion");

    // Verify Chords are gone
    const postDeleteChords = await chordLib._getKnownChords({ user: userBob });
    assertEquals(postDeleteChords.length, 0, "All chords should be wiped for the user");
  });

  await client.close();
});
```