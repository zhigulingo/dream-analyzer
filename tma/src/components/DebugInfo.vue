<template>
  <div class="debug-info" v-if="showDebug">
    <h3>Debug Information</h3>
    <div class="debug-item">
      <strong>API Base URL:</strong> {{ apiBaseUrl || 'NOT SET' }}
    </div>
    <div class="debug-item">
      <strong>Telegram WebApp Available:</strong> {{ telegramAvailable }}
    </div>
    <div class="debug-item">
      <strong>InitData Available:</strong> {{ initDataAvailable }}
    </div>
    <div class="debug-item">
      <strong>Environment:</strong> {{ environment }}
    </div>
    <div class="debug-item">
      <strong>User Agent:</strong> {{ userAgent }}
    </div>
    <button @click="showDebug = false" class="close-debug">Close Debug</button>
  </div>
  <button v-else @click="showDebug = true" class="show-debug">Show Debug</button>
</template>

<script setup>
import { ref, computed } from 'vue'

const showDebug = ref(false)

const apiBaseUrl = computed(() => import.meta.env.VITE_API_BASE_URL)
const telegramAvailable = computed(() => !!window.Telegram?.WebApp)
const initDataAvailable = computed(() => !!window.Telegram?.WebApp?.initData)
const environment = computed(() => import.meta.env.MODE)
const userAgent = computed(() => navigator.userAgent)
</script>

<style scoped>
.debug-info {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 15px;
  border-radius: 8px;
  z-index: 9999;
  max-width: 300px;
  font-size: 12px;
}

.debug-item {
  margin-bottom: 8px;
  word-break: break-all;
}

.show-debug, .close-debug {
  position: fixed;
  top: 10px;
  right: 10px;
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  z-index: 9999;
  font-size: 12px;
}

.close-debug {
  position: static;
  margin-top: 10px;
  background: #dc3545;
}
</style>