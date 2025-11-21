[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@concepts](../../concepts.md)

[@ChordLibrary](ChordLibrary.md)


# implement prompt

Implement the **ChordLibrary** concept for the ChordConnect app.

Use the ChordLibrary concept specification in `ChordLibrary.md`

Implement a TypeScript class `ChordLibraryConcept` that:

- Persists, per user, which chords they know and the mastery level of each chord.
- Supports updating mastery as the user practices.
- Exposes queries to:
  - Get the set of chords a user currently knows.
  - Get mastery for a particular chord of a user.

Follow the style and structure of `UserAccountConcept` (same action/dispatch pattern, same database access style).

# requirements

- Represent chords as simple strings (e.g., `"C"`, `"G"`, `"Bm"`) consistent with our `songs.json` dataset.
- Represent mastery as an enum or string with at least: `"not started"`, `"in progress"`, `"proficient"`, `"mastered"`.
- The concept should **not** know about songs directly; it only tracks user↔chord↔mastery.
- Provide at least:
  - `getKnownChords(user: User): (chord: Chord)`
  - `getChordMastery(user: User, chord: Chord): (mastery: String)`
- Make sure all actions return object-shaped results (no `void`).

# response:

# concept: ChordLibrary
**purpose** maintain an inventory of chords known by each user, along with their self-reported mastery level for each chord.
**principle** when a user learns a new chord, they add it to their library with an initial mastery level. As they practice and become more proficient, they update the chord's mastery level.
**state**
> a set of Users (to track existence)
> a set of KnownChords with
> > a user User
> > a chord Chord (string)
> > a mastery MasteryLevel

**actions**
addUser (user: User)
addChordToInventory (user: User, chord: Chord, mastery: MasteryLevel)
updateChordMastery (user: User, chord: Chord, newMastery: MasteryLevel)
removeChordFromInventory (user: User, chord: Chord)
removeUser (user: User)

**queries**
_getKnownChords (user: User): (knownChords: Array<{chord: Chord, mastery: MasteryLevel}>)
_getChordMastery (user: User, chord: Chord): (mastery: MasteryLevel)

# file: src/concepts/ChordLibrary/ChordLibraryConcept.ts
```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "ChordLibrary.";

// Concept Types
type User = ID;
type Chord = string; // e.g., "C", "Am7"
export type MasteryLevel = "not started" | "in progress" | "proficient" | "mastered";

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
  async addUser(input: { user: User }): Promise<Empty | { error: string }> {
    const existing = await this.users.findOne({ _id: input.user });
    if (existing) {
      return { error: "User already exists in ChordLibrary" };
    }

    await this.users.insertOne({ _id: input.user });
    return {};
  }

  /**
   * addChordToInventory (user: User, chord: Chord, mastery: MasteryLevel)
   *
   * **requires** The `user` exists. The `user` does not already have the specified `chord` in their inventory.
   * **effects** Creates a new `KnownChord` entry associating the `user`, `chord`, and `mastery` level.
   */
  async addChordToInventory(input: {
    user: User;
    chord: Chord;
    mastery: MasteryLevel;
  }): Promise<Empty | { error: string }> {
    const userExists = await this.users.findOne({ _id: input.user });
    if (!userExists) {
      return { error: "User does not exist" };
    }

    const chordExists = await this.knownChords.findOne({
      user: input.user,
      chord: input.chord,
    });
    if (chordExists) {
      return { error: "Chord already in inventory" };
    }

    await this.knownChords.insertOne({
      _id: freshID(),
      user: input.user,
      chord: input.chord,
      mastery: input.mastery,
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
      { $set: { mastery: input.newMastery } }
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
}
```