<template>
  <div class="facts-carousel-horizontal card">
    <!-- Верхняя часть: Заголовок и Пагинация/Таймер -->
    <div class="carousel-header">
      <h2>💡 Знаете ли вы?</h2>
      <!-- Pixel-perfect Figma pagination: always 5 dots -->
      <div :class="['pagination-container', themeClass]">
        <div class="pagination-inner">
          <template v-for="(dot, i) in visibleDots" :key="i">
            <div v-if="dot.type === 'active'" class="active-dot-frame" :style="{ left: dot.offset }">
              <div class="active-dot-bg"></div>
              <div class="active-dot-fg" :style="{ width: progressBarWidth + 'px', transition: progressBarTransition }"></div>
            </div>
            <div v-else-if="dot.type === 'small'" class="dot-frame">
              <div class="dot small"></div>
            </div>
            <div v-else class="dot"></div>
          </template>
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

// --- Данные фактов ---
const facts = ref([
  { id: 1, text: "Большинство снов забываются в течение первых 5-10 минут после пробуждения." },
  { id: 2, text: "Символ 'Полет во сне' часто связывают с ощущением свободы, контроля или, наоборот, с желанием убежать от проблем." },
  { id: 3, text: "Слепые от рождения люди видят сны, используя другие чувства: слух, обоняние, осязание и эмоции." },
  { id: 4, text: "Символ 'Зубы' (выпадение/крошение) может указывать на чувство бессилия, тревогу о внешности или страх потери контроля." },
  { id: 5, text: "Во время REM-фазы сна (когда мы видим сны) наши мышцы парализованы, чтобы мы не повторяли движения из сна." },
  { id: 6, text: "Символ 'Дом' часто представляет самого сновидца, его личность или текущее состояние." },
  { id: 7, text: "Даже короткий дневной сон (10-20 минут) может улучшить бдительность и производительность." },
  { id: 8, text: "Символ 'Вода' может символизировать эмоции: спокойная вода - умиротворение, бурная - сильные переживания." },
  { id: 9, text: "Некоторые изобретения, такие как швейная машинка или структура бензола, были придуманы или подсказаны во сне." },
  { id: 10, text: "Символ 'Преследование' может отражать избегание какой-то проблемы или неприятной ситуации в реальной жизни." },
]);

// --- Состояние карусели ---
const currentIndex = ref(0);
const autoAdvanceInterval = ref(8000); // мс
const timerId = ref(null);
const progressKey = ref(0); // Для перезапуска анимации прогресс-бара

// --- Состояние для свайпа ---
const swipeAreaRef = ref(null); // Реф для DOM-элемента .swipe-area
const touchStartX = ref(0);
const touchCurrentX = ref(0);
const isSwiping = ref(false); // Флаг, что свайп пальцем активен
const swipeThreshold = 50; // Порог свайпа в пикселях для смены слайда
const isWheeling = ref(false); // Флаг, что идет прокрутка колесом

// --- Theme support (dark/light/blue) ---
// 'dark' (default), 'light' (blue)
const theme = ref('dark'); // set to 'light' for blue theme
const themeClass = computed(() => theme.value === 'light' ? 'light' : 'dark');

// --- Pagination logic: always 5 dots, smooth transition ---
const DOT_COUNT = 5;
const getVisibleDots = computed(() => {
  const total = facts.value.length;
  const current = currentIndex.value;
  let dots = [];
  let first = 0;
  if (total <= DOT_COUNT) {
    for (let i = 0; i < total; i++) {
      dots.push({ type: i === current ? 'active' : 'regular', offset: undefined });
    }
    while (dots.length < DOT_COUNT) dots.push({ type: 'regular', offset: undefined });
  } else {
    if (current <= 2) {
      first = 0;
    } else if (current >= total - 3) {
      first = total - DOT_COUNT;
    } else {
      first = current - 2;
    }
    for (let i = 0; i < DOT_COUNT; i++) {
      const idx = first + i;
      let type = 'regular';
      if (i === 0 && first > 0) type = 'small';
      if (i === DOT_COUNT - 1 && idx < total - 1) type = 'small';
      if (idx === current) type = 'active';
      dots.push({ type, offset: undefined });
    }
  }
  // For smooth transition: set offset for active dot
  // (not used in this version, but can be used for left animation)
  return dots;
});
const visibleDots = getVisibleDots;

