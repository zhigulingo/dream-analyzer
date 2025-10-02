# Инструкция: Проверка деплоя и загрузка данных

## Шаг 1: Дождаться деплоя Netlify (~2 минуты)

1. Откройте: https://app.netlify.com/sites/sparkling-cupcake-940504/deploys
2. Дождитесь, пока статус последнего деплоя станет **Published** (зеленая галочка)
3. Проверьте, что в коммите есть: `Fix: Исправлена функция ingest-knowledge...`

## Шаг 2: Выполнить SQL миграцию в Supabase (ОБЯЗАТЕЛЬНО!)

⚠️ **БЕЗ ЭТОГО ШАГА НИЧЕГО НЕ БУДЕТ РАБОТАТЬ!**

1. Откройте: https://supabase.com/dashboard
2. Выберите ваш проект
3. SQL Editor (левое меню)
4. Создайте новый запрос
5. Скопируйте **ВЕСЬ** текст из файла: `bot/functions/shared/database/migration_rag_setup.sql`
6. Вставьте и нажмите **Run**

**Ожидаемый результат:**
```
Success. No rows returned
```

## Шаг 3: Загрузить данные через Netlify функцию

```bash
curl -X POST "https://sparkling-cupcake-940504.netlify.app/.netlify/functions/ingest-knowledge" \
  -H "Content-Type: application/json" \
  -d '{"reset": false}' \
  -w "\nHTTP: %{http_code}\n"
```

**Ожидаемый ответ:**
```json
{"ok":true,"inserted":45,"reset":false}
HTTP: 200
```

Если вместо этого получаете ошибку - проверьте Netlify логи:
https://app.netlify.com/sites/sparkling-cupcake-940504/functions/ingest-knowledge

## Шаг 4: Проверить результат в Supabase

Выполните в SQL Editor:

```sql
SELECT COUNT(*) as total FROM knowledge_chunks;
```

**Ожидаемый результат:** `total: 45` (35 символов + 10 архетипов)

**Проверить содержимое:**
```sql
SELECT category, COUNT(*) as count 
FROM knowledge_chunks 
GROUP BY category;
```

Должно быть:
- symbols: ~35
- archetypes: ~10

## Шаг 5: Снять бота с паузы

1. https://app.netlify.com/sites/sparkling-cupcake-940504/configuration/env
2. Найти `BOT_PAUSED`
3. Изменить на `false` или **Удалить переменную**
4. Save

## Шаг 6: Протестировать

Отправьте боту сообщение:
```
Мне снилась вода, и я падал вниз
```

Проверьте логи:
https://app.netlify.com/sites/sparkling-cupcake-940504/functions/analyze-dream-background

Найдите строку:
```
[analyze-dream-background] RAG matches: X
```

Если X > 0 → **Всё работает! 🎉**

---

## Возможные проблемы

### ❌ HTTP 500 при ingest

**Решение:** Подождите еще 1-2 минуты (деплой может занять больше времени)

### ❌ "Source JSON not found"

**Решение:** Файл не попал в деплой. Проверьте netlify.toml:
```toml
included_files = ["docs/dream_symbols_archetypes.json"]
```

### ❌ "match_knowledge RPC not found"

**Решение:** Не выполнена SQL миграция (Шаг 2)! Это ОБЯЗАТЕЛЬНЫЙ шаг!

### ❌ Gemini API location error

Это норма для локального запуска. Используйте только Netlify функцию.

