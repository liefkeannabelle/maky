import { Collection, Db, Filter } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { ChordDiagram } from "../../theory/chordDiagrams.ts";

const PREFIX = "Song.";

export type SongID = ID;
export type Chord = string;
export type Genre = string;

/**
 * Represents the Song structure based on requirements (data/songs.json)
 * and the concept spec.
 */
export interface Song {
  _id: SongID;
  title: string;
  artist: string;
  chords: Chord[];
  genre?: Genre;
  // Precomputed diagrams available for the song's chords.
  // Map from chord symbol -> array of diagrams (may be empty if none available)
  availableChordDiagrams?: Record<string, ChordDiagram[]>;

  // Extended metadata from JSON requirements
  key?: string;
  tempo?: number;
  simplifiedChords?: Chord[];
  sections?: Array<{ name: string; progression: Chord[] }>;
  difficulty?: number;
  tags?: string[];
  source?: string;
  
  // Spotify metadata
  previewUrl?: string;    // 30s audio preview URL (may be null, deprecated by Spotify)
  albumArtUrl?: string;   // Album cover image URL
}

export default class SongConcept {
  songs: Collection<Song>;

  constructor(private readonly db: Db) {
    this.songs = this.db.collection(PREFIX + "songs");
  }

  /**
   * createSong (title: String, artist: String, chords: String[], genre: optional Genre, ...extras): (song: Song)
   *
   * **requires** No Song with the given `title` and `artist` already exists (to avoid duplicates).
   * **effects** Creates a new Song; sets the metadata; returns the new song.
   */
  async createSong(params: {
    id?: string; // Allow manual ID override for seeding
    title: string;
    artist: string;
    chords: string[];
    genre?: string;
    // Optional fields to support the rich JSON dataset
    key?: string;
    tempo?: number;
    simplifiedChords?: string[];
    sections?: Array<{ name: string; progression: string[] }>;
    difficulty?: number;
    tags?: string[];
    source?: string;
    // Spotify metadata
    previewUrl?: string;
    albumArtUrl?: string;
  }): Promise<{ song: Song } | { error: string }> {
    const existing = await this.songs.findOne({
      title: params.title,
      artist: params.artist,
    });

    if (existing) {
      return { error: "Song already exists" };
    }

    const newSong: Song = {
      _id: (params.id as ID) ?? freshID(),
      title: params.title,
      artist: params.artist,
      chords: params.chords,
      genre: params.genre,
      key: params.key,
      tempo: params.tempo,
      simplifiedChords: params.simplifiedChords,
      sections: params.sections,
      difficulty: params.difficulty,
      tags: params.tags,
      source: params.source,
      previewUrl: params.previewUrl,
      albumArtUrl: params.albumArtUrl,
    };

    await this.songs.insertOne(newSong);
    return { song: newSong };
  }

  /**
   * deleteSong (song: Song)
   *
   * **requires** The Song `song` exists.
   * **effects** Removes the `song` from the set of Songs.
   */
  async deleteSong(
    params: { song: SongID },
  ): Promise<Empty | { error: string }> {
    const songExists = await this.songs.findOne({ _id: params.song });
    if (!songExists) {
      return { error: "Song does not exist" };
    }

    await this.songs.deleteOne({ _id: params.song });
    return {};
  }

  /**
   * updateSong (song: Song, updates: Partial<Song>)
   *
   * **requires** The Song exists.
   * **effects** Applies partial updates to the Song document.
   */
  async updateSong(params: { song: SongID; updates: Partial<Song> }): Promise<Empty | { error: string }> {
    const songExists = await this.songs.findOne({ _id: params.song });
    if (!songExists) return { error: "Song does not exist" };

    await this.songs.updateOne({ _id: params.song }, { $set: params.updates });
    return {};
  }

  // --- Queries ---

  /**
   * _getPlayableSongs (knownChords: set of Chord, genres: optional set of Genre): (songs: set of Song)
   *
   * **effects** Returns songs whose `chords` are a subset of `knownChords`.
   * If `genres` are provided, filters by genre.
   */
  async _getPlayableSongs(params: {
    knownChords: Chord[];
    genres?: Genre[];
    limit?: number;
    skip?: number;
  }): Promise<Array<{ song: Song }>> {
    // Base filter
    const filter: Filter<Song> = {};

    // 1. Genre Filter
    if (params.genres && params.genres.length > 0) {
      // Check both 'genre' field and 'tags' array from JSON shape
      filter.$or = [
        { genre: { $in: params.genres } },
        { tags: { $in: params.genres } },
      ];
    }

    // 2. Chord Subset Logic
    // We want songs where EVERY chord in song.chords is IN params.knownChords.
    // In MongoDB logic: We want songs where there is NO chord that is NOT in knownChords.
    // { chords: { $not: { $elemMatch: { $nin: knownChords } } } }
    if (params.knownChords) {
      filter.chords = {
        $not: {
          $elemMatch: { $nin: params.knownChords },
        },
      };
    }

    const limit = params.limit || 100;
    const skip = params.skip || 0;

    const songs = await this.songs
      .find(filter)
      .sort({ difficulty: 1 }) // Easier songs first
      .skip(skip)
      .limit(limit)
      .toArray();
    
    return songs.map((s) => ({ song: s }));
  }

