# Pong Game

## Overview

Pong is available in four modes: local two-player, online 1v1, 4-player battle, and vs AI. The local game runs entirely in the browser. Online and AI modes use a server-side game loop with WebSocket communication.

## Game Modes

### Local Game

**Location**: `frontend/src/game/PongGame.ts`

Two players share one keyboard. No server or network involved — all logic runs in the browser.

| Player | Up | Down |
|--------|----|------|
| Player 1 (left) | W | S |
| Player 2 (right) | ↑ | ↓ |

### Online 1v1

**Frontend**: `frontend/src/game/RemotePongGame.ts`
**Backend**: `backend/src/services/game.service.ts`, `backend/src/websocket/game.socket.ts`

Quick matchmaking via WebSocket. Server manages the game loop and broadcasts state to both players at 60fps. If a player disconnects, they have 15 seconds to reconnect before forfeiting.

### 4-Player Battle

Same components as online 1v1, but with `mode: '4player'`.

Square field (800×800). Four players guard one wall each (left, right, top, bottom). When the ball exits through a player's wall, all other players score a point. First to reach the win score wins.

### vs AI

Same WebSocket infrastructure as online play. The AI player runs on the server via `AIService`.

| Difficulty | Reaction Delay | Error Margin |
|------------|---------------|--------------|
| Easy | 300ms | ±40px |
| Medium | 150ms | ±20px |
| Hard | 50ms | ±5px |

The AI updates its target position once per second (per project spec). It predicts where the ball will arrive by simulating its trajectory with wall bounces.

## Canvas

| Property | Value (1v1) | Value (4-player) |
|----------|-------------|-------------------|
| Width | 800 px | 800 px |
| Height | 400 px | 800 px |
| Background | Black | Black |
| Center line | White dashed | White dashed cross |

## Game Objects

| Object | Size | Speed |
|--------|------|-------|
| Paddle | 10 × 80 px | 5 px/frame |
| Ball | 10 × 10 px | 4 px/frame (initial, increases on hits) |

## Physics

### Ball movement

Server-side: position updated each tick at 60fps. `x += vx`, `y += vy`.

### Wall bounce

Ball reverses `vy` when hitting top or bottom edge (1v1). In 4-player mode, walls without a paddle cause scoring instead of bouncing.

### Paddle collision

Ball reverses direction when its bounding box overlaps a paddle. Hit position on the paddle affects the bounce angle — hitting near the edge creates a steeper angle. Ball speed increases by 2% on each paddle hit.

### Scoring

- **1v1**: Ball exits left → right player scores. Ball exits right → left player scores.
- **4-player**: Ball exits through a wall → all players except that wall's player score.
- Ball resets to center after each point.
- First player to reach 5 points wins.

## Server-Side Game Loop

The game runs entirely on the server to prevent cheating:

1. Receive player input via WebSocket (`{ up, down }`)
2. Update paddle positions based on input
3. Update ball position
4. Check wall bounces and paddle collisions
5. Check scoring conditions
6. Broadcast state to all players
7. Repeat at 60 ticks/second

Game results are saved to the SQLite database with player IDs, scores, and winner.

## AI Algorithm

The AI (`backend/src/services/ai.service.ts`) does not use A*. It works by:

1. Every 1 second, simulate the ball's trajectory forward
2. Account for wall bounces during simulation
3. Calculate where the ball will reach the AI's paddle line
4. Add a random error based on difficulty level
5. Move the paddle toward the predicted position using simulated keyboard input

The AI simulates keyboard presses (`up`/`down`) just like a human player — it does not directly set paddle position.

## Room Management

- Rooms are created on demand (via quick match or manual creation)
- Quick match finds an existing waiting room or creates a new one
- Rooms are cleaned up when all players leave
- Each room has a unique ID for joining via chat invites

## Lifecycle

### Local game
Event listeners for `keydown`/`keyup` are attached to `window`. A `remove` event on the container cleans up listeners and cancels the animation frame.

### Remote game
WebSocket connection is established on mount. On exit, the `leave_room` message is sent and the connection is cleaned up. The `game-exit` custom event triggers navigation back to the menu.
