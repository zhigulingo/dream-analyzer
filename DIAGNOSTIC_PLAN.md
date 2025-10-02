# 🔍 План диагностики и исправления проблем

## ✅ Что уже проверено:

1. **База знаний загружена корректно:**
   - ✅ 36 символов снов
   - ✅ 10 архетипов
   - ✅ Всего 46 чанков в таблице `knowledge_chunks`

---

## 🐛 Обнаруженные проблемы:

### **Проблема 1: /start не отвечает при повторном вызове**

**Причина:** Синтаксическая ошибка в `start-command.js` (строка 95-96)

```javascript:95-96:bot/functions/bot/handlers/start-command.js
} // Отсутствует catch блок!
    console.error("[StartCommandHandler] CRITICAL Error:", error.message);
```

Блок `catch` не открыт, что ломает всю функцию.

**Исправление:** Добавить `catch (error) {` на строке 95

---

### **Проблема 2: Дублирование сообщений "анализ готов"**

**Возможные причины:**

1. **Telegram ретраи webhook'а** - если функция не отвечает быстро, Telegram повторяет запрос
2. **Дублирование в text-message handler** - есть две отправки статусного сообщения:
   - Строка 109: `sendStatusMessage`
   - Строка 125: `sendStatusMessage` (повторно!)
3. **Race condition** - идемпотентность кеша не работает корректно

**Основная проблема:** В `text-message.js` строки 109 и 125 - дважды создается статусное сообщение!

```javascript:108-125:bot/functions/bot/handlers/text-message.js
// Первое статусное сообщение (строка 109)
statusMessage = await messageService.sendStatusMessage(ctx, messages.get('analysis.status'));

// ... код ...

// ВТОРОЕ статусное сообщение (строка 125) - ошибка!
const status = await messageService.sendStatusMessage(ctx, messages.get('analysis.status'));
```

---

## 🎯 План действий:

### **Шаг 1: Исправить синтаксическую ошибку в start-command.js**

**Файл:** `bot/functions/bot/handlers/start-command.js`  
**Строки:** 94-98

**Было:**
```javascript
        }
            console.error("[StartCommandHandler] CRITICAL Error:", error.message);
            await messageService.sendReply(ctx, messages.get('start.profile_error', { error: error.message }));
        }
```

**Должно быть:**
```javascript
        } catch (error) {
            console.error("[StartCommandHandler] CRITICAL Error:", error.message);
            await messageService.sendReply(ctx, messages.get('start.profile_error', { error: error.message }));
        }
```

---

### **Шаг 2: Убрать дублирование статусных сообщений в text-message.js**

**Файл:** `bot/functions/bot/handlers/text-message.js`  
**Проблемные строки:** 108-125

**Было:**
```javascript
// Send status message
statusMessage = await messageService.sendStatusMessage(ctx, messages.get('analysis.status'));
if (!statusMessage) {
    throw new Error("Failed to send status message.");
}

// Get user data
const userData = await userService.getOrCreateUser(userId);

// Check token availability BEFORE any decrement
console.log(`[TextMessageHandler] Checking token availability for ${userId}...`);
const hasToken = await userService.hasAvailableToken(userId);
if (!hasToken) {
    throw new Error("Insufficient tokens for analysis.");
}

// Отправляем задачу на фоновую функцию, чтобы обойти лимит 10s
// NOTE: Token decrement happens in the background function AFTER successful analysis
const status = await messageService.sendStatusMessage(ctx, messages.get('analysis.status')); // ДУБЛИКАТ!
```

**Должно быть:**
```javascript
// Send status message
statusMessage = await messageService.sendStatusMessage(ctx, messages.get('analysis.status'));
if (!statusMessage) {
    throw new Error("Failed to send status message.");
}

// Get user data
const userData = await userService.getOrCreateUser(userId);

// Check token availability BEFORE any decrement
console.log(`[TextMessageHandler] Checking token availability for ${userId}...`);
const hasToken = await userService.hasAvailableToken(userId);
if (!hasToken) {
    throw new Error("Insufficient tokens for analysis.");
}

// Отправляем задачу на фоновую функцию, чтобы обойти лимит 10s
// NOTE: Token decrement happens in the background function AFTER successful analysis
```

Удалить строку 125 с повторным созданием статусного сообщения.

---

### **Шаг 3: Проверить работу RAG системы**

После исправления проблем нужно проверить, что RAG работает.

#### **3.1 Проверка через Netlify Logs**

1. Отправьте боту сон с известными символами:
   ```
   Мне снилось, что я падаю с высоты в воду
   ```

2. Откройте Netlify Functions → `analyze-dream-background` → Logs

3. Найдите строки:
   ```
   [analyze-dream-background] RAG matches: X
   ```

   **Ожидается:** X > 0 (например, 3-5 совпадений)

#### **3.2 Проверка через Supabase SQL**

Выполните тестовый запрос RPC функции:

```sql
-- Создаем тестовый эмбеддинг (случайный вектор для проверки)
SELECT 
  title, 
  category, 
  LEFT(chunk, 100) as preview,
  similarity
FROM match_knowledge(
  ARRAY(SELECT random() FROM generate_series(1, 768))::vector(768),
  5,
  0.3
);
```

**Ожидается:** 0-5 результатов (даже для случайного вектора должны быть какие-то совпадения)

#### **3.3 Проверка качества анализа**

Отправьте сон с **явными символами** из базы знаний:

```
Мне приснилось, что я сдаю экзамен, но внезапно понимаю, что я голый. Затем я начинаю падать вниз и вижу воду внизу. Рядом появляется старый мудрый человек, который что-то говорит мне.
```

**В анализе должны быть упоминания:**
- Экзамен/провал (символ из базы)
- Нагота (символ)
- Падение (символ)
- Вода (символ)
- Мудрый старец (архетип)

---

### **Шаг 4: Оптимизация идемпотентности**

Если дублирование продолжается, усилить idempotency кеш:

```javascript
// В text-message.js, строка ~94-96
cache.set(idemKey, true, 60 * 60 * 1000); // 1 hour TTL
cache.set(rateKey, true, 15 * 1000); // Увеличить с 10 до 15 секунд
cache.set(inflightKey, true, 180 * 1000); // Увеличить с 120 до 180 секунд
```

---

## 📊 Ожидаемые результаты после исправлений:

1. ✅ `/start` работает при повторном вызове
2. ✅ Сообщение "анализ готов" приходит **один раз**
3. ✅ Анализ появляется в TMA сразу после сообщения бота
4. ✅ В анализе используются данные из базы знаний (символы/архетипы)
5. ✅ RAG matches > 0 в логах

---

## 🔧 Следующие шаги:

1. **Исправить код** (Шаги 1-2)
2. **Закоммитить и запушить**
3. **Дождаться деплоя Netlify** (~2 минуты)
4. **Протестировать** (Шаг 3)
5. **Проверить логи** для подтверждения работы RAG

---

## 🆘 Если проблемы остаются:

### Дублирование сообщений:
- Проверить логи `bot` функции на наличие повторных webhook вызовов
- Увеличить TTL idempotency кеша
- Проверить, что Telegram webhook настроен корректно

### RAG не работает:
- Проверить, что RPC функция `match_knowledge` создана
- Проверить логи на ошибки embedding
- Проверить similarity threshold (возможно, слишком высокий 0.75 → понизить до 0.6)

### /start не работает:
- Проверить логи функции `bot` на ошибки
- Убедиться, что синтаксическая ошибка исправлена

