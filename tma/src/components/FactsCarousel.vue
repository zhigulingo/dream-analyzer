<template>
  <div class="facts-carousel-horizontal card">
    <!-- Верхняя часть: Заголовок и Пагинация/Таймер -->
    <div class="carousel-header">
      <h2>💡 Знаете ли вы?</h2>
      <!-- Complex animated pagination -->
      <div :class="['pagination-container', themeClass]">
        <div class="pagination-inner">
          <TransitionGroup name="dot">
            <div
              v-for="dot in visibleDots"
              :key="dot.id"
              class="dot-wrapper"
              :style="getDotWrapperStyle(dot)"
            >
              <div 
                :class="['dot', { 'active': dot.isActive, 'small': dot.isSmall }]"
                :style="getDotStyle(dot)"
              >
                <template v-if="dot.isActive">
                  <div class="active-dot-bg"></div>
                  <div 
                    class="active-dot-fg"
                    :style="getActiveDotFgStyle(dot)"
                  ></div>
                </template>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <!-- Область для свайпа/скролла -->
    <div
      class="swipe-area"
      ref="swipeAreaRef"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @wheel="handleWheel"
    >
      <!-- Обертка для всех карточек -->
      <div class="facts-wrapper">
        <!-- Карточки фактов -->
        <div
          v-for="(fact, index) in facts"
          :key="fact.id"
          :id="`fact-card-${index}`"
          class="fact-card"
          :class="{ 'active': currentIndex === index }"
        >
          <p class="fact-text">{{ fact.text }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  facts: {
    type: Array,
    default: () => [
      { id: 1, text: "Большинство снов забываются в течение первых 5-10 минут после пробуждения." },
      { id: 2, text: "Символ 'Полет во сне' часто связывают с ощущением свободы, контроля или, наоборот, с желанием убежать от проблем." },
      { id: 3, text: "Слепые от рождения люди видят сны, используя другие чувства: слух, обоняние, осязание и эмоции." },
      { id: 4, text: "Символ 'Зубы' (выпадение/крошение) может указывать на чувство бессилия, тревогу о внешности или страх потери контроля." },
      { id: 5, text: "Во время REM-фазы сна (когда мы видим сны) наши мышцы парализованы, чтобы мы не повторяли движения из сна." },
      { id: 6, text: "Символ 'Дом' часто представляет самого сновидца, его личность или текущее состояние." },
      { id: 7, text: "Даже короткий дневной сон (10-20 минут) может улучшить бдительность и производительность." },
      { id: 8, text: "Символ 'Вода' может символизировать эмоции: спокойная вода - умиротворение, бурная - сильные переживания." },
      { id: 9, text: "Некоторые изобретения, такие как швейная машинка или структура бензола, были придуманы или подсказаны во сне." },
      { id: 10, text: "Символ 'Преследование' может отражать избегание какой-то проблемы или неприятной ситуации в реальной жизни." }
    ]
  },
  autoAdvanceInterval: {
    type: Number,
    default: 8000
  }
});

// Constants for dots
const DOT_SIZE = 8;
const DOT_SMALL_SIZE = 6;
const DOT_ACTIVE_WIDTH = 20;
const DOT_GAP = 6;
const VISIBLE_DOTS = 5;

// State
const currentIndex = ref(0);
const swipeAreaRef = ref(null);
const isDragging = ref(false);
const startX = ref(0);
const scrollLeft = ref(0);
const autoAdvanceTimer = ref(null);
const activeDotProgress = ref(0);
const theme = ref('dark');

// Computed
const themeClass = computed(() => theme.value);

const visibleDots = computed(() => {
  const totalFacts = props.facts.length;
  const dots = [];
  let startIdx = currentIndex.value - 2;
  
  // Adjust start index for edge cases
  if (startIdx < 0) startIdx = 0;
  if (startIdx > totalFacts - VISIBLE_DOTS) startIdx = totalFacts - VISIBLE_DOTS;
  
  for (let i = 0; i < VISIBLE_DOTS; i++) {
    const factIndex = startIdx + i;
    if (factIndex >= 0 && factIndex < totalFacts) {
      dots.push({
        id: `dot-${factIndex}`,
        index: factIndex,
        isActive: factIndex === currentIndex.value,
        isSmall: (i === 0 && startIdx > 0) || (i === VISIBLE_DOTS - 1 && startIdx < totalFacts - VISIBLE_DOTS),
        position: i * (DOT_SIZE + DOT_GAP)
      });
    }
  }
  
  return dots;
});

// Styles
const getDotWrapperStyle = (dot) => ({
  transform: `translateX(${dot.position}px)`,
  transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)'
});

const getDotStyle = (dot) => ({
  width: dot.isActive ? `${DOT_ACTIVE_WIDTH}px` : 
        dot.isSmall ? `${DOT_SMALL_SIZE}px` : `${DOT_SIZE}px`,
  height: dot.isSmall ? `${DOT_SMALL_SIZE}px` : `${DOT_SIZE}px`,
  borderRadius: dot.isActive ? '4px' : '50%',
  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
});

