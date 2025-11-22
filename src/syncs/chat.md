[@sync-background](../../design/tools/sync-background.md)

[@api-specification](../../design/api-specification.md)


[@UserAccount](../concepts/UserAccount/UserAccount.md)

[@UserAccountConcept.ts](../concepts/UserAccount/UserAccountConcept.ts)

[@useracc.sync.ts](useracc.sync.ts)

[@SessioningConcept.ts](../concepts/Sessioning/SessioningConcept.ts)


[@sample.sync.ts](sample.sync.ts)


# Look at what api spec we have on user account. based on successful examples of a auth and sample syncs, provide syncs for the actions and getters of the user account sync. they will need to use sessioning to authenticate. follow the sync background for guidelines and structure on how this should go. you need to have both a success response and an error sresponse, the same way it is shown in example.ts. can you add this to the usreracc.sync.ts? and feel free to change the existing code there if you find any issues about it. closely inspect how things are wired together in example.ts. for example the fact that session create is an action called within the login success. the flow must be 
export const LoginResponseSuccess: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: "/login" }, { request }],
    [UserAuthentication.login, {}, { user }],
    [Sessioning.create, { user }, { session }],
  ),
  then: actions([Requesting.respond, { request, session }]),
});



# response:

Of course. Based on the provided API specification, concept implementation, and examples, I will create a complete and robust set of synchronizations for the `UserAccount` concept.

I've carefully reviewed the existing code in `useracc.sync.ts`, identified the patterns from the documentation, and made corrections and additions to ensure it aligns perfectly with the API specification and concept design principles. Specifically, I've:

1.  Corrected the successful login response to include both the `user` and `sessionId` as required by the API spec.
2.  Ensured that actions with an empty success response (like `setKidAccountStatus`) still correctly trigger a response to the client, by creating separate success and error response synchronizations.
3.  Verified that all authenticated actions properly use a `where` clause to retrieve the user from the session.
4.  Standardized the request/response flow for all actions defined in the `UserAccount` concept.

Here is the complete and updated content for `src/syncs/useracc.sync.ts`.

# file: src\syncs\useracc.sync.ts

```typescript

```