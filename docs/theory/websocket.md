# WebSocket

## What Is WebSocket

WebSocket is a communication protocol that provides **full-duplex** (two-way) communication over a single TCP connection. Unlike HTTP where the client always initiates requests, WebSocket allows both client and server to send messages at any time.

```
HTTP:       Client ──request──► Server ──response──► Client
            (client initiates every exchange)

WebSocket:  Client ◄══════════════════════► Server
            (either side can send at any time)
```

WebSocket is defined in [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455) and supported by all modern browsers.

## Why WebSocket

| Problem | HTTP solution | WebSocket solution |
|---------|---------------|-------------------|
| Real-time game state | Polling every 16ms (60fps) | Server pushes state 60 times/sec |
| Chat messages | Long polling or SSE | Instant bidirectional delivery |
| Online status | Periodic polling | Connection presence = online |
| Low latency | New TCP connection per request | Single persistent connection |

For this project, WebSocket is used for:
- Real-time Pong game synchronization (60fps state broadcast)
- Live chat with instant message delivery
- Online/offline status tracking
- Game invitations and tournament notifications

## How WebSocket Works

### The Upgrade Handshake

WebSocket starts as a normal HTTP request. The client sends an **upgrade request**:

```http
GET /ws/game HTTP/1.1
Host: localhost
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

Server responds with **101 Switching Protocols**:

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

After this handshake, the connection upgrades from HTTP to WebSocket. The same TCP connection stays open for bidirectional messaging.

### Message Framing

WebSocket messages are sent in **frames**:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
├─┼─┼─┼─┼─────────┼─┼─────────────────┼───────────────────────────┤
│F│R│R│R│  opcode │M│   Payload len   │     Payload data          │
│I│S│S│S│  (4)    │A│     (7+)        │                           │
│N│V│V│V│         │S│                 │                           │
│ │1│2│3│         │K│                 │                           │
├─┴─┴─┴─┴─────────┴─┴─────────────────┴───────────────────────────┤
```

Key opcodes:
- `0x1` — text frame (used for JSON messages)
- `0x2` — binary frame
- `0x8` — close
- `0x9` — ping
- `0xA` — pong

Messages can be split across multiple frames (fragmentation), but most implementations send complete messages in one frame.

### Connection Lifecycle

```
1. HTTP Upgrade handshake
2. Connection open → onopen event
3. Bidirectional messages → onmessage events
4. Either side sends close frame → onclose event
5. TCP connection terminates
```

Close can be initiated by either party with an optional status code:
- `1000` — normal closure
- `1001` — going away (page unload)
- `1006` — abnormal closure (no close frame)
- `4001` — custom: authentication required (used in this project)

## WebSocket vs Alternatives

| Technology | Direction | Connection | Use case |
|-----------|-----------|------------|----------|
| **HTTP polling** | Client → Server | New connection each time | Simple, infrequent updates |
| **Long polling** | Client → Server | Held open until data | Moderate real-time needs |
| **SSE** | Server → Client only | Persistent | One-way notifications |
| **WebSocket** | Bidirectional | Persistent | Games, chat, collaboration |

WebSocket is the right choice when:
- Both sides need to send data freely
- Latency matters (games)
- Many small messages per second (input, state updates)
- Connection state matters (online status)

## WebSocket over TLS (WSS)

Just as HTTPS wraps HTTP in TLS, WSS wraps WebSocket in TLS:

```
ws://  → unencrypted WebSocket (port 80)
wss:// → encrypted WebSocket (port 443)
```

In this project, the browser connects to `wss://localhost/ws/game`. Nginx terminates TLS and forwards the plain WebSocket to the backend:

```
Browser ──[WSS/TLS]──► nginx ──[WS]──► backend:3000
```

## Proxying WebSocket Through Nginx

WebSocket requires special nginx configuration because the `Upgrade` and `Connection` headers must be forwarded:

