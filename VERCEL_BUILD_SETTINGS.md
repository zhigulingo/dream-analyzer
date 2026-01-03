# ⚙️ Настройка Build and Deploy в Vercel

## Для Bot проекта (dream-analyzer-bot)

### Framework Settings:

**Framework Preset:**
- Выбрать: **Other** (или **No Framework**)
- Причина: Это только serverless функции, не фронтенд

### Root Directory:

**Root Directory:**
- Ввести: `bot`
- Это критически важно! Vercel должен знать где искать `vercel.json` и `api/` директорию

### Build and Output Settings:

**Build Command:**
- Можно оставить **пустым** (так как функций не нужно собирать)
- Или поставить: `echo "Functions only - no build needed"`
- Или: `npm install` (если нужны зависимости)

**Output Directory:**
- Оставить **пустым**
- Для функций не нужен output directory

**Install Command:**
- Можно оставить **пустым** (если зависимости в корне)
- Или: `npm install` (если есть `package.json` в `bot/`)

### Development Command:
- Оставить **пустым** или по умолчанию

## Пошаговая инструкция:

1. **Framework Preset:**
   - Кликнуть на выпадающий список
   - Выбрать: **Other** (внизу списка)

2. **Root Directory:**
   - Найти поле "Root Directory"
   - Ввести: `bot`
   - Нажать **Save** или **Apply**

3. **Build Command:**
   - Оставить пустым ИЛИ
   - Ввести: `echo "Functions deployment"`

4. **Output Directory:**
   - Оставить пустым

5. **Install Command:**
   - Оставить пустым (если зависимости в корне репозитория)
   - Или: `npm install` (если есть `bot/package.json`)

6. **Сохранить:**
   - Нажать **Save** внизу страницы
   - Vercel автоматически передеплоит проект

## Проверка после сохранения:

1. Перейти на вкладку **Deployments**
2. Должен появиться новый деплой (автоматически запустится)
3. Дождаться завершения деплоя
4. Проверить статус:
   - ✅ **Ready** (зеленый) = успешно
   - ❌ **Error** (красный) = есть ошибки

## Если что-то не работает:

### Проблема: "No functions found"
- Проверить что Root Directory = `bot`
- Проверить что `bot/vercel.json` существует
- Проверить что `bot/api/` существует

### Проблема: "Build failed"
- Проверить Build Command (лучше оставить пустым)
- Проверить логи деплоя

### Проблема: "Cannot find vercel.json"
- Проверить Root Directory = `bot`
- Проверить что файл `bot/vercel.json` закоммичен

## Для других проектов (позже):

### Web проект:
- Framework Preset: **Vite**
- Root Directory: `web`
- Build Command: `npm install && npm run build`
- Output Directory: `dist`

### TMA проект:
- Framework Preset: **Vite**
- Root Directory: `tma`
- Build Command: `npm install && npm run build`
- Output Directory: `dist`

---

**Важно:** После изменения Root Directory Vercel автоматически передеплоит проект. Дождитесь завершения деплоя перед тестированием.
