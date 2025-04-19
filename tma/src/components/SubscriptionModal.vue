<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content card">
      <button class="close-button" @click="closeModal">&times;</button>

      <h2 v-if="!isDeepAnalysisMode">Подписка на Анализ Снов</h2>
      <h2 v-else>✨ Глубокий Анализ</h2>

      <div v-if="isLoading" class="loading">Загрузка...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>

      <template v-else>
        <!-- Режим покупки подписки -->
        <div v-if="!isDeepAnalysisMode">
          <p>Получите неограниченный доступ к анализу ваших снов!</p>
          <p><strong>Преимущества подписки:</strong></p>
          <ul>
            <li>Безлимитный анализ снов в течение месяца.</li>
            <li>Поддержка развития проекта.</li>
          </ul>
          <p class="price">Стоимость: <strong>{{ subscriptionPrice }} Telegram Stars ⭐️</strong></p>
          <button
            @click="initiatePurchase('subscription')"
            :disabled="isProcessing"
            class="purchase-button"
          >
            {{ isProcessing ? 'Обработка...' : `Купить подписку за ${subscriptionPrice} ⭐️` }}
          </button>
        </div>

        <!-- Режим покупки Глубокого Анализа -->
        <div v-else>
            <p>Закажите специальный анализ ваших <strong>последних 5 снов</strong>.</p>
            <p>Наши алгоритмы выявят <strong>скрытые закономерности, повторяющиеся символы и общие темы</strong> в ваших недавних сновидениях.</p>
            <p class="price">Стоимость: <strong>{{ deepAnalysisPrice }} Telegram Star ⭐️</strong></p>
            <button
               @click="initiatePurchase('deepAnalysis')"
               :disabled="isProcessing"
               class="purchase-button deep-analysis"
            >
                {{ isProcessing ? 'Обработка...' : `Купить Глубокий Анализ за ${deepAnalysisPrice} ⭐️` }}
            </button>
        </div>
      </template>

       <p class="hint">Оплата производится с помощью Telegram Stars ✨</p>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, watch } from 'vue';
import api from '../services/api'; // Ваш API сервис

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true,
  },
  userId: {
    type: [String, Number],
    required: false, // Сделаем необязательным на случай, если пользователь еще не загружен
  },
  isDeepAnalysisMode: { // Новый prop для определения режима
      type: Boolean,
      default: false,
  }
});

const emit = defineEmits(['close', 'purchase-initiated', 'purchase-completed', 'purchase-error']);

const isLoading = ref(false);
const isProcessing = ref(false);
const error = ref(null);

// Цены (можно вынести в конфигурацию или получать с бэкенда)
const subscriptionPrice = 5; // Пример цены подписки
const deepAnalysisPrice = 1; // Цена глубокого анализа

const closeModal = () => {
  if (!isProcessing.value) { // Не закрывать во время обработки
    emit('close');
    error.value = null; // Сбрасываем ошибку при закрытии
  }
};

const initiatePurchase = async (type) => {
  if (!props.userId) {
      error.value = "Ошибка: ID пользователя не найден.";
      return;
  }
  if (!window.Telegram?.WebApp) {
      error.value = "Ошибка: Не удалось получить доступ к Telegram WebApp.";
      console.error("Telegram WebApp is not available.");
      return;
  }

  isProcessing.value = true;
  error.value = null;
  emit('purchase-initiated', type); // Сообщаем родителю о начале процесса

  try {
      let invoiceSlug = '';
      if (type === 'subscription') {
          console.log('Requesting subscription invoice for user:', props.userId);
          const response = await api.createSubscriptionInvoice(props.userId);
          invoiceSlug = response.invoice_slug;
          console.log('Subscription invoice slug received:', invoiceSlug);
      } else if (type === 'deepAnalysis') {
          console.log('Requesting deep analysis invoice for user:', props.userId);
          // Предполагаем, что есть или будет такой метод в API
          const response = await api.createDeepAnalysisInvoice(props.userId);
          invoiceSlug = response.invoice_slug;
           console.log('Deep analysis invoice slug received:', invoiceSlug);
      } else {
          throw new Error('Неизвестный тип покупки');
      }

      if (!invoiceSlug) {
          throw new Error('Не удалось получить ссылку на оплату (slug).');
      }

      // Открываем инвойс Telegram
       console.log(`Opening invoice with slug: ${invoiceSlug}`);
      window.Telegram.WebApp.openInvoice(invoiceSlug, (status) => {
          console.log(`Invoice status received from openInvoice callback: ${status}`);
          // Этот колбэк вызывается ПОСЛЕ закрытия окна инвойса
          if (status === 'paid') {
              console.log(`Invoice ${invoiceSlug} paid successfully.`);
              // Успех уже должен обрабатываться через событие invoiceClosed или вебхук
              // Эмитим событие, но основная логика обновления - в PersonalAccount
              emit('purchase-completed', type, { slug: invoiceSlug, status: status });
              // Не закрываем модалку здесь, пусть родитель решает
          } else if (status === 'cancelled') {
              console.log(`Invoice ${invoiceSlug} was cancelled.`);
              error.value = 'Оплата была отменена.';
              emit('purchase-error', type, 'Оплата отменена');
          } else if (status === 'failed') {
               console.log(`Invoice ${invoiceSlug} failed.`);
               error.value = 'Произошла ошибка во время оплаты.';
               emit('purchase-error', type, 'Ошибка оплаты');
          } else if (status === 'pending') {
               console.log(`Invoice ${invoiceSlug} is pending.`);
               error.value = 'Платеж в обработке. Статус будет обновлен позже.';
               // Возможно, не стоит считать это ошибкой, а просто ждать вебхук
               emit('purchase-error', type, 'Платеж в обработке'); // Или отдельное событие?
          } else {
               console.log(`Invoice ${invoiceSlug} closed with unknown status: ${status}`);
                error.value = `Неизвестный статус оплаты: ${status}`;
               emit('purchase-error', type, `Неизвестный статус: ${status}`);
          }
          isProcessing.value = false; // Снимаем флаг обработки после колбэка
          // closeModal(); // Не закрываем автоматически, даем пользователю увидеть сообщение
      });

  } catch (err) {
    console.error(`Failed to initiate ${type} purchase:`, err);
    error.value = `Не удалось начать процесс покупки: ${err.response?.data?.error || err.message || err}`;
    emit('purchase-error', type, error.value);
    isProcessing.value = false;
  }
};

