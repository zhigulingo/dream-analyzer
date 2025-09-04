<template>
  <div class="container">
    <component :is="currentView" @start="goSurvey" @finish="goFinish" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
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
</script>

<style>
.container {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
}
</style>



