import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useHistoryStore = defineStore('history', () => {
  const dreams = ref([])
  
  const count = computed(() => dreams.value.length)
  
  const addDream = (dream) => {
    dreams.value.push(dream)
  }
  
  const removeDream = (id) => {
    const index = dreams.value.findIndex(dream => dream.id === id)
    if (index > -1) {
      dreams.value.splice(index, 1)
    }
  }
  
  return {
    dreams,
    count,
    addDream,
    removeDream
  }
})