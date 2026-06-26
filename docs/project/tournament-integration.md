# Tournament System Integration

## Overview

The tournament system currently operates in two layers: a client-side tournament manager on the frontend (`Tournament.ts`) and a backend API with database persistence. This document describes both layers and their integration points.

## Client-Side Tournament

**File**: `frontend/src/pages/Tournament.ts`

The current tournament page runs entirely in browser memory. It provides a self-contained experience without requiring authentication or server calls.

### Flow

```
Registration → Match Generation → Match Play → Results
     │                │                │           │
  Add aliases    Round-robin      Select winner  View scores
  (local array)  (computed)      (button click)  (in-memory)
```

### Registration Phase

Users enter player aliases into a text input. Players are stored as local objects:

```typescript
interface Player {
    id: string    // timestamp-based
    alias: string // user-entered name
}
```

- Minimum 2 players required
- No validation against registered users
- Aliases are unique per tournament instance
- All data lost on page refresh

### Match Generation

Round-robin scheduling: every player plays every other player once.

For N players: `N × (N − 1) / 2` matches.

Example with players A, B, C:
```
A vs B
A vs C
B vs C
```

### Match Resolution

Currently matches are resolved by button click ("Player X Wins" / "Player Y Wins") with a fixed score of 5-3. The actual Pong game is not launched — this is a known gap.

### State Management

All tournament state lives in closure variables:

```
let players: Player[]      — registered players
let matches: Match[]       — generated match schedule
let currentMatch: Match    — next match to play
let tournamentStarted      — registration vs play phase
```

## Backend API

The backend has full tournament CRUD, though the frontend doesn't call it yet.

### Database Tables

**tournaments**:
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Tournament name |
| status | TEXT | `pending`, `in_progress`, `finished` |
| type | TEXT | `single_elimination`, `double_elimination`, `round_robin` |
| created_at | DATETIME | |
| started_at | DATETIME | |
| finished_at | DATETIME | |

**tournament_participants**:
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| tournament_id | INTEGER FK | |
| user_id | INTEGER FK | Optional (alias-only players allowed) |
| alias | TEXT | Display name in tournament |
| position | INTEGER | Final standing |
| eliminated | BOOLEAN | Default false |

Unique constraint: `(tournament_id, alias)`.

**tournament_matches**:
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| tournament_id | INTEGER FK | |
| game_id | INTEGER FK | Links to `games` table when match is played |
| round | INTEGER | Tournament round number |
| match_number | INTEGER | Match within the round |
| player1_id | INTEGER FK | |
| player2_id | INTEGER FK | |
| winner_id | INTEGER FK | |
| status | TEXT | `pending`, `in_progress`, `finished` |

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tournaments` | List all tournaments |
| GET | `/api/tournaments/:id` | Tournament + participants + matches |
| POST | `/api/tournaments` | Create tournament `{ name, type }` |
| POST | `/api/tournaments/:id/participants` | Add participant `{ alias, user_id? }` |
| GET | `/api/tournaments/:id/matches` | Tournament matches |

### Models

**TournamentModel** — `backend/src/models/tournament.model.ts`:
- `create()`, `findById()`, `findAll()`, `update()`

**TournamentParticipantModel**:
- `create()`, `findById()`, `findByTournament()`, `update()`, `deleteByTournament()`

**TournamentMatchModel**:
- `create()`, `findById()`, `findByTournament()`, `update()`

## Integration with User System

### Alias System

Per the project spec, each tournament uses aliases that are independent of user accounts:

- Registered users can join with a custom alias
- Unregistered players can join with just an alias
- Aliases must be unique within a tournament
- Aliases reset when a new tournament starts

### User Accounts (optional)

When `user_id` is provided during participant registration, the tournament connects to the user system:

```json
POST /api/tournaments/1/participants
{ "alias": "ProGamer", "user_id": 5 }
```

This enables:
- Linking tournament results to user profiles
- Stats tracking across tournaments
- Friend system integration

### Tournament Notifications

The chat WebSocket can push tournament notifications to specific users:

```typescript
sendTournamentNotification(userId, 'Summer Cup', 'Your match vs Alice starts now!')
```

This is available in `backend/src/websocket/chat.socket.ts` but not yet wired to the tournament flow automatically.

## Integration with Game System

### Current State

Tournament matches and Pong games are separate systems. The tournament page resolves matches by button click, not by actually playing Pong.

### Planned Integration

The backend schema supports linking tournament matches to actual games:

```sql
tournament_matches.game_id → games.id
```

Full integration flow:

```
1. Tournament match becomes current
2. Create a game room for the two participants
3. Both players join the WebSocket game
4. Play the Pong match
5. Game result saved to games table
6. Tournament match updated with game_id and winner_id
7. Next match activated
```

### API Flow (when integrated)

```
POST /api/tournaments           → { id: 1 }
POST /api/tournaments/1/participants → add player A
POST /api/tournaments/1/participants → add player B

// Match generation (to be implemented)
POST /api/tournaments/1/start   → generates matches

// For each match:
POST /api/games                 → create game record
// Players play via WebSocket
// Game finishes, updates game record
PUT /api/tournaments/1/matches/:matchId → { winner_id, game_id }
```

## Known Gaps

These are the areas where tournament integration is incomplete:

| Gap | Current State | Needed |
|-----|--------------|--------|
| Match → Game link | Button click resolves matches | Launch Pong game for each match |
| Persistence | Client-side only | Use backend API for tournament state |
| User binding | Alias-only | Optional user_id for registered players |
| Auto-matchmaking | Manual scheduling | Server generates bracket and notifies players |
| Real-time updates | None | WebSocket notifications for match progress |
| Tournament history | Lost on refresh | Database persistence via API |

## Related Documentation

- [Tournament](./tournament.md) — client-side tournament flow details
- [Pong Game](./pong-game.md) — game modes and mechanics
- [Remote Multiplayer](./remote-multiplayer.md) — WebSocket game rooms
- [Live Chat](./live-chat.md) — tournament notifications
- [Database](./database.md) — tournament table schemas
- [User Management](./user-management.md) — user profiles and stats
