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
    assertEquals(
      sessionInDb.participants.length,
      0,
      "No participants initially.",
    );
    assertEquals(sessionInDb.songsLog.length, 0, "No songs logged initially.");
    assertEquals(
      sessionInDb.endTime,
      undefined,
      "No end time for scheduled session.",
    );

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
    assertEquals(sessionInDb.songsLog.length, 0, "No songs logged initially.");
    assertExists(sessionInDb.startTime, "startTime should be set.");
    assertEquals(
      sessionInDb.endTime,
      undefined,
      "No end time for active session.",
    );

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
    assert(
      "session" in createResult,
      "Test setup failed: could not create session.",
    );
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
    let sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: sessionId,
    });
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
  "JamSessionConcept - bulkJoinUsers",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamSessionConcept = new JamSessionConcept(db);
    await jamSessionConcept.jamSessions.deleteMany({});

    // Setup: schedule a future session
    const futureTime = new Date(Date.now() + 7200000);
    const scheduleResult = await jamSessionConcept.scheduleJamSession({
      group: group1,
      startTime: futureTime,
    });
    assert("session" in scheduleResult);
    const scheduledSessionId = scheduleResult.session;

    // Bulk join multiple users
    const bulkResult = await jamSessionConcept.bulkJoinUsers({
      session: scheduledSessionId,
      users: [userA, userB],
    });

    assert(!("error" in bulkResult));
    let sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: scheduledSessionId,
    });
    assertExists(sessionInDb);
    assertEquals(sessionInDb.participants.length, 2);
    assert(sessionInDb.participants.includes(userA));
    assert(sessionInDb.participants.includes(userB));

    // Duplicates are ignored; new users are added once
    const secondBulk = await jamSessionConcept.bulkJoinUsers({
      session: scheduledSessionId,
      users: [userB, userC, userC],
    });
    assert(!("error" in secondBulk));
    sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: scheduledSessionId,
    });
    assertExists(sessionInDb);
    assertEquals(sessionInDb.participants.length, 3);
    assert(sessionInDb.participants.includes(userC));

    // Empty batches succeed without changes
    const emptyBulk = await jamSessionConcept.bulkJoinUsers({
      session: scheduledSessionId,
      users: [],
    });
    assert(!("error" in emptyBulk));

    // Completed sessions cannot be bulk joined
    const startResult = await jamSessionConcept.startJamSession({
      group: group2,
      creator: userA,
    });
    const activeSessionId = startResult.session;
    await jamSessionConcept.endJamSession({ session: activeSessionId });

    const completedResult = await jamSessionConcept.bulkJoinUsers({
      session: activeSessionId,
      users: [userB],
    });
    assert("error" in completedResult);
    assertEquals(
      completedResult.error,
      `JamSession ${activeSessionId} has already completed.`,
    );

    // Missing sessions return an error
    const missingSessionId = "session:missing" as ID;
    const missingResult = await jamSessionConcept.bulkJoinUsers({
      session: missingSessionId,
      users: [userA],
    });
    assert("error" in missingResult);
    assertEquals(
      missingResult.error,
      `JamSession with id ${missingSessionId} not found.`,
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
    assert(
      "session" in createResult,
      "Test setup failed: could not create session.",
    );
    const sessionId = createResult.session;

    await jamSessionConcept.joinSession({ session: sessionId, user: userB });

    // Test successful song sharing
    const shareResult = await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userA,
      song: song1,
      frequency: 3,
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
    let sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: sessionId,
    });
    assertExists(sessionInDb);
    assertEquals(
      sessionInDb.songsLog.length,
      1,
      "Session should have 1 songs log entry.",
    );
    assertEquals(sessionInDb.songsLog[0].song, song1);
    assertEquals(sessionInDb.songsLog[0].participant, userA);
    assertEquals(sessionInDb.songsLog[0].frequency, 3);

    // Test sharing by non-participant
    const nonParticipantResult = await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userC, // Not a participant
      song: song2,
      frequency: 2,
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
      frequency: 5,
    });

    assert(
      "error" in duplicateResult,
      "Sharing the same song twice should fail.",
    );
    assertEquals(
      duplicateResult.error,
      `Song ${song1} is already logged by participant ${userA} in session ${sessionId}.`,
    );

    // Test invalid frequency value
    const invalidFrequencyResult = await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userB,
      song: song2,
      frequency: 0,
    });

    assert(
      "error" in invalidFrequencyResult,
      "Sharing with non-positive frequency should fail.",
    );
    assertEquals(
      invalidFrequencyResult.error,
      "Frequency must be a positive number.",
    );

    // Test sharing in non-active session
    await jamSessionConcept.endJamSession({ session: sessionId });
    const inactiveResult = await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userB,
      song: song2,
      frequency: 4,
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
  "JamSessionConcept - updateSongLogFrequency",
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
    assert(
      "session" in createResult,
      "Test setup failed: could not create session.",
    );
    const sessionId = createResult.session;

    await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userA,
      song: song1,
      frequency: 2,
    });

    // Test successful frequency update
    const updateResult = await jamSessionConcept.updateSongLogFrequency({
      session: sessionId,
      participant: userA,
      song: song1,
      newFrequency: 5,
    });

    assert(
      !("error" in updateResult),
      "Updating song log frequency should succeed.",
    );
    assertEquals(
      updateResult.success,
      true,
      "Update response should include success: true",
    );

    // Verify frequency was updated
    let sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: sessionId,
    });
    assertExists(sessionInDb);
    assertEquals(sessionInDb.songsLog[0].frequency, 5);

    // Test updating non-existent song log entry
    const nonExistentResult = await jamSessionConcept.updateSongLogFrequency({
      session: sessionId,
      participant: userA,
      song: song2, // Not shared
      newFrequency: 1,
    });

    assert(
      "error" in nonExistentResult,
      "Updating non-existent song log entry should fail.",
    );
    assertEquals(
      nonExistentResult.error,
      `Song log entry not found for participant ${userA} and song ${song2} in session ${sessionId}.`,
    );

    // Test updating with invalid frequency
    const invalidUpdateResult = await jamSessionConcept.updateSongLogFrequency({
      session: sessionId,
      participant: userA,
      song: song1,
      newFrequency: 0,
    });

    assert(
      "error" in invalidUpdateResult,
      "Updating with non-positive frequency should fail.",
    );
    assertEquals(
      invalidUpdateResult.error,
      "Frequency must be a positive number.",
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
    assert(
      "session" in createResult,
      "Test setup failed: could not create session.",
    );
    const sessionId = createResult.session;

    // Verify session is active
    let sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: sessionId,
    });
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
    sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: sessionId,
    });
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
  "JamSessionConcept - Principle: Schedule, start, join, log songs, update frequency, and end session",
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
    assert(
      "session" in startResult,
      "Alice should be able to start a session.",
    );
    const sessionId = startResult.session;

    let sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: sessionId,
    });
    assertExists(sessionInDb);
    assertEquals(sessionInDb.status, "ACTIVE");
    assertEquals(
      sessionInDb.participants.length,
      1,
      "Session starts with creator.",
    );

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

    sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: sessionId,
    });
    assertExists(sessionInDb);
    assertEquals(
      sessionInDb.participants.length,
      3,
      "Session should have 3 participants: Alice, Bob, and Charlie.",
    );

    // 4. Alice logs how often she's practicing a song
    const aliceShareResult = await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userA,
      song: song1,
      frequency: 4,
    });
    assert(
      !("error" in aliceShareResult),
      "Alice should be able to share a song.",
    );

    // 5. Bob logs a different song
    const bobShareResult = await jamSessionConcept.shareSongInSession({
      session: sessionId,
      participant: userB,
      song: song2,
      frequency: 2,
    });
    assert(!("error" in bobShareResult), "Bob should be able to share a song.");

    sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: sessionId,
    });
    assertExists(sessionInDb);
    assertEquals(
      sessionInDb.songsLog.length,
      2,
      "Session should have 2 songs log entries.",
    );

    // 6. Alice updates her logged frequency
    const aliceUpdateResult = await jamSessionConcept.updateSongLogFrequency({
      session: sessionId,
      participant: userA,
      song: song1,
      newFrequency: 6,
    });
    assert(
      !("error" in aliceUpdateResult),
      "Alice should be able to update her log.",
    );

    sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: sessionId,
    });
    assertExists(sessionInDb);
    const aliceSong = sessionInDb.songsLog.find(
      (s) => s.participant === userA && s.song === song1,
    );
    assertExists(aliceSong);
    assertEquals(aliceSong.frequency, 6);

    // 7. Alice ends the session
    const endResult = await jamSessionConcept.endJamSession({
      session: sessionId,
    });
    assert(!("error" in endResult), "Alice should be able to end the session.");

    // Verify session is completed
    sessionInDb = await jamSessionConcept.jamSessions.findOne({
      _id: sessionId,
    });
    assertExists(sessionInDb);
    assertEquals(sessionInDb.status, "COMPLETED");
    assertExists(sessionInDb.endTime, "Session should have an end time.");

    await client.close();
  },
);

