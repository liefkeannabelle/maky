# Functional Design
## Problem framing
For the most part, our problem framing is largely unchanged from our original [problem framing document](problem-framing.md). After the TA feedback, internal reflections, and questions during our project pitch, we have a few additional considerations to include:
- In our original design, we had considered the state of learning chords to be binary: "haven't learned" or "learned". Now, we have begun to consider the possibility of incorporating a mastery level -- like we are planning to have for the songs -- for the chords as well. While this would complicate the song recommendation features, it is worthwhile if we find it better reflects the learning experience.

- As we talked through our more detailed design plan, we realized that the GroupFormation feature was beginning to feel like an entire app of its own. We did not feel as though we had the bandwidth the implement this feature safely and thoroughly, especially given that it is functionally a bonus feature. In order to implement our overall app functionality to the best of our ability, we have decided to remove this feature from our design plans.s

- As we worked through our [project pitch](project-pitch-plan.md), we realized that our features could likely be broken down further, allowing us to focus on individual functionalities rather than aggregated purposes. Now, we are considering our project to have five -- increased from three -- main features:
    1. Inventory of known chords
    2. AI-augmented "next best chord" recommendations + unlocked songs
    3. Journal of song
    4. Social feed 
    5. Jam groups + common songs

## Concept design
For organization and ease of access, we have made dedicated files for the [concept specifications](concepts.md) and the [corresponding syncs](syncs.md). 

## User journey
Maky is a beginner guitarist who is struggling to stay motivated practicing guitar. They find that they are not making progress as quickly as they hope and are frustrated that they can’t play any songs yet. Maky only knows the Em and B7 chord… but what can Maky do with that?

That’s where ChordConnect can help!

Maky makes an account and is taken to a screen with a brief questionnaire about the chords they know and genres of music they are interested in learning. After inputting this info, they are presented with a list of songs they can play with their current skills and interests. Additionally, ChordConnect recommends the potential next best chord to learn that would optimize either: learning more songs, learning a specific song, or focusing on a genre!

As Maky continues their guitar learning journey, they document the chords and songs they are learning, making posts about their progress. They connect with friends on the app and are able to see their progress updates as well. Maky finds it very motivating to be able to see and share incremental updates through the music learning journey.

As they learn new song, Maky starts to meet up with their friends to play music together. When they get together, they use ChordConnect to find songs they all know.

Through its various features, ChordConnect is able to not only help Maky stay motivated and excel in their guitar-learning journey but to connect with others who are doing the same. With ChordConnect, Maky is learning new chords and songs, staying consistent, and having fun!

## UI sketches
Low-fidelity sketches of your user interface that show the primary user interface elements and their rough layout, annotated with pointers or comments to explain anything that might not be obvious.

## Visual design study
First, we explored the colors and typography that we would like to use in our app.
![Visual Design Study 1](./visuals/vds-colorfont.png)

Then, we explored existing platforms and identified what components of their layout we would like to emulate within ChordConnect.
![Visual Design Study 2](./visuals/vds-layout.png)

## Design summary
### How concepts work together
ChordConnect addresses the main reasons beginners quit guitar—uncertainty, limited progress, and isolation—by linking three domains: personalized progress, social support, and group play.

First, we mitigate the beginner's uncertainty with the UserChord and Library concepts. Instead of guessing what to practice, users enter the chords they know. The RecommendationEngine then acts as a filter, showing users exactly what songs they have the ability to play right now. This turns learning into a clear game: learn one specific chord to unlock five new songs.

Second, we use social features – like the Post, Reaction, and UserProfile concepts – to inspire motivation. When a user marks a song as "Mastered" in their library, they can share that update with their friends and followers. By limiting Reactions to positive types (Like, Love, Celebrate) and removing "dislike" buttons, we create a supportive environment where beginners feel comfortable sharing small wins without fear of judgment.

Finally, we move users from practicing alone to playing together using JamGroup. Existing friend groups can create a JamGroup. These groups can get their CommonSongs – a list of songs that everyone in the group already knows or can easily learn; ChordConnect will base these recommendations off the chord and song inventories of all group members. This feature helps groups play together more easily and spend more time doing what they enjoy: playing guitar!

### Addressing ethical concerns
- Child Safety: We added an isKidAccount flag directly to the UserAccount concept. We use a synchronization rule (BlockKids) that strictly prevents these accounts from joining JamGroups with strangers. This keeps the app educational for kids while keeping them off the social grid.

- Harassment & Safety: To prevent unwanted interactions, the Friendship concept requires mutual acceptance before users can message or invite each other to private sessions, preventing spam or harassment.

