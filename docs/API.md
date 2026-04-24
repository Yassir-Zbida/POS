# API Documentation (V1)

Base URL: `http://localhost:3000/api`

Auth model:
- Access token: 15 minutes
- Refresh token: 100 days
- Send access token as `Authorization: Bearer <token>`
- Login security:
  - IP rate limit: 20 requests / 15 minutes
  - Account lockout: 5 failed attempts => 30 minutes lock

## Authentication

### POST `/auth/login`
Body:
```json
{ "email": "admin@saas-pos.local", "password": "StrongPass123" }
```
Response: access token + refresh token + user payload.

### POST `/auth/refresh`
Body:
```json
{ "refreshToken": "<token>" }
```
Response: rotated access/refresh token pair.

### POST `/auth/logout`
Body:
```json
{ "refreshToken": "<token>" }
```
Response:
```json
{ "success": true }
```

### GET `/auth/me`
Requires auth token.
Returns current user profile.

## Admin Routes

### GET `/admin/users`
List all users. Role required: `ADMIN`.

### PATCH `/admin/users/:id/status`
Role required: `ADMIN`.
Body:
```json
{ "status": "ACTIVE" }
```
Allowed values: `ACTIVE | BANNED | SUSPENDED`

### PATCH `/admin/managers/:id/subscription-status`
Role required: `ADMIN`.
Body:
```json
{ "status": "SUSPENDED" }
```
Allowed values: `ACTIVE | PAST_DUE | CANCELED | SUSPENDED`

### GET `/admin/audit-logs`
Role required: `ADMIN`.
Returns latest 200 logs.

## Manager Routes

### GET `/manager/cashiers`
Role required: `MANAGER`.
Lists cashiers attached to the manager.

### POST `/manager/cashiers`
Role required: `MANAGER`.
Body:
```json
{ "email": "cashier@shop.com", "name": "Cashier One", "password": "StrongPass123" }
```

### PATCH `/manager/cashiers/:id/status`
Role required: `MANAGER`.
Body:
```json
{ "status": "SUSPENDED" }
```
Allowed values: `ACTIVE | BANNED | SUSPENDED`

## Audit actions emitted
- `AUTH_LOGIN`
- `AUTH_LOGIN_FAILED`
- `USER_STATUS_UPDATED`
- `SUBSCRIPTION_STATUS_UPDATED`
- `CASHIER_CREATED`
- `CASHIER_STATUS_UPDATED`

## OpenAPI

- JSON document endpoint: `GET /api/docs/openapi`
- Swagger UI route: `/[locale]/docs` (ex. `/fr/docs`, `/en/docs`)
- Protection:
  - `development`: public for local work
  - non-development: requires `ADMIN` bearer token
