import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Generic types used by this concept
type User = ID;
type Group = ID;
type Item = ID;
type JamSession = ID;

// Collection prefix, using the concept name
const PREFIX = "JamSession" + ".";

// Status enum
export type SessionStatus = "ACTIVE" | "COMPLETED" | "SCHEDULED";

/**
 * Represents a shared song within a session.
 * a set of SharedSongs with
 *   a song Item
 *   a participant User
 *   a currentStatus String
 */
interface SharedSongDoc {
  song: Item;
  participant: User;
  currentStatus: string;
}

/**
 * Represents the state of a single JamSession.
 * state: a set of JamSessions with
 *   a sessionId String (represented by _id)
 *   a jamGroup Group
 *   a startTime DateTime
 *   an optional endTime DateTime
 *   a participants set of User
 *   a sharedSongs set of SharedSongs
 *   a status of ACTIVE or COMPLETED or SCHEDULED
 */
interface JamSessionDoc {
  _id: JamSession;
  jamGroup: Group;
  startTime: Date;
  endTime?: Date;
  participants: User[];
  sharedSongs: SharedSongDoc[];
  status: SessionStatus;
}

/**
 * @concept JamSession
 * @purpose To facilitate real-time or asynchronous collaborative music sessions within a jam group.
 */
export default class JamSessionConcept {
  jamSessions: Collection<JamSessionDoc>;

  constructor(private readonly db: Db) {
    this.jamSessions = this.db.collection<JamSessionDoc>(PREFIX + "jamSessions");
  }

  /**
   * scheduleJamSession (group: Group, startTime: DateTime): (session: JamSession)
   *
   * **requires** The `group` exists. The `startTime` is in the future.
   *
   * **effects** Creates a new `JamSession` with a unique `sessionId`; sets `jamGroup`, `startTime`, and `status` to `SCHEDULED`;
   *           initializes empty sets for `participants` and `sharedSongs`; returns the new `session`.
   */
  async scheduleJamSession(
    { group, startTime }: {
      group: Group;
      startTime: Date;
    },
  ): Promise<{ session: JamSession } | { error: string }> {
    // Validate that startTime is in the future
    if (startTime <= new Date()) {
      return { error: "Start time must be in the future." };
    }

    const newSession: JamSessionDoc = {
      _id: freshID(),
      jamGroup: group,
      startTime,
      participants: [],
      sharedSongs: [],
      status: "SCHEDULED",
    };

    await this.jamSessions.insertOne(newSession);
    return { session: newSession._id };
  }

  /**
   * startJamSession (group: Group, creator: User): (session: JamSession)
   *
   * **requires** The `group` exists and the `creator` is permitted to start a session for the `group`.
   *
   * **effects** Creates a new `JamSession` with a unique `sessionId`; sets `jamGroup`, `status` to `ACTIVE`, and `startTime` to the current time;
   *           adds `creator` to `participants`; returns the new `session`.
   */
  async startJamSession(
    { group, creator }: {
      group: Group;
      creator: User;
    },
  ): Promise<{ session: JamSession }> {
    const newSession: JamSessionDoc = {
      _id: freshID(),
      jamGroup: group,
      startTime: new Date(),
      participants: [creator],
      sharedSongs: [],
      status: "ACTIVE",
    };

    await this.jamSessions.insertOne(newSession);
    return { session: newSession._id };
  }

  /**
   * joinSession (session: JamSession, user: User)
   *
   * **requires** The `session` exists and is `ACTIVE`. The `user` is permitted to join sessions for the associated `Group` and is not already in `participants`.
   *
   * **effects** Adds the `user` to the `participants` set of the `session`.
   */
  async joinSession(
    { session, user }: { session: JamSession; user: User },
  ): Promise<{ success: true } | { error: string }> {
    const sessionDoc = await this.jamSessions.findOne({ _id: session });

    if (!sessionDoc) {
      return { error: `JamSession with id ${session} not found.` };
    }

    if (sessionDoc.status !== "ACTIVE") {
      return { error: `JamSession ${session} is not active.` };
    }

    if (sessionDoc.participants.includes(user)) {
      return { error: `User ${user} is already a participant in session ${session}.` };
    }

    const result = await this.jamSessions.updateOne(
      { _id: session },
      { $addToSet: { participants: user } },
    );

    if (result.modifiedCount === 0) {
      return { error: `Failed to add user ${user} to session ${session}.` };
    }

    return { success: true };
  }

