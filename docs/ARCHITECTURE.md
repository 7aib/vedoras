# Vedoras — Architecture & Folder Structure

Vedoras is a production-grade classifieds marketplace (OLX clone) built with the
MERN stack. This document defines the high-level architecture and the folder
structure that all milestones follow.

## 1. High-Level Architecture

```
                        ┌──────────────────────┐
                        │      React SPA       │
                        │   (client/ · Vite)   │
                        │  RTK Query + Axios   │
                        └──────────┬───────────┘
                                   │ REST (JSON) + Socket.io
                        ┌──────────▼───────────┐
                        │   Express API (REST) │
                        │  (server/ · Node.js) │
                        │  JWT auth, validation│
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐      ┌───────────────────┐
                        │       MongoDB        │      │ Cloudinary        │
                        │   (Mongoose ODM)     │◄────►│ (image storage)   │
                        └──────────────────────┘      └───────────────────┘
```

- **Client**: Single-page React application served by Vite (dev) / static build (prod).
  Talks to the API over JSON REST and to the chat feature over Socket.io.
- **Server**: Stateless Express REST API, versioned under `/api/v1`. Owns all
  business logic, validation, auth, and persistence. Exposes Socket.io for
  real-time chat/notifications.
- **Database**: MongoDB. One document collection per domain (Users, Listings,
  Categories, Chats, Messages, Favorites, Reports, Notifications).
- **Media**: image upload (listings) via Cloudinary when configured, with a
  local `/uploads` fallback for development/tests. Added in M6.

### Architectural principles

- **Layered backend**: `routes → validators → controllers → services → models`.
  Controllers handle HTTP concerns only; services contain business logic;
  models define the schema/data layer. This keeps logic reusable and testable.
- **Standardized API contract**: every response is either
  `{ success, message, data }` or `{ success, message, errors }`.
- **Separation of concerns on the client**: `pages` orchestrate, `components`
  are reusable UI, `services` wrap HTTP, `store` holds global state,
  `hooks` encapsulate shared logic, `types` centralize TS contracts.
- **Security by default**: Helmet, CORS allow-list, rate limiting, JWT
  (short-lived access + refresh token), bcrypt hashing, input validation
  (Zod), Mongo injection & XSS protection.
- **Configuration via environment variables**: nothing secret is hardcoded;
  `.env.example` documents every variable.

## 2. Monorepo Layout

Two npm workspaces under a single root:

| Path       | Purpose                                            |
|------------|----------------------------------------------------|
| `client/`  | React + Vite frontend                              |
| `server/`  | Node.js + Express backend                          |
| `docs/`    | Architecture, API docs, runbooks                   |

## 3. Backend Folder Structure (`server/`)

```
server/
├── src/
│   ├── index.ts            # bootstrap: process safety, connect DB → start server
│   ├── app.ts              # Express app factory (middleware, routes)
│   ├── config/
│   │   ├── env.ts          # validated environment variables (Zod)
│   │   ├── database.ts     # Mongoose connection
│   │   ├── logger.ts       # Winston logger
│   │   └── cloudinary.ts   # Cloudinary config (M6)
│   ├── routes/             # versioned route definitions
│   │   └── v1/             # /api/v1 router aggregator + domain routes
│   ├── controllers/        # request/response handling (thin)
│   ├── services/           # business logic (thick)
│   ├── models/             # Mongoose schemas/models
│   ├── middleware/         # requestId, httpLog(morgan), rateLimit, auth, authorize, validate, error, notFound, upload
│   ├── validators/         # Zod schemas shared with request validation
│   ├── socket/             # Socket.io setup & event handlers (M9)
│   ├── utils/              # ApiError, ApiResponse, asyncHandler, constants, appInfo
│   ├── types/              # shared TypeScript types (express augmentation, env)
│   ├── uploads/            # temporary multer storage (gitignored)
│   └── ...
├── tests/                  # unit + integration tests (vitest/supertest)
├── logs/                   # winston output (gitignored)
├── .env.example
├── .env                    # local only, gitignored
├── tsconfig.json
├── eslint.config.js
├── prettier.config.js
└── package.json
```

