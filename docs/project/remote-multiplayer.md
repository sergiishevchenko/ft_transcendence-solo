# Remote Multiplayer

## Overview

Real-time online Pong via WebSocket. Supports 1v1 and 4-player modes. The game engine runs on the server at 60fps. Clients send input and render state received from the server.

**Frontend**: `frontend/src/game/RemotePongGame.ts`
**Backend engine**: `backend/src/services/game.service.ts`
**Backend WebSocket**: `backend/src/websocket/game.socket.ts`

## Game Modes

### Online 1v1

Standard Pong field (800×400). Two paddles, left and right. First to 5 points wins. Quick matchmaking pairs players automatically.

### 4-Player Battle

Square field (800×800). Four paddles, one on each wall:

```
        ┌─── Top player ───┐
        │                   │
  Left  │                   │  Right
 player │       Ball        │  player
        │                   │
        └── Bottom player ──┘
```

Each player guards one wall. When the ball exits through a wall, all other players score a point. First player to 5 points wins.

Controls are the same for all positions — W/S or arrows move the paddle along its wall.

## Connection Flow

```
1. Client connects to wss://host/ws/game?token=JWT
2. Server assigns a socket ID and sends game constants
3. Client sends quick_match / create_room / play_ai
4. Server assigns player to a room
5. When room is full → 3-second countdown
6. Game starts → server broadcasts state at 60fps
7. Game ends → scores saved to database
```

## Quick Matchmaking

Client sends:
```json
{ "type": "quick_match", "mode": "1v1" }
```

Server logic:
1. Find a waiting room with open slots for the requested mode
2. If found → join that room
3. If not → create a new room and join it
4. When room reaches max players (2 for 1v1, 4 for 4-player) → start countdown

## Room Management

### Creating a Room

```json
{ "type": "create_room", "mode": "4player" }
```

Creates a private room. The creator receives the `roomId` to share with others (via chat invite).

### Joining a Room

```json
{ "type": "join_room", "roomId": "game_123_abc" }
```

### Room List

```json
{ "type": "get_rooms", "mode": "1v1" }
```

Returns waiting rooms with player count and names.

### Leaving

```json
{ "type": "leave_room" }
```

Removes the player from the room. If the game was in progress and only one player remains, that player wins by forfeit.

## Server-Side Game Engine

### Game Loop

The server runs a `setInterval` at 60 ticks per second:

```
Each tick:
1. Read all player inputs (up/down flags)
2. Move paddles within bounds
3. Move ball by velocity
4. Check wall bounces
5. Check paddle collisions
   - Hit position affects bounce angle
   - Ball speed increases by 2% per hit
6. Check scoring (ball exits field)
7. Check win condition (score >= 5)
8. Broadcast state to all players
```

### Paddle Collision Physics

When the ball hits a paddle, the bounce angle depends on where it hits:

```
Paddle top    → steep upward angle
Paddle center → straight bounce
Paddle bottom → steep downward angle
```

Formula:
```
hitPos = (ball.y - paddle.y) / PADDLE_HEIGHT    // 0.0 to 1.0
angle = (hitPos - 0.5) * π/3                    // -30° to +30°
speed = currentSpeed * 1.02                      // accelerate
vx = ±speed * cos(angle)
vy = speed * sin(angle)
```

### Ball Reset

After a point is scored:
- Ball returns to center
- Random angle between -45° and +45°
- Random horizontal direction

## Input Handling

Client sends input whenever key state changes:

```json
{ "type": "input", "input": { "up": true, "down": false } }
```

Server stores the latest input per player and applies it on every tick. Supported keys: W, S, ArrowUp, ArrowDown.

Input is sent on both keydown and keyup to ensure accurate state.

## Disconnect Handling

### Detection

WebSocket `close` event triggers disconnect handling.

### During Waiting Phase

Player is removed from the room immediately. Room stays open for others to join.

### During Active Game

1. Player marked as `connected: false`
2. 15-second reconnection timer starts
3. Other players see "Opponent disconnected" status
4. If player reconnects within 15 seconds → game resumes
5. If timer expires → player forfeited, opponent wins

### Reconnection

The server tracks `userId` → `socketId` mapping. If a user with the same `userId` connects and joins the same room before the timer expires, their existing player slot is restored.

## State Serialization

Server broadcasts the full game state:

```json
{
  "type": "game_state",
  "state": {
    "id": "game_123_abc",
    "ball": { "x": 400, "y": 200, "vx": 4.1, "vy": -2.3 },
    "paddles": {
      "ws_123": { "y": 160 },
      "ws_456": { "y": 180 }
    },
    "scores": { "ws_123": 2, "ws_456": 3 },
    "players": {
      "ws_123": { "position": "left", "connected": true, "displayName": "Alice" },
      "ws_456": { "position": "right", "connected": true, "displayName": "Bob" }
    },
    "status": "playing",
    "mode": "1v1",
    "maxPlayers": 2
  }
}
```

## Frontend Rendering

The `RemotePongGame` component:

1. Connects to game WebSocket
2. Sends `quick_match` or `play_ai`
3. Renders canvas based on received `game_state`
4. Forwards keyboard input to server
5. Shows countdown, game status, and win/loss screens

### Visual Indicators

- Own paddle: green
- Opponent paddle: red
- Player names displayed near scores
- Disconnected players: status message shown
- Game over: semi-transparent overlay with winner name

## Game Persistence

When a game starts, a record is created in the `games` table:

```sql
INSERT INTO games (player1_id, player2_id, status) VALUES (?, ?, 'in_progress')
```

When the game ends:
```sql
UPDATE games SET player1_score=?, player2_score=?, winner_id=?, status='finished', finished_at=?
```

This feeds into user statistics (`StatsService`) and match history.

## Constants

| Property | Value |
|----------|-------|
| Canvas width (1v1) | 800px |
| Canvas height (1v1) | 400px |
| Canvas size (4-player) | 800×800px |
| Paddle size | 10×80px |
| Ball size | 10×10px |
| Paddle speed | 5px/tick |
| Ball initial speed | 4px/tick |
| Win score | 5 points |
| Tick rate | 60fps |
| Disconnect timeout | 15 seconds |
