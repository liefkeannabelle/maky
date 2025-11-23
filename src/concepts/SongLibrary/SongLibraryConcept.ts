import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { Song } from "../Song/SongConcept.ts";

// Declare collection prefix
const PREFIX = "SongLibrary" + ".";
const SONG_PREFIX = "Song" + ".";

// Types derived from Spec and JSON requirements
export type SongID = ID;
export type UserID = ID;
export type MasteryLevel = "in-progress" | "mastered" | "na";

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
    // Read-only access to Song concept's collection for joins
    this.songs = this.db.collection(SONG_PREFIX + "songs");
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * addUser (user: User)
   *
   * **requires** The `user` does not already exist in the set of Users.
   * **effects** Adds the `user` to the set of Users with an empty set of `SongProgresses`.
   */
  async addUser(
    params: { user: UserID },
  ): Promise<{ success: boolean } | { error: string }> {
    const existing = await this.users.findOne({ _id: params.user });
    if (existing) {
      return { error: "User already exists in library" };
    }

    await this.users.insertOne({
      _id: params.user,
      progress: [],
    });

    return { success: true };
  }

  /**
   * removeUser (user: User)
   *
   * **requires** The `user` exists.
   * **effects** Removes the `user` and all their associated `SongProgress` entries from the state.
   */
  async removeUser(
    params: { user: UserID },
  ): Promise<Empty | { error: string }> {
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

    const alreadyLearning = userDoc.progress.some((p) =>
      p.song === params.song
    );
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
      { $push: { progress: newProgress } },
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
          "progress.$.updatedAt": new Date(),
        },
      },
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
      { $pull: { progress: { song: params.song } } },
    );

    if (result.modifiedCount === 0) {
      return { error: "User was not learning this song or user not found" };
    }

    return {};
  }

  // --- Queries ---

  /**
   * _getSongsInProgress (user: User): (progresses: set of {song: Song, mastery: MasteryLevel})
   *
   * **effects** Returns all `SongProgress` entries for the given `user` with full song details.
   */
  async _getSongsInProgress(
    params: { user: UserID },
  ): Promise<Array<{ song: Song; mastery: MasteryLevel }>> {
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
}
