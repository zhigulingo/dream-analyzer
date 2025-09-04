<template>
  <div>
    <div class="title">{{ title }}</div>
    <div class="col">
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
.title { font-size: 20px; font-weight: 700; margin-bottom: 16px; text-align: center; }
.col { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.btn { width: 100%; max-width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.06); text-align: center; }
.btn.active { border-color: #6366f1; background: #eef2ff; }
</style>



