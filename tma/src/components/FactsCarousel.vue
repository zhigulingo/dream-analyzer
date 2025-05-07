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
      ref="swipeAreaRef"
      @touchstart.passive.stop="handleTouchStart"  <!-- Добавлен .stop -->
      @touchmove.passive.stop="handleTouchMove"    <!-- Добавлен .stop -->
      @touchend.stop="handleTouchEnd"              <!-- Добавлен .stop -->
    >
      <!-- Обертка для всех карточек -->
      <div class="facts-wrapper" :style="wrapperStyle">
        <!-- Карточки фактов -->
        <div
          v-for="(fact) in facts" <!-- Убрал index, если не используется в v-for -->
          :key="fact.id"
          class="fact-card"
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
const autoAdvanceInterval = ref(8000); // мс
const timerId = ref(null);
const progressKey = ref(0); // Для перезапуска анимации прогресс-бара

// --- Состояние для свайпа ---
const swipeAreaRef = ref(null); // Реф для DOM-элемента
const touchStartY = ref(0);
const touchCurrentY = ref(0); // Текущая позиция для возможного live-смещения
const isSwiping = ref(false); // Флаг, что свайп активен
const swipeThreshold = 50; // Порог свайпа в пикселях для смены слайда

// --- Вычисляемые свойства ---
const wrapperStyle = computed(() => {
  let translateY = currentIndex.value * 100; // Базовое смещение в %

  // Если идет активный свайп, можно добавить live-смещение (опционально, делает свайп "резиновым")
  // Это усложняет, но может улучшить UX. Пока оставим без этого для простоты.
  // if (isSwiping.value && swipeAreaRef.value) {
  //   const swipeAreaHeight = swipeAreaRef.value.clientHeight;
  //   if (swipeAreaHeight > 0) {
  //      const dragOffset = touchStartY.value - touchCurrentY.value;
  //      const dragOffsetPercent = (dragOffset / swipeAreaHeight) * 100;
  //      translateY += dragOffsetPercent; // Добавляем смещение от перетаскивания
  //   }
  // }

  return {
    transform: `translateY(-${translateY}%)`,
    // Анимация применяется только при смене индекса, а не во время "перетаскивания"
    transition: isSwiping.value ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)',
  };
});


// --- Методы навигации и таймера ---
const goToFact = (index) => {
  const newIndex = Math.max(0, Math.min(index, facts.value.length - 1)); // Ограничиваем индекс
  if (newIndex !== currentIndex.value) {
    currentIndex.value = newIndex;
  }
  resetAutoAdvanceTimer(); // Перезапускаем таймер при любом взаимодействии
};

const nextFact = () => {
  goToFact(currentIndex.value + 1 < facts.value.length ? currentIndex.value + 1 : 0); // Циклический переход к первому
};

const prevFact = () => {
  goToFact(currentIndex.value - 1 >= 0 ? currentIndex.value - 1 : facts.value.length - 1); // Циклический переход к последнему
};

const startAutoAdvanceTimer = () => {
  clearInterval(timerId.value); // Очищаем предыдущий таймер
  progressKey.value++;        // Обновляем ключ для перезапуска CSS-анимации прогресс-бара
  timerId.value = setInterval(nextFact, autoAdvanceInterval.value);
};

const resetAutoAdvanceTimer = () => {
  startAutoAdvanceTimer();
};

// --- Обработчики свайпа ---
const handleTouchStart = (event) => {
  // event.stopPropagation() вызывается Vue из-за модификатора .stop
  if (event.touches.length === 1) {
    touchStartY.value = event.touches[0].clientY;
    touchCurrentY.value = touchStartY.value; // Инициализируем текущую позицию
    isSwiping.value = true; // Начинаем свайп (для отключения transition)
    clearInterval(timerId.value); // Пауза таймера во время свайпа
    console.log(`[CarouselSwipe] TouchStart Y: ${touchStartY.value}`);
  }
};

const handleTouchMove = (event) => {
  // event.stopPropagation() вызывается Vue из-за модификатора .stop
  if (!isSwiping.value || event.touches.length !== 1) return;
  touchCurrentY.value = event.touches[0].clientY; // Обновляем текущую позицию
  // Для live-смещения (если решите добавить):
  // const deltaY = touchStartY.value - touchCurrentY.value;
  // swipeAreaRef.value.querySelector('.facts-wrapper').style.transform = `translateY(calc(-${currentIndex.value * 100}% - ${deltaY}px))`;
  console.log(`[CarouselSwipe] TouchMove Y: ${touchCurrentY.value}`);
};

