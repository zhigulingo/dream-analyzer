<template>
  <div>
    <div class="title">{{ title }}</div>
    <div class="row">
      <input type="range" :min="min" :max="max" v-model.number="localValue" @change="onCommit" />
      <div class="value">{{ localValue }}</div>
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
.title { font-size: 20px; font-weight: 700; margin-bottom: 16px; }
.row { display: flex; align-items: center; gap: 12px; }
.value { width: 40px; text-align: center; font-weight: 700; }
input[type="range"] { flex: 1; accent-color: #6366f1; }
</style>



