import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import JamSessionConcept from "./JamSessionConcept.ts";
import { ID } from "@utils/types.ts";

// Mock IDs for testing
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;
const userC = "user:Charlie" as ID;
const group1 = "group:1" as ID;
const group2 = "group:2" as ID;
const song1 = "song:1" as ID;
const song2 = "song:2" as ID;

Deno.test(
  "JamSessionConcept - scheduleJamSession",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamSessionConcept = new JamSessionConcept(db);
    await jamSessionConcept.jamSessions.deleteMany({});

    // Test successful scheduling with future time
    const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
    const result = await jamSessionConcept.scheduleJamSession({
      group: group1,
      startTime: futureTime,
    });

    assert(
      !("error" in result),
      "Scheduling a session with future time should succeed.",
    );
    assertExists(result.session, "A session ID should be returned on success.");

    const sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: result.session,
    });
    assertExists(sessionInDb, "The session should exist in the database.");
    assertEquals(sessionInDb.jamGroup, group1);
    assertEquals(sessionInDb.startTime.getTime(), futureTime.getTime());
    assertEquals(sessionInDb.status, "SCHEDULED");
    assertEquals(sessionInDb.participants.length, 0, "No participants initially.");
    assertEquals(sessionInDb.sharedSongs.length, 0, "No shared songs initially.");
    assertEquals(sessionInDb.endTime, undefined, "No end time for scheduled session.");

    // Test scheduling with past time (should fail)
    const pastTime = new Date(Date.now() - 3600000); // 1 hour ago
    const pastResult = await jamSessionConcept.scheduleJamSession({
      group: group1,
      startTime: pastTime,
    });

    assert(
      "error" in pastResult,
      "Scheduling a session with past time should fail.",
    );
    assertEquals(pastResult.error, "Start time must be in the future.");

    await client.close();
  },
);

Deno.test(
  "JamSessionConcept - startJamSession",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamSessionConcept = new JamSessionConcept(db);
    await jamSessionConcept.jamSessions.deleteMany({});

    // Test successful session start
    const result = await jamSessionConcept.startJamSession({
      group: group1,
      creator: userA,
    });

    assert(
      !("error" in result),
      "Starting a session should succeed.",
    );
    assertExists(result.session, "A session ID should be returned on success.");

    const sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: result.session,
    });
    assertExists(sessionInDb, "The session should exist in the database.");
    assertEquals(sessionInDb.jamGroup, group1);
    assertEquals(sessionInDb.status, "ACTIVE");
    assertEquals(
      sessionInDb.participants.length,
      1,
      "Creator should be automatically added as participant.",
    );
    assertEquals(
      sessionInDb.participants[0],
      userA,
      "Creator should be the first participant.",
    );
    assertEquals(sessionInDb.sharedSongs.length, 0, "No shared songs initially.");
    assertExists(sessionInDb.startTime, "startTime should be set.");
    assertEquals(sessionInDb.endTime, undefined, "No end time for active session.");

    await client.close();
  },
);

Deno.test(
  "JamSessionConcept - joinSession",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamSessionConcept = new JamSessionConcept(db);
    await jamSessionConcept.jamSessions.deleteMany({});

    // Setup: create an active session
    const createResult = await jamSessionConcept.startJamSession({
      group: group1,
      creator: userA,
    });
    assert("session" in createResult, "Test setup failed: could not create session.");
    const sessionId = createResult.session;

    // Test successful join
    const joinResult = await jamSessionConcept.joinSession({
      session: sessionId,
      user: userB,
    });

    assert(
      !("error" in joinResult),
      "Joining an active session should succeed.",
    );
    assertEquals(
      joinResult.success,
      true,
      "Join response should include success: true",
    );

    // Verify user was added
    let sessionInDb = await jamSessionConcept.jamSessions.findOne({ _id: sessionId });
    assertExists(sessionInDb);
    assertEquals(
      sessionInDb.participants.length,
      2,
      "Session should have 2 participants after userB joins.",
    );
    assert(
      sessionInDb.participants.includes(userB),
      "UserB should be in the participants array.",
    );

    // Test joining non-existent session
    const nonExistentSessionId = "session:nonexistent" as ID;
    const nonExistentResult = await jamSessionConcept.joinSession({
      session: nonExistentSessionId,
      user: userC,
    });

    assert(
      "error" in nonExistentResult,
      "Joining non-existent session should fail.",
    );
    assertEquals(
      nonExistentResult.error,
      `JamSession with id ${nonExistentSessionId} not found.`,
    );

    // Test duplicate join
    const duplicateResult = await jamSessionConcept.joinSession({
      session: sessionId,
      user: userB, // Already a participant
    });

    assert(
      "error" in duplicateResult,
      "Joining a session as an existing participant should fail.",
    );
    assertEquals(
      duplicateResult.error,
      `User ${userB} is already a participant in session ${sessionId}.`,
    );

    // Test joining completed session
    await jamSessionConcept.endJamSession({ session: sessionId });
    const completedResult = await jamSessionConcept.joinSession({
      session: sessionId,
      user: userC,
    });

    assert(
      "error" in completedResult,
      "Joining a completed session should fail.",
    );
    assertEquals(
      completedResult.error,
      `JamSession ${sessionId} is not active.`,
    );

    await client.close();
  },
);

