<template>
  <div class="fixed inset-0 z-[9999] flex justify-center items-start bg-black/80 backdrop-blur-sm overflow-y-auto" @click.self="closeModal">
    <!-- Отступ сверху больше, чтобы имитировать плавающую карточку (sheet) как на 2 скриншоте -->
    <div 
      class="w-full max-w-lg min-h-screen sm:min-h-0 sm:mt-16 sm:mb-10 rounded-t-[32px] sm:rounded-[32px] relative transition-all pt-[var(--tma-safe-top,20px)] sm:pt-0"
    >
       <!-- Card Container -->
       <!-- Градиент Purple (как Deep Analysis), скругление 32px -->
       <div class="bg-gradient-to-br from-[#8000FF] to-[#5500AA] text-white shadow-2xl min-h-full sm:min-h-0 rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col">
         
         <!-- Header -->
         <div class="relative px-6 pt-8 pb-4 text-center">
            <h2 class="text-[28px] font-bold leading-tight drop-shadow-md">Выбери тариф</h2>
            
            <!-- Кнопка закрытия -->
            <button 
              class="absolute right-6 top-8 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md z-10" 
              @click="closeModal"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
         </div>

         <div class="px-6 pb-8 flex-1 flex flex-col gap-8">
            <!-- Plan Selector (Pills) -->
            <!-- Контейнер: rounded-full (пилюля), фон полупрозрачный темный -->
            <div class="bg-black/20 p-1.5 rounded-full flex font-medium backdrop-blur-md">
               <button 
                 class="flex-1 py-3 rounded-full text-base transition-all duration-200"
                 :class="userStore.selectedPlan === 'basic' ? 'bg-white text-[#6B00D0] shadow-md font-bold' : 'text-white/70 hover:text-white'"
                 @click="userStore.selectPlan('basic')"
               >
                 Базовый
               </button>
               <button 
                 class="flex-1 py-3 rounded-full text-base transition-all duration-200"
                 :class="userStore.selectedPlan === 'premium' ? 'bg-white text-[#6B00D0] shadow-md font-bold' : 'text-white/70 hover:text-white'"
                 @click="userStore.selectPlan('premium')"
               >
                 Премиум
               </button>
            </div>

            <!-- Duration Selector -->
            <div>
              <p class="text-base opacity-80 mb-4 px-2 font-medium">Длительность подписки</p>
              <div class="grid grid-cols-3 gap-3">
                <label v-for="duration in [1, 3, 12]" :key="duration" class="cursor-pointer group select-none">
                   <input
                      type="radio"
                      name="duration"
                      class="hidden"
                      :value="duration"
                      :disabled="!getPlanDetails(userStore.selectedPlan, duration).price"
                      :checked="userStore.selectedDuration === duration"
                      @change="userStore.selectDuration(duration)"
                    />
                    <!-- Card-like duration button: More rounded (24px) -->
                    <div 
                      class="relative rounded-[24px] border transition-all duration-200 py-4 flex flex-col items-center justify-center gap-1 h-full min-h-[90px] backdrop-blur-md"
                      :class="[
                        userStore.selectedDuration === duration 
                          ? 'bg-white/20 border-white/60 shadow-lg scale-[1.02]' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10',
                         !getPlanDetails(userStore.selectedPlan, duration).price ? 'opacity-40 grayscale cursor-not-allowed' : ''
                      ]"
                    >
                       <span class="text-2xl font-bold leading-none filter drop-shadow-sm">{{ duration }}</span>
                       <span class="text-xs opacity-90 uppercase tracking-widest font-medium">мес</span>
                       
                       <div v-if="getPlanDetails(userStore.selectedPlan, duration).price" class="mt-2 text-sm font-bold text-white drop-shadow-sm">
                          {{ (getPlanDetails(userStore.selectedPlan, duration).price / duration).toFixed(0) }}⭐
                       </div>
                    </div>
                </label>
              </div>
            </div>

            <!-- Features List -->
            <!-- Скругление 24px для мягкости -->
            <div class="bg-white/10 rounded-[24px] p-6 border border-white/5 backdrop-blur-md">
               <h3 class="font-bold text-xl mb-5 flex items-center gap-2 drop-shadow-sm">
                 <span>Входит в тариф:</span>
               </h3>
               <ul class="space-y-4">
                  <li 
                    v-for="(feature, index) in getPlanDetails(userStore.selectedPlan, userStore.selectedDuration).features" 
                    :key="index"
                    class="flex items-start gap-3 text-lg leading-snug opacity-95"
                  >
                    <!-- Галочка жёлтая, хорошо видна на фиолетовом -->
                    <span class="text-[#FFD700] font-bold mt-[2px] text-xl">✓</span>
                    <span class="font-medium shadow-black/10">{{ feature }}</span>
                  </li>
               </ul>
            </div>
            
            <div class="h-10 sm:h-0"></div>
         </div>
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

const closeModal = () => {
  emit('close');
};

const handleMainButtonClick = () => {
    if (tg?.MainButton?.isActive) {
        userStore.initiatePayment();
    }
};

onMounted(() => {
    isMounted.value = true;
    
    // Setup Telegram Back Button
    if (tg?.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(closeModal);
    }
    
    document.body.style.overflow = 'hidden';
});

onUnmounted(() => {
  if (tg?.MainButton?.isVisible) {
    tg.MainButton.hide();
    tg.MainButton.offClick(handleMainButtonClick);
  }
  if (tg?.BackButton?.isVisible) {
    tg.BackButton.hide();
    tg.BackButton.offClick(closeModal);
  }
  isMounted.value = false;
  document.body.style.overflow = '';
});

// Manage Main Button
watchEffect(() => {
  if (!tg || !isMounted.value) return;

  const amount = userStore.selectedInvoiceAmount;

  if (amount) {
    tg.MainButton.setParams({
      text: `Оплатить ${amount} ⭐`,
      color: tg.themeParams?.button_color || '#2481CC',
      text_color: tg.themeParams?.button_text_color || '#ffffff',
      is_active: true,
      is_visible: true,
    });
    tg.MainButton.offClick(handleMainButtonClick);
    tg.MainButton.onClick(handleMainButtonClick);
  } else {
    tg.MainButton.setParams({
        text: 'Выберите тариф', // Обновил текст здесь тоже
        is_active: false,
        is_visible: true
    });
     tg.MainButton.offClick(handleMainButtonClick);
  }
});
</script>

<style scoped>
/* Всё в Tailwind */
</style>
