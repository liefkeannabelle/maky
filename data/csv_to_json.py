#!/usr/bin/env python3
import csv
import json
import argparse
from pathlib import Path


def simplify_chord(chord: str) -> str:
    """
    Very simple chord normalizer:
    - strips whitespace
    - removes common extensions (7, maj7, add9, etc.)
    - drops slash bass notes (G/B -> G)
    """
    c = chord.strip()
    if not c:
        return c

    # drop stuff like maj7, 7, sus4, add9, dim, aug (very rough)
    for ext in ["maj7", "min7", "m7", "7", "sus2", "sus4", "add9", "dim", "aug"]:
        if ext.lower() in c.lower():
            c = c.replace(ext, "").replace(ext.upper(), "").replace(ext.title(), "")

    # drop slash bass, e.g. G/B -> G
    if "/" in c:
        c = c.split("/")[0]

    return c.strip()


def parse_sections(progression_str: str):
    """
    Handle cells like:

        VERSE:G,C,G,D
        CHORUS:C,G,D,G

    (newline between sections)

    Optionally also supports "VERSE:... | CHORUS:..." by treating '|' as
    another line separator.
    """
    if not progression_str:
        return []

    # Normalize: treat '|' as additional line breaks
    normalized = progression_str.replace("|", "\n")
    lines = [ln.strip() for ln in normalized.splitlines() if ln.strip()]

    sections = []
    for line in lines:
        if ":" not in line:
            # If you ever have a line without a name, you could choose to
            # append to the previous section; for now we just skip it
            continue

        name, prog_part = line.split(":", 1)
        progression = [
            c.strip() for c in prog_part.split(",") if c.strip()
        ]
        sections.append({
            "name": name.strip(),
            "progression": progression
        })

    return sections


def csv_to_json(csv_path: Path, json_path: Path):
    songs = []

    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row.get("id"):
                continue  # skip empty rows

            # chords list
            raw_chords = row.get("chords", "")
            chords = [c.strip() for c in raw_chords.split(",") if c.strip()]
            simplified_chords = sorted(
                set(simplify_chord(c) for c in chords if simplify_chord(c))
            )

            # sections / progression
            sections = parse_sections(row.get("progression", ""))

            # numeric fields
            def to_int(val):
                try:
                    return int(val)
                except (TypeError, ValueError):
                    return None

            tempo = to_int(row.get("tempo"))
            difficulty = to_int(row.get("difficulty"))

            # tags
            tags_str = row.get("tags", "")
            tags = [t.strip() for t in tags_str.split(",") if t.strip()]

            song = {
                "id": row.get("id"),
                "title": row.get("title"),
                "artist": row.get("artist"),
                "key": row.get("key"),
                "tempo": tempo,
                "chords": chords,
                "simplifiedChords": simplified_chords,
                "sections": sections,
                "difficulty": difficulty,
                "tags": tags,
                "source": "curated",
            }
            songs.append(song)

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(songs, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(songs)} songs to {json_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Convert songs CSV (from Google Sheets) into songs.json"
    )
    parser.add_argument(
        "csv_path", type=Path, help="Input CSV file (export from Google Sheets)"
    )
    parser.add_argument(
        "json_path",
        type=Path,
        nargs="?",
        default=Path("songs.json"),
        help="Output JSON file (default: songs.json)",
    )
    args = parser.parse_args()
    csv_to_json(args.csv_path, args.json_path)
