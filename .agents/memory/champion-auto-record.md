---
name: Champion auto-record vs manual override
description: How auto-detected champions and commissioner overrides coexist in season_records
---
season_records.champion_source = 'auto' (detected from Yahoo final standings) or
'manual' (commissioner-entered). Auto-detection persists via an upsert whose
ON CONFLICT DO UPDATE carries `WHERE champion_source IS DISTINCT FROM 'manual'`,
so a commissioner override is never overwritten by later auto runs.

**Why:** Task required auto-recording champions while letting the commissioner
override; without the source flag, the Yahoo overlay always won.

**How to apply:** getChampionHistory also skips Yahoo overlay for years whose
stored source is 'manual'. recordChampion action must set source='manual'.
