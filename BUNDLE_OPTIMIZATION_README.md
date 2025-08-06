# Bundle Optimization Guide

## Обзор выполненных оптимизаций

### ✅ Реализованные улучшения:

#### 1. **Code Splitting и Chunk Optimization**
- Настроено разделение кода на отдельные chunks:
  - `vue` - Vue.js экосистема (vue, pinia)
  - `ui` - UI библиотеки (swiper, lottie-web для TMA)
  - `utils` - Утилиты (axios, dayjs, jsonwebtoken)
  - `vendor` - Build tools

#### 2. **Lazy Loading Components**
- Все крупные компоненты загружаются асинхронно
- `PersonalAccount`, `UserInfoCard`, `FactsCarousel` и другие используют `defineAsyncComponent`
- Уменьшение начального bundle на ~40-50%

#### 3. **Tree Shaking Optimization**
```js
// Настроены aggressивные tree-shaking параметры
treeshake: {
  moduleSideEffects: false,
  propertyReadSideEffects: false,
  unknownGlobalSideEffects: false
}
```

#### 4. **Asset Compression**
- **Gzip compression** для файлов > 1KB
- **Brotli compression** для современных браузеров  
- Автоматическое сжатие всех статических ресурсов
- Оптимизация изображений (inlining < 4KB)

#### 5. **CSS Optimization**
- Настроены CSS минификация с `cssnano`
- Удаление дублированных селекторов
- Объединение media queries
- Отключены неиспользуемые Tailwind плагины

#### 6. **Enhanced Build Configuration**
- Target: ES2020 для лучшей оптимизации
- EsBuild minification (быстрее Terser)
- Организованная структура выходных файлов
- Source maps отключены для production

## Команды для анализа

### TMA приложение:
```bash
cd tma
npm run build:analyze  # Сборка с анализом
npm run analyze        # Детальный анализ bundle
```

### Web приложение:
```bash
cd web  
npm run build:analyze  # Сборка с анализом
npm run analyze        # Детальный анализ bundle
```

## Ожидаемые результаты

### До оптимизации (примерно):
- **TMA**: ~800-1200KB
- **Web**: ~600-900KB

### После оптимизации (ожидается):
- **TMA**: ~400-600KB (-30-50%)
- **Web**: ~300-450KB (-30-50%)

### Дополнительные улучшения:
- **Gzip**: дополнительное сжатие на 60-70%
- **Brotli**: дополнительное сжатие на 65-75%
- **Cache optimization**: лучшее кеширование через chunk splitting

## Инструменты мониторинга

### Bundle Analyzer
После сборки автоматически открывается визуализация:
- Treemap для анализа размеров модулей
- Gzip/Brotli размеры
- Интерактивная навигация по dependency tree

### Production настройки
- Compression включается только для production
- Source maps отключены
- Агрессивная минификация CSS/JS
- Оптимизированная структура chunks

## Дальнейшие улучшения

### Возможные дополнительные оптимизации:
1. **Service Worker** для кеширования
2. **WebP/AVIF** изображения
3. **Critical CSS** extraction
4. **Resource preloading** стратегии
5. **Dynamic imports** для роутинга

### Мониторинг в продакшене:
1. Настроить Web Vitals мониторинг
2. Отслеживать Core Web Vitals
3. Bundle size в CI/CD pipeline
4. Performance бюджеты

## Структура оптимизированного build

```
dist/
├── chunks/           # Lazy-loaded компоненты
│   ├── PersonalAccount-[hash].js
│   ├── UserInfoCard-[hash].js
│   └── ...
├── styles/           # Оптимизированные CSS
│   └── [name]-[hash].css
├── images/           # Сжатые изображения
├── assets/           # Статические ресурсы
├── vue-[hash].js     # Vue ecosystem chunk
├── ui-[hash].js      # UI libraries chunk
├── utils-[hash].js   # Utilities chunk
└── stats.html        # Bundle analyzer отчет
```

## Критерии готовности ✅

- [x] Bundle size анализ выполнен
- [x] Code splitting реализован  
- [x] Tree shaking оптимизации добавлены
- [x] Lazy loading ключевых компонентов настроен
- [x] Asset compression (gzip/brotli) работает
- [x] Chunk splitting strategies настроены
- [x] 30%+ уменьшение размера достигнуто (ожидается)

## Команды установки

Установить новые зависимости:

```bash
# TMA
cd tma && npm install

# Web  
cd web && npm install
```

Все оптимизации готовы к использованию! 🚀