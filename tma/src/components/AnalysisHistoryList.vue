<template>
  <div>
    <h2 class="text-2xl font-semibold mb-4 text-white">История снов</h2>
    <div class="flex flex-col gap-4">
      <DreamCard
        v-for="dream in visibleDreams"
        :key="dream.id"
        :dream="dream"
        :active="activeId === dream.id"
        @toggle="activeId = activeId === dream.id ? null : dream.id"
      />
      <button
        v-if="canLoadMore"
        class="self-center text-tg-link underline text-sm my-2"
        @click="loadMore"
      >
        Загрузить ещё
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useHistoryStore } from '@/stores/history.js'
import DreamCard from './DreamCard.vue'

const historyStore = useHistoryStore()
const activeId = ref(null)
const visibleCount = ref(5)

const visibleDreams = computed(() => {
  return historyStore.dreams.slice(0, visibleCount.value)
})

const canLoadMore = computed(() => {
  return visibleCount.value < historyStore.dreams.length
})

const loadMore = () => {
  visibleCount.value += 5
}
</script>

<style scoped>
/* Transition styles */
.expand-enter-active, .expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to, .expand-leave-from {
  max-height: 500px;
  opacity: 1;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item {
  background: #4A58FF;
  border-radius: 60px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
}

.history-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(74, 88, 255, 0.3);
}

.history-item:active {
  transform: scale(0.98);
}

.history-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 48px;
  color: white;
}

.dream-title {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 20px;
  line-height: 1.2;
  color: #FFFFFF;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 24px;
  text-align: left;
}

.dream-date {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
}

.history-details {
  padding: 0 48px 32px;
  color: white;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-label {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 16px;
  color: #FFFFFF;
  margin: 0 0 8px 0;
}

.detail-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 20px 0;
}

.dream-text, .analysis-text {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

/* Responsive styles */
@media (max-width: 768px) {
  .history-summary {
    padding: 24px 32px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .dream-title {
    font-size: 18px;
    margin-right: 0;
    white-space: normal;
    text-overflow: unset;
    overflow: visible;
  }
  
  .dream-date {
    font-size: 14px;
    align-self: flex-end;
  }
  
  .history-details {
    padding: 0 32px 24px;
  }
  
  .detail-label {
    font-size: 14px;
  }
  
  .dream-text, .analysis-text {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .history-summary {
    padding: 20px 24px;
  }
  
  .dream-title {
    font-size: 16px;
  }
  
  .dream-date {
    font-size: 12px;
    padding: 6px 12px;
  }
  
  .history-details {
    padding: 0 24px 20px;
  }
  
  .dream-text, .analysis-text {
    font-size: 12px;
  }
}
</style>
