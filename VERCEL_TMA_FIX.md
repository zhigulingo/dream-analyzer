# 🔧 Исправление ошибки деплоя TMA

## Проблемы:

1. **Деплой из неправильной ветки:** проект деплоится из `main` вместо `vercel-export`
2. **Проблема с Node.js версией:** Vercel использует Node.js v24.12.0, который может быть несовместим с Vite

## Решения:

### 1. Изменить Production Branch на `vercel-export`

1. **Vercel Dashboard** → проект `dream-analyzer-tma`
2. **Settings** → **Git** → **Production Branch**
3. Нажмите **Edit**
4. Выберите `vercel-export`
5. Нажмите **Save**
6. Vercel автоматически передеплоит из `vercel-export`

### 2. Указать версию Node.js

Добавлено в `tma/package.json`:
```json
"engines": {
  "node": "20.x"
}
```

Это заставит Vercel использовать Node.js 20 вместо 24.

### 3. Улучшена конфигурация vercel.json

Добавлен `installCommand` для явного указания команды установки зависимостей.

## После исправлений:

1. Убедитесь что Production Branch = `vercel-export`
2. Создайте новый деплой или дождитесь автоматического деплоя
3. Деплой должен пройти успешно

## Если ошибка повторится:

1. Проверьте что деплой идет из ветки `vercel-export`
2. Проверьте Build Logs - там должна быть версия Node.js 20
3. Если проблема с зависимостями - попробуйте:
   - Удалить `node_modules` и `package-lock.json` локально
   - Переустановить зависимости: `npm install`
   - Закоммитить обновленный `package-lock.json`
