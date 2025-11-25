import { assertEquals, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import SessioningConcept from "./SessioningConcept.ts";
import { ID } from "@utils/types.ts";

const userA = "userA" as ID;
const userB = "userB" as ID;

Deno.test(
  "SessioningConcept - removeAllSessionsForUser",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const sessioningConcept = new SessioningConcept(db);
    await sessioningConcept.sessions.deleteMany({});

    // Setup: Create multiple sessions for userA
    const session1Result = await sessioningConcept.create({ user: userA });
    const session1Id = session1Result.sessionId;

    const session2Result = await sessioningConcept.create({ user: userA });
    const session2Id = session2Result.sessionId;

    // Create a session for userB (should not be deleted)
    const session3Result = await sessioningConcept.create({ user: userB });
    const session3Id = session3Result.sessionId;

    // Verify setup: userA should have 2 sessions, userB should have 1
    const userASessionsBefore = await sessioningConcept.sessions.find({
      user: userA,
    }).toArray();
    const userBSessionsBefore = await sessioningConcept.sessions.find({
      user: userB,
    }).toArray();
    assertEquals(userASessionsBefore.length, 2);
    assertEquals(userBSessionsBefore.length, 1);

    // 1. Test successful removal of all sessions for userA
    const removeAllResult = await sessioningConcept.removeAllSessionsForUser({
      user: userA,
    });

    assert(
      !("error" in removeAllResult),
      "removeAllSessionsForUser should succeed",
    );
    assertEquals(
      removeAllResult.success,
      true,
      "removeAllSessionsForUser should return success: true",
    );

    // Verify all sessions for userA are removed
    const userASessionsAfter = await sessioningConcept.sessions.find({
      user: userA,
    }).toArray();
    assertEquals(
      userASessionsAfter.length,
      0,
      "All sessions for userA should be deleted",
    );

    // Verify sessions for userB are still intact
    const userBSessionsAfter = await sessioningConcept.sessions.find({
      user: userB,
    }).toArray();
    assertEquals(
      userBSessionsAfter.length,
      1,
      "Sessions for userB should remain unchanged",
    );
    assertEquals(userBSessionsAfter[0]._id, session3Id);

    // 2. Test removing all sessions for a user with no sessions (should still succeed)
    const emptyUserResult = await sessioningConcept.removeAllSessionsForUser({
      user: userA, // Already deleted all sessions
    });

    assert(
      !("error" in emptyUserResult),
      "removeAllSessionsForUser should succeed even if no sessions exist",
    );
    assertEquals(
      emptyUserResult.success,
      true,
      "removeAllSessionsForUser should return success: true even when no sessions",
    );

    await client.close();
  },
);

