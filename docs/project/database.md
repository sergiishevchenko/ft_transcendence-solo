# Database

## Engine

SQLite via **better-sqlite3** (synchronous, prepared statements).

- File: `database/transcendence.db` (auto-created on first backend start)
- WAL journal mode enabled
- Schema loaded from `database/schema.sql` on init (fallback inline schema if file not found)

## Tables

### users

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| username | TEXT UNIQUE | Required |
| email | TEXT UNIQUE | Required |
| password_hash | TEXT | NULL for OAuth users |
| display_name | TEXT | Defaults to username |
| avatar_url | TEXT | Path like `/uploads/avatars/...` |
| created_at | DATETIME | Default CURRENT_TIMESTAMP |
| updated_at | DATETIME | Default CURRENT_TIMESTAMP |

### games

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| player1_id | INTEGER FK → users | |
| player2_id | INTEGER FK → users | |
| player1_score | INTEGER | Default 0 |
| player2_score | INTEGER | Default 0 |
| status | TEXT | pending, completed, etc. |
| winner_id | INTEGER FK → users | |
| started_at | DATETIME | |
| finished_at | DATETIME | |
| created_at | DATETIME | |

Indexed on `player1_id`, `player2_id`.

### tournaments

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| name | TEXT | Required |
| status | TEXT | Default `pending` |
| type | TEXT | Default `single_elimination` |
| created_at | DATETIME | |
| started_at | DATETIME | |
| finished_at | DATETIME | |

### tournament_participants

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| tournament_id | INTEGER FK | Required |
| user_id | INTEGER FK | Optional (alias-only players) |
| alias | TEXT | Required |
| position | INTEGER | |
| eliminated | BOOLEAN | Default 0 |
| created_at | DATETIME | |

Unique constraint: `(tournament_id, user_id)`.

### tournament_matches

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| tournament_id | INTEGER FK | Required |
| game_id | INTEGER FK → games | Optional link to game record |
| round | INTEGER | Required |
| match_number | INTEGER | Required |
| player1_id | INTEGER FK | |
| player2_id | INTEGER FK | |
| winner_id | INTEGER FK | |
| status | TEXT | Default `pending` |
| created_at | DATETIME | |

### friendships

Created at runtime by `FriendsService.initialize()` (not in `schema.sql`):

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user1_id | INTEGER FK | Request sender |
| user2_id | INTEGER FK | Request recipient |
| status | TEXT | pending, accepted, blocked |
| created_at | DATETIME | |

Unique constraint: `(user1_id, user2_id)`.

## Data Access Pattern

Models in `backend/src/models/` wrap prepared statements:

```typescript
const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
const user = stmt.get(id)
```

No ORM. Services (`auth`, `friends`, `stats`) contain business logic on top of models and raw queries.

## Docker Volume

`./database` is mounted into the backend container at `/app/database`, so the SQLite file persists across container restarts.

## Reset

```bash
make clean    # removes volumes
rm database/transcendence.db   # manual reset
```

Database is recreated automatically on next backend start.
