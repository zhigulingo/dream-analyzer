<template>
  <div>
    <div class="title">{{ title }}</div>
    <div class="grid">
      <button v-for="opt in options" :key="opt" :class="['btn', { active: modelValue===opt }]" @click="select(opt)">{{ opt }}</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ title: String, options: Array, modelValue: String });
const emit = defineEmits(['update:modelValue','commit']);
function select(opt) {
  emit('update:modelValue', opt);
  emit('commit');
}
</script>

<style scoped>
.title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.btn { padding: 12px 16px; border-radius: 10px; border: 1px solid #ddd; background: #fff; cursor: pointer; }
.btn.active { border-color: #6366f1; background: #eef2ff; }
</style>



