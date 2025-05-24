<template>
  <div class="facts-carousel-horizontal card">
    <!-- Верхняя часть: Заголовок и Пагинация/Таймер -->
    <div class="carousel-header">
      <h2>💡 Знаете ли вы?</h2>
      <!-- Пагинация точками теперь здесь для удобства -->
      <div class="pagination-container">
        <div class="pagination-inner">
          <template v-for="(fact, index) in facts">
            <!-- Active dot as animated pill -->
            <div v-if="index === currentIndex && index !== facts.length - 1" class="active-dot-frame">
              <div class="active-dot-bg"></div>
              <div class="active-dot-fg" :style="{ width: progressBarWidth + 'px', transition: progressBarTransition }"></div>
            </div>
            <!-- Last dot: small dot in 16x16 frame -->
            <div v-else-if="index === facts.length - 1" class="dot-frame">
              <div class="dot small"></div>
            </div>
            <!-- Inactive dots -->
            <div v-else class="dot"></div>
          </template>
        </div>
      </div>
      <!-- Контейнер для прогресс-бара (под пагинацией) -->
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ animationDuration: `${autoAdvanceInterval}ms` }" :key="progressKey"></div>
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
          class="fact-card"
        >
          <p>{{ fact.text }}</p>
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

// --- Progress bar animation for active dot ---
const ACTIVE_DOT_BG_WIDTH = 40;
const ACTIVE_DOT_FG_MAX_WIDTH = 22;
const ACTIVE_DOT_HEIGHT = 16;
const DOT_SIZE = 16;
const SMALL_DOT_SIZE = 12;

const progressBarWidth = ref(0);
const progressBarTransition = ref('none');

watch([currentIndex, progressKey], () => {
  // Reset progress bar instantly
  progressBarTransition.value = 'none';
  progressBarWidth.value = 0;
  // Animate to full width
  setTimeout(() => {
    progressBarTransition.value = `width ${autoAdvanceInterval.value}ms linear`;
    progressBarWidth.value = ACTIVE_DOT_FG_MAX_WIDTH;
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
    const cards = container.querySelectorAll('.fact-card');
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
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 8px;
}

.carousel-header {
  padding: 15px 15px 5px 15px;
  position: relative;
  background-color: var(--tg-theme-secondary-bg-color);
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
  padding: 16px 18px;
  border-radius: 56px;
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(88px);
  -webkit-backdrop-filter: blur(88px);
  width: fit-content;
  margin: 0 auto 10px auto;
}
.pagination-inner {
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
}
.active-dot-frame {
  position: relative;
  width: 40px;
  height: 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
}
.active-dot-bg {
  position: absolute;
  left: 0; top: 0;
  width: 40px;
  height: 16px;
  border-radius: 16px;
  background: #fff;
  opacity: 0.1;
  z-index: 0;
}
.active-dot-fg {
  position: absolute;
  left: 0; top: 0;
  height: 16px;
  border-radius: 16px;
  background: #fff;
  z-index: 1;
  width: 0;
}
.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  opacity: 0.25;
  margin: 0;
}
.dot.small {
  width: 12px;
  height: 12px;
  margin: 2px;
}
.dot-frame {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-bar-container {
  width: 100%; height: 3px;
  background-color: var(--tg-theme-hint-color);
  border-radius: 1.5px; overflow: hidden;
  margin-top: 5px;
}
.progress-bar {
  height: 100%; width: 100%;
  background-color: var(--tg-theme-button-color);
  border-radius: 1.5px;
  transform: translateX(-100%);
  animation-name: progressAnimation;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes progressAnimation {
  from { transform: translateX(-100%); }
  to { transform: translateX(0%); }
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

.fact-card {
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

.fact-card p {
  margin: 0;
  font-size: 0.9em;
  line-height: 1.5;
}

/* Адаптивность (опционально) */
@media (max-width: 480px) {
  .facts-wrapper {
    --card-width-percent: 85%; /* Делаем карточки шире на маленьких экранах */
  }
  .fact-card {
     margin: 0 4px; /* Уменьшаем отступ */
  }
}
</style>
