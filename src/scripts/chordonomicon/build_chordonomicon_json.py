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
       - preview_url -> 30s audio preview
       - album art -> Cover image
  5. Write data/chordonomicon_songs.json in your Song schema.

Usage:
  # First run (or fresh start):
  python build_chordonomicon_json.py

  # Resume from where you left off (uses existing JSON):
  python build_chordonomicon_json.py --resume

  # Force refresh all songs (re-fetch from Spotify):
  python build_chordonomicon_json.py --refresh

  # Set custom limits:
  python build_chordonomicon_json.py --max-songs 500 --skip 100
"""

import argparse
import csv
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Try to load .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    # Load .env from backend directory
    SCRIPT_DIR = Path(__file__).parent.resolve()
    BACKEND_DIR = SCRIPT_DIR.parent.parent.parent  # maky-backend/
    ENV_PATH = BACKEND_DIR / ".env"
    if ENV_PATH.exists():
        load_dotenv(ENV_PATH)
        print(f"[info] Loaded environment from {ENV_PATH}")
    else:
        # Also try parent directory (workspace root)
        WORKSPACE_ENV = BACKEND_DIR.parent / ".env"
        if WORKSPACE_ENV.exists():
            load_dotenv(WORKSPACE_ENV)
            print(f"[info] Loaded environment from {WORKSPACE_ENV}")
except ImportError:
    print("[warn] python-dotenv not installed. Using system environment variables only.")
    print("       Install with: pip install python-dotenv")
    SCRIPT_DIR = Path(__file__).parent.resolve()
    BACKEND_DIR = SCRIPT_DIR.parent.parent.parent

# ------------ CONFIG ------------

CHORDONOMICON_URL = (
    "https://huggingface.co/datasets/ailsntua/Chordonomicon/resolve/main/chordonomicon_v2.csv"
)

# Paths are already set above when loading .env
RAW_DIR = BACKEND_DIR / "data" / "raw"
RAW_CSV_PATH = RAW_DIR / "chordonomicon_v2.csv"

OUTPUT_JSON_PATH = BACKEND_DIR / "data" / "chordonomicon_songs.json"

# Default limits (can be overridden via CLI)
DEFAULT_MAX_SONGS = 2000
DEFAULT_SKIP_FIRST_N = 0

# Filter out songs with too many distinct chords
MAX_UNIQUE_CHORDS = 8

# Rate limiting settings
MAX_RETRIES = 3
BASE_RETRY_DELAY = 5  # seconds

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


def fetch_artist_genres(
    artist_id: str,
    token: str,
    artist_cache: Dict[str, List[str]],
) -> List[str]:
    """
    Fetch genres for an artist from Spotify's Artist API.
    Uses a simple in-memory cache to avoid redundant calls.
    Returns list of genre strings or empty list on error.
    """
    if artist_id in artist_cache:
        return artist_cache[artist_id]

    import requests  # type: ignore

    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://api.spotify.com/v1/artists/{artist_id}"

    try:
        resp = requests.get(url, headers=headers)
        # Handle rate limiting (429)
        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", "1"))
            print(f"[spotify] Rate limited on artist. Sleeping {retry_after}s…")
            time.sleep(retry_after)
            resp = requests.get(url, headers=headers)

        if resp.status_code != 200:
            artist_cache[artist_id] = []
            return []

        data = resp.json()
        genres = data.get("genres") or []
        artist_cache[artist_id] = genres
        return genres

    except Exception as e:
        print(f"[spotify] Error fetching artist {artist_id}: {e}")
        artist_cache[artist_id] = []
        return []


# Type alias for Spotify track data tuple
# (title, artist, genres, preview_url, album_art_url)
SpotifyTrackData = Tuple[str, str, List[str], Optional[str], Optional[str]]


def handle_rate_limit(resp, retry_count: int = 0) -> Optional[int]:
    """
    Handle Spotify rate limiting with exponential backoff.
    Returns the number of seconds to wait, or None if max retries exceeded.
    """
    if resp.status_code != 429:
        return 0
    
    if retry_count >= MAX_RETRIES:
        print(f"[spotify] Max retries ({MAX_RETRIES}) exceeded. Skipping this request.")
        return None
    
    retry_after = int(resp.headers.get("Retry-After", BASE_RETRY_DELAY))
    # Add exponential backoff
    wait_time = retry_after + (BASE_RETRY_DELAY * retry_count)
    print(f"[spotify] Rate limited. Waiting {wait_time}s (retry {retry_count + 1}/{MAX_RETRIES})…")
    time.sleep(wait_time)
    return wait_time


def search_spotify_for_preview(
    title: str,
    artist: str,
    token: str,
) -> Optional[Tuple[str, str]]:
    """
    Use Spotify's Search API to find a track and get its preview URL.
    The Search API is more reliable for preview URLs than the direct track lookup.
    
    Returns (preview_url, album_art_url) or None if not found.
    """
    import requests  # type: ignore
    import urllib.parse
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Build search query: track:"title" artist:"artist"
    query = f'track:"{title}" artist:"{artist}"'
    encoded_query = urllib.parse.quote(query)
    url = f"https://api.spotify.com/v1/search?q={encoded_query}&type=track&limit=1"
    
    for retry in range(MAX_RETRIES):
        try:
            resp = requests.get(url, headers=headers)
            
            if resp.status_code == 429:
                wait = handle_rate_limit(resp, retry)
                if wait is None:
                    return None
                continue
            
            if resp.status_code != 200:
                return None
            
            data = resp.json()
            tracks = data.get("tracks", {}).get("items", [])
            
            if not tracks:
                return None
            
            track = tracks[0]
            preview_url = track.get("preview_url")
            
            # Get album art
            album_art_url = None
            album = track.get("album") or {}
            images = album.get("images") or []
            if images:
                for img in images:
                    if img.get("height") == 300 or img.get("width") == 300:
                        album_art_url = img.get("url")
                        break
                if not album_art_url and images:
                    album_art_url = images[0].get("url")
            
            return (preview_url, album_art_url)
        
        except Exception as e:
            print(f"[spotify-search] Error searching for {title} by {artist}: {e}")
            return None
    
    return None


def fetch_preview_via_scraping(title: str, artist: str) -> Optional[str]:
    """
    Use the Node.js spotify-preview-finder to scrape the preview URL.
    This is a fallback when Spotify API returns null for preview_url.
    
    Returns the preview URL string or None.
    """
    script_path = SCRIPT_DIR / "getPreviewUrl.js"
    
    if not script_path.exists():
        return None
    
    try:
        # Call the Node.js helper script
        result = subprocess.run(
            ["node", str(script_path), title, artist],
            capture_output=True,
            text=True,
            timeout=30,  # 30 second timeout
            cwd=str(BACKEND_DIR)  # Run from backend dir where node_modules lives
        )
        
        if result.returncode != 0:
            return None
        
        output = result.stdout.strip()
        if not output:
            return None
        
        data = json.loads(output)
        preview_url = data.get("previewUrl")
        
        if preview_url:
            print(f"[scraper] Found preview via web scraping for: {title}")
        
        return preview_url
        
    except subprocess.TimeoutExpired:
        print(f"[scraper] Timeout fetching preview for: {title}")
        return None
    except json.JSONDecodeError:
        return None
    except Exception as e:
        print(f"[scraper] Error: {e}")
        return None


def fetch_spotify_track(
    spotify_id: str,
    token: str,
    cache: Dict[str, SpotifyTrackData],
    artist_cache: Dict[str, List[str]],
) -> Optional[SpotifyTrackData]:
    """
    Fetch track title + artist name + genres + preview_url + album art from Spotify.
    Uses a simple in-memory cache to avoid redundant calls.
    Returns (title, artist, genres, preview_url, album_art_url) or None on error.
    
    Note: preview_url is deprecated by Spotify and may be null for many tracks.
    """
    if spotify_id in cache:
        return cache[spotify_id]

    import requests  # type: ignore

    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://api.spotify.com/v1/tracks/{spotify_id}"

    for retry in range(MAX_RETRIES):
        try:
            resp = requests.get(url, headers=headers)
            
            # Handle rate limiting (429)
            if resp.status_code == 429:
                wait = handle_rate_limit(resp, retry)
                if wait is None:
                    return None
                continue

            if resp.status_code != 200:
                # e.g. track removed / region-locked
                print(f"[spotify] Failed {spotify_id}: {resp.status_code} {resp.text[:80]}")
                return None

            data = resp.json()
            title = data.get("name")
            artists = data.get("artists") or []
            artist_name = artists[0]["name"] if artists else "Unknown Artist"
            
            # Get preview URL (deprecated by Spotify, may be null)
            preview_url = data.get("preview_url")
            
            # Get album art (prefer medium size ~300px)
            album_art_url = None
            album = data.get("album") or {}
            images = album.get("images") or []
            if images:
                # Images are sorted by size (widest first)
                # Try to get medium size (~300px) or fallback to first available
                for img in images:
                    if img.get("height") == 300 or img.get("width") == 300:
                        album_art_url = img.get("url")
                        break
                if not album_art_url and images:
                    album_art_url = images[0].get("url")  # Fallback to largest
            
            # Get artist ID to fetch genres
            genres: List[str] = []
            if artists and artists[0].get("id"):
                artist_spotify_id = artists[0]["id"]
                genres = fetch_artist_genres(artist_spotify_id, token, artist_cache)

            if not title:
                return None

            # If preview_url is missing, try the Search API as a fallback
            # The Search API is more reliable for preview URLs
            if not preview_url and title and artist_name:
                search_result = search_spotify_for_preview(title, artist_name, token)
                if search_result:
                    search_preview, search_art = search_result
                    if search_preview:
                        preview_url = search_preview
                        print(f"[spotify-search] Found preview via search for: {title}")
                    if search_art and not album_art_url:
                        album_art_url = search_art
            
            # If still no preview URL, try web scraping as last resort
            if not preview_url and title and artist_name:
                scraped_preview = fetch_preview_via_scraping(title, artist_name)
                if scraped_preview:
                    preview_url = scraped_preview

            cache[spotify_id] = (title, artist_name, genres, preview_url, album_art_url)
            return title, artist_name, genres, preview_url, album_art_url

        except Exception as e:
            print(f"[spotify] Error fetching {spotify_id}: {e}")
            return None
    
    return None


# --------- SONG OBJECT BUILDING ---------


def build_song_object(
    row: Dict,
    parsed: Dict,
    title: str,
    artist: str,
    spotify_genres: List[str] = None,
    preview_url: Optional[str] = None,
    album_art_url: Optional[str] = None,
) -> Dict:
    """
    Build a ChordConnect-style Song object from:
      - CSV row
      - parsed chord structure
      - chosen title + artist (possibly from Spotify)
      - genres from Spotify artist API
      - preview_url (30s audio preview, may be null)
      - album_art_url (album cover image)
    """
    raw_id = row.get("id") or row.get("song_id") or row.get("track_id")
    if raw_id is None:
        raise ValueError("Row missing id/song_id/track_id")

    song_id = f"chrd-{raw_id}"

    artist_id = row.get("artist_id") or ""
    main_genre = row.get("main_genre") or ""
    decade = row.get("decade") or ""
    genres_str = row.get("genres") or ""

    # Build tags from CSV data
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

    # Determine primary genre from Spotify or CSV
    # Priority: Spotify genres > CSV main_genre
    primary_genre = None
    all_genres: List[str] = []
    
    if spotify_genres:
        all_genres = spotify_genres
        # Pick the first genre as primary (usually most relevant)
        primary_genre = spotify_genres[0] if spotify_genres else None
        # Add Spotify genres to tags
        for g in spotify_genres[:5]:  # Limit to top 5 genres
            tag = f"spotify_genre:{g}"
            if tag not in genre_tags:
                genre_tags.append(tag)
    elif main_genre:
        primary_genre = main_genre

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
        "genre": primary_genre,  # Now populated from Spotify!
        "key": None,
        "tempo": None,
        "chords": unique_chords,
        "simplifiedChords": unique_chords,
        "sections": sections,
        "difficulty": difficulty,
        "tags": genre_tags,
        "source": "chordonomicon",
        "previewUrl": preview_url,  # 30s audio preview (may be null)
        "albumArtUrl": album_art_url,  # Album cover image
    }
    return song


# --------- MAIN ---------


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Build ChordConnect song JSON from Chordonomicon dataset with Spotify enrichment."
    )
    parser.add_argument(
        "--resume", "-r",
        action="store_true",
        help="Resume from existing JSON file (skip already processed songs)"
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Force refresh all songs (re-fetch from Spotify, ignores existing JSON)"
    )
    parser.add_argument(
        "--max-songs", "-m",
        type=int,
        default=DEFAULT_MAX_SONGS,
        help=f"Maximum number of songs to process (default: {DEFAULT_MAX_SONGS})"
    )
    parser.add_argument(
        "--skip", "-s",
        type=int,
        default=DEFAULT_SKIP_FIRST_N,
        help="Skip the first N rows in CSV (useful for manual resumption)"
    )
    parser.add_argument(
        "--no-spotify",
        action="store_true",
        help="Skip Spotify API calls (use placeholder data)"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    
    # Override config with CLI args
    max_songs = args.max_songs
    skip_first_n = args.skip
    use_spotify = not args.no_spotify
    
    maybe_download_csv()

    # Try to get Spotify token (optional)
    spotify_token = None
    if use_spotify:
        spotify_token = get_spotify_token()
    else:
        print("[info] Skipping Spotify API calls (--no-spotify flag)")
    
    track_cache: Dict[str, SpotifyTrackData] = {}  # Includes genres, preview_url, album_art
    artist_cache: Dict[str, List[str]] = {}  # Cache for artist genres

    print(f"[info] Reading CSV from {RAW_CSV_PATH}…")

    # Load existing songs if resuming or if file exists
    existing_songs: List[Dict] = []
    existing_ids: set = set()
    
    if args.refresh:
        print("[info] --refresh flag: Starting fresh, ignoring existing JSON")
    elif OUTPUT_JSON_PATH.exists():
        print(f"[info] Loading existing songs from {OUTPUT_JSON_PATH}...")
        try:
            with open(OUTPUT_JSON_PATH, "r", encoding="utf-8") as f:
                existing_songs = json.load(f)
            existing_ids = {s["id"] for s in existing_songs}
            print(f"[info] Found {len(existing_songs)} existing songs.")
            
            if args.resume:
                print("[info] --resume flag: Will skip songs already in JSON")
        except json.JSONDecodeError:
            print(f"[warn] Could not decode {OUTPUT_JSON_PATH}, starting fresh.")
            existing_songs = []

    songs: List[Dict] = existing_songs if not args.refresh else []
    if args.refresh:
        existing_ids = set()
    
    total_rows = 0
    kept = len(songs)
    skipped_invalid = 0
    skipped_complex = 0
    skipped_no_metadata = 0
    skipped_for_resume = 0
    skipped_duplicate = 0
    preview_urls_found = 0

    try:
        with open(RAW_CSV_PATH, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            print(f"[info] CSV columns: {reader.fieldnames}")

            for row in reader:
                total_rows += 1

                # Skip rows if we're resuming from a specific point
                if skip_first_n > 0 and total_rows <= skip_first_n:
                    skipped_for_resume += 1
                    continue

                chords_str = row.get("chords")
                if not chords_str:
                    continue

                # Check for duplicates early if possible
                raw_id = row.get("id") or row.get("song_id") or row.get("track_id")
                if raw_id is None:
                    # If we can't determine ID yet, we'll check later, but we assign one below
                    pass
                else:
                    song_id = f"chrd-{raw_id}"
                    if song_id in existing_ids:
                        skipped_duplicate += 1
                        continue

                parsed = parse_sections_and_chords(chords_str)
                if parsed is None:
                    skipped_invalid += 1
                    continue

                unique_chords = parsed["unique_chords"]
                if len(unique_chords) > MAX_UNIQUE_CHORDS:
                    skipped_complex += 1
                    continue

                if raw_id is None:
                    row["id"] = str(total_rows)
                    raw_id = str(total_rows)
                    song_id = f"chrd-{raw_id}"
                    # Check duplicate again just in case
                    if song_id in existing_ids:
                        skipped_duplicate += 1
                        continue

                # --- Default synthetic title/artist ---
                default_title = f"Chordonomicon Song {raw_id}"
                artist_id = row.get("artist_id") or ""
                default_artist = f"Artist {artist_id}" if artist_id else "Unknown Artist"

                # --- Try to enrich with Spotify if possible ---
                title = default_title
                artist = default_artist
                spotify_genres: List[str] = []
                preview_url: Optional[str] = None
                album_art_url: Optional[str] = None
                spotify_song_id = (row.get("spotify_song_id") or "").strip()

                if spotify_token and spotify_song_id:
                    info = fetch_spotify_track(spotify_song_id, spotify_token, track_cache, artist_cache)
                    if info:
                        title, artist, spotify_genres, preview_url, album_art_url = info

                # --- Filter out placeholder names ---
                # We only want songs with valid metadata (real title/artist)
                # Check both before AND after Spotify enrichment
                if (title.startswith("Chordonomicon Song") or 
                    artist.startswith("Artist ") or 
                    artist == "Unknown Artist" or
                    "Unknown" in artist):
                    skipped_no_metadata += 1
                    continue

                try:
                    song = build_song_object(row, parsed, title, artist, spotify_genres, preview_url, album_art_url)
                except ValueError:
                    skipped_invalid += 1
                    continue

                # Track preview URL statistics
                if preview_url:
                    preview_urls_found += 1

                songs.append(song)
                existing_ids.add(song["id"])
                kept += 1

                if kept % 50 == 0:
                    print(f"[progress] Kept {kept} songs so far (processed {total_rows})…")
                    # Print stats
                    genres_found = sum(1 for s in songs if s.get("genre"))
                    previews_found = sum(1 for s in songs if s.get("previewUrl"))
                    print(f"[progress] Songs with genres: {genres_found}, with previews: {previews_found}")
                    
                    # Periodic save
                    print(f"[save] Saving progress to {OUTPUT_JSON_PATH}...")
                    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
                    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as out:
                        json.dump(songs, out, indent=2)

                if max_songs is not None and kept >= max_songs:
                    print(f"[info] Reached max_songs={max_songs}, stopping early.")
                    break

    except KeyboardInterrupt:
        print("\n[info] Interrupted by user. Saving progress...")
    except Exception as e:
        print(f"\n[error] Unexpected error: {e}")
        print("[info] Saving progress before exiting...")
    
    print(f"[summary] Processed rows: {total_rows}")
    print(f"[summary] Kept songs:    {kept}")
    print(f"[summary] Skipped for resume:     {skipped_for_resume}")
    print(f"[summary] Skipped duplicates:     {skipped_duplicate}")
    print(f"[summary] Skipped invalid chords: {skipped_invalid}")
    print(f"[summary] Skipped too complex:    {skipped_complex}")
    print(f"[summary] Skipped no metadata:    {skipped_no_metadata}")
    
    # Spotify statistics
    genres_found = sum(1 for s in songs if s.get("genre"))
    previews_found = sum(1 for s in songs if s.get("previewUrl"))
    album_art_found = sum(1 for s in songs if s.get("albumArtUrl"))
    print(f"[summary] Songs with genre:       {genres_found}")
    print(f"[summary] Songs with preview URL: {previews_found}")
    print(f"[summary] Songs with album art:   {album_art_found}")

    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as out:
        json.dump(songs, out, indent=2)

    print(f"[done] Wrote {len(songs)} songs to {OUTPUT_JSON_PATH}")


if __name__ == "__main__":
    main()
