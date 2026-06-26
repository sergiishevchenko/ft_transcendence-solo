import { FastifyInstance } from 'fastify'
import { WebSocket } from 'ws'
import { GameService } from '../services/game.service'
import { AIService } from '../services/ai.service'
import { AuthService } from '../services/auth.service'
import { UserModel } from '../models/user.model'

interface ClientInfo {
  ws: WebSocket
  userId?: number
  displayName: string
  socketId: string
}

const clients: Map<string, ClientInfo> = new Map()
const userToSocket: Map<number, string> = new Map()

function generateSocketId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

function broadcast(roomId: string, message: any, excludeSocketId?: string) {
  const room = GameService.getRoom(roomId)
  if (!room) return

  const data = JSON.stringify(message)
  for (const [socketId] of room.players) {
    if (socketId === excludeSocketId) continue
    if (socketId.startsWith('ai_')) continue
    const client = clients.get(socketId)
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data)
    }
  }
}

function sendTo(socketId: string, message: any) {
  const client = clients.get(socketId)
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message))
  }
}

function broadcastGameState(roomId: string) {
  const room = GameService.getRoom(roomId)
  if (!room) return

  const state = GameService.getSerializableState(room)
  broadcast(roomId, { type: 'game_state', state })
}

function handleAITick(roomId: string) {
  const room = GameService.getRoom(roomId)
  if (!room || room.status !== 'playing') return

  for (const [socketId, player] of room.players) {
    if (!socketId.startsWith('ai_')) continue

    const input = AIService.getInput(
      socketId,
      room.ball,
      room.paddles.get(socketId)?.y || 0,
      player.position,
      Date.now()
    )
    GameService.handleInput(socketId, input)
  }
}

export function setupGameWebSocket(fastify: FastifyInstance) {
  fastify.get('/ws/game', { websocket: true }, (socket, req) => {
    const socketId = generateSocketId()
    let userId: number | undefined
    let displayName = 'Guest'

    const token = (req.query as any).token
    if (token) {
      const decoded = AuthService.verifyToken(token)
      if (decoded) {
        userId = decoded.id
        const user = UserModel.findById(decoded.id)
        displayName = user?.display_name || user?.username || 'Player'
        userToSocket.set(userId, socketId)
      }
    }

    const clientInfo: ClientInfo = { ws: socket, userId, displayName, socketId }
    clients.set(socketId, clientInfo)

    sendTo(socketId, {
      type: 'connected',
      socketId,
      constants: GameService.getConstants(),
    })

    socket.on('message', (rawData: Buffer) => {
      try {
        const message = JSON.parse(rawData.toString())
        handleGameMessage(socketId, message)
      } catch (e) {
        sendTo(socketId, { type: 'error', message: 'Invalid message format' })
      }
    })

    socket.on('close', () => {
      const result = GameService.handleDisconnect(socketId)
      if (result) {
        broadcast(result.roomId, {
          type: 'player_disconnected',
          socketId,
          state: GameService.getSerializableState(result.room),
        })
      }

      if (userId) userToSocket.delete(userId)
      clients.delete(socketId)
    })
  })

  setInterval(() => {
    for (const [roomId, room] of getAllRooms()) {
      if (room.status === 'playing') {
        handleAITick(roomId)
        broadcastGameState(roomId)
      }
    }
  }, 1000 / 60)
}

function getAllRooms(): [string, any][] {
  const rooms: [string, any][] = []
  const waitingRooms1v1 = GameService.getWaitingRooms('1v1')
  const waitingRooms4p = GameService.getWaitingRooms('4player')

  const allRoomIds = new Set<string>()
  for (const client of clients.values()) {
    const room = GameService.getRoomByPlayer(client.socketId)
    if (room) allRoomIds.add(room.id)
  }
  waitingRooms1v1.forEach(r => allRoomIds.add(r.id))
  waitingRooms4p.forEach(r => allRoomIds.add(r.id))

  for (const id of allRoomIds) {
    const room = GameService.getRoom(id)
    if (room) rooms.push([id, room])
  }
  return rooms
}

