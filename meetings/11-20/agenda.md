# 11-20 Meeting 
## Agenda
- Review [progress report](progress-report.md) (20 minutes)
  - Discuss design changes
  - Talk through peer feedback + source TA feedback
- Align on next steps (10 minutes)

## Meeting Notes
- Positive feedback on project pitch from TAs - yay!
- Do we have too many concepts?
  - If that quantity is necessary for keeping things managable, that's okay
  - Well-broken down and specific 
  - Could also have generic concepts and reuse across different functions (song, chord, and jam groups)
  - Do we have "too much going on"?
    - Prioritize learning guitar
    - Social components are secondary -- implement later and avoid making them feel tacked on
- Learning vs. supporting learners
  - We want to focus on supporting learners but not trying to replace existing tools
  - Rely on user input regarding mastery
  - Concept: guitar-learning journal w/ the option to share
- Data sourcing
  - Yahir-curated database of basic chord progressions and walked through process
  - Will be able to replicate with the actual data base 
- Potential recommendation logic
  - Should the user pick between the different options? Could present all of them each time or have the user set a recommendation type preference and only be given that recommendation each time
  - Are we using an LLM for these recommendations? Yes but will want to give it context about the relationship between chords
- What type of user is using the app?
  - Does our structure threaten choice overload to beginners? Establish defaults for various questions
  - Structurally separating various components of the process to avoid overwhelming
  - Lean on possible inherent ordering of learning chords and augment with user song preferences
    - Can still be relatively deterministic
    - Same question will always get the same answer -- can store static in the background
    - If they come in w/ more the x chords, can prompt rather than get a deterministic path
  - Don't want to prompt with too much context b/c it will either (a) take a long time or (b) spit out a bad answer
- Be mindful of the holiday!
  - Be realistic with how much you will do