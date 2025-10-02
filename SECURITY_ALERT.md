# 🚨 КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ БЕЗОПАСНОСТИ

## ⚠️ Что произошло:

Файл `.env` с секретными ключами был **случайно закоммичен** в публичный/приватный репозиторий GitHub в коммите `5ff42dc`.

**Файл удален из репозитория в коммите `9f35a6c`**, но история Git **сохраняет все предыдущие версии**.

---

## 🔥 СРОЧНЫЕ ДЕЙСТВИЯ (выполнить НЕМЕДЛЕННО):

### **Шаг 1: Ротировать все секретные ключи**

Любой, кто имел доступ к репозиторию между коммитами `5ff42dc` и `9f35a6c`, мог видеть ваши ключи.

#### **1.1 Supabase Service Role Key** (КРИТИЧНО!)

1. Откройте: https://supabase.com/dashboard → Ваш проект
2. **Settings** → **API**
3. Нажмите **"Regenerate"** рядом с `service_role` key
4. Скопируйте новый ключ
5. Обновите в Netlify:
   - Bot site → Environment variables → `SUPABASE_SERVICE_ROLE_KEY`

#### **1.2 Gemini API Key**

1. Откройте: https://aistudio.google.com/app/apikey
2. Найдите ваш текущий ключ
3. Нажмите **Delete** → подтвердите
4. Создайте **новый** API ключ
5. Обновите в Netlify:
   - Bot site → Environment variables → `GEMINI_API_KEY`

#### **1.3 JWT Secrets**

1. Сгенерируйте новые секреты:
```bash
node -e "console.log('JWT_SECRET:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('REFRESH_SECRET:', require('crypto').randomBytes(32).toString('hex'))"
```

2. Обновите в Netlify:
   - Bot site → Environment variables
   - `JWT_SECRET` → новое значение
   - `REFRESH_SECRET` → новое значение

**⚠️ ВНИМАНИЕ:** После изменения JWT секретов все существующие Web сессии станут невалидными. Пользователи должны будут перелогиниться.

#### **1.4 Telegram Bot Token** (если был в .env)

1. Откройте Telegram → @BotFather
2. Отправьте: `/mybots`
3. Выберите вашего бота
4. **Bot Settings** → **Regenerate Token**
5. Обновите в Netlify:
   - Bot site → Environment variables → `BOT_TOKEN`
6. После обновления запустите: `/.netlify/functions/set-webhook`

---

### **Шаг 2: Очистить историю Git (опционально, для параноиков)**

Если репозиторий **приватный** и вы уверены, что никто кроме вас не имел доступа, можно просто ротировать ключи (Шаг 1).

Если репозиторий **публичный** или вы хотите полностью удалить ключи из истории:

```bash
# ВНИМАНИЕ! Это переписывает историю Git!
# Сделайте резервную копию перед выполнением!

cd /Users/zhigulingo/Downloads/Cursor/dream-analyzer

# Установите BFG Repo-Cleaner (если еще нет)
brew install bfg

# Очистите .env из всей истории
bfg --delete-files .env

# Принудительно обновите все ссылки
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Форс-пуш (ОПАСНО! Переписывает историю!)
git push origin --force --all
```

**⚠️ ВНИМАНИЕ:** Force push переписывает историю. Все, кто клонировал репозиторий, должны будут сделать fresh clone.

---

### **Шаг 3: Проверить логи доступа**

#### Supabase:
1. Dashboard → Project → **Logs**
2. Проверьте необычную активность за последние 24 часа
3. Обратите внимание на неизвестные IP адреса

#### GitHub:
1. Repository → **Settings** → **Security** → **Audit log**
2. Проверьте, кто клонировал/просматривал репозиторий

#### Netlify:
1. Site → **Analytics** → **Bandwidth**
2. Проверьте необычные всплески активности

---

### **Шаг 4: Мониторинг (следующие 7 дней)**

- [ ] Ежедневно проверяйте Supabase usage dashboard
- [ ] Мониторьте Gemini API квоту
- [ ] Следите за Netlify функциями на предмет необычной активности
- [ ] Проверяйте базу данных на несанкционированные изменения

---

## 📋 Чек-лист действий:

- [ ] **КРИТИЧНО**: Ротирован Supabase Service Role Key
- [ ] **КРИТИЧНО**: Ротирован Gemini API Key
- [ ] Ротированы JWT_SECRET и REFRESH_SECRET
- [ ] Ротирован BOT_TOKEN (если был)
- [ ] Обновлены все ключи в Netlify Environment Variables
- [ ] Проверены логи Supabase/GitHub/Netlify
- [ ] Настроен мониторинг на 7 дней
- [ ] (Опционально) Очищена история Git

---

## 🛡️ Предотвращение в будущем:

### Уже сделано:
✅ `.env` добавлен в `.gitignore`  
✅ Добавлены комментарии в `environment.example`

### Дополнительные меры:

1. **Pre-commit hook для проверки секретов:**

```bash
# .git/hooks/pre-commit
#!/bin/bash
if git diff --cached --name-only | grep -q "\.env$"; then
    echo "❌ ERROR: Attempting to commit .env file!"
    echo "This file contains secrets and should never be committed."
    exit 1
fi
```

2. **GitHub Secret Scanning** (если репозиторий на GitHub):
   - Settings → Security → Code security and analysis
   - Enable: "Secret scanning"

3. **Использовать secrets management**:
   - Netlify Environment Variables (уже используется ✅)
   - GitHub Secrets для CI/CD
   - Vault/AWS Secrets Manager для production

---

## 📞 Помощь:

Если обнаружена подозрительная активность:
1. Немедленно смените ВСЕ ключи
2. Проверьте базу данных на изменения
3. Временно отключите Telegram бота (`BOT_PAUSED=true`)
4. Свяжитесь с поддержкой Supabase/Gemini при необходимости

---

**Выполните Шаг 1 НЕМЕДЛЕННО, даже если репозиторий приватный!**

