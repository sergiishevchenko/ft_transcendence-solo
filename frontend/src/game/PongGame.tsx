import { useEffect, useRef, useState } from 'react'

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

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>({
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: BALL_SPEED, vy: BALL_SPEED },
    paddle1: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
    paddle2: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
    score1: 0,
    score2: 0,
  })
  const keysRef = useRef<Set<string>>(new Set())
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    let currentState: GameState = { ...gameState }

    const gameLoop = () => {
      if (keysRef.current.has('w') && currentState.paddle1.y > 0) {
        currentState.paddle1.y -= PADDLE_SPEED
      }
      if (keysRef.current.has('s') && currentState.paddle1.y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
        currentState.paddle1.y += PADDLE_SPEED
      }
      if (keysRef.current.has('arrowup') && currentState.paddle2.y > 0) {
        currentState.paddle2.y -= PADDLE_SPEED
      }
      if (keysRef.current.has('arrowdown') && currentState.paddle2.y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
        currentState.paddle2.y += PADDLE_SPEED
      }

      currentState.ball.x += currentState.ball.vx
      currentState.ball.y += currentState.ball.vy

      if (currentState.ball.y <= 0 || currentState.ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
        currentState.ball.vy = -currentState.ball.vy
      }

      if (
        currentState.ball.x <= PADDLE_WIDTH &&
        currentState.ball.y + BALL_SIZE >= currentState.paddle1.y &&
        currentState.ball.y <= currentState.paddle1.y + PADDLE_HEIGHT
      ) {
        currentState.ball.vx = -currentState.ball.vx
        currentState.ball.x = PADDLE_WIDTH
      }

      if (
        currentState.ball.x >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
        currentState.ball.y + BALL_SIZE >= currentState.paddle2.y &&
        currentState.ball.y <= currentState.paddle2.y + PADDLE_HEIGHT
      ) {
        currentState.ball.vx = -currentState.ball.vx
        currentState.ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE
      }

      if (currentState.ball.x < 0) {
        currentState.score2++
        currentState.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: BALL_SPEED, vy: BALL_SPEED }
      }
      if (currentState.ball.x > CANVAS_WIDTH) {
        currentState.score1++
        currentState.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: -BALL_SPEED, vy: BALL_SPEED }
      }

      setGameState({ ...currentState })

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
      ctx.fillRect(0, currentState.paddle1.y, PADDLE_WIDTH, PADDLE_HEIGHT)
      ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, currentState.paddle2.y, PADDLE_WIDTH, PADDLE_HEIGHT)

      ctx.fillRect(currentState.ball.x, currentState.ball.y, BALL_SIZE, BALL_SIZE)

      ctx.font = '48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(currentState.score1.toString(), CANVAS_WIDTH / 4, 50)
      ctx.fillText(currentState.score2.toString(), (3 * CANVAS_WIDTH) / 4, 50)

      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-400 mb-2">
          Player 1: W/S | Player 2: ↑/↓
        </p>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-gray-600 bg-black"
      />
    </div>
  )
}
