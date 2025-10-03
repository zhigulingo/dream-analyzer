<template>
  <main class="gate-container">
    <section class="gate-card">
      <h1 class="title">Бета-доступ закрыт</h1>
      <p class="subtitle">Вы пока не включены в список участников бета-теста.</p>
      <p class="hint">Заполните анкету и дождитесь одобрения — после этого личный кабинет откроется автоматически.</p>

      <div class="actions" v-if="surveyUrl">
        <button class="btn" @click="openSurvey">Открыть анкету</button>
      </div>
    </section>
  </main>
</template>

<script setup>
const surveyUrl = import.meta.env.VITE_SURVEY_URL || ''

function openSurvey() {
  try {
    const tg = window?.Telegram?.WebApp
    if (tg?.openLink && surveyUrl) {
      tg.openLink(surveyUrl)
      return
    }
  } catch (_) {}
  if (surveyUrl) window.open(surveyUrl, '_blank')
}
</script>

<style scoped>
.gate-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  min-height: calc(100vh - var(--tma-safe-top, 56px));
}
.gate-card {
  width: 100%;
  max-width: 720px;
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35);
}
.title {
  margin: 0 0 8px 0;
  font-size: 20px;
}
.subtitle {
  margin: 0 0 12px 0;
  opacity: 0.9;
}
.hint {
  margin: 0 0 20px 0;
  color: var(--tg-theme-hint-color);
}
.actions { display: flex; gap: 12px; }
.btn {
  appearance: none;
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  border: none;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
}
</style>
