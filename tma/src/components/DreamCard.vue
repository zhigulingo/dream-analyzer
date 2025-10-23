<template>
  <article
    ref="rootRef"
    class="rounded-xl bg-gradient-to-br text-white px-8 md:px-16 transition-all overflow-hidden py-4"
    :class="[gradientClass, overlayMode ? '' : 'cursor-pointer min-h-[4.5rem]']"
    @click="handleOpen"
  >
    <!-- Collapsed header (card list view) -->
    <div v-if="!overlayMode" class="flex items-center gap-4 py-2 min-h-[3.5rem]">
      <div class="text-3xl shrink-0">{{ emoji }}</div>
      <div class="flex-1 min-w-0">
        <div class="truncate font-semibold leading-tight text-base">{{ displayTitle }}</div>
        <div class="text-sm opacity-80 leading-tight mt-0.5">{{ relativeDate }}</div>
      </div>
      <button class="shrink-0 w-5 h-5 opacity-60 hover:opacity-100 flex items-center justify-center transition-opacity"
              @click.stop="emitOpen()"
              aria-label="Открыть">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 4L13 10L7 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- Expanded content (used by overlay mode) -->
    <div v-if="active" class="mt-4 space-y-6 fade-seq is-open">
      <!-- Title and full date inside the opened card (only in overlay) -->
      <div v-if="overlayMode" class="space-y-2">
        <h2 class="text-[32px] font-bold leading-tight">{{ displayTitle }}</h2>
        <div class="text-base opacity-80">{{ fullDate }}</div>
        <!-- Tags badges for regular dreams (placed here, under title/date) -->
        <div v-if="displayTags.length && !isDeep" class="flex flex-wrap gap-2 pt-2">
          <span v-for="tag in displayTags" :key="tag" class="inline-flex items-center px-3 py-1.5 rounded-full text-base font-medium bg-white/20 text-white">
            {{ tag }}
          </span>
        </div>
      </div>
      
      <!-- Deep analysis specific layout -->
      <template v-if="isDeep">
        <!-- Повторяющиеся символы -->
        <div v-if="hasRecurringSymbols" class="space-y-4">
          <h3 class="text-2xl font-bold">Повторяющиеся символы</h3>
          <div class="text-white/90 space-y-5">
            <!-- Вводный текст о значении повторений -->
            <p v-if="symbolsIntro" class="text-lg opacity-90 leading-snug pb-4 border-b border-white/10">{{ symbolsIntro }}</p>
            
            <!-- Список символов (только с частотой >= 2) -->
            <div v-for="(symbol, idx) in filteredRecurringSymbols" :key="`symbol-${idx}`" class="space-y-3">
              <div class="flex items-baseline gap-2">
                <h4 class="font-bold text-xl">{{ symbol.symbol }}</h4>
                <span class="text-base opacity-60 bg-white/15 px-2 py-0.5 rounded-full">×{{ symbol.frequency }}</span>
              </div>
              <p class="text-lg opacity-90 leading-snug">{{ symbol.description }}</p>
              <div class="text-base opacity-60 leading-tight bg-white/5 rounded-lg px-3 py-2">
                <span class="font-medium opacity-80">В ваших снах:</span> {{ symbol.userContext }}
              </div>
            </div>
          </div>
        </div>

        <!-- Динамика контекста -->
        <div v-if="hasDynamicsContext" class="space-y-4">
          <h3 class="text-2xl font-bold">Динамика контекста</h3>
          <div class="text-white/90">
            <DynamicsChart 
              :dynamics="dynamicsContext" 
              :userAge="userStore.profile?.age_range"
              :userGender="userStore.profile?.gender"
            />
          </div>
        </div>

        <!-- Заключение -->
        <div v-if="hasConclusion" class="space-y-4">
          <h3 class="text-2xl font-bold">Заключение</h3>
          <div class="text-white/90 space-y-5">
            <p v-if="conclusion.periodThemes" class="text-lg opacity-90 leading-snug">{{ conclusion.periodThemes }}</p>
            <p v-if="conclusion.dreamFunctionsAnalysis" class="text-lg opacity-90 leading-snug">{{ conclusion.dreamFunctionsAnalysis }}</p>
            <p v-if="conclusion.psychologicalSupport" class="text-lg opacity-90 leading-snug">{{ conclusion.psychologicalSupport }}</p>
            
            <div v-if="conclusion.integrationExercise" class="bg-white/10 rounded-lg p-4 space-y-3 mt-5">
              <h4 class="font-bold text-xl opacity-95 flex items-center gap-2">
                <span>💫</span>
                <span>{{ conclusion.integrationExercise.title || 'Практическое упражнение' }}</span>
              </h4>
              <p class="text-lg opacity-90 leading-snug">{{ conclusion.integrationExercise.description }}</p>
              <p v-if="conclusion.integrationExercise.rationale" class="text-base opacity-60 leading-tight">{{ conclusion.integrationExercise.rationale }}</p>
            </div>
          </div>
        </div>
        
        <!-- FALLBACK: старый формат для обратной совместимости -->
        <template v-if="!hasRecurringSymbols && !hasDynamicsContext && !hasConclusion">
          <!-- Общий контекст серии -->
          <div class="rounded-lg bg-white/10">
            <div class="px-3 py-2 font-semibold">Общий контекст серии</div>
            <div class="px-3 pb-3 text-white/90 leading-snug space-y-2">
              <div v-html="deepContextHtml"></div>
            </div>
          </div>
          
          <!-- Старый формат тегов -->
          <div v-if="displayTags.length" class="rounded-lg bg-white/10">
            <div class="px-3 py-2 font-semibold">Повторяющиеся символы</div>
            <div class="px-3 pb-3">
              <div class="flex flex-wrap gap-2">
                <span v-for="tag in displayTags" :key="'deep-'+tag" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/15 text-white">{{ tag }}</span>
              </div>
            </div>
          </div>

          <!-- Динамика HVdC -->
          <div v-if="trendReady" class="rounded-lg bg-white/10">
            <div class="px-3 py-2 font-semibold">Динамика</div>
            <div class="px-3 pb-3 text-white/90 leading-snug">
              <DynamicsChart 
                :dynamics="hvdcDynamics" 
                :userAge="userStore.profile?.age_range"
                :userGender="userStore.profile?.gender"
              />
            </div>
          </div>
          
          <!-- Инсайты и рекомендации для старого формата -->
          <div v-if="insights.length" class="rounded-lg bg-white/10">
            <div class="px-3 py-2 font-semibold">Ключевые инсайты</div>
            <div class="px-3 pb-3 text-white/90 leading-snug">
              <ol class="list-decimal pl-5 space-y-2">
                <li v-for="(it, i) in insights" :key="'in'+i" class="text-xs leading-relaxed">{{ it }}</li>
              </ol>
            </div>
          </div>

          <div v-if="recommendations.length" class="rounded-lg bg-white/10">
            <div class="px-3 py-2 font-semibold">Рекомендации</div>
            <div class="px-3 pb-3 text-white/90 leading-snug">
              <ol class="list-decimal pl-5 space-y-3">
                <li v-for="(r, i) in recommendations" :key="'rec'+i" class="text-xs leading-relaxed">
                  <div v-if="typeof r === 'object' && r.title">
                    <div class="font-semibold mb-1">{{ r.title }}</div>
                    <div class="opacity-90">{{ r.description }}</div>
                    <div v-if="r.rationale" class="opacity-80 mt-1 italic">{{ r.rationale }}</div>
                  </div>
                  <div v-else>{{ typeof r === 'string' ? r : r.title }}</div>
                </li>
              </ol>
            </div>
          </div>
        </template>
        
        <!-- Fallback инсайты и рекомендации если есть новая структура символов/динамики но нет заключения -->
        <template v-if="(hasRecurringSymbols || hasDynamicsContext) && !hasConclusion">
          <div v-if="insights.length" class="rounded-lg bg-white/10">
            <div class="px-3 py-2 font-semibold">Ключевые инсайты</div>
            <div class="px-3 pb-3 text-white/90 leading-snug">
              <ol class="list-decimal pl-5 space-y-2">
                <li v-for="(it, i) in insights" :key="'in'+i" class="text-xs leading-relaxed">{{ it }}</li>
              </ol>
            </div>
          </div>

          <div v-if="recommendations.length" class="rounded-lg bg-white/10">
            <div class="px-3 py-2 font-semibold">Рекомендации</div>
            <div class="px-3 pb-3 text-white/90 leading-snug">
              <ol class="list-decimal pl-5 space-y-3">
                <li v-for="(r, i) in recommendations" :key="'rec'+i" class="text-xs leading-relaxed">
                  <div v-if="typeof r === 'object' && r.title">
                    <div class="font-semibold mb-1">{{ r.title }}</div>
                    <div class="opacity-90">{{ r.description }}</div>
                    <div v-if="r.rationale" class="opacity-80 mt-1 italic">{{ r.rationale }}</div>
                  </div>
                  <div v-else>{{ typeof r === 'string' ? r : r.title }}</div>
                </li>
              </ol>
            </div>
          </div>
        </template>
      </template>

      <!-- Single dream layout -->
      <template v-else>
      <!-- Dream text - collapsible, with left border quote style and quote mark -->
      <div class="relative border-l-4 border-pink-400 pl-4 space-y-2">
        <div class="flex items-start justify-between gap-3">
          <h3 class="text-2xl font-bold leading-tight">Сон</h3>
          <span class="opacity-70 text-pink-300 text-4xl leading-none" style="font-family: Georgia, ui-serif;">"</span>
        </div>
        <div class="text-white/90">
          <p 
            class="text-lg leading-snug transition-all"
            :class="expanded.dreamText ? '' : 'line-clamp-3'"
          >
            {{ dream.dream_text }}
          </p>
        </div>
        <div class="flex justify-end pt-1">
          <button 
            @click.stop="toggleSection('dreamText')"
            class="text-base opacity-70 hover:opacity-100 transition-opacity"
          >
            {{ expanded.dreamText ? 'Свернуть ↑' : 'Развернуть ↓' }}
          </button>
        </div>
      </div>

      <!-- Scientific Approach Section -->
      <div class="space-y-3">
        <h2 class="text-2xl font-bold">Научный подход</h2>
        
        <!-- HVdC Content Analysis -->
        <div v-if="hvdc" class="rounded-lg bg-white/10">
          <h3 class="text-xl font-semibold px-4 py-3">Контент анализ</h3>
          <div class="px-4 pb-4 text-white/90 space-y-4">
            <div class="space-y-4">
              <div v-for="row in hvdcRows" :key="row.key" class="space-y-1">
                <div class="flex justify-between text-lg leading-tight">
                  <span class="font-medium">{{ row.label }}</span>
                  <span class="opacity-90">
                    {{ row.value }}%
                    <template v-if="row.norm !== null"> / {{ row.norm }}%</template>
                    <template v-if="row.delta !== null">
                      <span :class="row.delta>0 ? 'text-green-300' : (row.delta<0 ? 'text-red-300' : 'text-white/70')">
                        ({{ row.delta>0? '+'+row.delta : row.delta }}pp)
                      </span>
                    </template>
                  </span>
                </div>
                <div class="relative h-2 w-full bg-white/10 rounded overflow-hidden">
                  <div v-if="row.norm !== null" class="absolute inset-y-0 left-0 bg-white/20" :style="{ width: row.norm+'%' }"></div>
                  <div class="relative h-full bg-white/70" :style="{ width: row.value+'%' }"></div>
                </div>
              </div>
              <div class="pt-1 text-base opacity-80 flex flex-wrap items-center gap-3">
                <span class="inline-flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full inline-block bg-white/70 shrink-0"></span> <span class="leading-tight">ваш сон</span></span>
                <span class="inline-flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full inline-block bg-white/20 shrink-0"></span> <span class="leading-tight">{{ hvdcLegend }}</span></span>
              </div>
              <div class="text-base opacity-70 flex items-start gap-2 leading-tight">
                <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-white text-[10px] shrink-0 aspect-square mt-0.5">i</span>
                <span>Контент‑анализ по схеме HVdC; сравнение с демографическими нормами (DreamBank, SDDB).</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Dream Function -->
        <template v-for="(sec, idx) in sections" :key="sec.key">
          <div v-if="sec.key === 'func'" class="rounded-lg bg-white/10">
            <h3 class="text-xl font-semibold px-4 py-3">{{ sec.title }}</h3>
            <div class="px-4 pb-4 text-white/90 space-y-3">
              <div v-html="sanitizeFuncHtml(sec.html)" class="text-lg leading-snug"></div>
              
              <!-- Functional Exercise - collapsible -->
              <div v-if="getFuncExercise(sec.html)" class="mt-3 pt-3 border-t border-white/10">
                <button 
                  @click.stop="toggleSection('funcExercise')"
                  class="w-full flex items-center justify-between text-left font-semibold hover:opacity-80 transition-opacity"
                >
                  <span>Функциональное упражнение</span>
                  <span class="text-xl">{{ expanded.funcExercise ? '−' : '+' }}</span>
                </button>
                <div v-show="expanded.funcExercise" class="mt-3" v-html="getFuncExercise(sec.html)"></div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Psychoanalytic Approach Section -->
      <div class="space-y-3">
        <h2 class="text-2xl font-bold">Психоаналитический подход</h2>
        
        <template v-for="(sec, idx) in sections" :key="`psycho-${sec.key}`">
          <div v-if="['arch', 'freud', 'jung'].includes(sec.key)" class="rounded-lg bg-white/10">
            <h3 class="text-xl font-semibold px-4 py-3">{{ sec.title }}</h3>
            <div class="px-4 pb-4 text-white/90">
              <div v-html="sec.html" class="text-lg leading-snug space-y-2"></div>
            </div>
          </div>
        </template>
      </div>
      </template>

      <div class="mt-4 flex gap-2">
        <button 
          class="flex-1 rounded-xl py-2 text-sm font-medium text-center transition-colors"
          :class="localFeedback === 1 ? 'bg-green-500/30 text-white ring-2 ring-green-400/60' : 'bg-white/20 hover:bg-white/30 text-white'"
          @click.stop="handleLike"
        >
          👍
        </button>
        <button 
          class="flex-1 rounded-xl py-2 text-sm font-medium text-center transition-colors"
          :class="localFeedback === 2 ? 'bg-red-500/30 text-white ring-2 ring-red-400/60' : 'bg-white/20 hover:bg-white/30 text-white'"
          @click.stop="handleDislike"
        >
          👎
        </button>
        <button 
          class="flex-1 bg-red-500/20 hover:bg-red-500/30 text-white rounded-xl py-2 text-sm font-medium text-center transition-colors"
          @click.stop="handleDelete"
        >
          🗑️
        </button>
      </div>

      <div v-if="debugEnabled && debugPayload" class="mt-3 text-xs bg-black/20 rounded-lg p-2 font-mono whitespace-pre-wrap break-words">
        <div class="mb-2 opacity-80">Debug payload</div>
        {{ JSON.stringify(debugPayload, null, 2) }}
        <div class="mt-2 flex justify-end">
          <button class="px-3 py-1 rounded bg-white/10 hover:bg-white/20" @click.stop="copyDebug">Скопировать</button>
        </div>
      </div>

      <Teleport to="body">
      <div v-if="showDemo" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70" @click.self="closeDemographics" @wheel.prevent @touchmove.prevent>
        <div class="w-[92vw] max-w-[440px] rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#0c110c)] text-white p-4 shadow-2xl border border-white/10" @click.stop>
          <h3 class="text-lg font-semibold mb-2">Уточнить данные</h3>
          <div v-if="demoStep===1" class="space-y-3">
            <p class="opacity-90">Ваш возрастной диапазон:</p>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="a in ages" :key="a" :class="['px-4 py-3 rounded-xl text-sm', age===a ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15']" @click="age=a">{{ a }}</button>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button class="px-4 py-2 rounded-xl bg-white/10" @click="closeDemographics">Отмена</button>
              <button class="px-4 py-2 rounded-xl bg-white/20" :disabled="!age" @click="demoStep=2">Далее</button>
            </div>
          </div>
          <div v-else class="space-y-3">
            <p class="opacity-90">Ваш пол:</p>
            <div class="grid grid-cols-2 gap-2">
              <button :class="['px-4 py-3 rounded-xl text-sm', gender==='male' ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15']" @click="gender='male'">Мужской</button>
              <button :class="['px-4 py-3 rounded-xl text-sm', gender==='female' ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15']" @click="gender='female'">Женский</button>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button class="px-4 py-2 rounded-xl bg-white/10" @click="closeDemographics">Отмена</button>
              <button class="px-4 py-2 rounded-xl bg-white/20" :disabled="!gender" @click="saveDemographics">Сохранить</button>
            </div>
          </div>
        </div>
      </div>
      </Teleport>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/ru'

