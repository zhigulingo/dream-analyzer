<template>
  <div class="rounded-2xl border border-purple-500/25 bg-purple-500/10 text-white p-4">
    <div class="flex items-start gap-3">
      <div class="text-2xl">🎯</div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-base">Сделай анализ точнее</div>
        <div class="text-sm opacity-85 mt-1 leading-snug">
          Укажи возраст и пол — анализ будет сравниваться с твоими демографическими нормами снов.
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button class="px-4 py-2 rounded-xl bg-purple-500/30 hover:bg-purple-500/45 text-sm font-medium transition-colors" @click="open()">✓ Указать данные</button>
          <button class="px-4 py-2 rounded-xl bg-white/8 hover:bg-white/15 text-sm opacity-70 transition-colors" @click="$emit('dismiss')">Не сейчас</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="show" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70" @click.self="close" @wheel.prevent @touchmove.prevent>
        <div class="w-[92vw] max-w-[440px] rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#0c110c)] text-white p-4 shadow-2xl border border-white/10" @click.stop>
          <h3 class="text-lg font-semibold mb-2">Уточнить данные</h3>
          <div v-if="step===1" class="space-y-3">
            <p class="opacity-90">Ваш возрастной диапазон:</p>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="a in ages" :key="a" :class="['px-4 py-3 rounded-xl text-sm', age===a ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15']" @click="age=a">{{ a }}</button>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button class="px-4 py-2 rounded-xl bg-white/10" @click="close">Отмена</button>
              <button class="px-4 py-2 rounded-xl bg-white/20" :disabled="!age" @click="step=2">Далее</button>
            </div>
          </div>
          <div v-else class="space-y-3">
            <p class="opacity-90">Ваш пол:</p>
            <div class="grid grid-cols-2 gap-2">
              <button :class="['px-4 py-3 rounded-xl text-sm', gender==='male' ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15']" @click="gender='male'">Мужской</button>
              <button :class="['px-4 py-3 rounded-xl text-sm', gender==='female' ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15']" @click="gender='female'">Женский</button>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button class="px-4 py-2 rounded-xl bg-white/10" @click="close">Отмена</button>
              <button class="px-4 py-2 rounded-xl bg-white/20" :disabled="!gender || saving" @click="save">
                <span v-if="!saving">Сохранить</span>
                <span v-else>Сохранение…</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import api from '@/services/api'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notifications'

defineEmits(['dismiss'])

const user = useUserStore()
const notify = useNotificationStore()

const show = ref(false)
const step = ref(1)
const ages = ['0-20','20-30','30-40','40-50','50+']
const age = ref('')
const gender = ref('')
const saving = ref(false)

function open(){ show.value = true; step.value=1; age.value=''; gender.value='' }
function close(){ if(!saving.value) show.value = false }

async function save(){
  try {
    saving.value = true
    await api.setDemographics(age.value, gender.value)
    try { await user.fetchProfile() } catch(_) {}
    notify.success('Готово! Будущие анализы учтут эти данные')
    show.value = false
  } catch(e:any){
    console.error('setDemographics error', e)
    notify.error(e?.response?.data?.error || 'Не удалось сохранить')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
</style>