const getActiveDotFgStyle = (dot) => ({
  width: `${activeDotProgress.value}%`,
  transition: 'width 300ms linear'
});

// Methods
const startAutoAdvance = () => {
  stopAutoAdvance();
  activeDotProgress.value = 0;
  
  // Start progress animation
  requestAnimationFrame(() => {
    activeDotProgress.value = 100;
  });
  
  autoAdvanceTimer.value = setTimeout(() => {
    goToNext();
  }, props.autoAdvanceInterval);
};

const stopAutoAdvance = () => {
  if (autoAdvanceTimer.value) {
    clearTimeout(autoAdvanceTimer.value);
    autoAdvanceTimer.value = null;
  }
};

const goToNext = () => {
  const nextIndex = currentIndex.value + 1;
  if (nextIndex < props.facts.length) {
    currentIndex.value = nextIndex;
  } else {
    currentIndex.value = 0;
  }
};

const goToPrev = () => {
  const prevIndex = currentIndex.value - 1;
  if (prevIndex >= 0) {
    currentIndex.value = prevIndex;
  } else {
    currentIndex.value = props.facts.length - 1;
  }
};

const scrollToCurrentCard = () => {
  if (!swipeAreaRef.value) return;
  
  const card = swipeAreaRef.value.querySelector(`#fact-card-${currentIndex.value}`);
  if (!card) return;
  
  const container = swipeAreaRef.value;
  const scrollTarget = card.offsetLeft - 
    (container.offsetWidth - card.offsetWidth) / 2;
  
  container.scrollTo({
    left: scrollTarget,
    behavior: 'smooth'
  });
};

// Event handlers
const handleTouchStart = (e) => {
  isDragging.value = true;
  startX.value = e.touches[0].pageX - swipeAreaRef.value.offsetLeft;
  scrollLeft.value = swipeAreaRef.value.scrollLeft;
  stopAutoAdvance();
};

const handleTouchMove = (e) => {
  if (!isDragging.value) return;
  e.preventDefault();
  
  const x = e.touches[0].pageX - swipeAreaRef.value.offsetLeft;
  const walk = (x - startX.value) * 2;
  swipeAreaRef.value.scrollLeft = scrollLeft.value - walk;
};

const handleTouchEnd = () => {
  isDragging.value = false;
  const container = swipeAreaRef.value;
  if (!container) return;
  
  const cardWidth = container.offsetWidth * 0.8;
  const currentScroll = container.scrollLeft;
  const targetIndex = Math.round(currentScroll / cardWidth);
  
  currentIndex.value = Math.max(0, Math.min(targetIndex, props.facts.length - 1));
  scrollToCurrentCard();
  startAutoAdvance();
};

const handleWheel = (e) => {
  e.preventDefault();
  if (e.deltaY > 0) {
    goToNext();
  } else {
    goToPrev();
  }
  stopAutoAdvance();
  startAutoAdvance();
};

// Watchers
watch(currentIndex, () => {
  scrollToCurrentCard();
  startAutoAdvance();
});

// Lifecycle
onMounted(() => {
  scrollToCurrentCard();
  startAutoAdvance();
});

onUnmounted(() => {
  stopAutoAdvance();
});
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
  padding: 15px 15px 5px;
  position: relative;
  z-index: 10;
}

.carousel-header h2 {
  margin: 0 0 10px;
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
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(44px);
  -webkit-backdrop-filter: blur(44px);
  width: fit-content;
  margin: 0 auto 10px;
  overflow: hidden;
}

.pagination-container.light {
  background: #fff;
  border: 1px solid #E5E5EA;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.pagination-inner {
  position: relative;
  height: 8px;
  width: 64px;
}

.dot-wrapper {
  position: absolute;
  top: 0;
  height: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
}

.dot {
  position: relative;
  background: #fff;
  border-radius: 50%;
  opacity: 0.25;
  overflow: hidden;
  will-change: width, height, border-radius;
}

.dot.active {
  opacity: 1;
}

.dot.small {
  opacity: 0.25;
}

.pagination-container.light .dot {
  background: #007AFF;
}

.active-dot-bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: currentColor;
  opacity: 0.1;
}

.active-dot-fg {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: currentColor;
  will-change: width;
}

.swipe-area {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  padding: 15px 0;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
}

.swipe-area::-webkit-scrollbar {
  display: none;
}

.facts-wrapper {
  display: flex;
  padding: 0 10%;
  gap: 10px;
}

.fact-card {
  flex: 0 0 80%;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px;
  background: var(--tg-theme-bg-color);
  border-radius: 8px;
  scroll-snap-align: center;
  scroll-snap-stop: always;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  -webkit-user-select: none;
}

.fact-text {
  margin: 0;
  font-size: 0.9em;
  line-height: 1.5;
  text-align: center;
  color: var(--tg-theme-text-color);
}

/* Transitions */
.dot-enter-active,
.dot-leave-active {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.dot-enter-from,
.dot-leave-to {
  opacity: 0;
  transform: scale(0);
}

/* Responsive */
@media (max-width: 480px) {
  .facts-wrapper {
    padding: 0 7.5%;
  }
  
  .fact-card {
    flex: 0 0 85%;
  }
}
</style>
