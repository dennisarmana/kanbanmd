/**
 * GitHub OAuth Authentication Module
 * Handles user authentication and session management directly with GitHub OAuth.
 */

// GitHub OAuth Configuration
const authConfig = {
  clientId: 'Ov23lifJBTDDgx7A08S2', // Your GitHub OAuth App client ID
  redirectUri: 'https://kanbanmd.netlify.app/callback.html',
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: '/.netlify/functions/github-token',
  scope: 'repo' // Scope needed for private repos
};

// Global authentication state
const authState = {
  isAuthenticated: false,
  user: null,
  githubToken: null,
  loading: true
};

// DOM elements
let loginButton;
let logoutButton;
let userInfo;
let syncIndicator;
let syncText;

// Initialize authentication
function initAuth() {
  console.log('Initializing GitHub OAuth');
  
  // DOM elements
  loginButton = document.getElementById('login-button');
  logoutButton = document.getElementById('logout-button');
  userInfo = document.getElementById('user-info');
  syncIndicator = document.getElementById('sync-indicator');
  syncText = document.getElementById('sync-text');
  
  // Update login button click handler
  if (loginButton) {
    loginButton.onclick = login;
  }
  
  // Setup logout button if it exists
  if (logoutButton) {
    logoutButton.onclick = logout;
  }
  
  // Check if we have a code parameter (from OAuth redirect)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (code) {
    // Exchange code for token using our Netlify function
    exchangeCodeForToken(code);
  } else {
    // Check for existing session
    checkSession();
  }
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code) {
  try {
    const response = await fetch(authConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
    
    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }
    
    const data = await response.json();
    if (data.access_token) {
      setSession(data.access_token);
      await fetchUserInfo(data.access_token);
    } else {
      throw new Error('No access token received');
    }
  } catch (error) {
    console.error('Token exchange error:', error);
    clearSession();
  }
}

// Check if we have a valid session already
function checkSession() {
  authState.loading = true;
  
  // Check if we have a stored token and it's not expired
  const token = localStorage.getItem('github_token');
  const expiresAt = localStorage.getItem('github_token_expires_at');
  
  if (token && expiresAt && new Date().getTime() < parseInt(expiresAt)) {
    authState.githubToken = token;
    fetchUserInfo(token)
      .then(() => {
        authState.loading = false;
      })
      .catch(error => {
        console.error('Error checking session:', error);
        clearSession();
        authState.loading = false;
      });
  } else {
    clearSession();
    authState.loading = false;
  }
}

// Get user info from GitHub API
async function fetchUserInfo(token) {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }
    
    const user = await response.json();
    setUser(user);
    
    // Initialize sync module after authentication is complete
    if (typeof initializeSync === 'function') {
      initializeSync();
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
    clearSession();
  }
}

// Store authentication data in local storage
function setSession(token, expiresIn = 3600) {
  // Calculate expiration time (default to 1 hour)
  const expiresAt = new Date().getTime() + (expiresIn * 1000);
  
  // Store authentication data
  localStorage.setItem('github_token', token);
  localStorage.setItem('github_token_expires_at', expiresAt.toString());
  
  // Update auth state
  authState.githubToken = token;
  authState.isAuthenticated = true;
}

// Set user and update UI
function setUser(user) {
  authState.user = user;
  authState.isAuthenticated = true;
  
  // Update UI
  updateUI();
}

// Update UI based on authentication state
function updateUI() {
  if (authState.isAuthenticated) {
    // User is authenticated
    if (loginButton) loginButton.style.display = 'none';
    if (logoutButton) logoutButton.style.display = 'inline-block';
    if (userInfo) {
      userInfo.textContent = authState.user ? `${authState.user.name || authState.user.login}` : '';
      userInfo.style.display = 'inline-block';
    }
    
    // Update sync indicator if available
    if (syncIndicator) {
      syncIndicator.classList.remove('offline');
      syncIndicator.classList.add('online');
    }
    
    if (syncText) {
      syncText.textContent = 'Synced';
    }
    
    // Enable GitHub operations
    document.body.classList.add('github-authenticated');
    
    // Initialize sync after authentication
    if (typeof initializeSync === 'function') {
      initializeSync();
    }
  } else {
    // User is not authenticated
    if (loginButton) loginButton.style.display = 'inline-block';
    if (logoutButton) logoutButton.style.display = 'none';
    if (userInfo) userInfo.style.display = 'none';
    
    // Update sync indicator if available
    if (syncIndicator) {
      syncIndicator.classList.remove('online');
      syncIndicator.classList.add('offline');
    }
    
    if (syncText) {
      syncText.textContent = 'Offline';
    }
    
    // Disable GitHub operations
    document.body.classList.remove('github-authenticated');
    
    console.log('User logged out');
  }
}

/**
 * Log user in with GitHub
 */
function login() {
  // Create the authorization URL with all required parameters
  const authUrl = new URL(authConfig.authorizationEndpoint);
  authUrl.searchParams.append('client_id', authConfig.clientId);
  authUrl.searchParams.append('redirect_uri', authConfig.redirectUri);
  authUrl.searchParams.append('scope', authConfig.scope);
  authUrl.searchParams.append('state', generateRandomState());
  
  // Redirect to GitHub authorization endpoint
  window.location.href = authUrl.toString();
}

/**
 * Log user out
 */
function logout() {
  clearSession();
  // Simply redirect to the home page after clearing session
  window.location.href = '/';
}

// Clear the local session data
function clearSession() {
  // Remove tokens and expiry time
  localStorage.removeItem('github_token');
  localStorage.removeItem('github_token_expires_at');
  
  // Reset auth state
  authState.isAuthenticated = false;
  authState.user = null;
  authState.githubToken = null;
  
  // Update UI
  updateUI();
}

// Generate a random state parameter for OAuth security
function generateRandomState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Get the GitHub token if available
 * @returns {string|null} - GitHub token or null if not available
 * Get the GitHub token for the authenticated user
 * @returns {string|null} The GitHub token or null if not authenticated
 */
function getGitHubToken() {
  if (!authState.githubToken) {
    // Try to get from localStorage if not already in memory
    authState.githubToken = localStorage.getItem('github_token');
  }
  return authState.githubToken;
}

// Initialize authentication when the DOM is loaded
document.addEventListener('DOMContentLoaded', initAuth);

// Export functions for use in other modules
window.auth = {
  isAuthenticated: () => authState.isAuthenticated,
  getGitHubToken,
  login,
  logout
};
