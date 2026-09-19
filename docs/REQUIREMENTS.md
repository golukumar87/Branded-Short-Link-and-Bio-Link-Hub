# Requirement Traceability

This document maps the Project 04 PDF requirements to implementation files.

## Universal Security and Architecture

| Requirement | Implementation |
| --- | --- |
| Short-lived JWT access token, 15 minutes | `server/utils/tokens.js` |
| Long-lived refresh token, 7 days | `server/utils/tokens.js`, `server/routes/auth.js` |
| httpOnly cookies | `server/utils/tokens.js` |
| Signup with email verification simulation | `POST /api/auth/signup`, `POST /api/auth/verify-email` |
| Login with token rotation | `POST /api/auth/login`, `POST /api/auth/refresh` |
| Forgot/reset password | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Coss-style UI primitives | `client/src/components/ui/*` |

## A. High-Speed URL Redirection Engine

| Requirement | Implementation |
| --- | --- |
| Auto-generate unique 6 character short codes | `server/routes/links.js`, `generateShortCode()` |
| Custom vanity slugs | `POST /api/links` |
| Duplicate alias collision detection | `POST /api/links` checks `Link.exists()` |
| Valid URL format enforcement | `server/utils/validators.js` |
| `GET /r/:shortCode` returns 302 | `server/server.js` |
| Async click event logging | `ClickEvent.create(...).catch(...)` in redirect route |

## B. Click Analytics and Metrics Aggregation

| Requirement | Implementation |
| --- | --- |
| Timestamp | Mongoose timestamps in `ClickEvent` |
| HTTP referrer | `server/utils/clickMetadata.js` |
| Device type | `ua-parser-js` in `server/utils/clickMetadata.js` |
| IP hash | SHA-256 hash in `server/utils/clickMetadata.js` |
| Total clicks over time | `GET /api/links/analytics/summary` |
| Top referrers | `GET /api/links/analytics/summary` |
| Device distribution | `GET /api/links/analytics/summary` |

## C. Link Library Studio

| Requirement | Implementation |
| --- | --- |
| Management table | `LinkTable` in `client/src/main.jsx` |
| Destination URL and short link | `GET /api/links` |
| One-click copy | `navigator.clipboard` in `LinkTable` |
| QR generation | `GET /api/links/:id/qr` |
| Delete action | `DELETE /api/links/:id` |
| Search and pagination | `GET /api/links?search=&page=&limit=` |

## D. Link-in-Bio Hub

| Requirement | Implementation |
| --- | --- |
| Avatar | `BioProfile.avatar`, `BioBuilder` |
| Display name | `BioProfile.displayName`, `BioBuilder` |
| Bio | `BioProfile.bio`, `BioBuilder` |
| Social link buttons | `BioProfile.socialLinks`, `BioBuilder` |
| Theme selector | `minimal-light`, `dark-slate`, `gradient` |
| Public mobile page | `/bio/:username`, `PublicBio` |

## E. Rate Limiting and Security

| Requirement | Implementation |
| --- | --- |
| Rate limiting on creation routes | `creationLimiter` |
| Rate limiting on redirect routes | `redirectLimiter` |
| Route protection | `requireAuth` middleware |
| Indexed slug lookups | `Link.shortCode` index |
| Click telemetry schema | `server/models/ClickEvent.js` |
| Analytics aggregations | `server/routes/links.js` |

## Repository Deliverables

| Requirement | Implementation |
| --- | --- |
| Clean GitHub repo | Project files structured by server, client and docs |
| `.env.example` | `.env.example` |
| API documentation | `docs/API.md` |
| Setup instructions | `README.md` |
