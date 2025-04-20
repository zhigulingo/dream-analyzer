<template>
  <div class="facts-carousel-swipe card">
    <!-- Верхняя часть: Заголовок и Таймер -->
    <div class="carousel-header">
      <h2>💡 Знаете ли вы?</h2>
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ animationDuration: `${autoAdvanceInterval}ms` }" :key="progressKey"></div>
      </div>
    </div>

    <!-- Область для свайпа -->
    <div
      class="swipe-area"
      @touchstart.passive="handleTouchStart"
      @touchmove.passive="handleTouchMove"
      @touchend="handleTouchEnd"
      ref="swipeAreaRef"
    >
      <!-- Обертка для всех карточек -->
      <div class="facts-wrapper" :style="wrapperStyle">
        <!-- Карточки фактов -->
        <div
          v-for="(fact, index) in facts"
          :key="fact.id"
          class="fact-card" /* Добавим фон и отступы для вида "объекта" */
        >
          <p>{{ fact.text }}</p>
        </div>
      </div>
    </div>

     <!-- Пагинация точками -->
     <div class="pagination">
        <span
          v-for="(fact, index) in facts"
          :key="`dot-${fact.id}`"
          class="dot"
          :class="{ active: index === currentIndex }"
          @click="goToFact(index)"
        ></span>
      </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

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
const autoAdvanceInterval = ref(8000);
const timerId = ref(null);
const progressKey = ref(0);

// --- Состояние для свайпа ---
const swipeAreaRef = ref(null);
const touchStartY = ref(0);
const touchEndY = ref(0);
const isSwiping = ref(false);
const swipeThreshold = ref(50); // Порог свайпа в пикселях

// --- Вычисляемые свойства ---
const wrapperStyle = computed(() => ({
  // Сдвигаем вверх на 100% высоты swipe-area для каждой карточки
  transform: `translateY(-${currentIndex.value * 100}%)`,
  // Анимация только при завершении свайпа, не во время
  transition: isSwiping.value ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)'
}));

// --- Методы навигации и таймера ---
const goToFact = (index) => {
  if (index >= 0 && index < facts.value.length) {
    currentIndex.value = index;
    resetAutoAdvanceTimer();
  }
};
const nextFact = () => { goToFact((currentIndex.value + 1) % facts.value.length); };
const prevFact = () => { goToFact((currentIndex.value - 1 + facts.value.length) % facts.value.length); };

const startAutoAdvanceTimer = () => {
  clearInterval(timerId.value);
  progressKey.value++;
  timerId.value = setInterval(nextFact, autoAdvanceInterval.value);
};
const resetAutoAdvanceTimer = () => { startAutoAdvanceTimer(); };

// --- Обработчики свайпа ---
const handleTouchStart = (event) => {
  // event.touches содержит список всех текущих касаний
  if (event.touches.length === 1) { // Реагируем только на одно касание
    touchStartY.value = event.touches[0].clientY;
    touchEndY.value = touchStartY.value; // Инициализируем конечную точку
    isSwiping.value = true;
    clearInterval(timerId.value); // Пауза таймера во время свайпа
    console.log(`[Swipe] Start Y: ${touchStartY.value}`);
  }
};

const handleTouchMove = (event) => {
  if (!isSwiping.value || event.touches.length !== 1) return;
  touchEndY.value = event.touches[0].clientY;
  // Можно добавить live-смещение wrapper'а здесь, но это сложнее и не всегда нужно
};

