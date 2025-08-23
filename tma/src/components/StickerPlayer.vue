<template>
  <div ref="containerRef" class="sticker-container" :style="containerStyle"></div>
  <div v-if="errorMessage" class="sticker-error">{{ errorMessage }}</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import lottie from 'lottie-web'
import { inflate } from 'pako'

interface Props {
  /** File name inside /stickers, e.g., "chat.tgs" */
  src: string
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Playback speed (1.0 default) */
  speed?: number
  /** Whether to loop animation */
  loop?: boolean
  /** Whether to autoplay when ready */
  autoplay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 180,
  height: 180,
  speed: 1.0,
  loop: true,
  autoplay: true,
})

const containerRef = ref<HTMLDivElement | null>(null)
const animInstance = ref<lottie.AnimationItem | null>(null)
const errorMessage = ref<string | null>(null)

const containerStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}))

const destroyAnimation = () => {
  try {
    if (animInstance.value) {
      animInstance.value.destroy()
      animInstance.value = null
    }
  } catch (_) {}
}

const loadTgs = async () => {
  errorMessage.value = null
  destroyAnimation()
  if (!containerRef.value) return
  try {
    const assetUrl = new URL(`../../stickers/${props.src}`, import.meta.url)
    const response = await fetch(assetUrl.toString())
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const buffer = await response.arrayBuffer()
    // .tgs is gzipped Lottie JSON
    const uint8 = new Uint8Array(buffer)
    const jsonString = new TextDecoder('utf-8').decode(inflate(uint8))
    const animationData = JSON.parse(jsonString)

    animInstance.value = lottie.loadAnimation({
      container: containerRef.value!,
      renderer: 'svg',
      loop: props.loop,
      autoplay: props.autoplay,
      animationData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
        progressiveLoad: true,
        hideOnTransparent: true,
      },
    })
    animInstance.value.setSpeed(props.speed)
  } catch (e: any) {
    console.error('[StickerPlayer] Failed to load sticker', props.src, e)
    errorMessage.value = 'Не удалось загрузить стикер'
  }
}

onMounted(() => {
  loadTgs()
})

watch(() => props.src, () => {
  loadTgs()
})

onBeforeUnmount(() => {
  destroyAnimation()
})
</script>

<style scoped>
.sticker-container {
  display: inline-block;
}
.sticker-error {
  font-size: 12px;
  color: #ff6b6b;
  text-align: center;
}
</style>


