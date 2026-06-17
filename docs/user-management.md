# User Management

## Profile

Authenticated users can view and edit their profile at `/profile`.

### Display Name

**Endpoint**: `PUT /api/users/profile`

```json
{ "displayName": "New Name" }
```

Updates `display_name` in the database. Defaults to username on registration if not provided.

### Avatar

**Endpoint**: `POST /api/users/profile/avatar`

Multipart form upload (`file` field). Accepted: image files up to 5 MB.

- Saved to `backend/uploads/avatars/<userId>-<timestamp>.<ext>`
- Served at `/uploads/avatars/<filename>` via Fastify static plugin
- If no avatar uploaded, frontend shows first letter of display name

## Friends

Friendships stored in `friendships` table (created at runtime by `FriendsService.initialize()`).

| Status | Meaning |
|--------|---------|
| `pending` | Request sent, awaiting acceptance |
| `accepted` | Both users are friends |
| `blocked` | Reserved, not used in UI yet |

### Send Request

`POST /api/users/friends/request` — body: `{ "userId": 2 }`

- Cannot request yourself
- Duplicate requests rejected

### Accept Request

`POST /api/users/friends/accept/:id` — only the recipient (`user2_id`) can accept.

### List Friends

`GET /api/users/friends/list` — returns accepted friends with username, display name, avatar.

### User Search

`GET /api/users/search?q=query` — case-insensitive search on username and display name, max 10 results.

> Online status for friends is not implemented yet.

## Statistics

**Endpoint**: `GET /api/users/:id/stats`

Returns:

```json
{
  "stats": {
    "wins": 0,
    "losses": 0,
    "totalGames": 0,
    "winRate": 0,
    "matchHistory": []
  }
}
```

Calculated from `games` table where `status = 'completed'`:

- **Win**: `winner_id` matches the user
- **Loss**: user played but `winner_id` is someone else
- **Match history**: last 20 completed games with opponent usernames

> Local Pong games and client-side tournaments do not yet write to the `games` table, so stats stay at zero until games are persisted via the API.

## Frontend Profile Page

On load:

1. Redirect to `/login` if not authenticated
2. Fetch stats and friends list in parallel
3. Render avatar, display name editor, file upload, stats grid, friends list
4. Save button updates display name and/or uploads avatar
5. Logout clears tokens and redirects to home
