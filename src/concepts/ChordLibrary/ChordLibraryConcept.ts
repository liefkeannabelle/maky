import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import {
  isValidChordSymbol,
  normalizeChordSymbol,
} from "../../theory/chords.ts";

const PREFIX = "ChordLibrary.";

// Concept Types
type User = ID;
type Chord = string; // e.g., "C", "Am7"
export type MasteryLevel =
  | "not started"
  | "in progress"
  | "proficient"
  | "mastered";

/**
 * a set of Users (to track existence context for this concept)
 */
interface UserDoc {
  _id: User;
}

/**
 * a set of KnownChords linking users to chords with mastery
 */
interface KnownChordDoc {
  _id: ID;
  user: User;
  chord: Chord;
  mastery: MasteryLevel;
}

export default class ChordLibraryConcept {
  users: Collection<UserDoc>;
  knownChords: Collection<KnownChordDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.knownChords = this.db.collection(PREFIX + "knownChords");
  }

  /**
   * addUser (user: User)
   *
   * **requires** The `user` does not already exist in the set of Users.
   * **effects** Adds the given `user` to the set of Users, creating an empty inventory for them.
   */
  async addUser(
    input: { user: User },
  ): Promise<{ success: boolean } | { error: string }> {
    const existing = await this.users.findOne({ _id: input.user });
    if (existing) {
      return { error: "User already exists in ChordLibrary" };
    }

    await this.users.insertOne({ _id: input.user });
    return { success: true };
  }

  /**
   * addChordToInventory (user: User, chord: Chord, mastery: MasteryLevel)
   *
   * **requires** The `user` exists. The `user` does not already have the specified `chord` in their inventory.
   * **effects** Creates a new `KnownChord` entry associating the `user`, `chord`, and `mastery` level.
   */
  async addChordToInventory(params: {
    user: ID;
    chord: string;
    mastery: MasteryLevel;
  }) {
    // 1) check user exists (you already do this)
    const userDoc = await this.users.findOne({ _id: params.user });
    if (!userDoc) {
      return { error: "User does not exist in ChordLibrary" };
    }

    // 2) normalize + validate chord
    const normalized = normalizeChordSymbol(params.chord);
    if (!normalized || !isValidChordSymbol(normalized)) {
      return { error: `Invalid chord symbol: ${params.chord}` };
    }

    // 3) enforce uniqueness on normalized chord
    const existing = await this.knownChords.findOne({
      user: params.user,
      chord: normalized,
    });
    if (existing) {
      return { error: "Chord already in inventory" };
    }

    // 4) insert
    await this.knownChords.insertOne({
      _id: freshID(),
      user: params.user,
      chord: normalized,
      mastery: params.mastery,
    });

    return {};
  }

  /**
   * updateChordMastery (user: User, chord: Chord, newMastery: MasteryLevel)
   *
   * **requires** A `KnownChord` entry exists for the given `user` and `chord`.
   * **effects** Updates the `mastery` of the existing `KnownChord` entry for the `user` and `chord` to `newMastery`.
   */
  async updateChordMastery(input: {
    user: User;
    chord: Chord;
    newMastery: MasteryLevel;
  }): Promise<Empty | { error: string }> {
    const result = await this.knownChords.updateOne(
      { user: input.user, chord: input.chord },
      { $set: { mastery: input.newMastery } },
    );

    if (result.matchedCount === 0) {
      return { error: "Chord not found in user inventory" };
    }

    return {};
  }

  /**
   * removeChordFromInventory (user: User, chord: Chord)
   *
   * **requires** A `KnownChord` entry exists for the given `user` and `chord`.
   * **effects** Deletes the `KnownChord` entry for the specified `user` and `chord`.
   */
  async removeChordFromInventory(input: {
    user: User;
    chord: Chord;
  }): Promise<Empty | { error: string }> {
    const result = await this.knownChords.deleteOne({
      user: input.user,
      chord: input.chord,
    });

    if (result.deletedCount === 0) {
      return { error: "Chord not found in user inventory" };
    }

    return {};
  }

  /**
   * removeUser (user: User)
   *
   * **requires** The `user` exists in the set of Users.
   * **effects** Removes the `user` from the set of Users and deletes all `KnownChord` entries associated with that `user`.
   */
  async removeUser(input: { user: User }): Promise<Empty | { error: string }> {
    const userRes = await this.users.deleteOne({ _id: input.user });

    if (userRes.deletedCount === 0) {
      return { error: "User not found" };
    }

    await this.knownChords.deleteMany({ user: input.user });
    return {};
  }

  /**
   * _getKnownChords (user: User): (knownChords: {chord: Chord, mastery: MasteryLevel}[])
   *
   * **requires** The `user` exists.
   * **effects** Returns the set of all `KnownChord` entries for the given `user`, each containing a chord and its mastery level.
   */
  async _getKnownChords(input: {
    user: User;
  }): Promise<Array<{ chord: Chord; mastery: MasteryLevel }>> {
    const docs = await this.knownChords.find({ user: input.user }).toArray();
    return docs.map((d) => ({
      chord: d.chord,
      mastery: d.mastery,
    }));
  }

  /**
   * _getChordMastery (user: User, chord: Chord): (mastery: MasteryLevel)
   *
   * **requires** The `user` possesses the `chord` in their inventory.
   * **effects** Returns the specific mastery level for the requested chord.
   */
  async _getChordMastery(input: {
    user: User;
    chord: Chord;
  }): Promise<Array<{ mastery: MasteryLevel }>> {
    const doc = await this.knownChords.findOne({
      user: input.user,
      chord: input.chord,
    });

    if (!doc) {
      return [];
    }

    return [{ mastery: doc.mastery }];
  }

  /**
   * _getOverlappingChords (userIds: User[]): overlapping chord data
   *
   * **requires** At least two user IDs are provided. All users exist in ChordLibrary.
   * **effects** Returns the set of chords that ALL specified users have in common,
   *             along with the minimum mastery level across users for each chord
   *             (representing the "weakest link" for group playing).
   */
  async _getOverlappingChords(input: {
    userIds: User[];
  }): Promise<{
    overlappingChords: Array<{
      chord: Chord;
      minMastery: MasteryLevel;
      userMasteries: Array<{ userId: User; mastery: MasteryLevel }>;
    }>;
    userChordCounts: Array<{ userId: User; chordCount: number }>;
  }> {
    const { userIds } = input;

    if (userIds.length < 2) {
      return { overlappingChords: [], userChordCounts: [] };
    }

    // Mastery level ordering for comparison (lower index = lower mastery)
    const masteryOrder: MasteryLevel[] = [
      "not started",
      "in progress",
      "proficient",
      "mastered",
    ];

    // Get all chords for each user
    const userChordMaps: Map<User, Map<Chord, MasteryLevel>> = new Map();
    const userChordCounts: Array<{ userId: User; chordCount: number }> = [];

    for (const userId of userIds) {
      const chords = await this._getKnownChords({ user: userId });
      const chordMap = new Map<Chord, MasteryLevel>();
      for (const { chord, mastery } of chords) {
        chordMap.set(chord, mastery);
      }
      userChordMaps.set(userId, chordMap);
      userChordCounts.push({ userId, chordCount: chords.length });
    }

    // Find intersection: start with first user's chords, filter to those all users have
    const firstUserChords = userChordMaps.get(userIds[0]);
    if (!firstUserChords || firstUserChords.size === 0) {
      return { overlappingChords: [], userChordCounts };
    }

    const overlappingChords: Array<{
      chord: Chord;
      minMastery: MasteryLevel;
      userMasteries: Array<{ userId: User; mastery: MasteryLevel }>;
    }> = [];

    for (const [chord] of firstUserChords) {
      // Check if all other users have this chord
      let allHave = true;
      const userMasteries: Array<{ userId: User; mastery: MasteryLevel }> = [];
      let minMasteryIndex = masteryOrder.length - 1; // Start with highest

      for (const userId of userIds) {
        const userChords = userChordMaps.get(userId)!;
        const mastery = userChords.get(chord);

        if (mastery === undefined) {
          allHave = false;
          break;
        }

        userMasteries.push({ userId, mastery });
        const masteryIndex = masteryOrder.indexOf(mastery);
        if (masteryIndex < minMasteryIndex) {
          minMasteryIndex = masteryIndex;
        }
      }

      if (allHave) {
        overlappingChords.push({
          chord,
          minMastery: masteryOrder[minMasteryIndex],
          userMasteries,
        });
      }
    }

    // Sort by minimum mastery (highest first) so best shared chords come first
    overlappingChords.sort((a, b) => {
      return (
        masteryOrder.indexOf(b.minMastery) - masteryOrder.indexOf(a.minMastery)
      );
    });

    return { overlappingChords, userChordCounts };
  }
}
