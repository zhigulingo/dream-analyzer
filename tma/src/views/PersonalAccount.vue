<template>
  <div class="personal-account">
    <h1>Личный кабинет</h1>

    <!-- Блок 1: Информация о пользователе -->
    <section class="user-info card">
      <h2>Ваш профиль</h2>
      <div v-if="userStore.isLoadingProfile">Загрузка профиля...</div>
      <div v-else-if="userStore.errorProfile" class="error-message">
        Ошибка загрузки профиля: {{ userStore.errorProfile }}
      </div>
      <div v-else-if="userStore.profile.tokens !== null">
        <p>Остаток токенов: <strong>{{ userStore.profile.tokens }}</strong></p>
        <p>
          Текущий тариф: <strong class="capitalize">{{ userStore.profile.subscription_type }}</strong>
          <span v-if="userStore.profile.subscription_end">
            (до {{ formatDate(userStore.profile.subscription_end) }})
          </span>
        </p>
        <button @click="userStore.openSubscriptionModal" class="change-plan-button">
          Сменить тариф
        </button>
      </div>
       <div v-else>
            <p>Не удалось загрузить профиль.</p> <!-- Сообщение, если токены null после загрузки -->
       </div>
    </section>

    <!-- Блок 2: История анализов -->
    <section class="history card">
      <h2>История анализов</h2>
       <div v-if="userStore.isLoadingHistory">Загрузка истории...</div>
       <div v-else-if="userStore.errorHistory" class="error-message">
         Ошибка загрузки истории: {{ userStore.errorHistory }}
       </div>
       <div v-else-if="userStore.history.length > 0">
         <AnalysisHistoryList :history="userStore.history" />
       </div>
       <div v-else>
         <p>У вас пока нет сохраненных анализов.</p>
       </div>
    </section>

    <!-- Модальное окно смены тарифа -->
    <SubscriptionModal
      v-if="userStore.showSubscriptionModal"
      @close="userStore.closeSubscriptionModal"
    />

  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useUserStore } from '@/stores/user'; // Путь к вашему стору
import AnalysisHistoryList from '@/components/AnalysisHistoryList.vue'; // Компонент истории
import SubscriptionModal from '@/components/SubscriptionModal.vue'; // Компонент модалки

const userStore = useUserStore();
const tg = window.Telegram?.WebApp;

onMounted(async () => {
    if (tg) {
        tg.ready();
        console.log("[PersonalAccount] Telegram WebApp is ready.");
        // Управляем кнопкой Назад
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            // Если модалка открыта, сначала закрываем ее
             if (userStore.showSubscriptionModal) {
                userStore.closeSubscriptionModal();
             } else {
                // Иначе закрываем приложение
                 tg.close();
             }
        });
        // Важно: Прячем Main Button при первоначальной загрузке ЛК
        if (tg.MainButton.isVisible) {
            tg.MainButton.hide();
        }
    } else {
        console.warn("[PersonalAccount] Telegram WebApp API not available.");
    }
    // Загружаем данные
  await userStore.fetchProfile();
  await userStore.fetchHistory();
});

const formatDate = (dateString) => {
  if (!dateString) return '';
  try { return new Date(dateString).toLocaleDateString(); } catch (e) { return dateString; }
};
</script>

<style scoped>
/* Стили остаются прежними */
.personal-account { padding: 15px; color: var(--tg-theme-text-color); background-color: var(--tg-theme-bg-color); }
.card { background-color: var(--tg-theme-secondary-bg-color); border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
h1, h2 { color: var(--tg-theme-text-color); margin-top: 0; margin-bottom: 10px; }
.capitalize { text-transform: capitalize; }
.error-message { color: var(--tg-theme-destructive-text-color); background-color: rgba(255, 0, 0, 0.1); padding: 8px; border-radius: 4px; }
.change-plan-button { background-color: var(--tg-theme-button-color); color: var(--tg-theme-button-text-color); border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-size: 1em; margin-top: 10px; transition: background-color 0.2s ease; }
.change-plan-button:hover { opacity: 0.9; }
</style>
