[@concept-background](../../../design/tools/concept-background.md)

[@Reaction](Reaction.md)

[@ReactionConcept.ts](ReactionConcept.ts)

[@Reaction.test.ts](Reaction.test.ts)

[@api-extraction-from-code](../../../design/tools/api-extraction-from-code.md)



# implement: make a _getReactionsForPostId (post) which outputs a json of reaction text string and its frequency. if no one reacted with a reaction type, the frequency is 0. then, make a concept spec for it. then, also make an api spec for it. and finally, make a minimal deno test for it. minimal code as possible! also, only output the parts you added or modified. I dont need unchanged existing code pasted here. 
# response:

Here are the additions and modifications to implement the `_getReactionsForPostId` query.

# concept: Reaction (modified)

# file: src\concepts\Reaction\ReactionConcept.ts (modified)


# API Specification: Reaction Concept (addition)

### POST /api/Reaction/_getReactionsForPostId


# file: src\concepts\Reaction\Reaction.test.ts (addition)

```typescript
```