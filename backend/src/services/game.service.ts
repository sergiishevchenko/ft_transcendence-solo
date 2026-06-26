import { GameModel } from '../models/game.model'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 400
const PADDLE_WIDTH = 10
const PADDLE_HEIGHT = 80
const BALL_SIZE = 10
const PADDLE_SPEED = 5
const BALL_SPEED = 4
const WIN_SCORE = 5
const TICK_RATE = 60
const TICK_INTERVAL = 1000 / TICK_RATE

export interface BallState {
  x: number
  y: number
  vx: number
  vy: number
}

export interface PaddleState {
  y: number
}

export interface PlayerInfo {
  userId?: number
  socketId: string
  position: 'left' | 'right' | 'top' | 'bottom'
  input: { up: boolean; down: boolean }
  connected: boolean
  displayName: string
}

export interface GameRoomState {
  id: string
  ball: BallState
  paddles: Map<string, PaddleState>
  scores: Map<string, number>
  players: Map<string, PlayerInfo>
  status: 'waiting' | 'countdown' | 'playing' | 'paused' | 'finished'
  mode: '1v1' | '4player'
  maxPlayers: number
  winnerId?: string
  dbGameId?: number
  countdownTimer?: number
  tickInterval?: ReturnType<typeof setInterval>
  createdAt: number
  disconnectTimers: Map<string, ReturnType<typeof setTimeout>>
}

export class GameService {
  private static rooms: Map<string, GameRoomState> = new Map()
  private static playerToRoom: Map<string, string> = new Map()

