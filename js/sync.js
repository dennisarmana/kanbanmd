/**
 * sync.js - Handles synchronization between local state and GitHub
 * Uses Netlify Functions to securely interact with GitHub API
 */

// Sync configuration
const SYNC_CONFIG = {
  AUTO_SAVE_DELAY: 5000,     // 5 seconds delay for auto-save
  SYNC_DELAY: 30000,         // 30 seconds delay for sync to GitHub
  LOCAL_STORAGE_KEY: 'kanbanmd_local_state'
};

// Sync state
let syncState = {
  lastLocalSave: null,       // Timestamp of last local save
  lastGitHubSync: null,      // Timestamp of last GitHub sync
  pendingChanges: false,     // Whether there are unsaved changes
  syncTimer: null,           // Timer for syncing to GitHub
  autoSaveTimer: null,       // Timer for auto-saving locally
  isInitialized: false,      // Whether sync is initialized
  currentRepo: null,         // Current repository being synced
  currentPath: null,         // Current file path being synced
  currentBranch: 'master'    // Current branch being synced
};

/**
 * Initialize synchronization
 */
function initSync() {
  if (syncState.isInitialized) return;
  
  // Set up event listeners
  window.addEventListener('board:change', handleBoardChange);
  
  // Initialize local storage
  loadFromLocalStorage();
  
  syncState.isInitialized = true;
  console.log('Sync initialized');
}

/**
 * Handle changes to the Kanban board
 * @param {CustomEvent} event - The board change event
 */
function handleBoardChange(event) {
  // Mark that we have pending changes
  syncState.pendingChanges = true;
  
  // Schedule auto-save
  scheduleAutoSave();
  
  // If user is authenticated, schedule sync to GitHub
  if (window.auth && window.auth.isAuthenticated()) {
    scheduleSyncToGitHub();
  }
}

/**
 * Schedule auto-save to local storage
 */
function scheduleAutoSave() {
  // Clear existing timer if any
  if (syncState.autoSaveTimer) {
    clearTimeout(syncState.autoSaveTimer);
  }
  
  // Set new timer
  syncState.autoSaveTimer = setTimeout(() => {
    saveToLocalStorage();
  }, SYNC_CONFIG.AUTO_SAVE_DELAY);
}

/**
 * Schedule sync to GitHub
 */
function scheduleSyncToGitHub() {
  // Clear existing timer if any
  if (syncState.syncTimer) {
    clearTimeout(syncState.syncTimer);
  }
  
  // Set new timer
  syncState.syncTimer = setTimeout(() => {
    syncToGitHub();
  }, SYNC_CONFIG.SYNC_DELAY);
}

/**
 * Save current board state to local storage
 */
function saveToLocalStorage() {
  try {
    // Get current board data from the DOM
    const boardData = window.getBoardDataFromDOM();
    
    // Save to local storage
    localStorage.setItem(SYNC_CONFIG.LOCAL_STORAGE_KEY, JSON.stringify({
      boardData,
      timestamp: new Date().toISOString(),
      repoInfo: {
        repo: syncState.currentRepo,
        path: syncState.currentPath,
        branch: syncState.currentBranch
      }
    }));
    
    syncState.lastLocalSave = new Date();
    console.log('Saved to local storage at', syncState.lastLocalSave);
  } catch (error) {
    console.error('Error saving to local storage:', error);
  }
}

/**
 * Load board state from local storage
 */
function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem(SYNC_CONFIG.LOCAL_STORAGE_KEY);
    if (!savedData) return;
    
    const parsedData = JSON.parse(savedData);
    if (!parsedData.boardData) return;
    
    // Restore repository info
    if (parsedData.repoInfo) {
      syncState.currentRepo = parsedData.repoInfo.repo;
      syncState.currentPath = parsedData.repoInfo.path;
      syncState.currentBranch = parsedData.repoInfo.branch || 'master';
    }
    
    // Render board with loaded data
    if (window.renderKanbanBoard && document.getElementById('board-container')) {
      window.renderKanbanBoard(
        document.getElementById('board-container'), 
        parsedData.boardData
      );
    }
    
    console.log('Loaded from local storage, last saved at', parsedData.timestamp);
  } catch (error) {
    console.error('Error loading from local storage:', error);
  }
}

