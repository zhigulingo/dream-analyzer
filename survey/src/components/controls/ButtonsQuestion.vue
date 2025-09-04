<template>
  <div>
    <div class="title">{{ title }}</div>
    <div class="row">
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
.title { font-size: 20px; font-weight: 700; margin-bottom: 16px; }
.row { display: flex; gap: 12px; flex-wrap: wrap; }
.btn { padding: 14px 16px; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
.btn.active { border-color: #6366f1; background: #eef2ff; }
</style>