```nginx
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

Without `proxy_http_version 1.1` and the upgrade headers, the handshake fails. The `proxy_read_timeout 86400` (24 hours) prevents nginx from closing idle WebSocket connections.

## WebSocket in Node.js

### Server (ws library)

The `ws` library is the most popular WebSocket implementation for Node.js. This project uses `@fastify/websocket` which wraps `ws` with Fastify integration:

```typescript
fastify.get('/ws/game', { websocket: true }, (socket, req) => {
    socket.on('message', (data) => {
        const message = JSON.parse(data.toString())
        // handle message
    })

    socket.on('close', () => {
        // handle disconnect
    })

    socket.send(JSON.stringify({ type: 'connected' }))
})
```

### Client (browser API)

Browsers provide the `WebSocket` class natively:

```typescript
const ws = new WebSocket('wss://localhost/ws/game?token=...')

ws.onopen = () => { /* connected */ }
ws.onmessage = (event) => { const data = JSON.parse(event.data) }
ws.onclose = () => { /* disconnected */ }
ws.onerror = () => { /* error */ }

ws.send(JSON.stringify({ type: 'input', input: { up: true } }))
```

## Authentication

WebSocket does not support custom headers in the browser API. Common authentication approaches:

| Method | How it works | This project |
|--------|-------------|--------------|
| Query parameter | `?token=JWT` in URL | ✅ Used |
| First message | Send auth message after connect | Not used |
| Cookie | Sent automatically on handshake | Not used |
| Subprotocol | `Sec-WebSocket-Protocol` header | Not used |

This project passes the JWT token as a query parameter. The server verifies it on connection and maps the socket to a user ID.

## Message Protocol

This project uses JSON messages with a `type` field for routing:

```json
{ "type": "input", "input": { "up": true, "down": false } }
{ "type": "game_state", "state": { "ball": {...}, "paddles": {...} } }
{ "type": "send_message", "receiverId": 5, "content": "Hello" }
```

The `type` field acts as a message discriminator — the handler dispatches to different functions based on its value.

## Connection Management

### Reconnection

Browser WebSocket does not reconnect automatically. This project implements client-side reconnection:

```
Disconnect detected
    → Wait (attempt × 1000ms)
    → Reconnect
    → If success: reset attempt counter
    → If fail after 5 attempts: give up
```

### Heartbeat / Keep-Alive

The `ws` library handles WebSocket-level ping/pong automatically. Nginx's `proxy_read_timeout 86400` prevents proxy-level timeouts.

### One Connection Per User

For chat, the server enforces one WebSocket per user. If a user opens a second tab, the first connection is closed with code `4002`.

## Performance Considerations

| Factor | Value in this project |
|--------|----------------------|
| State broadcast rate | 60 messages/second per game room |
| Message size | ~500 bytes per game state |
| Connections per room | 2 (1v1) or 4 (4-player) |
| Input messages | ~10/second per player (on key changes) |

At 60fps with 500-byte messages, each active game uses ~30 KB/s of bandwidth per client. This is well within typical network capacity.

## Comparison with HTTP for Game State

```
HTTP polling at 60fps:
  60 requests/sec × (request overhead + response) ≈ 60 × ~1KB = 60 KB/s
  Plus: TCP handshake overhead, header overhead, connection limits

WebSocket at 60fps:
  60 frames/sec × ~500 bytes = 30 KB/s
  Plus: single persistent connection, minimal frame overhead
```

WebSocket uses roughly half the bandwidth and avoids repeated connection setup.

## Related Documentation

- [Architecture](../project/architecture.md) — system diagram with WebSocket
- [Remote Multiplayer](../project/remote-multiplayer.md) — game WebSocket protocol
- [Live Chat](../project/live-chat.md) — chat WebSocket protocol
- [Backend API](../project/backend-api.md) — all WebSocket message types
- [Nginx](./nginx.md) — WebSocket proxy configuration

## Further Reading

- [RFC 6455 — The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [MDN — WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [ws library documentation](https://github.com/websockets/ws)
- [Fastify WebSocket plugin](https://github.com/fastify/fastify-websocket)
