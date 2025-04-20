<template>
  <div class="facts-carousel-swipe card">
    <!-- Верхняя часть: Заголовок и Таймер -->
    <div class="carousel-header">
      <h2>💡 Знаете ли вы?</h2>
      <!-- Прогресс-бар таймера -->
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
      <!-- Обертка для всех карточек, которую будем двигать -->
      <div class="facts-wrapper" :style="wrapperStyle">
        <!-- Рендерим все карточки фактов -->
        <div
          v-for="(fact, index) in facts"
          :key="fact.id"
          class="fact-card"
        >
          <p>{{ fact.text }}</p>
        </div>
      </div>
    </div>

     <!-- Пагинация точками (оставим для индикации) -->
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

// --- Данные фактов (оставляем как есть) ---
const facts = ref([
  { id: 1, text: "Большинство снов забываются в течение первых 5-10 минут после пробуждения." },
  { id: 2, text: "Символ 'Полет во сне' часто связывают с ощущением свободы, контроля или, наоборот, с желанием убежать от проблем." },
  // ... (остальные ваши факты)
  { id: 10, text: "Символ 'Преследование' может отражать избегание какой-то проблемы или неприятной ситуации в реальной жизни." },
]);

// --- Состояние карусели ---
const currentIndex = ref(0);             // Индекс текущей видимой карточки
const autoAdvanceInterval = ref(8000);   // Интервал авто-переключения (8 секунд)
const timerId = ref(null);               // ID таймера для авто-переключения
const progressKey = ref(0);              // Ключ для перезапуска анимации прогресс-бара

// --- Состояние для свайпа ---
const swipeAreaRef = ref(null);         // Ссылка на DOM-элемент для свайпа
const touchStartY = ref(0);             // Начальная координата Y касания
const touchEndY = ref(0);               // Конечная координата Y касания
const isSwiping = ref(false);           // Флаг, что идет процесс свайпа
const swipeThreshold = ref(50);         // Минимальная дистанция свайпа в пикселях для переключения

// --- Вычисляемые свойства ---
// Стиль для обертки карточек, который будет анимировать сдвиг
const wrapperStyle = computed(() => {
  // Сдвигаем обертку вверх на (индекс * высоту одной карточки)
  // Используем % для адаптивности
  return {
    transform: `translateY(-${currentIndex.value * 100}%)`,
    transition: isSwiping.value ? 'none' : 'transform 0.3s ease-out' // Отключаем анимацию во время свайпа
  };
});

// --- Методы ---
// Переход к конкретному факту
const goToFact = (index) => {
  if (index >= 0 && index < facts.value.length) {
    currentIndex.value = index;
    resetAutoAdvanceTimer(); // Сбрасываем таймер при ручном переключении
  }
};

// Переход к следующему факту
const nextFact = () => {
  const nextIndex = (currentIndex.value + 1) % facts.value.length;
  goToFact(nextIndex);
};

// Переход к предыдущему факту
const prevFact = () => {
  const prevIndex = (currentIndex.value - 1 + facts.value.length) % facts.value.length;
  goToFact(prevIndex);
};

// --- Логика таймера авто-переключения ---
const startAutoAdvanceTimer = () => {
  clearInterval(timerId.value); // Очищаем старый таймер
  progressKey.value++;        // Перезапускаем анимацию прогресс-бара
  timerId.value = setInterval(nextFact, autoAdvanceInterval.value);
   console.log(`[FactsCarousel] Auto-advance timer started. Key: ${progressKey.value}`);
};

const resetAutoAdvanceTimer = () => {
   console.log('[FactsCarousel] Resetting auto-advance timer...');
   startAutoAdvanceTimer();
};

// --- Логика обработки свайпа ---
const handleTouchStart = (event) => {
  // Запоминаем только первое касание
  touchStartY.value = event.touches[0].clientY;
  touchEndY.value = 0; // Сбрасываем конечную точку
  isSwiping.value = true; // Начинаем свайп
  clearInterval(timerId.value); // Останавливаем таймер на время свайпа
  console.log(`[FactsCarousel] Touch start at Y: ${touchStartY.value}`);
};

const handleTouchMove = (event) => {
  if (!isSwiping.value) return;
  // Запоминаем текущую позицию пальца
  touchEndY.value = event.touches[0].clientY;
  // Можно добавить визуальное смещение во время свайпа, но пока опустим для простоты
};

