# Руководство по исправлению проблем с отображением

## Исправленные проблемы

### 1. Конфигурация Netlify
- **TMA приложение**: Обновлен `tma/netlify.toml` с правильными командами сборки
- **Web приложение**: Обновлен `web/netlify.toml` с правильными командами сборки
- **Корневой проект**: Изменен `netlify.toml` только для деплоймента функций

### 2. Исправления кода
- **Web index.html**: Удалена прямая ссылка на CSS файл, теперь импортируется в main.js
- **TMA App.vue**: Исправлен синтаксис `defineAsyncComponent`
- **API конфигурация**: Улучшена обработка ошибок при отсутствии API URL

### 3. Добавлены компоненты отладки
- Добавлены `DebugInfo.vue` компоненты для TMA и Web приложений
- Показывают состояние API URL, переменных окружения и других критических параметров

## Следующие шаги

### 1. Настройка переменных окружения в Netlify

#### Для TMA сайта:
```
VITE_API_BASE_URL=https://your-functions-site.netlify.app/.netlify/functions
```

#### Для Web сайта:
```
VITE_API_BASE_URL=https://your-web-site.netlify.app/.netlify/functions
VITE_REFRESH_TOKEN_API_URL=https://your-web-site.netlify.app/.netlify/functions/refresh-token
VITE_LOGOUT_API_URL=https://your-web-site.netlify.app/.netlify/functions/logout
```

### 2. Правильная структура деплоймента

Рекомендуется следующая структура:

1. **Основной сайт** (с функциями): Деплой из корня репозитория
   - Содержит только функции бота в `bot/functions/`
   - Использует корневой `netlify.toml`

2. **TMA сайт**: Отдельный сайт из папки `tma/`
   - Base directory: `tma`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`

3. **Web сайт**: Отдельный сайт из папки `web/`
   - Base directory: `web`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`

### 3. Проверка после деплоймента

1. Откройте любое из приложений
2. Нажмите кнопку "Show Debug" в правом верхнем углу
3. Проверьте что API URL настроен правильно
4. Если API URL показывает "NOT SET", настройте переменные окружения в Netlify

## Устранение проблем

### Если приложение не отображается:
1. Проверьте консоль браузера на ошибки JavaScript
2. Убедитесь что API URL настроен (используйте DebugInfo компонент)
3. Проверьте что функции деплоятся правильно

### Если компоненты не загружаются:
1. Убедитесь что все зависимости установлены (`npm install`)
2. Проверьте что build процесс завершается успешно
3. Проверьте логи сборки в Netlify

### Deprecation Warning для punycode:
Это не критическая ошибка, можно игнорировать. Это предупреждение от одной из зависимостей Node.js.