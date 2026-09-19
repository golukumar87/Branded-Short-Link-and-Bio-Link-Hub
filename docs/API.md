# API Documentation

Base URL in development: `http://localhost:5000`

All protected endpoints use httpOnly cookies set by auth routes. For API clients, include credentials/cookies.

## Auth

### `POST /api/auth/signup`

Creates an owner account and default bio profile.

```json
{
  "name": "Ravish Kumar",
  "email": "ravish@example.com",
  "username": "ravish",
  "password": "Password123"
}
```

Returns the user plus a simulated `verificationToken`.

### `POST /api/auth/login`

```json
{
  "email": "ravish@example.com",
  "password": "Password123"
}
```

Sets `accessToken` and `refreshToken` httpOnly cookies.

### `POST /api/auth/refresh`

Rotates access and refresh tokens.

### `POST /api/auth/logout`

Clears auth cookies and invalidates the stored refresh token.

### `POST /api/auth/verify-email`

```json
{
  "token": "token-from-signup"
}
```

### `POST /api/auth/forgot-password`

```json
{
  "email": "ravish@example.com"
}
```

Returns a simulated reset token.

### `POST /api/auth/reset-password`

```json
{
  "token": "reset-token",
  "password": "NewPassword123"
}
```

### `GET /api/auth/me`

Returns the current user.

## Links

### `GET /api/links?search=&page=1&limit=10`

Returns the authenticated user's links with click counts and generated short URLs.

### `POST /api/links`

Creates a short link.

```json
{
  "title": "Launch Campaign",
  "destinationUrl": "https://example.com",
  "vanitySlug": "launch",
  "tag": "Marketing"
}
```

If `vanitySlug` is omitted, a unique 6-character alphanumeric code is automatically generated.

### `PUT /api/links/:id`

Updates an existing short link's destination URL, custom slug, title, or category tag.

```json
{
  "title": "Summer Campaign Updated",
  "destinationUrl": "https://example.com/summer-updated",
  "vanitySlug": "summer-deals",
  "tag": "Marketing"
}
```

### `DELETE /api/links/:id`

Soft-deletes a link from the user's library (`archived: true`). Deactivated links return a styled 404 page on redirect.

### `GET /api/links/:id/qr`

Returns a QR code data URL (PNG) for the branded short link.

### `GET /api/links/analytics/summary`

Optional query parameter: `?linkId=:id` to filter analytics telemetry for a specific short link. Omit to retrieve aggregated stats across all active links.

Returns:

```json
{
  "totalClicks": 36,
  "clicksOverTime": [{ "date": "2026-09-18", "clicks": 4 }],
  "topReferrers": [{ "referrer": "Direct", "clicks": 9 }],
  "deviceDistribution": [{ "device": "Desktop", "clicks": 12 }]
}
```

## Redirect

### `GET /r/:shortCode`

Looks up the short code with indexed lookup, logs click telemetry asynchronously (device type: Mobile, Desktop, Tablet; SHA-256 IP hash; HTTP referrer; timestamp), and returns `302 Found` redirect to the destination URL.

## Bio

### `GET /api/bio/me`

Returns authenticated user's bio profile.

### `PUT /api/bio/me`

```json
{
  "avatar": "https://example.com/avatar.jpg",
  "displayName": "Ravish Kumar",
  "bio": "Full-stack developer building practical SaaS products.",
  "theme": "cyber-neon",
  "socialLinks": [
    { "label": "Portfolio", "url": "https://ravish.dev" },
    { "label": "GitHub", "url": "https://github.com/ravishkumar" }
  ]
}
```

Themes: `minimal-light`, `dark-slate`, `gradient`, `cyber-neon`.

### `GET /api/bio/public/:username`

Public endpoint used by `/bio/:username` mobile-responsive page.

