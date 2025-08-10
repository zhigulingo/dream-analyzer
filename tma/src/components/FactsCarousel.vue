<template>
  <section class="relative mb-8 w-full max-w-72r mx-auto px-0">
    <Swiper
      :modules="modules"
      :spaceBetween="12"
      :slides-per-view="1.1"
      :autoplay="{
        delay: 5000,
        disableOnInteraction: false,
      }"
      :pagination="{ clickable: true, el: '.swiper-pagination-custom' }"
      class=""
      :style="{ height: maxCardHeight + 'px' }"
    >
      <SwiperSlide
        v-for="fact in facts"
        :key="fact.id"
        ref="cardRefs"
        class="carousel-card rounded-xl overflow-hidden bg-gradient-to-br from-[#6A4DFF] to-[#9A3CFF] text-white p-8 flex flex-col justify-between"
        :style="{ height: maxCardHeight + 'px' }"
      >
        <div class="mb-4">
          <Badge>{{ fact.type }}</Badge>
        </div>
        <p class="text-lg leading-tight">{{ fact.text }}</p>
      </SwiperSlide>
      <template #pagination>
        <div class="swiper-pagination-custom mt-4 text-center"></div>
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
const maxCardHeight = ref(224)

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
})
</script>

<style scoped>
:deep(.swiper-pagination),
:deep(.swiper-pagination-custom) {
  position: static !important;
  text-align: center;
  margin-top: 1.5rem;
  display: flex !important;
  justify-content: center !important;
  gap: 12px !important;
  z-index: 10 !important;
}

:deep(.swiper-pagination-bullet) {
  background: rgba(255, 255, 255, 0.6) !important;
  opacity: 1 !important;
  width: 12px !important;
  height: 12px !important;
  border-radius: 50% !important;
  transition: all 0.3s ease !important;
  cursor: pointer !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
}

:deep(.swiper-pagination-bullet-active) {
  background: white !important;
  transform: scale(1.3) !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4) !important;
}
</style>