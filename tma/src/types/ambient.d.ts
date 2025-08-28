declare module '@/stores/user.js' {
  export const useUserStore: any
}

declare module '@/services/api.js' {
  const api: any
  export default api
  export const apiClient: any
}

declare module '@/components/StickerPlayer.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
