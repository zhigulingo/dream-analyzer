<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-sheet">
      <!-- Handle bar -->
      <div class="handle-bar"></div>

      <!-- Header -->
      <div class="modal-header">
        <div class="tokens-badge">
          <span class="tokens-badge-icon">🪙</span>
          <span class="tokens-badge-count">{{ userStore.profile?.tokens ?? 0 }}</span>
          <span class="tokens-badge-label">токенов</span>
        </div>
        <button class="close-btn" @click="emit('close')" aria-label="Закрыть">✕</button>
      </div>

      <!-- Tab switcher -->
      <div class="tab-switcher">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'buy' }"
          @click="activeTab = 'buy'"
        >
          💳 Купить
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'free' }"
          @click="activeTab = 'free'"
        >
          🎁 Бесплатно
        </button>
      </div>

      <!-- Tab: Buy tokens -->
      <div v-if="activeTab === 'buy'" class="tab-content">
        <div class="section-title">Выбери количество токенов</div>

        <!-- Token packages -->
        <div class="packages-grid">
          <label
            v-for="pkg in tokenPackages"
            :key="pkg.tokens"
            class="package-card"
            :class="{ selected: selectedPackage?.tokens === pkg.tokens, popular: pkg.popular }"
          >
            <input type="radio" name="package" :value="pkg" v-model="selectedPackage" style="display:none" />
            <span v-if="pkg.popular" class="popular-badge">Популярное</span>
            <div class="package-tokens">{{ pkg.tokens }}</div>
            <div class="package-token-label">токенов</div>
            <div class="package-price">{{ pkg.stars }} ⭐</div>
            <div class="package-per-token">{{ (pkg.stars / pkg.tokens).toFixed(1) }} ⭐/анализ</div>
          </label>
        </div>

        <!-- What's included -->
        <div class="features-block">
          <div class="features-item">
            <span class="features-check">✓</span>
            <span>Каждый токен — 1 полный анализ сна</span>
          </div>
          <div class="features-item">
            <span class="features-check">✓</span>
            <span>Символы, эмоции и интерпретация</span>
          </div>
          <div class="features-item">
            <span class="features-check">✓</span>
            <span>Токены не сгорают — используй когда удобно</span>
          </div>
        </div>

        <div class="pay-hint">Оплата через Telegram Stars — безопасно и мгновенно</div>

        <!-- Pay button -->
        <button
          class="pay-btn"
          :disabled="!selectedPackage"
          @click="handlePay"
        >
          <span v-if="selectedPackage">Оплатить {{ selectedPackage.stars }} ⭐</span>
          <span v-else>Выбери пакет</span>
        </button>
      </div>

      <!-- Tab: Get free -->
      <div v-if="activeTab === 'free'" class="tab-content">
        <div class="section-title">Получи токены бесплатно</div>

        <!-- Telegram channel -->
        <div class="earn-card" :class="{ done: channelClaimed }">
          <div class="earn-card-icon">📢</div>
          <div class="earn-card-body">
            <div class="earn-card-title">Подпишись на канал</div>
            <div class="earn-card-desc">The Dreams Hub — советы, символы, истории снов</div>
          </div>
          <div class="earn-card-reward">+1 🪙</div>
          <button
            v-if="!channelClaimed"
            class="earn-btn"
            :disabled="isClaimingChannel"
            @click="handleChannelClaim"
          >
            {{ isClaimingChannel ? '...' : 'Получить' }}
          </button>
          <div v-else class="earn-done-badge">✓</div>
        </div>

        <!-- YouTube -->
        <div class="earn-card" :class="{ done: youtubeClaimed }">
          <div class="earn-card-icon">▶️</div>
          <div class="earn-card-body">
            <div class="earn-card-title">Подпишись на YouTube</div>
            <div class="earn-card-desc">Видео о снах, психологии и толкованиях</div>
          </div>
          <div class="earn-card-reward">+1 🪙</div>
          <button
            v-if="!youtubeClaimed"
            class="earn-btn"
            @click="handleYouTubeClaim"
          >
            Подписаться
          </button>
          <div v-else class="earn-done-badge">✓</div>
        </div>

        <!-- Referral -->
        <div class="earn-card referral-card">
          <div class="earn-card-icon">👥</div>
          <div class="earn-card-body">
            <div class="earn-card-title">Пригласи друга</div>
            <div class="earn-card-desc">+3 токена за каждого, кто сделает первый анализ</div>
          </div>
          <div class="earn-card-reward">+3 🪙</div>

          <div class="referral-section">
            <div class="referral-stats">
              <span>Приглашено: <b>{{ referralStats.invited }}</b></span>
              <span>Заработано: <b>{{ referralStats.earned }} 🪙</b></span>
            </div>
            <div class="referral-link-row">
              <div class="referral-link-box">
                <span class="referral-link-text">{{ referralLink }}</span>
              </div>
              <button class="copy-btn" @click="copyReferralLink">
                {{ copied ? '✓' : '📋' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Future activities placeholder -->
        <div class="future-activities">
          <div class="future-title">Скоро больше способов</div>
          <div class="future-desc">Задания, ачивки и партнёрские активности появятся здесь</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const emit = defineEmits(['close'])
const tg = window.Telegram?.WebApp

const activeTab = ref('buy')
const copied = ref(false)
const isClaimingChannel = ref(false)

// Статус выполненных заданий (из профиля)
const channelClaimed = computed(() => userStore.profile?.channel_reward_claimed || false)
const youtubeClaimed = computed(() => userStore.profile?.youtube_reward_claimed || false)

// Реферальная ссылка
const referralCode = computed(() => userStore.profile?.referral_code || '')
const referralLink = computed(() => {
  if (!referralCode.value) return 'Загрузка...'
  return `https://t.me/dreamtestaibot?start=ref_${referralCode.value}`
})

const referralStats = computed(() => ({
  invited: userStore.profile?.referrals_count || 0,
  earned: (userStore.profile?.referrals_count || 0) * 3
}))

// Token packages
const tokenPackages = ref([
  { tokens: 5,  stars: 50,  popular: false },
  { tokens: 15, stars: 120, popular: true  },
  { tokens: 30, stars: 200, popular: false },
])
const selectedPackage = ref(tokenPackages.value[1]) // Default: popular

const handlePay = () => {
  if (!selectedPackage.value) return
  if (window.triggerHaptic) window.triggerHaptic('medium')
  // Use existing payment flow through Telegram MainButton or direct invoice
  userStore.initiateTokenPayment?.(selectedPackage.value) || userStore.initiatePayment?.()
}

const handleChannelClaim = async () => {
  isClaimingChannel.value = true
  try {
    // Open channel first
    if (tg?.openTelegramLink) {
      tg.openTelegramLink('https://t.me/thedreamshub')
    } else {
      window.open('https://t.me/thedreamshub', '_blank')
    }
    // Then claim reward via existing endpoint
    await userStore.claimChannelReward?.()
  } catch (e) {
    console.error('Channel claim failed:', e)
  } finally {
    isClaimingChannel.value = false
  }
}

const handleYouTubeClaim = () => {
  // Mark as claimed + open YouTube (placeholder)
  if (tg?.openLink) {
    tg.openLink('https://youtube.com/@dreamstalk', { try_instant_view: false })
  } else {
    window.open('https://youtube.com/@dreamstalk', '_blank')
  }
}

const copyReferralLink = async () => {
  if (!referralLink.value || referralLink.value === 'Загрузка...') return
  try {
    await navigator.clipboard.writeText(referralLink.value)
    if (window.triggerHaptic) window.triggerHaptic('light')
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (e) {
    // Fallback
    if (tg?.switchInlineQuery) {
      tg.switchInlineQuery(referralLink.value)
    }
  }
}

// Telegram Back Button
onMounted(() => {
  if (tg?.BackButton) {
    tg.BackButton.show()
    tg.BackButton.onClick(() => emit('close'))
  }
})

onUnmounted(() => {
  if (tg?.BackButton?.isVisible) {
    tg.BackButton.hide()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-end;
}

.modal-sheet {
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--tg-theme-bg-color, #18181b);
  border-radius: 20px 20px 0 0;
  padding: 0 0 40px;
  display: flex;
  flex-direction: column;
}

.handle-bar {
  width: 36px;
  height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  margin: 12px auto 0;
  flex-shrink: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
}

.tokens-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(167,139,250,0.15);
  border: 1px solid rgba(167,139,250,0.3);
  border-radius: 20px;
  padding: 6px 14px;
}
.tokens-badge-icon { font-size: 18px; line-height: 1; }
.tokens-badge-count { font-size: 20px; font-weight: 800; color: var(--tg-theme-text-color, #fff); }
.tokens-badge-label { font-size: 12px; color: var(--tg-theme-hint-color, rgba(255,255,255,0.6)); }

.close-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  color: var(--tg-theme-hint-color, rgba(255,255,255,0.6));
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Tab switcher */
.tab-switcher {
  display: flex;
  gap: 0;
  margin: 12px 20px 0;
  background: rgba(255,255,255,0.07);
  border-radius: 12px;
  padding: 4px;
}
.tab-btn {
  flex: 1;
  padding: 10px 8px;
  border: none;
  background: transparent;
  color: var(--tg-theme-hint-color, rgba(255,255,255,0.55));
  border-radius: 9px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tab-btn.active {
  background: rgba(124,58,237,0.7);
  color: #fff;
  font-weight: 600;
}

/* Tab content */
.tab-content {
  padding: 20px 20px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--tg-theme-text-color, #fff);
}

/* Packages grid */
.packages-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.package-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 14px 8px;
  border: 2px solid rgba(255,255,255,0.12);
  border-radius: 14px;
  background: rgba(255,255,255,0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}
.package-card.selected {
  border-color: #7C3AED;
  background: rgba(124,58,237,0.18);
}
.package-card.popular {
  border-color: rgba(167,139,250,0.4);
}
.popular-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #7C3AED, #9C41FF);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  border-radius: 6px;
  padding: 2px 8px;
  white-space: nowrap;
}
.package-tokens {
  font-size: 24px;
  font-weight: 800;
  color: var(--tg-theme-text-color, #fff);
  line-height: 1;
}
.package-token-label {
  font-size: 11px;
  color: var(--tg-theme-hint-color, rgba(255,255,255,0.5));
}
.package-price {
  font-size: 15px;
  font-weight: 600;
  color: #a78bfa;
  margin-top: 4px;
}
.package-per-token {
  font-size: 10px;
  color: var(--tg-theme-hint-color, rgba(255,255,255,0.4));
}

/* Features block */
.features-block {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.features-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: var(--tg-theme-text-color, rgba(255,255,255,0.85));
  line-height: 1.5;
}
.features-check {
  color: #a78bfa;
  font-weight: 700;
  flex-shrink: 0;
}

.pay-hint {
  font-size: 12px;
  text-align: center;
  color: var(--tg-theme-hint-color, rgba(255,255,255,0.45));
}

.pay-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #7C3AED 0%, #9C41FF 100%);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.15s ease;
  box-shadow: 0 4px 16px rgba(124,58,237,0.4);
}
.pay-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pay-btn:not(:disabled):active {
  transform: scale(0.98);
}

/* Earn cards */
.earn-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 14px 16px;
  flex-wrap: wrap;
}
.earn-card.done {
  opacity: 0.6;
}
.earn-card-icon { font-size: 24px; flex-shrink: 0; }
.earn-card-body { flex: 1; min-width: 0; }
.earn-card-title { font-size: 14px; font-weight: 600; color: var(--tg-theme-text-color, #fff); }
.earn-card-desc { font-size: 12px; color: var(--tg-theme-hint-color, rgba(255,255,255,0.55)); margin-top: 2px; line-height: 1.4; }
.earn-card-reward {
  font-size: 14px;
  font-weight: 700;
  color: #a78bfa;
  flex-shrink: 0;
}

.earn-btn {
  background: rgba(124,58,237,0.25);
  border: 1px solid rgba(124,58,237,0.5);
  color: #a78bfa;
  border-radius: 10px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.earn-btn:hover { background: rgba(124,58,237,0.35); }
.earn-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.earn-done-badge {
  width: 28px;
  height: 28px;
  background: rgba(52,211,153,0.2);
  border: 1px solid rgba(52,211,153,0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #34d399;
  flex-shrink: 0;
}

/* Referral */
.referral-card { flex-direction: column; align-items: flex-start; }
.referral-card > * { width: 100%; }
.referral-card .earn-card-icon,
.referral-card .earn-card-reward { width: auto; }

.referral-section {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.referral-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--tg-theme-hint-color, rgba(255,255,255,0.6));
}
.referral-stats b { color: var(--tg-theme-text-color, #fff); }

.referral-link-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.referral-link-box {
  flex: 1;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 8px 12px;
  overflow: hidden;
}
.referral-link-text {
  font-size: 12px;
  color: var(--tg-theme-hint-color, rgba(255,255,255,0.5));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.copy-btn {
  background: rgba(124,58,237,0.2);
  border: 1px solid rgba(124,58,237,0.4);
  color: #a78bfa;
  border-radius: 10px;
  width: 40px;
  height: 40px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}
.copy-btn:hover { background: rgba(124,58,237,0.35); }

/* Referral top row */
.referral-card > .earn-card-icon,
.referral-card > .earn-card-body,
.referral-card > .earn-card-reward {
  width: auto;
  flex: unset;
}
.referral-card > .earn-card-body { flex: 1; }

/* Top row flex */
.referral-top-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

/* Future activities */
.future-activities {
  background: rgba(255,255,255,0.04);
  border: 1px dashed rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 16px;
  text-align: center;
}
.future-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--tg-theme-hint-color, rgba(255,255,255,0.5));
}
.future-desc {
  font-size: 12px;
  color: var(--tg-theme-hint-color, rgba(255,255,255,0.35));
  margin-top: 4px;
  line-height: 1.5;
}
</style>
