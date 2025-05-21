<template>
    <div class="login-container card">
        <h2>Web Login</h2>
        <form @submit.prevent="handleLogin">
            <div class="form-group">
                <label for="telegramId">Telegram ID:</label>
                <input type="number" id="telegramId" v-model="tgId" required>
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" v-model="password" required>
            </div>
            <button type="submit" :disabled="isLoading">Login</button>
            <div v-if="error" class="error-message">{{ error }}</div>
             <p class="hint">Set your password using the /setpassword command in the Telegram bot.</p>
        </form>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const tgId = ref('');
const password = ref('');
const isLoading = ref(false);
const error = ref(null);

const handleLogin = async () => {
    isLoading.value = true;
    error.value = null;

    // Basic validation
    if (!tgId.value || !password.value) {
        error.value = 'Please enter both Telegram ID and password.';
        isLoading.value = false;
        return;
    }

    try {
        // Replace with your actual backend login endpoint URL
        const LOGIN_API_URL = import.meta.env.VITE_WEB_LOGIN_API_URL; // Need to set this env var
        if (!LOGIN_API_URL) { throw new Error("Login API URL is not configured."); }


        const response = await fetch(LOGIN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tg_id: parseInt(tgId.value, 10), // Ensure it's a number
                password: password.value,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Login failed.');
        }

        const data = await response.json();
        const token = data.token;

        if (!token) {
             throw new Error('Login successful, but no token received.');
        }

        // Store the token (e.g., in localStorage)
        localStorage.setItem('dream_analyzer_jwt', token);
        console.log('Login successful, token stored.');

        // Emit an event or redirect to indicate successful login
        // For now, we'll rely on App.vue watching for the token

    } catch (err) {
        console.error('Login error:', err);
        error.value = err.message;
    } finally {
        isLoading.value = false;
    }
};
</script>

<style scoped>
.login-container {
    max-width: 400px;
    margin: 50px auto;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background-color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
    margin-bottom: 15px;
}

label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

input[type="text"], input[type="password"], input[type="number"] {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box; /* Include padding in width */
}

button {
    width: 100%;
    padding: 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.2s ease;
}

button:hover:not(:disabled) {
    background-color: #0056b3;
}

button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.error-message {
    color: #d9534f;
    margin-top: 15px;
    text-align: center;
}

.hint {
    font-size: 0.9em;
    color: #666;
    text-align: center;
    margin-top: 20px;
}
</style>