Deno.test(
  "JamSessionConcept - shareSongInSession",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamSessionConcept = new JamSessionConcept(db);
    await jamSessionConcept.jamSessions.deleteMany({});

    // Setup: create an active session with participants
    const createResult = await jamSessionConcept.startJamSession({
      group: group1,
      creator: userA,
    });
    assert("session" in createResult, "Test setup failed: could not create session.");
    const sessionId = createResult.session;

    await jamSessionConcept.joinSession({ session: sessionId, user: userB });

    // Test successful song sharing
    const shareResult = await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userA,
      song: song1,
      currentStatus: "practicing verse",
    });

    assert(
      !("error" in shareResult),
      "Sharing a song should succeed.",
    );
    assertEquals(
      shareResult.success,
      true,
      "Share response should include success: true",
    );

    // Verify song was shared
    let sessionInDb = await jamSessionConcept.jamSessions.findOne({ _id: sessionId });
    assertExists(sessionInDb);
    assertEquals(
      sessionInDb.sharedSongs.length,
      1,
      "Session should have 1 shared song.",
    );
    assertEquals(sessionInDb.sharedSongs[0].song, song1);
    assertEquals(sessionInDb.sharedSongs[0].participant, userA);
    assertEquals(sessionInDb.sharedSongs[0].currentStatus, "practicing verse");

    // Test sharing by non-participant
    const nonParticipantResult = await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userC, // Not a participant
      song: song2,
      currentStatus: "soloing",
    });

    assert(
      "error" in nonParticipantResult,
      "Sharing by non-participant should fail.",
    );
    assertEquals(
      nonParticipantResult.error,
      `User ${userC} is not a participant in session ${sessionId}.`,
    );

    // Test duplicate song share
    const duplicateResult = await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userA,
      song: song1, // Already shared by userA
      currentStatus: "different status",
    });

    assert(
      "error" in duplicateResult,
      "Sharing the same song twice should fail.",
    );
    assertEquals(
      duplicateResult.error,
      `Song ${song1} is already shared by participant ${userA} in session ${sessionId}.`,
    );

    // Test sharing in non-active session
    await jamSessionConcept.endJamSession({ session: sessionId });
    const inactiveResult = await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userB,
      song: song2,
      currentStatus: "practicing",
    });

    assert(
      "error" in inactiveResult,
      "Sharing in inactive session should fail.",
    );
    assertEquals(
      inactiveResult.error,
      `JamSession ${sessionId} is not active.`,
    );

    await client.close();
  },
);

Deno.test(
  "JamSessionConcept - updateSharedSongStatus",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamSessionConcept = new JamSessionConcept(db);
    await jamSessionConcept.jamSessions.deleteMany({});

    // Setup: create session with shared song
    const createResult = await jamSessionConcept.startJamSession({
      group: group1,
      creator: userA,
    });
    assert("session" in createResult, "Test setup failed: could not create session.");
    const sessionId = createResult.session;

    await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userA,
      song: song1,
      currentStatus: "practicing verse",
    });

    // Test successful status update
    const updateResult = await jamSessionConcept.updateSharedSongStatus({
      session: sessionId,
      participant: userA,
      song: song1,
      newStatus: "soloing",
    });

    assert(
      !("error" in updateResult),
      "Updating shared song status should succeed.",
    );
    assertEquals(
      updateResult.success,
      true,
      "Update response should include success: true",
    );

    // Verify status was updated
    let sessionInDb = await jamSessionConcept.jamSessions.findOne({ _id: sessionId });
    assertExists(sessionInDb);
    assertEquals(sessionInDb.sharedSongs[0].currentStatus, "soloing");

    // Test updating non-existent shared song
    const nonExistentResult = await jamSessionConcept.updateSharedSongStatus({
      session: sessionId,
      participant: userA,
      song: song2, // Not shared
      newStatus: "practicing",
    });

    assert(
      "error" in nonExistentResult,
      "Updating non-existent shared song should fail.",
    );
    assertEquals(
      nonExistentResult.error,
      `Shared song not found for participant ${userA} and song ${song2} in session ${sessionId}.`,
    );

    await client.close();
  },
);