const handleTouchEnd = () => {
  if (!isSwiping.value) return;
  isSwiping.value = false; // Завершаем свайп

  // Проверяем, была ли конечная точка записана (т.е. был ли touchmove)
  if (touchEndY.value === 0) {
     console.log('[FactsCarousel] Touch end without move.');
     resetAutoAdvanceTimer(); // Просто перезапускаем таймер, если был только тап
     return;
  }

  const deltaY = touchStartY.value - touchEndY.value; // Положительное значение - свайп вверх
  console.log(`[FactsCarousel] Touch end. Delta Y: ${deltaY}`);

  // Проверяем, достаточна ли дистанция свайпа
  if (Math.abs(deltaY) > swipeThreshold.value) {
    if (deltaY > 0) {
      // Свайп вверх - переходим к следующему факту
      console.log('[FactsCarousel] Swipe UP detected.');
      nextFact();
    } else {
      // Свайп вниз - переходим к предыдущему факту
      console.log('[FactsCarousel] Swipe DOWN detected.');
      prevFact();
    }
  } else {
     console.log('[FactsCarousel] Swipe distance too short.');
     // Если свайп был коротким, просто перезапускаем таймер с текущей карточки
     resetAutoAdvanceTimer();
  }

  // Сбрасываем координаты
  touchStartY.value = 0;
  touchEndY.value = 0;
};

// --- Хуки жизненного цикла ---
onMounted(() => {
  startAutoAdvanceTimer(); // Запускаем авто-переключение при монтировании
});

onUnmounted(() => {
  clearInterval(timerId.value); // Очищаем таймер при размонтировании
  console.log('[FactsCarousel] Auto-advance timer cleared on unmount.');
});

</script>

<style scoped>
.facts-carousel-swipe {
  padding: 0; /* Убираем внутренний отступ у основной карточки */
  overflow: hidden; /* Важно для обрезки карточек */
  position: relative; /* Для позиционирования хедера */
  margin-top: 20px;
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.carousel-header {
  padding: 15px 15px 10px 15px; /* Внутренние отступы для хедера */
  position: sticky; /* Пытаемся прилепить сверху */
  top: 0;
  left: 0;
  right: 0;
  background-color: var(--tg-theme-secondary-bg-color); /* Фон, чтобы перекрывать контент */
  z-index: 10; /* Поверх карточек */
  border-bottom: 1px solid var(--tg-theme-hint-color); /* Разделитель */
}

.carousel-header h2 {
  margin: 0 0 10px 0; /* Убираем верхний отступ, добавляем нижний */
  font-size: 1.1em;
  text-align: center;
  color: var(--tg-theme-text-color);
}

.progress-bar-container {
  width: 100%; /* На всю ширину хедера */
  height: 3px; /* Тоньше */
  background-color: var(--tg-theme-hint-color);
  border-radius: 1.5px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  width: 100%;
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
  height: 150px; /* ЗАДАЙТЕ ЖЕЛАЕМУЮ ВЫСОТУ КАРТОЧКИ ФАКТА */
  overflow: hidden; /* Обязательно для обрезки карточек */
  position: relative; /* Для позиционирования обертки */
  /* Важно для мобильных: указывает браузеру, что мы обрабатываем вертикальный свайп */
  touch-action: pan-y;
}

.facts-wrapper {
  display: flex;
  flex-direction: column; /* Карточки одна под другой */
  height: 100%; /* Занимает всю высоту swipe-area */
  /* transition будет управляться через :style */
}

.fact-card {
  flex-shrink: 0; /* Карточки не должны сжиматься */
  height: 100%; /* Каждая карточка занимает всю высоту swipe-area */
  width: 100%;
  display: flex;
  flex-direction: column; /* Текст по центру вертикально */
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 15px; /* Внутренний отступ карточки */
  box-sizing: border-box; /* padding не увеличивает размер */
  color: var(--tg-theme-text-color);
}

.fact-card p {
    margin: 0; /* Убираем внешние отступы у параграфа */
    font-size: 0.95em;
    line-height: 1.5;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0; /* Отступы для пагинации */
}

.dot {
  height: 8px;
  width: 8px;
  background-color: var(--tg-theme-hint-color);
  border-radius: 50%;
  display: inline-block;
  margin: 0 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.dot.active {
  background-color: var(--tg-theme-button-color);
}
</style>
