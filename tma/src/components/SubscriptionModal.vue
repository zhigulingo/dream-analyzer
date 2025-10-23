<template>
  <div class="modal-container">
    <div class="modal-content">
      <h2 class="text-[32px] font-bold mb-6 text-center">Выберите план подписки</h2>

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

      <!-- Опции длительности в одну строку -->
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
             <span class="months">{{ duration }} {{ duration > 1 ? (duration < 5 ? 'мес' : 'мес') : 'мес' }}</span>
             <template v-if="getPlanDetails(userStore.selectedPlan, duration).price">
               <span class="price">
                 {{ (getPlanDetails(userStore.selectedPlan, duration).price / duration).toFixed(0) }}⭐/мес
               </span>
             </template>
             <template v-else>
               <span class="price-disabled">—</span>
             </template>
          </div>
        </label>
      </div>

       <!-- Описание фич -->
      <div class="features-list">
        <h3 class="text-2xl font-bold mb-4">Что вы получаете:</h3>
        <ul>
          <li v-for="(feature, index) in getPlanDetails(userStore.selectedPlan, userStore.selectedDuration).features" :key="index">
            <span class="checkmark">✔️</span> {{ feature }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user';
import { watchEffect, onUnmounted, ref, onMounted } from 'vue';

const userStore = useUserStore();
const { getPlanDetails } = userStore;
const tg = window.Telegram?.WebApp;
const emit = defineEmits(['close']);

const isMounted = ref(false);

onMounted(() => {
    isMounted.value = true;
    console.log("[SubscriptionModal] Component mounted");
    
    // Setup Telegram Back Button
    if (tg?.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(closeModal);
    }
});

const closeModal = () => {
  emit('close');
};

// Обработчик нажатия Main Button
const handleMainButtonClick = () => {
    console.log("[SubscriptionModal] Main Button clicked!");
    if (tg?.MainButton?.isActive) {
        userStore.initiatePayment();
    } else {
        console.warn("[SubscriptionModal] Main Button clicked but it was inactive.");
    }
};

// Следим за изменениями для управления Main Button
watchEffect(() => {
  if (!tg || !isMounted.value) {
      if (tg?.MainButton?.isVisible) {
          console.log("[SubscriptionModal] Hiding Main Button (not mounted or no tg)");
           tg.MainButton.hide();
           tg.MainButton.offClick(handleMainButtonClick);
      }
      return;
  }

  const amount = userStore.selectedInvoiceAmount;

  if (amount) {
    console.log(`[SubscriptionModal] Setting Main Button: Pay ${amount} Stars`);
    tg.MainButton.setParams({
      text: `Оплатить ${amount} ⭐`,
      color: tg.themeParams.button_color || '#2481CC',
      text_color: tg.themeParams.button_text_color || '#ffffff',
      is_active: true,
      is_visible: true,
    });
    tg.MainButton.offClick(handleMainButtonClick);
    tg.MainButton.onClick(handleMainButtonClick);
  } else {
     console.log("[SubscriptionModal] Setting Main Button: Inactive (no amount)");
    tg.MainButton.setParams({
        text: 'Выберите план',
        is_active: false,
        is_visible: true
    });
     tg.MainButton.offClick(handleMainButtonClick);
  }
});

onUnmounted(() => {
  // Hide and cleanup Main Button
  if (tg?.MainButton?.isVisible) {
    tg.MainButton.hide();
    tg.MainButton.offClick(handleMainButtonClick);
     console.log("[SubscriptionModal] Main Button hidden on modal unmount.");
  }
  
  // Hide and cleanup Back Button
  if (tg?.BackButton?.isVisible) {
    tg.BackButton.hide();
    tg.BackButton.offClick(closeModal);
    console.log("[SubscriptionModal] Back Button hidden on modal unmount.");
  }
  
  isMounted.value = false;
});
</script>

<style scoped>
/* Full-screen container like dream card */
.modal-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  overflow-y: auto;
  background: linear-gradient(to bottom right, #5461FF, #4857FF);
}

.modal-content {
  width: 100%;
  min-height: 100%;
  padding: 24px 32px 100px;
  color: white;
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

/* Compact single-line duration options */
.duration-options {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.duration-label {
  flex: 1;
}

.duration-label input[type="radio"] {
  display: none;
}

.duration-card {
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: rgba(255, 255, 255, 0.05);
  min-height: 70px;
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
  font-size: 1em;
  color: white;
  text-align: center;
}

.price {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85em;
  text-align: center;
  white-space: nowrap;
}

.price-disabled {
  color: rgba(255, 255, 255, 0.4);
  font-size: 1.2em;
}

.features-list {
  margin-bottom: 0;
}

.features-list h3 {
  color: white;
}

.features-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.features-list li {
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  font-size: 1.125rem;
}

.checkmark {
  margin-right: 8px;
}
</style>
