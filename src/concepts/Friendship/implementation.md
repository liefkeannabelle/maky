[@concept-background](../../../design/tools/concept-background.md)

[@api-specification](../../../design/api-specification.md)

[@api-extraction-from-spec](../../../design/tools/api-extraction-from-spec.md)



[@Friendship](Friendship.md)


[@FriendshipConcept.ts](FriendshipConcept.ts)

[@Friendship.test.ts](Friendship.test.ts)



# add a getPendingFriendships (user) -> list of pending friendships wrapped in an one-element array. add a concept spec for it, and add an api spec for it. write a deno test for it too. output only functions you've added or changed, i don't need code that wasn't changed. I NEED it to be of the form [{pendingfriendships: (requester: User)[]}] because the syncs need it to be a non-empty array.

# response:

Here are the additions and changes for the `_getPendingFriendships` query.

### Concept Specification (Addition)

**queries**

***

# API Specification: Friendship Concept

**Purpose:** to allow users to establish and manage mutual connections

***

## API Endpoints

```
***

# file: src\concepts\Friendship\FriendshipConcept.ts

```typescript
}
```

# file: src\concepts\Friendship\Friendship.test.ts

```typescript

```