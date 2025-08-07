<template>
  <div class="debug-info" v-if="showDebug">
    <h3>🔍 Debug Information</h3>
    
    <!-- API Configuration -->
    <div class="debug-section">
      <h4>📡 API Configuration</h4>
      <div class="debug-item">
        <strong>API Base URL:</strong> 
        <span :class="apiBaseUrl ? 'status-ok' : 'status-error'">
          {{ apiBaseUrl || 'NOT SET ❌' }}
        </span>
      </div>
    </div>

    <!-- Telegram WebApp Status -->
    <div class="debug-section">
      <h4>🤖 Telegram WebApp</h4>
      <div class="debug-item">
        <strong>WebApp Available:</strong> 
        <span :class="telegramAvailable ? 'status-ok' : 'status-error'">
          {{ telegramAvailable ? 'YES ✅' : 'NO ❌' }}
        </span>
      </div>
      <div class="debug-item">
        <strong>InitData Available:</strong> 
        <span :class="initDataAvailable ? 'status-ok' : 'status-error'">
          {{ initDataAvailable ? 'YES ✅' : 'NO ❌' }}
        </span>
      </div>
      <div class="debug-item" v-if="initDataAvailable">
        <strong>InitData Length:</strong> {{ initDataLength }}
      </div>
      <div class="debug-item" v-if="initDataAvailable">
        <strong>Has Hash:</strong> 
        <span :class="hasHash ? 'status-ok' : 'status-error'">
          {{ hasHash ? 'YES ✅' : 'NO ❌' }}
        </span>
      </div>
      <div class="debug-item" v-if="initDataAvailable">
        <strong>Has User Data:</strong> 
        <span :class="hasUserData ? 'status-ok' : 'status-error'">
          {{ hasUserData ? 'YES ✅' : 'NO ❌' }}
        </span>
      </div>
      <div class="debug-item" v-if="telegramUser">
        <strong>User ID:</strong> {{ telegramUser.id }}
      </div>
      <div class="debug-item" v-if="telegramUser">
        <strong>Username:</strong> {{ telegramUser.username || 'N/A' }}
      </div>
    </div>

    <!-- Environment -->
    <div class="debug-section">
      <h4>🌍 Environment</h4>
      <div class="debug-item">
        <strong>Environment:</strong> {{ environment }}
      </div>
      <div class="debug-item">
        <strong>Platform:</strong> {{ platform }}
      </div>
      <div class="debug-item">
        <strong>In Telegram:</strong> 
        <span :class="inTelegram ? 'status-ok' : 'status-warning'">
          {{ inTelegram ? 'YES ✅' : 'NO ⚠️' }}
        </span>
      </div>
    </div>

    <!-- Test API Connection -->
    <div class="debug-section">
      <h4>🔗 API Test</h4>
      <button @click="testApiConnection" :disabled="testingApi" class="test-button">
        {{ testingApi ? 'Testing...' : 'Test API Connection' }}
      </button>
      <div class="debug-item" v-if="apiTestResult">
        <strong>API Test:</strong> 
        <span :class="apiTestResult.success ? 'status-ok' : 'status-error'">
          {{ apiTestResult.message }}
        </span>
      </div>
    </div>
    
    <button @click="showDebug = false" class="close-debug">Close Debug</button>
  </div>
  <button v-else @click="showDebug = true" class="show-debug">🔍 Debug</button>
</template>

<script setup>
import { ref, computed } from 'vue'

const showDebug = ref(false)
const testingApi = ref(false)
const apiTestResult = ref(null)

// API Configuration
const apiBaseUrl = computed(() => import.meta.env.VITE_API_BASE_URL)

// Telegram WebApp Status
const telegramAvailable = computed(() => !!window.Telegram?.WebApp)
const initDataAvailable = computed(() => !!window.Telegram?.WebApp?.initData)
const initDataLength = computed(() => window.Telegram?.WebApp?.initData?.length || 0)

// Parse initData for detailed info
const initDataParsed = computed(() => {
  if (!initDataAvailable.value) return null
  try {
    const params = new URLSearchParams(window.Telegram.WebApp.initData)
    return params
  } catch (e) {
    return null
  }
})

