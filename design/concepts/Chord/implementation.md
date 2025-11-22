[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@concepts](../../concepts.md)

[@Chord](Chord.md)

# implement prompt

Implement the **Chord** concept for the ChordConnect app.

Use the `Chord` concept specification in `Chord.md` as the source of truth.

You should implement a TypeScript class `ChordConcept` that represents a **global catalog of chord definitions** (admin-defined), not per-user state. Other concepts (like `ChordLibrary` or `RecommendationEngine`) may refer to these chords by name.

From the spec:

- The concept is parameterized by `Note`, but for this implementation you may represent a `Note` as a string (e.g. `"C4"`, `"D#3"`, `"F#"`).
- State is:
  - A set / collection of `Chord` documents, each with:
    - a `name` (String) – human-readable chord symbol, e.g. `"C"`, `"Am7"`, `"G7#9"`.
    - a `notes` sequence – a sequence/array of `Note` values representing the chord tones.

You must support at least these actions:

- `createChord(name: String, notes: sequence of Note): (chord: Chord)`
- `deleteChord(chord: Chord)`

and it is useful (though not required by the spec) to add queries:

- `_getChordByName(name: String): (chord: Chord | null)`
- `_getAllChords(): (chords: Chord[])`

These queries make it easier for other concepts and syncs to consume the global chord vocabulary.

# requirements

Implementation requirements and details:

- **File & class**
  - Implement the concept as `src/concepts/Chord/ChordConcept.ts`.
  - Export a default class `ChordConcept` from that file.
  - Follow the same structural patterns as the other concepts (e.g. `SongLibraryConcept`, `ChordLibraryConcept`, `RecommendationEngineConcept`).

- **Types**
  - Define a `Note` type as a simple alias for string:
    ```ts
    export type Note = string;
    ```
  - Define a `Chord` interface that matches the concept state:
    ```ts
    export interface Chord {
      _id: ID;        // internal unique ID
      name: string;   // e.g. "C", "Am7", "G7#9"
      notes: Note[];  // ordered sequence of notes forming the chord
    }
    ```
  - Use the shared `ID` type and `freshID()` helper from the existing utilities (same as in other concepts).

- **State & persistence**
  - Use MongoDB (via the existing `getDb` / `Db` utilities) to store chords in a collection, e.g. `this.chords`.
  - Each document in the `chords` collection should conform to the `Chord` interface.
  - There is no per-user state here: this is a **global** chord catalog.

- **Action: createChord**
  - Signature in TS should reflect the spec:
    ```ts
    async createChord(params: { name: string; notes: Note[] }): Promise<{ chord: Chord } | { error: string }>;
    ```
  - **requires**
    - No chord with the given `name` already exists.
  - **effects**
    - Create a new `Chord` document with:
      - `_id = freshID()`
      - `name = params.name.trim()`
      - `notes = params.notes` (you may sanitize/trim each string).
    - Insert it into the `chords` collection.
    - Return `{ chord }` on success.
  - If a chord with the same `name` already exists, do **not** create a duplicate; instead return `{ error: "Chord already exists" }`.

- **Action: deleteChord**
  - For simplicity, accept a chord identifier:
    ```ts
    async deleteChord(params: { chord: ID }): Promise<Empty | { error: string }>;
    ```
    or
    ```ts
    async deleteChord(params: { chord: Chord }): Promise<Empty | { error: string }>;
    ```
    Choose whichever is more consistent with other concepts; it’s fine to represent the chord by its `_id`.
  - **requires**
    - The chord exists in the `chords` collection.
  - **effects**
    - Remove the chord document from the collection.
    - Return `{}` (Empty) on success, or `{ error: "Chord not found" }` if there is no such chord.

- **Queries (internal / helper)**
  - Implement an internal query to fetch a chord by its name:
    ```ts
    async _getChordByName(params: { name: string }): Promise<{ chord: Chord | null }>;
    ```
    - Look up by normalized name (e.g. case-insensitive compare, or just `name.trim()` if you prefer).
  - Implement an internal query to list all chords:
    ```ts
    async _getAllChords(): Promise<{ chords: Chord[] }>;
    ```
    - Return all chords sorted by `name` ascending.
  - These queries can be used by future syncs (e.g. to power a chord picker in the UI, or to combine with the static chord vocabulary in `src/theory/chords.ts`).

