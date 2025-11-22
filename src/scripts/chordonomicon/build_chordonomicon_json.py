#!/usr/bin/env python3
"""
Build a ChordConnect-compatible JSON song file from the Chordonomicon dataset,
and ENRICH it with real Spotify track titles & artist names where possible.

Pipeline:
  1. (Optionally) download chordonomicon_v2.csv from Hugging Face into data/raw/.
  2. Parse the `chords` field into sections + normalized chord symbols.
  3. Filter to a beginner-friendly subset (<= MAX_UNIQUE_CHORDS chords).
  4. For rows with spotify_song_id, call Spotify Web API to get:
       - track.name  -> Song title
       - track.artists[0].name -> Artist name
  5. Write data/chordonomicon_songs.json in your Song schema.
"""

import csv
import json
import os
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ------------ CONFIG ------------

CHORDONOMICON_URL = (
    "https://huggingface.co/datasets/ailsntua/Chordonomicon/resolve/main/chordonomicon_v2.csv"
)

RAW_DIR = Path("../data/raw")
RAW_CSV_PATH = RAW_DIR / "chordonomicon_v2.csv"

OUTPUT_JSON_PATH = Path("../data/chordonomicon_songs.json")

# Limit how many songs we keep (None = all; careful, ~680k total)
MAX_SONGS = 5000

# Filter out songs with too many distinct chords
MAX_UNIQUE_CHORDS = 8

# Spotify credentials via env
SPOTIFY_CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET")

# ---------------------------------


def maybe_download_csv() -> None:
    """
    Download chordonomicon_v2.csv into data/raw/ if it doesn't exist yet.
    """
    if RAW_CSV_PATH.exists():
        print(f"[info] Using existing CSV at {RAW_CSV_PATH}")
        return

    print(f"[info] {RAW_CSV_PATH} not found. Attempting to download from Hugging Face…")
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    try:
        import requests  # type: ignore
    except ImportError:
        print("[warn] The 'requests' library is not installed.")
        print("       Install it with:  pip install requests")
        print("       OR manually download chordonomicon_v2.csv from:")
        print(f"       {CHORDONOMICON_URL}")
        print(f"       and place it at: {RAW_CSV_PATH}")
        raise SystemExit(1)

    resp = requests.get(CHORDONOMICON_URL, stream=True)
    resp.raise_for_status()

    total_bytes = 0
    with open(RAW_CSV_PATH, "wb") as f:
        for chunk in resp.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)
                total_bytes += len(chunk)
                if total_bytes % (10 * 1024 * 1024) < len(chunk):
                    print(f"[download] {total_bytes / (1024 * 1024):.1f} MB…")

    print(f"[info] Download complete: {RAW_CSV_PATH} ({total_bytes / (1024 * 1024):.1f} MB)")


# --------- CHORD NORMALIZATION ---------


def normalize_chord_symbol(symbol: str) -> Optional[str]:
    """
    VERY SIMPLE, forgiving chord normalizer.

    Goals:
      - Convert dataset-specific quirks (e.g., 'Amin', 'Emin7', 'Bmin9', 'Fs', 'D/Fs')
        into something closer to what your TypeScript chord vocabulary expects.
      - Reject clearly weird tokens.

    Rules:
      - 'min' -> 'm'   (Amin -> Am, Emin7 -> Em7, Bmin9 -> Bm9)
      - 'Fs' -> 'F#', 'Cs' -> 'C#', etc. (dataset often uses 's' for sharp)
      - leave 'b' as flat, e.g., 'Bb' stays 'Bb'
      - keep numeric extensions (7, 9, 11, 13, etc.) as-is
      - allow slash chords, and fix 'Fs' -> 'F#' on the bass side as well.
    """
    import re

    symbol = symbol.strip()
    if not symbol:
        return None
    if symbol == "N":  # no-chord token sometimes used
        return None

    if symbol.startswith("<") and symbol.endswith(">"):
        return None  # section marker, not a chord

    # Normalize 'min' -> 'm'
    symbol = symbol.replace("min", "m")

    # Convert 'Fs' => 'F#', etc.
    def fix_sharps(s: str) -> str:
        for note in ("A", "B", "C", "D", "E", "F", "G"):
            s = s.replace(note + "s", note + "#")
        return s

    if "/" in symbol:
        root, bass = symbol.split("/", 1)
        root = fix_sharps(root)
        bass = fix_sharps(bass)
        symbol = f"{root}/{bass}"
    else:
        symbol = fix_sharps(symbol)

    # Very loose sanity checks
    if not re.match(r"^[A-G]", symbol):
        return None

    if not re.match(r"^[A-G][A-Za-z0-9#/b]*$", symbol):
        return None

    return symbol


