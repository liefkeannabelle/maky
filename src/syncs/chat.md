[@sync-background](../../design/tools/sync-background.md)

[@api-specification](../../design/api-specification.md)

[@useracc.sync.ts](useracc.sync.ts)

[@userprofile.sync.ts](userprofile.sync.ts)

[@UserProfileConcept.ts](../concepts/UserProfile/UserProfileConcept.ts)

[@ChordLibraryConcept.ts](../concepts/ChordLibrary/ChordLibraryConcept.ts)

[@SongLibraryConcept.ts](../concepts/SongLibrary/SongLibraryConcept.ts)



[@SessioningConcept.ts](../concepts/Sessioning/SessioningConcept.ts)

[@RequestingConcept.ts](../concepts/Requesting/RequestingConcept.ts)

**sync** InitializeNewUser \
**when** 
	UserAccount.register (username, email, password, isKidAccount): (user) \
**then** \
	UserProfile.createProfile (user, displayName: username, ...) \
	ChordLibrary.addUser (user) \
	SongLibrary.addUser (user)

# implement the initializenewuser sync, calling the other concepts appropriately. follow the guidelines on how to implement syncs, and the examples in useracc.sync.ts and userprofile.sync.ts. we will need to modify the sync for user account registration . don't output the entire file. only the syncs and sections you modified and added to useracc.sync.ts

# response:

Of course. Here are the modifications and additions for the `useracc.sync.ts` file to implement the `InitializeNewUser` synchronization.

# file: src\syncs\useracc.sync.ts

```typescript
import { actions, Sync } from "@engine";

// --- Login (Public) ---

/**
 * Catches a request to log in and triggers the UserAccount.login action.
 * This is a public endpoint.
 */
export const HandleLoginRequest: Sync = ({ request, username, password }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAccount/login", username, password },
      { request },
    ],
  ),
  then: actions(
    [UserAccount.login, { username, password }],
  ),
});
```