# Настройка безопасного хранения токенов

## Обзор изменений

Реализована система безопасного хранения JWT токенов с использованием httpOnly cookies и refresh token pattern вместо небезопасного localStorage.

## Новые функции

1. **refresh-token.js** - Функция для обновления access токенов
2. **logout.js** - Функция для безопасного выхода с очисткой cookies
3. **web-login.js** - Обновлена для установки httpOnly cookies
4. **API Service** - Централизованный сервис с автоматическим обновлением токенов
5. **Фронтенд** - Обновлен для работы с cookies вместо localStorage

## Необходимые переменные окружения

### Серверные функции (Netlify Functions)

```bash
# Основные переменные (уже должны быть настроены)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
JWT_SECRET=your_jwt_secret

# Новые переменные
REFRESH_SECRET=your_refresh_secret  # Необязательно, если не установлено, используется JWT_SECRET + '_refresh'
ALLOWED_WEB_ORIGIN=https://yourdomain.com  # Для CORS с credentials
NODE_ENV=production  # Для установки Secure флага cookies в продакшене
```

### Фронтенд (Web приложение)

```bash
# Основные URL API
VITE_API_BASE_URL=https://your-netlify-domain.netlify.app/.netlify/functions
VITE_WEB_LOGIN_API_URL=https://your-netlify-domain.netlify.app/.netlify/functions/web-login

# Новые URL для работы с токенами
VITE_REFRESH_TOKEN_API_URL=https://your-netlify-domain.netlify.app/.netlify/functions/refresh-token
VITE_LOGOUT_API_URL=https://your-netlify-domain.netlify.app/.netlify/functions/logout
```

## Структура безопасности

### Access Token
- Время жизни: 15 минут
- Хранится в httpOnly cookie
- Автоматически обновляется при истечении

### Refresh Token  
- Время жизни: 7 дней
- Хранится в httpOnly cookie
- Используется для получения новых access токенов
- Поддерживает версионирование для отзыва токенов

### Cookie настройки
- **HttpOnly**: Защита от XSS атак
- **Secure**: Только HTTPS в продакшене  
- **SameSite=Strict**: Защита от CSRF атак
- **Path=/**: Доступны для всего домена

## Защитные механизмы

1. **XSS защита**: httpOnly cookies недоступны JavaScript
2. **CSRF защита**: SameSite=Strict cookies
3. **Автоматическое обновление токенов**: Прозрачно для пользователя
4. **Централизованный API**: Единая точка для всех запросов
5. **Graceful logout**: Очистка всех токенов на сервере и клиенте

## Развертывание

1. Добавить новые переменные окружения в Netlify
2. Развернуть обновленные функции
3. Обновить фронтенд с новыми переменными
4. Протестировать процесс входа/выхода

## Миграция для пользователей

Пользователи с токенами в localStorage будут автоматически разлогинены при первом посещении и должны будут войти заново. Их токены в localStorage станут неактивными и будут заменены безопасными httpOnly cookies.