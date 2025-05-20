<template>
  <div class="web-login">
    <h1>Dream Analyzer</h1>
    <p>Please login with your Telegram account to access the application</p>
    
    <div class="login-container">
      <!-- Standard Telegram Login Widget -->
      <div id="telegram-login"></div>
      
      <!-- New Bot Authentication Option -->
      <div class="bot-auth-section">
        <h3>Login via Bot</h3>
        <p>For better security and reliability, please use our new login method:</p>
        <a :href="getBotLoginUrl()" class="bot-login-button" target="_blank">
          Login with Telegram Bot
        </a>
        <p class="hint">After authenticating in Telegram, you'll be automatically logged in here.</p>
        <div v-if="sessionStatus === 'waiting'" class="status-message waiting">
          Waiting for authentication from Telegram... <br>
          <small>(Please approve login in Telegram and return to this window)</small>
        </div>
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div v-if="user" class="success-message">
        Successfully logged in as {{ user.first_name }} {{ user.last_name }}
        <button @click="proceedToApp" class="proceed-button">Continue to App</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import api from '@/services/api';
import botAuthService from '@/services/botAuthService';

const router = useRouter();
const userStore = useUserStore();
const user = ref(null);
const error = ref(null);
const sessionId = ref('');
const sessionStatus = ref('waiting');
const pollInterval = ref(null);

// Function to handle successful Telegram authentication
const onTelegramAuth = (userData) => {
  console.log('Telegram auth success:', userData);
  
  // Ensure we have the required user data
  if (!userData || !userData.id) {
    error.value = 'Invalid user data received from Telegram';
    console.error('Invalid user data:', userData);
    return;
  }
  
  // Save the user data to the store
  userStore.setWebUser(userData);
  user.value = userData;
  
  // Call your backend API to verify the user
  verifyUser(userData);
};

// Function to verify user with your backend
const verifyUser = async (userData) => {
  try {
    // Call the API to verify the user
    const response = await api.verifyWebAuth(userData);
    
    if (response.data.success) {
      console.log('User verified successfully:', response.data);
      // Update the user store with any additional data from the response
      if (response.data.user) {
        userStore.setWebUser({ ...userData, ...response.data.user });
      }
    } else {
      error.value = response.data.error || 'Verification failed';
      console.error('Verification failed:', response.data);
    }
  } catch (err) {
    error.value = 'Failed to verify user. Please try again.';
    console.error('Verification error:', err);
  }
};

// Function to proceed to the main app after login
const proceedToApp = () => {
  router.push('/account');
};

// Check if we're inside Telegram WebApp
const checkTelegramWebApp = () => {
  if (window.Telegram?.WebApp) {
    console.log('Running inside Telegram WebApp, redirecting to account');
    // No need for login widget in Telegram WebApp
    router.push('/account');
    return true;
  }
  return false;
};

// Check URL for session ID or auth token
const checkUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('auth_token');
  const session = urlParams.get('session');
  
  if (token) {
    console.log('Found auth token in URL');
    handleAuthToken(token);
    return true;
  }
  
  if (session) {
    console.log('Found session ID in URL');
    handleSessionId(session);
    return true;
  }
  
  return false;
};

// Handle auth token from URL
const handleAuthToken = (token) => {
  try {
    console.log('[WebLogin] Processing auth token from URL');
    
    // Clean up URL - remove token parameter
    const url = new URL(window.location);
    url.searchParams.delete('auth_token');
    window.history.replaceState({}, document.title, url);
    
    // Store the token
    localStorage.setItem('bot_auth_token', token);
    
    // Show success message
    sessionStatus.value = 'approved';
    
    // Display a message to the user
    error.value = null;
    
    // Fetch user profile
    userStore.fetchProfile()
      .then(() => {
        // Set user information
        user.value = userStore.webUser;
        console.log('[WebLogin] Authentication successful, user profile loaded');
        
        // Auto-proceed to app
        setTimeout(() => {
          console.log('[WebLogin] Redirecting to account page');
          proceedToApp();
        }, 1500);
      })
      .catch(e => {
        console.error('[WebLogin] Error fetching profile after authentication:', e);
        error.value = 'Authentication successful, but failed to load your profile. Please try again.';
      });
  } catch (e) {
    console.error('[WebLogin] Error processing token from URL:', e);
    error.value = 'Failed to authenticate with token. Please try again.';
  }
};

