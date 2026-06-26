# Live Chat

## Overview

Real-time direct messaging between authenticated users. Built on WebSocket for instant delivery and REST API for message history. Includes user blocking, game invitations, and tournament notifications.

**Frontend**: `frontend/src/pages/Chat.ts`
**Backend WebSocket**: `backend/src/websocket/chat.socket.ts`
**Backend Service**: `backend/src/services/chat.service.ts`
**Backend REST**: `backend/src/routes/chat.routes.ts`

## Architecture

```
Browser A                     Backend                      Browser B
    │                            │                             │
    │── ws://host/ws/chat ──────►│◄──── ws://host/ws/chat ─────│
    │                            │                             │
    │── send_message ───────────►│                             │
    │                            │── save to SQLite            │
    │                            │── new_message ─────────────►│
    │◄── new_message ────────────│                             │
```

Messages are persisted in `chat_messages` table and delivered in real-time via WebSocket to both sender and receiver.

## Connection

Chat WebSocket requires JWT authentication:

```
wss://localhost/ws/chat?token=<JWT>
```

On connection:
1. Token verified via `AuthService.verifyToken()`
2. Previous connection for same user closed (one connection per user)
3. All online users notified of new user's online status
4. Client receives list of currently online users and unread count

## Direct Messages

### Sending

Client sends:
```json
{ "type": "send_message", "receiverId": 5, "content": "Hello!" }
```

Server:
1. Validates content is non-empty
2. Checks neither user has blocked the other
3. Saves message to `chat_messages` table
4. Sends `new_message` to both sender and receiver

### History

Client sends:
```json
{ "type": "get_messages", "userId": 5, "limit": 50, "offset": 0 }
```

Server returns messages in chronological order and marks incoming messages as read.

Also available via REST: `GET /api/chat/messages/:userId`

### Conversations

Client sends:
```json
{ "type": "get_conversations" }
```

Server returns a list of users the client has exchanged messages with, enriched with:
- Last message text and timestamp
- Unread message count
- Online status

Also available via REST: `GET /api/chat/conversations`

### Read Receipts

Client sends:
```json
{ "type": "mark_read", "userId": 5 }
```

Marks all messages from that user as read. Unread badges update accordingly.

## User Blocking

### Block

```json
{ "type": "block_user", "userId": 5 }
```

Blocked users cannot send messages in either direction. The block is stored in `blocked_users` table with a unique constraint.

### Unblock

```json
{ "type": "unblock_user", "userId": 5 }
```

### Blocked List

```json
{ "type": "get_blocked" }
```

Also available via REST:
- `POST /api/chat/block/:userId` — block
- `DELETE /api/chat/block/:userId` — unblock
- `GET /api/chat/blocked` — list

## Game Invitations

Client sends:
```json
{ "type": "game_invite", "receiverId": 5, "roomId": "game_123_abc" }
```

Server saves a message with `type: 'game_invite'` and the `game_room_id`. The receiver sees a "Join Game" link that navigates to `/game?mode=remote&room=<roomId>`.

Invites are blocked if either user has blocked the other.

## Online Status

Online status is derived from WebSocket connection lifecycle:

- **Online**: user has an active `/ws/chat` connection
- **Offline**: connection closed (disconnect, tab close, network loss)

Events broadcast to all connected clients:

| Event | When |
|-------|------|
| `user_online` | User connects to chat WebSocket |
| `user_offline` | User's WebSocket closes |

Online indicators appear as green/gray dots next to usernames in the conversation list.

## Tournament Notifications

Backend can push tournament alerts to specific users:

```typescript
sendTournamentNotification(userId, 'Summer Cup', 'Your match starts now!')
```

The client displays these as toast notifications in the top-right corner, auto-dismissing after 5 seconds.

## Database Tables

### chat_messages

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| sender_id | INTEGER FK | Required |
| receiver_id | INTEGER FK | Required |
| content | TEXT | Required |
| type | TEXT | `text`, `game_invite`, `tournament_notification` |
| game_room_id | TEXT | For game invites |
| read | INTEGER | 0 = unread, 1 = read |
| created_at | DATETIME | Default CURRENT_TIMESTAMP |

### blocked_users

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| blocker_id | INTEGER FK | |
| blocked_id | INTEGER FK | |
| created_at | DATETIME | |

Unique constraint on `(blocker_id, blocked_id)`.

Tables are created at backend startup by `ChatService.initialize()`.

## Frontend UI

### Layout

Split-panel design:
- **Left panel** (320px): conversation list with search bar
- **Right panel**: message area with header, messages, and input

### Conversation List

Each conversation shows:
- User avatar (first letter fallback)
- Display name
- Online indicator dot (green/gray)
- Last message preview (truncated)
- Unread count badge

### Message Area

Header shows:
- User info with online status
- "Invite to Game" button
- "Block" / "Unblock" toggle

Messages display in chat bubbles:
- Own messages: blue, right-aligned
- Other's messages: gray, left-aligned
- Timestamps below each message
- Game invite messages show a "Join Game" link
- Auto-scroll to bottom on new messages

### User Search

Search bar at the top of conversation list. Queries `GET /api/users/search?q=...` with 300ms debounce. Clicking a result opens (or creates) the conversation.

## Security

- Messages are HTML-escaped before rendering (XSS prevention)
- Blocked users cannot exchange messages in either direction
- WebSocket requires valid JWT — unauthenticated connections are rejected (code 4001)
- Only one WebSocket connection per user (previous connection closed on new login)