const hasHash = computed(() => {
  if (!initDataParsed.value) return false
  return !!initDataParsed.value.get('hash')
})

const hasUserData = computed(() => {
  if (!initDataParsed.value) return false
  return !!initDataParsed.value.get('user')
})

const telegramUser = computed(() => {
  if (!hasUserData.value) return null
  try {
    const userStr = initDataParsed.value.get('user')
    return JSON.parse(decodeURIComponent(userStr))
  } catch (e) {
    return null
  }
})

// Environment
const environment = computed(() => import.meta.env.MODE)
const platform = computed(() => navigator.platform)
const inTelegram = computed(() => {
  const ua = navigator.userAgent
  return ua.includes('Telegram') || window.TelegramWebviewProxy !== undefined
})

// API Test function
const testApiConnection = async () => {
  testingApi.value = true
  apiTestResult.value = null
  
  try {
    console.log('[DebugInfo] Testing API connection...')
    
    if (!apiBaseUrl.value) {
      apiTestResult.value = { success: false, message: 'API Base URL not configured ❌' }
      return
    }
    
    // Test health-check endpoint first
    const healthUrl = `${apiBaseUrl.value}/health-check`
    console.log('[DebugInfo] Testing health-check:', healthUrl)
    
    const healthResponse = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!healthResponse.ok) {
      apiTestResult.value = { 
        success: false, 
        message: `Health check failed: ${healthResponse.status} ❌` 
      }
      return
    }
    
    // Try user-profile endpoint with current initData
    if (initDataAvailable.value) {
      console.log('[DebugInfo] Testing user-profile with real initData...')
      const profileUrl = `${apiBaseUrl.value}/user-profile`
      
      const profileResponse = await fetch(profileUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': window.Telegram.WebApp.initData
        }
      })
      
      if (profileResponse.ok) {
        apiTestResult.value = { 
          success: true, 
          message: 'API connection and auth working! ✅' 
        }
      } else {
        const errorText = await profileResponse.text()
        apiTestResult.value = { 
          success: false, 
          message: `Auth failed: ${errorText} ❌` 
        }
      }
    } else {
      apiTestResult.value = { 
        success: false, 
        message: 'Health check OK but no initData for auth test ⚠️' 
      }
    }
    
  } catch (error) {
    console.error('[DebugInfo] API test error:', error)
    apiTestResult.value = { 
      success: false, 
      message: `Network error: ${error.message} ❌` 
    }
  } finally {
    testingApi.value = false
  }
}
</script>

<style scoped>
.debug-info {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.95);
  color: white;
  padding: 15px;
  border-radius: 12px;
  z-index: 9999;
  max-width: 350px;
  max-height: 80vh;
  overflow-y: auto;
  font-size: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.debug-info h3 {
  margin: 0 0 15px 0;
  font-size: 14px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;
}

.debug-section {
  margin-bottom: 15px;
  border-left: 3px solid #007bff;
  padding-left: 10px;
}

.debug-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #00bfff;
  font-weight: 600;
}

.debug-item {
  margin-bottom: 6px;
  word-break: break-all;
  line-height: 1.4;
}

.debug-item strong {
  color: #e0e0e0;
}

.status-ok {
  color: #4CAF50;
  font-weight: 600;
}

.status-error {
  color: #f44336;
  font-weight: 600;
}

.status-warning {
  color: #ff9800;
  font-weight: 600;
}

.test-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.test-button:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.test-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}

.show-debug {
  position: fixed;
  top: 10px;
  right: 10px;
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  z-index: 9999;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(0, 123, 255, 0.3);
  transition: all 0.2s ease;
}

.show-debug:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 123, 255, 0.4);
}

.close-debug {
  position: static;
  margin-top: 15px;
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  width: 100%;
  transition: background 0.2s ease;
}

.close-debug:hover {
  background: #c82333;
}

/* Scrollbar styling for WebKit browsers */
.debug-info::-webkit-scrollbar {
  width: 6px;
}

.debug-info::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.debug-info::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.debug-info::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>