import { AuthService } from '../services/auth.service'
import { getChatWebSocket, WebSocketService } from '../services/websocket.service'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface Conversation {
  other_user_id: number
  username: string
  display_name: string
  avatar_url: string | null
  last_message: string
  last_message_at: string
  unread_count: number
  online: boolean
}

interface ChatMessage {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  type: string
  game_room_id?: string
  created_at: string
  sender_username?: string
  sender_display_name?: string
}

export function ChatPage(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)]'

  const user = AuthService.getUser()
  if (!user) {
    div.innerHTML = '<p class="text-center text-gray-400">Please login to use chat</p>'
    return div
  }

  let ws: WebSocketService
  let conversations: Conversation[] = []
  let currentChatUserId: number | null = null
  let messages: ChatMessage[] = []
  let onlineUsers: Set<number> = new Set()
  let blockedUsers: Set<number> = new Set()
  let searchResults: any[] = []

  const render = () => {
    div.innerHTML = `
      <div class="flex h-full bg-gray-800 rounded-lg overflow-hidden">
        <div class="w-80 border-r border-gray-700 flex flex-col">
          <div class="p-4 border-b border-gray-700">
            <h2 class="text-lg font-bold mb-2">Messages</h2>
            <div class="relative">
              <input type="text" id="user-search" placeholder="Search users..."
                class="w-full px-3 py-2 bg-gray-700 rounded text-sm text-white">
              <div id="search-results" class="absolute top-full left-0 right-0 bg-gray-700 rounded-b mt-1 z-10 hidden"></div>
            </div>
          </div>
          <div id="conversation-list" class="flex-1 overflow-y-auto"></div>
        </div>

        <div class="flex-1 flex flex-col">
          ${currentChatUserId ? renderChatArea() : renderEmptyState()}
        </div>
      </div>
    `

    renderConversationList()
    setupEventListeners()
  }

  const renderEmptyState = (): string => `
    <div class="flex-1 flex items-center justify-center text-gray-400">
      <div class="text-center">
        <p class="text-xl mb-2">Select a conversation</p>
        <p class="text-sm">Or search for a user to start chatting</p>
      </div>
    </div>
  `

  const renderChatArea = (): string => {
    const chatUser = conversations.find(c => c.other_user_id === currentChatUserId)
    const isOnline = onlineUsers.has(currentChatUserId!)
    const isBlocked = blockedUsers.has(currentChatUserId!)

    return `
      <div class="p-4 border-b border-gray-700 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
              <span>${(chatUser?.display_name || chatUser?.username || '?')[0].toUpperCase()}</span>
            </div>
            <div class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}"></div>
          </div>
          <div>
            <div class="font-bold">${chatUser?.display_name || chatUser?.username || 'User'}</div>
            <div class="text-xs text-gray-400">${isOnline ? 'Online' : 'Offline'}</div>
          </div>
        </div>
        <div class="flex gap-2">
          <button id="invite-game-btn" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm" title="Invite to game">Invite to Game</button>
          <button id="block-user-btn" class="px-3 py-1 ${isBlocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} rounded text-sm">
            ${isBlocked ? 'Unblock' : 'Block'}
          </button>
        </div>
      </div>

      <div id="messages-container" class="flex-1 overflow-y-auto p-4 space-y-3"></div>

      <div class="p-4 border-t border-gray-700">
        <div class="flex gap-2">
          <input type="text" id="message-input" placeholder="${isBlocked ? 'User is blocked' : 'Type a message...'}"
            class="flex-1 px-4 py-2 bg-gray-700 rounded text-white" ${isBlocked ? 'disabled' : ''}>
          <button id="send-btn" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded" ${isBlocked ? 'disabled' : ''}>Send</button>
        </div>
      </div>
    `
  }

  const renderConversationList = () => {
    const list = div.querySelector('#conversation-list')
    if (!list) return

    if (conversations.length === 0) {
      list.innerHTML = '<p class="p-4 text-center text-gray-400 text-sm">No conversations yet</p>'
      return
    }

    list.innerHTML = conversations.map(c => {
      const isOnline = onlineUsers.has(c.other_user_id)
      const isActive = c.other_user_id === currentChatUserId

      return `
        <div class="p-3 cursor-pointer hover:bg-gray-700 ${isActive ? 'bg-gray-700' : ''} conversation-item" data-user-id="${c.other_user_id}">
          <div class="flex items-center gap-3">
            <div class="relative flex-shrink-0">
              <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                <span>${(c.display_name || c.username)[0].toUpperCase()}</span>
              </div>
              <div class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}"></div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between">
                <span class="font-medium truncate">${c.display_name || c.username}</span>
                ${c.unread_count > 0 ? `<span class="bg-blue-600 text-xs px-2 py-0.5 rounded-full">${c.unread_count}</span>` : ''}
              </div>
              <p class="text-sm text-gray-400 truncate">${c.last_message || ''}</p>
            </div>
          </div>
        </div>
      `
    }).join('')

    list.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const userId = parseInt(item.getAttribute('data-user-id')!)
        openChat(userId)
      })
    })
  }

  const renderMessages = () => {
    const container = div.querySelector('#messages-container')
    if (!container) return

    container.innerHTML = messages.map(m => {
      const isMe = m.sender_id === user.id
      const isInvite = m.type === 'game_invite'

      return `
        <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
          <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isMe ? 'bg-blue-600' : 'bg-gray-700'}">
            ${isInvite ? `
              <p class="text-sm mb-1">${m.content}</p>
              ${m.game_room_id ? `<button class="join-game-btn text-xs underline" data-room-id="${m.game_room_id}">Join Game</button>` : ''}
            ` : `
              <p class="text-sm">${escapeHtml(m.content)}</p>
            `}
            <p class="text-xs text-gray-300 mt-1">${formatTime(m.created_at)}</p>
          </div>
        </div>
      `
    }).join('')

    container.querySelectorAll('.join-game-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const roomId = btn.getAttribute('data-room-id')
        if (roomId) {
          window.history.pushState({}, '', `/game?mode=remote&room=${roomId}`)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
      })
    })

    container.scrollTop = container.scrollHeight
  }

  const openChat = (userId: number) => {
    currentChatUserId = userId
    messages = []
    render()
    ws.send({ type: 'get_messages', userId, limit: 50, offset: 0 })
    ws.send({ type: 'mark_read', userId })
  }

  const setupEventListeners = () => {
    const searchInput = div.querySelector('#user-search') as HTMLInputElement
    const searchResults = div.querySelector('#search-results')
    let searchTimeout: ReturnType<typeof setTimeout>

    searchInput?.addEventListener('input', () => {
      clearTimeout(searchTimeout)
      const q = searchInput.value.trim()
      if (q.length < 2) {
        searchResults?.classList.add('hidden')
        return
      }

      searchTimeout = setTimeout(async () => {
        try {
          const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(q)}`, {
            headers: AuthService.getAuthHeaders(),
          })
          if (res.ok) {
            const data = await res.json()
            searchResults!.innerHTML = data.users
              .filter((u: any) => u.id !== user.id)
              .map((u: any) => `
                <div class="p-2 hover:bg-gray-600 cursor-pointer search-result-item" data-user-id="${u.id}" data-username="${u.username}" data-display-name="${u.display_name || u.username}">
                  <span class="font-medium">${u.display_name || u.username}</span>
                  <span class="text-sm text-gray-400">@${u.username}</span>
                </div>
              `).join('')

            searchResults?.classList.remove('hidden')

            searchResults?.querySelectorAll('.search-result-item').forEach(item => {
              item.addEventListener('click', () => {
                const userId = parseInt(item.getAttribute('data-user-id')!)
                const existing = conversations.find(c => c.other_user_id === userId)
                if (!existing) {
                  conversations.unshift({
                    other_user_id: userId,
                    username: item.getAttribute('data-username') || '',
                    display_name: item.getAttribute('data-display-name') || '',
                    avatar_url: null,
                    last_message: '',
                    last_message_at: '',
                    unread_count: 0,
                    online: onlineUsers.has(userId),
                  })
                }
                searchInput.value = ''
                searchResults?.classList.add('hidden')
                openChat(userId)
              })
            })
          }
        } catch {
          // Ignore search errors
        }
      }, 300)
    })

    const messageInput = div.querySelector('#message-input') as HTMLInputElement
    const sendBtn = div.querySelector('#send-btn')

    const sendMessage = () => {
      if (!currentChatUserId || !messageInput?.value.trim()) return

      ws.send({
        type: 'send_message',
        receiverId: currentChatUserId,
        content: messageInput.value.trim(),
      })
      messageInput.value = ''
    }

    sendBtn?.addEventListener('click', sendMessage)
    messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage()
    })

    div.querySelector('#block-user-btn')?.addEventListener('click', () => {
      if (!currentChatUserId) return
      if (blockedUsers.has(currentChatUserId)) {
        ws.send({ type: 'unblock_user', userId: currentChatUserId })
        blockedUsers.delete(currentChatUserId)
      } else {
        ws.send({ type: 'block_user', userId: currentChatUserId })
        blockedUsers.add(currentChatUserId)
      }
      render()
      if (currentChatUserId) renderMessages()
    })

    div.querySelector('#invite-game-btn')?.addEventListener('click', () => {
      if (!currentChatUserId) return
      ws.send({
        type: 'game_invite',
        receiverId: currentChatUserId,
        roomId: null,
      })
    })
  }

  const init = async () => {
    render()

    ws = getChatWebSocket()

    ws.on('connected', (data: any) => {
      onlineUsers = new Set(data.onlineUsers || [])
      ws.send({ type: 'get_conversations' })
      ws.send({ type: 'get_blocked' })
    })

    ws.on('conversation_list', (data: any) => {
      conversations = data.conversations || []
      renderConversationList()
    })

    ws.on('messages', (data: any) => {
      if (data.userId === currentChatUserId) {
        messages = data.messages || []
        renderMessages()
      }
    })

    ws.on('new_message', (data: any) => {
      const msg = data.message as ChatMessage
      if (
        (msg.sender_id === currentChatUserId && msg.receiver_id === user.id) ||
        (msg.sender_id === user.id && msg.receiver_id === currentChatUserId)
      ) {
        messages.push(msg)
        renderMessages()
        if (msg.sender_id !== user.id) {
          ws.send({ type: 'mark_read', userId: currentChatUserId })
        }
      }

      ws.send({ type: 'get_conversations' })
    })

    ws.on('user_online', (data: any) => {
      onlineUsers.add(data.userId)
      renderConversationList()
    })

    ws.on('user_offline', (data: any) => {
      onlineUsers.delete(data.userId)
      renderConversationList()
    })

    ws.on('blocked_list', (data: any) => {
      blockedUsers = new Set(data.blockedUserIds || [])
    })

    ws.on('user_blocked', () => {
      render()
    })

    ws.on('user_unblocked', () => {
      render()
    })

    ws.on('tournament_notification', (data: any) => {
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      notification.textContent = `Tournament: ${data.tournamentName} - ${data.matchInfo}`
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 5000)
    })

    try {
      await ws.connect()
    } catch {
      div.innerHTML = '<p class="text-center text-red-400 mt-8">Failed to connect to chat server</p>'
    }
  }

  init()
  return div
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 86400000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
