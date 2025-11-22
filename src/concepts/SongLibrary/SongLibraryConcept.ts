import { Collection, Db, Filter } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix
const PREFIX = "SongLibrary" + ".";

// Types derived from Spec and JSON requirements
export type SongID = ID;
export type UserID = ID;
export type Chord = string; // e.g., "G", "Cm7"
export type Genre = string;

export type MasteryLevel = "in-progress" | "mastered" | "na";

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

interface SongProgress {
  song: SongID;
  mastery: MasteryLevel;
  updatedAt: Date;
}

/**
 * User state tracking song progress
 */
interface UserState {
  _id: UserID;
  progress: SongProgress[];
}

export default class SongLibraryConcept {
  songs: Collection<Song>;
  users: Collection<UserState>;

  constructor(private readonly db: Db) {
    this.songs = this.db.collection(PREFIX + "songs");
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * addSong (title: String, artist: String, chords: String[], genre: optional Genre, ...extras): (song: Song)
   * 
   * **requires** No Song with the given `title` and `artist` already exists (to avoid duplicates).
   * **effects** Creates a new Song; sets the metadata; returns the new song.
   */
  async addSong(params: {
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
   * removeSong (song: Song)
   * 
   * **requires** The Song `song` exists.
   * **effects** Removes the `song` from the set of Songs. Also removes all `SongProgress` entries across all users.
   */
  async removeSong(params: { song: SongID }): Promise<Empty | { error: string }> {
    const songExists = await this.songs.findOne({ _id: params.song });
    if (!songExists) {
      return { error: "Song does not exist" };
    }

    // 1. Remove the song
    await this.songs.deleteOne({ _id: params.song });

    // 2. Remove references from all users' progress
    await this.users.updateMany(
      {},
      { $pull: { progress: { song: params.song } } }
    );

    return {};
  }

  /**
   * addUser (user: User)
   * 
   * **requires** The `user` does not already exist in the set of Users.
   * **effects** Adds the `user` to the set of Users with an empty set of `SongProgresses`.
   */
  async addUser(params: { user: UserID }): Promise<Empty | { error: string }> {
    const existing = await this.users.findOne({ _id: params.user });
    if (existing) {
      return { error: "User already exists in library" };
    }

    await this.users.insertOne({
      _id: params.user,
      progress: [],
    });

    return {};
  }

  /**
   * removeUser (user: User)
   * 
   * **requires** The `user` exists.
   * **effects** Removes the `user` and all their associated `SongProgress` entries from the state.
   */
  async removeUser(params: { user: UserID }): Promise<Empty | { error: string }> {
    const result = await this.users.deleteOne({ _id: params.user });
    if (result.deletedCount === 0) {
      return { error: "User not found" };
    }
    return {};
  }

  /**
   * startLearningSong (user: User, song: Song, mastery: MasteryLevel)
   * 
   * **requires** The `user` and `song` exist. The user does not already have a `SongProgress` entry for this `song`.
   * **effects** Creates a new `SongProgress` entry for the given `user`.
   */
  async startLearningSong(params: {
    user: UserID;
    song: SongID;
    mastery: MasteryLevel;
  }): Promise<Empty | { error: string }> {
    const songDoc = await this.songs.findOne({ _id: params.song });
    if (!songDoc) return { error: "Song not found" };

    const userDoc = await this.users.findOne({ _id: params.user });
    if (!userDoc) return { error: "User not found" };

    const alreadyLearning = userDoc.progress.some((p) => p.song === params.song);
    if (alreadyLearning) {
      return { error: "User is already learning this song" };
    }

    const newProgress: SongProgress = {
      song: params.song,
      mastery: params.mastery,
      updatedAt: new Date(),
    };

    await this.users.updateOne(
      { _id: params.user },
      { $push: { progress: newProgress } }
    );

    return {};
  }

  /**
   * updateSongMastery (user: User, song: Song, newMastery: MasteryLevel)
   * 
   * **requires** A `SongProgress` entry exists for the given `user` and `song`.
   * **effects** Updates the `mastery` of the existing `SongProgress` entry.
   */
  async updateSongMastery(params: {
    user: UserID;
    song: SongID;
    newMastery: MasteryLevel;
  }): Promise<Empty | { error: string }> {
    const userDoc = await this.users.findOne({
      _id: params.user,
      "progress.song": params.song,
    });

    if (!userDoc) {
      return { error: "User is not tracking this song" };
    }

    await this.users.updateOne(
      { _id: params.user, "progress.song": params.song },
      { 
        $set: { 
          "progress.$.mastery": params.newMastery,
          "progress.$.updatedAt": new Date()
        } 
      }
    );

    return {};
  }

  /**
   * stopLearningSong (user: User, song: Song)
   * 
   * **requires** A `SongProgress` entry exists for the given `user` and `song`.
   * **effects** Deletes the `SongProgress` entry.
   */
  async stopLearningSong(params: {
    user: UserID;
    song: SongID;
  }): Promise<Empty | { error: string }> {
    const result = await this.users.updateOne(
      { _id: params.user },
      { $pull: { progress: { song: params.song } } }
    );

    if (result.modifiedCount === 0) {
      return { error: "User was not learning this song or user not found" };
    }

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
        { tags: { $in: params.genres } }
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
   * _getSongsInProgress (user: User): (progresses: set of {song: Song, mastery: MasteryLevel})
   * 
   * **effects** Returns all `SongProgress` entries for the given `user` with full song details.
   */
  async _getSongsInProgress(params: { user: UserID }): Promise<Array<{ song: Song; mastery: MasteryLevel }>> {
    const userDoc = await this.users.findOne({ _id: params.user });
    if (!userDoc || !userDoc.progress.length) {
      return [];
    }

    // Get all song IDs from progress
    const songIds = userDoc.progress.map((p) => p.song);

    // Fetch song details
    const songs = await this.songs.find({ _id: { $in: songIds } }).toArray();
    
    // Map back to result structure
    const result: Array<{ song: Song; mastery: MasteryLevel }> = [];
    
    for (const progress of userDoc.progress) {
      const songDetails = songs.find((s) => s._id === progress.song);
      if (songDetails) {
        result.push({
          song: songDetails,
          mastery: progress.mastery,
        });
      }
    }

    return result;
  }

  /**
   * _filterSongsByGenre (genre: Genre): (songs: set of Song)
   * 
   * **effects** Returns songs associated with the specified `genre`.
   */
  async _filterSongsByGenre(params: { genre: Genre }): Promise<Array<{ song: Song }>> {
    const songs = await this.songs.find({
      $or: [
        { genre: params.genre },
        { tags: params.genre }
      ]
    }).toArray();

    return songs.map((s) => ({ song: s }));
  }
  
  /**
   * _getAllSongs (): (songs: Song[])
   * Utility query to list entire catalog
   */
  async _getAllSongs(_params: Empty): Promise<Array<{ song: Song }>> {
    const songs = await this.songs.find({}).toArray();
    return songs.map(s => ({ song: s }));
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