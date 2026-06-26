import { getGameWebSocket, WebSocketService } from '../services/websocket.service'

interface RemoteGameState {
  id: string
  ball: { x: number; y: number; vx: number; vy: number }
  paddles: Record<string, { y: number }>
  scores: Record<string, number>
  players: Record<string, { position: string; connected: boolean; displayName: string }>
  status: string
  mode: string
  maxPlayers: number
  winnerId?: string
  countdownTimer?: number
}

interface GameConstants {
  CANVAS_WIDTH: number
  CANVAS_HEIGHT: number
  PADDLE_WIDTH: number
  PADDLE_HEIGHT: number
  BALL_SIZE: number
}

export function RemotePongGame(mode: '1v1' | '4player' = '1v1', action: 'quick_match' | 'play_ai' = 'quick_match', difficulty?: string): HTMLElement {
  const container = document.createElement('div')
  container.className = 'bg-gray-800 p-4 rounded-lg'

  let ws: WebSocketService
  let mySocketId: string = ''
  let gameState: RemoteGameState | null = null
  let constants: GameConstants = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 400,
    PADDLE_WIDTH: 10,
    PADDLE_HEIGHT: 80,
    BALL_SIZE: 10,
  }
  let canvas: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D | null = null
  let animationFrameId: number
  let statusText = 'Connecting...'
  let countdownValue = 0

  const keys = new Set<string>()
  let lastInput = { up: false, down: false }

  const renderUI = () => {
    const canvasWidth = mode === '4player' ? 800 : 800
    const canvasHeight = mode === '4player' ? 800 : 400

    container.innerHTML = `
      <div class="mb-4 text-center">
        <p id="game-status" class="text-lg font-bold mb-2">${statusText}</p>
        <p class="text-sm text-gray-400 mb-2">Controls: W/S or Arrow Up/Down</p>
      </div>
      <div class="flex justify-center">
        <canvas id="remote-canvas" width="${canvasWidth}" height="${canvasHeight}" class="border-2 border-gray-600 bg-black"></canvas>
      </div>
      <div class="mt-4 text-center">
        <button id="leave-btn" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm">Leave Game</button>
      </div>
    `

    canvas = container.querySelector('#remote-canvas') as HTMLCanvasElement
    ctx = canvas?.getContext('2d') || null

    container.querySelector('#leave-btn')?.addEventListener('click', () => {
      cleanup()
      container.dispatchEvent(new CustomEvent('game-exit'))
    })
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    if (['w', 's', 'arrowup', 'arrowdown'].includes(key)) {
      e.preventDefault()
      keys.add(key)
      sendInput()
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    if (['w', 's', 'arrowup', 'arrowdown'].includes(key)) {
      e.preventDefault()
      keys.delete(key)
      sendInput()
    }
  }

  const sendInput = () => {
    const input = {
      up: keys.has('w') || keys.has('arrowup'),
      down: keys.has('s') || keys.has('arrowdown'),
    }

    if (input.up !== lastInput.up || input.down !== lastInput.down) {
      lastInput = input
      ws.send({ type: 'input', input })
    }
  }

  const draw = () => {
    if (!ctx || !canvas) return

    const w = canvas.width
    const h = canvas.height

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, w, h)

    if (countdownValue > 0) {
      ctx.fillStyle = '#ffffff'
      ctx.font = '72px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(countdownValue.toString(), w / 2, h / 2)
      animationFrameId = requestAnimationFrame(draw)
      return
    }

    if (!gameState) {
      ctx.fillStyle = '#ffffff'
      ctx.font = '24px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(statusText, w / 2, h / 2)
      animationFrameId = requestAnimationFrame(draw)
      return
    }

    if (mode === '1v1') {
      draw1v1()
    } else {
      draw4player()
    }

    if (gameState.status === 'finished') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#ffffff'
      ctx.font = '48px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const winner = gameState.winnerId ? gameState.players[gameState.winnerId] : null
      const isMyWin = gameState.winnerId === mySocketId
      ctx.fillText(isMyWin ? 'You Win!' : `${winner?.displayName || 'Opponent'} Wins!`, w / 2, h / 2)
    }

    animationFrameId = requestAnimationFrame(draw)
  }

  const draw1v1 = () => {
    if (!ctx || !canvas || !gameState) return
    const w = canvas.width
    const h = canvas.height

    ctx.strokeStyle = '#333333'
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(w / 2, 0)
    ctx.lineTo(w / 2, h)
    ctx.stroke()
    ctx.setLineDash([])

    const entries = Object.entries(gameState.players)
    for (const [sid, player] of entries) {
      const paddle = gameState.paddles[sid]
      if (!paddle) continue

      const isMe = sid === mySocketId
      ctx.fillStyle = isMe ? '#4ade80' : '#ef4444'

      if (player.position === 'left') {
        ctx.fillRect(0, paddle.y, constants.PADDLE_WIDTH, constants.PADDLE_HEIGHT)
      } else {
        ctx.fillRect(w - constants.PADDLE_WIDTH, paddle.y, constants.PADDLE_WIDTH, constants.PADDLE_HEIGHT)
      }
    }

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(gameState.ball.x, gameState.ball.y, constants.BALL_SIZE, constants.BALL_SIZE)

    ctx.font = '48px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'

    let leftScore = 0, rightScore = 0
    let leftName = '', rightName = ''
    for (const [sid, player] of entries) {
      if (player.position === 'left') {
        leftScore = gameState.scores[sid] || 0
        leftName = player.displayName
      } else {
        rightScore = gameState.scores[sid] || 0
        rightName = player.displayName
      }
    }

    ctx.fillText(leftScore.toString(), w / 4, 50)
    ctx.fillText(rightScore.toString(), (3 * w) / 4, 50)

    ctx.font = '14px Arial'
    ctx.fillStyle = '#9ca3af'
    ctx.fillText(leftName, w / 4, 75)
    ctx.fillText(rightName, (3 * w) / 4, 75)
  }

  const draw4player = () => {
    if (!ctx || !canvas || !gameState) return
    const size = canvas.width

    ctx.strokeStyle = '#333333'
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(size / 2, 0)
    ctx.lineTo(size / 2, size)
    ctx.moveTo(0, size / 2)
    ctx.lineTo(size, size / 2)
    ctx.stroke()
    ctx.setLineDash([])

    const entries = Object.entries(gameState.players)
    for (const [sid, player] of entries) {
      const paddle = gameState.paddles[sid]
      if (!paddle) continue

      const isMe = sid === mySocketId
      ctx.fillStyle = isMe ? '#4ade80' : '#ef4444'

      if (player.position === 'left') {
        ctx.fillRect(0, paddle.y, constants.PADDLE_WIDTH, constants.PADDLE_HEIGHT)
      } else if (player.position === 'right') {
        ctx.fillRect(size - constants.PADDLE_WIDTH, paddle.y, constants.PADDLE_WIDTH, constants.PADDLE_HEIGHT)
      } else if (player.position === 'top') {
        ctx.fillRect(paddle.y, 0, constants.PADDLE_HEIGHT, constants.PADDLE_WIDTH)
      } else if (player.position === 'bottom') {
        ctx.fillRect(paddle.y, size - constants.PADDLE_WIDTH, constants.PADDLE_HEIGHT, constants.PADDLE_WIDTH)
      }
    }

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(gameState.ball.x, gameState.ball.y, constants.BALL_SIZE, constants.BALL_SIZE)

    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    for (const [sid, player] of entries) {
      const score = gameState.scores[sid] || 0
      const isMe = sid === mySocketId
      ctx.fillStyle = isMe ? '#4ade80' : '#ffffff'

      if (player.position === 'left') {
        ctx.fillText(`${player.displayName}: ${score}`, 80, size / 2)
      } else if (player.position === 'right') {
        ctx.fillText(`${player.displayName}: ${score}`, size - 80, size / 2)
      } else if (player.position === 'top') {
        ctx.fillText(`${player.displayName}: ${score}`, size / 2, 30)
      } else if (player.position === 'bottom') {
        ctx.fillText(`${player.displayName}: ${score}`, size / 2, size - 15)
      }
    }
  }

  const cleanup = () => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    cancelAnimationFrame(animationFrameId)
    ws?.send({ type: 'leave_room' })
    ws?.disconnect()
  }

  const init = async () => {
    renderUI()

    ws = getGameWebSocket()

    ws.on('connected', (data: any) => {
      mySocketId = data.socketId
      if (data.constants) constants = data.constants

      if (action === 'play_ai') {
        ws.send({ type: 'play_ai', difficulty: difficulty || 'medium' })
      } else {
        ws.send({ type: 'quick_match', mode })
      }
    })

    ws.on('room_joined', (data: any) => {
      gameState = data.state
      statusText = `Waiting for players... (${Object.keys(data.state.players).length}/${data.state.maxPlayers})`
      updateStatus()
    })

    ws.on('player_joined', (data: any) => {
      gameState = data.state
      statusText = `Players: ${Object.keys(data.state.players).length}/${data.state.maxPlayers}`
      updateStatus()
    })

    ws.on('countdown', (data: any) => {
      countdownValue = data.value
      statusText = `Starting in ${data.value}...`
      updateStatus()
    })

    ws.on('game_started', (data: any) => {
      gameState = data.state
      countdownValue = 0
      statusText = 'Game in progress'
      updateStatus()
    })

    ws.on('game_state', (data: any) => {
      gameState = data.state

      if (gameState?.status === 'finished') {
        const winner = gameState.winnerId ? gameState.players[gameState.winnerId] : null
        const isMyWin = gameState.winnerId === mySocketId
        statusText = isMyWin ? 'You Win!' : `${winner?.displayName || 'Opponent'} Wins!`
        updateStatus()
      }
    })

    ws.on('player_disconnected', (data: any) => {
      gameState = data.state
      statusText = 'Opponent disconnected - waiting for reconnect...'
      updateStatus()
    })

    ws.on('player_left', (data: any) => {
      gameState = data.state
      statusText = 'Opponent left the game'
      updateStatus()
    })

    ws.on('error', (data: any) => {
      statusText = `Error: ${data.message}`
      updateStatus()
    })

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    try {
      await ws.connect()
    } catch {
      statusText = 'Failed to connect to server'
      updateStatus()
    }

    animationFrameId = requestAnimationFrame(draw)
  }

  const updateStatus = () => {
    const el = container.querySelector('#game-status')
    if (el) el.textContent = statusText
  }

  container.addEventListener('remove', cleanup)
  init()

  return container
}