// Сброс состояния при изменении видимости (если модалка закрывается не через кнопку)
watch(() => props.isVisible, (newValue) => {
  if (!newValue) {
    // Сбрасываем состояние, когда модальное окно становится невидимым
    isLoading.value = false;
    isProcessing.value = false;
    error.value = null;
  }
});

</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Выше других элементов */
  backdrop-filter: blur(3px); /* Эффект размытия фона */
}

.modal-content {
  background-color: var(--tg-theme-secondary-bg-color, #ffffff);
  padding: 25px 30px;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 450px; /* Максимальная ширина */
  position: relative;
  color: var(--tg-theme-text-color);
  text-align: center; /* Центрируем текст */
}

.card { /* Дополнительные стили для карточки, если нужны */
    border: 1px solid var(--tg-theme-hint-color, #eee);
}

.close-button {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  font-size: 2em;
  color: var(--tg-theme-hint-color, #aaa);
  cursor: pointer;
  line-height: 1;
  padding: 0;
}
.close-button:hover {
    color: var(--tg-theme-text-color);
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--tg-theme-text-color);
  font-size: 1.4em;
}

ul {
  list-style: none; /* Убираем маркеры */
  padding: 0;
  margin: 15px 0;
  text-align: left; /* Выравниваем текст в списке по левому краю */
  display: inline-block; /* Чтобы блок занял ширину контента */
   margin-left: auto;
   margin-right: auto;
}

li {
  margin-bottom: 10px;
  position: relative;
  padding-left: 25px; /* Отступ для "галочки" */
}

li::before {
  content: '✅'; /* Используем эмодзи как маркер */
  position: absolute;
  left: 0;
  top: 0px;
  color: #28a745; /* Зеленый цвет для галочки */
}

.price {
  font-size: 1.2em;
  margin: 25px 0;
}
.price strong {
  color: var(--tg-theme-button-color); /* Цвет акцента */
}

.purchase-button {
  display: block; /* Занимает всю ширину */
  width: 100%;
  padding: 12px 20px;
  font-size: 1.1em;
  font-weight: 500;
  cursor: pointer;
  border: none;
  border-radius: 8px;
  background-color: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  transition: background-color 0.2s ease, transform 0.1s ease;
  margin-top: 10px;
}
.purchase-button:hover:not(:disabled) {
    filter: brightness(1.1);
}
.purchase-button:active:not(:disabled) {
     transform: scale(0.98);
}
.purchase-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Стиль для кнопки глубокого анализа, если нужен другой цвет */
.purchase-button.deep-analysis {
    /* background-color: #007bff; */ /* Пример синего цвета (или использовать переменную Telegram) */
    /* Можно оставить таким же, как кнопка подписки */
}


.loading {
  padding: 30px 0;
  font-size: 1.1em;
  color: var(--tg-theme-hint-color);
}

.error-message {
  color: var(--tg-theme-destructive-text-color, #dc3545);
  background-color: rgba(220, 53, 69, 0.1);
  padding: 10px 15px;
  border-radius: 6px;
  margin-top: 15px;
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.hint {
    margin-top: 20px;
    font-size: 0.9em;
    color: var(--tg-theme-hint-color);
}
</style>