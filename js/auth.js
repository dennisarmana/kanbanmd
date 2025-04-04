/**
 * auth.js - Handles authentication and GitHub synchronization
 * Manages Auth0 integration and synchronization status
 */

// Authentication state
let authState = {
  user: null,
  isAuthenticated: false,
  githubToken: null,
  syncStatus: 'offline', // 'offline', 'syncing', 'synced'
  auth0Client: null      // Auth0 client instance
};

// Auth0 configuration - these will need to be updated with your Auth0 values
const auth0Config = {
  domain: 'dev-zjt51en5zisu615c.us.auth0.com',       // e.g., 'dev-abc123.us.auth0.com'
  clientId: 'YOUR_AUTH0_CLIENT_ID',  // Get this from Auth0 dashboard
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: 'https://api.github.com/',  // GitHub API audience
    scope: 'openid profile email read:user repo'
  }
};

// DOM elements
let loginButton, userInfo, usernameDisplay, syncIndicator, syncText;

/**
 * Initialize authentication
 */
async function initAuth() {
  // Get DOM elements after the DOM is loaded
  loginButton = document.getElementById('login-button');
  userInfo = document.getElementById('user-info');
  usernameDisplay = document.getElementById('username');
  syncIndicator = document.getElementById('sync-indicator');
  syncText = document.getElementById('sync-text');
  
  // Update login button click handler
  if (loginButton) {
    loginButton.onclick = login;
  }
  
  // Setup logout button if it exists
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.onclick = logout;
  }

  try {
    // Create Auth0 client
    authState.auth0Client = await createAuth0Client(auth0Config);
    
    // Check if user was redirected after login
    if (window.location.search.includes('code=')) {
      // Handle the redirect and get tokens
      await authState.auth0Client.handleRedirectCallback();
      
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check if user is authenticated
    const isAuthenticated = await authState.auth0Client.isAuthenticated();
    
    if (isAuthenticated) {
      const user = await authState.auth0Client.getUser();
      handleUserLogin(user);
    } else {
      handleUserLogout();
    }
    
    console.log('Auth0 initialized');
  } catch (error) {
    console.error('Error initializing Auth0:', error);
    handleUserLogout();
  }
}

/**
 * Handle user login
 * @param {Object} user - The authenticated user object
 */
async function handleUserLogin(user) {
  authState.user = user;
  authState.isAuthenticated = true;
  
  try {
    // Get GitHub access token from the Claims
    const claims = await authState.auth0Client.getIdTokenClaims();
    if (claims) {
      // The token will be in a format like: { 'https://api.github.com/': { access_token: 'token' } }
      const githubClaim = claims['https://api.github.com/'];
      if (githubClaim && githubClaim.access_token) {
        authState.githubToken = githubClaim.access_token;
      }
    }
  } catch (error) {
    console.error('Error getting token claims:', error);
  }
  
  // Update UI
  if (loginButton && userInfo && usernameDisplay) {
    loginButton.style.display = 'none';
    userInfo.style.display = 'flex';
    usernameDisplay.textContent = user.name || user.email || 'User';
  }
  
  // Update sync status
  updateSyncStatus('synced');
  
  console.log('User logged in:', user);
}

/**
 * Handle user logout
 */
function handleUserLogout() {
  // Reset auth state
  authState.user = null;
  authState.isAuthenticated = false;
  authState.githubToken = null;
  
  // Update UI
  if (loginButton && userInfo) {
    loginButton.style.display = 'block';
    userInfo.style.display = 'none';
    if (usernameDisplay) {
      usernameDisplay.textContent = '';
    }
  }
  
  // Update sync status
  updateSyncStatus('offline');
  
  console.log('User logged out');
}

/**
 * Login with Auth0
 */
async function login() {
  if (!authState.auth0Client) {
    console.error('Auth0 client not initialized');
    return;
  }
  
  try {
    await authState.auth0Client.loginWithRedirect();
  } catch (error) {
    console.error('Login error:', error);
  }
}

/**
 * Logout from Auth0
 */
async function logout() {
  if (!authState.auth0Client) {
    console.error('Auth0 client not initialized');
    return;
  }
  
  try {
    await authState.auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
    handleUserLogout();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

/**
 * Update the sync status indicator
 * @param {string} status - The sync status ('offline', 'syncing', 'synced')
 */
function updateSyncStatus(status) {
  authState.syncStatus = status;
  
  // Update CSS classes for the indicator
  if (syncIndicator) {
    syncIndicator.classList.remove('offline', 'syncing', 'synced');
    syncIndicator.classList.add(status);
  }
  
  // Update text
  if (syncText) {
    switch (status) {
      case 'offline':
        syncText.textContent = 'Offline';
        break;
      case 'syncing':
        syncText.textContent = 'Syncing...';
        break;
      case 'synced':
        syncText.textContent = 'Synced';
        break;
    }
  }
}

/**
 * Check if the user is authenticated
 * @returns {boolean} Whether the user is authenticated
 */
function isAuthenticated() {
  return authState.isAuthenticated;
}

/**
 * Get the GitHub token for the authenticated user
 * @returns {string|null} The GitHub token or null if not authenticated
 */
function getGitHubToken() {
  return authState.githubToken;
}

// Initialize authentication when the DOM is loaded
document.addEventListener('DOMContentLoaded', initAuth);

// Export functions for use in other modules
window.auth = {
  isAuthenticated,
  getGitHubToken,
  updateSyncStatus,
  login,
  logout
};
