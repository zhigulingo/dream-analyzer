<template>
  <section class="relative h-[20vh] md:h-[14rem] -mx-4 sm:-mx-6 md:-mx-8">
    <Swiper
      :modules="modules"
      :spaceBetween="16"
      slides-per-view="auto"
      :autoplay="{
        delay: 5000,
        disableOnInteraction: false,
      }"
      :pagination="{ clickable: true }"
      class="h-full pl-4 sm:pl-6 md:pl-8"
    >
      <SwiperSlide
        v-for="fact in facts"
        :key="fact.id"
        class="carousel-card w-[80%] max-w-72r rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#6A4DFF] to-[#9A3CFF] text-white p-8 flex flex-col justify-between"
      >
        <div class="mb-4">
          <Badge>{{ fact.type }}</Badge>
        </div>
        <p class="text-lg leading-tight">{{ fact.text }}</p>
      </SwiperSlide>
      <template #pagination>
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 swiper-pagination"></div>
      </template>
    </Swiper>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, Pagination } from 'swiper/modules'
import Badge from '@/components/Badge.vue'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/autoplay'

const modules = [Autoplay, Pagination]

const facts = ref([
  { id: 1, type: 'Факт', text: 'Большинство снов забываются в течение первых 5-10 минут после пробуждения.' },
  { id: 2, type: 'Символ', text: 'Полет во сне часто связывают с ощущением свободы или желанием убежать от проблем.' },
  { id: 3, type: 'Факт', text: 'Слепые от рождения люди видят сны, используя другие чувства: слух, обоняние, осязание.' },
])
</script>