# Functional Design
## Problem framing
A revision of your problem framing to reflect your latest understanding <-- ask group abt this

## Concept design
A collection of concept specifications and syncs; include a note section in each concept and sync to explain any non-obvious design decisions or to mark issues to be resolved.

## User journey
A narrative that follows a single stakeholder as they encounter the problem and use your designed app to address it.

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
