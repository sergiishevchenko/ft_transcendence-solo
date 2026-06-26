import { FastifyInstance } from 'fastify'
import { WebSocket } from 'ws'
import { ChatService } from '../services/chat.service'
import { AuthService } from '../services/auth.service'
import { UserModel } from '../models/user.model'
import { GameService } from '../services/game.service'

interface ChatClient {
  ws: WebSocket
  userId: number
  username: string
  displayName: string
}

const chatClients: Map<number, ChatClient> = new Map()

function sendToClient(userId: number, message: any) {
  const client = chatClients.get(userId)
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message))
  }
}

export function getOnlineUsers(): number[] {
  return Array.from(chatClients.keys())
}

export function isUserOnline(userId: number): boolean {
  return chatClients.has(userId)
}

export function setupChatWebSocket(fastify: FastifyInstance) {
  fastify.get('/ws/chat', { websocket: true }, (socket, req) => {
    const token = (req.query as any).token
    if (!token) {
      socket.close(4001, 'Authentication required')
      return
    }

    const decoded = AuthService.verifyToken(token)
    if (!decoded) {
      socket.close(4001, 'Invalid token')
      return
    }

    const user = UserModel.findById(decoded.id)
    if (!user) {
      socket.close(4001, 'User not found')
      return
    }

    const userId = user.id!

    const existingClient = chatClients.get(userId)
    if (existingClient) {
      existingClient.ws.close(4002, 'New connection established')
    }

    const client: ChatClient = {
      ws: socket,
      userId,
      username: user.username,
      displayName: user.display_name || user.username,
    }
    chatClients.set(userId, client)

    for (const [otherUserId] of chatClients) {
      if (otherUserId !== userId) {
        sendToClient(otherUserId, {
          type: 'user_online',
          userId,
          username: user.username,
          displayName: user.display_name || user.username,
        })
      }
    }

    const onlineUserIds = getOnlineUsers()
    sendToClient(userId, {
      type: 'connected',
      userId,
      onlineUsers: onlineUserIds,
      unreadCount: ChatService.getUnreadCount(userId),
    })

    socket.on('message', (rawData: Buffer) => {
      try {
        const message = JSON.parse(rawData.toString())
        handleChatMessage(userId, message)
      } catch (e) {
        sendToClient(userId, { type: 'error', message: 'Invalid message format' })
      }
    })

    socket.on('close', () => {
      chatClients.delete(userId)

      for (const [otherUserId] of chatClients) {
        sendToClient(otherUserId, {
          type: 'user_offline',
          userId,
        })
      }
    })
  })
}

function handleChatMessage(senderId: number, message: any) {
  switch (message.type) {
    case 'send_message': {
      const { receiverId, content } = message

      if (!receiverId || !content || content.trim().length === 0) {
        sendToClient(senderId, { type: 'error', message: 'Invalid message' })
        return
      }

      if (ChatService.isBlocked(senderId, receiverId)) {
        sendToClient(senderId, { type: 'error', message: 'Cannot send message to this user' })
        return
      }

      const receiver = UserModel.findById(receiverId)
      if (!receiver) {
        sendToClient(senderId, { type: 'error', message: 'User not found' })
        return
      }

      const savedMessage = ChatService.saveMessage({
        sender_id: senderId,
        receiver_id: receiverId,
        content: content.trim(),
        type: 'text',
        read: false,
      })

      const sender = UserModel.findById(senderId)

      const messageData = {
        type: 'new_message',
        message: {
          ...savedMessage,
          sender_username: sender?.username,
          sender_display_name: sender?.display_name,
          receiver_username: receiver.username,
          receiver_display_name: receiver.display_name,
        },
      }

      sendToClient(senderId, messageData)
      sendToClient(receiverId, messageData)
      break
    }

    case 'get_conversations': {
      const conversations = ChatService.getConversationList(senderId)
      const enriched = conversations.map(c => ({
        ...c,
        online: isUserOnline(c.other_user_id),
      }))
      sendToClient(senderId, { type: 'conversation_list', conversations: enriched })
      break
    }

    case 'get_messages': {
      const { userId, limit, offset } = message
      if (!userId) return

      const messages = ChatService.getConversation(senderId, userId, limit || 50, offset || 0)
      ChatService.markAsRead(userId, senderId)
      sendToClient(senderId, {
        type: 'messages',
        userId,
        messages: messages.reverse(),
      })
      break
    }

    case 'mark_read': {
      const { userId } = message
      if (!userId) return
      ChatService.markAsRead(userId, senderId)
      sendToClient(senderId, { type: 'messages_read', userId })
      break
    }

    case 'block_user': {
      const { userId } = message
      if (!userId) return
      ChatService.blockUser(senderId, userId)
      sendToClient(senderId, { type: 'user_blocked', userId })
      break
    }

    case 'unblock_user': {
      const { userId } = message
      if (!userId) return
      ChatService.unblockUser(senderId, userId)
      sendToClient(senderId, { type: 'user_unblocked', userId })
      break
    }

    case 'get_blocked': {
      const blocked = ChatService.getBlockedUsers(senderId)
      sendToClient(senderId, { type: 'blocked_list', blockedUserIds: blocked })
      break
    }

    case 'game_invite': {
      const { receiverId, roomId } = message
      if (!receiverId) return

      if (ChatService.isBlocked(senderId, receiverId)) {
        sendToClient(senderId, { type: 'error', message: 'Cannot invite this user' })
        return
      }

      const sender = UserModel.findById(senderId)
      const savedMessage = ChatService.saveMessage({
        sender_id: senderId,
        receiver_id: receiverId,
        content: `${sender?.display_name || sender?.username} invited you to play!`,
        type: 'game_invite',
        game_room_id: roomId,
        read: false,
      })

      const messageData = {
        type: 'new_message',
        message: {
          ...savedMessage,
          sender_username: sender?.username,
          sender_display_name: sender?.display_name,
        },
      }

      sendToClient(senderId, messageData)
      sendToClient(receiverId, messageData)
      break
    }

    case 'get_online_users': {
      const onlineUserIds = getOnlineUsers()
      sendToClient(senderId, { type: 'online_users', userIds: onlineUserIds })
      break
    }
  }
}

export function sendTournamentNotification(userId: number, tournamentName: string, matchInfo: string) {
  sendToClient(userId, {
    type: 'tournament_notification',
    tournamentName,
    matchInfo,
  })
}
