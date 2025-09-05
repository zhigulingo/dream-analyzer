<template>
  <div>
    <div class="title">{{ title }}</div>
    <div class="col" :class="{ chosen: !!modelValue }">
      <button v-for="opt in options" :key="opt" :class="['btn', { active: modelValue===opt, faded: modelValue && modelValue!==opt }]" @click="select(opt)">{{ opt }}</button>
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
.btn {
  width: 100%;
  max-width: 100%;
  padding: 16px 18px;
  border-radius: 24px;
  border: 0;
  background: #ffffff;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0,0,0,0.10);
  transition: opacity .2s ease;
}
.btn.active { outline: 3px solid rgba(255,255,255,0.7); }
.btn.faded { opacity: 0.5; }
</style>



