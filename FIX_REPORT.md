# Отчет о исправлении проблем Dream Analyzer

**Дата:** 2 октября 2025  
**Статус:** Исправления внесены, требуется выполнить миграцию БД и настройку env

---

## ✅ ИСПРАВЛЕННЫЕ ПРОБЛЕМЫ

### 1. Исправлена пустая функция `embed()` ✅
**Файл:** `bot/functions/analyze-dream-background.js`

**Что было:**
```javascript
async function embed(text) {
    // Пустая функция - возвращала undefined
}
```

**Что стало:**
```javascript
async function embed(text) {
    try { 
        return await embeddingService.embed(text); 
    } catch (err) { 
        console.warn('[analyze-dream-background] Embedding failed:', err?.message);
        return null; 
    }
}
```

**Результат:** Теперь функция корректно вызывает embeddingService для создания векторных эмбеддингов текста снов.

---

### 2. Устранено дублирование списания токенов ✅
**Файл:** `bot/functions/bot/handlers/text-message.js`

**Проблема:** Токены списывались дважды:
1. В `text-message.js` после вызова background функции (строка 140)
2. В `analyze-dream-background.js` после успешного анализа (строка 119)

**Исправление:** 
- Удалено списание токена из `text-message.js`
- Списание происходит только в `analyze-dream-background.js` ПОСЛЕ успешного Gemini анализа
- Добавлен комментарий с пояснением логики

**Результат:** Токены списываются только один раз, только при успешном анализе.

---

### 3. Создана SQL миграция для RAG системы ✅
**Файл:** `bot/functions/shared/database/migration_rag_setup.sql`

**Что создано:**
1. **Индекс для векторного поиска:**
   ```sql
   CREATE INDEX idx_knowledge_chunks_embedding 
   ON knowledge_chunks 
   USING ivfflat (embedding vector_cosine_ops)
   WITH (lists = 100);
   ```

2. **RPC функция `match_knowledge`:**
   - Принимает query_embedding (768-мерный вектор)
   - Возвращает топ-N наиболее похожих чанков знаний
   - Использует косинусное сходство (cosine similarity)
   - Фильтрует по минимальному порогу схожести

**Результат:** RAG система готова к работе после выполнения миграции.

---

### 4. Проверено расширение pgvector ✅
**Статус:** pgvector версии 0.8.0 уже установлен в Supabase.

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ ВРУЧНУЮ

### ⚠️ Шаг 1: Выполнить SQL миграцию (ОБЯЗАТЕЛЬНО)

1. Откройте **Supabase Dashboard** → SQL Editor
2. Скопируйте содержимое файла:
   ```
   bot/functions/shared/database/migration_rag_setup.sql
   ```
3. Вставьте в SQL Editor и нажмите **Run**

**Это создаст RPC функцию `match_knowledge`, без которой RAG не работает!**

---

### ⚠️ Шаг 2: Загрузить данные в knowledge_chunks

Таблица `knowledge_chunks` сейчас **пустая** (0 строк).

**Вариант A - Локально (быстрее):**
```bash
npm run ingest:knowledge
```

**Вариант B - Через Netlify функцию:**
```bash
curl -X POST https://sparkling-cupcake-940504.netlify.app/.netlify/functions/ingest-knowledge \
  -H "Content-Type: application/json" \
  -d '{"reset": true}'
```

**Ожидаемый результат:** ~50-100 чанков из `docs/dream_symbols_archetypes.json` будут загружены.

**Проверка:**
```sql
SELECT COUNT(*) FROM knowledge_chunks;
-- Должно быть > 0
```

---

### ⚠️ Шаг 3: Снять бота с паузы

1. **Netlify Dashboard** → Bot site (`sparkling-cupcake-940504`)
2. **Site settings** → **Environment variables**
3. Найти переменную `BOT_PAUSED`
4. Изменить значение на `false` (или удалить переменную)
5. Сохранить

**Netlify автоматически передеплоит функции (~1-2 минуты).**

---

## 🔍 ДОПОЛНИТЕЛЬНАЯ ДИАГНОСТИКА

### Проверка работы RAG после миграции

После выполнения шагов 1-2, проверьте в Supabase SQL Editor:

```sql
-- Тестовый запрос RPC функции
SELECT match_knowledge(
  ARRAY(SELECT random() FROM generate_series(1, 768))::vector(768),
  5,
  0.5
);
```

Должно вернуть 0-5 записей (зависит от загруженных данных).

---

### Проверка работы бота

После выполнения всех шагов:

1. Отправьте боту сообщение с текстом сна
2. Проверьте логи: **Netlify Dashboard** → Functions → `analyze-dream-background` → Logs
3. Найдите строку:
   ```
   [analyze-dream-background] RAG matches: X
   ```
   Где X > 0 означает, что RAG работает

---

## 📊 СТАТУС ЗАДАЧ

- ✅ Исправлена пустая функция embed()
- ✅ Убрано дублирование списания токенов
- ✅ Создана SQL миграция для match_knowledge
- ✅ Проверено наличие pgvector
- ✅ Изменения закоммичены и запушены
- ⏳ **Выполнить SQL миграцию в Supabase** (нужно сделать вручную)
- ⏳ **Загрузить данные в knowledge_chunks** (нужно сделать вручную)
- ⏳ **Снять бота с паузы** (нужно сделать вручную)

---

## 🚀 ПОСЛЕ ЗАВЕРШЕНИЯ ВСЕХ ШАГОВ

Приложение будет полностью работоспособно:
- ✅ RAG система добавляет научный контекст к анализам снов
- ✅ Токены списываются корректно (без дублирования)
- ✅ Анализы сохраняются в БД и отображаются в TMA
- ✅ Бот реагирует на сообщения пользователей

---

## 📞 В СЛУЧАЕ ПРОБЛЕМ

**Если RAG не работает после миграции:**
1. Проверьте логи функции `analyze-dream-background` в Netlify
2. Убедитесь, что таблица `knowledge_chunks` не пустая
3. Проверьте, что функция `match_knowledge` создана в Supabase (SQL Editor)

**Если токены продолжают списываться дважды:**
1. Убедитесь, что изменения задеплоились на Netlify
2. Проверьте логи обеих функций: `bot` и `analyze-dream-background`

**Если бот не отвечает:**
1. Проверьте переменную `BOT_PAUSED` в Netlify env (должна быть `false`)
2. Проверьте логи функции `bot` в Netlify Dashboard

