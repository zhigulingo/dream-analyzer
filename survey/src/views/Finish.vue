<template>
  <div class="finish-wrap">
    <div class="finish-card onboarding-card slidePeek center-card">
      <h1>Спасибо!</h1>
      <p class="lead">Мы получили ваши ответы. Мы свяжемся с вами в Telegram.</p>
      <!-- MainButton используется вместо локальной кнопки -->
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
function returnToChat() {
  try {
    const tg = window?.Telegram?.WebApp;
    if (tg) {
      try { tg.HapticFeedback?.impactOccurred?.('rigid'); } catch {}
      // Самый надежный способ закрыть TWA
      try { tg.close(); } catch {}
      // Если не закрылось сразу (например, в десктопе иногда нужно время)
      setTimeout(() => {
        try { window.close(); } catch {}
        try {
          const url = import.meta.env.VITE_TG_BOT_URL || 'https://t.me/dreamstalk_bot';
          const deeplink = url.replace('https://t.me/','tg://resolve?domain=');
          location.href = deeplink;
        } catch {}
      }, 500);
      return;
    }
  } catch {}
  // В вебе/десктопе
  try { window.close(); } catch {}
  try {
    const url = import.meta.env.VITE_TG_BOT_URL || 'https://t.me/dreamstalk_bot';
    location.href = url;
  } catch {}
}

const mainButtonHandler = () => { returnToChat(); };

onMounted(() => {
  try {
    const tg = window?.Telegram?.WebApp;
    if (tg) {
      if (tg?.ready) tg.ready();
      if (tg?.expand) tg.expand();
      
      if (tg?.MainButton) {
        tg.MainButton.setParams({ 
          text: 'Закрыть', 
          is_active: true, 
          is_visible: true,
          color: '#ffffff',
          text_color: '#111827'
        });
        tg.MainButton.show();
        tg.MainButton.onClick(mainButtonHandler);
      }
    }
  } catch (err) {
    console.error('Error in Finish.vue onMounted:', err);
  }
});

onUnmounted(() => {
  try {
    const tg = window?.Telegram?.WebApp;
    if (tg?.MainButton) {
      tg.MainButton.offClick(mainButtonHandler);
      tg.MainButton.hide();
    }
  } catch {}
});
</script>

<style scoped>
.finish-wrap { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 0; box-sizing: border-box; }
h1 { text-align: center; }
.finish-card { width: calc(100% - 32px); max-width: 560px; padding: 24px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #6A4DFF 0%, #9A3CFF 100%); box-shadow: 0 12px 28px rgba(0,0,0,0.16); min-height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
h1 { font-size: 22px; margin: 0 0 8px; }
.lead { opacity: 0.95; }
.btn-primary { display: inline-block; margin-top: 16px; padding: 14px 18px; border-radius: 20px; background: #ffffff; color: #111827; text-decoration: none; border: none; cursor: pointer; font-size: 18px; font-weight: 700; box-shadow: 0 10px 24px rgba(0,0,0,0.14); }
</style>



