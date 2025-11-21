**concept** Chord [Note] \
**purpose** define fundamental musical chords \
**principle** administrator defines chords that can be used widely by the users

**state**
> a set of Chords with
  >> a name String\
  >> a Notes sequence

**actions**

createChord (name: String, notes: sequence of Note): (chord: Chord)

*   **requires** No Chord with the given `name` already exists.
*   **effects** Creates a new Chord `c`; sets the name of `c` to `name` and its `notes` to the provided sequence; returns the new Chord `c` as `chord`.

deleteChord (chord: Chord)
*   **requires** The Chord `chord` exists.
*   **effects** Removes the Chord `chord` and all its associated data from the state.

**notes**
There are no non-obvious design choices for this concept.