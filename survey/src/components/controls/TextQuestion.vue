<template>
  <div>
    <div class="title">{{ title }}</div>
    <textarea v-model="localValue" rows="5" placeholder="Ваш ответ..." />
    <div class="actions">
      <button class="btn" :disabled="!valid" @click="commit">Далее</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
const props = defineProps({ title: String, modelValue: String });
const emit = defineEmits(['update:modelValue','commit']);
const localValue = ref(props.modelValue ?? '');
watch(() => props.modelValue, v => { if (typeof v === 'string') localValue.value = v; });
const valid = computed(() => (localValue.value || '').trim().length > 3);
function commit() {
  if (!valid.value) return;
  emit('update:modelValue', localValue.value);
  emit('commit');
}
</script>

<style scoped>
.title { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
textarea { width: 100%; border: 1px solid #ddd; border-radius: 10px; padding: 10px; resize: vertical; }
.actions { display: flex; justify-content: flex-end; margin-top: 12px; }
.btn { padding: 10px 16px; border-radius: 10px; background: #6366f1; color: #fff; border: none; cursor: pointer; }
.btn:disabled { background: #c7c8fe; cursor: not-allowed; }
</style>


