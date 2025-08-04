<template>
    <section class="user-info card" @click="toggleExpanded">
      <h2>Ваш профиль</h2>
  
      <div v-if="userStore.isLoadingProfile">Загрузка профиля...</div>
      <div v-else-if="userStore.errorProfile" class="error-message">
        Ошибка: {{ userStore.errorProfile }}
      </div>
  
      <div v-else>
        <p>Остаток токенов: <strong>{{ userStore.profile.tokens }}</strong></p>
        <p>
          Текущий тариф:
          <strong class="capitalize">{{ userStore.profile.subscription_type }}</strong>
          <span v-if="userStore.profile.subscription_end">
            (до {{ formatDate(userStore.profile.subscription_end) }})
          </span>
        </p>
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
  </script>
  
  <style scoped>
  /* transition */
  .expand-enter-active, .expand-leave-active {
    transition: all .3s ease; overflow: hidden;
  }
  .expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0 }
  .expand-enter-to,   .expand-leave-from { max-height: 100px; opacity: 1 }
  </style>