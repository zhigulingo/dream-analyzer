<template>
  <div>
    <h1>Спасибо!</h1>
    <p>Мы получили ваши ответы. Мы свяжемся с вами в Telegram.</p>
    <button class="btn" @click="returnToChat">Вернуться в чат</button>
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
h1 { font-size: 22px; margin: 0 0 8px; }
.btn { display: inline-block; margin-top: 16px; padding: 12px 16px; border-radius: 10px; background: #111827; color: #fff; text-decoration: none; }
</style>



