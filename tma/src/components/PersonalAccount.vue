<template>
  <!-- ... Остальная часть шаблона ... -->
      <div v-if="history.length > 0" class="history">
        <h2>История анализов</h2>
        <AnalysisHistoryList :history="history" />
      </div>
  <!-- ... Остальная часть шаблона ... -->
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';
import DeepAnalysisModal from '@/components/DeepAnalysisModal.vue';
import AnalysisHistoryList from '@/components/AnalysisHistoryList.vue'; // Импорт компонента

const userStore = useUserStore();
const { profile, history, isLoadingProfile, errorProfile } = storeToRefs(userStore);

const tg = window.Telegram.WebApp;
const tgUser = computed(() => tg.initDataUnsafe?.user || {});

const isDeepAnalysisModalOpen = ref(false);
const isDeepAnalysisLoading = ref(false);

const showDeepAnalysisButton = computed(() => history.value.filter(item => !item.is_deep_analysis).length >= 5); //  Учитываем только обычные анализы

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
      sendDeepAnalysisRequest();
    } else {
      isDeepAnalysisLoading.value = false;
    }
  });
};

const sendDeepAnalysisRequest = async () => {
  try {
    const response = await fetch('/.netlify/functions/deep-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-init-data': tg.initData,
      },
      body: JSON.stringify({
        userId: tgUser.value.id,
      }),
    });

    if (!response.ok) {
      throw new Error('Ошибка при запросе глубокого анализа');
    }

    await response.json();
    await userStore.fetchHistory(); // Обновляем историю после получения глубокого анализа
  } catch (error) {
    console.error('Ошибка при выполнении глубокого анализа:', error);
  } finally {
    isDeepAnalysisLoading.value = false;
  }
};

onMounted(async () => {
  tg.ready();
  tg.BackButton.show();

  if (!tg.initDataUnsafe?.user) {
      console.error('Ошибка: Данные пользователя отсутствуют в tg.initDataUnsafe.');
  }

  await userStore.fetchProfile();
  await userStore.fetchHistory();
});
</script>
