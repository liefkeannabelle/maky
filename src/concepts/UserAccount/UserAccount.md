**concept** UserAccount \
**purpose** to allow users to establish and manage their identity within the app \
**principle** A user registers with a unique username, email, and password. They can later log in using these credentials to access the app. \

**state**
> a set of Users with
>
> > a username String\
> > an email String\
> > a passwordHash String\
> > a isKidAccount Boolean

**actions** \
register (username: String, email: String, password: String, isKidAccount: Boolean): (user: User)

*   **requires** No User exists with the given `username` or `email`.
*   **effects** Creates a new User; sets its `username`, `email`, `isKidAccount` status, and a hash of the `password`; returns the new user.

login (username: String, password: String): (user: User)

*   **requires** A User exists with the given `username` and the provided `password` matches their `passwordHash`.
*   **effects** Returns the matching user.

changePassword (user: User, oldPassword: String, newPassword: String): (success: Boolean)

*   **requires** The `user` exists and the provided `oldPassword` matches their current `passwordHash`.
*   **effects** Updates the `passwordHash` for `user` with a hash of `newPassword`; returns `true` as `success`.

  
changePassword (user: User, oldPassword: String, newPassword: String): (error: String)

*   **requires** The `user` does not exist or the `oldPassword` does not match their current `passwordHash`.
*   **effects** Returns an error message.

updateCredentials (user: User, newUsername: String, newEmail: String): (success: Boolean)

*   **requires** The `user` exists. The `newUsername` and `newEmail` are not already in use by another User.
*   **effects** Updates the `username` to `newUsername` and `email` to `newEmail` for the given `user`; returns `true` as `success`.


setKidAccountStatus (user: User, status: Boolean)

*   **requires** The `user` exists.
*   **effects** Sets the `isKidAccount` status for the given `user` to the provided `status`.

deleteAccount (user: User, password: String): (success: Boolean)

*   **requires** The `user` exists and the provided `password` matches their `passwordHash`.
*   **effects** Removes the `user` and all their associated data from the state; returns `true` as `success`.

**queries**

_getUserByUsername (username: String): (user: User)
*   **requires**: a User with the given `username` exists.
*   **effects**: returns the corresponding User.

\_isUserById (user: User): (result: Boolean)

*   **requires**: true
*   **effects**: returns `true` as `result` if a user with the given id exists, `false` otherwise.


**notes**
- The user account will store the core authentification details for a given user as they would appear on functionally any such app. The app-specific preferences are stored instead in UserProfile. 
- The isKidAccount flag will serve to enforce limited social functionality for users marked as children.
---
