<template>
  <!-- Полноэкранная по краям (full-bleed) дорожка, без внутренних паддингов -->
  <section class="relative -mx-4 sm:-mx-6 md:-mx-8 mb-0">
    <Swiper
      :modules="modules"
      slides-per-view="auto"
      :spaceBetween="gapSize"
      :centeredSlides="true"
      :centeredSlidesBounds="true"
      :autoplay="autoplay"
      :keyboard="{ enabled: true }"
      :a11y="{ enabled: true }"
      :observer="true"
      :observe-parents="true"
      :watch-overflow="true"
      :speed="650"
      @init="onInit"
      class="w-screen"
      :style="{ height: maxCardHeight + 'px', paddingLeft: edgeOffset + 'px', paddingRight: edgeOffset + 'px' }"
    >
      <SwiperSlide
        v-for="(fact, idx) in facts"
        :key="fact.id"
        ref="cardRefs"
        class="card-slide rounded-xl overflow-hidden bg-gradient-to-br from-[#6A4DFF] to-[#9A3CFF] text-white p-8 flex flex-col justify-between will-change-transform w-auto flex-shrink-0"
        :class="{ 'card-expandable': fact.expandable }"
        :style="{ height: maxCardHeight + 'px', width: slideWidthPx + 'px' }"
        @click="fact.expandable ? openCard(fact) : null"
      >
        <div class="mb-4 flex items-center justify-between">
          <span class="fact-badge" :class="`fact-badge--${getBadgeType(fact.type)}`">
            {{ getBadgeLabel(fact.type) }}
          </span>
          <!-- Expand indicator for expandable cards -->
          <span v-if="fact.expandable" class="expand-indicator" aria-label="Развернуть">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </span>
        </div>
        <p class="text-base leading-snug opacity-95">{{ fact.text }}</p>
      </SwiperSlide>
    </Swiper>

    <!-- Full-screen overlay for expandable cards -->
    <Transition name="card-expand">
      <div v-if="expandedCard" class="card-overlay" @click.self="closeCard">
        <div class="card-overlay-sheet" @click.stop>
          <div class="card-overlay-handle"></div>
          <div class="card-overlay-header">
            <span class="fact-badge" :class="`fact-badge--${getBadgeType(expandedCard.type)}`">
              {{ getBadgeLabel(expandedCard.type) }}
            </span>
            <button class="card-overlay-close" @click="closeCard" aria-label="Закрыть">✕</button>
          </div>
          <div class="card-overlay-title" v-if="expandedCard.title">{{ expandedCard.title }}</div>
          <div class="card-overlay-body">{{ expandedCard.fullText || expandedCard.text }}</div>
          <div v-if="expandedCard.source" class="card-overlay-source">
            Источник: {{ expandedCard.source }}
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { A11y, Keyboard, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/autoplay'

const modules = [A11y, Keyboard, Autoplay]
const autoplay = { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: false, stopOnLastSlide: false, reverseDirection: false }
const gapSize = 8

const cardRefs = ref<any[]>([])
const maxCardHeight = ref(224)
const swiperInstance = ref<any>(null)
const slideWidthPx = ref<number>(Math.round(window.innerWidth * 0.86))
const edgeOffset = ref<number>(Math.max(0, Math.round((window.innerWidth - slideWidthPx.value) / 2)))

// Expanded card state
const expandedCard = ref<any>(null)

const openCard = (fact: any) => {
  expandedCard.value = fact
  if ((window as any).triggerHaptic) (window as any).triggerHaptic('light')
  // Pause autoplay while overlay is open
  swiperInstance.value?.autoplay?.stop()
  // Show Telegram back button
  try {
    const tg = (window as any)?.Telegram?.WebApp
    tg?.BackButton?.show?.()
    tg?.BackButton?.onClick?.(() => closeCard())
  } catch (_) {}
}

const closeCard = () => {
  expandedCard.value = null
  swiperInstance.value?.autoplay?.start()
  try {
    const tg = (window as any)?.Telegram?.WebApp
    tg?.BackButton?.hide?.()
  } catch (_) {}
}

const getBadgeType = (type: string) => {
  if (type === 'Факт') return 'fact'
  if (type === 'Символ') return 'symbol'
  if (type === 'Миф') return 'myth'
  return 'fact'
}

const getBadgeLabel = (type: string) => {
  if (type === 'Факт') return '🔬 Факт'
  if (type === 'Символ') return '🌀 Символ'
  if (type === 'Миф') return '💭 Миф'
  return type
}

// Simple cards (no expandable) + expandable cards with fullText
const facts = ref([
  {
    id: 1, type: 'Факт', text: 'Большинство снов забываются в течение первых 5-10 минут после пробуждения.',
    expandable: true,
    title: 'Почему мы забываем сны?',
    fullText: 'Забывание снов — это не случайность, а биологический механизм. Во время REM-сна гиппокамп — область мозга, ответственная за перенос воспоминаний — работает иначе, чем при бодрствовании. Нейромедиатор норэпинефрин, необходимый для формирования долгосрочных воспоминаний, почти не вырабатывается в этой фазе.\n\nПервые 5–10 минут после пробуждения — критическое окно. Если сразу взяться за телефон или поговорить, образы сна вытесняются. Исследования показывают, что те, кто ведёт дневник снов, начинают помнить их значительно лучше уже через 2–3 недели практики.\n\nЭффективный способ запомнить сон — не двигаться сразу после пробуждения, остаться в той же позе и мысленно "прокрутить" образы. Только после этого записать. Мозг буквально переобучается фиксировать сновидения.',
    source: 'Hobson & McCarley, "The Brain as a Dream State Generator" (1977)'
  },
  {
    id: 2, type: 'Символ', text: 'Полет во сне — ощущение свободы или побег от проблем.',
    expandable: true,
    title: 'Полёт во сне',
    fullText: 'Полёт во сне — один из самых распространённых сюжетов. Юнгианская психология связывает его с желанием выйти за пределы обыденного и обрести контроль над жизнью. Часто такие сны случаются в периоды больших перемен или стресса. Если полёт лёгкий — это признак уверенности в себе. Если трудный или страшный — возможно, вы чувствуете себя перегруженным.',
    source: 'Jung, "Man and His Symbols" (1964)'
  },
  {
    id: 3, type: 'Факт', text: 'Слепые от рождения люди видят сны, используя другие чувства: слух, обоняние, осязание.',
    expandable: true,
    title: 'Сны без зрения',
    fullText: 'Для людей, слепых от рождения, сновидения — это богатый мультисенсорный опыт, в котором зрительные образы просто отсутствуют. Вместо них — звуки, тактильные ощущения, запахи и эмоции. Исследование 2014 года (Meaidi et al.) показало, что сны незрячих от рождения так же эмоционально насыщены, как и зрячих, и так же часто включают кошмары.\n\nИнтересно: у людей, потерявших зрение после рождения, зрительные образы сохраняются в снах. Те, кто ослеп в детстве до 5–7 лет, со временем теряют визуальные сны. После 7 лет — образы остаются на всю жизнь.\n\nЭто открытие подтверждает, что мозг при построении снов использует весь доступный сенсорный опыт — и адаптируется под него. Сновидение — это не картинка, а реконструкция всего накопленного опыта.',
    source: 'Meaidi et al., Sleep Medicine (2014)'
  },
  {
    id: 4, type: 'Миф', text: 'Миф: люди снятся только черно-белыми. На самом деле 80% людей видят цветные сны.',
    expandable: true,
    title: 'Цвет снов',
    fullText: 'Исследования 1940-х годов показывали, что большинство снов черно-белые — но в то время чёрно-белое телевидение было нормой. Современные исследования с использованием фМРТ показывают, что мозг активирует цветовые зоны зрительной коры во время REM-сна. Около 80% людей сегодня видят цветные сны. Те, кто вырос с ч/б ТВ, действительно чаще сообщают о монохромных снах.',
    source: 'Murzyn (2008), Consciousness and Cognition'
  },
  {
    id: 5, type: 'Символ', text: 'Вода во сне часто символизирует эмоции, подсознание и внутренние переживания.',
    expandable: true,
    title: 'Вода во сне',
    fullText: 'Вода — один из универсальных архетипических символов в мировой культуре и в снах. В юнгианском анализе вода представляет бессознательное — его глубину, силу и непредсказуемость. Характер воды в сне говорит об эмоциональном состоянии сновидца.\n\nСпокойное море или озеро — гармония, внутренний покой. Бурное море, наводнение — захлёстывающие эмоции, потеря контроля. Грязная мутная вода — непроработанные чувства, замешательство. Чистый ручей — свежие идеи, движение вперёд.\n\nВо многих мифологиях вода символизирует переход между мирами: река Стикс в греческой мифологии, "воды хаоса" в шумерском эпосе. Если вам снится, что вы тонете — это не предсказание гибели, а сигнал о том, что вы чувствуете себя захлёстнутым ситуацией в жизни.\n\nПодсказка: запишите, каким было состояние воды в вашем сне — это ключ к пониманию своего эмоционального фона.',
    source: 'Jung, "The Archetypes and the Collective Unconscious" (1959)'
  },
  {
    id: 6, type: 'Факт', text: 'Люди могут учиться осознанным сновидениям — контролю над своими снами.',
    expandable: true,
    title: 'Осознанные сновидения',
    fullText: 'Осознанное сновидение (lucid dream) — это состояние, когда вы понимаете внутри сна, что спите, и можете влиять на происходящее. Первые научные доказательства его существования получил Стивен Лаберж в Стэнфорде в 1980-х, используя согласованные движения глаз как сигнал из сна.\n\nПо данным исследований, около 55% людей хотя бы раз в жизни переживали осознанное сновидение. Регулярно осознанно сновидят около 23%.\n\nЕсть несколько техник для освоения этого навыка:\n• MILD (Мнемонически индуцированные осознанные сны) — намерение перед сном.\n• WILD (Пробуждение в сновидение) — переход из бодрствования напрямую в сон с сохранением сознания.\n• Дневник снов — осознание паттернов и "триггеров" сновидений.\n• Reality checks — проверка реальности в течение дня (пальцы, текст).\n\nОсознанные сны используются для преодоления ночных кошмаров, творческой практики и даже репетиции навыков.',
    source: 'LaBerge, "Lucid Dreaming" (1985)'
  },
  {
    id: 7, type: 'Миф', text: 'Миф: если умрёшь во сне, умрёшь в реальности.',
    expandable: true,
    title: 'Смерть во сне',
    fullText: 'Этот миф никак не подтверждён научно. Многие люди видят сны о собственной смерти и просыпаются совершенно здоровыми. С точки зрения психологии такой сон чаще символизирует конец одного жизненного этапа и начало нового — не физическую гибель. Архетип "смерти и возрождения" — один из ключевых в юнгианском анализе снов.',
    source: 'Calvin Hall, "The Meaning of Dreams" (1966)'
  },
  {
    id: 8, type: 'Символ', text: 'Падение во сне обычно отражает чувство потери контроля в жизни.',
    expandable: true,
    title: 'Падение во сне',
    fullText: 'Сон о падении — один из самых распространённых и пугающих. Часто он сопровождается резким толчком тела при пробуждении — это явление называется гипнагогический миоклонус (sleep start). Это физиологически нормальная реакция нервной системы при переходе ко сну.\n\nС психологической точки зрения, падение во сне связано с тревогой и чувством потери почвы под ногами. Оно может возникать в периоды нестабильности: смена работы, отношений, переезд, экзамены.\n\nРазные варианты падения несут разные смыслы:\n• Падение с высоты — страх неудачи, завышенные требования к себе.\n• Полёт, переходящий в падение — утрата контроля после периода уверенности.\n• Падение в бездну без дна — экзистенциальная тревога, неопределённость будущего.\n\nЕсли такие сны повторяются — это сигнал: стоит разобраться, в какой сфере жизни вы чувствуете нестабильность.',
    source: 'Hartmann, "The Dream Always Makes New Connections" (1995)'
  },
  {
    id: 9, type: 'Факт', text: 'Во время REM-сна мозг активен почти как в бодрствующем состоянии.',
    expandable: true,
    title: 'Мозг во время REM-сна',
    fullText: 'REM (Rapid Eye Movement) — фаза быстрого сна, во время которой происходит большинство ярких сновидений. Название она получила из-за быстрых движений глаз под закрытыми веками.\n\nВо время REM активность мозга по данным ЭЭГ почти неотличима от бодрствования. Активны зоны, отвечающие за эмоции (амигдала), зрительную обработку и моторное планирование. При этом префронтальная кора — отвечающая за критическое мышление — работает значительно слабее. Именно поэтому во снах мы принимаем абсурдное за реальное.\n\nМышцы тела во время REM парализованы (атония) — защитный механизм, чтобы мы не воспроизводили движения из сна. Нарушение этого механизма называется REM sleep behavior disorder — при нём люди буквально "разыгрывают" сны.\n\nREM-сон критически важен для памяти и обучения: именно в нём мозг консолидирует эмоциональные воспоминания и интегрирует новую информацию.',
    source: 'Walker, "Why We Sleep" (2017)'
  },
  {
    id: 10, type: 'Символ', text: 'Дом во сне часто отражает ваше внутреннее "Я" и чувство безопасности.',
    expandable: true,
    title: 'Дом во сне',
    fullText: 'В символике снов дом — это образ психики. Разные комнаты соответствуют разным аспектам личности: подвал — подсознание и вытесненные страхи, чердак — память и прошлое, спальня — интимная жизнь. Незнакомые комнаты в знакомом доме символизируют нераскрытые потенциалы или стороны личности, которые ещё не исследованы.',
    source: 'Freud, "Interpretation of Dreams" (1900)'
  },
  {
    id: 11, type: 'Факт', text: 'Люди чаще запоминают кошмары из-за сильных эмоций.',
    expandable: true,
    title: 'Почему кошмары запоминаются',
    fullText: 'Кошмары запоминаются лучше приятных снов по той же причине, по которой страх эффективнее радости фиксируется в памяти — это эволюционный механизм выживания. Амигдала (центр эмоциональной обработки) при кошмарах работает на пике активности, выбрасывая норэпинефрин и активируя систему "бей или беги".\n\nРезкое пробуждение в середине кошмара также способствует запоминанию: мозг не успевает "смыть" образы, как при мягком выходе из сна.\n\nНаучно доказано: частые кошмары могут быть признаком стресса, тревожного расстройства или ПТСР. При этом работа с содержанием кошмаров через технику Image Rehearsal Therapy (IRT) — намеренное переписывание финала кошмара в бодрствовании — значительно снижает их частоту.\n\nИнтересный факт: творческие люди сообщают о кошмарах чаще, чем в среднем по популяции — возможно, из-за более богатого воображения и высокой эмоциональной чувствительности.',
    source: 'Levin & Nielsen, "Disturbed Dreaming, Posttraumatic Stress" (2007)'
  },
  {
    id: 12, type: 'Символ', text: 'Животные во сне символизируют инстинкты и скрытые стороны личности.',
    expandable: true,
    title: 'Животные во сне',
    fullText: 'В аналитической психологии Юнга животные в снах — это проявления "Тени" или инстинктивной части психики, которая не получает выражения в повседневной жизни. Каждое животное несёт свою символику, укоренённую в мифологии и архетипах.\n\nВолк — агрессия, дикая природа, но и верность стае. Змея — мудрость, трансформация, скрытая угроза или исцеление (символ медицины — кадуцей). Лев — сила, власть, уверенность в себе. Бабочка — трансформация, легкость, краткосрочность. Паук — творчество (создаёт сеть), но и манипуляция, ловушки.\n\nЕсли вас преследует животное во сне — это не обязательно угроза извне. Это может быть та часть вас самих, которую вы отвергаете или боитесь принять. Подружиться с "хищником" во сне — архетипический образ интеграции Тени.\n\nАнализируя сон с животным, спросите себя: что это существо для меня значит? Какое качество оно воплощает — и как оно выражается (или подавляется) в моей жизни?',
    source: 'Jung, "Man and His Symbols" (1964)'
  }
])

const calcMaxHeight = () => {
  nextTick(() => {
    if (cardRefs.value.length) {
      const heights = cardRefs.value.map(c => c?.$el?.offsetHeight || 224)
      maxCardHeight.value = Math.max(224, ...heights)
    }
  })
}

const onInit = (swiper: any) => {
  swiperInstance.value = swiper
  calcMaxHeight()
  requestAnimationFrame(() => swiper.slideTo(swiper.activeIndex, 0, false))
}

const measureUserCardWidth = () => {
  try {
    const firstBlock = document.querySelector('main section.account-block');
    const userCard = firstBlock?.querySelector('article') as HTMLElement | null;
    const w = userCard?.getBoundingClientRect().width;
    if (w && w > 0) {
      slideWidthPx.value = Math.round(w);
      edgeOffset.value = Math.max(0, Math.round((window.innerWidth - slideWidthPx.value) / 2));
    }
  } catch {}
}

const handleResize = () => {
  calcMaxHeight()
  if (swiperInstance.value) {
    swiperInstance.value.update()
    swiperInstance.value.slideTo(swiperInstance.value.activeIndex, 0, false)
  }
}

onMounted(() => {
  calcMaxHeight()
  measureUserCardWidth()
  window.addEventListener('resize', calcMaxHeight)
  window.addEventListener('resize', measureUserCardWidth)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', calcMaxHeight)
  window.removeEventListener('resize', measureUserCardWidth)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
:deep(.swiper) { margin-bottom: 0 !important; padding-bottom: 0 !important; }
:deep(.swiper-wrapper) { margin-bottom: 0 !important; transition-timing-function: ease-in-out !important; }

/* Expandable card cursor */
.card-expandable { cursor: pointer; position: relative; }
.card-expandable:active { opacity: 0.92; transform: scale(0.985); transition: transform 0.12s ease; }

/* Expand indicator icon */
.expand-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(255,255,255,0.18);
  border-radius: 8px;
  color: rgba(255,255,255,0.85);
  flex-shrink: 0;
}

/* Badges */
.fact-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.fact-badge--fact   { background: rgba(59, 130, 246, 0.25); color: #93c5fd; border: 1px solid rgba(59,130,246,0.3); }
.fact-badge--symbol { background: rgba(167, 139, 250, 0.25); color: #c4b5fd; border: 1px solid rgba(167,139,250,0.3); }
.fact-badge--myth   { background: rgba(251, 191, 36, 0.2); color: #fcd34d; border: 1px solid rgba(251,191,36,0.3); }

/* Full-screen overlay */
.card-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
}

.card-overlay-sheet {
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  background: rgba(22, 12, 58, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px 20px 0 0;
  padding: 0 0 48px;
  display: flex;
  flex-direction: column;
}

.card-overlay-handle {
  width: 36px;
  height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  margin: 12px auto 0;
}

.card-overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
}

.card-overlay-close {
  background: rgba(255,255,255,0.12);
  border: none;
  color: rgba(255,255,255,0.7);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-overlay-title {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  padding: 8px 20px 4px;
  line-height: 1.3;
}

.card-overlay-body {
  font-size: 15px;
  line-height: 1.7;
  color: rgba(255,255,255,0.9);
  padding: 12px 20px;
}

.card-overlay-source {
  font-size: 12px;
  color: rgba(255,255,255,0.45);
  padding: 0 20px;
  font-style: italic;
}

/* Slide-up animation */
.card-expand-enter-active {
  animation: overlay-in 0.32s cubic-bezier(0.32, 0, 0.08, 1) both;
}
.card-expand-leave-active {
  animation: overlay-out 0.24s cubic-bezier(0.4, 0, 1, 1) both;
}
@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes overlay-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
.card-expand-enter-active .card-overlay-sheet {
  animation: sheet-slide-up 0.32s cubic-bezier(0.32, 0, 0.08, 1) both;
}
.card-expand-leave-active .card-overlay-sheet {
  animation: sheet-slide-down 0.24s cubic-bezier(0.4, 0, 1, 1) both;
}
@keyframes sheet-slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes sheet-slide-down {
  from { transform: translateY(0); }
  to   { transform: translateY(100%); }
}
</style>
