/**
 * Main application logic for Kanban.md Web Tool
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const fileInput = document.getElementById('file-input');
  const githubRepoInput = document.getElementById('github-repo');
  const githubBranchInput = document.getElementById('github-branch');
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
    const userBranch = githubBranchInput.value.trim();
    
    if (!repoUrl) {
      showError('Please enter a GitHub repository URL');
      return;
    }
    
    // Create loading indicator
    const loadingIndicator = createLoadingIndicator();
    document.querySelector('.github-file').appendChild(loadingIndicator);
    
    // Extract owner and repo from URL
    let owner, repo, branch = userBranch || 'master';
    
    try {
      // Handle various GitHub URL formats
      if (repoUrl.includes('github.com')) {
        const urlObj = new URL(repoUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        if (pathParts.length >= 2) {
          owner = pathParts[0];
          repo = pathParts[1].replace('.git', '');
          
          // Check if a specific branch is specified
          if (pathParts.length > 2 && pathParts[2] === 'tree' && pathParts.length > 3) {
            branch = pathParts[3];
          }
        } else {
          throw new Error('Invalid repository URL format');
        }
      } else {
        // Handle simple owner/repo format
        const parts = repoUrl.split('/');
        if (parts.length >= 2) {
          owner = parts[0];
          repo = parts[1].replace('.git', '');
        } else {
          throw new Error('Invalid repository format. Use owner/repo or full GitHub URL');
        }
      }
    } catch (error) {
      removeLoadingIndicator(loadingIndicator);
      showError(`Invalid GitHub repository URL: ${error.message}`);
      return;
    }
    
    // Show loading state
    githubLoadButton.textContent = 'Loading...';
    githubLoadButton.disabled = true;
    
    // Update status
    loadingIndicator.textContent = `Fetching ${filePath} from ${owner}/${repo} (${branch})...`;
    
    // Fetch file from GitHub API
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
    
    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`File '${filePath}' not found in repository. Check the path and try again.`);
          } else {
            throw new Error(`Failed to fetch file from GitHub (Status: ${response.status})`);
          }
        }
        return response.json();
      })
      .then(data => {
        // Update status
        loadingIndicator.textContent = 'Parsing kanban data...';
        
        // GitHub API returns content as base64 encoded
        const content = atob(data.content);
        
        // Validate the content is a kanban board markdown file
        if (!isValidKanbanMarkdown(content)) {
          throw new Error('The file does not appear to be a valid kanban board markdown file');
        }
        
        processKanbanContent(content);
        removeLoadingIndicator(loadingIndicator);
      })
      .catch(error => {
        removeLoadingIndicator(loadingIndicator);
        showError(`GitHub Error: ${error.message}`);
      })
      .finally(() => {
        // Reset button state
        githubLoadButton.textContent = 'Load';
        githubLoadButton.disabled = false;
      });
  }
  
  /**
   * Validates if the markdown content has kanban board structure
   * @param {string} content - Markdown content to validate
   * @returns {boolean} True if valid kanban markdown
   */
  function isValidKanbanMarkdown(content) {
    // Check for at least one heading that could be a column
    const hasColumnHeadings = /##\s+[\w\s]+/.test(content);
    
    // Check for at least one list item that could be a card
    const hasListItems = /\n\s*-\s+/.test(content);
    
    // Ideally also check for kanban metadata, but it might not always be present
    const hasKanbanMetadata = content.includes('kanban-plugin') || 
                             content.includes('kanban:settings');
    
    // A valid kanban markdown should have at least column headings and list items
    return hasColumnHeadings && hasListItems;
  }
  
  /**
   * Creates and returns a loading indicator element
   * @returns {HTMLElement} The loading indicator element
   */
  function createLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'loading-indicator';
    indicator.textContent = 'Loading...';
    indicator.style.color = '#3498db';
    indicator.style.marginTop = '10px';
    indicator.style.fontStyle = 'italic';
    return indicator;
  }
  
  /**
   * Removes the loading indicator
   * @param {HTMLElement} indicator - The loading indicator to remove
   */
  function removeLoadingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }
  
  /**
   * Shows an error message to the user
   * @param {string} message - Error message to display
   */
  function showError(message) {
    // Create error container if it doesn't exist
    let errorContainer = document.getElementById('error-container');
    if (!errorContainer) {
      errorContainer = document.createElement('div');
      errorContainer.id = 'error-container';
      errorContainer.style.backgroundColor = '#ffebee';
      errorContainer.style.color = '#d32f2f';
      errorContainer.style.padding = '10px';
      errorContainer.style.borderRadius = '4px';
      errorContainer.style.marginTop = '10px';
      errorContainer.style.position = 'relative';
      
      // Add close button
      const closeButton = document.createElement('button');
      closeButton.textContent = '×';
      closeButton.style.position = 'absolute';
      closeButton.style.right = '5px';
      closeButton.style.top = '5px';
      closeButton.style.background = 'none';
      closeButton.style.border = 'none';
      closeButton.style.fontSize = '20px';
      closeButton.style.cursor = 'pointer';
      closeButton.style.color = '#d32f2f';
      closeButton.onclick = () => errorContainer.style.display = 'none';
      
      errorContainer.appendChild(closeButton);
      document.querySelector('.file-options').prepend(errorContainer);
    }
    
    // Update the error message
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    
    // Clear previous errors
    while (errorContainer.childElementCount > 1) { // Keep the close button
      errorContainer.removeChild(errorContainer.lastChild);
    }
    
    errorContainer.appendChild(messageElement);
    errorContainer.style.display = 'block';
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
