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
const DOT_ANIMATION_DURATION = 500; // 500ms for transitions
const DOT_ANIMATION_TIMING = 'cubic-bezier(0.4, 0, 0.2, 1)';

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
  const previousDots = [...visibleDots.value];

  for (let i = 0; i < DOT_COUNT; i++) {
    const actualFactIndex = startFactIndex + i;
    const isOutOfBounds = actualFactIndex < 0 || actualFactIndex >= totalFacts;
    const visualIndex = i;

    // Find corresponding previous dot for smooth transitions
    const previousDot = previousDots.find(d => d.actualFactIndex === actualFactIndex);

    let dot = {
      id: previousDot?.id || generateDotId(),
      actualFactIndex,
      type: 'regular',
      sizeClass: 'regular',
      opacity: 1,
      progress: previousDot?.progress || 0,
      targetX: visualIndex * (DOT_REGULAR_SIZE + DOT_GAP),
      scale: 1,
      width: DOT_REGULAR_SIZE,
      height: DOT_REGULAR_SIZE,
      animationStage: previousDot?.animationStage || 'normal',
    };

    if (isOutOfBounds) {
      dot.opacity = 0;
      dot.scale = 0;
      dot.animationStage = 'exiting';
      dot.targetX = (visualIndex < 2) ? -20 : (DOT_COUNT * (DOT_REGULAR_SIZE + DOT_GAP) + 20);
    } else {
      if (actualFactIndex === currentFactIdx) {
        dot.type = 'active';
        dot.width = DOT_ACTIVE_WIDTH;
        dot.height = DOT_ACTIVE_HEIGHT;
        dot.animationStage = 'active';
        dot.progress = 0; // Reset progress for new active dot
      } 
      
      if (totalFacts > DOT_COUNT) {
        if ((visualIndex === 0 && currentFactIdx > 1) || 
            (visualIndex === DOT_COUNT - 1 && currentFactIdx < totalFacts - 2)) {
          dot.sizeClass = 'small';
          dot.width = DOT_SMALL_SIZE;
          dot.height = DOT_SMALL_SIZE;
          
          // Handle entering/exiting animations
          if (visualIndex === 0) {
            dot.animationStage = previousDot ? 'exiting' : 'normal';
            if (!previousDot) dot.scale = 0;
          } else {
            dot.animationStage = previousDot ? 'normal' : 'entering';
            if (!previousDot) dot.scale = 0;
          }
        }
      }
    }
    
    // Set opacity based on dot state
    dot.opacity = dot.type === 'active' ? 1 : (isOutOfBounds ? 0 : 0.25);
    if (dot.sizeClass === 'small') dot.opacity = isOutOfBounds ? 0 : 0.25;

    newDots.push(dot);
  }

  // Handle transitions for dots that are being removed
  previousDots.forEach(prevDot => {
    const keepingDot = newDots.find(d => d.actualFactIndex === prevDot.actualFactIndex);
    if (!keepingDot && prevDot.animationStage !== 'exiting') {
      prevDot.animationStage = 'exiting';
      prevDot.opacity = 0;
      prevDot.scale = 0;
      newDots.push(prevDot);
    }
  });

  visibleDots.value = newDots;
  
  const activeDot = newDots.find(d => d.type === 'active');
  if (activeDot) runActiveDotAnimation(activeDot);
};

const getDotWrapperStyle = (dot) => {
  const baseTransition = `transform ${DOT_ANIMATION_DURATION}ms ${DOT_ANIMATION_TIMING}, opacity ${DOT_ANIMATION_DURATION}ms ${DOT_ANIMATION_TIMING}`;
  
  return {
    transform: `translateX(${dot.targetX}px) scale(${dot.scale})`,
    opacity: dot.opacity,
    transition: baseTransition,
  };
};