dayjs.extend(relativeTime)
dayjs.locale('ru')
dayjs.extend(utc)
dayjs.extend(timezone)

const props = defineProps<{ dream: any; active?: boolean; overlayMode?: boolean }>()
const emit = defineEmits(['toggle','open'])

const rootRef = ref<HTMLElement | null>(null)
const emitOpen = () => {
  const y = (() => {
    try { return Math.round(rootRef.value?.getBoundingClientRect().top ?? 0) } catch { return 0 }
  })()
  emit('open', { y })
}

const handleOpen = () => {
  if (props.overlayMode) return
  emitOpen()
  if (window.triggerHaptic) window.triggerHaptic('light')
}

import api from '@/services/api.js'
import { useUserStore } from '@/stores/user.js'
import { useNotificationStore } from '@/stores/notifications.js'
import DynamicsChart from '@/components/DynamicsChart.vue'
import { emojiForTitle } from '@/services/emoji.js'

const userStore = useUserStore()
const notificationStore = useNotificationStore()
const isDeep = computed(()=> !!props.dream?.is_deep_analysis)

const emoji = computed(()=> emojiForTitle(displayTitle.value))

// removed chevron mask icon in favor of classic '>' glyph

const localFeedback = computed({
  get: () => (props.dream?.user_feedback ?? props.dream?.deep_source?.user_feedback ?? 0),
  set: (v) => {
    if (!props.dream) return
    props.dream.user_feedback = v
    // Дублируем в deep_source для совместимости
    if (!props.dream.deep_source) props.dream.deep_source = {}
    props.dream.deep_source.user_feedback = v
  }
})

