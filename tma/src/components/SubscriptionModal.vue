<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal-content rounded-xl bg-gradient-to-br from-[#5461FF] to-[#4857FF] text-white">
      <button class="close-button" @click="closeModal">×</button>
      <h2 class="text-2xl font-bold mb-6">Выберите план подписки</h2>

      <!-- Табы Basic/Premium -->
      <div class="tabs">
        <button
          :class="{ active: userStore.selectedPlan === 'basic' }"
          @click="userStore.selectPlan('basic')"
        >
          Basic
        </button>
        <button
          :class="{ active: userStore.selectedPlan === 'premium' }"
          @click="userStore.selectPlan('premium')"
        >
          Premium
        </button>
      </div>

      <!-- Опции длительности -->
      <div class="duration-options">
        <label v-for="duration in [1, 3, 12]" :key="duration" class="duration-label">
          <input
            type="radio"
            name="duration"
            :value="duration"
            :checked="userStore.selectedDuration === duration"
            :disabled="!getPlanDetails(userStore.selectedPlan, duration).price"
            @change="userStore.selectDuration(duration)"
          />
          <div class="duration-card" :class="{ disabled: !getPlanDetails(userStore.selectedPlan, duration).price }">
             <span class="months">{{ duration }} {{ duration > 1 ? (duration < 5 ? 'месяца' : 'месяцев') : 'месяц' }}</span>
             <template v-if="getPlanDetails(userStore.selectedPlan, duration).price">
               <span class="price">
                 {{ (getPlanDetails(userStore.selectedPlan, duration).price / duration).toFixed(0) }} / мес
               </span>
               <span class="total-price">
                 Всего: {{ getPlanDetails(userStore.selectedPlan, duration).price }} <span class="stars-icon">⭐</span>
               </span>
             </template>
             <template v-else>
               <span class="price">Не настроено</span>
             </template>
          </div>
        </label>
      </div>

       <!-- Описание фич -->
      <div class="features-list">
        <h3>Что вы получаете:</h3>
        <ul>
          <li v-for="(feature, index) in getPlanDetails(userStore.selectedPlan, userStore.selectedDuration).features" :key="index">
            ✔️ {{ feature }}
          </li>
        </ul>
      </div>

      <!-- HTML Кнопка оплаты убрана -->

    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user';
import { watchEffect, onUnmounted, ref, onMounted } from 'vue'; // Импортируем все нужное

const userStore = useUserStore();
const { getPlanDetails } = userStore; // Это геттер, его можно использовать напрямую
const tg = window.Telegram?.WebApp;
const emit = defineEmits(['close']);

// Флаг монтирования компонента
const isMounted = ref(false);
onMounted(() => {
    isMounted.value = true;
    console.log("[SubscriptionModal] Component mounted");
});

const closeModal = () => {
  emit('close');
};

// Обработчик нажатия Main Button
const handleMainButtonClick = () => {
    console.log("[SubscriptionModal] Main Button clicked!");
    if (tg?.MainButton?.isActive) {
        userStore.initiatePayment(); // Вызываем action
    } else {
        console.warn("[SubscriptionModal] Main Button clicked but it was inactive.");
    }
};

// Следим за изменениями и монтированием для управления Main Button
watchEffect(() => {
  if (!tg || !isMounted.value) {
      // Если компонент не смонтирован или нет API TG
      if (tg?.MainButton?.isVisible) {
          console.log("[SubscriptionModal] Hiding Main Button (not mounted or no tg)");
           tg.MainButton.hide();
           tg.MainButton.offClick(handleMainButtonClick); // Снимаем обработчик на всякий случай
      }
      return; // Выходим
  }

  // Компонент смонтирован, API есть
  const amount = userStore.selectedInvoiceAmount; // Получаем актуальную цену

  if (amount) {
    // Настраиваем и показываем кнопку
    console.log(`[SubscriptionModal] Setting Main Button: Pay ${amount} Stars`);
    tg.MainButton.setParams({
      text: `Оплатить ${amount} ⭐`,
      color: tg.themeParams.button_color || '#2481CC',
      text_color: tg.themeParams.button_text_color || '#ffffff',
      is_active: true,
      is_visible: true,
    });
    // ВАЖНО: Переназначаем обработчик каждый раз при обновлении кнопки
    tg.MainButton.offClick(handleMainButtonClick);
    tg.MainButton.onClick(handleMainButtonClick);
  } else {
    // Если цена не выбрана (ошибка в логике цен?)
     console.log("[SubscriptionModal] Setting Main Button: Inactive (no amount)");
    tg.MainButton.setParams({
        text: 'Выберите план',
        is_active: false,
        is_visible: true // Оставляем видимой, но неактивной
    });
     tg.MainButton.offClick(handleMainButtonClick); // Снимаем обработчик
  }
});

// При размонтировании компонента (закрытии модалки)
onUnmounted(() => {
  if (tg?.MainButton?.isVisible) {
    tg.MainButton.hide();
    tg.MainButton.offClick(handleMainButtonClick); // Обязательно снимаем обработчик
     console.log("[SubscriptionModal] Main Button hidden on modal unmount.");
  }
  isMounted.value = false; // Сбрасываем флаг монтирования
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  padding: 32px 24px 24px;
  width: 90%;
  max-width: 400px;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  /* No overflow-y - content should fit without scroll */
}

.close-button {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 1.5em;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

h2 {
  text-align: center;
  color: white !important;
}

.tabs {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 6px;
}

.tabs button {
  flex: 1;
  padding: 12px;
  border: none;
  background-color: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 500;
  transition: all 0.2s ease;
}

.tabs button.active {
  background-color: rgba(255, 255, 255, 0.25);
  color: white;
  font-weight: 600;
}

.duration-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.duration-label {
  display: block;
}

.duration-label input[type="radio"] {
  display: none;
}

.duration-card {
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: rgba(255, 255, 255, 0.05);
}

.duration-card:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.duration-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.duration-label input[type="radio"]:checked + .duration-card {
  border-color: rgba(255, 255, 255, 0.5);
  background-color: rgba(255, 255, 255, 0.15);
}

.months {
  font-weight: 600;
  font-size: 1.1em;
  color: white;
}

.price {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95em;
}

.total-price {
  font-weight: 600;
  color: white;
  font-size: 1.05em;
}

.stars-icon {
  vertical-align: middle;
}

.features-list {
  margin-bottom: 0;
  font-size: 0.95em;
}

.features-list h3 {
  font-size: 1.1em;
  margin-bottom: 12px;
  font-weight: 600;
  color: white;
}

.features-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.features-list li {
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
}
</style>