const getDotStyle = (dot) => {
  const baseTransition = `width ${DOT_ANIMATION_DURATION}ms ${DOT_ANIMATION_TIMING}, height ${DOT_ANIMATION_DURATION}ms ${DOT_ANIMATION_TIMING}, background-color ${DOT_ANIMATION_DURATION}ms ${DOT_ANIMATION_TIMING}`;
  
  let style = {
    width: `${dot.width}px`,
    height: `${dot.height}px`,
    opacity: dot.type === 'active' || dot.type === 'regular' ? 1 : 0.5,
    transition: baseTransition,
  };

  if (dot.animationStage === 'entering') {
    style.transform = 'scale(0)';
    style.transition = `${baseTransition}, transform ${DOT_ANIMATION_DURATION}ms ${DOT_ANIMATION_TIMING}`;
  } else if (dot.animationStage === 'exiting') {
    style.transform = 'scale(0)';
    style.transition = `${baseTransition}, transform ${DOT_ANIMATION_DURATION}ms ${DOT_ANIMATION_TIMING}`;
  }

  return style;
};

let activeDotAnimationTimer = null;
const runActiveDotAnimation = (activeDot) => {
  if (!activeDot) return;
  clearTimeout(activeDotAnimationTimer);
  
  // Reset progress and start animation
  activeDot.progress = 0;
  
  // Small delay to ensure the dot is rendered before starting animation
  activeDotAnimationTimer = setTimeout(() => {
    if (activeDot.type === 'active') {
      activeDot.progress = DOT_ACTIVE_WIDTH;
    }
  }, 50);
};

