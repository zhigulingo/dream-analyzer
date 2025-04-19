<template>
  <div class="deep-analysis-modal">
    <h2>Глубокий анализ снов</h2>
    <p>
      Глубокий анализ ваших снов позволит выявить скрытые взаимосвязи и получить более полную картину вашего подсознания.
      На основе последних 5 снов будет сформирован подробный отчет, который поможет вам лучше понять себя.
    </p>
    <p>Стоимость: <span class="price">5 токенов</span></p>
    <button @click="handlePayment" class="pay-button">Оплатить</button>
    <button @click="close" class="close-button">Закрыть</button>
  </div>
</template>

<script setup>
const emit = defineEmits(['close', 'pay']);

const handlePayment = () => {
  // Здесь будет логика оплаты
  emit('pay');
};

const close = () => {
  emit('close');
};
</script>

<style scoped>
.deep-analysis-modal {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
}

.price {
  font-weight: bold;
}

.pay-button {
  background-color: #28a745;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-right: 10px;
}

.close-button {
  background-color: #ccc;
  color: black;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
</style>