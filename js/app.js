/**
 * Main application logic for Kanban.md Web Tool
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const fileInput = document.getElementById('file-input');
  const githubRepoInput = document.getElementById('github-repo');
  const githubPathInput = document.getElementById('github-path');
  const githubLoadButton = document.getElementById('github-load');
  const fileSection = document.getElementById('file-section');
  const boardContainer = document.getElementById('board-container');
  
  // Event listeners
  fileInput.addEventListener('change', handleFileUpload);
  githubLoadButton.addEventListener('click', handleGithubLoad);
  
  /**
   * Handle local file upload
   */
  function handleFileUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Check if file is a markdown file
    if (!file.name.endsWith('.md')) {
      alert('Please select a markdown (.md) file');
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target.result;
      processKanbanContent(content);
    };
    
    reader.onerror = () => {
      alert('Error reading file');
    };
    
    reader.readAsText(file);
  }
  
  /**
   * Handle loading from GitHub repository
   */
  function handleGithubLoad() {
    const repoUrl = githubRepoInput.value.trim();
    const filePath = githubPathInput.value.trim() || 'kanban.md';
    
    if (!repoUrl) {
      alert('Please enter a GitHub repository URL');
      return;
    }
    
    // Extract owner and repo from URL
    let owner, repo;
    
    try {
      const urlParts = new URL(repoUrl).pathname.split('/').filter(Boolean);
      if (urlParts.length >= 2) {
        owner = urlParts[0];
        repo = urlParts[1].replace('.git', '');
      } else {
        throw new Error('Invalid repository URL');
      }
    } catch (error) {
      alert('Invalid GitHub repository URL');
      return;
    }
    
    // Show loading state
    githubLoadButton.textContent = 'Loading...';
    githubLoadButton.disabled = true;
    
    // Fetch file from GitHub API
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    
    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch file from GitHub');
        }
        return response.json();
      })
      .then(data => {
        // GitHub API returns content as base64 encoded
        const content = atob(data.content);
        processKanbanContent(content);
      })
      .catch(error => {
        alert(`Error: ${error.message}`);
      })
      .finally(() => {
        // Reset button state
        githubLoadButton.textContent = 'Load';
        githubLoadButton.disabled = false;
      });
  }
  
  /**
   * Process the kanban markdown content
   */
  function processKanbanContent(content) {
    try {
      // Parse markdown to kanban structure
      const kanbanData = parseMarkdown(content);
      
      // Render kanban board
      renderKanbanBoard(boardContainer, kanbanData);
      
      // Show board and hide file section
      fileSection.style.display = 'none';
      boardContainer.classList.remove('hidden');
    } catch (error) {
      alert(`Error processing kanban file: ${error.message}`);
    }
  }
});
