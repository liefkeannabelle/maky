# 11-20 Meeting Progress Report
## Status Update
In the front half of the past week, we focused on producing the two deliverables: (1) project pitch and (2) functional design document. After these deadlines passed, we started working on (3) implementing some of the core concepts.

1. We met to plan and record our [project pitch](/design/project-pitch-plan.md) on Saturday. We used this time to identify the best way to pitch the problem, the key features to highlight, and the assignment of parts. We then each recorded our assigned parts and worked together to create the associated visuals. With all of these components sorted, Yahir edited the clips together to make our lovely pitch video.

2. On Sunday, we met to discuss our plan to tackle the [functional design assignment](/design/functional-design.md). We revised our problem framing and user journey to reflect the thoughts shown in the project pitch. We also used this time to establish our development plan and delegate the remaining components of the assignment. In doing this, we chose to each produce UI sketches according to how we were picturing ChordConnect to look. We reconvened on Tuesday to align our visions, complete all of the components, and prepare for submission. 

3. In creating our development plan, we created a [dependency graph](/design/visuals/dep-graph.png) to gain an understanding of what features are most crucial to the functionality of our app. With this, we started the development process focusing on these features, especially establishing proof of concept for our music learning features.

## Design Changes
As we worked through our project pitch and functional design, we were able to develop a better understanding of what we would like our project to look like. This has included a few changes from our original concept:
- Most notably, we have decided to eliminate the Group Formation feature. This decision was made after highlighting a few key concerns:
  - This feature felt out of scope in relation to our key functionality. With this, we felt uncertain about our ability to implement it to its full potential as a secondary component of our app. From watching other project pitches, it felt as though this feature was comparable to many groups primary functions, so it felt unreasonable to tack it on to our design as such a low-tier focus.
  - Additionally, there were concerns about the ability to implement this feature in a safe and responsible way given that it would rely on connecting users within the same area. Given that it was not crucial feature, we did not feel as though we would have the bandwidth to give it as much consideration as it was deserved.
  - Finally, while we would have loved to keep it as a feature, we felt it was a reasonable decision as we did not foresee it adding a significant amount of user satisfaction. More specifically, we felt it was unlikely that users would feel like the app was missing the feature in its absence.
- We have decided to incorporate the ability for users to set a "target song" that they would like to learn as a part of their user profile. This song could be used to inform suggested next chords.
  - This addition relates to a broader expansion in our approach to suggesting chords. We have realized we will need a few different prompts for suggestions (most unlocked songs, progress toward target song, etc) and allow user to pick from each of these lines of reasoning.
- Structurally, we have reassessed how we are imagining the division of features. As we wrote the project pitch, it became clear that we were grouping a lot of functionality into our conception of each feature. Instead, we've broken our trimmed down set of features into five features to better think through the functionality of ChordConnect.

## Issues
In the early stages of implementation, we fortunately do not have any functional issues. However, there are some key points brought forward from the [in-class pitch feedback](/design/peer-feedback.md) that we must consider further:
- Scope of social features
  - What do posts consist of?
  - Is the default public or private?
  - Is the newsfeed just friends or global? If global, is there a "post to just friends" option?
- Teaching vs. recommending
  - We have conflated these concepts and need to establish our intended purpose.
- Learning pipeline
  - There were a few questions seeking clarification regarding the purpose of the app in identifying readiness to progress vs acting as support as the user makes these decisions. 
- Differentiation
  - There were a handful of questions regarding how does ChordConnect differe from existing platforms and what would incentivize a user to use our platform instead of existing platforms. We need to establish our key differentiating features and ensure we implement this well.
- Magnitude
  - Multiple people raised the concern that we have a lot of things going on, some saying they felt as though not all of the features were related. We need to be careful to align all of our features with our problem domain and be prepared to shrink down if needed.

## Plans & Decisions
With all of the design assignments done, our focus falls on implementation. With the alpha checkpoint this coming Tuesday, we have scheduled an alpha midpoint meeting to check in on Saturday. Between now and then, we have set tasks to tackle. In this meeting, we will take a pulse on our progress and determine the necessary steps to meet the alpha deadline.

We have similar plans in place for the beta and final deadlines.