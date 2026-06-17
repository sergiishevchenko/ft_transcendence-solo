# Tournament

## Overview

Client-side tournament system at `/tournament`. Players register by alias, matches are generated automatically, and results are tracked in browser memory only.

**Location**: `frontend/src/pages/Tournament.ts`

> The backend has tournament API endpoints and database tables, but the frontend tournament page does not call them yet. All state is lost on page refresh.

## Phases

### 1. Registration

- User enters a player alias and clicks "Add Player"
- Minimum 2 players required to start
- Aliases stored in a local `players` array

### 2. Match Generation

On "Start Tournament", a **round-robin** schedule is built: every player plays every other player once.

For N players, number of matches = N × (N − 1) / 2.

Example with 4 players (A, B, C, D):

```
A vs B
A vs C
A vs D
B vs C
B vs D
C vs D
```

### 3. Match Play

- First pending match becomes the "Current Match"
- UI shows two buttons: "Player X Wins" / "Player Y Wins"
- Clicking a winner marks the match completed with a fixed score (5–3)
- Next pending match becomes current

### 4. Schedule View

All matches listed with status:

| Status | UI color |
|--------|----------|
| `pending` | Gray |
| `in-progress` | Blue (current match) |
| `completed` | Dark gray, shows score |

### 5. Reset

"Reset Tournament" clears all players, matches, and returns to registration phase.

## Data Structures

```typescript
interface Player {
  id: string      // timestamp-based
  alias: string
}

interface Match {
  id: string
  player1: Player
  player2: Player
  score1?: number
  score2?: number
  status: 'pending' | 'in-progress' | 'completed'
}
```

## Backend API (available, not wired to UI)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/tournaments` | Create tournament record |
| `POST /api/tournaments/:id/participants` | Add participant with alias |
| `GET /api/tournaments/:id` | Tournament + participants + matches |
| `GET /api/tournaments/:id/matches` | Match list |

Database supports `single_elimination` type in schema, but the frontend currently uses round-robin logic only.

## Known Gaps

- No link between tournament matches and the Pong game canvas
- Winners selected by button click, not by playing
- No persistence across sessions
- No integration with registered user accounts (aliases only)