const sending = { like: false, dislike: false, delete: false }

const sendFeedback = async (target) => {
  if (sending.like || sending.dislike) return
  const next = target === 1
    ? (localFeedback.value === 1 ? 0 : 1)
    : (localFeedback.value === 2 ? 0 : 2)
  const prev = localFeedback.value
  localFeedback.value = next
  try {
    if (window.triggerHaptic) window.triggerHaptic('medium')
    if (target === 1) sending.like = true; else sending.dislike = true
    await api.postAnalysisFeedback(props.dream.id, next)
    // Snackbar
    if (next === 0) notificationStore.info('Оценка снята')
    else if (next === 1) notificationStore.success('Добавлено: нравится')
    else if (next === 2) notificationStore.success('Добавлено: не нравится')
  } catch (e) {
    // rollback
    localFeedback.value = prev
    console.error('Feedback error', e)
    notificationStore.error('Не удалось сохранить оценку')
  } finally {
    sending.like = sending.dislike = false
  }
}

const handleLike = () => sendFeedback(1)

const handleDislike = () => sendFeedback(2)

const handleDelete = async () => {
  if (sending.delete) return
  const tg = window.Telegram?.WebApp
  const confirmed = await new Promise((resolve) => {
    if (tg?.showPopup) {
      tg.showPopup({ title: 'Удалить запись?', message: 'Действие необратимо', buttons: [{ id: 'yes', type: 'destructive', text: 'Удалить' }, { id: 'no', type: 'cancel', text: 'Отмена' }] }, (id) => resolve(id === 'yes'))
    } else {
      resolve(window.confirm('Удалить запись?'))
    }
  })
  if (!confirmed) return

  try {
    sending.delete = true
    if (window.triggerHaptic) window.triggerHaptic('heavy')
    await api.deleteAnalysis(props.dream.id)
    // Убираем из локального стора истории
    const idx = userStore.history.findIndex(d => d.id === props.dream.id)
    if (idx > -1) userStore.history.splice(idx, 1)
    // Обновляем профиль (счетчики)
    userStore.fetchProfile()
    // Snackbar подтверждения
    notificationStore.success('Запись удалена')
  } catch (e) {
    console.error('Delete error', e)
    notificationStore.error('Не удалось удалить запись')
  } finally {
    sending.delete = false
  }
}

