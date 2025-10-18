<template>
  <div class="symbol-card">
    <div class="symbol-header">
      <h3 class="symbol-name">{{ symbol.symbol }}</h3>
      <div class="symbol-frequency">
        <span class="frequency-badge">×{{ symbol.frequency }}</span>
      </div>
    </div>
    
    <div class="symbol-content">
      <div class="symbol-description">
        <p>{{ symbol.description }}</p>
      </div>
      
      <div class="symbol-context">
        <h4 class="context-label">В ваших снах</h4>
        <p>{{ symbol.userContext }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  symbol: {
    type: Object,
    required: true,
    validator: (value) => {
      return (
        typeof value.symbol === 'string' &&
        typeof value.frequency === 'number' &&
        typeof value.description === 'string' &&
        typeof value.userContext === 'string'
      );
    }
  }
});
</script>

<style scoped>
.symbol-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 20px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.symbol-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.symbol-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.symbol-name {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.symbol-frequency {
  display: flex;
  align-items: center;
}

.frequency-badge {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.symbol-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.symbol-description {
  opacity: 0.95;
  line-height: 1.6;
}

.symbol-description p {
  margin: 0;
  font-size: 14px;
}

.symbol-context {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.context-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 8px 0;
  opacity: 0.8;
}

.symbol-context p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.95;
}

/* Responsive */
@media (max-width: 480px) {
  .symbol-card {
    padding: 16px;
  }

  .symbol-name {
    font-size: 18px;
  }

  .frequency-badge {
    font-size: 14px;
    padding: 4px 12px;
  }

  .symbol-description p,
  .symbol-context p {
    font-size: 13px;
  }
}
</style>
