import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Set environment variables for testing BEFORE importing concepts
Deno.env.set("DB_NAME", "test-maky-backend-integration");
Deno.env.set("REQUESTING_TIMEOUT", "1000"); // Faster timeout for tests

// Import concepts from the main entry point so they match what syncs use
import { Engine, ChordLibrary, Requesting, Sessioning, UserAccount, db, client } from "../concepts/concepts.ts";
import * as ChordLibrarySyncs from "./chordLibrary.sync.ts";
import * as UserAccSyncs from "./useracc.sync.ts";
import { Sync, Logging } from "../engine/mod.ts";

// Enable Logging
Engine.logging = Logging.TRACE;

// Register Syncs
const syncs: Record<string, Sync> = {};
for (const [name, func] of Object.entries(ChordLibrarySyncs)) {
    if (typeof func === "function") syncs[`chordLibrary.${name}`] = func as Sync;
}
for (const [name, func] of Object.entries(UserAccSyncs)) {
    if (typeof func === "function") syncs[`useracc.${name}`] = func as Sync;
}
Engine.register(syncs);

async function clearDb() {
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
        await db.collection(collection.name).deleteMany({});
    }
}

Deno.test({
    name: "GetChordInventory Sync Test",
    sanitizeResources: false,
    sanitizeOps: false,
    fn: async (t) => {
        await clearDb();
  
        await t.step("should return empty inventory for new user", async () => {
            // 1. Create User
            const username = "test_user_inventory_" + Date.now();
            const password = "password123";
            const email = "test@example.com";
            
            await UserAccount.register({ username, password, email, isKidAccount: false });
            const userDoc = await UserAccount.users.findOne({ username });
            const uId = userDoc!._id;
            
            // 2. Add User to ChordLibrary
            await ChordLibrary.addUser({ user: uId });
            
            // 3. Create Session
            const { sessionId } = await Sessioning.create({ user: uId });
            
            // 4. Test Empty Inventory
            const { request } = await Requesting.request({ path: "chords/inventory", sessionId });
            const responseArray = await Requesting._awaitResponse({ request });
            // deno-lint-ignore no-explicit-any
            const response = responseArray[0].response as any;
            
            assertEquals(response.inventory, []);
        });

        await t.step("should return correct inventory after adding chords", async () => {
            // 1. Create User
            const username = "test_user_inventory_2_" + Date.now();
            const password = "password123";
            const email = "test2@example.com";
            
            await UserAccount.register({ username, password, email, isKidAccount: false });
            const userDoc = await UserAccount.users.findOne({ username });
            const uId = userDoc!._id;
            
            // 2. Add User to ChordLibrary
            await ChordLibrary.addUser({ user: uId });
            
            // 3. Add Chords
            await ChordLibrary.addChordToInventory({ user: uId, chord: "C", mastery: "proficient" });
            await ChordLibrary.addChordToInventory({ user: uId, chord: "G", mastery: "in progress" });
            
            // 4. Create Session
            const { sessionId } = await Sessioning.create({ user: uId });
            
            // 5. Test Inventory
            const { request } = await Requesting.request({ path: "chords/inventory", sessionId });
            const responseArray = await Requesting._awaitResponse({ request });
            // deno-lint-ignore no-explicit-any
            const response = responseArray[0].response as any;
            
            assertEquals(response.inventory.length, 2);
            // deno-lint-ignore no-explicit-any
            const chords = response.inventory.map((c: any) => c.chord).sort();
            assertEquals(chords, ["C", "G"]);
            
            // deno-lint-ignore no-explicit-any
            const cChord = response.inventory.find((c: any) => c.chord === "C");
            assertEquals(cChord.mastery, "proficient");
        });

        await t.step("should add chord via request and return updated inventory", async () => {
            // 1. Create User
            const username = "test_user_add_chord_" + Date.now();
            const password = "password123";
            const email = "test3@example.com";
            
            await UserAccount.register({ username, password, email, isKidAccount: false });
            const userDoc = await UserAccount.users.findOne({ username });
            const uId = userDoc!._id;
            
            // 2. Add User to ChordLibrary
            await ChordLibrary.addUser({ user: uId });
            
            // 3. Create Session
            const { sessionId } = await Sessioning.create({ user: uId });
            
            // 4. Send Add Chord Request
            const { request } = await Requesting.request({ path: "chords/add", sessionId, chord: "Am" });
            const responseArray = await Requesting._awaitResponse({ request });
            // deno-lint-ignore no-explicit-any
            const response = responseArray[0].response as any;
            
            // 5. Verify Response
            // The sync wraps the payload in a 'response' key
            const payload = response.response;
            assertEquals(payload.success, true);
            assertEquals(payload.normalizedChord, "Am");
            // Check if inventory in response contains the new chord
            // deno-lint-ignore no-explicit-any
            const hasChord = payload.inventory.includes("Am");
            assertEquals(hasChord, true);
            
            // 6. Verify Database State
            const knownChords = await ChordLibrary._getKnownChords({ user: uId });
            assertEquals(knownChords.length, 1);
            assertEquals(knownChords[0].chord, "Am");
        });

        // Cleanup
        await client.close();
    }
});
