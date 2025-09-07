<template>
  <div class="finish-wrap">
    <div class="finish-card onboarding-card">
      <h1>Спасибо!</h1>
      <p class="lead">Мы получили ваши ответы. Мы свяжемся с вами в Telegram.</p>
      <button class="btn-primary" @click="returnToChat">Вернуться в чат</button>
    </div>
  </div>
</template>

<script setup>
function returnToChat() {
  try {
    const tg = window?.Telegram?.WebApp;
    if (tg && typeof tg.close === 'function') {
      tg.close();
      return;
    }
  } catch {}
  const url = import.meta.env.VITE_TG_BOT_URL || 'https://t.me/dreamstalk_bot';
  window.open(url, '_blank', 'noopener');
}
</script>

<style scoped>
.finish-wrap { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; box-sizing: border-box; }
h1 { text-align: center; }
.finish-card { width: calc(100% - 32px); max-width: 560px; padding: 32px; border-radius: 20px; color: #fff; background: linear-gradient(135deg, #6A4DFF 0%, #9A3CFF 100%); box-shadow: 0 12px 28px rgba(0,0,0,0.16); min-height: 64vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
h1 { font-size: 22px; margin: 0 0 8px; }
.lead { opacity: 0.95; }
.btn-primary { display: inline-block; margin-top: 16px; padding: 14px 18px; border-radius: 20px; background: #ffffff; color: #111827; text-decoration: none; border: none; cursor: pointer; font-size: 18px; font-weight: 700; box-shadow: 0 10px 24px rgba(0,0,0,0.14); }
</style>