  /**
   * shareSongInSession (session: JamSession, participant: User, song: Item, currentStatus: String)
   *
   * **requires** The `session` exists and is `ACTIVE`. The `participant` is in the `participants` set.
   *           The `song` is not already shared by this `participant` in this `session`.
   *
   * **effects** Creates a new `SharedSong` with `song`, `participant`, and `currentStatus` and adds it to the `sharedSongs` set of the `session`.
   */
  async shareSongInSession(
    { session, participant, song, currentStatus }: {
      session: JamSession;
      participant: User;
      song: Item;
      currentStatus: string;
    },
  ): Promise<{ success: true } | { error: string }> {
    const sessionDoc = await this.jamSessions.findOne({ _id: session });

    if (!sessionDoc) {
      return { error: `JamSession with id ${session} not found.` };
    }

    if (sessionDoc.status !== "ACTIVE") {
      return { error: `JamSession ${session} is not active.` };
    }

    if (!sessionDoc.participants.includes(participant)) {
      return { error: `User ${participant} is not a participant in session ${session}.` };
    }

    // Check if this participant already shared this song
    const alreadyShared = sessionDoc.sharedSongs.some(
      (shared) => shared.participant === participant && shared.song === song,
    );

    if (alreadyShared) {
      return { error: `Song ${song} is already shared by participant ${participant} in session ${session}.` };
    }

    const newSharedSong: SharedSongDoc = {
      song,
      participant,
      currentStatus,
    };

    const result = await this.jamSessions.updateOne(
      { _id: session },
      { $push: { sharedSongs: newSharedSong } },
    );

    if (result.modifiedCount === 0) {
      return { error: `Failed to share song in session ${session}.` };
    }

    return { success: true };
  }

  /**
   * updateSharedSongStatus (session: JamSession, participant: User, song: Item, newStatus: String)
   *
   * **requires** The `session` exists and is `ACTIVE`. A `SharedSong` exists in the `session` for this `participant` and `song`.
   *
   * **effects** Updates the `currentStatus` of the matching `SharedSong` to `newStatus`.
   */
  async updateSharedSongStatus(
    { session, participant, song, newStatus }: {
      session: JamSession;
      participant: User;
      song: Item;
      newStatus: string;
    },
  ): Promise<{ success: true } | { error: string }> {
    const sessionDoc = await this.jamSessions.findOne({ _id: session });

    if (!sessionDoc) {
      return { error: `JamSession with id ${session} not found.` };
    }

    if (sessionDoc.status !== "ACTIVE") {
      return { error: `JamSession ${session} is not active.` };
    }

    const result = await this.jamSessions.updateOne(
      {
        _id: session,
        "sharedSongs.participant": participant,
        "sharedSongs.song": song,
      },
      { $set: { "sharedSongs.$.currentStatus": newStatus } },
    );

    if (result.matchedCount === 0) {
      return { error: `Shared song not found for participant ${participant} and song ${song} in session ${session}.` };
    }

    return { success: true };
  }

  /**
   * endJamSession (session: JamSession)
   *
   * **requires** The `session` exists and is `ACTIVE`.
   *
   * **effects** Updates the `status` to `COMPLETED` and sets `endTime` to the current time.
   */
  async endJamSession(
    { session }: { session: JamSession },
  ): Promise<{ success: true } | { error: string }> {
    const sessionDoc = await this.jamSessions.findOne({ _id: session });

    if (!sessionDoc) {
      return { error: `JamSession with id ${session} not found.` };
    }

    if (sessionDoc.status !== "ACTIVE") {
      return { error: `JamSession ${session} is not active.` };
    }

    const result = await this.jamSessions.updateOne(
      { _id: session },
      {
        $set: {
          status: "COMPLETED",
          endTime: new Date(),
        },
      },
    );

    if (result.modifiedCount === 0) {
      return { error: `Failed to end session ${session}.` };
    }

    return { success: true };
  }
}