// Carousel slide action
const goToFact = async (index) => {
  const previousIndex = currentIndex.value;
  currentIndex.value = Math.max(0, Math.min(index, props.facts.length - 1));
  
  if (swipeAreaRef.value) {
    await nextTick();
    const targetCard = swipeAreaRef.value.querySelector(`#fact-card-${currentIndex.value}`);
    if (targetCard) {
      const container = swipeAreaRef.value;
      const scrollLeftTarget = targetCard.offsetLeft - 
        (container.offsetWidth / 2) + 
        (targetCard.offsetWidth / 2) - 
        (parseFloat(getComputedStyle(container.querySelector('.facts-wrapper')).paddingLeft) || 0);
      
      // Add transition class for smooth movement
      container.style.scrollBehavior = 'smooth';
      container.scrollTo({ left: scrollLeftTarget });
      
      // Reset scroll behavior after animation
      setTimeout(() => {
        container.style.scrollBehavior = 'auto';
      }, DOT_ANIMATION_DURATION);
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
const touchStartScrollLeft = ref(0);
const isDragging = ref(false);
const startTime = ref(0);
const lastTouchX = ref(0);
const touchVelocity = ref(0);
const VELOCITY_THRESHOLD = 0.5; // pixels per millisecond
const SWIPE_THRESHOLD = 50; // pixels

const handleTouchStart = (event) => {
  touchStartX.value = event.touches[0].clientX;
  lastTouchX.value = touchStartX.value;
  startTime.value = Date.now();
  touchStartScrollLeft.value = swipeAreaRef.value?.scrollLeft || 0;
  isDragging.value = true;
  clearInterval(timerId.value);
};

const handleTouchMove = (event) => {
  if (!isDragging.value) return;
  
  const currentX = event.touches[0].clientX;
  const deltaX = touchStartX.value - currentX;
  const deltaTime = Date.now() - startTime.value;
  
  // Calculate velocity (pixels per millisecond)
  touchVelocity.value = (lastTouchX.value - currentX) / Math.max(deltaTime, 1);
  lastTouchX.value = currentX;
  
  if (swipeAreaRef.value) {
    swipeAreaRef.value.style.scrollBehavior = 'auto';
    swipeAreaRef.value.scrollLeft = touchStartScrollLeft.value + deltaX;
  }
};

const handleTouchEnd = (event) => {
  if (!isDragging.value) return;
  isDragging.value = false;
  
  const deltaX = touchStartX.value - event.changedTouches[0].clientX;
  const deltaTime = Date.now() - startTime.value;
  const velocity = Math.abs(touchVelocity.value);
  
  if (swipeAreaRef.value) {
    const container = swipeAreaRef.value;
    const currentScrollLeft = container.scrollLeft;
    const cardWidth = container.offsetWidth * 0.8; // 80% of container width
    const currentCardIndex = Math.round(currentScrollLeft / cardWidth);
    
    let targetIndex = currentCardIndex;
    
    // Determine direction based on velocity and distance
    if (velocity > VELOCITY_THRESHOLD || Math.abs(deltaX) > SWIPE_THRESHOLD) {
      targetIndex += deltaX > 0 ? 1 : -1;
    }
    
    // Ensure target index is within bounds
    targetIndex = Math.max(0, Math.min(targetIndex, props.facts.length - 1));
    
    // Animate to the target card
    goToFact(targetIndex);
  }
  
  resetAutoAdvanceTimer();
};

const handleWheel = (event) => {
  event.preventDefault();
  clearInterval(timerId.value);
  
  const container = swipeAreaRef.value;
  if (!container) return;
  
  const cardWidth = container.offsetWidth * 0.8;
  const currentScrollLeft = container.scrollLeft;
  const currentCardIndex = Math.round(currentScrollLeft / cardWidth);
  
  if (event.deltaY > 0) {
    goToFact(currentCardIndex + 1);
  } else {
    goToFact(currentCardIndex - 1);
  }
};

// Update scroll snap styles
const updateScrollSnapStyles = () => {
  if (!swipeAreaRef.value) return;
  
  const container = swipeAreaRef.value;
  const wrapper = container.querySelector('.facts-wrapper');
  if (!wrapper) return;
  
  const containerWidth = container.offsetWidth;
  const cardWidth = containerWidth * 0.8; // 80% of container width
  
  wrapper.style.setProperty('--card-width-percent', '80%');
  wrapper.style.setProperty('--card-gap', '10px');
  
  // Update padding for proper snapping
  const sidePadding = (containerWidth - cardWidth) / 2;
  wrapper.style.paddingLeft = `${sidePadding}px`;
  wrapper.style.paddingRight = `${sidePadding}px`;
};

watch(currentIndex, () => updateVisibleDots(), { immediate: true });
watch(progressKey, () => { /* Handled by startAutoAdvanceTimer -> nextFact -> goToFact -> currentIndex watch */ });
watch(() => props.facts, () => updateVisibleDots(), { deep: true });

onMounted(() => {
  updateVisibleDots();
  startAutoAdvanceTimer();
  updateScrollSnapStyles();
  
  window.addEventListener('resize', updateScrollSnapStyles);
});
onUnmounted(() => {
  clearInterval(timerId.value);
  window.removeEventListener('resize', updateScrollSnapStyles);
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
  overflow: hidden;
}
.pagination-container.light {
  background: rgba(255,255,255,1);
  border: 1px solid #E5E5EA;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.pagination-inner {
  display: flex;
  position: relative;
  height: 8px;
  width: 64px;
  align-items: center;
}

.dot-wrapper {
  position: absolute;
  top: 0;
  height: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform, opacity;
}

.dot {
  border-radius: 50%;
  background: #fff;
  display: flex;
  position: relative;
  overflow: hidden;
  will-change: transform, width, height;
}

.pagination-container.light .dot {
  background: #007AFF;
}

.dot.active-pill {
  border-radius: 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.active-dot-bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: currentColor;
  opacity: 0.1;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.active-dot-fg {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: inherit;
  background: currentColor;
  opacity: 1;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: width;
}

.dot.entering {
  transform: scale(0);
  opacity: 0;
}

.dot.exiting {
  transform: scale(0);
  opacity: 0;
}

.swipe-area {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  padding: 15px 0;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  will-change: scroll-position;
}
.swipe-area::-webkit-scrollbar { display: none; }

.facts-wrapper {
  display: flex;
  flex-direction: row;
  --card-width-percent: 80%;
  --card-gap: 10px;
  padding-left: calc((100% - var(--card-width-percent)) / 2);
  padding-right: calc((100% - var(--card-width-percent)) / 2);
  gap: var(--card-gap);
}

.fact-card-fancy {
  flex: 0 0 var(--card-width-percent);
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
  scroll-snap-align: center;
  scroll-snap-stop: always;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  user-select: none;
  -webkit-user-select: none;
  touch-action: pan-x;
}

.fact-card-text {
  margin: 0;
  font-size: 0.9em;
  line-height: 1.5;
  pointer-events: none;
}

/* Адаптивность */
@media (max-width: 480px) {
  .facts-wrapper {
    --card-width-percent: 85%;
  }
}
</style>
