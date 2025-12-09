# Final Report
## Design summary
Since our original functional design submission, we have made a few notable changes, primarily to simplify the scope of our project and allow each feature to work to the best of its ability. 

Early on, we realized that the chord and song recommendations did not ultimately need to be AI-augmented, and doing so would likely cause the feature to run quite slowly. Instead, we decided to simplify, recommending the next chord based on how many songs it would allow the user to unlock. This feature was then able to be implemented directly by iterating through the possible recommendations. Additional optimizations were added to help speed up this process since the size of the data is quite large. 

On the social side of things, we eliminated the "following" user relationship, opting instead to only allow for mutual friends. We felt as though this better aligned with the intended use of the app between friends. We also made some tweaks to the conceptualization of jam sessions. Rather than requiring all participating users to login and join, we allow a single user to start a jam session for the group, with the thought that this better suits the way users would engage with the app. We've also more clearly flushed out the purpose of a jam session as a log of songs played together, allowing a jam group to mark that they practiced a song multiple times. 

We also decided to do away with the opening questionnaire because we were worried it would make the registration process too daunting, particularly for true beginners. Instead, the same information can be entered on the profile page upon login, but can also be added after the user has explored the app more.

From an aesthetic standpoint, much of our design has stayed true to our UI sketches. From a color-scheme perspective, we found that our original design was a bit overwhelming, so we toned down the colors for greater navigability. 

## Reflection
A reflection on your experiences in the final project, focusing on what you learned from the experience, divided into a subsection for each team member.

### Madalina

I really enjoyed the team project, it was more interesting and easier to develop when there were multiple people working on the project. 
I think a big part of this team project was getting enough time to expand on non-conceptual design features as well (diagrams, socializing features, UI). I could see how these elements elevated our app, and worked to minimize friction, and maximize users' satisfaction, precisely the things we talked about in the class. 
Having the foundation of the individual proejct helped streamline all the design procedures we had before, as well as being accustomed with the technology (I had a very hard time with context in my first stages of the individual projects). Overall it was lots of fun, I'm really proud of the final product!


### Annabelle
Overall, I really enjoyed working on the team project. I felt that the group experience allowed us to pick a more challenging project while still being achievable in the time constraint. It was fun to be able to combine ideas to produce our final product, and I feel really satisfied with the final ChordConnect app.

One big thing I learned from this experience was how to structure technical communication in a project of this scale. With everyone working on different components of the front and back end, it was important to make sure we were spanning our entire to-do list, and it took some time to find the best way to do this. It was also important to get a working understanding of how features worked without having been the one to implement them. Compared to the personal project, there was definitely an adjustment not having been the one to make each next step happen.

From a more technical standpoint, I was able to become much more confident with the various tools we used (i.e. Deno, Render, MongoDB, etc) compared to where I was at the end of the personal project. I also became more comfortable with a full-stack workflow as compared to the two-step development we used earlier in the semester.

Overall, I feel like I learned a lot from the group project component of the class and am really proud of the app we were able to create over the past month!
### Kalina

### Yahir 


