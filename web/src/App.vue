<template>
  <div class="web-app-container">
    <template v-if="isAuthenticated">
        <!-- User is authenticated, show account info -->
        <div class="personal-account">
            <h1>Ваш Личный кабинет (Web)</h1>

            <!-- Logout Button -->
            <button @click="handleLogout" class="logout-button">Logout</button>

            <!-- Блок 1: Информация о пользователе -->
            <section class="user-info card">
                <h2>Ваш профиль</h2>
                <div v-if="isLoadingProfile">Загрузка профиля...</div>
                <div v-else-if="errorProfile" class="error-message">
                    Ошибка загрузки профиля: {{ errorProfile }}
                </div>
                <div v-else-if="profile.tokens !== null">
                    <p>Остаток токенов: <strong>{{ profile.tokens }}</strong></p>
                    <p>
                        Текущий тариф: <strong class="capitalize">{{ profile.subscription_type }}</strong>
                        <span v-if="profile.subscription_end">
                            (до {{ formatDate(profile.subscription_end) }})
                        </span>
                    </p>
                </div>
                <div v-else>
                    <p>Не удалось загрузить данные профиля.</p>
                </div>
            </section>

            <!-- Блок 2: История анализов -->
            <section class="history card">
                <h2>История анализов</h2>
                <div v-if="isLoadingHistory">Загрузка истории...</div>
                <div v-else-if="errorHistory" class="error-message">
                    Ошибка загрузки истории: {{ errorHistory }}
                </div>
                <div v-else-if="history && history.length > 0">
                    <ul>
                        <li v-for="item in history" :key="item.id" class="history-item">
                            <p><strong>Дата:</strong> {{ formatDate(item.created_at) }}</p>
                            <p><strong>Запрос:</strong> {{ item.dream_text }}</p>
                            <p><strong>Анализ:</strong> {{ item.analysis }}</p>
                        </li>
                    </ul>
                </div>
                <div v-else>
                    <p>У вас пока нет сохраненных анализов.</p>
                </div>
            </section>

        </div>
    </template>
    <template v-else>
        <!-- User is not authenticated, show login form -->
        <Login @login-success="handleLoginSuccess" />
    </template>
  </div>
</template>

<script setup>
<<<<<<< HEAD
import { ref, onMounted, watch } from 'vue';
import Login from './components/Login.vue';

const profile = ref({ tokens: null, subscription_type: 'free', subscription_end: null });
const history = ref([]);
const isLoadingProfile = ref(false);
const isLoadingHistory = ref(false);
const errorProfile = ref(null);
const errorHistory = ref(null);
const isAuthenticated = ref(false); // Reactive state for authentication status

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Re-using the backend URL env var
if (!API_BASE_URL) { console.error("VITE_API_BASE_URL is not set"); }

const getToken = () => localStorage.getItem('dream_analyzer_jwt');
const setToken = (token) => localStorage.setItem('dream_analyzer_jwt', token);
const removeToken = () => localStorage.removeItem('dream_analyzer_jwt');

const checkAuthentication = () => {
    isAuthenticated.value = getToken() !== null;
};

const fetchProfile = async () => {
  const token = getToken();
  if (!token) { // Should not happen if isAuthenticated is true, but as a safeguard
      console.warn('fetchProfile called without token.');
      isAuthenticated.value = false; // Force logout state
      return;
  }

  isLoadingProfile.value = true;
  errorProfile.value = null;
  try {
    const response = await fetch(`${API_BASE_URL}/user-profile`, {
        headers: {
            'Authorization': `Bearer ${token}`, // Include the JWT
        },
    });

    if (response.status === 401 || response.status === 403) {
         console.warn('Profile fetch: Authentication failed (401/403).');
         // Token is invalid or expired, force re-authentication
         handleLogout();
         return;
    }

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch profile.');
    }

    const data = await response.json();
    profile.value = data;

  } catch (err) {
    console.error('Error fetching profile:', err);
    errorProfile.value = err.message;
  } finally {
    isLoadingProfile.value = false;
  }
};

const fetchHistory = async () => {
  const token = getToken();
  if (!token) { // Should not happen if isAuthenticated is true, but as a safeguard
      console.warn('fetchHistory called without token.');
      isAuthenticated.value = false; // Force logout state
      return;
  }

  isLoadingHistory.value = true;
  errorHistory.value = null;
  try {
    const response = await fetch(`${API_BASE_URL}/analyses-history`, {
        headers: {
            'Authorization': `Bearer ${token}`, // Include the JWT
        },
    });

     if (response.status === 401 || response.status === 403) {
         console.warn('History fetch: Authentication failed (401/403).');
         // Token is invalid or expired, force re-authentication
         handleLogout();
         return;
    }

    if (!response.ok) {
         const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch history.');
    }

    const data = await response.json();
    history.value = data;

  } catch (err) {
    console.error('Error fetching history:', err);
    errorHistory.value = err.message;
  } finally {
    isLoadingHistory.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return dateString;
  }
};

const handleLoginSuccess = () => {
    console.log('Login success event received.');
    checkAuthentication(); // Check if token is now present
};

const handleLogout = () => {
    console.log('Logging out.');
    removeToken();
    checkAuthentication(); // Update authentication status
    // Clear displayed data
    profile.value = { tokens: null, subscription_type: 'free', subscription_end: null };
    history.value = [];
};

// Watch for changes in isAuthenticated state to trigger data fetching
watch(isAuthenticated, (newVal) => {
    if (newVal) {
        console.log('isAuthenticated changed to true, fetching data...');
        fetchProfile();
        fetchHistory();
    } else {
        console.log('isAuthenticated changed to false.');
    }
});

onMounted(() => {
  console.log('App mounted, checking authentication...');
  checkAuthentication();
});
=======
// No need to import PersonalAccount here anymore, routing will handle it
>>>>>>> 5d8a398 (Stage all changes before rebase and push)
</script>

<style scoped>
/* Add or adapt styles from tma/src/views/PersonalAccount.vue and web/src/style.css */
.web-app-container {
    padding: 15px;
    color: #333;
    background-color: #f4f4f4;
    min-height: 100vh;
}

.personal-account {
    max-width: 800px;
    margin: 20px auto;
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card {
  background-color: #fff; /* Card background is white within the grey container */
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

h1, h2 {
 color: #0056b3;
  margin-top: 0;
  margin-bottom: 10px;
}

.logout-button {
    background-color: #dc3545;
    color: white;
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    float: right; /* Position to the right */
    margin-top: -40px; /* Adjust position */
}

.logout-button:hover {
    background-color: #c82333;
}

.error-message {
  color: #d9534f;
  font-weight: bold;
}

.history-item {
    border-bottom: 1px solid #eee;
    margin-bottom: 15px;
    padding-bottom: 15px;
}

.history-item:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.history-item p {
    margin-bottom: 5px;
}

.history-item strong {
    margin-right: 5px;
}

/* Add more styles as needed */
</style>