const handleTouchEnd = () => {
  if (!isSwiping.value) return;
  isSwiping.value = false; // Заканчиваем свайп для включения transition

  const deltaY = touchStartY.value - touchEndY.value; // Положительный -> свайп вверх
  console.log(`[Swipe] End. Delta Y: ${deltaY}`);

  if (Math.abs(deltaY) > swipeThreshold.value) {
    if (deltaY > 0) { // Свайп вверх
      console.log('[Swipe] Trigger NEXT');
      nextFact();
    } else { // Свайп вниз
      console.log('[Swipe] Trigger PREV');
      prevFact();
    }
  } else {
     console.log('[Swipe] Swipe too short, restarting timer.');
     // Если свайп короткий или это был просто тап, перезапускаем таймер
     resetAutoAdvanceTimer();
  }
  // Сбрасываем координаты после обработки
  touchStartY.value = 0;
  touchEndY.value = 0;
};

// --- Хуки жизненного цикла ---
onMounted(() => { startAutoAdvanceTimer(); });
onUnmounted(() => { clearInterval(timerId.value); });

</script>

<style scoped>
.facts-carousel-swipe {
  padding: 0;
  overflow: hidden;
  position: relative;
  margin-top: 20px;
  background-color: var(--tg-theme-secondary-bg-color); /* Фон всей карусели */
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.carousel-header {
  padding: 15px 15px 10px 15px;
  position: sticky;
  top: 0; left: 0; right: 0;
  background-color: var(--tg-theme-secondary-bg-color);
  z-index: 10;
  border-bottom: 1px solid var(--tg-theme-hint-color);
}
.carousel-header h2 { margin: 0 0 10px 0; font-size: 1.1em; text-align: center; color: var(--tg-theme-text-color); }

.progress-bar-container { width: 100%; height: 3px; background-color: var(--tg-theme-hint-color); border-radius: 1.5px; overflow: hidden; }
.progress-bar { height: 100%; width: 100%; background-color: var(--tg-theme-button-color); border-radius: 1.5px; transform: translateX(-100%); animation-name: progressAnimation; animation-timing-function: linear; animation-fill-mode: forwards; }
@keyframes progressAnimation { from { transform: translateX(-100%); } to { transform: translateX(0%); } }

.swipe-area {
  /* === ИЗМЕНЕНИЕ: Высота 50% экрана === */
  height: 50vh; /* Используем viewport height */
  max-height: 300px; /* Опционально: Макс высота, если 50vh слишком много */
  min-height: 150px; /* Опционально: Мин высота */
  overflow: hidden; /* ОБЯЗАТЕЛЬНО */
  position: relative;
  /* === ИЗМЕНЕНИЕ: Предотвращаем стандартный скролл === */
  touch-action: pan-y; /* Разрешаем ТОЛЬКО вертикальный свайп внутри этого блока */
  cursor: grab; /* Показываем курсор для перетаскивания на десктопе */
}
.swipe-area:active { cursor: grabbing; }

.facts-wrapper {
  display: flex;
  flex-direction: column;
  /* Высота wrapper должна быть (100% * количество_карточек) */
  /* но так как карточки занимают 100% высоты swipe-area, можно просто 100% */
  height: 100%;
  /* Transition управляется через :style */
}

.fact-card {
  flex-shrink: 0;
  height: 100%; /* Занимает 100% высоты swipe-area */
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px; /* Увеличим отступы внутри карточки */
  box-sizing: border-box;
  color: var(--tg-theme-text-color);
  /* === ИЗМЕНЕНИЕ: Стили для вида "объекта" === */
  background-color: var(--tg-theme-bg-color); /* Фон самой карточки, чуть другой */
  border-bottom: 1px solid var(--tg-theme-hint-color); /* Разделитель снизу */
}
/* Убираем рамку у последней карточки */
.fact-card:last-child { border-bottom: none; }

.fact-card p { margin: 0; font-size: 0.95em; line-height: 1.6; }

.pagination { display: flex; justify-content: center; align-items: center; padding: 12px 0; }
.dot { height: 8px; width: 8px; background-color: var(--tg-theme-hint-color); border-radius: 50%; display: inline-block; margin: 0 5px; cursor: pointer; transition: background-color 0.3s ease; }
.dot.active { background-color: var(--tg-theme-button-color); }
</style>
