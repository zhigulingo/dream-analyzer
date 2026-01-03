# 🌿 Настройка веток для деплоя в Vercel

## Как настроить Production Branch

### Для каждого проекта:

1. **Vercel Dashboard** → выберите проект
2. **Settings** → **Git**
3. Найдите секцию **Production Branch**
4. Нажмите **Edit**
5. Выберите ветку (например, `vercel-export` или `main`)
6. Нажмите **Save**

### Что это означает:

- **Production Branch** - ветка, из которой деплоится Production окружение
- **Preview Deployments** - автоматически создаются для всех других веток (pull requests, другие ветки)
- **Production Deployments** - автоматически создаются только при push в Production Branch

## Рекомендуемая настройка для ваших проектов:

### Вариант 1: Все проекты из одной ветки (рекомендуется)

**Production Branch:** `vercel-export` (для всех проектов)

**Преимущества:**
- ✅ Все проекты деплоятся из одной ветки
- ✅ Легко синхронизировать изменения
- ✅ Один коммит обновляет все проекты

**Настройка:**
- Bot: `vercel-export`
- TMA: `vercel-export`
- Web: `vercel-export`
- Survey: `vercel-export`

### Вариант 2: Production из main, Preview из других веток

**Production Branch:** `main` (для всех проектов)

**Преимущества:**
- ✅ Production всегда стабильный (из main)
- ✅ Preview деплои из других веток для тестирования

**Настройка:**
- Bot: `main`
- TMA: `main`
- Web: `main`
- Survey: `main`

## Как это работает:

### Production Branch = `vercel-export`:

```
Push в vercel-export → Автоматический Production Deploy
Push в main → Preview Deploy (не Production)
Push в feature-branch → Preview Deploy (не Production)
```

### Production Branch = `main`:

```
Push в main → Автоматический Production Deploy
Push в vercel-export → Preview Deploy (не Production)
Push в feature-branch → Preview Deploy (не Production)
```

## Настройка при создании проекта:

При создании нового проекта в Vercel:

1. После **Import Git Repository**
2. В разделе **Configure Project**
3. Найдите **Production Branch** (может быть в Advanced Settings)
4. Выберите нужную ветку
5. Или оставьте `main` по умолчанию и измените позже в Settings

## Проверка текущей настройки:

1. **Vercel Dashboard** → проект
2. **Settings** → **Git**
3. Посмотрите **Production Branch** - там указана текущая ветка

## Изменение Production Branch:

1. **Settings** → **Git** → **Production Branch**
2. Нажмите **Edit**
3. Выберите новую ветку
4. Нажмите **Save**
5. Vercel автоматически передеплоит Production из новой ветки

## Preview Deployments:

- Автоматически создаются для всех веток, кроме Production Branch
- Можно создать вручную: **Deployments** → **Create Deployment** → выбрать ветку
- Preview URL: `project-name-git-branch-username.vercel.app`

## Рекомендация для вашего случая:

Так как вы уже используете ветку `vercel-export` для bot проекта:

1. **Установите Production Branch = `vercel-export`** для всех проектов
2. Это обеспечит синхронизацию всех деплоев
3. При push в `vercel-export` все проекты обновятся автоматически

## Пример настройки:

```
Bot проект:
  Production Branch: vercel-export
  Root Directory: bot

TMA проект:
  Production Branch: vercel-export
  Root Directory: tma

Web проект:
  Production Branch: vercel-export
  Root Directory: web

Survey проект:
  Production Branch: vercel-export
  Root Directory: survey
```

---

**Важно:** После изменения Production Branch, Vercel автоматически создаст новый Production Deploy из указанной ветки.
