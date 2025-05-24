<template>
  <div class="facts-carousel-horizontal card">
    <!-- Верхняя часть: Заголовок и Пагинация/Таймер -->
    <div class="carousel-header">
      <h2>💡 Знаете ли вы?</h2>
      <!-- Complex animated pagination -->
      <div :class="['pagination-container', themeClass]">
        <div class="pagination-inner">
          <div
            v-for="dot in visibleDots"
            :key="dot.id"
            class="dot-wrapper"
            :style="getDotWrapperStyle(dot)"
          >
            <div :class="['dot', dot.sizeClass, dot.type === 'active' ? 'active-pill' : '']" :style="getDotStyle(dot)">
              <div v-if="dot.type === 'active'" class="active-dot-bg"></div>
              <div v-if="dot.type === 'active'" class="active-dot-fg" :style="{ width: dot.progress + 'px' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Область для свайпа/скролла -->
    <div
      class="swipe-area"
      ref="swipeAreaRef"
      @touchstart.passive.stop="handleTouchStart"
      @touchmove.passive.stop="handleTouchMove"
      @touchend.stop="handleTouchEnd"
      @wheel.passive.stop="handleWheel"   
      
    > <!-- Комментарий удален отсюда -->
      <!-- Обертка для всех карточек -->
      <div class="facts-wrapper">
        <!-- Карточки фактов -->
        <div
          v-for="(fact, index) in facts"
          :key="fact.id"
          :id="`fact-card-${index}`"
          class="fact-card-fancy"
        >
          <p class="fact-card-text">{{ fact.text }}</p>
        </div>
      </div>
    </div>
     <!-- Комментарий можно разместить здесь, если нужно -->
     <!-- @wheel.passive.stop="handleWheel" // Добавлена обработка колеса для десктопа -->

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';

const props = defineProps({
  facts: {
    type: Array,
    default: () => [
      { id: 1, text: "Fact 1" }, { id: 2, text: "Fact 2" }, { id: 3, text: "Fact 3" }, 
      { id: 4, text: "Fact 4" }, { id: 5, text: "Fact 5" }, { id: 6, text: "Fact 6" }, 
      { id: 7, text: "Fact 7" }
    ]
  },
  autoAdvanceInterval: { type: Number, default: 8000 }
});

const currentIndex = ref(0);
const progressKey = ref(0);
const swipeAreaRef = ref(null);
const timerId = ref(null);

const theme = ref('dark'); // 'dark' or 'light'
const themeClass = computed(() => theme.value === 'light' ? 'light' : 'dark');

const DOT_COUNT = 5;
const DOT_REGULAR_SIZE = 8;
const DOT_SMALL_SIZE = 6;
const DOT_ACTIVE_WIDTH = 20;
const DOT_ACTIVE_HEIGHT = 8;
const DOT_GAP = 6;
const ACTIVE_DOT_MIN_PROGRESS = 0;
const ACTIVE_DOT_MAX_PROGRESS = 20;

const visibleDots = ref([]);
let dotIdCounter = 0;
const generateDotId = () => `dot-${dotIdCounter++}`;

const updateVisibleDots = () => {
  const totalFacts = props.facts.length;
  const currentFactIdx = currentIndex.value;
  let newDots = [];
  
  let displayCenterFactIndex = currentFactIdx;
  if (totalFacts > DOT_COUNT) {
    if (currentFactIdx < 2) {
      displayCenterFactIndex = 2;
    } else if (currentFactIdx > totalFacts - 3) {
      displayCenterFactIndex = totalFacts - 3;
    }
  }

  const startFactIndex = Math.max(0, displayCenterFactIndex - 2);

  for (let i = 0; i < DOT_COUNT; i++) {
    const actualFactIndex = startFactIndex + i;
    const isOutOfBounds = actualFactIndex < 0 || actualFactIndex >= totalFacts;
    const 화면표시인덱스 = i; // Visual index on screen (0-4)

    let dot = {
      id: generateDotId(), // Always new ID for clean reactivity on structural changes
      actualFactIndex,
      type: 'regular',
      sizeClass: 'regular',
      opacity: 1,
      progress: 0,
      targetX: 화면표시인덱스 * (DOT_REGULAR_SIZE + DOT_GAP),
      scale: 1,
    };

    if (isOutOfBounds) {
      dot.opacity = 0;
      dot.scale = 0;
      dot.targetX = (화면표시인덱스 < 2) ? -20 : (DOT_COUNT * (DOT_REGULAR_SIZE + DOT_GAP) + 20); // Animate off-screen
    } else {
      if (actualFactIndex === currentFactIdx) {
        dot.type = 'active';
      } 
      
      if (totalFacts > DOT_COUNT) {
         if ((화면표시인덱스 === 0 && currentFactIdx > 1) || 
             (화면표시인덱스 === DOT_COUNT - 1 && currentFactIdx < totalFacts - 2)) {
          dot.sizeClass = 'small';
        }
      } else if (actualFactIndex !== currentFactIdx) { // For 5 or less items, non-active are regular or small if at ends
        if ((화면표시인덱스 === 0 && totalFacts > 1 && actualFactIndex !== currentFactIdx) || 
            (화면표시인덱스 === DOT_COUNT -1 && totalFacts > 1 && actualFactIndex !== currentFactIdx && totalFacts <= DOT_COUNT && actualFactIndex === totalFacts -1 )) {
             // This logic for small dots at ends for <=5 items needs care if we want them always small
        }
      }
    }
    dot.opacity = dot.type === 'active' ? 1 : (isOutOfBounds ? 0 : 0.25);
    if (dot.sizeClass === 'small') dot.opacity = isOutOfBounds ? 0 : 0.25;

    newDots.push(dot);
  }
  visibleDots.value = newDots;
  
  const activeDot = newDots.find(d => d.type === 'active');
  if (activeDot) runActiveDotAnimation(activeDot);
};

