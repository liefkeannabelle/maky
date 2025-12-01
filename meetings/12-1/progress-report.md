# 12-1 Meeting Progress Report
## Status Update
Since our last meeting, our focus has been tackling the various issues we identified coming out of the alpha checkpoint and discussed at our Tuesday meeting. With the holiday, we each tackled some subset of the tasks at our own pace and had an asynchronous check in over the weekend.

## Design Changes
- Updates to the feed page - Since last week, we have revamped the basic social interface and allowed users to select between viewing their friends posts or their own. We've also added support for private vs. public posts.
- Account privacy - Users can set their accounts to private and have the same learning experience without the social components. This is the same interface kid accounts will have.

## Issues
- Ongoing database problems - On Sunday, the database once again seemed to clear, though some portions of the data were left behind.
- Purpose of user bio - With our current implementation, user profile data is viewable only to a the given user, so there is no particular purpose for a bio. We could make user profiles visitable, also allowing other users to see all of a given user's posts, but this would be quite the undertaking without a clear benefit in the framework of our design.

## Plans & Decisions
The next big things to tackle are improving the recommendation engine and getting jam sessions operational (if this is still within the desired scope of our project). We must decide based on our existing proress if we feel confident tackling this with the time left or if that effort would be best spent honing the existingly implemented functionalities.