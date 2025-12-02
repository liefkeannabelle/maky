/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions
  // "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  // "/api/UserAccount/register": "anyone can register",

  "/api/Song/createSong": "Admin action",
  "/api/Song/deleteSong": "Admin action",
  "/api/Chord/createChord": "Admin action",
  "/api/Chord/deleteChord": "Admin action",
  "/api/RecommendationEngine/_getRecommendation":
    "Public query for recommendation details",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  // "/api/LikertSurvey/addQuestion",
  "/api/Sessioning/create",
  "/api/Sessioning/delete",
  "/api/Sessioning/removeAllSessionsForUser",
  "/api/Sessioning/_getUser",
  "/api/UserAccount/changePassword",
  "/api/UserAccount/login",
  "/api/UserAccount/updateCredentials",
  "/api/UserAccount/setKidAccountStatus",
  "/api/UserAccount/setPrivateAccountStatus",
  "/api/UserAccount/deleteAccount",
  "/api/UserAccount/_getUserByUsername",
  "/api/UserAccount/_isKidOrPrivateAccount",
  "/api/ChordLibrary/addUser",
  "/api/ChordLibrary/addChordToInventory",
  "/api/ChordLibrary/updateChordMastery",
  "/api/ChordLibrary/removeChordFromInventory",
  "/api/ChordLibrary/removeUser",
  "/api/ChordLibrary/_getKnownChords",
  "/api/ChordLibrary/_getChordMastery",
  "/api/Comment/addCommentToPost",
  "/api/Comment/deleteComment",
  "/api/Comment/editComment",
  "/api/Comment/removeAllCommentsFromPost",
  "/api/Comment/removeAllCommentsForUser",
  "/api/Comment/_getCommentsForPost",
  "/api/Comment/_getCommentById",
  "/api/Following/followUser",
  "/api/Following/unfollowUser",
  "/api/Following/_getFollowers",
  "/api/Following/_getFollowing",
  "/api/Following/_isFollowing",
  "/api/Friendship/sendFriendRequest",
  "/api/Friendship/acceptFriendRequest",
  "/api/Friendship/declineFriendRequest",
  "/api/Friendship/removeFriend",
  "/api/Friendship/areFriends",
  "/api/Post/createPost",
  "/api/Post/deletePost",
  "/api/Post/editPost",
  "/api/Post/removeAllPostsForUser",
  "/api/Post/_getPostsForUser",
  "/api/Post/_getPostsForUsers",
  "/api/Reaction/addReactionToPost",
  "/api/Reaction/changeReactionType",
  "/api/Reaction/removeReactionFromPost",
  "/api/Reaction/removeAllReactionsFromPost",
  "/api/Reaction/removeAllReactionsForUser",
  // "/api/SongLibrary/addSong",
  "/api/SongLibrary/removeSong",
  "/api/SongLibrary/addUser",
  "/api/SongLibrary/removeUser",
  "/api/SongLibrary/startLearningSong",
  "/api/SongLibrary/updateSongMastery",
  "/api/SongLibrary/stopLearningSong",
  "/api/Song/_getPlayableSongs",
  "/api/SongLibrary/_getSongsInProgress",
  "/api/Song/_filterSongsByGenre",
  "/api/Song/_getAllSongs",
  "/api/Song/_searchByTitleOrArtist",
  "/api/Song/updateSong",
  "/api/Song/_getSongCount",
  "/api/Song/_getAllSongsForRecommendation",
  "/api/Song/_getSuggestedSongs",
  "/api/Chord/_getAllChords",
  "/api/Chord/_getChordByName",
  "/api/Chord/_getChordDiagram",
  "/api/Chord/_getChordDiagrams",
  "/api/Chord/_getAvailableChordDiagrams",
  "/api/Chord/_hasChordDiagram",
  "/api/RecommendationEngine/requestChordRecommendation",
  "/api/RecommendationEngine/requestSongUnlockRecommendation",
  "/api/RecommendationEngine/requestPersonalizedSongRecommendation",
  "/api/RecommendationEngine/recommendNextChordsForTargetSong",
  "/api/RecommendationEngine/calculateRecommendation",
  "/api/UserProfile/createProfile",
  "/api/UserProfile/updateDisplayName",
  "/api/UserProfile/updateBio",
  "/api/UserProfile/updateAvatar",
  "/api/UserProfile/setGenrePreferences",
  "/api/UserProfile/changeSkillLevel",
  "/api/UserProfile/setTargetSong",
  "/api/UserProfile/removeTargetSong",
  "/api/UserProfile/deleteProfile",
  "/api/Comment/_getCommentsForPostId",
  "/api/Following/removeUserFollowing",
  "/api/Following/removeUserAsFollower",
  "/api/Friendship/removeAllFriendshipsForUser",
  "/api/Friendship/_getFriends",
  "/api/Friendship/_getPendingFriendships",
  "/api/Reaction/_getReactionsForPostId",
  "/api/UserAccount/register",
  "/api/UserAccount/_isUserById",
  "/api/UserProfile/_searchByDisplayName",
  "/api/UserProfile/_getProfile",
  "/api/Reaction/_getReactionOnPostFromUser",
  "/api/Post/editPostVisibility",

  "/api/UserAccount/setPrivateAccountStatus",
];

/** */

/**
 *
  "/api/RecommendationEngine/calculateRecommendation",
  "/api/RecommendationEngine/_getRecommendation",
  "/api/RecommendationEngine/requestChordRecommendation",
  "/api/RecommendationEngine/requestSongUnlockRecommendation",
  ->  "/api/UserAccount/register",
  ->  "/api/UserAccount/login",
FIX: Please verify routes in: ./src/concepts/Requesting/passthrough.ts
 */
