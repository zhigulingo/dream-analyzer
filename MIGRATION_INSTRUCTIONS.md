# Инструкции по миграции базы данных

## Шаг 1: Выполнить SQL миграцию в Supabase

1. Откройте **Supabase Dashboard** → ваш проект
2. Перейдите в **SQL Editor** (левое меню)
3. Скопируйте содержимое файла `bot/functions/shared/database/migration_rag_setup.sql`
4. Вставьте в SQL Editor и нажмите **Run**

Эта миграция создаст:
- Индекс для быстрого векторного поиска `idx_knowledge_chunks_embedding`
- RPC функцию `match_knowledge` для RAG поиска по схожести

## Шаг 2: Загрузить данные в knowledge_chunks

После выполнения миграции нужно наполнить таблицу данными.

### Вариант A: Через локальный скрипт (рекомендуется)

```bash
npm run ingest:knowledge
```

### Вариант B: Через Netlify функцию

Выполните POST запрос к функции:

```bash
curl -X POST https://YOUR-BOT-SITE.netlify.app/.netlify/functions/ingest-knowledge \
  -H "Content-Type: application/json" \
  -d '{"reset": false}'
```

Или с reset (удалит все существующие данные):

```bash
curl -X POST https://YOUR-BOT-SITE.netlify.app/.netlify/functions/ingest-knowledge \
  -H "Content-Type: application/json" \
  -d '{"reset": true}'
```

## Шаг 3: Проверить результат

Проверьте, что данные загружены:

```sql
SELECT COUNT(*) FROM knowledge_chunks;
```

Должно быть > 0 записей (ожидается ~50-100 чанков из символов и архетипов).

## Шаг 4: Снять бота с паузы

1. Перейдите в **Netlify Dashboard** → ваш Bot site → **Site settings** → **Environment variables**
2. Найдите переменную `BOT_PAUSED`
3. Измените значение на `false` или удалите переменную
4. Сохраните изменения
5. Netlify автоматически передеплоит функции

## Шаг 5: Протестировать

1. Отправьте боту сообщение с текстом сна
2. Проверьте логи в Netlify Dashboard → Functions → bot → Logs
3. Убедитесь, что:
   - Токены списываются корректно (только один раз)
   - RAG контекст добавляется к анализу
   - Анализ появляется в TMA приложении

## Проверка работы RAG

Проверьте, что RPC функция работает:

```sql
-- Создаем тестовый вектор (768 размерность, заполненный нулями для теста)
SELECT match_knowledge(
  ARRAY(SELECT 0.0 FROM generate_series(1, 768))::vector(768),
  5,
  0.0
);
```

Если функция работает, но возвращает 0 результатов - нужно загрузить данные (Шаг 2).

