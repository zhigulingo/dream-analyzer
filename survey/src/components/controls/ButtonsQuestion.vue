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
  padding: 18px 20px;
  border-radius: 28px;
  border: 0;
  background: linear-gradient(135deg,#6A4DFF 0%, #9A3CFF 100%);
  color: #1f1147;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(0,0,0,0.14);
  transition: opacity .2s ease;
}
.btn.active { background: #ffffff; color: #111827; outline: 4px solid rgba(255,255,255,0.85); }
.btn.faded { opacity: 0.5; }
</style>