## 4. Frontend Folder Structure (`client/`)

```
client/
├── public/
├── src/
│   ├── main.tsx            # React root + providers
│   ├── App.tsx             # route definitions
│   ├── assets/             # static assets, fonts
│   ├── components/
│   │   ├── ui/             # primitives: Button, Input, Modal, Skeleton, Badge...
│   │   ├── layout/         # Navbar, Footer, Sidebar
│   │   ├── listing/        # ListingCard, ListingForm, filters
│   │   ├── chat/           # ChatWindow, MessageBubble, TypingIndicator
│   │   └── auth/           # AuthGuard, RoleGuard, OAuthButton
│   ├── pages/
│   │   ├── auth/           # Login, Register, ForgotPassword, ResetPassword, VerifyEmail
│   │   ├── listings/       # ListingList, ListingDetail, CreateListing, EditListing
│   │   ├── user/           # Profile, EditProfile, MyListings, Favorites, Reviews
│   │   ├── chat/           # Inbox, ChatRoom
│   │   ├── admin/          # Dashboard, ManageUsers, ManageListings, Reports
│   │   └── misc/           # Home, NotFound, About
│   ├── hooks/              # useAuth, useDebounce, useDarkMode, useSocket, useInfiniteScroll
│   ├── services/           # axios instance, http wrapper
│   ├── store/
│   │   ├── slices/         # authSlice, uiSlice, listingSlice
│   │   └── api/            # RTK Query API definitions per domain
│   ├── routes/             # route constants + route components
│   ├── layouts/            # PublicLayout, AuthLayout, DashboardLayout
│   ├── utils/              # formatters, validators, cn()
│   ├── types/              # API types + RTK-Query injected types
│   └── index.css           # Tailwind v4 entry + theme tokens
├── .env.example
├── index.html
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── prettier.config.js
└── package.json
```

## 5. Domain / Data Model (MongoDB collections)

| Collection     | Purpose                                        | Added in |
|----------------|------------------------------------------------|----------|
| `users`        | Accounts, auth tokens, profile, role           | M3       |
| `categories`   | Listing categories tree                        | M6       |
| `listings`     | Ads: title, description, price, images, meta   | M5       |
| `chats`        | Conversations between buyer & seller           | M9       |
| `messages`     | Individual chat messages + read receipts       | M9       |
| `favorites`    | Saved listings per user                        | M8       |
| `reports`      | User-reported listings/users                   | M11      |
| `notifications`| In-app notifications                          | M10      |

## 6. API Versioning & Contract

- All routes are prefixed with `/api/v1` (server-side versioned).
- Standard success payload:
  ```json
  { "success": true, "message": "OK", "data": {} }
  ```
- Standard error payload:
  ```json
  { "success": false, "message": "...", "errors": [], "requestId": "..." }
  ```
- Every response carries an `X-Request-Id` header (correlation id, also readable
  from a client-provided `x-request-id` header).
- HTTP status codes follow REST conventions (200/201/204/400/401/403/404/409/413/429/500).

## 7. Milestone Roadmap

| # | Milestone                          | Status |
|---|------------------------------------|--------|
| 1 | Project planning & scaffolding     | ✅ done |
| 2 | Backend foundation                 | ✅ done |
| 3 | Backend auth (JWT, refresh)        | ✅ done |
| 4 | Frontend auth                      | ✅ done |
| 5 | Listings CRUD                      | ✅ done |
| 6 | Image upload (Cloudinary + fallback) & categories tree | ✅ done |
| 7 | Search & filters                   | planned |
| 8 | Favorites                          | planned |
| 9 | Chat (Socket.io)                   | planned |
| 10| Notifications                      | planned |
| 11| Admin dashboard                    | planned |
| 12| Performance optimization           | planned |
| - | Final: E2E, docs, production       | planned |

## 8. Future-Readiness

The layered architecture keeps the door open for: Stripe payments, premium ads,
admin analytics, AI description generation, recommendations, Elasticsearch, and
push notifications — each slots into an existing layer without rewrites.
