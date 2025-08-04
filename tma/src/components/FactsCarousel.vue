<template>
<section class="relative h-[20vh] md:h-[14rem] -mx-4 sm:-mx-6 md:-mx-8">
  <Swiper
    :spaceBetween="16"
    slides-per-view="auto"
    class="h-full pl-4 sm:pl-6 md:pl-8"
  >
    <SwiperSlide
      v-for="fact in facts"
      :key="fact.id"
      class="carousel-card w-[80%] max-w-72r rounded-[3.75rem] overflow-hidden bg-gradient-to-br from-[#6A4DFF] to-[#9A3CFF] text-white p-8 flex flex-col justify-between"
    >
      <span class="bg-white/20 rounded-full px-3 py-1 text-sm w-fit">{{ fact.type }}</span>
      <p class="mt-4 text-lg leading-tight">{{ fact.text }}</p>
    </SwiperSlide>
    <template #pagination>
      <div class="absolute bottom-2 left-1/2 -translate-x-1/2 swiper-pagination"></div>
    </template>
  </Swiper>
</section>
</template>

<script setup>
import { ref } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css'
import 'swiper/css/pagination'

const facts = ref([
  { id: 1, type: 'Факт', text: "Большинство снов забываются в течение первых 5-10 минут после пробуждения." },
  { id: 2, type: 'Символизм', text: "Символ 'Полет во сне' часто связывают с ощущением свободы, контроля или, наоборот, с желанием убежать от проблем." },
  { id: 3, type: 'Исследование', text: "Слепые от рождения люди видят сны, используя другие чувства: слух, обоняние, осязание и эмоции." },
  { id: 4, type: 'Символизм', text: "Символ 'Зубы' (выпадение/крошение) может указывать на чувство бессилия, тревогу о внешности или страх потери контроля." },
  { id: 5, type: 'Физиология', text: "Во время REM-фазы сна (когда мы видим сны) наши мышцы парализованы, чтобы мы не повторяли движения из сна." }
])
</script>