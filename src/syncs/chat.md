
[@sync-compilation](sync-compilation.md)


# help me brainstorm how to design functionality on searching. I want users to be able to search each other through a search bar. probably it'd be by display name. how do I best do that? additionally, I want the users to be able to search for chords, and search for songs. should I add this funcitonality under each concept? I added _searchByTitleOrArtist and _searchByDisplayName but I don't want a new search concept for that. maybe a sync can tie both of them together. 

# response:

This is an excellent question that gets to the heart of concept design: how to create a cohesive user experience (like a global search) while maintaining strict modularity and separation of concerns.

Your instincts are spot on. You should **not** create a new `Search` concept. A search concept would violate the principle of separation of concerns by needing to know the internal state and structure of many other concepts.

Instead, the correct approach is exactly what you hinted at:
1.  **Each concept is responsible for searching its own data.** You've already started this by adding `_searchByDisplayName` to `UserProfileConcept`. This is perfect. We'll add similar queries to `SongLibrary` and `Chord`.
2.  **A synchronization composes these individual searches into a single feature.** We'll create a new sync that listens for a generic search request (e.g., from `/api/search`) and then triggers the individual search queries in all relevant concepts in parallel, gathers the results, and responds.

Let's walk through the implementation step-by-step.

### The Design Strategy

1.  **Frontend:** The user types into a search bar. When they submit, the frontend makes a single API call to a new endpoint, for example: `POST /api/search` with a body like `{ "query": "Am" }`.
2.  **Requesting Concept:** This fires a `Requesting.request` action with `path: "/search"` and `query: "Am"`.
3.  **Search Sync:** A new synchronization, let's call it `HandleGlobalSearchRequest`, will be triggered by this `Requesting.request` action.
4.  **`where` Clause:** The `where` clause of this sync will call the individual search queries on `UserProfile`, `SongLibrary`, and `Chord` in parallel. It will then collect and format all the results into a single array.
5.  **`then` Clause:** The `then` clause will take the combined results from the `where` clause and use `Requesting.respond` to send them back to the frontend.

---

### Step 1: Add/Update Search Queries in Each Concept

First, let's ensure each concept has a powerful, efficient query for searching its own data.

#### `UserProfileConcept` (You have this, let's confirm it's solid)

Your `_searchByDisplayName` is a great start. It correctly uses a case-insensitive regex and includes a limit.

```typescript
// file: src/concepts/UserProfile/UserProfileConcept.ts

// ... (inside UserProfileConcept class)
  /**
   * _searchByDisplayName (query: String): (profiles: {user: User, displayName: String}[])
   *
   * **requires** true
   * **effects** Returns a set of users and their display names that partially match the query string.
   */
  async _searchByDisplayName(
    { query }: { query: string },
  ): Promise<Array<{ user: User; displayName: string }>> {
    if (!query || query.trim() === "") {
      return [];
    }

    const results = await this.profiles.find({
      displayName: { $regex: query, $options: "i" }, // Case-insensitive partial match
    }).limit(10) // Limit results for performance
      .toArray();

    return results.map((p) => ({ user: p.user, displayName: p.displayName }));
  }
```

#### `SongLibraryConcept` (New Query)

Let's add a query to search for songs by title or artist.

```typescript
// file: src/concepts/SongLibrary/SongLibraryConcept.ts

// ... (inside SongLibraryConcept class)
  /**
   * _searchByTitleOrArtist (query: String): (songs: Song[])
   * 
   * **effects** Returns songs where the title or artist partially and case-insensitively matches the query.
   */
  async _searchByTitleOrArtist(
    { query }: { query: string },
  ): Promise<Array<{ song: Song }>> {
    if (!query || query.trim() === "") {
      return [];
    }

    const songs = await this.songs.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { artist: { $regex: query, $options: "i" } },
      ],
    }).limit(10).toArray();

    return songs.map((s) => ({ song: s }));
  }
```

#### `ChordConcept` (New Query)

Now, let's add a simple search for chords by their name. Assuming you have a `ChordConcept`. If not, you can adapt this for however your chords are stored. For this example, let's assume a `ChordConcept` exists.

```typescript
// file: src/concepts/Chord/ChordConcept.ts (Example)

// ... (inside ChordConcept class)
```

---

### Step 2: Create the Unified Search Synchronization

Now we'll create a new sync file to tie everything together.

#### # file: `src/syncs/search.sync.ts`

```typescript
```

---

### Step 3: Frontend Interaction and Expected Response

Your frontend will now interact with this system like so:

1.  **Make a request:**
    *   **Method:** `POST`
    *   **Endpoint:** `/api/search`
    *   **Body:** `{ "query": "a" }`

2.  **Receive a response:**
    The synchronization will produce a flat JSON array containing objects from all the different concepts, each tagged with a `type`.

    ```json
    {
      "results": [
        {
          "user": "user-id-alice",
          "displayName": "Alice",
          "type": "user"
        },
        {
          "user": "user-id-adam",
          "displayName": "Adam",
          "type": "user"
        },
        {
          "song": {
            "_id": "song-id-123",
            "title": "All The Small Things",
            "artist": "Blink-182",
            "chords": ["C", "G", "Am", "F"]
          },
          "type": "song"
        },
        {
          "chord": {
            "_id": "chord-id-am",
            "name": "Am",
            "notes": ["A", "C", "E"]
          },
          "type": "chord"
        }
      ]
    }
    ```

### Advantages of this Approach

*   **High Modularity:** `UserProfile` doesn't know or care that `SongLibrary` is also searchable. Each concept remains completely independent.
*   **Excellent Separation of Concerns:** The logic for *how* to search for a user is kept entirely within `UserProfileConcept`. The sync is only responsible for *orchestration*—it just knows it needs to call `_searchByDisplayName` and doesn't care how it's implemented.
*   **Scalability:** This pattern is incredibly easy to extend. If you add a new `JamGroup` concept and want to make jam groups searchable, you simply:
    1.  Add a `_searchByName` query to `JamGroupConcept`.
    2.  Add one more line to the `Promise.all` call in the `search.sync.ts` file.
    That's it. No other part of the system needs to change.
*   **Adherence to Principles:** You've successfully created a complex, cross-cutting feature without breaking the core rule of concept independence, composing the behavior entirely through a synchronization.