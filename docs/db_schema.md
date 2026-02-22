# Database Schema (SQLite)

This project uses a single SQLite database with the following schema. The schema is created by the `SCHEMA_SQL` block in `main.py`.

## Pragmas

- `PRAGMA journal_mode=WAL;`
- `PRAGMA foreign_keys=ON;`

## Table: `users`

Stores Steam user IDs and their persona names.

Columns:
- `account_id` INTEGER PRIMARY KEY
- `persona_name` TEXT
- `updated_at` TEXT (ISO-8601 UTC)

## Table: `matches`

Stores per-match metadata.

Columns:
- `match_id` INTEGER PRIMARY KEY
- `duration_s` INTEGER
- `winning_team` INTEGER
- `match_outcome` INTEGER
- `game_mode` INTEGER
- `match_mode` INTEGER
- `start_time` TEXT (ISO-8601 UTC)
- `created_at` TEXT (ISO-8601 UTC, scraped time)

Notes:
- `start_time` may be derived from multiple API fields and normalized to ISO-8601 UTC.
- A migration adds `start_time` if it does not exist.

## Table: `players`

Stores per-player stats for each match.

Columns:
- `match_id` INTEGER NOT NULL
- `account_id` INTEGER
- `player_slot` INTEGER
- `team` INTEGER
- `hero_id` INTEGER
- `level` INTEGER
- `kills` INTEGER
- `deaths` INTEGER
- `assists` INTEGER
- `net_worth` INTEGER
- `last_hits` INTEGER
- `denies` INTEGER
- `creep_kills` INTEGER
- `shots_hit` INTEGER
- `shots_missed` INTEGER
- `player_damage` INTEGER
- `obj_damage` INTEGER
- `player_healing` INTEGER
- `pings_count` INTEGER
- `result` TEXT

Primary Key:
- (`match_id`, `account_id`)

Foreign Keys:
- `match_id` -> `matches(match_id)` ON DELETE CASCADE
- `account_id` -> `users(account_id)` ON DELETE SET NULL

Indexes:
- `idx_players_match` ON `players(match_id)`
- `idx_players_account` ON `players(account_id)`

## Table: `user_stats`

Stores aggregated per-user statistics computed from `players`.

Columns:
- `account_id` INTEGER PRIMARY KEY
- `matches_played` INTEGER
- `wins` INTEGER
- `losses` INTEGER
- `kills` INTEGER
- `deaths` INTEGER
- `assists` INTEGER
- `last_hits` INTEGER
- `denies` INTEGER
- `creep_kills` INTEGER
- `shots_hit` INTEGER
- `shots_missed` INTEGER
- `player_damage` INTEGER
- `obj_damage` INTEGER
- `player_healing` INTEGER
- `pings_count` INTEGER
- `avg_kda` REAL
- `winrate` REAL
- `updated_at` TEXT (ISO-8601 UTC)

Foreign Keys:
- `account_id` -> `users(account_id)` ON DELETE CASCADE
