<template>
  <div class="facts-carousel-horizontal card">
    <!-- Верхняя часть: Заголовок и Пагинация/Таймер -->
    <div class="carousel-header">
      <h2>💡 Знаете ли вы?</h2>
      <!-- Пагинация точками теперь здесь для удобства -->
      <div class="pagination">
        <span
          v-for="(fact, index) in facts"
          :key="`dot-${fact.id}`"
          class="dot"
          :class="{ active: index === currentIndex }"
          @click="goToFact(index)"
        ></span>
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
      @wheel.passive.stop="handleWheel" <!-- Добавим обработку колеса для десктопа -->
    >
      <!-- Обертка для всех карточек -->
      <div class="facts-wrapper">
        <!-- Карточки фактов -->
        <div
          v-for="(fact, index) in facts"
          :key="fact.id"
          :id="`fact-card-${index}`" <!-- Добавляем ID для scrollTo -->
          class="fact-card"
        >
          <p>{{ fact.text }}</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

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

// --- Методы навигации и таймера ---
const goToFact = async (index) => {
  const newIndex = Math.max(0, Math.min(index, facts.value.length - 1));
  currentIndex.value = newIndex; // Обновляем индекс для пагинации и логики

  // Прокручиваем контейнер к выбранной карточке
  if (swipeAreaRef.value) {
    // Ждем следующего тика, чтобы DOM обновился (если карточки создаются динамически)
    await nextTick();
    const targetCard = swipeAreaRef.value.querySelector(`#fact-card-${newIndex}`);
    if (targetCard) {
        // Вычисляем позицию для центрирования карточки (или выравнивания по левому краю с учетом паддинга)
        const container = swipeAreaRef.value;
        const containerPaddingLeft = parseFloat(getComputedStyle(container).paddingLeft) || 0;
        // Считаем позицию левого края карточки относительно контейнера + половина ширины контейнера - половина ширины карточки для центрирования
        // Или проще - используем scrollIntoView с опциями, если поддерживается хорошо
        // targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); // 'center' может не везде работать

        // Более надежный способ - scrollLeft
        const scrollLeftTarget = targetCard.offsetLeft - container.offsetLeft - containerPaddingLeft; // Выравнивание по левому краю (с учетом паддинга)
        // Для центрирования:
        // const scrollLeftTarget = targetCard.offsetLeft - container.offsetLeft - (container.offsetWidth / 2) + (targetCard.offsetWidth / 2);

        container.scrollTo({
          left: scrollLeftTarget,
          behavior: 'smooth' // Плавная прокрутка
        });
        console.log(`[Carousel] Scrolling to index ${newIndex}, target scrollLeft: ${scrollLeftTarget}`);
    } else {
        console.warn(`[Carousel] Target card #fact-card-${newIndex} not found for scrolling.`);
    }
  }
  resetAutoAdvanceTimer(); // Перезапускаем таймер при любом программном переходе
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
  // Можно добавить live-смещение здесь, но scroll-snap должен справляться
};

const handleTouchEnd = () => {
  if (!isSwiping.value) return;
  isSwiping.value = false;

  const deltaX = touchStartX.value - touchCurrentX.value; // Положительный -> свайп влево
  console.log(`[CarouselSwipe] TouchEnd. Delta X: ${deltaX}`);

  if (Math.abs(deltaX) > swipeThreshold) {
    if (deltaX > 0) { // Свайп влево
      console.log('[CarouselSwipe] Trigger NEXT fact');
      nextFact();
    } else { // Свайп вправо
      console.log('[CarouselSwipe] Trigger PREV fact');
      prevFact();
    }
  } else {
    console.log('[CarouselSwipe] Swipe too short or tap, restarting timer.');
    resetAutoAdvanceTimer(); // Перезапускаем если свайп был коротким
  }
  touchStartX.value = 0;
  touchCurrentX.value = 0;
};

// --- Обработчик колеса мыши (Wheel) для десктопа ---
const handleWheel = (event) => {
    // Предотвращаем стандартный скролл страницы, если крутим над каруселью
    // и есть горизонтальная прокрутка в карусели
    const container = swipeAreaRef.value;
    if (container && container.scrollWidth > container.clientWidth) {
        // event.preventDefault(); // Может быть слишком агрессивно, мешает вертикальному скроллу страницы
        event.stopPropagation(); // Останавливаем всплытие

        // Плавно прокручиваем карусель
        container.scrollBy({
            left: event.deltaY > 0 ? 150 : -150, // Прокрутка на 150px влево/вправо
            behavior: 'smooth'
        });

        // Перезапускаем таймер при скролле колесом
        // Делаем это с небольшой задержкой, чтобы не перезапускать на каждый микро-шаг колеса
        if (!isWheeling.value) {
             isWheeling.value = true;
             clearInterval(timerId.value); // Останавливаем таймер
             setTimeout(() => {
                resetAutoAdvanceTimer();
                isWheeling.value = false;
                console.log('[CarouselWheel] Restarting timer after wheel scroll.');
             }, 300); // Задержка 300 мс
        }
    }
};


