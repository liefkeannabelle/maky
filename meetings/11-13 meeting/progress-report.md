# 11-13 Meeting Progress Report
## Status Update
The last week was focused on creating the first two deliverables for the project: (1) the team contract and (2) the problem framing document.

1. The team contract was completed Friday afternoon during a group meeting. We were able to discuss each of the components and come to an agreement about how to distribute responsiblity, make decisions, and meet deadlines effectively. From this, we set up a shared Google Drive folder with the contract, plannig documents, and a project timeline tracker.

2. The [problem framing document](/design/problem-framing.md) was created in two phases.

    i. We established that our general area of interest was music or entertainment. Over the weekend, we each individually brainstormed potential problems in this domain and documented our thoughts within a shared brainstorming doc.

    ii. On Tuesday evening, we met to discuss each of our ideas and decide what problem we wanted to pursue. After talking through the potential strengths and weaknesses of each idea, we settled on our chosen problem. With this decided, we talked through each of the sections of the problem framing process, occasionally breaking out to think through thins individually then regrouping to discuss. By the end of the meeting, we had a solid draft of the problem framing document which we then cleaned up for submission.

## Design Changes
Obviously, our idea is quite fresh, so it has not changed since our submission of the problem framing document. We look forward to receiving feedback and are open to making changes as we work through each step of the design and development process.

## Issues
We had one main concern, brought forward by the TAs, to address: Accessibilty of song data - We are looking into potential sources of song data and will work to evaluate the feasibility of our overall design given what we find.

Here are our thoughts so far:
No specific API has been settled on. There are several different approaches to tackling the issue of songs, and of course the purpose is that the app has to be usable & fun since the purpose is for beginners to feel motivated and inspired to keep playing. Our plan is not to simply scrape a database of chord sheets since solely relying on that can be messy technically and legally; instead, we aim to combine several sources, and ambitiously, an audio-based chord analysis pipeline so we’re not bottlenecked entirely by free scores. This could look like:
1. A small but curated, legal song set. 
A thousand songs dataset is not needed but a focused-set of beginner friendly (and hopefully relevant) dataset that covers the most open common chords (C, G, D, Am, Em).

- Idea: Using public-domain / CC-licensed songs and encode them in a JSON format (or after doing research some ChordPro: Lyrics + Chords format)
- Even if 30-50 songs, if they are chosen well, it is enough to drive the core mechanic and idea
- The first milestone could be a CLEAN, hand-curated beginner library. Some sources could be Ultimate-Guitar or something on Kaggle/Hugging Face (need to investigate Kaggle still)

2. Existing research datasets on CHORD progressions.
- Do not need to redistribute copyrighted lyrics or full scores, mainly just need: 
{chords}: Am, Cm, Em + {song metadata}: tempo, key, etc.
- This idea is enough to power a recommendation & progression system (Learn X chord, unlock Y more songs). Some of these datasets from our research could use:
    - Chordonomicom - 600k+ chord progressions dataset
    - Songster
- We still need to be careful here about licensing for the datasets but it shows that our app should be scalable and feasible to implement now.
3. Audio-based chord analysis pipeline
- To avoid being limited by chord sheets, datasets, and licensing, we could also potentially develop and integrate our own chord analysis system. The pipeline would be as follows:
    - A user uploads their own audio
    - Run it through an AI-stem splitter
    - Apply a chord recognition model 
    - Generate a chord sheet + teaching progression
- This way, we are not scraping any data, a user can supply their own audio and we can do our own analysis. Gives us content directly that a user cares about 
4. Community & user-generated sheets: “Musescore”-esque (alternative)
- Could support user-generated and community-added sheets


## Plans & Decisions
With the problem framing done, our focus falls on preparing the two upcoming deliverables: (1) [project pitch](/design/project-pitch-plan.md) and (2) [functional design doc](/design/functional-design.md). 

### 1. Project Pitch
This consists of few main to-dos:
1. Identify key points to cover within the video
2. Determine best format
3. Create a script + assign roles
4. Schedule a time for filming
5. Film video
6. Edit to prepare for submission 
In this meeting, we will tackle tasks 1-4.

### 2. Functional Design Document
This consists of the following main to-dos:
1. Revisit and refine problem framing
2. Brainstorm and finalize key concepts + syncs
3. Create user journey
4. Create UI sketches
5. Explore visual design style and create visual design study
6. Write design summary
7. Create development plan
In this meeting, we will discuss each of these at a high-level and assign responsibilities to team members to begin work on each component. 

