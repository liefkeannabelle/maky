import { Collection, Db, Filter } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

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

  // Extended metadata from JSON requirements
  key?: string;
  tempo?: number;
  simplifiedChords?: Chord[];
  sections?: Array<{ name: string; progression: Chord[] }>;
  difficulty?: number;
  tags?: string[];
  source?: string;
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

    const songs = await this.songs.find(filter).toArray();
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
   * Utility query to list entire catalog
   */
  async _getAllSongs(_params: Empty): Promise<Array<{ song: Song }>> {
    const songs = await this.songs.find({}).toArray();
    return songs.map((s) => ({ song: s }));
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
}
