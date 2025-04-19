<template>
  <div class="personal-account">
    <h1>Личный кабинет</h1>

    <div class="user-info">
      <div v-if="tgUser.photo_url" class="avatar"><img :src="tgUser.photo_url" alt="Аватар"></div>
      <div class="details">
        <p v-if="tgUser.first_name">{{ tgUser.first_name }} <span v-if="tgUser.last_name">{{ tgUser.last_name }}</span></p>
        <p v-if="tgUser.username">@{{ tgUser.username }}</p>
        <p v-else>Имя отсутствует</p>
      </div>
    </div>

    <div v-if="profile" class="account-details">
      <p>Токены: {{ profile.tokens }}</p>
      <p>Подписка: {{ profile.subscription_type }}</p>

      <!-- ИЗМЕНЕНИЕ ЗДЕСЬ: Вызываем функцию напрямую -->
      <button v-if="shouldShowDeepAnalysisButton()" @click="openDeepAnalysisModal" :disabled="isDeepAnalysisLoading" class="deep-analysis-button">
        {{ isDeepAnalysisLoading ? 'Загрузка...' : 'Получить глубокий анализ' }}
      </button>

      <div v-if="history.length > 0" class="history">
        <h2>История анализов</h2>
        <AnalysisHistoryList :history="history" />
      </div>
    </div>
    <p v-if="isLoadingProfile">Загрузка профиля...</p>
    <p v-else-if="errorProfile">Ошибка загрузки профиля: {{ errorProfile }}</p>

    <DeepAnalysisModal v-if="isDeepAnalysisModalOpen" @close="closeDeepAnalysisModal" @pay="handleDeepAnalysisPayment" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, toRefs } from 'vue'; // Добавлен watch и toRefs
import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';
import DeepAnalysisModal from '@/components/DeepAnalysisModal.vue';
import AnalysisHistoryList from '@/components/AnalysisHistoryList.vue';

const userStore = useUserStore();
// Используем storeToRefs как и раньше
const { profile, history, isLoadingProfile, errorProfile } = storeToRefs(userStore);

const tg = window.Telegram.WebApp;
const tgUser = computed(() => tg.initDataUnsafe?.user || {});

const isDeepAnalysisModalOpen = ref(false);
const isDeepAnalysisLoading = ref(false);

// --- УБИРАЕМ COMPUTED ---
// const showDeepAnalysisButton = computed(() => { ... });

// --- ДОБАВЛЯЕМ ФУНКЦИЮ ---
const shouldShowDeepAnalysisButton = () => {
  // Проверяем, существует ли history.value и является ли массивом
  if (!Array.isArray(history.value)) {
      console.log('[PersonalAccount] shouldShowDeepAnalysisButton: History is not an array yet.');
      return false;
  }
  const regularAnalysesCount = history.value.filter(item => item && item.is_deep_analysis === false).length;
  const shouldShow = regularAnalysesCount >= 5;
  // Логгируем каждый раз при вызове функции (например, при рендеринге)
  console.log(
    '[PersonalAccount] Calculated shouldShowDeepAnalysisButton:',
    `History length: ${history.value.length}`,
    `Regular analyses count: ${regularAnalysesCount}`,
    `Should show: ${shouldShow}`
  );
  return shouldShow;
};

// --- ДОБАВЛЯЕМ WATCH ---
// Следим за изменениями в history и логируем результат проверки
watch(history, (newHistory, oldHistory) => {
  console.log('[PersonalAccount] Watch triggered: History changed.');
  // Дополнительно логируем значение именно в момент изменения
  shouldShowDeepAnalysisButton();
}, { deep: true }); // deep: true нужен для отслеживания изменений внутри массива

const openDeepAnalysisModal = () => {
  isDeepAnalysisModalOpen.value = true;
};

const closeDeepAnalysisModal = () => {
  isDeepAnalysisModalOpen.value = false;
};

const handleDeepAnalysisPayment = () => {
  closeDeepAnalysisModal();
  isDeepAnalysisLoading.value = true;

  tg.invoke('showCheckout', {
    amount: '1',
    currency: 'XTR',
    description: 'Оплата за глубокий анализ снов',
  }).then(isPaymentSuccessful => {
    if (isPaymentSuccessful) {
      console.log('Оплата глубокого анализа успешна!');
      sendDeepAnalysisRequest();
    } else {
      console.log('Оплата глубокого анализа не удалась.');
      isDeepAnalysisLoading.value = false;
      // TODO: Показать пользователю сообщение об ошибке оплаты
    }
  });
};

const sendDeepAnalysisRequest = async () => {
  try {
    const response = await fetch('/.netlify/functions/deep-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-init-data': tg.initData, // Передаем InitData
      },
      body: JSON.stringify({
        userId: tgUser.value.id,
      }),
    });

    if (!response.ok) {
        let errorBody = 'Unknown error';
        try { errorBody = await response.text(); } catch (e) {}
        console.error(`[PersonalAccount] Deep analysis request failed: ${response.status} ${response.statusText}. Body: ${errorBody}`);
        throw new Error(`Ошибка запроса глубокого анализа: ${response.status}`);
    }

    const result = await response.json();
    console.log('[PersonalAccount] Deep analysis result received:', result);
    // Обновляем историю после успешного получения глубокого анализа
    await userStore.fetchHistory();
    console.log('[PersonalAccount] History refreshed after deep analysis.');
    // TODO: Показать пользователю сообщение об успехе или результат

  } catch (error) {
    console.error('Ошибка при выполнении глубокого анализа:', error);
    // TODO: Показать пользователю сообщение об ошибке
  } finally {
    isDeepAnalysisLoading.value = false; // Снимаем индикатор загрузки
  }
};


onMounted(async () => {
  console.log('[PersonalAccount onMounted] Initial view: Main Account');
  tg.ready();
  console.log('[PersonalAccount] Telegram WebApp is ready.');
  tg.BackButton.show();

  if (!tg.initDataUnsafe?.user) {
      console.error('Ошибка: Данные пользователя отсутствуют в tg.initDataUnsafe.');
  }
  console.log('[PersonalAccount] Start loading profile and history');

  // Загружаем профиль и историю последовательно, чтобы гарантировать наличие history при первом рендеринге
  await userStore.fetchProfile();
  console.log('[PersonalAccount onMounted] Profile fetched.');
  await userStore.fetchHistory();
  console.log('[PersonalAccount onMounted] History fetched.');

  // Дополнительно вызовем проверку после загрузки истории на случай, если watch не сработал сразу
  shouldShowDeepAnalysisButton();
});
</script>

<style scoped>
.personal-account {
  padding: 15px;
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 15px;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.details p {
  margin: 3px 0;
}

.account-details {
  margin-bottom: 20px;
}

.deep-analysis-button {
  background-color: #007bff;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
  margin-bottom: 20px;
  display: block;
  width: 100%;
  box-sizing: border-box;
}

.deep-analysis-button:disabled {
  background-color: #ccc;
  cursor: default;
}

.history h2 {
    margin-bottom: 10px;
}
</style>
