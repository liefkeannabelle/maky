# Problem Framing
## Domain
At a high level, we are interested in the domain of music learning, particularly finding ways to make learning instruments -- specifically guitar -- less daunting and keep learners from feeling discouraged.

## Problem
Learning guitar chords can be incredibly challenging, a journey that is often discouraging for beginners. Unfortunately, this causes many guitarists to quit within their first year of learning! There are a few key problems that contribute to this issue:
1. Beginner-friction: As a beginner, you know a few chords but can't find playable songs that match your skill. Without the ability to play songs early on, beginners often struggle to stay motivated.
2. Relevant chords: As a beginner, it is hard to know which might be the next best chord to learn. Ex: (B7 instead of Bm if playing a progression)
3. Tab/Chord Inconsistency: In existing resources, chords and tabs can vary in quality and key. This variety makes it more difficult for beginners to find the right versions, especially with their skillset and understanding.

## Evidence
1. [90% of guitarists quit within a year](https://www.guitarworld.com/news/90-percent-of-new-guitarists-abandon-the-instrument-within-a-year-according-to-fender). Beginner drop-off is massive! It is a real problem so being able to push motivation and early wins is critical for minimizing beginner drop-off.
2. [Guitarists quit from not feeling successful](https://holisticmusicianship.com/blog/why-so-many-beginners-quit-guitar).  As beginners begin to learn guitar and songs, they compare studio recordings to their own performance and do not feel that sense of accomplishment. This can be discouraging for new players
3. [Three-chord songs](https://en.wikipedia.org/wiki/Three-chord_song). Many songs consist of 3 chords which are formatted into a standard progression. The use of the tonic, subdominant, and dominant is a fundamental basis for these progressions. 
4. [Four-chord songs lawsuit](https://www.fretzealot.com/2023/05/what-ed-sheerans-court-case-tells-us-about-four-chord-songs/). A slight step-up from the 3-chord songs to spice up your songs is four-chords. This article dives into a court case over trying to copyright chord progressions which shows how progressions are so standard.
5. [Memorizing chords and chord techniques](https://melbourneguitaracademy.com/how-to-quickly-memorise-guitar-chords-and-develop-smooth-chord-changes-my-simple-5-minute-routine/). One of many examples on how many websites focus on the practice of chords with tips and techniques. Many teachers offer different insights but it only drives how important it is to know chords and find a method that is easy for beginners.

## Comparables
There are few different types of comparable products that are necessary to consider for our conception.
1. Music Learning Tools
    - [Ultimate-Guitar](https://www.ultimate-guitar.com/). The main source of refined guitar chords (and even tabs) for songs. Gives different versions which can be community-rated. However, for more exclusive content or features, it is locked behind a paywall. Not able to personalize chord inventory.
    - [Chordify](https://chordify.net/). A simple easy way of discovering new music and following along with songs. A minimal design and clean interface, however, no explicit way of sorting songs by chords.
    - [Yousician](https://yousician.com/). A game-like way of learning music that is supposed to make learning guitar a more fun and interactive experience. Encourages practice with more visuals and more robust systems. No method of sorting songs by chords.
    - [Oolimo](https://www.oolimo.com/en/). A chord analyzer/finder. Doesn't provide songs based on chords but it can help analyze fingerings of chords and decipher methods of playing chords. Useful tool for beginners to learn fingerings and different chords but no song testing. 
    - [Hooktheory](https://www.hooktheory.com/trends). Allows you to learn and discover songs based on a chord progression built from a starting chord. Very useful, however, it is not entirely beginner friendly as it requires knowledge about progressions and knowing which progressions you want to play.

2. Social Journal Platforms
    - [Letterboxd](https://letterboxd.com/). A social media platform for movie lovers to share reviews, ratings, and lists of films they have watched. Users can follow others, comment on reviews, and engage in discussions about movies. This platform emphasizes community engagement and shared interests, but can be an enjoyable tool for those who simply want to document their movie-watching history without the social component.
    - [Goodreads](https://www.goodreads.com/). Much like Letterboxd, Goodreads social media platform for book enthusiasts to share reviews, ratings, and reading lists. Users can follow friends, join book clubs, and participate in discussions about literature. The platform fosters a sense of community among readers while similarly serving as an individual's personal reading tracker.

3. Musical Group Formation Platforms
    - [Vampr](https://vampr.me/). A platform designed to connect various members of the music industry. Users create a profile showcasing their  skills, interests, and experiences, and can swipe through potential collaborators based on location and musical style. 
    - [r/FindABand](https://www.reddit.com/r/FindABand/). A subreddit dedicated to helping musicians find bandmates and collaborators. Users can post about their musical skills, interests, and what they are looking for in a band. The community aspect allows for direct interaction and networking among musicians.

## Features
With our current domain and identified problem, we have brainstormed the following key features for our app:
- Maintain an inventory of known chords
    - Given the current set of known chords, the user would be provided a list of songs they can play
    - With this log, an AI-augmented tool can recommend the next best chord to learn
        - Alongside these recommendations, the feature would also show what songs user would “unlock” learning the next chord
- Keep a journal of songs they are learning
    - They can mark various songs “in progress”, “proficient”, “mastered” and post to their feed as they progress through these stages
    - On these posts, other users could react or comment
- Jam sessions & group formation
    - Users can form groups of mutual friends and be given a list of songs they all know how to play or have the potential to learn based on their chord inventories
    - Users can seek out groups of other users based on their skill level


## Ethical analysis
| Prompt | Observation | Design Response |
| ----------- | ----------- | ----------- |
| *Stakeholders:* Variation in Human Ability | With the purpose of the app being learning guitar, there are certain limitations on what users would be using the app. Still, we want to suit all learners and their varied ability levels. | To support all learners, the app would focus on incentivizing learning at your own pace and avoid discouraging learners who take things slower.  |
| *Pervasiveness:* Accounting for Culture | Different cultural groups might want to learn songs specific to their cultures, and failing to recommend songs that are relevant can yield to learning not being substantial, relevant, or not users not engaging with the app. | Allow users to provide preferences of genres and backgrounds of music to recommend. Then, tagging of songs could allow for more personalized recommendations.  |
| *Values:* Choose your values | In our conceptualization of our app, we would like to prioritize the following values: Community, Self-driven learning, Positivity | Community & Positivity: No dislike buttons on posts & comments, Self-driven learning: No features celebrating fast paces, instead highlighting consistency over rate of progress. |
| *Stakeholders:* Consider children | Kids are a large demographic of learning new instruments, but we want to be sure to limit any possible harms caused by the social component of the app. | To avoid such harms, we would allow for “kid accounts” that lack the social component. In order to engage with the feeds or group formation components, users would need to provide their birthday and email. |
| *Stakeholders:* Non-targeted Use | On any social media platform, especially one that allows you to make groups, this feature could be used by ill-intended actors in harmful ways. | For jam sessions, they would require mutual following between all users before a session can be formed. For group formation, users would opt in and be able to opt out at any time. Neither of these features would be available to kid accounts.|
