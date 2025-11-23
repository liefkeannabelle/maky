
[@sync-compilation](sync-compilation.md)


# implement syncs for all friendship.\_getPendingFriendships (user: User): [
  {
    "pendingFriendships": [
      {
        "requester": "string"
      }
    ]
  }
]. pay close attention to the format that of the output in the implementnation. closely follow how other syncs are implemented. only output the new syncs you added.

# response:

Here is the implementation for the synchronization that handles the `/api/Friendship/_getPendingFriendships` endpoint. This follows the established patterns from the other query-handling syncs provided in your project.

This code would typically be placed in a new file, such as `src/syncs/friendship.sync.ts`.

```typescript
import { actions, Frames, Sync } from "@engine";
import { Friendship, Requesting } from "@concepts";


```