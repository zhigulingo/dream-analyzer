# 🚀 Следующие шаги для запуска на Vercel

## ✅ Что уже готово:

1. ✅ Адаптер создан (`bot/api/_netlify-adapter.js`)
2. ✅ Обертки для всех функций созданы (35 функций)
3. ✅ Shared модули скопированы
4. ✅ `vercel.json` настроен
5. ✅ Проект подключен к Vercel

## 📝 Что нужно сделать сейчас:

### Шаг 1: Закоммитить изменения

```bash
# Добавить все файлы для Vercel
git add bot/api/
git add bot/vercel.json
git add scripts/create-vercel-wrappers.js
git add scripts/check-vercel-ready.js

# Закоммитить
git commit -m "Add Vercel migration setup with adapters and wrappers"
```

### Шаг 2: Запушить в ветку vercel-export

```bash
# Переключиться на ветку (если еще не на ней)
git checkout vercel-export

# Или создать ветку если её нет
# git checkout -b vercel-export

# Запушить
git push origin vercel-export
```

### Шаг 3: Проверить в Vercel Dashboard

1. Зайти на [vercel.com/dashboard](https://vercel.com/dashboard)
2. Найти ваш проект
3. Проверить что появился новый деплой

**Что проверить:**
- ✅ **Settings → General → Root Directory** = `bot`
- ✅ **Deployments** - есть новый деплой
- ✅ **Settings → Environment Variables** - все переменные добавлены

### Шаг 4: Проверить логи деплоя

1. Открыть последний деплой
2. Вкладка **Build Logs**
3. Прокрутить вниз

**Если ошибки:**
- Скопировать ошибку
- Проверить по `VERCEL_DIAGNOSTICS.md`

**Если успешно:**
- Перейти к шагу 5

### Шаг 5: Протестировать функцию

```bash
# Замените YOUR_PROJECT на ваш проект из Vercel Dashboard
curl https://YOUR_PROJECT.vercel.app/api/health
```

**Ожидаемый результат:**
```json
{
  "status": "healthy",
  "timestamp": "...",
  "components": {...}
}
```

### Шаг 6: Проверить логи функций

1. В Vercel Dashboard → **Functions**
2. Выбрать `health-check`
3. Вкладка **Logs**
4. Вызвать функцию еще раз
5. Посмотреть логи в реальном времени

## 🔍 Что проверить в Vercel Dashboard:

### 1. Root Directory (КРИТИЧНО!)

**Settings → General → Root Directory**

Должно быть: `bot`

Если не настроено:
- Нажать **Edit**
- Ввести: `bot`
- Сохранить
- Vercel автоматически передеплоит

### 2. Environment Variables

**Settings → Environment Variables**

Должны быть:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BOT_TOKEN`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `REFRESH_SECRET`
- `ALLOWED_TMA_ORIGIN`
- `ALLOWED_WEB_ORIGIN`

### 3. Functions

**Functions** (вкладка в меню)

Должны быть видны функции:
- `health-check`
- `user-profile`
- `bot`
- и другие...

### 4. Деплои

**Deployments** (главная страница)

Статус должен быть: ✅ **Ready** (зеленый)

## ⚠️ Типичные проблемы:

### Проблема: "No functions found"

**Решение:**
1. Проверить Root Directory = `bot`
2. Проверить что файлы закоммичены
3. Передеплоить проект

### Проблема: "Cannot find module"

**Решение:**
1. Проверить что `bot/api/_netlify-adapter.js` существует
2. Проверить что `bot/api/shared/` скопирована
3. Проверить логи деплоя

### Проблема: "Function returns 404"

**Решение:**
1. Проверить `vercel.json` rewrites
2. Проверить что функция в `bot/api/`
3. Проверить имя файла

## 📚 Полезные документы:

- `VERCEL_DASHBOARD_GUIDE.md` - подробная инструкция по Dashboard
- `VERCEL_DIAGNOSTICS.md` - диагностика проблем
- `VERCEL_ITERATIVE_MIGRATION.md` - план постепенной миграции

## 🎯 После успешного запуска:

1. ✅ Протестировать все основные endpoints
2. ✅ Обновить `WEBHOOK_URL` для бота
3. ✅ Создать проекты для `web/` и `tma/`
4. ✅ Начать постепенную миграцию функций

---

**Совет:** Начните с `/api/health` - это самая простая функция. Если она работает, значит базовая настройка правильная!
