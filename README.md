# Kanban.md Web Tool

A lightweight, web-based application designed to transform a Markdown-based Kanban file (`kanban.md`) into an interactive, drag-and-drop Kanban board.

## Features

- Visualize and interact with a `kanban.md` file as a Kanban board
- Drag-and-drop functionality for moving cards between columns
- Edit card content with automatic updates
- Load Kanban files from local filesystem or GitHub repository
- Lightweight implementation with no build tools required

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Web server for hosting (optional)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/dennisarmana/kanbanmd.git
   ```

2. Open the project directory:
   ```
   cd kanbanmd
   ```

3. Open `index.html` in your browser or serve the files using a local web server.

## Usage

1. Upload a local `kanban.md` file or enter a GitHub repository URL
2. View and interact with your Kanban board
3. Make changes by dragging cards, editing content, or marking tasks as complete
4. Download the updated `kanban.md` file when finished

## Kanban.md Format

The tool expects a markdown file with the following structure:

```markdown
---
kanban-plugin: board
---

## Todo

- [ ] Task 1
- [ ] Task 2

## Doing

- [ ] Task in progress

## Done

- [x] Completed task

%% kanban:settings
```
{"kanban-plugin":"board"}
```
%%
```

## Project Structure

```
kanbanmd/
├── index.html         # Main entry point
├── css/               # Styling
│   └── styles.css
├── js/                # JavaScript modules
│   ├── app.js         # Main application logic
│   ├── parser.js      # Markdown parsing logic 
│   └── board.js       # Kanban board functionality
├── lib/               # Third-party libraries (if needed)
└── README.md          # Documentation
```

## License

MIT

## Acknowledgments

- Built for the Hackathon project
