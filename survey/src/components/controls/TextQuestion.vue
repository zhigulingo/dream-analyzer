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
.title { font-size: 22px; font-weight: 800; margin-bottom: 16px; text-align: center; }
textarea { width: 100%; max-width: 100%; border: 1px solid #e5e7eb; border-radius: 16px; padding: 14px; resize: vertical; box-shadow: 0 4px 14px rgba(0,0,0,0.06); box-sizing: border-box; font-size: 16px; }
.actions { display: flex; justify-content: center; margin-top: 12px; }
.btn { min-width: 160px; padding: 14px 18px; border-radius: 20px; background: #ffffff; color: #111827; border: none; cursor: pointer; box-shadow: 0 10px 24px rgba(0,0,0,0.14); font-size: 18px; font-weight: 700; }
.btn:disabled { opacity: 0.7; cursor: not-allowed; }
</style>



