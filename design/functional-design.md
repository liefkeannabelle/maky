# Functional Design
## Problem framing
For the most part, our problem framing is largely unchanged from our original [problem framing document](problem-framing.md). After the TA feedback, internal reflections, and questions during our project pitch, we have a few additional considerations to include:
- In our original design, we had considered the state of learning chords to be binary: "haven't learned" or "learned". Now, we have begun to consider the possibility of incorporating a mastery level -- like we are planning to have for the songs -- for the chords as well. While this would complicate the song recommendation features, it is worthwhile if we find it better reflects the learning experience.

- As we worked through our [project pitch](project-pitch-plan.md), we realized that our features could likely be broken down further, allowing us to focus on individual functionalities rather than aggregated purposes. Now, we are considering our project to have five -- increased from three -- main features:
    1. Inventory of known chords
    2. AI-augmented "next best chord" recommendations + unlocked songs
    3. Journal of songs + social feed 
    4. Jam groups + common songs
    5. Local group formation

## Concept design
A collection of concept specifications and syncs; include a note section in each concept and sync to explain any non-obvious design decisions or to mark issues to be resolved.

## User journey
Maky is a beginner guitarist who is struggling to stay motivated practicing guitar. They find that they are not making progress as quickly as they hope and are frustrated that they can’t play any songs yet. Maky only knows the Em and B7 chord… but what can Maky do with that?

That’s where ChordConnect can help!

Maky makes an account and is taken to a screen with a brief questionnaire about the chords they know and genres of music they are interested in learning. After inputting this info, they are presented with a list of songs they can play with their current skills and interests. Additionally, ChordConnect recommends the potential next best chord to learn that would optimize either: learning more songs, learning a specific song, or focusing on a genre!

As Maky continues their guitar learning journey, they document the chords and songs they are learning, making posts about their progress. They connect with friends on the app and are able to see their progress updates as well. Maky finds it very motivating to be able to see and share incremental updates through the music learning journey.

Unfortunately, Maky’s friends are interested in very different styles of music than them. Luckily, they were able to use the group formation feature to find other local musicians with similar musical interests and skills. When they get together, they use ChordConnect to find songs they all know.

Through its various features, ChordConnect is able to not only help Maky stay motivated and excel in their guitar-learning journey but to connect with others who are doing the same. With ChordConnect, Maky is learning new chords and songs, staying consistent, and having fun!

## UI sketches
Low-fidelity sketches of your user interface that show the primary user interface elements and their rough layout, annotated with pointers or comments to explain anything that might not be obvious.

## Visual design study
First, we explored the colors and typography that we would like to use in our app.
![Visual Design Study 1](/design/vds-colorfont.png)

Then, we explored existing platforms and identified what components of their layout we would like to emulate within ChordConnect.
![Visual Design Study 2](/design/vds-layout.png)

## Design summary
A summary of the overall design: how the concepts work together to solve the problem; how the design addresses any concerns that your ethics analysis raised; which issues remain unclear.

## Development plan
A table showing which features you expect to deliver at various stages, including at least the two checkpoints; an assignment of responsibilities to team members; a discussion of the key risks you face and how you will mitigate them (and your fallback option will be if something turns out to be unimplementable).
### Delivery timeline
|Day|Date | Milestone        | Features to Deliver + Responsible Team Members             |
|---|-----|------------------|----------------------------------------------------|  
|Sat|11/22| Alpha Midpoint   | <ul> <li> Proof of concept for song/chord data + learning features - Yahir & Annabelle </li> </ul> |
|Tue|11/25| Alpha Checkpoint | <ul> <li> Establish song and chord database - Yahir & Annabelle </li> <li> Implement learning pipeline - Yahir & Annabelle </li> <li> Establish user related functionality (account, profile, authentication) - Mada & Kali </li> <li> Create skeleton of social-related functionality (implement posts, reactions, leave out jam groups) - Mada & Kali </li>  </ul>|
|Sat|11/29| Beta Midpoint   | <ul> <li> Implement AI-augmented song and chord suggestions - Yahir & Annabelle </li> <li> Finish social-interface functionality - Kali & Mada </ul> |
|Tue|12/2 | Beta Checkpoint  | <ul> <li> Finish any lingering features </li> <li> Clean up frontend for desired visual impact </li> </ul> |

### Risk analysis
Key risks and plans for mitigation
1. Limited availability of song data <br>
**Risk:** As identified by TAs given our problem framing, our app can only be impactful if it has a sufficient database of songs to recommend to users. <br>
**Mitigation**: To ensure this does not limit the capability of our app to support guitar-learning, we have identified four alternative sourcing methods for song data, all of which have the potential to provide us with sufficient amounts of song data.

2. Bad AI next-chord recommendations <br>
**Risk:** The user journey is heavily dependent on the AI-augmented next-chord recommendation feature. If this feature does not work well, it could severely limit the effectiveness of our app, likely perpetuating the frustration felt by beginners rather than eliminating it. <br>
**Mitigation:** We plan to devote a significant amount of early development to ensure this feature works well. However, if we find that we cannot get such a feature working in a satisfactory manner, we will fall back on a deterministic next-chord recommendation system, formulating the suggestions based on existing chord-learning roadmaps. Overall, we would hope to make recommendations that maximize the user's potential song unlocks.

3. High complexity of social features <br>
**Risk:** In our current design, there are a large number of social features (posting learning updates, reactions, jam groups, group formation). Depending on the difficulty of implementation, it may not be feasible to implement these all at a satisfactory level. It is also possible that, even with satisifactory implementation, the user experience is overwhelming and certain features are not contributing a net positive. <br>
**Mitigation:** If run into these problems, we plan to scale down the scope of ChordConnect to focus on learning concepts as this is the primary functionality and value of our app. To make this possible, we will construct a tiered list of concepts with respect to the order in which we would cut them. This would allow us to decrease complexity of implementation or experience will sacrificing the least amount of value possible.s