- Inclusivity: To ensure we don't just recommend pop music, the UserProfile concept includes genrePreferences. The recommendation engine uses this to prioritize songs that match the user's music background or musical taste. Our song database we are using to pool songs has genre resources that we plan to use.

- Positivity: We designed the Reaction concept to technically enforce positivity. Since "dislike" or "downvote" options do not exist in the state, users cannot use the mechanism to discourage others.

### Lingering Concerns & Issues
1. Song Data Availability: The Library concept requires a large database of songs mapped to specific chords. We are still determining if we can get this data reliably from public APIs or if we will need to build it manually, which could limit the number of songs available at launch.\
2. Recommendation Quality: We are betting that an algorithm can determine the "next best chord." It is unclear if a computer can accurately judge which chord is easiest for a human to learn next, or if we will need to fall back to a set of pre-written deterministic paths.\
3. Recommendation Diversity: To allow for different learning goals (learn a chord to use in a specific song, learn chords that are easiest, learn chords to be able to play many songs), we have a set of different recommendation paths for next steps. Ultimately, we might only find out in the user testing phase if these goals are indeed the most popular, or if the users have other priorities in mind. 

## Development plan
A table showing which features you expect to deliver at various stages, including at least the two checkpoints; an assignment of responsibilities to team members; a discussion of the key risks you face and how you will mitigate them (and your fallback option will be if something turns out to be unimplementable).
### Delivery timeline
|Day|Date | Milestone        | Features to Deliver + Responsible Team Members             |
|---|-----|------------------|----------------------------------------------------|  
|Sat|11/22| Alpha Midpoint   | <ul> <li> Proof of concept for song/chord data + learning features - Yahir & Annabelle </li> </ul> |
|Tue|11/25| Alpha Checkpoint | <ul> <li> Establish song and chord database - Yahir & Annabelle </li> <li> Implement AI-augmented song and chord suggestions - Yahir & Annabelle - Yahir & Annabelle </li> <li> Establish user related functionality (account, profile, authentication) - Mada & Kali </li> <li> Create skeleton of social-related functionality (implement posts, reactions, leave out jam groups) - Mada & Kali </li>  </ul>|
|Sat|11/29| Beta Midpoint   | <ul> <li> Handle remaining issues from alpha phase - All </li> <li> Half of the leftover social components done at backend & UI level- Kali & Mada </li> <li> Refinements of existing concepts & syncs (backend) - Yahir </li> <li> Clean up pages & flow (front end) - Annabelle </li> </ul> |
|Tue|12/2 | Beta Checkpoint  | <ul> <li> Finish social features - Mada & Kali </li> <li> Clean up frontend for desired visual impact - Annabelle</li> <li> Ensure quality recommendations and optimize learning pipeline - Yahir </ul> |
|Tue|12/9 | Full Demo  | <ul> <li> Implement refinements feedback from user testing - distribute depending on necessary tasks </li> </ul> |

### Risk analysis
Key risks and plans for mitigation
1. Limited availability of song data <br>
**Risk:** As identified by TAs given our problem framing, our app can only be impactful if it has a sufficient database of songs to recommend to users. <br>
**Mitigation**: To ensure this does not limit the capability of our app to support guitar-learning, we have identified four alternative sourcing methods for song data, all of which have the potential to provide us with sufficient amounts of song data.

2. Bad AI next-chord recommendations <br>
**Risk:** The user journey is heavily dependent on the AI-augmented next-chord recommendation feature. If this feature does not work well, it could severely limit the effectiveness of our app, likely perpetuating the frustration felt by beginners rather than eliminating it. <br>
**Mitigation:** We plan to devote a significant amount of early development to ensure this feature works well. However, if we find that we cannot get such a feature working in a satisfactory manner, we will fall back on a deterministic next-chord recommendation system, formulating the suggestions based on existing chord-learning roadmaps. Overall, we would hope to make recommendations that maximize the user's potential song unlocks.

3. High complexity of social features <br>
**Risk:** In our original design, there are a large number of social features (posting learning updates, reactions, jam groups). Depending on the difficulty of implementation, it may not be feasible to implement these all at a satisfactory level. It is also possible that, even with satisifactory implementation, the user experience will be overwhelming and certain features are not contributing a net positive. <br>
**Mitigation:** If run into these problems, we plan to scale down the scope of ChordConnect to focus on learning concepts as this is the primary functionality and value of our app. To make this possible, we will identify the order in which features would be removed from our design plan. To deteremine this ordering -- as well as the ordering of our implementation-- we created [dependency graph](./visuals/dep-graph.png) which showcases the ways in which different features depend on the existence of others. This would allow us to decrease complexity of implementation or experience will sacrificing the least amount of value possible.
