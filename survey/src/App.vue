<template>
  <div class="container">
    <component :is="currentView" @start="goSurvey" @finish="goFinish" />
  </div>
</template>

<script setup>
import { computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useSurveyStore } from './store/survey';
import StartView from './views/Start.vue';
import SurveyView from './views/Survey.vue';
import FinishView from './views/Finish.vue';

const store = useSurveyStore();

const currentView = computed(() => {
  if (store.stage === 'start') return StartView;
  if (store.stage === 'survey') return SurveyView;
  return FinishView;
});

function goSurvey() { store.startSurvey(); }
function goFinish() { store.stage = 'finish'; }

function updateScrollLock() {
  try {
    if (store.stage === 'survey') document.body.classList.add('no-scroll');
    else document.body.classList.remove('no-scroll');
  } catch {}
}

watch(() => store.stage, () => updateScrollLock(), { immediate: true });
onMounted(() => updateScrollLock());
onBeforeUnmount(() => { try { document.body.classList.remove('no-scroll'); } catch {} });
</script>

<style>
.container {
  max-width: 560px;
  margin: 0 auto;
  padding: 0 16px;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
}
.no-scroll { overflow: hidden !important; }
</style>



