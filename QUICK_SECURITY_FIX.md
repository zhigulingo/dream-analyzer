# ⚡ Быстрое исправление безопасности (5 минут)

## ✅ Что уже сделано:
- ✅ .env удален из репозитория
- ✅ .gitignore обновлен
- ✅ Изменения запушены

---

## 🔥 ЧТО НУЖНО СДЕЛАТЬ ПРЯМО СЕЙЧАС:

### 1️⃣ Supabase Service Role Key (2 минуты)

1. https://supabase.com/dashboard → Ваш проект
2. Settings → API → **Regenerate** (service_role key)
3. Скопировать новый ключ
4. https://app.netlify.com/sites/sparkling-cupcake-940504/configuration/env
5. Найти `SUPABASE_SERVICE_ROLE_KEY` → Edit → Вставить новый → Save

---

### 2️⃣ Gemini API Key (2 минуты)

1. https://aistudio.google.com/app/apikey
2. Удалить старый ключ
3. Создать новый
4. https://app.netlify.com/sites/sparkling-cupcake-940504/configuration/env
5. Найти `GEMINI_API_KEY` → Edit → Вставить новый → Save

---

### 3️⃣ JWT Secrets (1 минута)

В терминале:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Netlify → Environment variables:
- `JWT_SECRET` → первое значение
- `REFRESH_SECRET` → второе значение

---

## ⚠️ После изменения ключей:

1. Netlify автоматически передеплоит (~2 минуты)
2. Все Web пользователи должны будут перелогиниться
3. Telegram бот продолжит работать без изменений

---

## 📊 Проверка:

После деплоя проверьте, что всё работает:
- [ ] Бот отвечает на сообщения
- [ ] TMA открывается
- [ ] Анализ снов работает

Если что-то сломалось → проверьте правильность ключей в Netlify.

---

**Детальная информация:** см. `SECURITY_ALERT.md`

