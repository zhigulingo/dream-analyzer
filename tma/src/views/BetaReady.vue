<template>
  <main class="gate-container">
    <section class="gate-card">
      <h1 class="title">Доступ открыт</h1>
      <p class="subtitle">Начните короткий онбординг, чтобы получить стартовый токен и инструкции.</p>
      <div class="actions">
        <button class="btn" :disabled="loading" @click="startOnboarding">{{ loading ? 'Подождите…' : 'Начать онбординг' }}</button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/services/api'
import { useUserStore } from '@/stores/user.js'
const userStore = useUserStore()
const loading = ref(false)

async function startOnboarding() {
  try {
    loading.value = true
    await api.setOnboardingStage('stage1')
    await userStore.fetchProfile()
  } catch (_) {
  } finally { loading.value = false }
}
</script>

<style scoped>
.gate-container { display: flex; align-items: center; justify-content: center; padding: 24px; min-height: calc(100vh - var(--tma-safe-top, 56px)); }
.gate-card { width: 100%; max-width: 720px; background: var(--tg-theme-secondary-bg-color); border-radius: 16px; padding: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.35); }
.title { margin: 0 0 8px 0; font-size: 20px; }
.subtitle { margin: 0 0 12px 0; opacity: 0.9; }
.actions { display: flex; gap: 12px; }
.btn { appearance: none; background: var(--tg-theme-button-color); color: var(--tg-theme-button-text-color); border: none; padding: 10px 16px; border-radius: 10px; font-weight: 600; }
</style>