/**
 * Sync current board state to GitHub
 * @returns {Promise<boolean>} Whether sync was successful
 */
async function syncToGitHub() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Not authenticated, cannot sync to GitHub');
    return false;
  }
  
  if (!syncState.pendingChanges) {
    console.log('No pending changes to sync');
    return true;
  }
  
  if (!syncState.currentRepo || !syncState.currentPath) {
    console.log('No repository information, cannot sync');
    return false;
  }
  
  try {
    window.auth.updateSyncStatus('syncing');
    
    // Get current board data
    const boardData = window.getBoardDataFromDOM();
    
    // Convert board data back to markdown
    const markdownContent = boardDataToMarkdown(boardData);
    
    // Extract owner and repo from repo string (format: owner/repo)
    const [owner, repo] = syncState.currentRepo.split('/');
    
    // Call Netlify Function to update file on GitHub
    const response = await fetch('/.netlify/functions/github-update-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        owner,
        repo,
        path: syncState.currentPath,
        content: markdownContent,
        commitMessage: 'Update Kanban board via KanbanMD Tool',
        branch: syncState.currentBranch
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub sync error:', errorData);
      window.auth.updateSyncStatus('offline');
      return false;
    }
    
    const result = await response.json();
    console.log('GitHub sync successful:', result);
    
    // Update sync state
    syncState.lastGitHubSync = new Date();
    syncState.pendingChanges = false;
    window.auth.updateSyncStatus('synced');
    
    return true;
  } catch (error) {
    console.error('Error syncing to GitHub:', error);
    window.auth.updateSyncStatus('offline');
    return false;
  }
}

/**
 * Convert board data to markdown format
 * @param {Array} boardData - The board data to convert
 * @returns {string} Markdown representation of the board
 */
function boardDataToMarkdown(boardData) {
  let markdown = '';
  
  // Process each column
  boardData.forEach(column => {
    markdown += `## ${column.title}\n\n`;
    
    // Process each card in the column
    column.cards.forEach(card => {
      // Add the main task
      const checkbox = card.completed ? '[x]' : '[ ]';
      markdown += `- ${checkbox} ${card.text}\n`;
      
      // Add subtasks if any
      if (card.subtasks && card.subtasks.length > 0) {
        card.subtasks.forEach(subtask => {
          const subtaskCheckbox = subtask.completed ? '[x]' : '[ ]';
          const indent = '  '.repeat(subtask.indentation || 1);
          markdown += `${indent}- ${subtaskCheckbox} ${subtask.text}\n`;
        });
      }
      
      // Add extended content if any
      if (card.content) {
        const contentLines = card.content.split('\n');
        contentLines.forEach(line => {
          markdown += `  ${line}\n`;
        });
      }
      
      // Add metadata if any
      if (card.priority) {
        markdown += `  !${card.priority}\n`;
      }
      
      if (card.dueDate) {
        markdown += `  @${card.dueDate}\n`;
      }
      
      if (card.tags && card.tags.length > 0) {
        card.tags.forEach(tag => {
          markdown += `  #${tag}\n`;
        });
      }
      
      // Add spacing between cards
      markdown += '\n';
    });
    
    // Add spacing between columns
    markdown += '\n';
  });
  
  return markdown;
}

/**
 * Manually trigger sync to GitHub
 * @returns {Promise<boolean>} Whether sync was successful
 */
async function manualSync() {
  // Save to local storage first
  saveToLocalStorage();
  
  // Then sync to GitHub
  return syncToGitHub();
}

/**
 * Set the current repository information
 * @param {string} repo - Repository in format 'owner/repo'
 * @param {string} path - File path within the repository
 * @param {string} branch - Branch name (defaults to 'master')
 */
function setRepoInfo(repo, path, branch = 'master') {
  syncState.currentRepo = repo;
  syncState.currentPath = path;
  syncState.currentBranch = branch;
  
  // Save the repo info to local storage
  saveToLocalStorage();
}

// Initialize sync when DOM is loaded
document.addEventListener('DOMContentLoaded', initSync);

// Export functions for use in other modules
window.sync = {
  manualSync,
  setRepoInfo,
  loadFromLocalStorage,
  saveToLocalStorage
};