// Handle session ID from URL
const handleSessionId = (session) => {
  // Store the session ID
  sessionId.value = session;
  
  // Clean up URL - remove session parameter
  const url = new URL(window.location);
  url.searchParams.delete('session');
  window.history.replaceState({}, document.title, url);
  
  // Start polling for session status
  startPolling();
};

// Poll for session status
const startPolling = () => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value);
  }
  
  sessionStatus.value = 'waiting';
  
  // Poll every 2 seconds
  pollInterval.value = setInterval(() => {
    checkSessionStatus();
  }, 2000);
  
  // Stop polling after 5 minutes (same as session expiry)
  setTimeout(() => {
    stopPolling();
    if (sessionStatus.value === 'waiting') {
      sessionStatus.value = 'expired';
      error.value = 'Authentication session expired. Please try again.';
    }
  }, 300000);
};

// Check if session has been approved
const checkSessionStatus = async () => {
  if (!sessionId.value) return;
  
  try {
    // Make API call to check session status
    const response = await api.checkSessionStatus(sessionId.value);
    
    if (response.data.approved) {
      // Session approved, stop polling
      stopPolling();
      
      // Set the auth token
      if (response.data.token) {
        localStorage.setItem('bot_auth_token', response.data.token);
        
        // Show success message
        sessionStatus.value = 'approved';
        
        // Fetch user profile and proceed to app
        await userStore.fetchProfile();
        user.value = userStore.webUser;
        
        // Auto-proceed to app
        setTimeout(() => {
          proceedToApp();
        }, 2000);
      } else {
        error.value = 'Authentication approved but no token received';
        sessionStatus.value = 'error';
      }
    } else if (response.data.expired) {
      // Session expired
      stopPolling();
      sessionStatus.value = 'expired';
      error.value = 'Authentication session expired. Please try again.';
    }
  } catch (e) {
    console.error('Error checking session status:', e);
    // Don't stop polling on error, just log it
  }
};

// Stop polling
const stopPolling = () => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value);
    pollInterval.value = null;
  }
};

// Function to get the Telegram Bot login URL with session ID
const getBotLoginUrl = () => {
  // Generate a session ID if we don't have one
  if (!localStorage.getItem('browser_session_id')) {
    const newSessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2);
    localStorage.setItem('browser_session_id', newSessionId);
  }
  
  const sessionId = localStorage.getItem('browser_session_id');
  // Use a simple format that doesn't have spaces or special characters
  return `https://t.me/dreamtestaibot?start=auth_${sessionId}`;
};

// Clean up on unmount
onUnmounted(() => {
  stopPolling();
});

onMounted(async () => {
  // Import auth service
  const authService = await import('@/services/authService');
  
  // EMERGENCY CLEAR - Check for forced logout flag
  const forceLogout = 
    authService.default.isForceLogoutActive() || 
    window.location.search.includes('force_logout=true');
    
  if (forceLogout) {
    console.log('[WebLogin] EMERGENCY LOGOUT detected!');
    
    // Use auth service for cleanup
    try {
      // Clear user store
      userStore.webUser = null;
      userStore.isWebAuthenticated = false;
      
      // Clear all auth data
      authService.default.clearAllAuthData();
      
      console.log('[WebLogin] Emergency cleanup complete');
    } catch (e) {
      console.error('[WebLogin] Error during cleanup:', e);
    }
  }

  // Check for auth error parameter
  if (window.location.search.includes('error=auth_expired')) {
    error.value = 'Your session has expired. Please login again.';
  }

  // Normal logout detection (preserve for compatibility)
  if (window.location.search.includes('logout=true')) {
    console.log('[WebLogin] Detected logout parameter, ensuring cleanout');
    authService.default.clearAllAuthData();
    userStore.webUser = null;
    userStore.isWebAuthenticated = false;
  }

  // First check if we're in Telegram WebApp
  if (checkTelegramWebApp()) {
    return; // Skip widget initialization if in Telegram
  }
  
  // Check for existing login
  if (userStore.isWebAuthenticated) {
    user.value = userStore.webUser;
    return; // User is already authenticated
  }

  // Initialize the Telegram Widget
  // First check if it's already loaded
  if (!document.getElementById('telegram-login-script')) {
    // Create script element for Telegram Login Widget
    const script = document.createElement('script');
    script.id = 'telegram-login-script';
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', 'dreamtestaibot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-request-access', 'write');
    script.async = true;
    
    // Add the onTelegramAuth function to the window object
    window.onTelegramAuth = onTelegramAuth;
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    
    // Append the script to the telegram-login div
    document.getElementById('telegram-login').appendChild(script);
  }

  // Check for authentication params in URL first
  const hasAuthParams = checkUrlParams();
  
  // Check if we were redirected here with a processed token
  const urlParams = new URLSearchParams(window.location.search);
  const processToken = urlParams.get('process_token');
  
  if (processToken === 'true') {
    console.log('[WebLogin] Detected process_token parameter, checking for stored token');
    
    // Clean up URL
    const url = new URL(window.location);
    url.searchParams.delete('process_token');
    window.history.replaceState({}, document.title, url.pathname);
    
    // Check if we have a token in localStorage
    const storedToken = localStorage.getItem('bot_auth_token');
    if (storedToken) {
      console.log('[WebLogin] Found stored token, processing login');
      handleAuthToken(storedToken);
    }
  } 
  // Start polling for auth token in localStorage if no auth params and not processing token
  else if (!hasAuthParams) {
    // Generate a unique session ID
    const browserSessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // Store in localStorage
    localStorage.setItem('browser_session_id', browserSessionId);
    
    // Start polling for authentication
    startAuthPolling();
  }
});

