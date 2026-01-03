# 🔄 Переключение Production на ветку vercel-export

## Проблема

Production Deployment показывает источник `main`, хотя в настройках указан `vercel-export`.

## Решение

### Вариант 1: Создать новый деплой из vercel-export (рекомендуется)

1. **В Vercel Dashboard:**
   - Откройте проект `dream-analyzer`
   - Перейдите на вкладку **Deployments**
   - Найдите деплой из ветки `vercel-export` (должен быть после вашего push)
   - Кликните на этот деплой

2. **Промоутить в Production:**
   - В правом верхнем углу деплоя найдите кнопку **"..."** (три точки)
   - Выберите **"Promote to Production"**
   - Подтвердите

3. **Проверить:**
   - Production Deployment должен обновиться
   - Источник должен стать `vercel-export`

### Вариант 2: Проверить настройки Production Branch

1. **Settings → Git:**
   - Проверьте **Production Branch**
   - Должно быть: `vercel-export`
   - Если нет - измените и сохраните

2. **Settings → General:**
   - Проверьте **Root Directory**
   - Должно быть: `bot`

3. **После изменения настроек:**
   - Vercel может автоматически передеплоить
   - Или создайте новый деплой вручную

### Вариант 3: Передеплой вручную

1. **В Vercel Dashboard:**
   - **Deployments** → **"..."** → **"Redeploy"**
   - Выберите ветку: `vercel-export`
   - Выберите окружение: **Production**
   - Нажмите **Redeploy**

## Проверка после переключения

1. **Deployments:**
   - Production должен показывать источник `vercel-export`
   - Статус должен быть **Ready**

2. **Functions:**
   - Вкладка **Functions** должна показывать функции из `bot/api/`

3. **Тест:**
   ```bash
   curl https://dream-analyzer-seven.vercel.app/api/health
   ```

## Если 404 ошибка остается

404 ошибка может быть из-за:

1. **Root Directory не настроен:**
   - Settings → General → Root Directory = `bot`

2. **Функции не найдены:**
   - Проверьте что `bot/api/` существует
   - Проверьте что `bot/vercel.json` существует
   - Проверьте Build Logs на ошибки

3. **Rewrites не работают:**
   - Проверьте `bot/vercel.json` rewrites
   - Попробуйте прямой вызов: `/api/health-check` (без rewrite)

## Быстрая проверка

1. **Deployments** → найти деплой из `vercel-export`
2. Если есть - **Promote to Production**
3. Если нет - проверить что push прошел успешно
4. Проверить Build Logs на ошибки

---

**Важно:** После переключения на `vercel-export` все новые коммиты в `vercel-export` будут автоматически деплоиться в Production.
