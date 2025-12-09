#!/usr/bin/env python3
"""
Script to fix malformed chord symbols in song data files.
Fixes patterns like:
- "no3d" -> "no3" (e.g., "Eno3d" -> "Eno3")
- "us2" -> "sus2" (e.g., "A#us2" -> "A#sus2")
- "us4" -> "sus4" (e.g., "B#us4" -> "Bsus4", also fixes B# -> C enharmonic)
"""

import json
import re
import sys

# Chord fixes mapping
CHORD_FIXES = {
    # Fix "no3d" -> "no3"
    r'([A-G](#|b)?)no3d': r'\1no3',
    
    # Fix "us2" -> "sus2"
    r'([A-G](#|b)?)us2': r'\1sus2',
    
    # Fix "us4" -> "sus4"
    r'([A-G](#|b)?)us4': r'\1sus4',
}

# Enharmonic corrections for rare/incorrect notes
ENHARMONIC_FIXES = {
    'B#': 'C',   # B# is enharmonically C
    'E#': 'F',   # E# is enharmonically F
    'Cb': 'B',   # Cb is enharmonically B
    'Fb': 'E',   # Fb is enharmonically E
}

def fix_chord(chord):
    """Fix a single chord symbol."""
    if not chord or not isinstance(chord, str):
        return chord
    
    original = chord
    
    # Apply pattern fixes
    for pattern, replacement in CHORD_FIXES.items():
        chord = re.sub(pattern, replacement, chord)
    
    # Apply enharmonic fixes for root notes
    for wrong, correct in ENHARMONIC_FIXES.items():
        if chord.startswith(wrong):
            chord = chord.replace(wrong, correct, 1)
    
    if chord != original:
        print(f"  Fixed: {original} -> {chord}")
    
    return chord

def fix_chord_list(chords):
    """Fix a list of chords."""
    if not chords or not isinstance(chords, list):
        return chords
    return [fix_chord(c) for c in chords]

def fix_songs_file(filepath):
    """Fix all chords in a songs JSON file."""
    print(f"\nProcessing {filepath}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False
    
    if not isinstance(data, list):
        print(f"Error: Expected list of songs in {filepath}")
        return False
    
    fixes_count = 0
    
    for song in data:
        if not isinstance(song, dict):
            continue
        
        # Fix chords array
        if 'chords' in song and isinstance(song['chords'], list):
            original_chords = song['chords'].copy()
            song['chords'] = fix_chord_list(song['chords'])
            if song['chords'] != original_chords:
                fixes_count += 1
        
        # Fix simplifiedChords array
        if 'simplifiedChords' in song and isinstance(song['simplifiedChords'], list):
            song['simplifiedChords'] = fix_chord_list(song['simplifiedChords'])
        
        # Fix sections if they contain chords
        if 'sections' in song and isinstance(song['sections'], list):
            for section in song['sections']:
                if isinstance(section, dict):
                    if 'chords' in section:
                        section['chords'] = fix_chord_list(section['chords'])
                    if 'progression' in section:
                        section['progression'] = fix_chord_list(section['progression'])
    
    # Write back to file
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✓ Fixed {fixes_count} songs in {filepath}")
        return True
    except Exception as e:
        print(f"Error writing {filepath}: {e}")
        return False

def main():
    files_to_fix = [
        'chordonomicon_songs.json',
        'songs.json',
    ]
    
    success = True
    for filename in files_to_fix:
        if not fix_songs_file(filename):
            success = False
    
    if success:
        print("\n✓ All files processed successfully!")
    else:
        print("\n✗ Some files had errors")
        sys.exit(1)

if __name__ == '__main__':
    main()