Deno.test(
  "JamSessionConcept - Query: _getJamSessionsForGroup",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamSessionConcept = new JamSessionConcept(db);
    await jamSessionConcept.jamSessions.deleteMany({});

    // Setup: Create multiple sessions for different groups
    const session1Result = await jamSessionConcept.startJamSession({
      group: group1,
      creator: userA,
    });
    assert("session" in session1Result);

    await new Promise((r) => setTimeout(r, 10)); // Ensure different timestamps

    const session2Result = await jamSessionConcept.startJamSession({
      group: group1,
      creator: userB,
    });
    assert("session" in session2Result);

    const session3Result = await jamSessionConcept.startJamSession({
      group: group2,
      creator: userC,
    });
    assert("session" in session3Result);

    // Test: Get sessions for group1 (should return 2)
    const group1Sessions = await jamSessionConcept._getJamSessionsForGroup({
      group: group1,
    });
    assertEquals(
      group1Sessions.length,
      2,
      "Group1 should have 2 sessions.",
    );
    // Verify they're sorted by startTime (newest first)
    assert(
      group1Sessions[0].startTime >= group1Sessions[1].startTime,
      "Sessions should be sorted by startTime descending.",
    );

    // Test: Get sessions for group2 (should return 1)
    const group2Sessions = await jamSessionConcept._getJamSessionsForGroup({
      group: group2,
    });
    assertEquals(group2Sessions.length, 1, "Group2 should have 1 session.");

    // Test: Get sessions for non-existent group (should return 0)
    const nonExistentGroup = "group:nonexistent" as ID;
    const noSessions = await jamSessionConcept._getJamSessionsForGroup({
      group: nonExistentGroup,
    });
    assertEquals(
      noSessions.length,
      0,
      "Non-existent group should have no sessions.",
    );

    await client.close();
  },
);

