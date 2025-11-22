
[@sync-compilation](sync-compilation.md)


# implement each action of the "friendship" concept, that i will paste into friendship.sync.ts. it needs to pass through the sessioning to get the user, and it takes from the request concept. follow other sync files to see how to set it up properly. don't stray away from structure and conventions of sync implementations.

# response:

Of course. Here is the implementation for the synchronizations that handle the `Friendship` concept's actions, designed to be placed in `src/syncs/friendship.sync.ts`.

This implementation follows the established conventions from your other sync files by:
1.  Creating a "request handler" sync for each API endpoint that triggers the concept action.
2.  Creating a "response handler" sync that sends the result back to the client.
3.  Using a `where` clause with `Sessioning._getUser` to authenticate requests and retrieve the user ID.
4.  Correctly aliasing variables (e.g., `user: requester`) to match the concept's action parameters.

# file: src/syncs/friendship.sync.ts

```typescript

```