Deno.test(
  "JamSessionConcept - endJamSession",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamSessionConcept = new JamSessionConcept(db);
    await jamSessionConcept.jamSessions.deleteMany({});

    // Setup: create an active session
    const createResult = await jamSessionConcept.startJamSession({
      group: group1,
      creator: userA,
    });
    assert("session" in createResult, "Test setup failed: could not create session.");
    const sessionId = createResult.session;

    // Verify session is active
    let sessionInDb = await jamSessionConcept.jamSessions.findOne({ _id: sessionId });
    assertExists(sessionInDb);
    assertEquals(sessionInDb.status, "ACTIVE");
    assertEquals(sessionInDb.endTime, undefined);

    // Test successful session end
    const endResult = await jamSessionConcept.endJamSession({
      session: sessionId,
    });

    assert(
      !("error" in endResult),
      "Ending an active session should succeed.",
    );
    assertEquals(
      endResult.success,
      true,
      "End response should include success: true",
    );

    // Verify session was ended
    sessionInDb = await jamSessionConcept.jamSessions.findOne({ _id: sessionId });
    assertExists(sessionInDb);
    assertEquals(sessionInDb.status, "COMPLETED");
    assertExists(sessionInDb.endTime, "endTime should be set after ending.");

    // Test ending non-existent session
    const nonExistentSessionId = "session:nonexistent" as ID;
    const nonExistentResult = await jamSessionConcept.endJamSession({
      session: nonExistentSessionId,
    });

    assert(
      "error" in nonExistentResult,
      "Ending non-existent session should fail.",
    );
    assertEquals(
      nonExistentResult.error,
      `JamSession with id ${nonExistentSessionId} not found.`,
    );

    // Test ending already completed session
    const alreadyEndedResult = await jamSessionConcept.endJamSession({
      session: sessionId,
    });

    assert(
      "error" in alreadyEndedResult,
      "Ending an already completed session should fail.",
    );
    assertEquals(
      alreadyEndedResult.error,
      `JamSession ${sessionId} is not active.`,
    );

    await client.close();
  },
);

Deno.test(
  "JamSessionConcept - Principle: Schedule, start, join, share songs, update status, and end session",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamSessionConcept = new JamSessionConcept(db);
    await jamSessionConcept.jamSessions.deleteMany({});

    // Principle scenario: Users collaborate in a jam session

    // 1. Alice starts a jam session for her group
    const startResult = await jamSessionConcept.startJamSession({
      group: group1,
      creator: userA,
    });
    assert("session" in startResult, "Alice should be able to start a session.");
    const sessionId = startResult.session;

    let sessionInDb = await jamSessionConcept.jamSessions.findOne({ _id: sessionId });
    assertExists(sessionInDb);
    assertEquals(sessionInDb.status, "ACTIVE");
    assertEquals(sessionInDb.participants.length, 1, "Session starts with creator.");

    // 2. Bob joins the session
    const bobJoinResult = await jamSessionConcept.joinSession({
      session: sessionId,
      user: userB,
    });
    assert(!("error" in bobJoinResult), "Bob should be able to join.");

    // 3. Charlie joins the session
    const charlieJoinResult = await jamSessionConcept.joinSession({
      session: sessionId,
      user: userC,
    });
    assert(!("error" in charlieJoinResult), "Charlie should be able to join.");

    sessionInDb = await jamSessionConcept.jamSessions.findOne({ _id: sessionId });
    assertExists(sessionInDb);
    assertEquals(
      sessionInDb.participants.length,
      3,
      "Session should have 3 participants: Alice, Bob, and Charlie.",
    );

    // 4. Alice shares a song she's practicing
    const aliceShareResult = await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userA,
      song: song1,
      currentStatus: "practicing verse 1",
    });
    assert(!("error" in aliceShareResult), "Alice should be able to share a song.");

    // 5. Bob shares a different song
    const bobShareResult = await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userB,
      song: song2,
      currentStatus: "soloing",
    });
    assert(!("error" in bobShareResult), "Bob should be able to share a song.");

    sessionInDb = await jamSessionConcept.jamSessions.findOne({ _id: sessionId });
    assertExists(sessionInDb);
    assertEquals(
      sessionInDb.sharedSongs.length,
      2,
      "Session should have 2 shared songs.",
    );

    // 6. Alice updates her status
    const aliceUpdateResult = await jamSessionConcept.updateSharedSongStatus({
      session: sessionId,
      participant: userA,
      song: song1,
      newStatus: "practicing chorus",
    });
    assert(!("error" in aliceUpdateResult), "Alice should be able to update her status.");

    sessionInDb = await jamSessionConcept.jamSessions.findOne({ _id: sessionId });
    assertExists(sessionInDb);
    const aliceSong = sessionInDb.sharedSongs.find(
      (s) => s.participant === userA && s.song === song1,
    );
    assertExists(aliceSong);
    assertEquals(aliceSong.currentStatus, "practicing chorus");

    // 7. Alice ends the session
    const endResult = await jamSessionConcept.endJamSession({
      session: sessionId,
    });
    assert(!("error" in endResult), "Alice should be able to end the session.");

    // Verify session is completed
    sessionInDb = await jamSessionConcept.jamSessions.findOne({ _id: sessionId });
    assertExists(sessionInDb);
    assertEquals(sessionInDb.status, "COMPLETED");
    assertExists(sessionInDb.endTime, "Session should have an end time.");

    await client.close();
  },
);

