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
.title { font-size: 22px; font-weight: 800; margin-bottom: 16px; text-align: center; }
.col { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.btn { width: 100%; max-width: 100%; padding: 14px 18px; border-radius: 20px; border: 0; background: #ffffff; color: #111827; font-size: 18px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 24px rgba(0,0,0,0.14); transition: opacity .2s ease, box-shadow .2s ease; }
.btn.active { background: linear-gradient(135deg,#6A4DFF 0%, #9A3CFF 100%); color: #ffffff; outline: 0; }
.btn.faded { opacity: 0.5; }

/* При возвращении на вопрос (есть выбранный ответ) добавляем градиентную обводку всем кнопкам */
.col.chosen .btn { 
  border: 2px solid transparent; 
  background-image: linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #6A4DFF 0%, #9A3CFF 100%);
  background-origin: border-box; 
  background-clip: padding-box, border-box;
}
/* Активная кнопка сохраняет градиентную заливку и получает градиентную рамку */
.col.chosen .btn.active {
  background-image: linear-gradient(135deg, #6A4DFF 0%, #9A3CFF 100%), linear-gradient(135deg, #6A4DFF 0%, #9A3CFF 100%);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}
</style>



