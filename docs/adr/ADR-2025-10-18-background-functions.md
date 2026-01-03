# ADR: Background Functions for Deep Analysis

Date: 2025-10-18
Status: Accepted

## Context
- Deep analysis of 5 dreams via Gemini takes 35–45 seconds, exceeding standard Netlify Functions timeouts (10–26s).
- Synchronous processing caused timeouts and poor UX.

## Decision
- Use Netlify Background Functions for long-running deep analysis.
- Split flow:
  - Trigger endpoint `deep-analysis.js` returns 202 immediately and initiates background work.
  - `deep-analysis-background.js` performs Gemini call, persists results, and sends Telegram notification.
- Frontend polls lightweight profile endpoint and refreshes history only when a new deep analysis appears.

## Consequences
- Reliable processing up to 15 minutes.
- Better UX: immediate feedback (202), banner messages, no frequent full refresh.
- Requires idempotency and safe credit rollback RPC on failure.

## Alternatives
- Keep synchronous single function (fails with timeouts).
- External job queue/service (adds ops complexity, not needed at current scale).