  static createRoom(mode: '1v1' | '4player' = '1v1'): GameRoomState {
    const id = `game_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const room: GameRoomState = {
      id,
      ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 0, vy: 0 },
      paddles: new Map(),
      scores: new Map(),
      players: new Map(),
      status: 'waiting',
      mode,
      maxPlayers: mode === '1v1' ? 2 : 4,
      createdAt: Date.now(),
      disconnectTimers: new Map(),
    }
    this.rooms.set(id, room)
    return room
  }

  static getRoom(roomId: string): GameRoomState | undefined {
    return this.rooms.get(roomId)
  }

  static getWaitingRooms(mode: '1v1' | '4player' = '1v1'): GameRoomState[] {
    const rooms: GameRoomState[] = []
    for (const room of this.rooms.values()) {
      if (room.status === 'waiting' && room.mode === mode && room.players.size < room.maxPlayers) {
        rooms.push(room)
      }
    }
    return rooms
  }

  static joinRoom(roomId: string, socketId: string, userId?: number, displayName?: string): PlayerInfo | null {
    const room = this.rooms.get(roomId)
    if (!room || room.players.size >= room.maxPlayers) return null

    if (room.disconnectTimers.has(socketId)) {
      clearTimeout(room.disconnectTimers.get(socketId)!)
      room.disconnectTimers.delete(socketId)
    }

    const existingPlayer = Array.from(room.players.values()).find(p => p.userId === userId && userId !== undefined)
    if (existingPlayer) {
      existingPlayer.socketId = socketId
      existingPlayer.connected = true
      room.players.delete(existingPlayer.socketId)
      room.players.set(socketId, existingPlayer)
      this.playerToRoom.set(socketId, roomId)
      return existingPlayer
    }

    const positions: ('left' | 'right' | 'top' | 'bottom')[] = room.mode === '1v1'
      ? ['left', 'right']
      : ['left', 'right', 'top', 'bottom']

    const usedPositions = new Set(Array.from(room.players.values()).map(p => p.position))
    const position = positions.find(p => !usedPositions.has(p))
    if (!position) return null

    const player: PlayerInfo = {
      userId,
      socketId,
      position,
      input: { up: false, down: false },
      connected: true,
      displayName: displayName || `Player ${room.players.size + 1}`,
    }

    room.players.set(socketId, player)
    this.playerToRoom.set(socketId, roomId)

    const paddleY = room.mode === '1v1'
      ? CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2
      : (position === 'top' || position === 'bottom')
        ? CANVAS_WIDTH / 2 - PADDLE_HEIGHT / 2
        : CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2

    room.paddles.set(socketId, { y: paddleY })
    room.scores.set(socketId, 0)

    return player
  }

  static handleDisconnect(socketId: string): { roomId: string; room: GameRoomState } | null {
    const roomId = this.playerToRoom.get(socketId)
    if (!roomId) return null

    const room = this.rooms.get(roomId)
    if (!room) return null

    const player = room.players.get(socketId)
    if (!player) return null

    player.connected = false

    if (room.status === 'playing') {
      const timer = setTimeout(() => {
        this.forfeitPlayer(roomId, socketId)
      }, 15000)
      room.disconnectTimers.set(socketId, timer)
    }

    if (room.status === 'waiting') {
      room.players.delete(socketId)
      room.paddles.delete(socketId)
      room.scores.delete(socketId)
      this.playerToRoom.delete(socketId)
    }

    return { roomId, room }
  }

  static forfeitPlayer(roomId: string, socketId: string) {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.players.delete(socketId)
    room.paddles.delete(socketId)
    room.scores.delete(socketId)
    this.playerToRoom.delete(socketId)

    const remaining = Array.from(room.players.entries())
    if (remaining.length === 1) {
      room.status = 'finished'
      room.winnerId = remaining[0][0]
      this.stopGameLoop(room)
      this.saveGameResult(room)
    }
  }

  static handleInput(socketId: string, input: { up: boolean; down: boolean }) {
    const roomId = this.playerToRoom.get(socketId)
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (!room) return

    const player = room.players.get(socketId)
    if (!player) return

    player.input = input
  }

  static startCountdown(roomId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== 'waiting') return false
    if (room.players.size < room.maxPlayers) return false

    room.status = 'countdown'
    room.countdownTimer = 3

    const dbGame = GameModel.create({
      player1_id: Array.from(room.players.values())[0]?.userId,
      player2_id: Array.from(room.players.values())[1]?.userId,
      player1_score: 0,
      player2_score: 0,
      status: 'in_progress',
    })
    room.dbGameId = dbGame.id

    return true
  }

  static startGame(roomId: string) {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.status = 'playing'
    this.resetBall(room)
    this.startGameLoop(room)
  }

  private static resetBall(room: GameRoomState) {
    const angle = (Math.random() * Math.PI / 2) - Math.PI / 4
    const direction = Math.random() > 0.5 ? 1 : -1

    room.ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: direction * BALL_SPEED * Math.cos(angle),
      vy: BALL_SPEED * Math.sin(angle),
    }
  }

  private static startGameLoop(room: GameRoomState) {
    if (room.tickInterval) clearInterval(room.tickInterval)

    room.tickInterval = setInterval(() => {
      if (room.mode === '1v1') {
        this.tick1v1(room)
      } else {
        this.tick4player(room)
      }
    }, TICK_INTERVAL)
  }

  private static stopGameLoop(room: GameRoomState) {
    if (room.tickInterval) {
      clearInterval(room.tickInterval)
      room.tickInterval = undefined
    }
  }

  private static tick1v1(room: GameRoomState) {
    if (room.status !== 'playing') return

    for (const [socketId, player] of room.players) {
      const paddle = room.paddles.get(socketId)
      if (!paddle) continue

      if (player.input.up && paddle.y > 0) {
        paddle.y = Math.max(0, paddle.y - PADDLE_SPEED)
      }
      if (player.input.down && paddle.y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
        paddle.y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, paddle.y + PADDLE_SPEED)
      }
    }

    room.ball.x += room.ball.vx
    room.ball.y += room.ball.vy

    if (room.ball.y <= 0) {
      room.ball.y = 0
      room.ball.vy = Math.abs(room.ball.vy)
    }
    if (room.ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
      room.ball.y = CANVAS_HEIGHT - BALL_SIZE
      room.ball.vy = -Math.abs(room.ball.vy)
    }

    const players = Array.from(room.players.entries())
    const leftPlayer = players.find(([, p]) => p.position === 'left')
    const rightPlayer = players.find(([, p]) => p.position === 'right')

    if (leftPlayer) {
      const paddle = room.paddles.get(leftPlayer[0])
      if (paddle && room.ball.x <= PADDLE_WIDTH &&
        room.ball.y + BALL_SIZE >= paddle.y &&
        room.ball.y <= paddle.y + PADDLE_HEIGHT) {
        const hitPos = (room.ball.y + BALL_SIZE / 2 - paddle.y) / PADDLE_HEIGHT
        const angle = (hitPos - 0.5) * Math.PI / 3
        const speed = Math.sqrt(room.ball.vx ** 2 + room.ball.vy ** 2) * 1.02
        room.ball.vx = Math.abs(speed * Math.cos(angle))
        room.ball.vy = speed * Math.sin(angle)
        room.ball.x = PADDLE_WIDTH
      }
    }

    if (rightPlayer) {
      const paddle = room.paddles.get(rightPlayer[0])
      if (paddle && room.ball.x >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
        room.ball.y + BALL_SIZE >= paddle.y &&
        room.ball.y <= paddle.y + PADDLE_HEIGHT) {
        const hitPos = (room.ball.y + BALL_SIZE / 2 - paddle.y) / PADDLE_HEIGHT
        const angle = (hitPos - 0.5) * Math.PI / 3
        const speed = Math.sqrt(room.ball.vx ** 2 + room.ball.vy ** 2) * 1.02
        room.ball.vx = -Math.abs(speed * Math.cos(angle))
        room.ball.vy = speed * Math.sin(angle)
        room.ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE
      }
    }

    if (room.ball.x < 0 && rightPlayer) {
      const score = (room.scores.get(rightPlayer[0]) || 0) + 1
      room.scores.set(rightPlayer[0], score)
      if (score >= WIN_SCORE) {
        this.endGame(room, rightPlayer[0])
      } else {
        this.resetBall(room)
      }
    }

    if (room.ball.x > CANVAS_WIDTH && leftPlayer) {
      const score = (room.scores.get(leftPlayer[0]) || 0) + 1
      room.scores.set(leftPlayer[0], score)
      if (score >= WIN_SCORE) {
        this.endGame(room, leftPlayer[0])
      } else {
        this.resetBall(room)
      }
    }
  }

  private static tick4player(room: GameRoomState) {
    if (room.status !== 'playing') return

    const SIZE = CANVAS_WIDTH

    for (const [socketId, player] of room.players) {
      const paddle = room.paddles.get(socketId)
      if (!paddle) continue

      const isVertical = player.position === 'left' || player.position === 'right'
      const maxPos = isVertical ? SIZE - PADDLE_HEIGHT : SIZE - PADDLE_HEIGHT

      if (player.input.up && paddle.y > 0) {
        paddle.y = Math.max(0, paddle.y - PADDLE_SPEED)
      }
      if (player.input.down && paddle.y < maxPos) {
        paddle.y = Math.min(maxPos, paddle.y + PADDLE_SPEED)
      }
    }

    room.ball.x += room.ball.vx
    room.ball.y += room.ball.vy

    const players = Array.from(room.players.entries())

    for (const [socketId, player] of players) {
      const paddle = room.paddles.get(socketId)
      if (!paddle) continue

      if (player.position === 'left') {
        if (room.ball.x <= PADDLE_WIDTH &&
          room.ball.y + BALL_SIZE >= paddle.y &&
          room.ball.y <= paddle.y + PADDLE_HEIGHT) {
          room.ball.vx = Math.abs(room.ball.vx)
          room.ball.x = PADDLE_WIDTH
        }
      } else if (player.position === 'right') {
        if (room.ball.x >= SIZE - PADDLE_WIDTH - BALL_SIZE &&
          room.ball.y + BALL_SIZE >= paddle.y &&
          room.ball.y <= paddle.y + PADDLE_HEIGHT) {
          room.ball.vx = -Math.abs(room.ball.vx)
          room.ball.x = SIZE - PADDLE_WIDTH - BALL_SIZE
        }
      } else if (player.position === 'top') {
        if (room.ball.y <= PADDLE_WIDTH &&
          room.ball.x + BALL_SIZE >= paddle.y &&
          room.ball.x <= paddle.y + PADDLE_HEIGHT) {
          room.ball.vy = Math.abs(room.ball.vy)
          room.ball.y = PADDLE_WIDTH
        }
      } else if (player.position === 'bottom') {
        if (room.ball.y >= SIZE - PADDLE_WIDTH - BALL_SIZE &&
          room.ball.x + BALL_SIZE >= paddle.y &&
          room.ball.x <= paddle.y + PADDLE_HEIGHT) {
          room.ball.vy = -Math.abs(room.ball.vy)
          room.ball.y = SIZE - PADDLE_WIDTH - BALL_SIZE
        }
      }
    }

    let scorerId: string | null = null

    if (room.ball.x < 0) {
      const leftPlayer = players.find(([, p]) => p.position === 'left')
      if (leftPlayer) {
        for (const [sid, p] of players) {
          if (p.position !== 'left') {
            room.scores.set(sid, (room.scores.get(sid) || 0) + 1)
            scorerId = sid
          }
        }
      }
    } else if (room.ball.x > SIZE) {
      const rightPlayer = players.find(([, p]) => p.position === 'right')
      if (rightPlayer) {
        for (const [sid, p] of players) {
          if (p.position !== 'right') {
            room.scores.set(sid, (room.scores.get(sid) || 0) + 1)
            scorerId = sid
          }
        }
      }
    } else if (room.ball.y < 0) {
      const topPlayer = players.find(([, p]) => p.position === 'top')
      if (topPlayer) {
        for (const [sid, p] of players) {
          if (p.position !== 'top') {
            room.scores.set(sid, (room.scores.get(sid) || 0) + 1)
            scorerId = sid
          }
        }
      }
    } else if (room.ball.y > SIZE) {
      const bottomPlayer = players.find(([, p]) => p.position === 'bottom')
      if (bottomPlayer) {
        for (const [sid, p] of players) {
          if (p.position !== 'bottom') {
            room.scores.set(sid, (room.scores.get(sid) || 0) + 1)
            scorerId = sid
          }
        }
      }
    }

    if (scorerId !== null) {
      for (const [sid] of players) {
        if ((room.scores.get(sid) || 0) >= WIN_SCORE) {
          this.endGame(room, sid)
          return
        }
      }
      this.resetBall(room)
    }
  }

  private static endGame(room: GameRoomState, winnerSocketId: string) {
    room.status = 'finished'
    room.winnerId = winnerSocketId
    this.stopGameLoop(room)
    this.saveGameResult(room)
  }

  private static saveGameResult(room: GameRoomState) {
    if (!room.dbGameId) return

    const players = Array.from(room.players.entries())
    const scores = Array.from(room.scores.entries())

    GameModel.update(room.dbGameId, {
      player1_score: scores[0]?.[1] || 0,
      player2_score: scores[1]?.[1] || 0,
      status: 'finished',
      winner_id: room.winnerId ? room.players.get(room.winnerId)?.userId : undefined,
      finished_at: new Date().toISOString(),
    })
  }

  static getSerializableState(room: GameRoomState) {
    const players: Record<string, any> = {}
    const paddles: Record<string, any> = {}
    const scores: Record<string, number> = {}

    for (const [sid, player] of room.players) {
      players[sid] = {
        position: player.position,
        connected: player.connected,
        displayName: player.displayName,
      }
      const paddle = room.paddles.get(sid)
      if (paddle) paddles[sid] = paddle
      scores[sid] = room.scores.get(sid) || 0
    }

    return {
      id: room.id,
      ball: room.ball,
      paddles,
      scores,
      players,
      status: room.status,
      mode: room.mode,
      maxPlayers: room.maxPlayers,
      winnerId: room.winnerId,
      countdownTimer: room.countdownTimer,
    }
  }

  static cleanupRoom(roomId: string) {
    const room = this.rooms.get(roomId)
    if (!room) return

    this.stopGameLoop(room)
    for (const timer of room.disconnectTimers.values()) {
      clearTimeout(timer)
    }
    for (const socketId of room.players.keys()) {
      this.playerToRoom.delete(socketId)
    }
    this.rooms.delete(roomId)
  }

  static getRoomByPlayer(socketId: string): GameRoomState | undefined {
    const roomId = this.playerToRoom.get(socketId)
    if (!roomId) return undefined
    return this.rooms.get(roomId)
  }

  static getConstants() {
    return {
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
      BALL_SIZE,
      PADDLE_SPEED,
      BALL_SPEED,
      WIN_SCORE,
      TICK_RATE,
    }
  }
}
