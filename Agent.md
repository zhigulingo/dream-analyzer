# Agent Guide

> System Prompt for Agents (copy/paste)
>
> You are an AI software engineering agent working on the "Dream Analyzer" project.
> Follow this iterative workflow strictly:
>
> 1) Start
> - Pull latest changes.
> - Read: PROJECT_GUIDE.md, this Agent.md, docs/function-catalog.md, relevant docs/adr/* and docs/migrations/*.
> - Ask clarifying questions for any ambiguity (scope, acceptance criteria, risks).
>
> 2) Plan
> - Propose a short TODO plan and confirm scope before coding.
> - Create a feature branch (one small goal per PR).
>
> 3) Implement
> - Keep changes minimal and atomic; avoid breaking changes.
> - If contracts/behavior change: update docs/function-catalog.md; add/refresh ADR if architectural; add docs/migrations/* for breaking changes; update CHANGELOG.md.
> - Preserve deterministic AI settings and JSON structures.
>
> 4) Validate
> - If any non-trivial code changed: run build/tests; ensure no secrets checked in.
>
> 5) Deliver
> - Open a PR with a Conventional Commits title; use the PR template checklist; link ADR/docs.
> - Do not merge without review approval.
>
> Communication
> - Proactively request missing inputs (env vars, tokens, sample data), constraints, and success criteria.
> - Provide a concise summary of changes, risks, and rollback.
>
> Safety
> - Never leak secrets; avoid untrusted code; minimize blast radius.
> - Respect repository structure; do not modify workspace root.
>
> Your outputs must be concise and actionable. Always keep the documentation in sync.

Последнее обновление: 19.10.2025

Цель: описать структуру документации проекта, правила итерационной работы, требования к PR и коммитам, а также что и где обновлять, чтобы поддерживать документацию в актуальном состоянии.

## 1) Структура документации проекта

- PROJECT_GUIDE.md — обзор проекта и онбординг новой ИИ‑сессии/разработчика.
- CHANGELOG.md — история изменений в формате Keep a Changelog + SemVer.
- docs/function-catalog.md — каталог функций/эндпоинтов/сервисов (актуальная спецификация).
- docs/adr/ — Architecture Decision Records (почему приняли решение, альтернативы, последствия).
- docs/migrations/ — инструкции по миграциям (контракты API, БД, схемы данных, UI контракты).
- .github/PULL_REQUEST_TEMPLATE.md — обязательный шаблон для PR с чек‑листом обновления доков.
- .github/workflows/semantic-pr.yml — автоматическая проверка семантики заголовка PR (Conventional Commits).

Ссылки между документами обязательны: из каталога функций на ADR/PR/CHANGELOG, из ADR на связанные файлы/PR.

## 2) Процесс итерационного развития (микро‑итерации)

1. Создайте небольшую задачу с узким scope.
2. Создайте ветку: `git checkout -b feature/<scope>` (для документации допускается `docs/<scope>`).
3. Реализуйте изменение атомарно (одна цель — один PR).
4. Обновите документацию согласно матрице обновлений (см. ниже).
5. Запустите проверки (build/tests), если были нетривиальные изменения кода.
6. Откройте PR с корректным заголовком по Conventional Commits, пройдите чек‑лист.
7. После ревью — merge в `main`, тэг/релиз согласно SemVer (автоматизация опциональна).

Опционально: используйте feature‑flags/kill‑switches, добавляйте метрики/логи вместе с изменениями.

## 3) Матрица обновлений документации

- Изменение API/функции (вход/выход, поведение):
  - Обновить: docs/function-catalog.md (контракт, ошибки, зависимости)
  - Добавить/обновить: ADR (если есть архитектурное решение/обоснование)
  - Обновить: CHANGELOG.md (категория Added/Changed/Fixed/Deprecated/Removed)
  - При необходимости: docs/migrations/ (гайд миграции)

- Важное архитектурное решение:
  - Добавить новый ADR в docs/adr/
  - Сослаться на него в каталоге функций и в PR
  - Отразить в CHANGELOG.md

- Изменение схемы БД/контрактов, ломающее совместимость:
  - Добавить migration‑док в docs/migrations/
  - Обновить catalog/ADR/CHANGELOG
  - Пометить Deprecated/Breaking в CHANGELOG

- UI/UX изменения без изменения контрактов:
  - Обновить соответствующие разделы в PROJECT_GUIDE.md (если затрагивает гайд)
  - CHANGELOG.md: Changed/Fixed

## 4) Правила коммитов (Conventional Commits)

Формат: `<type>(optional scope): <short summary>`

Базовые типы:
- feat: добавление функциональности
- fix: исправление бага
- docs: изменения только в документации
- refactor: рефакторинг без изменения поведения
- perf: улучшение производительности
- test: тесты
- chore: рутинные задачи (настройки, скрипты)
- build/ci: изменения сборки/CI

Примеры:
- feat(bot): add deep analysis polling optimization
- fix(tma): correct dynamics scale to 0–100%
- docs: add function catalog and ADR for background functions

Рекомендации:
- Суммарное описание до ~72 символов
- Дополнительный описательный блок — в теле коммита (motivation, links)
- Ссылки на PR/ADR/issue: `Refs #123`, `ADR-2025-10-19-deterministic-gemini`

## 5) Требования к Pull Request

Заголовок PR должен соответствовать Conventional Commits (проверяется CI):
- Пример: `docs: add Agent guide and iteration setup`

Описание PR должно содержать:
- Контекст и цель изменения (почему)
- Ссылки: ADR/issue/дизайн‑док/PR‑chain
- Краткое резюме изменений по модулям
- Риски и откаты (если применимо)
- Чек‑лист (см. шаблон PR)

Definition of Done для PR:
- [ ] Обновлены необходимые документы (catalog/ADR/CHANGELOG/migrations)
- [ ] Пройдены build/tests (если были нетривиальные изменения кода)
- [ ] Логи/метрики/флаги учтены (если релевантно)
- [ ] Нет breaking‑изменений без миграции/депрекейта

## 6) CHANGELOG и SemVer

- Формат: Keep a Changelog (Unreleased, затем версии)
- Семантическое версионирование:
  - MAJOR — несовместимые изменения
  - MINOR — добавление совместимой функциональности
  - PATCH — исправления багов/микро‑улучшения
- Категории: Added, Changed, Deprecated, Removed, Fixed, Security

## 7) ADR — Architecture Decision Records

Формат ADR:
- Context — проблема, ограничения
- Decision — принятое решение
- Consequences — последствия/риски
- Alternatives — рассматривались альтернативы

Именование: `docs/adr/ADR-YYYY-MM-DD-<slug>.md`

## 8) Миграции

- Создавайте документ в `docs/migrations/` для любого изменения, требующего действий (API/БД/клиентские контракты)
- Шаблон включает: scope, план, обратная совместимость, тест‑план, чек‑лист деплоя/отката

## 9) Автоматизация

- Проверка семантики заголовка PR: `.github/workflows/semantic-pr.yml`
- Автоматизация релизов опциональна (release‑please/changesets) — при включении добавить соответствующие файлы и работать через PR.

## 10) Что делать ИИ‑агенту при старте задачи

1) Прочитать PROJECT_GUIDE.md и docs/function-catalog.md
2) Проверить актуальные ADR по теме
3) Сформировать план (todo), создать ветку
4) Внести изменения, обновить документы по матрице
5) Запустить build/tests при нетривиальных код‑изменениях
6) Открыть PR по шаблону
