<template>
  <div class="personal-account">
    <h1>Личный кабинет</h1>

    <!-- Отображение данных пользователя -->
    <div class="user-info">
      <div v-if="user.photo_url" class="avatar">
        <img :src="user.photo_url" alt="Аватар">
      </div>
      <div class="details">
        <p v-if="user.first_name">{{ user.first_name }} {{ user.last_name }}</p>
        <p v-else>Имя не указано</p>
        <p v-if="user.username">@{{ user.username }}</p>
        <p v-else>Username не указан</p>
      </div>
    </div>

    <!-- Остальной контент компонента (токены, история, и т.д.) -->
    <div v-if="profile" class="account-details">
      <p>Токены: {{ profile.tokens }}</p>
      <p>Подписка: {{ profile.subscription_type }}</p>
      <!-- ... остальной контент ... -->

      <!-- Пример: отображение истории анализов -->
      <div v-if="history.length > 0" class="history">
        <h2>История анализов</h2>
        <div v-for="analysis in history" :key="analysis.id" class="analysis-card">
          <!-- ... содержимое карточки анализа ... -->
          <p>Дата: {{ analysis.date }}</p>
          <p>Описание: {{ analysis.description }}</p>
        </div>
      </div>
    </div>
    <p v-else-if="isLoadingProfile">Загрузка профиля...</p>
    <p v-else-if="errorProfile">Ошибка загрузки профиля: {{ errorProfile }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';

const userStore = useUserStore();
const { profile, history, isLoadingProfile, errorProfile } = storeToRefs(userStore);

// Получение данных пользователя из Telegram WebApp
const tg = window.Telegram.WebApp;
const user = computed(() => tg.initDataUnsafe?.user || {});

onMounted(async () => {
  console.log('[PersonalAccount onMounted] Initial view: Main Account');
  tg.ready();
  console.log('[PersonalAccount] Telegram WebApp is ready.');
  tg.BackButton.show();

  console.log('[PersonalAccount] Start loading profile and history');

  // Загрузка данных профиля и истории
  await userStore.fetchProfile(); // Загрузка данных профиля (токены, подписка и т.д. из Supabase)
  await userStore.fetchHistory();

  console.log('[PersonalAccount onMounted] History fetched.');

  // Больше не запрашиваем данные пользователя с сервера, используем локальные
  // // await userStore.fetchTelegramUser(); // Удалено или закомментировано
  // console.log('[PersonalAccount] Telegram user data loaded (from server).'); // Удалено или закомментировано

  console.log('[PersonalAccount] Profile loaded in', performance.now() - window.APP_START, 'ms');

  // Хранилище устройства отключено
  console.log('[PersonalAccount] DeviceStorage loading disabled.');
});
</script>

<style scoped>
.personal-account {
  /* Ваши стили для компонента */
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 20px;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.details p {
  margin: 5px 0;
}
</style>