<template>
  <div class="fixed inset-0 z-[9999] flex justify-center items-start bg-black/70 backdrop-blur-sm overflow-y-auto" @click.self="closeModal">
    <div class="w-full max-w-lg min-h-screen sm:min-h-0 sm:mt-20 sm:rounded-2xl sm:mb-10 relative pt-[var(--tma-safe-top,20px)] sm:pt-0">
       <!-- Card Container -->
       <div class="bg-gradient-to-br from-[#4c1d95] to-[#3b82f6] text-white shadow-2xl min-h-full sm:min-h-0 sm:rounded-2xl overflow-hidden flex flex-col">
         
         <!-- Header / Close button for desktop -->
         <div class="relative px-6 pt-6 pb-2 text-center">
            <h2 class="text-[28px] font-bold leading-tight">Выберите план</h2>
            <button class="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:block hidden" @click="closeModal">
              ✕
            </button>
         </div>

         <div class="px-6 pb-8 flex-1 flex flex-col gap-6">
            <!-- Plan Selector (Tabs) -->
            <div class="bg-black/20 p-1 rounded-xl flex font-medium">
               <button 
                 class="flex-1 py-2.5 rounded-lg text-sm transition-all duration-200"
                 :class="userStore.selectedPlan === 'basic' ? 'bg-white/20 text-white shadow-sm' : 'text-white/60 hover:text-white/80'"
                 @click="userStore.selectPlan('basic')"
               >
                 Basic
               </button>
               <button 
                 class="flex-1 py-2.5 rounded-lg text-sm transition-all duration-200"
                 :class="userStore.selectedPlan === 'premium' ? 'bg-white/20 text-white shadow-sm' : 'text-white/60 hover:text-white/80'"
                 @click="userStore.selectPlan('premium')"
               >
                 Premium
               </button>
            </div>

            <!-- Duration Selector -->
            <div>
              <p class="text-sm opacity-70 mb-3 px-1">Длительность подписки</p>
              <div class="grid grid-cols-3 gap-3">
                <label v-for="duration in [1, 3, 12]" :key="duration" class="cursor-pointer group">
                   <input
                      type="radio"
                      name="duration"
                      class="hidden"
                      :value="duration"
                      :disabled="!getPlanDetails(userStore.selectedPlan, duration).price"
                      :checked="userStore.selectedDuration === duration"
                      @change="userStore.selectDuration(duration)"
                    />
                    <!-- Card-like duration button -->
                    <div 
                      class="relative rounded-xl border-2 transition-all duration-200 py-3 flex flex-col items-center justify-center gap-1 h-full min-h-[80px]"
                      :class="[
                        userStore.selectedDuration === duration 
                          ? 'bg-white/20 border-white/50 shadow-lg' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10',
                         !getPlanDetails(userStore.selectedPlan, duration).price ? 'opacity-40 grayscale cursor-not-allowed' : ''
                      ]"
                    >
                       <span class="text-lg font-bold leading-none">{{ duration }}</span>
                       <span class="text-xs opacity-80 uppercase tracking-wide">мес</span>
                       
                       <div v-if="getPlanDetails(userStore.selectedPlan, duration).price" class="mt-1 text-sm font-medium text-blue-200">
                          {{ (getPlanDetails(userStore.selectedPlan, duration).price / duration).toFixed(0) }}⭐
                       </div>
                    </div>
                </label>
              </div>
            </div>

            <!-- Features List -->
            <div class="bg-white/5 rounded-2xl p-5 border border-white/10">
               <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
                 <span>Входит в тариф:</span>
               </h3>
               <ul class="space-y-3">
                  <li 
                    v-for="(feature, index) in getPlanDetails(userStore.selectedPlan, userStore.selectedDuration).features" 
                    :key="index"
                    class="flex items-start gap-3 text-base leading-snug opacity-90"
                  >
                    <span class="text-green-300 font-bold mt-0.5">✓</span>
                    <span>{{ feature }}</span>
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
/* Стилей минимум, так как используем Tailwind */
</style>