- **Integration with `src/theory/chords.ts` (optional but encouraged)**
  - If the file `src/theory/chords.ts` exists, you may:
    - Use `normalizeChordSymbol` (or similar) to normalize `name` before storing.
    - Use `isValidChordSymbol` to validate `name` in `createChord`, returning an error if it is not a valid chord symbol.
  - This integration is optional, but if used, keep the concept robust even if the theory module is not present.

- **Error handling and invariants**
  - Enforce name uniqueness at the database level (e.g. by checking existence before insert; you may also add a unique index on `name`).
  - Always sanitize `name` by trimming whitespace.
  - Treat `notes` as a required non-empty array for now (it should represent the chord tones).
  - Return `{ error: string }` objects for failure conditions instead of throwing, mirroring other concept implementations.

- **Style & patterns**
  - Follow the same coding style, naming conventions, and patterns as in `SongLibraryConcept` and `ChordLibraryConcept`:
    - constructor accepts a `Db` (or similar) instance.
    - collections are created with `db.collection<Chord>("chords")` or similar.
    - methods are `async` and return either result objects or `{ error }`.
  - Include JSDoc comments or brief comments where helpful to clarify the role of each method.

The result should be a clean, self-contained `ChordConcept` implementation that can be used by other concepts and syncs as the global source of truth for chord definitions.

# response:

# concept: Chord
**concept** Chord [Note]
**purpose** define fundamental musical chords
**principle** administrator defines chords that can be used widely by the users

**state**

> a set of Chords with
>
> > a name String
> > a Notes sequence

**actions**

createChord (name: String, notes: sequence of Note): (chord: Chord)

* **requires** No Chord with the given `name` already exists.
* **effects** Creates a new Chord `c`; sets the name of `c` to `name` and its `notes` to the provided sequence; returns the new Chord `c` as `chord`.

deleteChord (chord: Chord)

* **requires** The Chord `chord` exists.
* **effects** Removes the Chord `chord` and all its associated data from the state.

**queries**

_getChordByName (name: String): (chord: Chord)
* **requires** true
* **effects** Returns the chord with the matching name, or null if not found.

_getAllChords (): (chords: sequence of Chord)
* **requires** true
* **effects** Returns all defined chords.

# file: src/concepts/Chord/ChordConcept.ts
```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Chord.";

/**
 * Note is represented as a string (e.g., "C", "F#", "Bb").
 */
export type Note = string;

/**
 * a set of Chords with
 *   a name String
 *   a Notes sequence
 */
export interface Chord {
  _id: ID;
  name: string;
  notes: Note[];
}

export default class ChordConcept {
  chords: Collection<Chord>;

  constructor(db: Db) {
    this.chords = db.collection(PREFIX + "chords");
  }

  /**
   * createChord (name: String, notes: sequence of Note): (chord: Chord)
   *
   * **requires** No Chord with the given `name` already exists.
   *
   * **effects** Creates a new Chord `c`; sets the name of `c` to `name` and its `notes`
   * to the provided sequence; returns the new Chord `c` as `chord`.
   */
  async createChord(params: { name: string; notes: Note[] }): Promise<{ chord: Chord } | { error: string }> {
    const name = params.name.trim();

    // Check strict requirement: No Chord with the given `name` already exists.
    const existing = await this.chords.findOne({ name });
    if (existing) {
      return { error: "Chord already exists" };
    }

    const chord: Chord = {
      _id: freshID(),
      name,
      notes: params.notes,
    };

    await this.chords.insertOne(chord);

    return { chord };
  }

  /**
   * deleteChord (chord: Chord)
   *
   * **requires** The Chord `chord` exists.
   *
   * **effects** Removes the Chord `chord` and all its associated data from the state.
   */
  async deleteChord(params: { chord: ID }): Promise<Empty | { error: string }> {
    const result = await this.chords.deleteOne({ _id: params.chord });

    if (result.deletedCount === 0) {
      return { error: "Chord not found" };
    }

    return {};
  }

  /**
   * _getChordByName (name: String): (chord: Chord | null)
   *
   * Internal query to fetch a chord by its name.
   */
  async _getChordByName(params: { name: string }): Promise<{ chord: Chord | null }> {
    const chord = await this.chords.findOne({ name: params.name.trim() });
    return { chord };
  }

  /**
   * _getAllChords (): (chords: Chord[])
   *
   * Internal query to list all chords.
   */
  async _getAllChords(): Promise<{ chords: Chord[] }> {
    const chords = await this.chords.find({}).sort({ name: 1 }).toArray();
    return { chords };
  }
}
```