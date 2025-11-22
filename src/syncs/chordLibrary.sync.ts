/**
 * Sync: AutoAddChordsForNewSong
 * 
 * When a user starts learning a song, this sync checks if the song contains
 * chords the user does not yet know. If so, it adds them to the user's 
 * ChordLibrary with 'in-progress' mastery.
 */
export function autoAddChordsSync(concepts: any) {
  concepts.songLibrary.on("startLearningSong", async (payload: any) => {
    const { user, song } = payload;

    console.log(`[Sync] AutoAddChords: Checking chords for user ${user} learning song ${song._id}`);

    try {
      // 1. Get the list of chords required for the song
      // Assuming 'song' object in payload is complete, otherwise we might need to fetch it
      const songChords: string[] = song.chords || [];

      if (songChords.length === 0) {
        return;
      }

      // 2. Get user's currently known chords to check for duplicates
      const knownChordsObjs = await concepts.chordLibrary.getKnownChords({ user });
      // Map to a Set of chord symbols (e.g., "Am", "G") for O(1) lookup
      const knownChordSet = new Set(knownChordsObjs.map((c: any) => c.chord || c.symbol));

      // 3. Iterate and add missing chords
      for (const chordSymbol of songChords) {
        if (!knownChordSet.has(chordSymbol)) {
          console.log(`[Sync] AutoAddChords: Adding new chord ${chordSymbol} to inventory`);
          
          await concepts.chordLibrary.addChordToInventory({
            user,
            chord: chordSymbol,
            mastery: "in-progress"
          });
        }
      }
    } catch (err) {
      console.error(`[Sync] AutoAddChords: Error processing song ${song?._id}`, err);
    }
  });
}