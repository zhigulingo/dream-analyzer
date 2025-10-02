# 🚀 Быстрый старт после исправлений

## Текущий статус

✅ **Исправлено в коде:**
- Функция `embed()` в `analyze-dream-background.js` - теперь работает
- Дублирование списания токенов - устранено
- SQL миграция для RAG - создана

⏳ **Требует выполнения вручную:**
1. Выполнить SQL миграцию в Supabase
2. Загрузить данные в knowledge_chunks
3. Снять бота с паузы

---

## Шаг 1: Выполнить SQL миграцию (2 минуты)

### Через Supabase Dashboard:

1. Откройте https://supabase.com/dashboard
2. Выберите ваш проект
3. В левом меню: **SQL Editor**
4. Создайте новый запрос
5. Скопируйте весь текст из файла:
   ```
   bot/functions/shared/database/migration_rag_setup.sql
   ```
6. Вставьте в редактор
7. Нажмите **Run** или `Ctrl+Enter`

✅ **Ожидаемый результат:**
```
Success. No rows returned
```

---

## Шаг 2: Загрузить данные (5 минут)

### Вариант A: Через Netlify функцию (рекомендуется)

```bash
curl -X POST https://sparkling-cupcake-940504.netlify.app/.netlify/functions/ingest-knowledge \
  -H "Content-Type: application/json" \
  -d '{"reset": true}'
```

**Что происходит:**
- Функция читает `docs/dream_symbols_archetypes.json`
- Разбивает на чанки по 1200 символов
- Создает эмбеддинги через Gemini
- Загружает в таблицу `knowledge_chunks`

**Время выполнения:** ~3-5 минут (зависит от API лимитов Gemini)

**Проверка статуса:**
1. Netlify Dashboard → Functions → `ingest-knowledge` → Logs
2. Смотрите в реальном времени прогресс загрузки

### Вариант B: Локально (если настроены env переменные)

```bash
# Сначала создайте .env файл на основе environment.example
cp environment.example .env
# Заполните переменные SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY

# Затем запустите
npm run ingest:knowledge
```

---

## Шаг 3: Проверить загрузку данных

Выполните в Supabase SQL Editor:

```sql
SELECT COUNT(*) as total FROM knowledge_chunks;
```

✅ **Ожидаемый результат:** `total: 50-100` (примерно)

**Если 0:** повторите Шаг 2

**Просмотр данных:**
```sql
SELECT source, category, title, LEFT(chunk, 100) as preview 
FROM knowledge_chunks 
LIMIT 10;
```

---

## Шаг 4: Снять бота с паузы (1 минута)

1. Откройте https://app.netlify.com
2. Выберите Bot site: **sparkling-cupcake-940504**
3. **Site settings** → **Environment variables**
4. Найдите `BOT_PAUSED`
5. **Измените значение на `false`** или **Удалите переменную**
6. Нажмите **Save**

Netlify автоматически передеплоит функции (~1-2 минуты)

---

## Шаг 5: Протестировать работу (2 минуты)

### 1. Тест бота:
- Откройте Telegram
- Отправьте боту любое сообщение (например: "Мне снилась вода и рыбы")
- Дождитесь ответа

### 2. Проверка RAG в логах:
1. Netlify Dashboard → Functions → `analyze-dream-background` → Logs
2. Найдите строку:
   ```
   [analyze-dream-background] RAG matches: X
   ```
   - Если X > 0 → **RAG работает! 🎉**
   - Если X = 0 → проверьте, что данные загружены (Шаг 3)

### 3. Проверка токенов:
- Отправьте несколько снов подряд
- Проверьте в TMA, что токены списываются корректно (по 1 за анализ)

---

## Решение проблем

### ❌ "match_knowledge RPC not found"

**Причина:** Миграция не выполнена  
**Решение:** Повторите Шаг 1

### ❌ "RAG matches: 0" в логах

**Причина:** Таблица knowledge_chunks пустая  
**Решение:** Повторите Шаг 2, проверьте логи функции ingest-knowledge

### ❌ Бот не отвечает

**Причина:** BOT_PAUSED=true  
**Решение:** Повторите Шаг 4

### ❌ Токены списываются дважды

**Причина:** Старая версия кода на Netlify  
**Решение:** 
1. Проверьте последний деплой в Netlify Dashboard
2. Если деплой старее 5 минут назад - триггерните новый деплой

---

## Финальная проверка

После выполнения всех шагов:

```sql
-- 1. Проверка RPC функции
SELECT match_knowledge(
  ARRAY(SELECT 0.5 FROM generate_series(1, 768))::vector(768),
  3,
  0.5
) LIMIT 3;

-- 2. Проверка данных
SELECT COUNT(*) as chunks,
       COUNT(DISTINCT source) as sources,
       COUNT(DISTINCT category) as categories
FROM knowledge_chunks;
```

✅ **Всё работает, если:**
- RPC возвращает результаты (даже 0 строк - это норма для тестового вектора)
- chunks > 0
- sources > 0
- categories > 0

---

## 🎯 Что дальше?

После успешной настройки:

1. **Мониторинг:** Проверяйте логи первые несколько дней
2. **Тестирование:** Отправляйте разные типы снов (с символами, архетипами)
3. **Улучшение:** Добавляйте новые символы в `docs/dream_symbols_archetypes.json` и перезапускайте ingestion

---

## 📞 Нужна помощь?

Проверьте файлы:
- `FIX_REPORT.md` - детальный отчет об исправлениях
- `MIGRATION_INSTRUCTIONS.md` - подробные инструкции по миграции
- Логи Netlify Functions - для диагностики runtime ошибок