const handleTouchEnd = (event) => {
  // event.stopPropagation() вызывается Vue из-за модификатора .stop
  if (!isSwiping.value) return;

  const deltaY = touchStartY.value - touchCurrentY.value; // Положительный -> свайп вверх
  console.log(`[CarouselSwipe] TouchEnd. Delta Y: ${deltaY}`);

  isSwiping.value = false; // Важно: заканчиваем свайп ДО смены индекса, чтобы transition сработал

  if (Math.abs(deltaY) > swipeThreshold) {
    if (deltaY > 0) { // Свайп вверх (пользователь тянет контент снизу вверх)
      console.log('[CarouselSwipe] Trigger NEXT fact');
      nextFact(); // Показываем следующий факт (индекс увеличится)
    } else { // Свайп вниз (пользователь тянет контент сверху вниз)
      console.log('[CarouselSwipe] Trigger PREV fact');
      prevFact(); // Показываем предыдущий факт (индекс уменьшится)
    }
  } else {
    // Свайп слишком короткий, или это был просто тап
    console.log('[CarouselSwipe] Swipe too short or tap, restarting timer.');
    resetAutoAdvanceTimer(); // Просто перезапускаем таймер
  }

  // Сбрасываем координаты после обработки
  touchStartY.value = 0;
  touchCurrentY.value = 0;
};


// --- Хуки жизненного цикла ---
onMounted(() => {
  startAutoAdvanceTimer();
  // Можно добавить слушатели для drag на мыши для десктопа, если нужно
});

onUnmounted(() => {
  clearInterval(timerId.value);
});

</script>

<style scoped>
.facts-carousel-swipe {
  padding: 0; /* Убираем внутренние отступы у родителя карточки */
  overflow: hidden; /* Важно для обрезки контента */
  position: relative;
  /* margin-top: 20px; -- убрал, т.к. .card уже имеет margin-bottom */
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 8px; /* Уже есть от .card, но можно оставить для явности */
  /* box-shadow: 0 1px 3px rgba(0,0,0,0.1); -- уже есть от .card */
}

.carousel-header {
  padding: 15px 15px 10px 15px;
  position: relative; /* Изменено с sticky на relative, чтобы быть частью потока */
  /* top: 0; left: 0; right: 0; -- не нужно для relative */
  background-color: var(--tg-theme-secondary-bg-color); /* Фон такой же, как у карточки */
  z-index: 10; /* Чтобы быть поверх swipe-area, если будут пересечения */
  border-bottom: 1px solid var(--tg-theme-hint-color); /* Разделитель */
}
.carousel-header h2 {
  margin: 0 0 10px 0;
  font-size: 1.1em; /* Соответствует h2 в PersonalAccount */
  text-align: center;
  color: var(--tg-theme-text-color);
}

.progress-bar-container {
  width: 100%;
  height: 3px;
  background-color: var(--tg-theme-hint-color); /* Более контрастный фон для прогресса */
  border-radius: 1.5px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  width: 100%; /* Анимация будет двигать transform */
  background-color: var(--tg-theme-button-color); /* Яркий цвет для прогресса */
  border-radius: 1.5px;
  transform: translateX(-100%);
  animation-name: progressAnimation;
  animation-timing-function: linear;
  animation-fill-mode: forwards; /* Остается в конечном состоянии */
}
@keyframes progressAnimation {
  from { transform: translateX(-100%); }
  to { transform: translateX(0%); }
}

.swipe-area {
  /* Определяем высоту области свайпа. Можно фиксированную или относительно viewport */
  height: 120px; /* Например, фиксированная высота. Подберите под ваш контент. */
  /* Или, если хотите относительно экрана:
  min-height: 100px;
  max-height: 20vh;
  height: 15vh;
  */
  overflow: hidden; /* ОБЯЗАТЕЛЬНО, чтобы translateY работал корректно */
  position: relative; /* Для позиционирования .facts-wrapper */
  touch-action: pan-y; /* Разрешаем ТОЛЬКО вертикальный свайп внутри этого блока, браузер обработает */
  cursor: grab; /* Визуальная подсказка для десктопа */
}
.swipe-area:active {
  cursor: grabbing;
}

.facts-wrapper {
  display: flex;
  flex-direction: column; /* Факты располагаются вертикально */
  height: 100%; /* Занимает всю высоту swipe-area */
  /* Плавный переход будет применен через JS при необходимости */
}

.fact-card {
  flex-shrink: 0; /* Предотвращает сжатие карточек */
  height: 100%; /* Каждая карточка занимает 100% высоты .swipe-area */
  width: 100%;  /* И 100% ширины */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 15px; /* Отступы внутри карточки */
  box-sizing: border-box;
  color: var(--tg-theme-text-color);
  background-color: var(--tg-theme-secondary-bg-color); /* Фон карточки */
  /* Убрал border-bottom, т.к. карточки перекрывают друг друга через transform */
}

.fact-card p {
  margin: 0;
  font-size: 0.95em; /* Немного меньше основного текста */
  line-height: 1.5;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0; /* Отступы для пагинации */
  border-top: 1px solid var(--tg-theme-hint-color); /* Разделитель */
}
.dot {
  height: 8px;
  width: 8px;
  background-color: var(--tg-theme-hint-color); /* Неактивная точка */
  border-radius: 50%;
  display: inline-block;
  margin: 0 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.dot.active {
  background-color: var(--tg-theme-button-color); /* Активная точка */
}
</style>
