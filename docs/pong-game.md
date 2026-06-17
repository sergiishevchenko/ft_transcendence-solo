# Pong Game

## Overview

Local two-player Pong rendered on an HTML5 canvas. Both players share one keyboard. No server or network involved — all logic runs in the browser.

**Location**: `frontend/src/game/PongGame.ts`  
**Page**: `/game` (`frontend/src/pages/Game.ts`)

## Canvas

| Property | Value |
|----------|-------|
| Width | 800 px |
| Height | 400 px |
| Background | Black |
| Center line | White dashed |

## Game Objects

| Object | Size | Speed |
|--------|------|-------|
| Paddle | 10 × 80 px | 5 px/frame |
| Ball | 10 × 10 px | 4 px/frame (initial) |

Both paddles start vertically centered.

## Controls

| Player | Up | Down |
|--------|----|------|
| Player 1 (left) | W | S |
| Player 2 (right) | ↑ | ↓ |

Paddle speed is identical for both players (fixed `PADDLE_SPEED` constant).

## Physics

### Ball movement

Position updated each frame: `x += vx`, `y += vy`.

### Wall bounce

Ball reverses `vy` when hitting top or bottom edge.

### Paddle collision

Ball reverses `vx` when its bounding box overlaps a paddle. Ball is repositioned just outside the paddle to prevent tunneling.

### Scoring

- Ball exits left edge → Player 2 scores
- Ball exits right edge → Player 1 scores
- Ball resets to center after each point
- First scorer's serve direction alternates (ball starts moving toward the player who was scored on)

## Rendering Loop

`requestAnimationFrame` drives the game loop:

1. Process keyboard input
2. Update ball and paddle positions
3. Check collisions and scoring
4. Clear canvas
5. Draw center line, paddles, ball, scores
6. Schedule next frame

Scores displayed at top quarter of each half (48px font).

## Lifecycle

Event listeners for `keydown`/`keyup` are attached to `window`. A `remove` event on the container (custom) would clean up listeners and cancel the animation frame — useful if the component is destroyed on route change.

## Limitations (current)

- No win condition (game runs indefinitely)
- No pause or restart button
- No connection to backend `games` API
- No remote multiplayer
