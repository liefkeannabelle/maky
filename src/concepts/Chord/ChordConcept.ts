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