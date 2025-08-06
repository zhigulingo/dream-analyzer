<template>
  <Teleport to="body">
    <div 
      v-if="notificationStore.notifications.length > 0"
      class="notification-container"
    >
      <TransitionGroup 
        name="notification" 
        tag="div" 
        class="notification-list"
      >
        <div
          v-for="notification in notificationStore.notifications"
          :key="notification.id"
          :class="getNotificationClasses(notification)"
          class="notification"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-content">
            <div class="notification-icon">
              <component :is="getIcon(notification.type)" class="w-5 h-5" />
            </div>
            <div class="notification-message">
              {{ notification.message }}
            </div>
            <button
              v-if="notification.dismissible"
              class="notification-close"
              @click.stop="notificationStore.removeNotification(notification.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div 
            v-if="notification.duration > 0"
            class="notification-progress"
            :style="{ animationDuration: `${notification.duration}ms` }"
          ></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useNotificationStore } from '@/stores/notifications.js'

const notificationStore = useNotificationStore()

function getNotificationClasses(notification) {
  const baseClasses = 'notification-base'
  const typeClasses = {
    success: 'notification-success',
    error: 'notification-error',
    warning: 'notification-warning',
    info: 'notification-info'
  }
  
  return [baseClasses, typeClasses[notification.type] || typeClasses.info]
}

function getIcon(type) {
  const icons = {
    success: 'CheckCircleIcon',
    error: 'ExclamationCircleIcon',
    warning: 'ExclamationTriangleIcon',
    info: 'InformationCircleIcon'
  }
  return icons[type] || icons.info
}

function handleNotificationClick(notification) {
  if (notification.onClick) {
    notification.onClick()
  }
}

// Icon components as strings (will be rendered as SVG)
const CheckCircleIcon = {
  template: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
  </svg>`
}

const ExclamationCircleIcon = {
  template: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
  </svg>`
}

const ExclamationTriangleIcon = {
  template: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
  </svg>`
}

const InformationCircleIcon = {
  template: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
  </svg>`
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  pointer-events: none;
  max-width: 400px;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notification {
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.notification-base {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  color: var(--tg-theme-text-color);
  transform: translateX(0);
}

.notification-success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
  border-color: rgba(34, 197, 94, 0.3);
}

.notification-error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%);
  border-color: rgba(239, 68, 68, 0.3);
}

.notification-warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%);
  border-color: rgba(245, 158, 11, 0.3);
}

.notification-info {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
  border-color: rgba(59, 130, 246, 0.3);
}

.notification:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
}

.notification-content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.notification-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.notification-success .notification-icon {
  color: rgb(34, 197, 94);
}

.notification-error .notification-icon {
  color: rgb(239, 68, 68);
}

.notification-warning .notification-icon {
  color: rgb(245, 158, 11);
}

.notification-info .notification-icon {
  color: rgb(59, 130, 246);
}

.notification-message {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.4;
  font-weight: 500;
}

.notification-close {
  flex-shrink: 0;
  padding: 0.25rem;
  border-radius: 0.375rem;
  background: transparent;
  border: none;
  color: var(--tg-theme-hint-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.notification-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--tg-theme-text-color);
}

.notification-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, currentColor 0%, transparent 100%);
  opacity: 0.6;
  animation: progress-bar linear forwards;
  transform-origin: left;
}

.notification-success .notification-progress {
  color: rgb(34, 197, 94);
}

.notification-error .notification-progress {
  color: rgb(239, 68, 68);
}

.notification-warning .notification-progress {
  color: rgb(245, 158, 11);
}

.notification-info .notification-progress {
  color: rgb(59, 130, 246);
}

@keyframes progress-bar {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* Transition animations */
.notification-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.notification-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 1, 1);
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.notification-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .notification-container {
    left: 1rem;
    right: 1rem;
    max-width: none;
  }
  
  .notification-enter-from,
  .notification-leave-to {
    transform: translateY(-100%);
  }
}
</style>