// --- Progress bar animation for active dot (Figma: 11px to 20px) ---
const ACTIVE_DOT_MIN_WIDTH = 11;
const ACTIVE_DOT_MAX_WIDTH = 20;
const progressBarWidth = ref(ACTIVE_DOT_MIN_WIDTH);
const progressBarTransition = ref('none');

watch([currentIndex, progressKey], () => {
  progressBarTransition.value = 'none';
  progressBarWidth.value = ACTIVE_DOT_MIN_WIDTH;
  setTimeout(() => {
    progressBarTransition.value = `width ${autoAdvanceInterval.value}ms cubic-bezier(0.4,0,0.2,1)`;
    progressBarWidth.value = ACTIVE_DOT_MAX_WIDTH;
  }, 20);
});

// --- Методы навигации и таймера ---
const goToFact = async (index) => {
  const newIndex = Math.max(0, Math.min(index, facts.value.length - 1));
  currentIndex.value = newIndex;

  if (swipeAreaRef.value) {
    await nextTick();
    const targetCard = swipeAreaRef.value.querySelector(`#fact-card-${newIndex}`);
    if (targetCard) {
        const container = swipeAreaRef.value;
        const containerPaddingLeft = parseFloat(getComputedStyle(container).paddingLeft) || 0; // Используем paddingLeft контейнера wrapper'а
        const wrapperPaddingLeft = parseFloat(getComputedStyle(container.querySelector('.facts-wrapper')).paddingLeft) || 0; // Используем paddingLeft wrapper'а

        // Целевой scrollLeft: позиция карточки относительно wrapper'а минус половина разницы ширин контейнера и карточки (для центрирования),
        // Плюс добавляем обратно паддинг wrapper'а, т.к. offsetLeft его не учитывает
        const scrollLeftTarget = targetCard.offsetLeft
                               - (container.offsetWidth / 2)
                               + (targetCard.offsetWidth / 2)
                               - wrapperPaddingLeft; // Корректируем на паддинг wrapper'а

        container.scrollTo({
          left: scrollLeftTarget,
          behavior: 'smooth'
        });
        console.log(`[Carousel] Scrolling to index ${newIndex}, target scrollLeft: ${scrollLeftTarget}`);
    } else {
        console.warn(`[Carousel] Target card #fact-card-${newIndex} not found.`);
    }
  }
  resetAutoAdvanceTimer();
};


const nextFact = () => {
  const nextIndex = currentIndex.value + 1 < facts.value.length ? currentIndex.value + 1 : 0;
  goToFact(nextIndex);
};

const prevFact = () => {
  const prevIndex = currentIndex.value - 1 >= 0 ? currentIndex.value - 1 : facts.value.length - 1;
  goToFact(prevIndex);
};

const startAutoAdvanceTimer = () => {
  clearInterval(timerId.value);
  progressKey.value++;
  timerId.value = setInterval(nextFact, autoAdvanceInterval.value);
};

const resetAutoAdvanceTimer = () => {
  startAutoAdvanceTimer();
};

// --- Обработчики свайпа (Touch) ---
const handleTouchStart = (event) => {
  if (event.touches.length === 1) {
    touchStartX.value = event.touches[0].clientX;
    touchCurrentX.value = touchStartX.value;
    isSwiping.value = true;
    clearInterval(timerId.value);
    console.log(`[CarouselSwipe] TouchStart X: ${touchStartX.value}`);
  }
};

const handleTouchMove = (event) => {
  if (!isSwiping.value || event.touches.length !== 1) return;
  touchCurrentX.value = event.touches[0].clientX;
};

const handleTouchEnd = () => {
  if (!isSwiping.value) return;
  isSwiping.value = false;

  const deltaX = touchStartX.value - touchCurrentX.value;
  console.log(`[CarouselSwipe] TouchEnd. Delta X: ${deltaX}`);

  if (Math.abs(deltaX) > swipeThreshold) {
    if (deltaX > 0) { console.log('[CarouselSwipe] Trigger NEXT fact'); nextFact(); }
    else { console.log('[CarouselSwipe] Trigger PREV fact'); prevFact(); }
  } else {
    console.log('[CarouselSwipe] Swipe too short or tap, restarting timer.');
    // Если свайп короткий, плавно возвращаем на текущий слайд (через goToFact)
    goToFact(currentIndex.value); // Это также перезапустит таймер
    // resetAutoAdvanceTimer(); // Можно убрать, т.к. goToFact его перезапустит
  }
  touchStartX.value = 0;
  touchCurrentX.value = 0;
};