const getDotWrapperStyle = (dot) => {
  return {
    transform: `translateX(${dot.targetX}px) scale(${dot.scale})`,
    opacity: dot.opacity,
    transition: `transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.4s cubic-bezier(0.4,0,0.2,1)`,
  };
};

const getDotStyle = (dot) => {
  let style = {
    opacity: dot.type === 'active' || dot.type === 'regular' ? 1 : 0.5, // Inner dot opacity (wrapper handles main fade)
    transition: `width 0.4s cubic-bezier(0.4,0,0.2,1), height 0.4s cubic-bezier(0.4,0,0.2,1), background-color 0.3s`,
  };
  if (dot.type === 'active') {
    style.width = `${DOT_ACTIVE_WIDTH}px`;
    style.height = `${DOT_ACTIVE_HEIGHT}px`;
  } else if (dot.sizeClass === 'small') {
    style.width = `${DOT_SMALL_SIZE}px`;
    style.height = `${DOT_SMALL_SIZE}px`;
  } else { // regular
    style.width = `${DOT_REGULAR_SIZE}px`;
    style.height = `${DOT_REGULAR_SIZE}px`;
  }
  return style;
};

let activeDotAnimationTimer = null;
const runActiveDotAnimation = (activeDot) => {
  if (!activeDot) return;
  clearTimeout(activeDotAnimationTimer);
  activeDot.progress = ACTIVE_DOT_MIN_PROGRESS;
  
  activeDotAnimationTimer = setTimeout(() => {
    if (activeDot.type === 'active') { 
      activeDot.progress = ACTIVE_DOT_MAX_PROGRESS;
    }
  }, 50); // delay for pill transition + start fill
};

// Carousel slide action
const goToFact = async (index) => {
  currentIndex.value = Math.max(0, Math.min(index, props.facts.length - 1));
  // Scroll logic... (simplified for brevity)
  if (swipeAreaRef.value) {
    await nextTick();
    const targetCard = swipeAreaRef.value.querySelector(`#fact-card-${currentIndex.value}`);
    if (targetCard) {
      const container = swipeAreaRef.value;
      const scrollLeftTarget = targetCard.offsetLeft - (container.offsetWidth / 2) + (targetCard.offsetWidth / 2) - (parseFloat(getComputedStyle(container.querySelector('.facts-wrapper')).paddingLeft) || 0);
      container.scrollTo({ left: scrollLeftTarget, behavior: 'smooth' });
    }
  }
  resetAutoAdvanceTimer();
};

const nextFact = () => goToFact(currentIndex.value + 1 < props.facts.length ? currentIndex.value + 1 : 0);
const prevFact = () => goToFact(currentIndex.value - 1 >= 0 ? currentIndex.value - 1 : props.facts.length - 1);

const startAutoAdvanceTimer = () => {
  clearInterval(timerId.value);
  progressKey.value++; // Trigger watch for progressKey
  timerId.value = setInterval(nextFact, props.autoAdvanceInterval);
};
const resetAutoAdvanceTimer = () => startAutoAdvanceTimer();

// Touch handlers (simplified)
const touchStartX = ref(0);
const handleTouchStart = (event) => { touchStartX.value = event.touches[0].clientX; clearInterval(timerId.value); };
const handleTouchMove = (event) => {}; // Can be used for interactive swipe
const handleTouchEnd = (event) => {
  const deltaX = touchStartX.value - event.changedTouches[0].clientX;
  if (Math.abs(deltaX) > 50) { if (deltaX > 0) nextFact(); else prevFact(); }
  else resetAutoAdvanceTimer();
};
const handleWheel = (event) => {
  if (event.deltaY > 0) nextFact(); else prevFact();
  event.preventDefault();
};