def parse_sections_and_chords(chords_str: str) -> Optional[Dict]:
    """
    Parse the `chords` text into:
      sections: [{ name: "INTRO", progression: [...]}, ...]
      unique_chords: sorted list of normalized chord symbols

    Return None if the song should be skipped (invalid chord).
    """
    tokens = chords_str.split()
    sections: List[Dict] = []

    current_name = "GLOBAL"
    current_progression: List[str] = []

    for tok in tokens:
        if tok.startswith("<") and tok.endswith(">"):
            # Flush previous section
            if current_progression:
                sections.append(
                    {"name": current_name.upper(), "progression": current_progression}
                )
                current_progression = []

            inner = tok[1:-1]  # e.g. intro_1
            base = inner.split("_")[0] if "_" in inner else inner
            current_name = base.upper()
        else:
            norm = normalize_chord_symbol(tok)
            if norm is None:
                return None
            current_progression.append(norm)

    if current_progression:
        sections.append(
            {"name": current_name.upper(), "progression": current_progression}
        )

    if not sections:
        return None

    unique = sorted({ch for sec in sections for ch in sec["progression"]})
    return {"sections": sections, "unique_chords": unique}


# --------- SPOTIFY INTEGRATION ---------


def get_spotify_token() -> Optional[str]:
    """
    Use Client Credentials flow to get a bearer token.
    See: https://developer.spotify.com/documentation/web-api
    """
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        print("[warn] SPOTIFY_CLIENT_ID/SECRET not set; will use placeholder titles.")
        return None

    try:
        import requests  # type: ignore
    except ImportError:
        print("[warn] The 'requests' library is not installed; cannot call Spotify.")
        print("       Install it with: pip install requests")
        return None

    auth = (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET)
    data = {"grant_type": "client_credentials"}

    resp = requests.post("https://accounts.spotify.com/api/token", data=data, auth=auth)
    resp.raise_for_status()
    token = resp.json().get("access_token")
    if not token:
        print("[warn] Failed to get Spotify access token; response:", resp.text)
    else:
        print("[info] Obtained Spotify access token.")
    return token


def fetch_spotify_track(
    spotify_id: str,
    token: str,
    cache: Dict[str, Tuple[str, str]],
) -> Optional[Tuple[str, str]]:
    """
    Fetch track title + artist name from Spotify for a given track ID.
    Uses a simple in-memory cache to avoid redundant calls.
    Returns (title, artist) or None on error.
    """
    if spotify_id in cache:
        return cache[spotify_id]

    import requests  # type: ignore

    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://api.spotify.com/v1/tracks/{spotify_id}"

    try:
        resp = requests.get(url, headers=headers)
        # Handle rate limiting (429)
        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", "1"))
            print(f"[spotify] Rate limited. Sleeping {retry_after}s…")
            time.sleep(retry_after)
            resp = requests.get(url, headers=headers)

        if resp.status_code != 200:
            # e.g. track removed / region-locked
            print(f"[spotify] Failed {spotify_id}: {resp.status_code} {resp.text[:80]}")
            return None

        data = resp.json()
        title = data.get("name")
        artists = data.get("artists") or []
        artist_name = artists[0]["name"] if artists else "Unknown Artist"

        if not title:
            return None

        cache[spotify_id] = (title, artist_name)
        return title, artist_name

    except Exception as e:
        print(f"[spotify] Error fetching {spotify_id}: {e}")
        return None


# --------- SONG OBJECT BUILDING ---------


