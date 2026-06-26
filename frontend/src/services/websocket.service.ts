import { AuthService } from './auth.service'

type MessageHandler = (data: any) => void

export class WebSocketService {
  private ws: WebSocket | null = null
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private reconnectAttempts = 0
  private maxReconnects = 5
  private reconnectDelay = 1000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private endpoint: string
  private isClosing = false

  constructor(endpoint: string) {
    this.endpoint = endpoint
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      this.isClosing = false
      const token = AuthService.getAccessToken()
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const tokenParam = token ? `?token=${token}` : ''
      const url = `${protocol}//${host}${this.endpoint}${tokenParam}`

      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.emit(data.type, data)
        } catch (e) {
          console.error('WebSocket message parse error:', e)
        }
      }

      this.ws.onclose = () => {
        if (!this.isClosing && this.reconnectAttempts < this.maxReconnects) {
          this.reconnectAttempts++
          this.reconnectTimer = setTimeout(() => {
            this.connect().catch(() => {})
          }, this.reconnectDelay * this.reconnectAttempts)
        }
      }

      this.ws.onerror = () => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection failed'))
        }
      }
    })
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
  }

  off(type: string, handler: MessageHandler) {
    this.handlers.get(type)?.delete(handler)
  }

  private emit(type: string, data: any) {
    this.handlers.get(type)?.forEach(handler => handler(data))
    this.handlers.get('*')?.forEach(handler => handler(data))
  }

  disconnect() {
    this.isClosing = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.handlers.clear()
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

let gameWs: WebSocketService | null = null
let chatWs: WebSocketService | null = null

export function getGameWebSocket(): WebSocketService {
  if (!gameWs) {
    gameWs = new WebSocketService('/ws/game')
  }
  return gameWs
}

export function getChatWebSocket(): WebSocketService {
  if (!chatWs) {
    chatWs = new WebSocketService('/ws/chat')
  }
  return chatWs
}

export function disconnectAll() {
  gameWs?.disconnect()
  gameWs = null
  chatWs?.disconnect()
  chatWs = null
}
