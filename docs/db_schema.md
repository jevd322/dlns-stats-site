# Database Schema (SQLite)

This project uses a single SQLite database. The schema is created by the `SCHEMA_SQL` block in `main.py`.

## Overview

Tables:
- `users` stores Steam users and names.
- `matches` stores match-level metadata.
- `players` stores per-player stats for each match.
- `user_stats` stores per-user aggregates derived from `players`.

Relationships:
- `players.match_id` -> `matches.match_id` (ON DELETE CASCADE)
- `players.account_id` -> `users.account_id` (ON DELETE SET NULL)
- `user_stats.account_id` -> `users.account_id` (ON DELETE CASCADE)

## Pragmas

- `PRAGMA journal_mode=WAL;`
- `PRAGMA foreign_keys=ON;`

## Table: `users`

Stores Steam user IDs and their persona names.

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `account_id` | INTEGER | No | Primary key |
| `persona_name` | TEXT | Yes | Defaults to `Unknown` in code |
| `updated_at` | TEXT | Yes | ISO-8601 UTC |

## Table: `matches`

Stores per-match metadata.

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `match_id` | INTEGER | No | Primary key |
| `duration_s` | INTEGER | Yes | Match duration in seconds |
| `winning_team` | INTEGER | Yes | 0/1 as returned by API |
| `match_outcome` | INTEGER | Yes | Raw outcome enum from API |
| `game_mode` | INTEGER | Yes | Raw mode enum from API |
| `match_mode` | INTEGER | Yes | Raw match mode enum from API |
| `event_title` | TEXT | Yes | Event name from match JSON (e.g. Night Shift) |
| `event_week` | INTEGER | Yes | Event week from match JSON |
| `start_time` | TEXT | Yes | ISO-8601 UTC (derived from API) |
| `created_at` | TEXT | Yes | ISO-8601 UTC (scrape time) |

Notes:
- `start_time` may be derived from multiple API fields and normalized to ISO-8601 UTC.
- Migrations add `start_time`, `event_title`, and `event_week` if they do not exist.

## Table: `players`

Stores per-player stats for each match.

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `match_id` | INTEGER | No | FK -> `matches.match_id` |
| `account_id` | INTEGER | Yes | FK -> `users.account_id` |
| `player_slot` | INTEGER | Yes | 1-12 in API data |
| `team` | INTEGER | Yes | 0 or 1 derived from slot |
| `hero_id` | INTEGER | Yes | Hero identifier |
| `level` | INTEGER | Yes | Player level |
| `kills` | INTEGER | Yes | - |
| `deaths` | INTEGER | Yes | - |
| `assists` | INTEGER | Yes | - |
| `net_worth` | INTEGER | Yes | - |
| `last_hits` | INTEGER | Yes | - |
| `denies` | INTEGER | Yes | - |
| `creep_kills` | INTEGER | Yes | From snapshot, fallback to `last_hits` |
| `shots_hit` | INTEGER | Yes | Derived from stats snapshots |
| `shots_missed` | INTEGER | Yes | Derived from stats snapshots |
| `player_damage` | INTEGER | Yes | - |
| `obj_damage` | INTEGER | Yes | Uses boss damage as proxy |
| `player_healing` | INTEGER | Yes | - |
| `pings_count` | INTEGER | Yes | Length of `pings` array |
| `result` | TEXT | Yes | `Win` or `Loss` |

Primary Key:
- (`match_id`, `account_id`)

Indexes:
- `idx_players_match` ON `players(match_id)`
- `idx_players_account` ON `players(account_id)`

## Table: `user_stats`

Stores aggregated per-user statistics computed from `players`.

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `account_id` | INTEGER | No | Primary key, FK -> `users.account_id` |
| `matches_played` | INTEGER | Yes | - |
| `wins` | INTEGER | Yes | - |
| `losses` | INTEGER | Yes | - |
| `kills` | INTEGER | Yes | - |
| `deaths` | INTEGER | Yes | - |
| `assists` | INTEGER | Yes | - |
| `last_hits` | INTEGER | Yes | - |
| `denies` | INTEGER | Yes | - |
| `creep_kills` | INTEGER | Yes | - |
| `shots_hit` | INTEGER | Yes | - |
| `shots_missed` | INTEGER | Yes | - |
| `player_damage` | INTEGER | Yes | - |
| `obj_damage` | INTEGER | Yes | - |
| `player_healing` | INTEGER | Yes | - |
| `pings_count` | INTEGER | Yes | - |
| `avg_kda` | REAL | Yes | (kills + assists) / max(deaths, 1) |
| `winrate` | REAL | Yes | wins / matches_played |
| `updated_at` | TEXT | Yes | ISO-8601 UTC |