def build_song_object(
    row: Dict,
    parsed: Dict,
    title: str,
    artist: str,
) -> Dict:
    """
    Build a ChordConnect-style Song object from:
      - CSV row
      - parsed chord structure
      - chosen title + artist (possibly from Spotify)
    """
    raw_id = row.get("id") or row.get("song_id") or row.get("track_id")
    if raw_id is None:
        raise ValueError("Row missing id/song_id/track_id")

    song_id = f"chrd-{raw_id}"

    artist_id = row.get("artist_id") or ""
    main_genre = row.get("main_genre") or ""
    decade = row.get("decade") or ""
    genres_str = row.get("genres") or ""

    genre_tags: List[str] = []
    if main_genre:
        genre_tags.append(f"genre:{main_genre}")
    if genres_str:
        genres_str_clean = genres_str.replace("'", "").strip()
        if genres_str_clean:
            for g in genres_str_clean.split():
                genre_tags.append(f"genre:{g}")
    if decade:
        genre_tags.append(f"decade:{decade}")
    if artist_id:
        genre_tags.append(f"artist_id:{artist_id}")

    unique_chords: List[str] = parsed["unique_chords"]
    sections: List[Dict] = parsed["sections"]

    # Simple difficulty heuristic
    if len(unique_chords) <= 4:
        difficulty = 1
    elif len(unique_chords) <= 6:
        difficulty = 2
    else:
        difficulty = 3

    song = {
        "id": song_id,
        "title": title,
        "artist": artist,
        "key": None,
        "tempo": None,
        "chords": unique_chords,
        "simplifiedChords": unique_chords,
        "sections": sections,
        "difficulty": difficulty,
        "tags": genre_tags,
        "source": "chordonomicon",
    }
    return song


# --------- MAIN ---------


def main() -> None:
    maybe_download_csv()

    if not RAW_CSV_PATH.exists():
        print(f"[error] CSV file still not found at {RAW_CSV_PATH}")
        raise SystemExit(1)

    # Try to get Spotify token (optional)
    spotify_token = get_spotify_token()
    track_cache: Dict[str, Tuple[str, str]] = {}

    print(f"[info] Reading CSV from {RAW_CSV_PATH}…")

    songs: List[Dict] = []
    total_rows = 0
    kept = 0
    skipped_invalid = 0
    skipped_complex = 0

    with open(RAW_CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        print(f"[info] CSV columns: {reader.fieldnames}")

        for row in reader:
            total_rows += 1

            chords_str = row.get("chords")
            if not chords_str:
                continue

            parsed = parse_sections_and_chords(chords_str)
            if parsed is None:
                skipped_invalid += 1
                continue

            unique_chords = parsed["unique_chords"]
            if len(unique_chords) > MAX_UNIQUE_CHORDS:
                skipped_complex += 1
                continue

            raw_id = row.get("id") or row.get("song_id") or row.get("track_id")
            if raw_id is None:
                row["id"] = str(total_rows)

            # --- Default synthetic title/artist ---
            default_title = f"Chordonomicon Song {raw_id}"
            artist_id = row.get("artist_id") or ""
            default_artist = f"Artist {artist_id}" if artist_id else "Unknown Artist"

            # --- Try to enrich with Spotify if possible ---
            title = default_title
            artist = default_artist
            spotify_song_id = (row.get("spotify_song_id") or "").strip()

            if spotify_token and spotify_song_id:
                info = fetch_spotify_track(spotify_song_id, spotify_token, track_cache)
                if info:
                    title, artist = info

            try:
                song = build_song_object(row, parsed, title, artist)
            except ValueError:
                skipped_invalid += 1
                continue

            songs.append(song)
            kept += 1

            if kept % 200 == 0:
                print(f"[progress] Kept {kept} songs so far (processed {total_rows})…")

            if MAX_SONGS is not None and kept >= MAX_SONGS:
                print(f"[info] Reached MAX_SONGS={MAX_SONGS}, stopping early.")
                break

    print(f"[summary] Processed rows: {total_rows}")
    print(f"[summary] Kept songs:    {kept}")
    print(f"[summary] Skipped invalid chords: {skipped_invalid}")
    print(f"[summary] Skipped too complex:    {skipped_complex}")

    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as out:
        json.dump(songs, out, indent=2)

    print(f"[done] Wrote {len(songs)} songs to {OUTPUT_JSON_PATH}")


if __name__ == "__main__":
    main()
