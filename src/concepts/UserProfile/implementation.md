[@concept-background](../../../design/tools/concept-background.md)


[@UserProfile](UserProfile.md)

[@UserProfileConcept.ts](UserProfileConcept.ts)

[@UserAccount.test.ts](../UserAccount/UserAccount.test.ts)



# implement: a few tests covering the _searchByDisplayName. Include   sanitizeOps: false,   sanitizeResources: false, in each of the deno tests, to prevent leaks. Don t do it with t.step stuff. preserve the structure it has in the other concept files. only print the added deno test testing search functionality


# response:

# file: src\concepts\UserProfile\UserProfile.test.ts

```typescript
import { assert, assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserProfileConcept from "./UserProfileConcept.ts";
import { ID } from "@utils/types.ts";


```