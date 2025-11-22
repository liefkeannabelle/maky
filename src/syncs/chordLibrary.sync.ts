import { actions, Sync, Frames } from "@engine";
import { SongLibrary, ChordLibrary } from "@concepts";
import { ID } from "@utils/types.ts";

/**
 * Sync: AutoAddChordsForNewSong
 * 
 * When a user starts learning a song, this sync checks if the song contains
 * chords the user does not yet know. If so, it adds them to the user's 
 * ChordLibrary with 'in-progress' mastery.
 */
export const AutoAddChordsForNewSong: Sync = ({ user, song, chord }) => ({
  when: actions(
    [SongLibrary.startLearningSong, { user, song }]
  ),
  where: async (frames) => {
    // 1. Get Song Details
    // We need to find the song object to get its chords
    const allSongsObjs = await SongLibrary._getAllSongs({});
    
    // 2. Get User's Known Chords
    // We need to filter out chords the user already knows
    
    const newFrames = [];
    for (const frame of frames) {
        const currentSongId = frame[song];
        const currentUser = frame[user] as ID;

        const songEntry = allSongsObjs.find((s: any) => s.song._id === currentSongId);
        if (!songEntry) continue;

        const chordsInSong = songEntry.song.chords || [];
        if (chordsInSong.length === 0) continue;

        const knownChordsObjs = await ChordLibrary._getKnownChords({ user: currentUser });
        const knownChordSet = new Set(knownChordsObjs.map((c: any) => c.chord));

        for (const chordSymbol of chordsInSong) {
            if (!knownChordSet.has(chordSymbol)) {
                // Create a new frame for each new chord to add
                newFrames.push({
                    ...frame,
                    [chord]: chordSymbol
                });
            }
        }
    }
    return new Frames(...newFrames);
  },
  then: actions(
    [ChordLibrary.addChordToInventory, { user, chord, mastery: "in-progress" }]
  )
});
