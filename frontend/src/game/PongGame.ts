interface GameState {
  ball: { x: number; y: number; vx: number; vy: number }
  paddle1: { y: number }
  paddle2: { y: number }
  score1: number
  score2: number
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 400
const PADDLE_WIDTH = 10
const PADDLE_HEIGHT = 80
const BALL_SIZE = 10
const PADDLE_SPEED = 5
const BALL_SPEED = 4

export function PongGame(): HTMLElement {
  const container = document.createElement('div')
  container.className = 'bg-gray-800 p-4 rounded-lg'
  container.innerHTML = `
    <div class="mb-4 text-center">
      <p class="text-sm text-gray-400 mb-2">
        Player 1: W/S | Player 2: ↑/↓
      </p>
    </div>
    <canvas width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" class="border-2 border-gray-600 bg-black"></canvas>
  `

  const canvas = container.querySelector('canvas') as HTMLCanvasElement
  if (!canvas) return container

  const ctx = canvas.getContext('2d')
  if (!ctx) return container

  const gameState: GameState = {
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: BALL_SPEED, vy: BALL_SPEED },
    paddle1: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
    paddle2: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
    score1: 0,
    score2: 0,
  }

  const keys = new Set<string>()
  let animationFrameId: number

  const handleKeyDown = (e: KeyboardEvent) => {
    keys.add(e.key.toLowerCase())
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.key.toLowerCase())
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  const gameLoop = () => {
    if (keys.has('w') && gameState.paddle1.y > 0) {
      gameState.paddle1.y -= PADDLE_SPEED
    }
    if (keys.has('s') && gameState.paddle1.y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
      gameState.paddle1.y += PADDLE_SPEED
    }
    if (keys.has('arrowup') && gameState.paddle2.y > 0) {
      gameState.paddle2.y -= PADDLE_SPEED
    }
    if (keys.has('arrowdown') && gameState.paddle2.y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
      gameState.paddle2.y += PADDLE_SPEED
    }

    gameState.ball.x += gameState.ball.vx
    gameState.ball.y += gameState.ball.vy

    if (gameState.ball.y <= 0 || gameState.ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
      gameState.ball.vy = -gameState.ball.vy
    }

    if (
      gameState.ball.x <= PADDLE_WIDTH &&
      gameState.ball.y + BALL_SIZE >= gameState.paddle1.y &&
      gameState.ball.y <= gameState.paddle1.y + PADDLE_HEIGHT
    ) {
      gameState.ball.vx = -gameState.ball.vx
      gameState.ball.x = PADDLE_WIDTH
    }

    if (
      gameState.ball.x >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
      gameState.ball.y + BALL_SIZE >= gameState.paddle2.y &&
      gameState.ball.y <= gameState.paddle2.y + PADDLE_HEIGHT
    ) {
      gameState.ball.vx = -gameState.ball.vx
      gameState.ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE
    }

    if (gameState.ball.x < 0) {
      gameState.score2++
      gameState.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: BALL_SPEED, vy: BALL_SPEED }
    }
    if (gameState.ball.x > CANVAS_WIDTH) {
      gameState.score1++
      gameState.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: -BALL_SPEED, vy: BALL_SPEED }
    }

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.strokeStyle = '#ffffff'
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(CANVAS_WIDTH / 2, 0)
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, gameState.paddle1.y, PADDLE_WIDTH, PADDLE_HEIGHT)
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, gameState.paddle2.y, PADDLE_WIDTH, PADDLE_HEIGHT)

    ctx.fillRect(gameState.ball.x, gameState.ball.y, BALL_SIZE, BALL_SIZE)

    ctx.font = '48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(gameState.score1.toString(), CANVAS_WIDTH / 4, 50)
    ctx.fillText(gameState.score2.toString(), (3 * CANVAS_WIDTH) / 4, 50)

    animationFrameId = requestAnimationFrame(gameLoop)
  }

  animationFrameId = requestAnimationFrame(gameLoop)

  container.addEventListener('remove', () => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    cancelAnimationFrame(animationFrameId)
  })

  return container
}

