<template>
  <!-- Полноэкранная по краям (full-bleed) дорожка, без внутренних паддингов -->
  <section class="relative -mx-4 sm:-mx-6 md:-mx-8 mb-8">
    <Swiper
      :modules="modules"
      slides-per-view="auto"
      :spaceBetween="gapSize"
      :centeredSlides="false"
      :keyboard="{ enabled: true }"
      :a11y="{ enabled: true }"
      :observer="true"
      :observe-parents="true"
      :watch-overflow="true"
      @slideChange="onSlideChange"
      @init="onInit"
      class="w-screen"
      :style="{ height: maxCardHeight + 'px' }"
    >
      <SwiperSlide
        v-for="fact in facts"
        :key="fact.id"
        ref="cardRefs"
        :class="slideWidthClass"
        class="rounded-xl overflow-hidden bg-gradient-to-br from-[#6A4DFF] to-[#9A3CFF] text-white p-8 flex flex-col justify-between will-change-transform"
        :style="{ height: maxCardHeight + 'px' }"
      >
        <div class="mb-4">
          <Badge>{{ fact.type }}</Badge>
        </div>
        <p class="text-lg leading-tight">{{ fact.text }}</p>
      </SwiperSlide>
    </Swiper>

    <!-- Центрированная пагинация с видом «кнопки» как у «Загрузить ещё» -->
    <div class="mt-4 w-full flex justify-center">
      <div class="bg-white/10 rounded-full px-4 py-2 text-sm font-medium text-white flex items-center gap-3">
        <button
          v-for="i in 3"
          :key="i"
          class="w-2.5 h-2.5 rounded-full transition-all"
          :class="currentPage === (i-1) ? 'bg-white scale-110' : 'bg-white/60'"
          @click="goToPage(i-1)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { A11y, Keyboard } from 'swiper/modules'
import Badge from '@/components/Badge.vue'
import 'swiper/css'

const modules = [A11y, Keyboard]
const gapSize = 16

// Карточка по ширине меньше экрана, чтобы слева и справа был «peek» соседних
const slideWidthClass = computed(() => 'w-[86%] sm:w-[82%] md:w-[78%] lg:w-[72%]')

const cardRefs = ref<any[]>([])
const maxCardHeight = ref(224)
const swiperInstance = ref<any>(null)

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

const currentPage = ref(0) // 0..2
const groupSize = computed(() => Math.ceil(facts.value.length / 3))

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
}

const onSlideChange = (swiper: any) => {
  const idx = swiper?.activeIndex || 0
  currentPage.value = Math.min(2, Math.floor(idx / groupSize.value))
}

const goToPage = (page: number) => {
  if (!swiperInstance.value) return
  const target = page * groupSize.value
  swiperInstance.value.slideTo(target, 300)
}

onMounted(() => {
  calcMaxHeight()
  window.addEventListener('resize', calcMaxHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', calcMaxHeight)
})
</script>

<style scoped>
/* Специальных стилей немного: всё через утилитарные классы */
</style>


