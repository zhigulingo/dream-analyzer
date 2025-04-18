console.log("Telegram User ID:", tgUser.value.id);
console.log("Telegram Init Data:", tg.initData);
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

      <button v-if="showDeepAnalysisButton" @click="openDeepAnalysisModal" :disabled="isDeepAnalysisLoading" class="deep-analysis-button">
        {{ isDeepAnalysisLoading ? 'Загрузка...' : 'Получить глубокий анализ' }}
      </button>

      <div v-if="history.length > 0" class="history">
        <h2>История анализов</h2>
        <div v-for="analysis in history" :key="analysis.id" class="analysis-card">
          <p>Дата: {{ analysis.date }}</p>
          <p>Описание: {{ analysis.description }}</p>
        </div>
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

const userStore = useUserStore();
const { profile, history, isLoadingProfile, errorProfile } = storeToRefs(userStore);

const tg = window.Telegram.WebApp;
const tgUser = computed(() => tg.initDataUnsafe?.user || {});

const isDeepAnalysisModalOpen = ref(false);
const isDeepAnalysisLoading = ref(false);

const showDeepAnalysisButton = computed(() => history.value.length >= 5);

const openDeepAnalysisModal = () => {
  isDeepAnalysisModalOpen.value = true;
};

const closeDeepAnalysisModal = () => {
  isDeepAnalysisModalOpen.value = false;
};

const handleDeepAnalysisPayment = () => {
  closeDeepAnalysisModal();
  isDeepAnalysisLoading.value = true;

  // 1. Запуск процесса оплаты через Telegram Stars
  tg.invoke('showCheckout', {
    amount: '1',  // Стоимость в Telegram Stars
    currency: 'XTR',
    description: 'Оплата за глубокий анализ снов',
    //payload: 'deep_analysis', //  Можно использовать для идентификации платежа на бэкенде (необязательно)
    //need_shipping_address: false, // Указываем, что адрес доставки не нужен
    //send_phone_number_to_provider: false, // Отключаем передачу номера телефона
    //send_email_to_provider: false // Отключаем передачу email
  }).then(isPaymentSuccessful => {
    if (isPaymentSuccessful) {
      console.log('Оплата успешна!');
      // 2. Отправка запроса на бэкенд после успешной оплаты
      sendDeepAnalysisRequest();
    } else {
      console.log('Оплата не удалась.');
      isDeepAnalysisLoading.value = false; // Снимаем индикатор загрузки при неудачной оплате
      // Можно добавить отображение сообщения об ошибке пользователю
    }
  });
};

const sendDeepAnalysisRequest = async () => {
  try {
    //  Предполагаемый эндпоинт, нужно уточнить!
    const response = await fetch('/deep-analysis', {  
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: tgUser.value.id,  // Передаем ID пользователя на бэкенд
      }),
    });

    if (!response.ok) {
      throw new Error('Ошибка при запросе глубокого анализа');
    }

    const result = await response.json();
    console.log('Результат глубокого анализа:', result);
    //  Здесь должна быть логика обработки результата и его отображения
  } catch (error) {
    console.error('Ошибка при выполнении глубокого анализа:', error);
    //  Обработка ошибки (например, отображение сообщения пользователю)
  } finally {
    isDeepAnalysisLoading.value = false; // Снимаем индикатор загрузки после завершения запроса
  }
};


onMounted(async () => {
  console.log('[PersonalAccount onMounted] Initial view: Main Account');
  tg.ready();
  console.log('[PersonalAccount] Telegram WebApp is ready.');
  tg.BackButton.show();

  if (!tg.initDataUnsafe?.user) {
      console.error('Ошибка: Данные пользователя отсутствуют в tg.initDataUnsafe. Проверьте настройки Telegram Web App.');
  }
  console.log('[PersonalAccount] Start loading profile and history');

  await userStore.fetchProfile();
  await userStore.fetchHistory();

  console.log('[PersonalAccount onMounted] History fetched.');

  console.log('[PersonalAccount] Profile loaded in', performance.now() - window.APP_START, 'ms');

  console.log('[PersonalAccount] DeviceStorage loading disabled.');
});
</script>

<style scoped>
.personal-account {
  /* Ваши стили для компонента */
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 20px;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.details p {
  margin: 5px 0;
}

.deep-analysis-button {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-bottom: 20px;
}

.deep-analysis-button:disabled {
  background-color: #ccc;
  cursor: default;
}
</style>