  /**
   * _filterSongsByGenre (genre: Genre): (songs: set of Song)
   *
   * **effects** Returns songs associated with the specified `genre`.
   */
  async _filterSongsByGenre(
    params: { genre: Genre },
  ): Promise<Array<{ song: Song }>> {
    const songs = await this.songs.find({
      $or: [
        { genre: params.genre },
        { tags: params.genre },
      ],
    }).toArray();

    return songs.map((s) => ({ song: s }));
  }

  /**
   * _getAllSongs (): (songs: Song[])
   * Utility query to list entire catalog with optional pagination
   */
  async _getAllSongs(params: { 
    limit?: number; 
    skip?: number;
    sortBy?: "title" | "artist" | "difficulty";
    sortOrder?: "asc" | "desc";
  }): Promise<Array<{ song: Song }>> {
    const limit = params.limit || 50; // Default: 50 songs per page
    const skip = params.skip || 0;
    const sortField = params.sortBy || "title";
    const sortOrder = params.sortOrder === "desc" ? -1 : 1;

    const songs = await this.songs
      .find({})
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    return songs.map((s) => ({ song: s }));
  }

  /**
   * _getSongCount (): (count: number)
   * Get total count of songs in the catalog
   */
  async _getSongCount(_params: Empty): Promise<{ count: number }> {
    const count = await this.songs.countDocuments({});
    return { count };
  }

  /**
   * _getAllSongsForRecommendation (): (songs: Array<{_id, chords, difficulty}>)
   * Optimized query for recommendation engine - only fetches needed fields
   * This reduces data transfer by ~80% compared to fetching full song objects
   */
  async _getAllSongsForRecommendation(_params: Empty): Promise<Array<{ _id: ID; chords: Chord[]; difficulty?: number }>> {
    const songs = await this.songs
      .find({}, { projection: { _id: 1, chords: 1, difficulty: 1 } })
      .toArray();
    
    return songs.map((s) => ({
      _id: s._id,
      chords: s.chords,
      difficulty: s.difficulty,
    }));
  }

  /**
   * _searchByTitleOrArtist (query: String): (songs: set of Song)
   *
   * **effects** Returns songs where the title or artist matches the query string (case-insensitive).
   */
  async _searchByTitleOrArtist(
    { query }: { query: string },
  ): Promise<Array<{ song: Song }>> {
    if (!query || query.trim() === "") return [];

    const results = await this.songs.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { artist: { $regex: query, $options: "i" } },
      ],
    }).limit(20).toArray();

    return results.map((s) => ({ song: s }));
  }

  /**
   * _getSuggestedSongs (knownChords: set of Chord): (songs: set of SuggestedSong)
   *
   * **effects** Returns songs ranked by how "close" the user is to playing them.
   * Each result includes the song, the number of known chords, and which chords are missing.
   * This is useful when the user knows few chords and no songs are fully playable.
   */
  async _getSuggestedSongs(params: {
    knownChords: Chord[];
    limit?: number;
  }): Promise<Array<{ 
    song: Song; 
    knownCount: number; 
    totalChords: number;
    missingChords: Chord[];
    percentComplete: number;
  }>> {
    const knownSet = new Set(params.knownChords);
    const limit = params.limit || 10;

    // Fetch all songs (could be optimized with aggregation pipeline)
    const allSongs = await this.songs.find({}).toArray();

    // Calculate "closeness" for each song
    const scoredSongs = allSongs.map(song => {
      const uniqueChords = [...new Set(song.chords)];
      const totalChords = uniqueChords.length;
      const knownCount = uniqueChords.filter(c => knownSet.has(c)).length;
      const missingChords = uniqueChords.filter(c => !knownSet.has(c));
      const percentComplete = totalChords > 0 ? (knownCount / totalChords) * 100 : 0;

      return {
        song,
        knownCount,
        totalChords,
        missingChords,
        percentComplete,
      };
    });

    // Sort by: 
    // 1. Fewest missing chords first (closer to playable)
    // 2. Then by percentage complete (higher is better)
    // 3. Then by difficulty (easier first)
    scoredSongs.sort((a, b) => {
      const missingDiff = a.missingChords.length - b.missingChords.length;
      if (missingDiff !== 0) return missingDiff;
      
      const percentDiff = b.percentComplete - a.percentComplete;
      if (percentDiff !== 0) return percentDiff;
      
      return (a.song.difficulty || 0) - (b.song.difficulty || 0);
    });

    // Filter out songs with 0 known chords (not relevant) and return top results
    return scoredSongs
      .filter(s => s.knownCount > 0)
      .slice(0, limit);
  }
}
