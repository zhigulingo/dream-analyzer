<template>
  <div class="fixed inset-0 z-[9999] flex justify-center items-start bg-black/70 backdrop-blur-sm overflow-y-auto" @click.self="closeModal">
    <div 
      class="w-full max-w-lg min-h-screen sm:min-h-0 sm:mt-16 sm:mb-10 sm:rounded-2xl relative transition-all"
    >
       <!-- Card Container -->
       <!-- Используем градиент Deep Analysis из DreamCard: from-[#9C41FF] to-[#C03AFF] -->
       <div class="bg-gradient-to-br from-[#9C41FF] to-[#C03AFF] text-white shadow-2xl min-h-full sm:min-h-0 sm:rounded-2xl overflow-hidden flex flex-col">
         
         <!-- Header / Close button -->
         <!-- Добавляем отступ сверху, учитывая safe area -->
         <div class="relative px-6 pt-[calc(var(--tma-safe-top,20px)+24px)] sm:pt-6 pb-4 text-center">
            <h2 class="text-[28px] font-bold leading-tight drop-shadow-md">Выберите план</h2>
            
            <!-- Кнопка закрытия: показываем всегда, но позиционируем аккуратно -->
            <button 
              class="absolute right-4 top-[calc(var(--tma-safe-top,20px)+24px)] sm:top-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-md z-10" 
              @click="closeModal"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
         </div>

         <div class="px-6 pb-8 flex-1 flex flex-col gap-6">
            <!-- Plan Selector (Tabs) -->
            <div class="bg-black/20 p-1 rounded-xl flex font-medium backdrop-blur-sm">
               <button 
                 class="flex-1 py-2.5 rounded-lg text-sm transition-all duration-200"
                 :class="userStore.selectedPlan === 'basic' ? 'bg-white text-[#9C41FF] shadow-sm font-bold' : 'text-white/70 hover:text-white hover:bg-white/10'"
                 @click="userStore.selectPlan('basic')"
               >
                 Basic
               </button>
               <button 
                 class="flex-1 py-2.5 rounded-lg text-sm transition-all duration-200"
                 :class="userStore.selectedPlan === 'premium' ? 'bg-white text-[#9C41FF] shadow-sm font-bold' : 'text-white/70 hover:text-white hover:bg-white/10'"
                 @click="userStore.selectPlan('premium')"
               >
                 Premium
               </button>
            </div>

            <!-- Duration Selector -->
            <div>
              <p class="text-sm opacity-80 mb-3 px-1 font-medium">Длительность подписки</p>
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
                    <!-- Card-like duration button: white/10 default, white/30 active -->
                    <div 
                      class="relative rounded-xl border transition-all duration-200 py-3 flex flex-col items-center justify-center gap-1 h-full min-h-[84px] backdrop-blur-md"
                      :class="[
                        userStore.selectedDuration === duration 
                          ? 'bg-white/30 border-white/60 shadow-lg scale-[1.02]' 
                          : 'bg-white/10 border-white/10 hover:bg-white/20',
                         !getPlanDetails(userStore.selectedPlan, duration).price ? 'opacity-40 grayscale cursor-not-allowed' : ''
                      ]"
                    >
                       <span class="text-xl font-bold leading-none filter drop-shadow-sm">{{ duration }}</span>
                       <span class="text-xs opacity-90 uppercase tracking-wide font-medium">мес</span>
                       
                       <div v-if="getPlanDetails(userStore.selectedPlan, duration).price" class="mt-1 text-sm font-bold text-white drop-shadow-sm">
                          {{ (getPlanDetails(userStore.selectedPlan, duration).price / duration).toFixed(0) }}⭐
                       </div>
                    </div>
                </label>
              </div>
            </div>

            <!-- Features List -->
            <!-- Фон чуть темнее или светлее: bg-white/10 как в DreamCard блоках -->
            <div class="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-md">
               <h3 class="font-bold text-lg mb-4 flex items-center gap-2 drop-shadow-sm">
                 <span>Входит в тариф:</span>
               </h3>
               <ul class="space-y-3">
                  <li 
                    v-for="(feature, index) in getPlanDetails(userStore.selectedPlan, userStore.selectedDuration).features" 
                    :key="index"
                    class="flex items-start gap-3 text-base leading-snug opacity-95"
                  >
                    <!-- Зеленая галочка может плохо читаться на фиолетовом, сделаем белую или светло-желтую -->
                    <span class="text-yellow-300 font-bold mt-[2px]">✓</span>
                    <span class="font-medium shadow-black/10">{{ feature }}</span>
                  </li>
               </ul>
            </div>
            
            <!-- Bottom spacing for scroll -->
            <div class="h-8 sm:h-0"></div>
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
    
    // Блокируем прокрутку основного body
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
        text: 'Выберите план',
        is_active: false,
        is_visible: true
    });
     tg.MainButton.offClick(handleMainButtonClick);
  }
});
</script>

<style scoped>
/* Дополнительные стили не требуются, всё в Tailwind */
</style>
