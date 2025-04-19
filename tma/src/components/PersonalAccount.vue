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

      <!-- Кнопка отображается если есть 5+ обычных анализов -->
      <button v-if="showDeepAnalysisButton" @click="openDeepAnalysisModal" :disabled="isDeepAnalysisLoading" class="deep-analysis-button">
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
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';
import DeepAnalysisModal from '@/components/DeepAnalysisModal.vue';
import AnalysisHistoryList from '@/components/AnalysisHistoryList.vue';

const userStore = useUserStore();
const { profile, history, isLoadingProfile, errorProfile } = storeToRefs(userStore);

const tg = window.Telegram.WebApp;
const tgUser = computed(() => tg.initDataUnsafe?.user || {});

const isDeepAnalysisModalOpen = ref(false);
const isDeepAnalysisLoading = ref(false);

// Вычисляемое свойство для отображения кнопки глубокого анализа
const showDeepAnalysisButton = computed(() => {
  // Добавляем проверку на существование item и явное сравнение с false
  const regularAnalysesCount = history.value.filter(item => item && item.is_deep_analysis === false).length;

  // --- ДОБАВЛЕННЫЙ ЛОГ ---
  console.log(
    '[PersonalAccount] Computed showDeepAnalysisButton:',
    `History length: ${history.value.length}`,
    `Regular analyses count: ${regularAnalysesCount}`,
    `Should show button: ${regularAnalysesCount >= 5}`
  );
  // --- КОНЕЦ ДОБАВЛЕННОГО ЛОГА ---

  return regularAnalysesCount >= 5;
});

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
        // Попробуем прочитать тело ошибки, если есть
        let errorBody = 'Unknown error';
        try {
            errorBody = await response.text();
        } catch (e) { /* игнорируем ошибку чтения тела */ }
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

  await userStore.fetchProfile();
  console.log('[PersonalAccount onMounted] Profile fetched.');
  await userStore.fetchHistory();
  console.log('[PersonalAccount onMounted] History fetched.');

  // Убрали лишние логи времени и DeviceStorage
});
</script>

<style scoped>
.personal-account {
  /* Ваши стили для компонента */
  padding: 15px; /* Добавим немного отступов */
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.avatar {
  width: 60px; /* Уменьшим аватар */
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 15px; /* Уменьшим отступ */
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.details p {
  margin: 3px 0; /* Уменьшим вертикальные отступы */
}

.account-details {
  margin-bottom: 20px; /* Отступ после данных профиля */
}

.deep-analysis-button {
  background-color: #007bff;
  color: white;
  padding: 10px 15px; /* Немного уменьшим паддинг */
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px; /* Добавим отступ сверху */
  margin-bottom: 20px; /* Отступ снизу */
  display: block; /* Сделаем блочным для центрирования, если нужно */
  width: 100%; /* Растянем на всю ширину */
  box-sizing: border-box; /* Учитываем padding и border */
}

.deep-analysis-button:disabled {
  background-color: #ccc;
  cursor: default;
}

.history h2 {
    margin-bottom: 10px; /* Отступ под заголовком истории */
}

</style>
