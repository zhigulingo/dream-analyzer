# ADR: Deterministic Generation Settings for Gemini

Date: 2025-10-19
Status: Accepted

## Context
- Repeated deep analyses on the same set of 5 dreams produced different outputs.
- Default Gemini settings include randomness (temperature > 0), harming reproducibility and trust.

## Decision
- Configure Gemini with deterministic generation:
  - `temperature = 0`
  - `topK = 1`
  - `topP = 0.1`
- Keep model fallback chain to maintain reliability.

## Consequences
- Stable, reproducible outputs for identical inputs.
- Easier debugging and regression testing.
- Potential minor loss of creative variance, acceptable for this analytical use case.

## Alternatives
- Keep default sampling (non-deterministic): inconsistent results.
- Post-process to normalize outputs: brittle and incomplete.
