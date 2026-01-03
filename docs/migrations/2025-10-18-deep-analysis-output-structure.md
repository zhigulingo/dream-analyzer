# Migration: Deep Analysis Output Structure

Date: 2025-10-18
Related ADR: ADR-2025-10-18-background-functions

## Scope
- Расширение структуры deep analysis (Gemini `deep_json`): добавлены `symbolsIntro`, `recurringSymbols`, `dynamicsContext`, единый блок `conclusion`.

## Motivation
- Улучшение читаемости и аналитичности результата, унификация UI блоков, визуализация динамики.

## Plan
1) Backend: парсинг новой структуры и сохранение целиком в `deep_analyses.deep_source`.
2) Frontend (TMA):
   - DreamCard: добавить секции символов (collapsible), динамики (DynamicsChart), заключения (collapsible).
   - DynamicsChart: шкала 0–100%, демографические зоны, пагинация.
3) Обновить Function Catalog и CHANGELOG.

## Backward Compatibility
- Старая структура поддерживается как минимальный набор полей; UI проверяет наличие новых ключей и отображает по возможности.

## Test Plan
- Юнит‑тест парсинга (валидная JSON‑структура)
- Визуальные проверки TMA для записей до/после

## Deploy Checklist
- Backend deploy → проверить вставку записей с новой структурой
- Обновить TMA → smoke‑тест карточек глубокого анализа
- Мониторинг ошибок и откат при необходимости
