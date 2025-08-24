import { defineStore } from 'pinia'

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    notifications: [],
    lastShownAt: {}, // key: `${type}:${message}` → timestamp
  }),

  actions: {
    addNotification(notification) {
      const id = Date.now() + Math.random()
      const newNotification = {
        id,
        type: notification.type || 'info', // success, error, warning, info
        message: notification.message,
        duration: notification.duration || 5000, // auto-dismiss timeout
        dismissible: notification.dismissible !== false, // manual dismiss allowed
        ...notification
      }
      // Deduplicate bursts: skip if same type+message was shown < 5s ago
      const key = `${newNotification.type}:${newNotification.message}`
      const now = Date.now()
      const lastAt = this.lastShownAt[key] || 0
      if (now - lastAt < 5000) {
        return id
      }
      this.lastShownAt[key] = now

      this.notifications.push(newNotification)

      // Cap maximum visible notifications to 3
      if (this.notifications.length > 3) {
        this.notifications.splice(0, this.notifications.length - 3)
      }

      // Auto-dismiss after specified duration
      if (newNotification.duration > 0) {
        setTimeout(() => {
          this.removeNotification(id)
        }, newNotification.duration)
      }

      return id
    },

    removeNotification(id) {
      const index = this.notifications.findIndex(notification => notification.id === id)
      if (index > -1) {
        this.notifications.splice(index, 1)
      }
    },

    clearAll() {
      this.notifications = []
    },

    // Convenience methods for different notification types
    success(message, options = {}) {
      return this.addNotification({
        type: 'success',
        message,
        duration: 4000,
        ...options
      })
    },

    error(message, options = {}) {
      return this.addNotification({
        type: 'error',
        message,
        duration: 6000,
        ...options
      })
    },

    warning(message, options = {}) {
      return this.addNotification({
        type: 'warning',
        message,
        duration: 5000,
        ...options
      })
    },

    info(message, options = {}) {
      return this.addNotification({
        type: 'info',
        message,
        duration: 4000,
        ...options
      })
    }
  }
})