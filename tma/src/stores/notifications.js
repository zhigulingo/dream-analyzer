import { defineStore } from 'pinia'

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    notifications: []
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

      this.notifications.push(newNotification)

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