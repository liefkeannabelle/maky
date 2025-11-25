**concept** Following [User] \
**purpose** to allow users to subscribe to content and updates from other users \
**principle** A user can unilaterally follow another user to see their activity. This relationship is directional and does not require approval from the user being followed. The follower can subsequently unfollow the user at any time. \

**state** 
> a set of Follows with
>
> > a follower User
> > a followed User
> > a followedAt DateTime

**actions**

followUser (follower: User, followed: User): (follow: Follow)

*   **requires** The `follower` and `followed` are distinct Users. The `follower` is not currently following the `followed` (no `Follow` object exists for this pair).
*   **effects** Creates a new `Follow` object; sets `follower` and `followed`; sets `followedAt` to the current time; returns the new `follow` object.

unfollowUser (follower: User, followed: User)

*   **requires** A `Follow` object exists where `follower` is the follower and `followed` is the followed user.
*   **effects** Removes the matching `Follow` object from the state and returns `success: true`.

removeUserAsFollower (user: User)

* **requires** The `user` exists.
* **effects** Removes all `Follow` objects from the state where `followed` is the given `user`. This action is typically used when `user`'s account is deleted to clean up all their inbound follow relationships (i.e., remove all their followers).

removeUserFollowing (user: User)

* **requires** The `user` exists.
* **effects** Removes all `Follow` objects from the state where the `follower` is the given `user`. This action is typically used when `user`'s account is deleted to clean up all their outbound follow relationships.


**notes**
- Following is the non-mutual, one-directional relationship between two users