watch(currentIndex, () => updateVisibleDots(), { immediate: true });
watch(progressKey, () => { /* Handled by startAutoAdvanceTimer -> nextFact -> goToFact -> currentIndex watch */ });
watch(() => props.facts, () => updateVisibleDots(), { deep: true });

onMounted(() => {
  updateVisibleDots();
  startAutoAdvanceTimer();
});
onUnmounted(() => clearInterval(timerId.value));

</script>

<style scoped>
.facts-carousel-horizontal {
  padding: 0;
  overflow: hidden;
  position: relative;
  background: none;
  border-radius: 0;
}

.carousel-header {
  padding: 15px 15px 5px 15px;
  position: relative;
  background: none;
  z-index: 10;
}
.carousel-header h2 {
  margin: 0 0 10px 0;
  font-size: 1.1em;
  text-align: center;
  color: var(--tg-theme-text-color);
}

.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 9px;
  border-radius: 28px;
  background: rgba(0,0,0,0.25);
  backdrop-filter: blur(44px);
  -webkit-backdrop-filter: blur(44px);
  width: fit-content;
  margin: 0 auto 10px auto;
  overflow: hidden; /* To hide dots animating from outside */
}
.pagination-container.light {
  background: rgba(255,255,255,1);
  border: 1px solid #E5E5EA;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.pagination-inner {
  display: flex;
  position: relative;
  height: 8px; /* DOT_ACTIVE_HEIGHT */
  width: 64px; /* 5 * 8px (DOT_REGULAR_SIZE) + 4 * 6px (DOT_GAP) - Approx, can be dynamic if needed */
  align-items: center;
}

.dot-wrapper {
  position: absolute;
  top: 0;
  height: 8px; /* DOT_ACTIVE_HEIGHT */
  display: flex;
  align-items: center;
  justify-content: center;
}

.dot {
  border-radius: 50%;
  background: #fff; /* Default for dark theme */
  display: flex;
  position: relative;
  overflow: hidden;
  /* Base transition for all dot properties that animate */
  transition: width 0.4s cubic-bezier(0.4,0,0.2,1), 
              height 0.4s cubic-bezier(0.4,0,0.2,1), 
              opacity 0.4s ease-out, 
              transform 0.5s cubic-bezier(0.4,0,0.2,1), 
              background-color 0.3s;
}
.pagination-container.light .dot {
  background: #007AFF;
}

.dot.active-pill {
  border-radius: 4px; /* DOT_ACTIVE_HEIGHT / 2 */
}

.active-dot-bg {
  position: absolute; left: 0; top: 0;
  width: 100%; height: 100%;
  border-radius: inherit;
  background: currentColor;
  opacity: 0.1;
}
.active-dot-fg {
  position: absolute; left: 0; top: 0;
  height: 100%;
  border-radius: inherit;
  background: currentColor;
  opacity: 1;
  /* Transition for width is now controlled by activeDot.progress and applied via :style */
  /* Fallback if autoAdvanceInterval is not ready */
  transition: width 0.8s linear; 
}

.swipe-area {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  padding: 15px 0; /* Вертикальный отступ */
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x; /* Важно для горизонтального свайпа */
}
.swipe-area::-webkit-scrollbar { display: none; }

.facts-wrapper {
  display: flex;
  flex-direction: row;
  /* Отступы для "подглядывания", используем переменную --card-width-percent */
  /* Значение по умолчанию 80%, можно переопределить */
  --card-width-percent: 80%;
  padding-left: calc((100% - var(--card-width-percent)) / 2);
  padding-right: calc((100% - var(--card-width-percent)) / 2);
}

.fact-card-fancy {
  flex-shrink: 0;
  width: var(--card-width-percent); /* Используем переменную */
  min-height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 15px;
  box-sizing: border-box;
  color: var(--tg-theme-text-color);
  background-color: var(--tg-theme-bg-color);
  border-radius: 8px;
  margin: 0 5px; /* Отступ между карточками */
  scroll-snap-align: center; /* Привязка к центру */
}

.fact-card-text {
  margin: 0;
  font-size: 0.9em;
  line-height: 1.5;
}

/* Адаптивность (опционально) */
@media (max-width: 480px) {
  .facts-wrapper {
    --card-width-percent: 85%; /* Делаем карточки шире на маленьких экранах */
  }
  .fact-card-fancy {
     margin: 0 4px; /* Уменьшаем отступ */
  }
}
</style>
