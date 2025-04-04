# Product Requirements Document (PRD): Kanban.md Web Tool

## Overview
The Kanban.md Web Tool is a lightweight, web-based application designed to transform a Markdown-based Kanban file (`kanban.md`) into an interactive, drag-and-drop Kanban board. Users can select a `kanban.md` file, view its contents as a visual board, edit cards, and see changes reflected in the original file in real time. The tool will be deployable on a simple web server, making it accessible to colleagues over a local network or the internet.

### Goals
- Provide a seamless way to visualize and interact with a `kanban.md` file as a Kanban board.
- Enable drag-and-drop functionality for moving cards between columns.
- Allow editing of card content with automatic updates to the `kanban.md` file.
- Ensure the tool is easy to deploy and use across platforms (macOS, Windows, etc.).
- Keep the solution lightweight and dependency-minimal for quick setup.

### Target Users
- Individuals and small teams using Markdown files to manage tasks (e.g., developers, project managers).
- Colleagues on Windows or other platforms who need a visual interface for a shared `kanban.md` file.

## Functional Requirements

### 1. File Selection
- **Description:** Users can select a `kanban.md` file from their local filesystem or a predefined server location.
- **Details:**
  - On first load, the web app prompts the user to upload a `kanban.md` file via a file input.
  - Alternatively, if hosted on a server with a fixed `kanban.md` file, it defaults to that file.
- **Acceptance Criteria:**
  - File upload supports `.md` files.
  - Displays an error if the file is not a valid Markdown file or lacks Kanban structure.

### 2. Markdown Parsing
- **Description:** The tool parses the `kanban.md` file into a Kanban board structure.
- **Details:**
  - Recognizes Markdown headers (e.g., `## To Do`, `## In Progress`, `## Done`) as column titles.
  - Treats list items (e.g., `- Task 1`) under each header as cards in that column.
  - Example `kanban.md` structure:
    ```markdown
    ## To Do
    - Write PRD
    - Design UI
    ## In Progress
    - Code parser
    ## Done
    - Research tools