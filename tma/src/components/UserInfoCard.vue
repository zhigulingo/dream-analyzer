<template>
    <section class="user-info-card" @click="toggleExpanded">
      <!-- User Section -->
      <div class="user-section">
        <div class="profile-section">
          <div class="avatar"></div>
          <div class="user-name">{{ getUserDisplayName() }}</div>
        </div>
        
        <!-- Info Pills Section -->
        <div class="info-section">
          <div v-if="userStore.isLoadingProfile" class="loading-pill">
            Загрузка...
          </div>
          <div v-else-if="userStore.errorProfile" class="error-message">
            Ошибка: {{ userStore.errorProfile }}
          </div>
          <template v-else>
            <div class="info-pill">
              <span class="pill-label">Токенов:</span>
              <span class="pill-value">{{ userStore.profile.tokens }}</span>
            </div>
            <div class="info-pill tariff-pill">
              <span class="pill-value capitalize">{{ userStore.profile.subscription_type }}</span>
              <span v-if="userStore.profile.subscription_end" class="pill-date">
                (до {{ formatDate(userStore.profile.subscription_end) }})
              </span>
            </div>
          </template>
        </div>
      </div>
  
      <Transition name="expand">
        <button
          v-if="isExpanded && (userStore.profile.subscription_type !== 'free' || userStore.profile.channel_reward_claimed)"
          class="change-plan-button"
          @click.stop="$emit('change-plan')">
          Сменить тариф
        </button>
      </Transition>
    </section>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  defineProps(['userStore', 'formatDate'])
  defineEmits(['change-plan'])
  
  const isExpanded = ref(false)
  const toggleExpanded = () => { isExpanded.value = !isExpanded.value }
  
  const getUserDisplayName = () => {
    // Try to get user info from Telegram WebApp or fallback to generic name
    const tg = window.Telegram?.WebApp
    if (tg?.initDataUnsafe?.user) {
      const user = tg.initDataUnsafe.user
      const name = user.first_name + (user.last_name ? ` ${user.last_name}` : '')
      return `${name} (GMT +3)`
    }
    return 'Пользователь (GMT +3)'
  }
  </script>
  
  <style scoped>
  /* Transition styles */
  .expand-enter-active, .expand-leave-active {
    transition: all .3s ease; 
    overflow: hidden;
  }
  .expand-enter-from, .expand-leave-to { 
    max-height: 0; 
    opacity: 0;
  }
  .expand-enter-to, .expand-leave-from { 
    max-height: 100px; 
    opacity: 1;
  }

  /* User Info Card - Figma Design */
  .user-info-card {
    background: transparent;
    border-radius: 3.75rem;
    padding: 0;
    margin: 0;
    min-height: 18rem;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .user-info-card:active {
    transform: scale(0.98);
  }

  .user-section {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 24px;
    flex: 1;
  }

  .profile-section {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 24px;
  }

  .avatar {
    width: 40px;
    height: 40px;
    background: #D9D9D9;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .user-name {
    font-family: 'Inter', sans-serif;
    font-weight: 400;
    font-size: 24px;
    line-height: 1.1;
    color: #FFFFFF;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .info-section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    gap: 9.6px;
  }

  .info-pill {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(194, 195, 211, 0.4);
    border-radius: 72px;
    min-width: auto;
    height: auto;
    box-sizing: border-box;
  }

  .tariff-pill {
    min-width: auto;
    width: fit-content;
  }

  .loading-pill {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px 16px;
    background: rgba(194, 195, 211, 0.4);
    border-radius: 72px;
    color: #FFFFFF;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    line-height: 1.1;
  }

  .pill-label,
  .pill-value {
    font-family: 'Inter', sans-serif;
    font-weight: 400;
    font-size: 14px;
    line-height: 1.1;
    color: #FFFFFF;
    text-align: center;
  }

  .pill-date {
    font-family: 'Inter', sans-serif;
    font-weight: 400;
    font-size: 12px;
    line-height: 1.1;
    color: #FFFFFF;
    opacity: 0.8;
    margin-left: 4px;
  }

  .capitalize {
    text-transform: capitalize;
  }

  .change-plan-button {
    background-color: rgba(255, 255, 255, 0.2);
    color: #FFFFFF;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 36px;
    padding: 16px 32px;
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    margin-top: 20px;
  }

  .change-plan-button:hover {
    background-color: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
  }

  .error-message {
    color: #ff6b6b;
    font-weight: bold;
    padding: 20px;
    background: rgba(255, 107, 107, 0.1);
    border-radius: 36px;
    border: 1px solid rgba(255, 107, 107, 0.3);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .user-info-card {
      flex-direction: column;
      padding: 40px 32px;
      gap: 32px;
      min-height: auto;
    }

    .user-section {
      flex-direction: column;
      gap: 24px;
      width: 100%;
    }

    .profile-section {
      flex-direction: column;
      text-align: center;
      gap: 16px;
    }

    .user-name {
      font-size: 32px;
      max-width: none;
      text-align: center;
    }

    .avatar {
      width: 80px;
      height: 80px;
    }

    .info-section {
      width: 100%;
      align-items: center;
    }

    .info-pill {
      min-width: auto;
      width: 100%;
      height: auto;
      padding: 16px 24px;
    }

    .pill-label,
    .pill-value {
      font-size: 24px;
    }

    .pill-date {
      font-size: 18px;
    }
  }

  @media (max-width: 480px) {
    .user-info-card {
      margin: 10px;
      padding: 24px 20px;
    }

    .user-name {
      font-size: 24px;
    }

    .avatar {
      width: 60px;
      height: 60px;
    }

    .pill-label,
    .pill-value {
      font-size: 20px;
    }

    .pill-date {
      font-size: 16px;
    }
  }
  </style>