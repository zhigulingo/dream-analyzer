<template>
  <section class="relative -mx-4 sm:-mx-6 md:-mx-8 mb-8">
    <Swiper
      :modules="modules"
      :spaceBetween="16"
      slides-per-view="auto"
      :autoplay="{
        delay: 5000,
        disableOnInteraction: false,
      }"
      :pagination="{ clickable: true }"
      class="pl-4 sm:pl-6 md:pl-8"
      :style="{ height: maxCardHeight + 'px' }"
    >
      <SwiperSlide
        v-for="fact in facts"
        :key="fact.id"
        ref="cardRefs"
        class="carousel-card w-[80%] rounded-xl overflow-hidden bg-gradient-to-br from-[#6A4DFF] to-[#9A3CFF] text-white p-8 flex flex-col justify-between"
        :style="{ height: maxCardHeight + 'px' }"
      >
        <div class="mb-4">
          <Badge>{{ fact.type }}</Badge>
        </div>
        <p class="text-lg leading-tight">{{ fact.text }}</p>
      </SwiperSlide>
      <template #pagination>
        <div class="swiper-pagination mt-4"></div>
      </template>
    </Swiper>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, Pagination } from 'swiper/modules'
import Badge from '@/components/Badge.vue'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/autoplay'

const modules = [Autoplay, Pagination]
const cardRefs = ref([])
const maxCardHeight = ref(280)

const facts = ref([
  { id: 1, type: 'Факт', text: 'Большинство снов забываются в течение первых 5-10 минут после пробуждения.' },
  { id: 2, type: 'Символ', text: 'Полет во сне часто связывают с ощущением свободы или желанием убежать от проблем.' },
  { id: 3, type: 'Факт', text: 'Слепые от рождения люди видят сны, используя другие чувства: слух, обоняние, осязание.' },
])

const calculateMaxHeight = () => {
  nextTick(() => {
    if (cardRefs.value.length > 0) {
      const heights = cardRefs.value.map(card => card?.$el?.offsetHeight || 280)
      maxCardHeight.value = Math.max(...heights, 280)
    }
  })
}

onMounted(() => {
  calculateMaxHeight()
})
</script>

<style scoped>
:deep(.swiper-pagination) {
  position: static !important;
  text-align: center;
  margin-top: 1rem;
}

:deep(.swiper-pagination-bullet) {
  background: rgba(255, 255, 255, 0.3) !important;
  opacity: 1 !important;
}

:deep(.swiper-pagination-bullet-active) {
  background: white !important;
}
</style>