Deno.test(
  "JamSessionConcept - Query: _getJamSessionById",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamSessionConcept = new JamSessionConcept(db);
    await jamSessionConcept.jamSessions.deleteMany({});

    // Setup: Create a session
    const createResult = await jamSessionConcept.startJamSession({
      group: group1,
      creator: userA,
    });
    assert("session" in createResult);
    const sessionId = createResult.session;

    // Test: Get existing session
    const foundSessions = await jamSessionConcept._getJamSessionById({
      session: sessionId,
    });
    assertEquals(foundSessions.length, 1, "Should return one session.");
    assertEquals(foundSessions[0]._id, sessionId);
    assertEquals(foundSessions[0].jamGroup, group1);
    assertEquals(foundSessions[0].status, "ACTIVE");
    assertExists(foundSessions[0].participants);

    // Test: Get non-existent session
    const nonExistentId = "session:nonexistent" as ID;
    const notFoundSessions = await jamSessionConcept._getJamSessionById({
      session: nonExistentId,
    });
    assertEquals(
      notFoundSessions.length,
      0,
      "Should return empty array for non-existent session.",
    );

    await client.close();
  },
);

Deno.test(
  "JamSessionConcept - Query: _getActiveSessionForGroup",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    const [db, client] = await testDb();
    const jamSessionConcept = new JamSessionConcept(db);
    await jamSessionConcept.jamSessions.deleteMany({});

    // Test: No active session initially
    const noActiveSessions = await jamSessionConcept._getActiveSessionForGroup({
      group: group1,
    });
    assertEquals(
      noActiveSessions.length,
      0,
      "Should return empty array when no active session.",
    );

    // Setup: Create an active session
    const createResult = await jamSessionConcept.startJamSession({
      group: group1,
      creator: userA,
    });
    assert("session" in createResult);
    const sessionId = createResult.session;

    // Test: Get active session
    const activeSessions = await jamSessionConcept._getActiveSessionForGroup({
      group: group1,
    });
    assertEquals(activeSessions.length, 1, "Should return one active session.");
    assertEquals(activeSessions[0]._id, sessionId);
    assertEquals(activeSessions[0].status, "ACTIVE");

    // End the session
    await jamSessionConcept.endJamSession({ session: sessionId });

    // Test: No active session after ending
    const noActiveAfterEnd = await jamSessionConcept._getActiveSessionForGroup({
      group: group1,
    });
    assertEquals(
      noActiveAfterEnd.length,
      0,
      "Should return empty array after session is ended.",
    );

    await client.close();
  },
);
