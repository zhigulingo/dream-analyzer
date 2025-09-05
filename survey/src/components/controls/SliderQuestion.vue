<template>
  <div>
    <div class="title">{{ title }}</div>
    <div class="row">
      <input class="track" type="range" :min="min" :max="max" step="1" v-model.number="localValue" @change="onCommit" />
      <div class="value">{{ localValue }}</div>
    </div>
    <div class="labels">
      <span>1</span>
      <span>5</span>
      <span>10</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
const props = defineProps({ title: String, min: Number, max: Number, modelValue: Number });
const emit = defineEmits(['update:modelValue','commit']);
const localValue = ref(props.modelValue ?? Math.round((props.min + props.max) / 2));
watch(() => props.modelValue, v => { if (v != null) localValue.value = v; });
function onCommit() {
  emit('update:modelValue', localValue.value);
  emit('commit');
}
</script>

<style scoped>
.title { font-size: 20px; font-weight: 700; margin-bottom: 16px; text-align: center; }
.row { display: flex; align-items: center; gap: 12px; }
.value { width: 40px; text-align: center; font-weight: 700; }
.track { flex: 1; width: 100%; accent-color: #6366f1; }
.labels { display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px; opacity: 0.95; }
</style>



