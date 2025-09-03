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
.title { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
textarea { width: 100%; border: 1px solid #e5e7eb; border-radius: 16px; padding: 12px; resize: vertical; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
.actions { display: flex; justify-content: flex-end; margin-top: 12px; }
.btn { padding: 12px 16px; border-radius: 12px; background: #6366f1; color: #fff; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
.btn:disabled { background: #c7c8fe; cursor: not-allowed; }
</style>



