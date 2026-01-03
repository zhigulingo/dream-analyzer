# 🚀 Создание деплоя для vercel-export вручную

## Проблема

Vercel не создал автоматический деплой для ветки `vercel-export`.

## Решение: Создать деплой вручную

### Вариант 1: Через Vercel Dashboard (рекомендуется)

1. **В Vercel Dashboard:**
   - Откройте проект `dream-analyzer`
   - Перейдите на вкладку **Deployments**
   - Нажмите кнопку **"Create Deployment"** (обычно справа вверху)

2. **Настройки деплоя:**
   - **Branch:** выберите `vercel-export` из списка
   - **Environment:** выберите **Production**
   - **Root Directory:** убедитесь что `bot` (или оставьте пустым, если Root Directory настроен в Settings)
   - Нажмите **Deploy**

3. **Дождитесь завершения:**
   - Следите за прогрессом в Build Logs
   - После завершения статус должен быть **Ready**

### Вариант 2: Через Vercel CLI

```bash
# Установить Vercel CLI (если еще не установлен)
npm i -g vercel

# Перейти в директорию bot
cd bot

# Залогиниться (если первый раз)
vercel login

# Создать деплой
vercel --prod --branch vercel-export
```

### Вариант 3: Проверить настройки автоматического деплоя

1. **Settings → Git:**
   - Проверьте **Production Branch** - должно быть `vercel-export`
   - Проверьте **Automatic deployments from Git** - должно быть включено

2. **Settings → Git → Connected Git Repository:**
   - Убедитесь что репозиторий подключен
   - Проверьте что ветка `vercel-export` видна

3. **После изменения настроек:**
   - Сделайте новый push в `vercel-export`:
     ```bash
     git push origin vercel-export
     ```
   - Или создайте пустой коммит:
     ```bash
     git commit --allow-empty -m "Trigger Vercel deployment"
     git push origin vercel-export
     ```

## Проверка после создания деплоя

1. **Deployments:**
   - Должен появиться новый деплой из `vercel-export`
   - Статус должен быть **Ready**

2. **Functions:**
   - Вкладка **Functions** должна показывать функции из `bot/api/`

3. **Тест:**
   ```bash
   curl https://dream-analyzer-seven.vercel.app/api/health
   ```

## Если деплой не создается

### Проверьте Build Logs

1. Откройте деплой
2. Вкладка **Build Logs**
3. Ищите ошибки:
   - "No functions found" → проверьте Root Directory
   - "Cannot find module" → проверьте что файлы закоммичены
   - "Build failed" → проверьте ошибки в логах

### Проверьте настройки проекта

1. **Settings → General:**
   - **Root Directory:** должно быть `bot`
   - **Framework Preset:** должно быть **Other** или **No Framework**

2. **Settings → Git:**
   - **Production Branch:** должно быть `vercel-export`
   - **Automatic deployments:** должно быть включено

## Альтернатива: Использовать GitHub Actions

Если автоматический деплой не работает, можно настроить через GitHub Actions (но это сложнее).

---

**Рекомендация:** Начните с **Варианта 1** - создайте деплой вручную через Dashboard. Это самый быстрый способ.
