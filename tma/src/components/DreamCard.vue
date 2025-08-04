<template>
  <article
    class="rounded-[3.75rem] bg-gradient-to-br from-[#4A58FF] to-[#5664FF] text-white px-8 md:px-16 transition-all overflow-hidden"
    :class="[active ? 'py-14' : 'py-6 h-[4.5rem]']"
    @click="$emit('toggle')"
  >
    <div class="flex justify-between items-center">
      <h3 class="truncate">{{ dream.title }}</h3>
      <span class="bg-white/10 rounded-full px-4 py-1 text-sm">
        {{ relativeDate }}
      </span>
    </div>
    <p v-if="active" class="mt-4 text-sm leading-snug whitespace-pre-line">
      {{ dream.text }}
    </p>
  </article>
</template>

<script setup>
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const props = defineProps({
  dream: Object,
  active: Boolean
})

const relativeDate = dayjs(props.dream.date).fromNow(true)
</script>