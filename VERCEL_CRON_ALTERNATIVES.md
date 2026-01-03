# ⏰ Альтернативы для Cron Jobs на Hobby плане

## Проблема

Vercel Hobby план ограничен: **1 cron job в день**. Расписание `*/15 * * * *` (каждые 15 минут) превышает лимит.

## Решения

### Вариант 1: Внешний сервис для cron (рекомендуется)

Используйте бесплатные сервисы для вызова функции:

#### Cron-job.org (бесплатно)
1. Зарегистрируйтесь на [cron-job.org](https://cron-job.org)
2. Создайте новую задачу:
   - **URL:** `https://your-project.vercel.app/api/beta-access-notifier`
   - **Schedule:** `*/15 * * * *` (каждые 15 минут)
   - **Method:** GET или POST
3. Сохраните

#### GitHub Actions (бесплатно)
Создайте `.github/workflows/cron-beta-notifier.yml`:

```yaml
name: Beta Access Notifier Cron

on:
  schedule:
    - cron: '*/15 * * * *'  # Каждые 15 минут
  workflow_dispatch:  # Можно запустить вручную

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Call Vercel Function
        run: |
          curl -X POST https://your-project.vercel.app/api/beta-access-notifier
```

#### EasyCron (бесплатный план)
1. Зарегистрируйтесь на [easycron.com](https://www.easycron.com)
2. Создайте cron job с нужным расписанием
3. Укажите URL вашей функции

### Вариант 2: Изменить расписание на раз в день

Если функция может работать раз в день:

```json
{
  "crons": [
    {
      "path": "/api/beta-access-notifier",
      "schedule": "0 0 * * *"  // Раз в день в полночь
    }
  ]
}
```

### Вариант 3: Убрать cron полностью

Если функция не критична:
- Удалите cron из `vercel.json`
- Вызывайте функцию вручную при необходимости
- Или используйте внешний триггер (webhook, API call)

### Вариант 4: Upgrade to Pro

Если нужны частые cron jobs:
- Upgrade до Vercel Pro ($20/месяц)
- Неограниченные cron jobs
- Более длительные функции (до 60 секунд)

## Рекомендация

Для вашего случая (`beta-access-notifier` каждые 15 минут):

**Лучший вариант:** Использовать **cron-job.org** или **GitHub Actions**

Оба бесплатны и позволяют:
- ✅ Частые вызовы (каждые 15 минут)
- ✅ Надежность
- ✅ Простая настройка
- ✅ Не требует изменения кода

## Текущее состояние

Cron job временно отключен в `vercel.json`. После настройки внешнего сервиса функция будет вызываться автоматически.

---

**Примечание:** Функция `beta-access-notifier` все еще работает, просто не вызывается автоматически через Vercel Cron.
