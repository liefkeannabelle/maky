[@concept-background](../../../design/tools/concept-background.md)

[@Post](Post.md)


[@PostConcept.ts](PostConcept.ts)

[@UserProfile.test.ts](../UserProfile/UserProfile.test.ts)


[@Post.test.ts](Post.test.ts)



#  in post.test.ts , is there a way to make this import prettier? only give back the snippet
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.224.0/testing/bdd.ts";

# response:

Yes, you can use the JSR specifier for Deno's standard library to make the import cleaner and more consistent with your other test imports, like `jsr:@std/assert`.

```typescript
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "jsr:@std/testing/bdd";
```
# response:

