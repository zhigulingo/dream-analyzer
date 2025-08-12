<template>
  <!-- Полноэкранная по краям (full-bleed) дорожка, без внутренних паддингов -->
  <section class="relative -mx-4 sm:-mx-6 md:-mx-8 mb-0">
    <Swiper
      :modules="modules"
      slides-per-view="auto"
      :spaceBetween="gapSize"
      :centeredSlides="true"
      :centeredSlidesBounds="true"
      :autoplay="autoplay"
      :keyboard="{ enabled: true }"
      :a11y="{ enabled: true }"
      :observer="true"
      :observe-parents="true"
      :watch-overflow="true"
      :speed="650"
      @init="onInit"
      class="w-screen"
      :style="{ height: maxCardHeight + 'px' }"
    >
      <SwiperSlide
        v-for="(fact, idx) in facts"
        :key="fact.id"
        ref="cardRefs"
        class="rounded-xl overflow-hidden bg-gradient-to-br from-[#6A4DFF] to-[#9A3CFF] text-white p-8 flex flex-col justify-between will-change-transform w-auto flex-shrink-0"
        :style="{ height: maxCardHeight + 'px', width: slideWidthPx + 'px', marginLeft: idx === 0 ? edgeOffset + 'px' : undefined, marginRight: idx === facts.length - 1 ? edgeOffset + 'px' : undefined }"
      >
        <div class="mb-4">
          <Badge>{{ fact.type }}</Badge>
        </div>
        <p class="text-lg leading-tight">{{ fact.text }}</p>
      </SwiperSlide>
    </Swiper>
  </section>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { A11y, Keyboard, Autoplay } from 'swiper/modules'
import Badge from '@/components/Badge.vue'
import 'swiper/css'
import 'swiper/css/autoplay'

const modules = [A11y, Keyboard, Autoplay]
const autoplay = { delay: 5000, disableOnInteraction: false }
// Вдвое меньший горизонтальный отступ между карточками
const gapSize = 8

const cardRefs = ref<any[]>([])
const maxCardHeight = ref(224)
const swiperInstance = ref<any>(null)
const slideWidthPx = ref<number>(Math.round(window.innerWidth * 0.86))
const edgeOffset = ref<number>(Math.max(0, Math.round((window.innerWidth - slideWidthPx.value) / 2)))

const facts = ref([
  { id: 1, type: 'Факт', text: 'Большинство снов забываются в течение первых 5-10 минут после пробуждения.' },
  { id: 2, type: 'Символ', text: 'Полет во сне часто связывают с ощущением свободы или желанием убежать от проблем.' },
  { id: 3, type: 'Факт', text: 'Слепые от рождения люди видят сны, используя другие чувства: слух, обоняние, осязание.' },
  { id: 4, type: 'Миф', text: 'Миф: люди снятся только черно-белыми. На самом деле 80% людей видят цветные сны.' },
  { id: 5, type: 'Символ', text: 'Вода во сне часто символизирует эмоции, подсознание и внутренние переживания.' },
  { id: 6, type: 'Факт', text: 'Люди могут учиться осознанным сновидениям - контролю над своими снами.' },
  { id: 7, type: 'Миф', text: 'Миф: сны длятся часами. Большинство снов длятся всего 2-3 секунды.' },
  { id: 8, type: 'Символ', text: 'Падение во сне обычно отражает чувство потери контроля в жизни.' },
  { id: 9, type: 'Факт', text: 'Во время БДГ-сна мозг активен почти как в бодрствующем состоянии.' },
  { id: 10, type: 'Символ', text: 'Дом во сне часто отражает ваше внутреннее "Я" и чувство безопасности.' },
  { id: 11, type: 'Факт', text: 'Люди чаще запоминают кошмары из-за сильных эмоций.' },
  { id: 12, type: 'Миф', text: 'Миф: во сне нельзя умереть. На деле многие видят сны о смерти.' },
  { id: 13, type: 'Символ', text: 'Животные во сне символизируют инстинкты и скрытые стороны личности.' }
])

const calcMaxHeight = () => {
  nextTick(() => {
    if (cardRefs.value.length) {
      const heights = cardRefs.value.map(c => c?.$el?.offsetHeight || 224)
      maxCardHeight.value = Math.max(224, ...heights)
    }
  })
}

const onInit = (swiper: any) => {
  swiperInstance.value = swiper
  calcMaxHeight()
  // Центрируем текущий слайд сразу после инициализации
  requestAnimationFrame(() => swiper.slideTo(swiper.activeIndex, 0, false))
}

// Подгоняем ширину карточки под ширину карточки пользователя
const measureUserCardWidth = () => {
  try {
    const firstBlock = document.querySelector('main section.account-block');
    const userCard = firstBlock?.querySelector('article') as HTMLElement | null;
    const w = userCard?.getBoundingClientRect().width;
    if (w && w > 0) {
      slideWidthPx.value = Math.round(w);
      edgeOffset.value = Math.max(0, Math.round((window.innerWidth - slideWidthPx.value) / 2));
    }
  } catch {}
}

onMounted(() => {
  calcMaxHeight()
  measureUserCardWidth()
  window.addEventListener('resize', calcMaxHeight)
  window.addEventListener('resize', measureUserCardWidth)
  window.addEventListener('resize', () => {
    if (swiperInstance.value) {
      swiperInstance.value.update()
      swiperInstance.value.slideTo(swiperInstance.value.activeIndex, 0, false)
    }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', calcMaxHeight)
  window.removeEventListener('resize', measureUserCardWidth)
})
</script>

<style scoped>
/* Специальных стилей немного: всё через утилитарные классы */
:deep(.swiper) { margin-bottom: 0 !important; padding-bottom: 0 !important; }
:deep(.swiper-wrapper) { margin-bottom: 0 !important; transition-timing-function: ease-in-out !important; }
</style>


