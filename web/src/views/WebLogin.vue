<template>
  <div class="web-login">
    <h1>Dream Analyzer</h1>
    <p>Please login with your Telegram account to access the application</p>
    
    <div class="login-container">
      <!-- Placeholder for Telegram Login Widget -->
      <div id="telegram-login"></div>
      
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import api from '@/services/api';

const router = useRouter();
const userStore = useUserStore();
const user = ref(null);
const error = ref(null);

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

onMounted(() => {
  // EMERGENCY CLEAR - Check for forced logout flag
  const forceLogout = 
    localStorage.getItem('force_logout') === 'true' || 
    window.location.search.includes('force_logout=true');
    
  if (forceLogout) {
    console.log('[WebLogin] EMERGENCY LOGOUT detected!');
    
    // Clear all possible storage
    try {
      // Clear user store
      userStore.webUser = null;
      userStore.isWebAuthenticated = false;
      
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.trim().split("=")[0] + "=;expires=" + new Date(0).toUTCString() + ";path=/";
      });
      
      console.log('[WebLogin] Emergency cleanup complete');
    } catch (e) {
      console.error('[WebLogin] Error during cleanup:', e);
    }
  }

  // Normal logout detection (preserve for compatibility)
  if (window.location.search.includes('logout=true')) {
    console.log('[WebLogin] Detected logout parameter, ensuring cleanout');
    localStorage.removeItem('telegram_user');
    sessionStorage.clear();
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
});
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
</style> 