const stopwords = new Set([
  'и','в','во','не','что','он','на','я','с','со','как','а','то','все','она','так','его','но','да','ты','к','у','же','вы','за','бы','по','ее','мне','было','вот','от','меня','еще','нет','о','из','ему','теперь','когда','даже','ну','вдруг','ли','если','уже','или','ни','быть','был','него','до','вас','нибудь','опять','уж','вам','ведь','там','потом','себя','ничего','ей','может','они','тут','где','есть','надо','ней','для','мы','тебя','их','чем','была','сам','чтоб','без','будто','чего','раз','тоже','себе','под','будет','ж','тогда','кто','этот','того','потому','этого','какой','совсем','ним','здесь','этом','один','почти','мой','тем','чтобы','нее','кажется','сейчас','были','куда','зачем','всех','никогда','можно','при','наконец','два','об','другой','хоть','после','над','больше','тот','через','эти','нас','про','всего','них','какая','много','разве','три','эту','моя','впрочем','хорошо','свою','этой','перед','иногда','лучше','чуть','том','нельзя','такой','им','более','всегда','конечно','всю','между'
])

function toTitleCase(text) {
  return text.replace(/\s+/g, ' ').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function extractTitleFromText(text) {
  if (!text) return ''
  const firstSentence = String(text).split(/[.!?\n]/)[0]
  const words = firstSentence
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .split(/\s+/)
    .filter(w => w && !stopwords.has(w) && w.length > 3)

  const picked = words.slice(0, 3)
  if (picked.length === 0) {
    return firstSentence.slice(0, 40)
  }
  return toTitleCase(picked.join(' '))
}

function refineTitle(t) {
  if (!t) return ''
  let s = String(t).toLowerCase().replace(/["'«»]/g,'').trim()
  s = s.replace(/^(приснилось|снилось|сон о|сон про|сон|мне снится|мне приснилось)\s+/i,'')
  s = s.replace(/\s+/g,' ').trim()
  const words = s.split(' ').filter(Boolean).slice(0,3)
  if (!words.length) return ''
  return words.join(' ')
}

function toSentenceCase(s){
  if (!s) return ''
  const lower = String(s).toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

const displayTitle = computed(() => {
  const deepTitle = refineTitle(props.dream?.deep_source?.title)
  if (deepTitle) return toSentenceCase(deepTitle)
  const raw = (props.dream?.deep_source?.tags || []).filter(Boolean)
  const normalizeTag = (s:string)=>{
    let t = String(s||'').trim()
    t = t.split(/[\\/,(;:—–-]/)[0]?.trim() || ''
    if (!t) return ''
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  }
  const tags = raw.map(normalizeTag).filter(Boolean)
  if (tags.length) {
    const title = tags.slice(0,2).join(' и ')
    return toSentenceCase(title || 'Без названия')
  }
  const t = refineTitle(extractTitleFromText(props.dream?.dream_text))
  return toSentenceCase(t || 'Без названия')
})

const displayTags = computed(() => {
  const tags = props.dream?.deep_source?.tags
  if (!Array.isArray(tags)) return []
  const normalize = (s:string) => {
    let t = String(s||'').trim()
    // отрезаем по первой скобке/знаку: скобки, запятая, слэш, тире, двоеточие, точка с запятой
    t = t.split(/[\\/,(;:—–-]/)[0]?.trim() || ''
    if (!t) return ''
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  }
  return tags.map(normalize).filter(Boolean).slice(0,5)
})

// Форматирование анализа с подзаголовками
function sanitize(text:string){
  return String(text||'')
    .replace(/^```[\s\S]*?\n/, '')
    .replace(/```$/,'')
    // удаляем числовые ссылки вида (1), (2) и т.п.
    .replace(/\(\s*\d+\s*\)/g, '')
    // удаляем ссылки вида [1]
    .replace(/\s\[\s*\d+\s*\]/g, '')
    // удаляем надстрочные цифры ¹²³⁴…⁹
    .replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]/g, '')
}

// Deep analysis helpers
const deepTab = ref<'context'|'dynamics'|'conclusions'|'recommendations'>('context')
const deepText = computed(()=> sanitize(props.dream?.analysis || ''))

// New structured data accessors
const overallContext = computed(() => props.dream?.deep_source?.overallContext || {})
const hasOverallContext = computed(() => {
  const ctx = overallContext.value
  return !!(ctx?.narrative || ctx?.psychologicalFunction || ctx?.emotionalJourney)
})

const symbolsIntro = computed(() => props.dream?.deep_source?.symbolsIntro || '')

const recurringSymbols = computed(() => {
  const symbols = props.dream?.deep_source?.recurringSymbols
  return Array.isArray(symbols) ? symbols : []
})

// Filter symbols to show only those appearing in 2+ dreams
const filteredRecurringSymbols = computed(() => {
  return recurringSymbols.value.filter(s => s.frequency >= 2)
})

const hasRecurringSymbols = computed(() => filteredRecurringSymbols.value.length > 0)

// New dynamics context with analysis and insights
const dynamicsContext = computed(() => {
  const dynamics = props.dream?.deep_source?.dynamicsContext
  return Array.isArray(dynamics) ? dynamics : []
})
const hasDynamicsContext = computed(() => dynamicsContext.value.length > 0)

// New conclusion structure
const conclusion = computed(() => props.dream?.deep_source?.conclusion || {})
const hasConclusion = computed(() => {
  const c = conclusion.value
  return !!(c?.periodThemes || c?.dreamFunctionsAnalysis || c?.psychologicalSupport || c?.integrationExercise)
})

const newDynamics = computed(() => {
  const dynamics = props.dream?.deep_source?.dynamics
  return Array.isArray(dynamics) && dynamics.length > 0 ? dynamics : []
})
const hasNewDynamics = computed(() => newDynamics.value.length > 0)

const conclusions = computed(() => {
  const concl = props.dream?.deep_source?.conclusions
  return Array.isArray(concl) && concl.length > 0 ? concl : []
})
const hasConclusions = computed(() => conclusions.value.length > 0)

const recommendations = computed(() => {
  const recs = props.dream?.deep_source?.recommendations
  if (Array.isArray(recs) && recs.length > 0 && typeof recs[0] === 'object') {
    // New structured format with title, description, rationale
    return recs
  }
  // Fallback to old simple array format or HVdC-based recommendations
  if (Array.isArray(recs) && recs.length > 0) {
    return recs.map((r, idx) => ({
      title: `Рекомендация ${idx + 1}`,
      description: String(r),
      rationale: ''
    }))
  }
  // HVdC-based fallback
  const series = trendSeries.value
  if (series.length === 0) return []
  const avg = [0,0,0,0]
  for(const v of series){ for(let i=0;i<4;i++) avg[i]+=v[i] }
  const n = Math.max(1, series.length)
  for(let i=0;i<4;i++) avg[i]=Math.round(avg[i]/n)
  const pairs = [
    ['Персонажи','Обрати внимание на отношения и роли; практикуй честную коммуникацию.'],
    ['Эмоции','Добавь ежедневную регуляцию эмоций (дыхание, дневник, прогулка).'],
    ['Действия','Определи 1 маленький шаг на неделю и заверши его.'],
    ['Сцены','Проверь границы и режим: место/время, где тебе спокойнее.']
  ]
  const order = avg.map((v,i)=>({i,v})).sort((a,b)=>b.v-a.v).map(o=>o.i)
  return [
    { title: pairs[order[0]][0], description: pairs[order[0]][1], rationale: '' },
    { title: pairs[order[1]][0], description: pairs[order[1]][1], rationale: '' }
  ]
})
const hasRecommendations = computed(() => recommendations.value.length > 0)
function highlightSymbols(text:string, tags:string[]){
  try{
    let t = text
    const uniq = Array.from(new Set((tags||[]).filter(Boolean))).sort((a,b)=>b.length-a.length)
    for(const raw of uniq){
      const key = String(raw).split(/[\\/,(;:—–-]/)[0]?.trim()
      if(!key) continue
      const re = new RegExp(`(\b${key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\b)`, 'gi')
      t = t.replace(re, '<mark class="bg-white/20 px-1 rounded">$1</mark>')
    }
    return t.replace(/\n\n+/g,'</p><p class="mt-2">').replace(/\n/g,'<br>').replace(/^(.+)$/,'<p>$1')
  }catch{ return text }
}
const deepContextHtml = computed(()=> highlightSymbols(deepText.value, props.dream?.deep_source?.tags || []))

// HVdC trend across last 5 regular dreams before this deep analysis
function parseDate(s:string){ try{ return new Date(s).getTime()||0 }catch{ return 0 } }
const regularWithHvdc = computed(()=> (userStore.history||[])
  .filter((d:any)=>!d.is_deep_analysis && d?.deep_source?.hvdc && d?.created_at)
  .sort((a:any,b:any)=> parseDate(a.created_at) > parseDate(b.created_at) ? -1 : 1))
const trendSeries = computed(()=>{
  const cutoff = parseDate(props.dream?.created_at||'')
  const arr = regularWithHvdc.value.filter((d:any)=> !isDeep.value || (cutoff ? parseDate(d.created_at) <= cutoff : true)).slice(0,5).reverse()
  const cat = ['characters','emotions','actions','settings'] as const
  return arr.map((d:any)=> cat.map(k=> Number(d.deep_source.hvdc?.distribution?.[k]||0)))
})
const trendCount = computed(()=> trendSeries.value.length)
const trendReady = computed(()=> trendCount.value >= 2)
const chartH = 48
const chartW = computed(()=> Math.max(60, (trendCount.value-1)*28 + 8))
function toPoints(vals:number[]){
  const n = vals.length; const w = chartW.value; const h = chartH
  const step = n>1 ? (w-8)/ (n-1) : 0
  const pts = [] as {x:number,y:number}[]
  for(let i=0;i<n;i++){
    const x = i*step
    const y = h - Math.round((vals[i]/100)*h)
    pts.push({x, y})
  }
  const str = pts.map(p=> `${p.x},${p.y}`).join(' ')
  return { str, pts }
}
const trendRows = computed(()=>{
  const cats = [
    { key:'characters', label:'Персонажи', idx:0, opacity:0.95 },
    { key:'emotions',   label:'Эмоции',    idx:1, opacity:0.75 },
    { key:'actions',    label:'Действия',  idx:2, opacity:0.55 },
    { key:'settings',   label:'Сцены',     idx:3, opacity:0.35 }
  ] as const
  const rows:any[] = []
  const series = trendSeries.value
  for(const c of cats){
    const values = series.map(v=> v[c.idx] )
    const { str, pts } = toPoints(values)
    rows.push({ key:c.key, label:c.label, values, points:str, pointList:pts, opacity:c.opacity })
  }
  return rows
})

// HVdC dynamics converted to DynamicsChart format
const hvdcDynamics = computed(() => {
  if (!trendReady.value) return []
  
  // Use dynamicsContext if available (new format with analysis/insight)
  if (hasDynamicsContext.value) {
    return dynamicsContext.value.map(d => ({
      metric: d.category || d.metric,
      values: d.values || [],
      interpretation: d.analysis || d.interpretation || '',
      insight: d.insight || ''
    }))
  }
  
  // Fallback to HVdC data (old format)
  const cats = [
    { key: 'characters', label: 'Персонажи', idx: 0 },
    { key: 'emotions', label: 'Эмоции', idx: 1 },
    { key: 'actions', label: 'Действия', idx: 2 },
    { key: 'settings', label: 'Сцены', idx: 3 }
  ]
  
  const series = trendSeries.value
  return cats.map(cat => ({
    metric: cat.label,
    values: series.map(v => v[cat.idx]),
    interpretation: `Динамика "${cat.label}" по последним ${trendCount.value} снам`
  }))
})

// Extract insights from deep analysis text
function extractBullets(text: string) {
  const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean)
  const bullets = lines.filter(l => /^\d+\./.test(l)).map(l => l.replace(/^\d+\.\s*/, '')).slice(0, 3)
  if (bullets.length) return bullets
  // fallback: first sentences
  return text.split(/[.!?]\s+/).map(s => s.trim()).filter(Boolean).slice(0, 3)
}
const insights = computed(() => extractBullets(deepText.value))

// Legacy recommendations (already handled by structured data above)
// Fallback to HVdC-based recommendations if no structured data

function heuristicDreamType(text:string|undefined|null){
  try{
    const s = String(text||'').toLowerCase()
    const count = (arr:string[])=>arr.reduce((a,k)=>a+(s.includes(k)?1:0),0)
    const emotion = ['страх','ужас','паник','тревог','стыд','гнев','плак','слез','кошмар','тоска','грусть']
    const anticip = ['экзам','выступл','собесед','защит','проект','подготов','завтра','ожидан','волнен','поездк','путешеств','нов','интервью']
    const memory  = ['вчера','сегодня','работ','школ','универ','дом','улиц','друг','родител','коллег','город']
    const e=count(emotion), a=count(anticip), m=count(memory)
    let es=e>0?Math.min(1,e/3):0, as=a>0?Math.min(1,a/3):0, ms=m>0?Math.min(1,0.5+m/5):0
    if(es===0&&as===0&&ms===0){ ms=0.6; es=0.2; as=0.2 }
    const pack={ schema:'dream_type_v1', scores:{ memory:+ms.toFixed(2), emotion:+es.toFixed(2), anticipation:+as.toFixed(2) } }
    const arr=[['memory',pack.scores.memory],['emotion',pack.scores.emotion],['anticipation',pack.scores.anticipation]] as [string,number][]
    arr.sort((x,y)=>y[1]-x[1])
    const conf=+(Math.max(0,(arr[0][1]-arr[1][1])).toFixed(2))
    return { ...pack, dominant:arr[0][0], confidence:conf }
  }catch{return null}
}

const dreamType = computed(()=> props.dream?.deep_source?.dream_type || heuristicDreamType(props.dream?.dream_text) || null)

function buildWorkHtml(){
  const dt = dreamType.value
  const type = dt?.dominant ? String(dt.dominant).toLowerCase() : null
  
  // Определяем контент в зависимости от типа сна
  let emoji = '💭'
  let title = 'Функциональное упражнение'
  let description = 'Работа со сном для интеграции опыта'
  let exercise1Title = 'Заметь'
  let exercise1Text = 'Какие 2–3 образа из сна самые сильные? Запиши их коротко.'
  let exercise2Title = 'Шаг'
  let exercise2Text = 'Выбери один маленький шаг в реальности, который поддержит тебя по теме сна.'
  
  if (type === 'memory') {
    emoji = '🌙'
    title = 'Сон-Память'
    description = 'Переработка недавнего опыта, соединение нового с прошлым'
    exercise1Title = 'Отрази'
    exercise1Text = 'Вспомни, что происходило последние 1–2 дня. Какие события могли попасть в сон?'
    exercise2Title = 'Соедини'
    exercise2Text = 'Отметь, какие элементы сна перекликаются с реальностью — это завершает «архивацию» опыта.'
  } else if (type === 'emotion') {
    emoji = '⚡️'
    title = 'Сон-Эмоция'
    description = 'Проживание и нейтрализация сильных чувств'
    exercise1Title = 'Почувствуй'
    exercise1Text = 'Определи, какая эмоция была самой сильной во сне. Где она чувствуется в теле сейчас?'
    exercise2Title = 'Услышь'
    exercise2Text = 'Представь, что главный персонаж сна говорит тебе что-то. Что он хочет, чтобы ты понял?'
  } else if (type === 'anticipation') {
    emoji = '🔮'
    title = 'Сон-Предвосхищение'
    description = 'Тренировка будущих ситуаций и реакций'
    exercise1Title = 'Представь'
    exercise1Text = 'Как бы ты хотел повести себя, если бы это произошло в реальности?'
    exercise2Title = 'Расшифруй'
    exercise2Text = 'Какой символ кажется ключевым? Что он может говорить о твоих страхах или намерениях?'
  }
  
  // Генерируем HTML со структурой из трёх блоков
  return [
    '<div class="space-y-4">',
    // Блок 1: Описание
    '<div class="bg-white/10 rounded-xl p-4 space-y-2">',
    `<div class="flex items-center gap-2"><span class="text-2xl">${emoji}</span><span class="font-bold text-xl">${title}</span></div>`,
    `<p class="text-base opacity-90 leading-snug">${description}</p>`,
    '</div>',
    // Блок 2: Первое упражнение
    '<div class="bg-white/10 rounded-xl p-4 space-y-2">',
    `<div class="flex items-center gap-2"><span class="text-2xl">✏️</span><span class="font-bold text-xl">${exercise1Title}</span></div>`,
    `<p class="text-base opacity-90 leading-snug">${exercise1Text}</p>`,
    '</div>',
    // Блок 3: Второе упражнение
    '<div class="bg-white/10 rounded-xl p-4 space-y-2">',
    `<div class="flex items-center gap-2"><span class="text-2xl">🎯</span><span class="font-bold text-xl">${exercise2Title}</span></div>`,
    `<p class="text-base opacity-90 leading-snug">${exercise2Text}</p>`,
    '</div>',
    '</div>'
  ].join('')
}

const sections = computed(() => {
  const raw = sanitize(props.dream?.analysis || '')
  if (!raw) return [] as any[]
  const map: Record<string,{key:string,title:string,text:string}> = {
    arch: { key:'arch', title:'Архетипическая история', text:'' },
    func: { key:'func', title:'Возможная функция сна', text:'' },
    freud:{ key:'freud',title:'По Фрейду', text:'' },
    jung: { key:'jung', title:'По Юнгу', text:'' }
  }
  const parts: {title:string; start:number; end:number}[] = []
  const re = /\*\*([^*]+)\*\*/g
  let m
  while((m=re.exec(raw))){ parts.push({ title:m[1].trim(), start:m.index, end: m.index + m[0].length }) }
  // Арха до первого **
  const firstStart = parts[0]?.start ?? raw.length
  map.arch.text = raw.slice(0, firstStart).trim()
  for(let i=0;i<parts.length;i++){
    const t = parts[i].title.toLowerCase()
    const body = raw.slice(parts[i].end, parts[i+1]?.start ?? raw.length).trim()
    if (t.includes('возможная функция')) map.func.text = body
    else if (t.includes('по фрейду')) map.freud.text = body
    else if (t.includes('по юнгу')) map.jung.text = body
  }
  const toHtml = (txt:string) => txt
    .replace(/\n\n+/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/, '<p>$1')
  const res = Object.values(map).map(s=>({ ...s, html: toHtml(s.text||'') }))
  // Гарантируем наличие секции «Возможная функция сна», даже если парсинг не нашёл заголовок
  if (!res.some(s=>s.key==='func')) {
    res.push({ key:'func', title:'Возможная функция сна', text:'', html:'' } as any)
  }
  // Вставляем таб «Контент анализ» (HVdC) сразу под архетипической историей
  const archIdx = res.findIndex(s=>s.key==='arch')
  if (archIdx !== -1) {
    res.splice(archIdx + 1, 0, { key:'hvdc', title:'Контент анализ', text:'', html:'' } as any)
  }
  // Добавляем «Поработай со сном» ВНУТРЬ секции «Возможная функция сна», если есть тип сна
  const workHtml = buildWorkHtml()
  if (workHtml) {
    const funcIdx = res.findIndex(s=>s.key==='func')
    if (funcIdx !== -1) {
      const wrapper = [
        '<div class="mt-3 pt-2 border-t border-white/10 space-y-1">',
        '<div class="font-semibold">Функциональное упражнение</div>',
        workHtml,
        '</div>'
      ].join('')
      res[funcIdx].html = (res[funcIdx].html || '') + wrapper
    }
  }
  return res
})

const expanded = reactive<Record<string,boolean>>({ 
  arch:true, hvdc:false, func:false, freud:false, jung:false,
  symbols:true, dynamics:true, conclusion:true,  // New deep analysis blocks - open by default
  dreamText: false,  // Dream text collapsed by default (show 3 lines)
  funcExercise: false  // Functional exercise collapsed by default
})
function toggleSection(key:string){ expanded[key] = !expanded[key] }

// Helper functions for restructured analysis
function sanitizeFuncHtml(html: string): string {
  // Remove functional exercise block from func html (we show it separately)
  const exerciseStart = html.indexOf('<div class="mt-3 pt-2 border-t')
  if (exerciseStart === -1) return html
  return html.substring(0, exerciseStart)
}

function getFuncExercise(html: string): string {
  // Extract functional exercise block from func html, removing title
  const exerciseStart = html.indexOf('<div class="mt-3 pt-2 border-t')
  if (exerciseStart === -1) return ''
  let content = html.substring(exerciseStart, html.lastIndexOf('</div>') + 6)
  // Remove the repeated "Функциональное упражнение" title inside
  content = content.replace(/<div class="font-semibold">Функциональное упражнение<\/div>/g, '')
  return content
}

// Debug output helpers (visible when ?debug=1 or localStorage.da_debug=1)
const debugEnabled = computed(() => {
  try {
    const q = new URLSearchParams(window.location.search)
    return q.get('debug') === '1' || localStorage.getItem('da_debug') === '1'
  } catch { return false }
})
function copyDebug(){
  try{
    const txt = JSON.stringify(debugPayload.value, null, 2)
    navigator.clipboard?.writeText(txt)
    notificationStore?.success?.('Скопировано')
  }catch(e){
    try{ window.Telegram?.WebApp?.showPopup?.({title:'Debug',message:'Скопируйте из блока ниже вручную',buttons:[{id:'ok',type:'default',text:'OK'}]}) }catch(_){ }
  }
}
function normalizeTagDebug(s:string){
  let t = String(s||'').trim(); t = t.split(/[\\/,(;:—–-]/)[0]?.trim() || ''
  if (!t) return ''
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}
const debugPayload = computed(()=>{
  if (!debugEnabled.value) return null
  const d:any = props.dream || {}
  const tagsRaw = Array.isArray(d?.deep_source?.tags) ? d.deep_source.tags : []
  return {
    id: d.id,
    created_at: d.created_at,
    is_deep_analysis: !!d.is_deep_analysis,
    title_raw: d?.deep_source?.title || null,
    tags_raw: tagsRaw,
    tags_norm: tagsRaw.map(normalizeTagDebug),
    dream_type: d?.deep_source?.dream_type || null,
    hvdc_present: !!d?.deep_source?.hvdc
  }
})

// Demographics dialog
const showDemo = ref(false)
const demoStep = ref(1)
const ages = ['0-20','20-30','30-40','40-50','50+']
const age = ref('')
const gender = ref('')
function openDemographics(){ showDemo.value = true; demoStep.value=1; age.value=''; gender.value='' }
function closeDemographics(){ showDemo.value = false }
async function saveDemographics(){
  try {
    await api.setDemographics(age.value, gender.value)
    try { await userStore.fetchProfile() } catch(_) {}
    notificationStore.success('Готово! Дальнейшие анализы будут учитывать эти данные')
    showDemo.value = false
  } catch(e){ notificationStore.error('Не удалось сохранить') }
}

const hasDemographics = computed(()=>{
  const p = userStore.profile || {}
  return !!(p.age_range && p.gender)
})

const hvdc = computed(()=> props.dream?.deep_source?.hvdc || null)
const hvdcRows = computed(()=>{
  const map = [
    { key:'characters', label:'Персонажи' },
    { key:'emotions',   label:'Эмоции' },
    { key:'actions',    label:'Действия' },
    { key:'settings',   label:'Сцены' }
  ]
  const dist = hvdc.value?.distribution || {}
  const norm = hvdc.value?.norm || null
  const cmp  = hvdc.value?.comparison || null
  return map.map(m=>({
    key: m.key,
    label: m.label,
    value: Number(dist[m.key] ?? 0),
    norm: norm ? Number(norm[m.key] ?? 0) : null,
    delta: cmp ? Number(cmp[m.key] ?? 0) : null
  }))
})

const hvdcLegend = computed(()=>{
  const g = hvdc.value?.norm_group || null
  if (!g) return 'общая статистика'
  const gender = String(g.gender || '').toLowerCase()
  const gShort = gender === 'male' ? 'муж.' : (gender === 'female' ? 'жен.' : '')
  const age = g.age_range || ''
  const ageText = age ? `${age} лет` : ''
  const tail = [gShort, ageText].filter(Boolean).join(' ')
  return tail ? `общая статистика* для ${tail}` : 'общая статистика'
})

function ruPlural(n:number, forms:[string,string,string]){
  const nAbs = Math.abs(n) % 100
  const n1 = nAbs % 10
  if (nAbs > 10 && nAbs < 20) return forms[2]
  if (n1 > 1 && n1 < 5) return forms[1]
  if (n1 === 1) return forms[0]
  return forms[2]
}
const relativeDate = computed(() => {
  if (!props.dream.created_at) return ''
  try {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || dayjs.tz.guess()
    const date = dayjs.utc(props.dream.created_at).tz(userTz).startOf('day')
    const now = dayjs().tz(userTz).startOf('day')
    const diffDays = now.diff(date, 'day')
    if (diffDays === 0) return 'сегодня'
    if (diffDays === 1) return 'вчера'

    if (diffDays < 7) {
      const unit = ruPlural(diffDays, ['день','дня','дней'])
      return `${diffDays} ${unit} назад`
    }
    const diffWeeks = Math.floor(diffDays / 7)
    if (diffDays < 30) {
      const unit = ruPlural(diffWeeks, ['неделя','недели','недель'])
      return `${diffWeeks} ${unit} назад`
    }
    const diffMonths = Math.floor(diffDays / 30)
    if (diffDays < 365) {
      const unit = ruPlural(diffMonths, ['месяц','месяца','месяцев'])
      return `${diffMonths} ${unit} назад`
    }
    const diffYears = Math.floor(diffDays / 365)
    const unit = ruPlural(diffYears, ['год','года','лет'])
    return `${diffYears} ${unit} назад`
  } catch (e) {
    return props.dream.created_at
  }
})

const fullDate = computed(() => {
  const created = props.dream?.created_at
  if (!created) return ''
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || dayjs.tz.guess()
    return dayjs.utc(created).tz(tz).format('D MMMM YYYY, HH:mm')
  } catch { return created }
})

// Градиент карточки с цветовой кодировкой по типу сна
const gradientClass = computed(() => {
  // Deep analysis: purple (as before)
  if (props.dream?.is_deep_analysis) {
    return 'from-[#9C41FF] to-[#C03AFF]'
  }
  
  // Regular dreams: color-coded by dream type
  const dt = dreamType.value
  if (!dt || !dt.dominant) {
    // Default blue for unknown type
    return 'from-[#4A58FF] to-[#5664FF]'
  }
  
  const type = String(dt.dominant).toLowerCase()
  
  // Emotion dreams: red gradient (fading to right)
  if (type === 'emotion') {
    return 'from-[#FF4A4A] via-[#FF6B6B]/80 to-[#FF8A8A]/40'
  }
  
  // Memory dreams: yellow/amber gradient (fading to right)
  if (type === 'memory') {
    return 'from-[#FFB84A] via-[#FFC966]/80 to-[#FFDA82]/40'
  }
  
  // Anticipation dreams: blue gradient (fading to right)
  if (type === 'anticipation') {
    return 'from-[#4A9FFF] via-[#6BB3FF]/80 to-[#8AC7FF]/40'
  }
  
  // Fallback to default blue
  return 'from-[#4A58FF] to-[#5664FF]'
})
</script>

<style scoped>
.clamp-5 {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Force white text on gradient backgrounds - overrides theme */
article.bg-gradient-to-br h2,
article.bg-gradient-to-br h3,
article.bg-gradient-to-br h4,
article.bg-gradient-to-br p,
article.bg-gradient-to-br div,
article.bg-gradient-to-br span,
article.bg-gradient-to-br button {
  color: white !important;
}
</style>
