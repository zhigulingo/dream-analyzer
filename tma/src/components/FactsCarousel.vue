<template>
  <!--
    Правка размеров карусели:
    - Убираем растягивание на всю ширину (full-bleed) и сохраняем левый отступ как у остальных секций
    - Убираем только правый отступ за счёт отрицательного margin-right, чтобы следующая карточка чуть выглядывала
  -->
  <section class="carousel-root relative -mr-4 sm:-mr-6 md:-mr-8 mb-8">
    <Swiper
      :modules="modules"
      :spaceBetween="gapSize"
      slides-per-view="auto"
      :centeredSlides="false"
      :autoplay="autoplay"
      :pagination="pagination"
      :keyboard="{ enabled: true }"
      :a11y="{ enabled: true }"
      :observer="true"
      :observe-parents="true"
      :watch-overflow="true"
      @init="onSwiperInit"
      :style="{ height: maxCardHeight + 'px' }"
      class="w-full"
    >
      <SwiperSlide
        v-for="fact in facts"
        :key="fact.id"
        ref="cardRefs"
        class="carousel-card rounded-xl overflow-hidden bg-gradient-to-br from-[#6A4DFF] to-[#9A3CFF] text-white p-8 flex flex-col justify-between will-change-transform"
        :class="slideWidthClass"
        :style="{ height: maxCardHeight + 'px' }"
      >
        <div class="mb-4">
          <Badge>{{ fact.type }}</Badge>
        </div>
        <p class="text-lg leading-tight">{{ fact.text }}</p>
      </SwiperSlide>
    </Swiper>
    <!-- Пагинация вынесена за пределы контейнера Swiper, чтобы гарантированно отображаться ниже карточек -->
    <div class="facts-pagination mt-4"></div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, onBeforeUnmount } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, Pagination, A11y, Keyboard } from 'swiper/modules'
import Badge from '@/components/Badge.vue'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/autoplay'

const modules = [Autoplay, Pagination, A11y, Keyboard]
const cardRefs = ref([])
const maxCardHeight = ref(224)
const gapSize = 16
const swiperRef = ref(null)

const autoplay = {
  delay: 5000,
  disableOnInteraction: false,
}

const pagination = { clickable: true, el: '.facts-pagination', dynamicBullets: true }

// Ширина слайда: меньше контейнера на "peek" и gap, чтобы следующая карточка выглядывала
// Используем дробные значения видимых слайдов как альтернатива calc, но сохраняем peek на правом краю контейнера
const slideWidthClass = computed(() => 'w-[82%] sm:w-[78%] md:w-[72%]')

const facts = ref([
  { id: 1, type: 'Факт', text: 'Большинство снов забываются в течение первых 5-10 минут после пробуждения.' },
  { id: 2, type: 'Символ', text: 'Полет во сне часто связывают с ощущением свободы или желанием убежать от проблем.' },
  { id: 3, type: 'Факт', text: 'Слепые от рождения люди видят сны, используя другие чувства: слух, обоняние, осязание.' },
  { id: 4, type: 'Миф', text: 'Миф: люди снятся только черно-белыми. На самом деле 80% людей видят цветные сны.' },
  { id: 5, type: 'Символ', text: 'Вода во сне часто символизирует эмоции, подсознание и внутренние переживания.' },
  { id: 6, type: 'Факт', text: 'Люди могут учиться осознанным сновидениям - контролю над своими снами.' },
  { id: 7, type: 'Миф', text: 'Миф: сны длятся часами. Большинство снов длятся всего 2-3 секунды.' },
  { id: 8, type: 'Символ', text: 'Падение во сне обычно отражает чувство потери контроля в жизни.' },
  { id: 9, type: 'Факт', text: 'Во время БДГ-сна (фаза быстрого сна) мозг активен почти как в бодрствующем состоянии.' },
  { id: 10, type: 'Символ', text: 'Дом во сне часто отражает ваше внутреннее "Я" и чувство безопасности.' },
  { id: 11, type: 'Факт', text: 'Люди чаще запоминают кошмары, чем обычные сны, из-за сильных эмоций.' },
  { id: 12, type: 'Миф', text: 'Миф: во сне нельзя умереть. На самом деле многие люди видят сны о смерти и просыпаются.' },
  { id: 13, type: 'Символ', text: 'Животные во сне обычно символизируют инстинкты, природные порывы и скрытые стороны личности.' }
])

const calculateMaxHeight = () => {
  nextTick(() => {
    if (cardRefs.value.length > 0) {
      const heights = cardRefs.value.map(card => card?.$el?.offsetHeight || 224)
      maxCardHeight.value = Math.max(...heights, 224)
    }
  })
}

onMounted(() => {
  calculateMaxHeight()
  window.addEventListener('resize', calculateMaxHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', calculateMaxHeight)
  if (swiperRef.value) {
    window.removeEventListener('load', swiperRef.value.__updateHandler || (()=>{}))
  }
})

const onSwiperInit = (swiper) => {
  swiperRef.value = swiper
  const update = () => swiper.update()
  swiper.__updateHandler = update
  // Обновить после рендера и загрузки шрифтов/ресурсов, чтобы корректно учесть ширины слайдов
  requestAnimationFrame(update)
  setTimeout(update, 0)
  window.addEventListener('load', update)
}
</script>

<style scoped>
.carousel-root {
  /* amount of next-card preview and inter-slide gap */
  --peek: 48px;
  --gap: 16px; /* must match gapSize */
}

@media (min-width: 640px) {
  .carousel-root { --peek: 56px; }
}

@media (min-width: 768px) {
  .carousel-root { --peek: 64px; }
}

.facts-pagination {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 10px !important;
  width: 100% !important;
}

:deep(.facts-pagination .swiper-pagination-bullet) {
  background: rgba(255, 255, 255, 0.6) !important;
  opacity: 1 !important;
  width: 12px !important;
  height: 12px !important;
  border-radius: 50% !important;
  transition: transform 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease !important;
  cursor: pointer !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
}

:deep(.facts-pagination .swiper-pagination-bullet-active) {
  background: white !important;
  transform: scale(1.25) !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4) !important;
}

/* Сгладить прокрутку/смещение карточек */
:deep(.swiper) {
  scroll-behavior: smooth;
}

:deep(.swiper-wrapper) {
  transition-timing-function: ease-in-out !important;
}
</style>