// Function to poll the server for auth token
const startAuthPolling = () => {
  console.log('[WebLogin] Starting to poll for authentication');
  
  // Set status to waiting
  sessionStatus.value = 'waiting';
  
  // Get the session ID
  const sessionId = localStorage.getItem('browser_session_id');
  if (!sessionId) {
    console.error('[WebLogin] No session ID found in localStorage');
    error.value = 'Authentication error: No session ID. Please try again.';
    return;
  }
  
  // Poll the server every 3 seconds
  pollInterval.value = setInterval(async () => {
    try {
      console.log(`[WebLogin] Polling for auth status for session ${sessionId}`);
      
      // Call the API endpoint
      const response = await fetch(`/.netlify/functions/check-auth?session_id=${sessionId}`);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[WebLogin] Auth status:', data);
      
      if (data.approved && data.token) {
        console.log('[WebLogin] Auth approved, token received');
        stopPolling();
        
        // Store the token
        localStorage.setItem('bot_auth_token', data.token);
        
        // Process the token
        userStore.fetchProfile()
          .then(() => {
            user.value = userStore.webUser;
            console.log('[WebLogin] Authentication successful, user profile loaded');
            
            // Show success message
            error.value = null;
            sessionStatus.value = 'approved';
            
            // Auto-proceed to app
            setTimeout(() => {
              proceedToApp();
            }, 1000);
          })
          .catch(e => {
            console.error('[WebLogin] Error fetching profile after authentication:', e);
            error.value = 'Authentication successful, but failed to load your profile. Please try again.';
          });
      }
    } catch (e) {
      console.error('[WebLogin] Error polling for auth status:', e);
      // Don't show error to user unless it persists
    }
  }, 3000);
  
  // Stop polling after 5 minutes
  setTimeout(() => {
    stopPolling();
    if (sessionStatus.value === 'waiting') {
      sessionStatus.value = 'expired';
      error.value = 'Authentication session expired. Please try again.';
    }
  }, 300000);
};
</script>

<style scoped>
.web-login {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  text-align: center;
}

h1 {
  margin-bottom: 1rem;
  color: #333;
}

.login-container {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.error-message {
  color: #e53935;
  margin-top: 1rem;
}

.success-message {
  color: #43a047;
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.proceed-button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #4681c9;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.proceed-button:hover {
  background-color: #3a6eae;
}

.bot-auth-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.bot-auth-section h3 {
  margin-bottom: 0.5rem;
  color: #333;
}

.bot-login-button {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.8rem 1.5rem;
  background-color: #4681c9;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  transition: background-color 0.2s;
}

.bot-login-button:hover {
  background-color: #3a6eae;
}

.hint {
  font-size: 0.85rem;
  color: #666;
  margin-top: 1rem;
}

.bot-code-input {
  display: flex;
  margin-top: 0.5rem;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

.auth-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px 0 0 4px;
  font-size: 1rem;
}

.verify-button {
  padding: 0.5rem 1rem;
  background-color: #4681c9;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-weight: bold;
}

.verify-button:hover:not(:disabled) {
  background-color: #3a6eae;
}

.verify-button:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
}

.status-message {
  margin-top: 1rem;
  padding: 0.8rem;
  border-radius: 4px;
  text-align: center;
}

.status-message.waiting {
  background-color: #e3f2fd;
  color: #1565c0;
  border: 1px solid #bbdefb;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}
</style> 