# Authentication

## Registration

**Endpoint**: `POST /api/auth/register`

**Body**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "displayName": "string (optional)"
}
```

**Validation**:
- All of username, email, password are required
- Email must match standard format
- Password minimum 6 characters
- Username and email must be unique

**On success** (201):
- User record created in SQLite
- Password hashed with bcrypt (10 salt rounds)
- JWT access token (15 min) and refresh token (7 days) returned
- Password hash never included in response

## Login

**Endpoint**: `POST /api/auth/login`

**Body**:
```json
{
  "usernameOrEmail": "string",
  "password": "string"
}
```

Accepts either username or email. Returns user (without password) and token pair on success. Returns 401 on invalid credentials.

## Current User

**Endpoint**: `GET /api/auth/me`

Requires `Authorization: Bearer <accessToken>` header. Returns the authenticated user object.

## JWT Tokens

| Token | Expiry | Usage |
|-------|--------|-------|
| Access | 15 minutes | API requests via `Authorization` header |
| Refresh | 7 days | Issued but refresh endpoint not yet implemented |

Payload: `{ id, username, email }`

Secret: `JWT_SECRET` environment variable.

## Frontend Token Storage

`AuthService` stores tokens and user in `localStorage`:

- `transcendence_accessToken`
- `transcendence_refreshToken`
- `transcendence_user`

Protected pages check `AuthService.isAuthenticated()` and redirect to `/login` if needed.

## OAuth 2.0

Supported providers: **Google**, **GitHub**.

### Flow

```
1. User clicks "Google" or "GitHub" on login/register page
2. Browser → GET /api/auth/oauth/:provider/authorize
3. Backend redirects to provider login
4. Provider redirects back → GET /api/auth/oauth/:provider/callback?code=...
5. Backend exchanges code for access token
6. Backend fetches user info from provider
7. If email not found → create new user (no password)
8. If email exists → use existing user, update avatar if missing
9. Backend generates JWT and redirects to:
   /auth/success?token=...&refresh=...
10. Frontend /auth/callback stores tokens and redirects to home
```

### Configuration

Set in `.env`:

```
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...
OAUTH_GITHUB_CLIENT_ID=...
OAUTH_GITHUB_CLIENT_SECRET=...
```

Without credentials, the authorize endpoint returns 500 (`OAuth not configured`).

### Username Collision

If an OAuth user's derived username already exists, the backend appends a numeric suffix (`user1`, `user2`, …).

## Security Notes

- Passwords never stored in plain text
- SQL queries use prepared statements
- OAuth users have `password_hash = NULL` in the database
- HTTPS required in production (self-signed cert for local dev)