// --- Хуки жизненного цикла ---
onMounted(() => {
  startAutoAdvanceTimer();
});

onUnmounted(() => {
  clearInterval(timerId.value);
});

</script>

<style scoped>
.facts-carousel-horizontal {
  padding: 0;
  overflow: hidden; /* Важно */
  position: relative;
  background-color: var(--tg-theme-secondary-bg-color);
  border-radius: 8px;
  /* margin-top: 20px; */
}

.carousel-header {
  padding: 15px 15px 5px 15px; /* Уменьшил нижний паддинг */
  position: relative; /* Не sticky */
  background-color: var(--tg-theme-secondary-bg-color);
  z-index: 10;
  /* border-bottom: 1px solid var(--tg-theme-hint-color); -- Убрал границу здесь */
}
.carousel-header h2 {
  margin: 0 0 10px 0;
  font-size: 1.1em;
  text-align: center;
  color: var(--tg-theme-text-color);
}

/* Перенес пагинацию в хедер */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 10px; /* Отступ под точками */
}
.dot {
  height: 7px; width: 7px; /* Чуть меньше */
  background-color: var(--tg-theme-hint-color);
  border-radius: 50%; display: inline-block; margin: 0 4px; /* Ближе друг к другу */
  cursor: pointer; transition: background-color 0.3s ease, transform 0.2s ease; /* Добавил transform */
}
.dot:hover { transform: scale(1.2); }
.dot.active { background-color: var(--tg-theme-button-color); }

.progress-bar-container {
  width: 100%; height: 3px;
  background-color: var(--tg-theme-hint-color);
  border-radius: 1.5px; overflow: hidden;
  margin-top: 5px; /* Небольшой отступ от пагинации */
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

/* === Контейнер для свайпа и скролла === */
.swipe-area {
  display: flex; /* Нужно для flex-элементов внутри */
  overflow-x: auto;  /* Горизонтальный скролл */
  overflow-y: hidden; /* Запрет вертикального скролла */
  position: relative;
  padding: 15px 0; /* Добавил вертикальный отступ для воздуха */
  /* === Scroll Snap === */
  scroll-snap-type: x mandatory; /* Привязка по горизонтали, обязательная */
  /* === Поведение скролла === */
  scroll-behavior: smooth; /* Для плавной программной прокрутки */
  /* === Отключение стандартных скроллбаров === */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none;  /* IE/Edge */
  /* === Для тач устройств === */
  -webkit-overflow-scrolling: touch; /* Плавность на iOS */
  touch-action: pan-x; /* Разрешаем ТОЛЬКО горизонтальный свайп браузеру */
}
.swipe-area::-webkit-scrollbar {
  display: none; /* WebKit/Blink */
}

/* === Обертка для карточек === */
.facts-wrapper {
  display: flex; /* Карточки в ряд */
  flex-direction: row;
  /* === Отступы для "подглядывания" === */
  /* Добавляем паддинг слева и справа, чтобы первая и последняя карточка не прилипали к краям */
  /* Значение должно быть таким, чтобы было видно часть соседней карточки */
  padding-left: calc((100% - var(--card-width-percent, 80%)) / 2);
  padding-right: calc((100% - var(--card-width-percent, 80%)) / 2);
  /* Плюс небольшой отступ, если нужно больше "воздуха" */
  /* padding-left: calc((100% - 80%) / 2 + 10px); */
  /* padding-right: calc((100% - 80%) / 2 + 10px); */
}

/* === Сама карточка факта === */
.fact-card {
  flex-shrink: 0; /* ОБЯЗАТЕЛЬНО: предотвращает сжатие карточек */
  width: var(--card-width-percent, 80%); /* Ширина карточки в % от контейнера */
  /* height: 100px; -- Убрал фиксированную высоту, пусть определяется контентом */
  min-height: 80px; /* Минимальная высота для читаемости */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 15px; /* Внутренние отступы */
  box-sizing: border-box;
  color: var(--tg-theme-text-color);
  background-color: var(--tg-theme-bg-color); /* Фон чуть отличается от фона контейнера */
  border-radius: 8px; /* Скругляем углы */
  margin: 0 5px; /* Небольшой отступ МЕЖДУ карточками */
  /* === Scroll Snap === */
  scroll-snap-align: center; /* Привязка карточки к ЦЕНТРУ контейнера */
  /* Или start, если хотите привязку к левому краю */
  /* scroll-snap-align: start; */
}

.fact-card p {
  margin: 0;
  font-size: 0.9em; /* Чуть меньше */
  line-height: 1.5;
}

/* Переопределение --card-width-percent для разных экранов (опционально) */
/* @media (max-width: 600px) {
  .facts-wrapper {
    --card-width-percent: 85%;
  }
} */
</style>
