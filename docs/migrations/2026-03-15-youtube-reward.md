# Migration: YouTube Reward Field

**Date:** 2026-03-15
**File:** `bot/functions/shared/database/migration_youtube_reward.sql`

## SQL

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS youtube_reward_claimed boolean DEFAULT false;
```

## Purpose

Tracks whether user has claimed the YouTube subscription reward (+1 token).
Uses trust-based mechanic — no YouTube API verification possible.

## Related Files

- `bot/functions/claim-youtube-token.js` — backend endpoint
- `tma/src/components/SubscriptionModal.vue` — frontend 2-step flow
- `tma/src/services/api.js` — `claimYoutubeReward()` method
