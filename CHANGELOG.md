# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

## [1.0.0] - 2025-10-19

### Added
- PROJECT_GUIDE.md — comprehensive project guide and onboarding.
- Deep analysis background architecture on Netlify (background functions up to 15 minutes) with Telegram notifications and frontend polling.
- Credit rollback RPC functions in Supabase for deep analysis failures.
- New deep analysis content structure: `symbolsIntro`, `recurringSymbols`, `dynamicsContext`, unified `conclusion` block.
- Demographic bands on dynamics charts; unified styles for deep analysis blocks.

### Changed
- Gemini service configured for deterministic generation (temperature=0, topK=1, topP=0.1) with model fallback chain.
- TMA history UI: switched from header+selector to minimal tab navigation (Dream journal | Deep analysis) with animations and active underline.
- Frontend UX flow for deep analysis: removed immediate profile fetch; polling based on `deep_analyses_count` increments; banner messages instead of snackbars.
- Dynamics chart Y-axis made dynamic; HVdC scale normalized to 0–100%.

### Fixed
- Corrected dynamics scaling from 0–10 to 0–100%.

### Notes
- Tests reported as passing in the session notes (28/28) after determinism changes in Gemini service.

[Unreleased]: https://github.com/zhigulingo/dream-analyzer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/zhigulingo/dream-analyzer/releases/tag/v1.0.0
