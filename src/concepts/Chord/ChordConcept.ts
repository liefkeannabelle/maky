import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { 
  listChordSymbols, 
  normalizeChordSymbol,
  generateChordVocabulary,
  CANONICAL_ROOTS,
  COMMON_CHORD_SUFFIXES,
} from "../../theory/chords.ts";
import { 
  getChordDiagram, 
  getAllAvailableChordDiagrams, 
  hasChordDiagram,
  ChordDiagram 
} from "../../theory/chordDiagrams.ts";


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

  // ============ CHORD DIAGRAM QUERIES ============

  /**
   * _getChordDiagram (name: String): (diagrams: ChordDiagram[] | null)
   *
   * Get guitar fingering diagram(s) for a chord.
   * Returns multiple voicings if available, or null if no diagram exists.
   */
  async _getChordDiagram(params: { name: string }): Promise<{ diagrams: ChordDiagram[] | null }> {
    const diagrams = getChordDiagram(params.name.trim());
    return { diagrams };
  }

  /**
   * _getChordDiagrams (names: String[]): (diagrams: Record<string, ChordDiagram[]>)
   *
   * Get guitar fingering diagrams for multiple chords at once.
   * Returns a map of chord name -> diagrams (empty array if not found).
   */
  async _getChordDiagrams(params: { names: string[] }): Promise<{ diagrams: Record<string, ChordDiagram[]> }> {
    const result: Record<string, ChordDiagram[]> = {};
    
    for (const name of params.names) {
      const diagrams = getChordDiagram(name.trim());
      result[name] = diagrams || [];
    }
    
    return { diagrams: result };
  }

  /**
   * _getAvailableChordDiagrams (): (chords: string[])
   *
   * Get list of all chord names that have diagrams available.
   * Includes both hand-crafted and algorithmically generated diagrams.
   */
  async _getAvailableChordDiagrams(): Promise<{ chords: string[] }> {
    return { chords: getAllAvailableChordDiagrams() };
  }

  /**
   * _hasChordDiagram (name: String): (exists: boolean)
   *
   * Check if a diagram exists for a given chord.
   */
  async _hasChordDiagram(params: { name: string }): Promise<{ exists: boolean }> {
    return { exists: hasChordDiagram(params.name.trim()) };
  }

  // ============ CHORD VOCABULARY QUERIES ============

  /**
   * _getChordVocabulary (includeSlashChords?: boolean): chord vocabulary info
   *
   * Returns all possible chord symbols that the system recognizes.
   * This is generated from the theory module (12 roots × 53 suffixes).
   * 
   * Use this to build a "chord dictionary" or reference page.
   */
  async _getChordVocabulary(params: { 
    includeSlashChords?: boolean 
  } = {}): Promise<{
    chords: string[];
    roots: string[];
    suffixes: string[];
    totalCount: number;
    chordsWithDiagrams: string[];
  }> {
    const includeSlash = params.includeSlashChords ?? false;
    const chords = generateChordVocabulary({ includeSlashChords: includeSlash });
    const chordsWithDiagrams = getAllAvailableChordDiagrams();
    
    return {
      chords,
      roots: [...CANONICAL_ROOTS],
      suffixes: [...COMMON_CHORD_SUFFIXES],
      totalCount: chords.length,
      chordsWithDiagrams,
    };
  }
}