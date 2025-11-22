**concept** Friendship [User] \
**purpose** to allow users to establish and manage mutual connections \
**principle** A user can initiate a connection by sending a friend request to another user. The recipient can either accept the request to establish a friendship or decline it. Once connected, either user can terminate the friendship.

**state**
> a set of Friendships with
>
> > a requester User
> > a recipient User
> > a status of PENDING or ACCEPTED or DECLINED
> > a initiatedAt DateTime

**actions** \
sendFriendRequest (requester: User, recipient: User): (friendship: Friendship)

*   **requires** The `requester` and `recipient` are distinct Users. No `Friendship` exists between these two users (regardless of who is requester or recipient).
*   **effects** Creates a new `Friendship`; sets `requester` and `recipient`; sets `status` to `PENDING`; sets `initiatedAt` to the current time; returns the new `friendship`.

acceptFriendRequest (requester: User, recipient: User)

*   **requires** A `Friendship` exists where the `requester` is the requester, the `recipient` is the recipient, and the `status` is `PENDING`.
*   **effects** Updates the `status` of the existing `Friendship` to `ACCEPTED`.

declineFriendRequest (requester: User, recipient: User)

*   **requires** A `Friendship` exists where the `requester` is the requester, the `recipient` is the recipient, and the `status` is `PENDING`.
*   **effects** Updates the `status` of the existing `Friendship` to `DECLINED`.

removeFriend (user1: User, user2: User)

*   **requires** A `Friendship` exists between `user1` and `user2` (where one is the requester and the other is the recipient).
*   **effects** Removes the `Friendship` object associated with these two users from the state.

removeAllFriendshipsForUser (user: User)

* **requires** true
* **effects** Removes all `Friendship` objects from the state where the given `user` is either the `requester` or the `recipient`, regardless of the friendship's `status`.

**queries** \
_areFriends (user1: User, user2: User): (isFriend: Boolean)
*   **requires** The users `user1` and `user2` exist.
*   **effects** Returns `true` if there exists a `Friendship` `f` such that `f.status` is `ACCEPTED` and the pair (`f.requester`, `f.recipient`) matches (`user1`, `user2`) in either order. Otherwise returns `false`.

_getFriends (user: User): (friend: User)

* **requires** The user `user` exists.
* **effects** Returns a set of all users `f` for whom a `Friendship` exists with `status` `ACCEPTED` between `user` and `f`.

**notes**
- Friendship will represent a mutual relationship between two users. 
- A declined friend request does not prevent a user from sending another (i.e. blocking). Our app does not currently have any such functionality.