// --- Обработчик колеса мыши (Wheel) ---
const handleWheel = (event) => {
    const container = swipeAreaRef.value;
    if (container && container.scrollWidth > container.clientWidth) {
        event.stopPropagation();
        // Прокручиваем контейнер напрямую, а не через goToFact, чтобы не менять активный индекс
        container.scrollBy({ left: event.deltaY > 0 ? 150 : -150, behavior: 'smooth' });

        // Обновляем текущий индекс на основе видимой карточки после скролла колесом (с debounce)
        if (!isWheeling.value) {
            isWheeling.value = true;
            clearInterval(timerId.value);
            setTimeout(() => {
                updateCurrentIndexFromScroll(); // Обновляем индекс
                resetAutoAdvanceTimer(); // Перезапускаем таймер с правильным индексом
                isWheeling.value = false;
                console.log('[CarouselWheel] Updated index and restarted timer after wheel.');
            }, 400); // Задержка чуть больше времени анимации скролла
        }
    }
};

// --- Новая функция для определения индекса по позиции скролла ---
const updateCurrentIndexFromScroll = () => {
    if (!swipeAreaRef.value) return;
    const container = swipeAreaRef.value;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.offsetWidth;
    let closestIndex = 0;
    let minDistance = Infinity;

    // Проходим по всем карточкам, чтобы найти ближайшую к центру
    const cards = container.querySelectorAll('.fact-card-fancy');
    cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft - container.offsetLeft + card.offsetWidth / 2;
        const containerCenter = scrollLeft + containerWidth / 2;
        const distance = Math.abs(cardCenter - containerCenter);
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });

    if (closestIndex !== currentIndex.value) {
        console.log(`[CarouselWheel] Index updated by scroll: ${closestIndex}`);
        currentIndex.value = closestIndex; // Обновляем индекс без вызова goToFact
    }
};


// --- Хуки жизненного цикла ---
onMounted(() => {
  startAutoAdvanceTimer();
  // Добавляем слушатель скролла для обновления индекса при ручном скролле пользователем
  // (например, на тачпаде десктопа или просто перетаскиванием скроллбара, если он видим)
  if (swipeAreaRef.value) {
      swipeAreaRef.value.addEventListener('scroll', updateCurrentIndexFromScroll);
  }
});

onUnmounted(() => {
  clearInterval(timerId.value);
  if (swipeAreaRef.value) {
      swipeAreaRef.value.removeEventListener('scroll', updateCurrentIndexFromScroll);
  }
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
  @apply px-2 py-2 rounded-3xl;
  background: rgba(0,0,0,0.25);
  backdrop-filter: blur(44px);
  -webkit-backdrop-filter: blur(44px);
  width: fit-content;
  margin: 0 auto 10px auto;
}
.pagination-container.light {
  background: rgba(255,255,255,1);
  border: 1px solid #E5E5EA;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.pagination-inner {
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
}
.active-dot-frame {
  position: relative;
  width: 20px;
  height: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
  transition: left 0.3s cubic-bezier(0.4,0,0.2,1);
}
.active-dot-bg {
  position: absolute;
  left: 0; top: 0;
  width: 20px;
  height: 8px;
  border-radius: 8px;
  background: #fff;
  opacity: 0.1;
  z-index: 0;
}
.active-dot-fg {
  position: absolute;
  left: 0; top: 0;
  height: 8px;
  border-radius: 8px;
  background: #fff;
  z-index: 1;
  width: 0;
}
.pagination-container.light .active-dot-bg,
.pagination-container.light .active-dot-fg,
.pagination-container.light .dot {
  background: #007AFF;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  opacity: 0.25;
  margin: 0;
  transition: background 0.3s, opacity 0.3s;
}
.dot.small {
  width: 6px;
  height: 6px;
  margin: 1px;
}
.dot-frame {
  width: 8px;
  height: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pagination-container.light .dot {
  background: #007AFF;
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
  @apply p-4;
  box-sizing: border-box;
  color: var(--tg-theme-text-color);
  background-color: var(--tg-theme-bg-color);
  @apply rounded-lg;
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
