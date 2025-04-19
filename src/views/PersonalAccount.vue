<template>
  <div class="personal-account">
    <h1>Личный кабинет</h1>

    <div class="user-info">
      <div v-if="tgUser.photo_url" class="avatar"><img :src="tgUser.photo_url" alt="Аватар"></div>
      <div class="details">
        <p v-if="tgUser.first_name">{{ tgUser.first_name }} <span v-if="tgUser.last_name">{{ tgUser.last_name }}</span></p>
        <p v-if="tgUser.username">@{{ tgUser.username }}</p>
        <p v-else>Имя отсутствует</p>
      </div>
    </div>

    <div v-if="profile" class="account-details">
      <p>Токены: {{ profile.tokens }}</p>
      <p>Подписка: {{ profile.subscription_type }}</p>

      <!-- ИЗМЕНЕНИЕ ЗДЕСЬ: Вызываем функцию напрямую -->
      <button v-if="(console.log('Вызывается shouldShowDeepAnalysisButton в шаблоне'), shouldShowDeepAnalysisButton())" @click="openDeepAnalysisModal" :disabled="isDeepAnalysisLoading" class="deep-analysis-button">
        {{ isDeepAnalysisLoading ? 'Загрузка...' : 'Получить глубокий анализ' }}
      </button>

      <div v-if="history.length > 0" class="history">
        <h2>История анализов</h2>
        <AnalysisHistoryList :history="history" />
      </div>
    </div>
    <p v-if="isLoadingProfile">Загрузка профиля...</p>
    <p v-else-if="errorProfile">Ошибка загрузки профиля: {{ errorProfile }}</p>

    <DeepAnalysisModal v-if="isDeepAnalysisModalOpen" @close="closeDeepAnalysisModal" @pay="handleDeepAnalysisPayment" />
  </div>
</template>