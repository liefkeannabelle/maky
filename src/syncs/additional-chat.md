[@useracc.sync.ts](useracc.sync.ts)

[@sync-compilation](sync-compilation.md)

[@post.sync.ts](post.sync.ts)


# fix: the following to syncs in the "useraccount.sync.ts" are currently combinigng the success response and error response together, they need to be separate:RespondToChangePassword` - `RespondToUpdateCredentials` `RespondToSetKidStatus` - `RespondToDeleteAccount  please separate them and write the sync correctly, according to instructions and following the post.sync.ts which correctly implements its syncs (the create post specifically). output only the edited syncs, I don't need the unchanged syncs.


# response:


# response:

```typescript


// --- Set Kid Account Status (Authenticated) ---

```