function handleGameMessage(socketId: string, message: any) {
  switch (message.type) {
    case 'create_room': {
      const mode = message.mode || '1v1'
      const room = GameService.createRoom(mode)
      const client = clients.get(socketId)
      const player = GameService.joinRoom(room.id, socketId, client?.userId, client?.displayName)

      if (player) {
        sendTo(socketId, {
          type: 'room_created',
          roomId: room.id,
          player,
          state: GameService.getSerializableState(room),
        })
      }
      break
    }

    case 'join_room': {
      const room = GameService.getRoom(message.roomId)
      if (!room) {
        sendTo(socketId, { type: 'error', message: 'Room not found' })
        return
      }

      const client = clients.get(socketId)
      const player = GameService.joinRoom(message.roomId, socketId, client?.userId, client?.displayName)

      if (!player) {
        sendTo(socketId, { type: 'error', message: 'Room is full' })
        return
      }

      sendTo(socketId, {
        type: 'room_joined',
        roomId: message.roomId,
        player,
        state: GameService.getSerializableState(room),
      })

      broadcast(message.roomId, {
        type: 'player_joined',
        player,
        state: GameService.getSerializableState(room),
      }, socketId)

      if (room.players.size === room.maxPlayers) {
        GameService.startCountdown(message.roomId)
        let countdown = 3
        broadcast(message.roomId, { type: 'countdown', value: countdown })

        const interval = setInterval(() => {
          countdown--
          if (countdown > 0) {
            broadcast(message.roomId, { type: 'countdown', value: countdown })
          } else {
            clearInterval(interval)
            GameService.startGame(message.roomId)
            broadcast(message.roomId, {
              type: 'game_started',
              state: GameService.getSerializableState(room),
            })
          }
        }, 1000)
      }
      break
    }

    case 'quick_match': {
      const mode = message.mode || '1v1'
      const waitingRooms = GameService.getWaitingRooms(mode)
      let room = waitingRooms[0]

      if (!room) {
        room = GameService.createRoom(mode)
      }

      const client = clients.get(socketId)
      const player = GameService.joinRoom(room.id, socketId, client?.userId, client?.displayName)

      if (!player) {
        sendTo(socketId, { type: 'error', message: 'Failed to join room' })
        return
      }

      sendTo(socketId, {
        type: 'room_joined',
        roomId: room.id,
        player,
        state: GameService.getSerializableState(room),
      })

      broadcast(room.id, {
        type: 'player_joined',
        player,
        state: GameService.getSerializableState(room),
      }, socketId)

      if (room.players.size === room.maxPlayers) {
        GameService.startCountdown(room.id)
        let countdown = 3
        broadcast(room.id, { type: 'countdown', value: countdown })

        const interval = setInterval(() => {
          countdown--
          if (countdown > 0) {
            broadcast(room.id, { type: 'countdown', value: countdown })
          } else {
            clearInterval(interval)
            GameService.startGame(room.id)
            broadcast(room.id, {
              type: 'game_started',
              state: GameService.getSerializableState(room),
            })
          }
        }, 1000)
      }
      break
    }

    case 'play_ai': {
      const difficulty = message.difficulty || 'medium'
      const room = GameService.createRoom('1v1')
      const client = clients.get(socketId)
      const player = GameService.joinRoom(room.id, socketId, client?.userId, client?.displayName)

      if (!player) {
        sendTo(socketId, { type: 'error', message: 'Failed to create AI game' })
        return
      }

      const aiSocketId = `ai_${room.id}`
      AIService.createAI(aiSocketId, difficulty)

      const aiPlayer = GameService.joinRoom(room.id, aiSocketId, undefined, `AI (${difficulty})`)

      sendTo(socketId, {
        type: 'room_joined',
        roomId: room.id,
        player,
        state: GameService.getSerializableState(room),
      })

      GameService.startCountdown(room.id)
      let countdown = 3
      sendTo(socketId, { type: 'countdown', value: countdown })

      const interval = setInterval(() => {
        countdown--
        if (countdown > 0) {
          sendTo(socketId, { type: 'countdown', value: countdown })
        } else {
          clearInterval(interval)
          GameService.startGame(room.id)
          sendTo(socketId, {
            type: 'game_started',
            state: GameService.getSerializableState(room),
          })
        }
      }, 1000)
      break
    }

    case 'input': {
      GameService.handleInput(socketId, message.input)
      break
    }

    case 'leave_room': {
      const result = GameService.handleDisconnect(socketId)
      if (result) {
        broadcast(result.roomId, {
          type: 'player_left',
          socketId,
          state: GameService.getSerializableState(result.room),
        })
      }
      sendTo(socketId, { type: 'room_left' })
      break
    }

    case 'get_rooms': {
      const mode = message.mode || '1v1'
      const rooms = GameService.getWaitingRooms(mode).map(r => ({
        id: r.id,
        playerCount: r.players.size,
        maxPlayers: r.maxPlayers,
        mode: r.mode,
        players: Array.from(r.players.values()).map(p => ({
          displayName: p.displayName,
          position: p.position,
        })),
      }))
      sendTo(socketId, { type: 'room_list', rooms })
      break
    }
  }
}

export function getSocketIdByUserId(userId: number): string | undefined {
  return userToSocket.get(userId)
}

export function sendToUser(userId: number, message: any) {
  const socketId = userToSocket.get(userId)
  if (socketId) {
    sendTo(socketId, message)
  }
}
