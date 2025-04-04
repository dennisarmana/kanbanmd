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

// DOM elements
let loginButton, userInfo, usernameDisplay, syncIndicator, syncText;

/**
 * Initialize authentication
 */
function initAuth() {
  console.log('Initializing Auth0');
  
  // Get DOM elements after the DOM is loaded
  loginButton = document.getElementById('login-button');
  userInfo = document.getElementById('user-info');
  usernameDisplay = document.getElementById('username');
  syncIndicator = document.getElementById('sync-indicator');
  syncText = document.getElementById('sync-text');
  
  // Create Auth0 WebAuth instance
  authState.auth0Client = new auth0.WebAuth({
    domain: 'dev-zjt51en5zisu615c.us.auth0.com',
    clientID: 'iFZoba1GgxzgPpQr9mVkkL3cospv4BnC',
    responseType: 'token id_token',
    scope: 'openid profile email read:user repo',
    redirectUri: window.location.origin
  });
  
  // Update login button click handler
  if (loginButton) {
    loginButton.onclick = login;
  }
  
  // Setup logout button if it exists
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.onclick = logout;
  }
  
  // Check if we have a callback from Auth0
  parseAuthHash();
  
  // Check if we have a valid session already
  checkSession();
}

/**
 * Parse the authentication hash
 */
function parseAuthHash() {
  authState.auth0Client.parseHash((err, authResult) => {
    if (authResult && authResult.accessToken && authResult.idToken) {
      // Set tokens and expiration time
      setSession(authResult);
      
      // Get user info
      authState.auth0Client.client.userInfo(authResult.accessToken, (err, user) => {
        if (err) {
          console.error('Error getting user info:', err);
          return;
        }
        handleUserLogin(user, authResult);
      });
      
      // Remove hash from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (err) {
      console.error('Auth0 authentication error:', err);
      handleUserLogout();
      
      // Remove hash from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });
}

/**
 * Check if there is an existing session
 */
function checkSession() {
  authState.auth0Client.checkSession({}, (err, authResult) => {
    if (authResult && authResult.accessToken && authResult.idToken) {
      setSession(authResult);
      
      // Get user info
      authState.auth0Client.client.userInfo(authResult.accessToken, (err, user) => {
        if (err) {
          console.error('Error getting user info:', err);
          return;
        }
        handleUserLogin(user, authResult);
      });
    } else if (err) {
      // Silent authentication error. User might not be authenticated.
      console.log('Silent authentication error:', err);
      handleUserLogout();
    }
  });
}

/**
 * Set the user's session
 * @param {Object} authResult - The authentication result
 */
function setSession(authResult) {
  // Set the time that the access token will expire
  const expiresAt = JSON.stringify(authResult.expiresIn * 1000 + new Date().getTime());
  localStorage.setItem('auth0_access_token', authResult.accessToken);
  localStorage.setItem('auth0_id_token', authResult.idToken);
  localStorage.setItem('auth0_expires_at', expiresAt);
  
  // Store access token as GitHub token
  // Since we're using GitHub as our identity provider, the access token is the GitHub token
  if (authResult.accessToken) {
    localStorage.setItem('github_token', authResult.accessToken);
    authState.githubToken = authResult.accessToken;
  }
}

/**
 * Handle user login
 * @param {Object} user - The authenticated user object
 * @param {Object} authResult - The authentication result
 */
function handleUserLogin(user, authResult) {
  authState.user = user;
  authState.isAuthenticated = true;
  
  // When using GitHub as identity provider, the access token is the GitHub token
  if (authResult && authResult.accessToken) {
    authState.githubToken = authResult.accessToken;
  } else {
    // Try to get from localStorage as a backup
    authState.githubToken = localStorage.getItem('github_token');
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
  // Remove tokens and expiry time from localStorage
  localStorage.removeItem('auth0_access_token');
  localStorage.removeItem('auth0_id_token');
  localStorage.removeItem('auth0_expires_at');
  localStorage.removeItem('github_token');
  
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
function login() {
  if (!authState.auth0Client) {
    console.error('Auth0 client not initialized');
    return;
  }
  
  authState.auth0Client.authorize();
}

/**
 * Logout from Auth0
 */
function logout() {
  handleUserLogout();
  
  // Redirect to Auth0 logout to clear the Auth0 session
  authState.auth0Client.logout({
    returnTo: window.location.origin
  });
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
  // Check whether the current time is past the access token's expiry time
  const expiresAt = JSON.parse(localStorage.getItem('auth0_expires_at') || '0');
  const isAuth = new Date().getTime() < expiresAt && !!localStorage.getItem('auth0_access_token');
  authState.isAuthenticated = isAuth;
  return isAuth;
}

/**
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
  isAuthenticated,
  getGitHubToken,
  updateSyncStatus,
  login,
  logout
};
