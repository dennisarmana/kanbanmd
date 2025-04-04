---

kanban-plugin: board

---

## Todo

- [ ] Create documentation for deployment and usage
- [ ] Optimize performance for larger Kanban boards
- [ ] Add user settings and preferences
- [ ] Fix remaining issues with Markdown parser #bug
  - [ ] Debug issues with code blocks in cards
  - [ ] Improve nested list indentation handling
  - [ ] Add support for tables and other advanced Markdown features
- [ ] Create version history and undo/redo capability
- [ ] Add column customization (color, width, order)
- [ ] Write unit tests for core functionality

## Doing

- [ ] Implement real-time GitHub synchronization using Netlify #feature !high
  - [ ] Enable Netlify Identity for the deployed site
  - [ ] Add GitHub as OAuth provider in Netlify settings
  - [ ] Integrate Netlify Identity widget into the application
  - [ ] Create Netlify Functions for GitHub API operations
  - [ ] Add auto-save to localStorage functionality
  - [ ] Implement file read/write via Netlify Functions
  - [ ] Add visual indicators for sync status
  - [ ] Implement batched commits after periods of inactivity
  - [ ] Add manual "Push Now" button
  - [ ] Handle merge conflicts gracefully


## Done

- [x] Enhance Markdown parser to handle complex kanban structures (nested lists, links in cards)
- [x] Implement drag-and-drop capability between columns
- [x] Fix visual issues in rendered Kanban board (card alignment, delete buttons, drag handles, text editing)
- [x] Implement card editing functionality with improved UI
- [x] Add validation for Kanban structure in uploaded files
- [x] Add error handling for invalid Markdown files
- [x] The kanban.md file lives in a github repo. Can we pull it directly from there? (Improved with error handling and branch selection)
- [x] Implement responsive design for different screen sizes
- [x] Create basic HTML/CSS layout for the web application
- [x] Set up project structure and initialize repository (GitHub repo: https://github.com/dennisarmana/kanbanmd.git)
- [x] Analyze requirements from PRD
- [x] Define initial project scope




%% kanban:settings
```
{"kanban-plugin":"board"}
```
%%