# AI Opponent

## Overview

Server-side AI that plays Pong against a human player. The AI simulates keyboard input (up/down) based on ball trajectory prediction. It updates its view once per second per project specification.

**Backend**: `backend/src/services/ai.service.ts`
**Integration**: `backend/src/websocket/game.socket.ts` (handles `play_ai` message)

## How to Play

1. Navigate to `/game`
2. Select "vs AI"
3. Choose difficulty: Easy, Medium, or Hard
4. Game starts after a 3-second countdown

The AI always plays on the right side. The human player uses W/S or arrow keys.

## Difficulty Levels

| Parameter | Easy | Medium | Hard |
|-----------|------|--------|------|
| Reaction delay | 300ms | 150ms | 50ms |
| Error margin | ±40px | ±20px | ±5px |
| View update interval | 1s | 1s | 1s |

**Reaction delay** affects how quickly the AI starts moving after recalculating. **Error margin** adds random offset to the predicted target, making the AI miss more often on lower difficulties.

All levels update their target position once per second (1000ms), as required by the project spec.

## Algorithm

The AI does **not** use A* or pathfinding. It uses direct ball trajectory simulation.

### Step 1: Check direction

If the ball is moving away from the AI's paddle, the AI moves toward the center of the field.

### Step 2: Simulate trajectory

If the ball is approaching:

```
1. Copy current ball position and velocity
2. Loop: advance simulated position by velocity
3. On wall hit (top/bottom): reverse vertical velocity
4. Continue until ball reaches the AI's paddle line
5. Record the Y position where ball arrives
```

This correctly accounts for multiple wall bounces.

### Step 3: Add error

```
targetY = predictedY + random(-errorMargin, +errorMargin)
```

The error makes the AI beatable. Easy mode can miss by up to 40px in either direction — nearly half the paddle height (80px).

### Step 4: Generate input

The AI compares its current paddle center to the target position and generates simulated keyboard input:

```typescript
if (targetCenter > paddleCenter + threshold) → { up: false, down: true }
if (targetCenter < paddleCenter - threshold) → { up: true, down: false }
otherwise → { up: false, down: false }
```

This input is processed by `GameService.handleInput()` identically to a human player's input.

## Server-Side Execution

The AI runs entirely on the server:

```
Game loop (60fps)
    │
    ├── Process human player input (from WebSocket)
    ├── Process AI input (from AIService.getInput())
    ├── Update ball and paddles
    ├── Check collisions and scoring
    └── Broadcast state to human player
```

The AI never communicates over WebSocket — it calls `GameService.handleInput()` directly. From the game engine's perspective, the AI is just another player with a socket ID prefixed with `ai_`.

## One-Second Update Constraint

The project spec requires that the AI updates its "view" at most once per second. Implementation:

```typescript
if (currentTime - state.lastUpdateTime >= 1000) {
    state.targetY = predictBallPosition(ball, position)
    state.lastUpdateTime = currentTime
}
```

Between updates, the AI continues moving toward the last calculated target. It does not react to ball position changes within the 1-second window.

## AI State

Each AI instance maintains:

```typescript
interface AIState {
    targetY: number        // predicted paddle position
    lastUpdateTime: number // timestamp of last view update
    difficulty: string
    reactionDelay: number
    errorMargin: number
}
```

States are stored in a `Map<string, AIState>` keyed by AI socket ID. Created on game start, removed on game end.

## Fairness

- AI uses the same paddle speed as human players (5px/frame)
- AI input is processed through the same code path as human input
- AI cannot read or modify game state directly
- The 1-second update interval gives humans a reaction advantage
- Error margin ensures the AI misses realistically on lower difficulties

## Testing

A well-implemented AI should:
- Win occasionally against average players (all difficulties)
- Be beatable by skilled players (all difficulties)
- Never perfectly track the ball (error margin prevents this)
- Sometimes miss due to delayed view updates
- Move smoothly toward targets, not teleport

## Integration with Game Service

When a player sends `{ type: "play_ai", difficulty: "medium" }`:

1. `GameService.createRoom('1v1')` — new room
2. Human player joins as left paddle
3. `AIService.createAI(aiSocketId, difficulty)` — create AI state
4. `GameService.joinRoom()` — AI joins as right paddle
5. Countdown starts (3, 2, 1)
6. Game begins — AI input processed in the 60fps game loop

On game end, `AIService.removeAI()` cleans up the AI state.
