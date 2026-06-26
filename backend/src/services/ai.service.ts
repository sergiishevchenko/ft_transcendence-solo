const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 400
const PADDLE_HEIGHT = 80
const PADDLE_WIDTH = 10
const BALL_SIZE = 10
const PADDLE_SPEED = 5
const AI_UPDATE_INTERVAL = 1000

export interface AIState {
  targetY: number
  lastUpdateTime: number
  difficulty: 'easy' | 'medium' | 'hard'
  reactionDelay: number
  errorMargin: number
}

export class AIService {
  private static aiStates: Map<string, AIState> = new Map()

  static createAI(aiId: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): AIState {
    const config = {
      easy: { reactionDelay: 300, errorMargin: 40 },
      medium: { reactionDelay: 150, errorMargin: 20 },
      hard: { reactionDelay: 50, errorMargin: 5 },
    }

    const state: AIState = {
      targetY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      lastUpdateTime: 0,
      difficulty,
      reactionDelay: config[difficulty].reactionDelay,
      errorMargin: config[difficulty].errorMargin,
    }

    this.aiStates.set(aiId, state)
    return state
  }

  static getInput(
    aiId: string,
    ball: { x: number; y: number; vx: number; vy: number },
    paddleY: number,
    position: 'left' | 'right',
    currentTime: number
  ): { up: boolean; down: boolean } {
    let state = this.aiStates.get(aiId)
    if (!state) {
      state = this.createAI(aiId)
    }

    if (currentTime - state.lastUpdateTime >= AI_UPDATE_INTERVAL) {
      state.targetY = this.predictBallPosition(ball, position)
      state.targetY += (Math.random() - 0.5) * 2 * state.errorMargin
      state.targetY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.targetY))
      state.lastUpdateTime = currentTime
    }

    const paddleCenter = paddleY + PADDLE_HEIGHT / 2
    const targetCenter = state.targetY + PADDLE_HEIGHT / 2
    const diff = targetCenter - paddleCenter

    if (Math.abs(diff) < PADDLE_SPEED) {
      return { up: false, down: false }
    }

    return {
      up: diff < 0,
      down: diff > 0,
    }
  }

  private static predictBallPosition(
    ball: { x: number; y: number; vx: number; vy: number },
    position: 'left' | 'right'
  ): number {
    const isApproaching = (position === 'left' && ball.vx < 0) ||
      (position === 'right' && ball.vx > 0)

    if (!isApproaching) {
      return CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2
    }

    let simX = ball.x
    let simY = ball.y
    let simVx = ball.vx
    let simVy = ball.vy

    const targetX = position === 'left' ? PADDLE_WIDTH : CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE
    const maxIterations = 1000

    for (let i = 0; i < maxIterations; i++) {
      simX += simVx
      simY += simVy

      if (simY <= 0) {
        simY = 0
        simVy = Math.abs(simVy)
      }
      if (simY >= CANVAS_HEIGHT - BALL_SIZE) {
        simY = CANVAS_HEIGHT - BALL_SIZE
        simVy = -Math.abs(simVy)
      }

      if ((position === 'left' && simX <= targetX) ||
        (position === 'right' && simX >= targetX)) {
        return simY - PADDLE_HEIGHT / 2 + BALL_SIZE / 2
      }
    }

    return CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2
  }

  static removeAI(aiId: string) {
    this.aiStates.delete(aiId)
  }

  static getState(aiId: string): AIState | undefined {
    return this.aiStates.get(aiId)
  }
}
