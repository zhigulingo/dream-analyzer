  <Teleport to="body">
    <div class="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm overflow-y-auto" @click.self="closeModal">
      <!-- Scroller internal container -->
      <div class="min-h-full flex flex-col items-center w-full" @click.self="closeModal">
        
        <!-- Top Spacer: at least 15% on mobile, flexible on desktop to center -->
        <div class="flex-1 min-h-[15vh] sm:min-h-[10vh] w-full" @click="closeModal"></div>
        
        <!-- Content Card -->
        <div class="w-full max-w-lg pointer-events-auto relative shrink-0">
          <div class="bg-gradient-to-br from-[#8000FF] to-[#5500AA] text-white shadow-lg rounded-t-[32px] sm:rounded-b-[32px] overflow-hidden">
            
            <div class="px-6 pt-8 pb-4 text-center">
               <h2 class="text-[28px] font-bold leading-tight drop-shadow-md">Выбери тариф</h2>
            </div>

            <div class="px-6 pb-6 flex flex-col gap-6">
               <!-- Plan Selector (Pills) -->
               <div class="bg-black/20 p-1 rounded-full flex font-medium backdrop-blur-md">
                  <button 
                    class="flex-1 py-3 rounded-full text-[17px] transition-all duration-200"
                    :class="userStore.selectedPlan === 'basic' ? 'bg-white text-[#6B00D0] shadow-md font-bold' : 'text-white/70 hover:text-white'"
                    @click="userStore.selectPlan('basic')"
                  >
                    Базовый
                  </button>
                  <button 
                    class="flex-1 py-3 rounded-full text-[17px] transition-all duration-200"
                    :class="userStore.selectedPlan === 'premium' ? 'bg-white text-[#6B00D0] shadow-md font-bold' : 'text-white/70 hover:text-white'"
                    @click="userStore.selectPlan('premium')"
                  >
                    Премиум
                  </button>
               </div>

               <!-- Duration Selector -->
               <div>
                 <p class="text-[17px] opacity-80 mb-3 px-2 font-medium">Длительность подписки</p>
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
                       <div 
                         class="relative rounded-[24px] border transition-all duration-200 py-4 flex flex-col items-center justify-center gap-1 h-full min-h-[96px] backdrop-blur-md"
                         :class="[
                           userStore.selectedDuration === duration 
                             ? 'bg-white/20 border-white/60 shadow-lg scale-[1.02]' 
                             : 'bg-white/5 border-white/5 hover:bg-white/10',
                            !getPlanDetails(userStore.selectedPlan, duration).price ? 'opacity-40 grayscale cursor-not-allowed' : ''
                         ]"
                       >
                          <span class="text-3xl font-bold leading-none filter drop-shadow-sm">{{ duration }}</span>
                          <span class="text-[11px] opacity-90 uppercase tracking-widest font-bold">мес</span>
                          <div v-if="getPlanDetails(userStore.selectedPlan, duration).price" class="mt-2 text-[13px] font-bold text-white drop-shadow-sm bg-black/20 px-2 py-0.5 rounded-full">
                             {{ (getPlanDetails(userStore.selectedPlan, duration).price / duration).toFixed(0) }}⭐<span class="opacity-80 font-normal">/мес</span>
                          </div>
                       </div>
                   </label>
                 </div>
               </div>

               <!-- Features List -->
               <div class="bg-white/10 rounded-[24px] p-6 border border-white/5 backdrop-blur-md">
                  <h3 class="font-bold text-[20px] mb-4 drop-shadow-sm">Входит в тариф:</h3>
                  <ul class="space-y-4">
                     <li 
                       v-for="(feature, index) in getPlanDetails(userStore.selectedPlan, userStore.selectedDuration).features" 
                       :key="index"
                       class="flex items-start gap-3 text-[17px] leading-snug opacity-95"
                     >
                       <span class="text-[#FFD700] font-bold mt-[1px] text-xl">✓</span>
                       <span class="font-medium shadow-black/10">{{ feature }}</span>
                     </li>
                  </ul>
               </div>
               
               <!-- Gap for MainButton / Bottom edge -->
               <div class="h-10 sm:h-4"></div>
            </div>
          </div>
          <!-- Extra bottom filling for mobile safe area -->
          <div class="h-10 sm:hidden bg-[#5500AA]"></div>
        </div>

        <!-- Bottom Spacer: active on desktop to center the card -->
        <div class="flex-1 hidden sm:block w-full" @click="closeModal"></div>
        
      </div>
    </div>
  </Teleport>

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
    console.log('[SubscriptionModal] v0.1.1 Mounted');
    
    // Ensure pricing is loaded just in case
    userStore.loadPricing();
    
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
  // Цвет низа градиента (или максимально близкий приятный цвет)
  const buttonColor = '#5500AA'; 
  const buttonTextColor = '#ffffff';

  if (amount) {
    tg.MainButton.setParams({
      text: `Оплатить ${amount} ⭐`,
      color: buttonColor,
      text_color: buttonTextColor,
      is_active: true,
      is_visible: true,
    });
    tg.MainButton.offClick(handleMainButtonClick);
    tg.MainButton.onClick(handleMainButtonClick);
  } else {
    tg.MainButton.setParams({
        text: 'Выберите тариф',
        color: buttonColor, // Даже в неактивном состоянии держим стиль (хотя оно будет серым)
        is_active: false,
        is_visible: true
    });
     tg.MainButton.offClick(handleMainButtonClick);
  }
});
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
