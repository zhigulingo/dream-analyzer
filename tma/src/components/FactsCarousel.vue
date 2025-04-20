<template>
  <div class="facts-carousel card">
    <h2>💡 Знаете ли вы?</h2>
    <div class="carousel-content">
      <div class="fact-text">
        <!-- Используем key для возможной анимации смены текста -->
        <p :key="currentIndex">{{ currentFactText }}</p>
      </div>

      <!-- Прогресс-бар таймера -->
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ animationDuration: `${rotationInterval}ms` }" :key="progressKey"></div>
      </div>

      <!-- Пагинация (точки) -->
      <div class="pagination">
        <span
          v-for="(fact, index) in facts"
          :key="fact.id"
          class="dot"
          :class="{ active: index === currentIndex }"
          @click="goToFact(index)"
        ></span>
      </div>

      <!-- Кнопки навигации (опционально, но удобно) -->
      <!--
      <div class="navigation-buttons">
        <button @click="prevFact" class="nav-button"><</button>
        <button @click="nextFact" class="nav-button">></button>
      </div>
      -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

// --- Данные ---
// (В реальном приложении это лучше получать с сервера или из стора)
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
const currentIndex = ref(0);        // Индекс текущего факта
const rotationInterval = ref(7000); // Интервал смены в миллисекундах (7 секунд)
const timerId = ref(null);          // ID таймера для setInterval
const progressKey = ref(0);         // Ключ для перезапуска анимации прогресс-бара

// --- Вычисляемые свойства ---
const currentFactText = computed(() => {
  return facts.value[currentIndex.value]?.text ?? 'Загрузка факта...';
});

// --- Методы ---
// Переход к конкретному факту по индексу
const goToFact = (index) => {
  if (index >= 0 && index < facts.value.length) {
    currentIndex.value = index;
    resetTimer(); // Сбрасываем таймер при ручном переключении
  }
};

// Переход к следующему факту
const nextFact = () => {
  const nextIndex = (currentIndex.value + 1) % facts.value.length;
  goToFact(nextIndex);
};

// Переход к предыдущему факту (реализует "листать влево")
const prevFact = () => {
  const prevIndex = (currentIndex.value - 1 + facts.value.length) % facts.value.length;
  goToFact(prevIndex);
};

// Запуск таймера авто-прокрутки
const startTimer = () => {
  // Очищаем предыдущий таймер, если он был
  clearInterval(timerId.value);
  // Увеличиваем ключ, чтобы CSS-анимация прогресс-бара перезапустилась
  progressKey.value++;
  // Запускаем новый таймер
  timerId.value = setInterval(() => {
    nextFact(); // Автоматически переключаем на следующий слайд
  }, rotationInterval.value);
   console.log(`[FactsCarousel] Timer started for ${rotationInterval.value}ms. Key: ${progressKey.value}`);
};

// Сброс таймера (остановка и запуск заново)
const resetTimer = () => {
  console.log('[FactsCarousel] Resetting timer...');
  startTimer();
};

// --- Хуки жизненного цикла ---
onMounted(() => {
  startTimer(); // Запускаем таймер при монтировании компонента
});

onUnmounted(() => {
  clearInterval(timerId.value); // Обязательно очищаем таймер при размонтировании
  console.log('[FactsCarousel] Timer cleared on unmount.');
});

</script>

<style scoped>
.facts-carousel {
  padding: 15px;
  margin-top: 20px; /* Отступ сверху */
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.facts-carousel h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.1em;
  text-align: center;
  color: var(--tg-theme-text-color);
}

.carousel-content {
  position: relative; /* Для позиционирования прогресс-бара */
  min-height: 100px; /* Минимальная высота для текста */
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fact-text {
  text-align: center;
  margin-bottom: 15px; /* Отступ до прогресс-бара */
  font-size: 0.95em;
  line-height: 1.5;
  min-height: 60px; /* Примерная высота для 3-4 строк текста */
  color: var(--tg-theme-text-color);
}

.progress-bar-container {
  width: 80%; /* Ширина прогресс-бара */
  height: 4px;
  background-color: var(--tg-theme-hint-color); /* Фон полоски */
  border-radius: 2px;
  overflow: hidden; /* Скрыть выходящую за пределы анимацию */
  margin-bottom: 15px; /* Отступ до пагинации */
}

.progress-bar {
  height: 100%;
  width: 100%; /* Заполняем сразу */
  background-color: var(--tg-theme-button-color); /* Цвет заполнения */
  border-radius: 2px;
  transform: translateX(-100%); /* Начинаем за левым краем */
  animation-name: progressAnimation;
  animation-timing-function: linear;
  animation-fill-mode: forwards; /* Остановить в конце */
}

@keyframes progressAnimation {
  from { transform: translateX(-100%); }
  to { transform: translateX(0%); }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
}

.dot {
  height: 8px;
  width: 8px;
  background-color: var(--tg-theme-hint-color); /* Цвет неактивной точки */
  border-radius: 50%;
  display: inline-block;
  margin: 0 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.dot.active {
  background-color: var(--tg-theme-button-color); /* Цвет активной точки */
}

/* Стили для опциональных кнопок навигации */
.navigation-buttons {
  margin-top: 10px;
}

.nav-button {
  background: none;
  border: 1px solid var(--tg-theme-hint-color);
  color: var(--tg-theme-text-color);
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin: 0 5px;
}
.nav-button:hover {
    background-color: rgba(128, 128, 128, 0.1);
}
</style>
