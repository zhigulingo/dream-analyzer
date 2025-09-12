<template>
  <div>
    <div class="title">{{ title }}</div>
    <div class="col" :class="{ chosen: !!modelValue }">
      <button v-for="opt in options" :key="opt" :class="['btn', { active: modelValue===opt, faded: modelValue && modelValue!==opt, revisited: wasRevisited && modelValue===opt }]" @click="select(opt)">{{ opt }}</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ title: String, options: Array, modelValue: String });
// При возвращении на предыдущие вопросы показываем градиентный обвод выбранной кнопки
const wasRevisited = !!props.modelValue;
const emit = defineEmits(['update:modelValue','commit']);
function select(opt) {
  emit('update:modelValue', opt);
  emit('commit');
}
</script>

<style scoped>
.title { font-size: 22px; font-weight: 800; margin-bottom: 16px; text-align: center; }
.col { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.btn { width: 100%; max-width: 100%; padding: 14px 18px; border-radius: 20px; border: 0; background: #ffffff; color: #111827; font-size: 18px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 24px rgba(0,0,0,0.14); transition: opacity .2s ease, border .2s ease; position: relative; }
.btn.active { background: linear-gradient(135deg,#6A4DFF 0%, #9A3CFF 100%); color: #ffffff; outline: 0; }
.btn.faded { opacity: 0.5; }
.btn.revisited {
  background: #ffffff;
}
.btn.revisited::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 22px;
  padding: 2px;
  background: linear-gradient(135deg,#6A4DFF 0%, #9A3CFF 100%);
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
}
</style>



