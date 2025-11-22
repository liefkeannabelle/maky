[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: Chord


# response:

# file: src/concepts/Chord/ChordConcept.test.ts

```typescript
import { assert, assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ChordConcept from "./ChordConcept.ts";

Deno.test("ChordConcept", async (t) => {
  const [db, client] = await testDb();
  const chordConcept = new ChordConcept(db);

  console.log("--- Starting ChordConcept Tests ---");

  await t.step("Action: createChord", async (t) => {
    await t.step("satisfies effects: creates a new chord", async () => {
      console.log("Test: Create 'C Major' chord");
      const response = await chordConcept.createChord({
        name: "C Major",
        notes: ["C", "E", "G"],
      });

      if ("error" in response) {
        throw new Error(`Unexpected error: ${response.error}`);
      }

      assert(response.chord._id, "Chord should have an ID");
      assertEquals(response.chord.name, "C Major");
      assertEquals(response.chord.notes, ["C", "E", "G"]);

      // Verify state via query
      const query = await chordConcept._getChordByName({ name: "C Major" });
      assertEquals(query.chord?._id, response.chord._id);
      console.log(" -> Successfully created and verified in state.");
    });

    await t.step("satisfies requires: no duplicate chord names", async () => {
      console.log("Test: Attempt to create duplicate 'C Major' chord");
      const response = await chordConcept.createChord({
        name: "C Major",
        notes: ["C", "E", "G"],
      });

      assert("error" in response, "Should return an error for duplicate name");
      assertEquals(response.error, "Chord already exists");
      console.log(" -> Correctly rejected duplicate creation.");
    });
  });

  await t.step("Action: deleteChord", async (t) => {
    // Setup: Create a chord to delete
    const setup = await chordConcept.createChord({
      name: "D Minor",
      notes: ["D", "F", "A"],
    });
    if ("error" in setup) throw new Error("Setup failed");
    const targetId = setup.chord._id;

    await t.step("satisfies effects: removes the chord", async () => {
      console.log("Test: Delete 'D Minor' chord");
      const response = await chordConcept.deleteChord({ chord: targetId });

      if ("error" in response) {
        throw new Error(`Unexpected error: ${response.error}`);
      }

      // Verify it is gone
      const query = await chordConcept._getChordByName({ name: "D Minor" });
      assertEquals(query.chord, null);
      console.log(" -> Successfully removed chord from state.");
    });

    await t.step("satisfies requires: chord must exist", async () => {
      console.log("Test: Attempt to delete non-existent chord");
      // Try to delete the one we just deleted
      const response = await chordConcept.deleteChord({ chord: targetId });

      assert("error" in response, "Should return an error if chord not found");
      assertEquals(response.error, "Chord not found");
      console.log(" -> Correctly rejected deletion of missing chord.");
    });
  });

  await t.step("Principle: Administrator defines global chord catalog", async () => {
    console.log("\n--- Trace: Admin defines chords for user use ---");

    // 1. Admin populates the catalog with fundamental chords
    console.log("Step 1: Admin creates 'G Major', 'E Minor', and 'F Major'");
    
    await chordConcept.createChord({ name: "G Major", notes: ["G", "B", "D"] });
    await chordConcept.createChord({ name: "E Minor", notes: ["E", "G", "B"] });
    await chordConcept.createChord({ name: "F Major", notes: ["F", "A", "C"] });

    // 2. Verify catalog contains these chords
    console.log("Step 2: Verify catalog contents");
    const allChordsRes = await chordConcept._getAllChords();
    const names = allChordsRes.chords.map((c) => c.name);
    
    assert(names.includes("G Major"), "Catalog should contain G Major");
    assert(names.includes("E Minor"), "Catalog should contain E Minor");
    assert(names.includes("F Major"), "Catalog should contain F Major");
    // Note: "C Major" from previous test might still be there depending on DB setup strategy, 
    // but we just check inclusion of the new ones.
    console.log(" -> Catalog currently contains:", names.join(", "));

    // 3. Admin corrects the catalog (deletes F Major)
    console.log("Step 3: Admin decides to remove 'F Major'");
    const fMajor = allChordsRes.chords.find(c => c.name === "F Major");
    if (!fMajor) throw new Error("F Major missing");
    
    await chordConcept.deleteChord({ chord: fMajor._id });

    // 4. Verify final state
    console.log("Step 4: Verify 'F Major' is gone");
    const finalChordsRes = await chordConcept._getAllChords();
    const finalNames = finalChordsRes.chords.map((c) => c.name);
    
    assert(!finalNames.includes("F Major"), "F Major should be removed");
    assert(finalNames.includes("G Major"), "G Major should remain");
    console.log(" -> Final catalog:", finalNames.join(", "));
  });

  await client.close();
});
```

# trace:

1.  **Principle Trace: Admin manages global chord catalog**
    *   **Goal:** Demonstrate that an administrator can populate the system with chords which then form a queryable catalog.
    *   **Action:** `createChord` ("G Major", ["G", "B", "D"])
        *   **Effect:** The chord is stored in the database.
    *   **Action:** `createChord` ("E Minor", ["E", "G", "B"])
        *   **Effect:** The chord is stored.
    *   **Action:** `createChord` ("F Major", ["F", "A", "C"])
        *   **Effect:** The chord is stored.
    *   **Query:** `_getAllChords`
        *   **Observation:** The system returns a list containing G Major, E Minor, and F Major. This simulates the state that other concepts (like RecommendationEngine) would see.
    *   **Action:** `deleteChord` (ID of "F Major")
        *   **Effect:** The chord "F Major" is removed from the database.
    *   **Query:** `_getAllChords`
        *   **Observation:** The list now contains G Major and E Minor, but not F Major.
    *   **Conclusion:** The concept successfully maintains a curated list of definitions as per the principle.