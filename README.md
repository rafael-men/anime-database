# Anime Database

A full-stack, "[Letterboxd](https://letterboxd.com) like" web application for tracking, reviewing, and organizing anime. Users can browse anime from the [AniList API](https://anilist.gitbook.io/anilist-apiv2-docs/overview/graphql/getting-started), build watchlists, write reviews, create custom lists, follow other users, and manage their profiles. An admin panel allows approval of adult content access.

## Features

### Authentication & Security

- Server-side session management via **Redis** with secure, httpOnly cookies
- **CSRF protection** on every mutating request (double-submit token pattern)
- **Rate limiting** globally (100 req/min) and per-route (login: 5/min, register: 10/min)
- **Helmet** security headers with `cross-origin` resource policy
- **CORS** restricted to configured frontend origin(s)
- Input validation and sanitization via `class-validator` + NestJS `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`
- Password hashing with **bcrypt**

### Anime Catalog (AniList)

- Browse and search anime directly from the AniList GraphQL API
- View detailed anime pages (synopsis, characters, stats, status)
- Character detail pages with kin count ("who considers this character their kin?")

### Profile & Social

- Public user profiles with username, bio, and avatar
- **Follow/unfollow** system with follower/following counts and lists
- View other users' profiles by ID
- Username availability check

### Favorites & Watchlist

- Add anime to personal favorites with a watch status (Watching, Completed, On Hold, Dropped, Planned)
- Remove anime from favorites
- Full watchlist per user with status management

### Reviews & Ratings

- Rate anime on a 0-10 scale with optional comments
- Mark reviews as containing **spoilers**
- View all reviews for a given anime
- Track rewatch status

### Groups (Custom Lists)

- Create, edit, and delete custom groups (named lists of anime)
- Add and remove anime items within groups with ordering and notes
- Public/private group visibility

### Avatar Upload

- Upload avatar images (JPEG, PNG, GIF, WebP)
- **Magic-byte validation** verifies actual file content matches declared MIME type (prevents extension spoofing)
- 2 MB file size limit, single file per upload
- Pluggable storage backends:
  - **Local filesystem** (default) - files stored with `0644` permissions, served via `/uploads/` static route
  - **AWS S3** (or compatible) - optional public URL for CDN, presigned URL fallback, configurable ACL

### Admin Panel (`/control`)

- Basic-auth-protected admin route
- View pending adult content access requests
- Approve or deny requests per user

## Tech Stack

| Layer    | Technology                                                        |
| -------- | ----------------------------------------------------------------- |
| Client   | Angular 21, TypeScript 5.9, Vitest, Tailwind CSS 4, Angular SSR  |
| Server   | NestJS 11, TypeScript 5.7, Jest, class-validator                 |
| Database | MySQL (via TypeORM, mysql2)                                       |
| Sessions | Redis (via ioredis)                                               |
| Storage  | Local AWS S3 (via @aws-sdk/client-s3)              |
| API Data | AniList GraphQL API (client-side calls)                           |

## Project Structure

```
anime-database/
├── client/                          # Angular frontend
│   └── src/
│       └── app/
│           ├── components/          # Page and UI components
│           │   ├── admin/           # Admin validation page
│           │   ├── anime-details/   # Anime detail view
│           │   ├── auth-page/       # Login & register
│           │   ├── character-details/
│           │   ├── characters-page/
│           │   ├── favourites-page/
│           │   ├── groups-component/
│           │   ├── home/
│           │   ├── profile/
│           │   ├── profile-menu/    # User settings
│           │   └── shared/          # Reusable UI components
│           ├── guards/              # Route guards (authGuard)
│           ├── app.routes.ts        # Client routes
│           └── app.routes.server.ts # SSR render modes
│
├── server/                          # NestJS backend
│   └── src/
│       ├── application/
│       │   ├── auth/                # Auth controller, guards, service
│       │   ├── controllers/         # REST controllers + DTOs
│       │   └── sessions/            # Redis session management
│       ├── data/
│       │   └── config/              # Database configuration
│       ├── domain/
│       │   └── models/              # TypeORM entity models
│       ├── storage/                 # File storage providers (local/S3)
│       ├── use-cases/               # Business logic services
│       │   ├── follow/
│       │   ├── group/
│       │   └── user/
│       ├── utils/                   # File validation, upload config
│       ├── app.module.ts            # Root module
│       └── main.ts                  # Bootstrap
│
├── LICENSE                          # Apache 2.0
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **npm** >= 10
- **MySQL** 8.x (or compatible)
- **Redis** 7.x

### 1. Clone the repository

```bash
git clone <repository-url>
cd anime-database
```

### 2. Set up the server

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=yourpassword
DB_NAME=animelog
DB_SYNC=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Session
SESSION_SECRET=a-strong-random-secret

# Frontend
FRONTEND_URL=http://localhost:4200

# Admin credentials (Basic Auth for /control)
ADMIN_USER=admin
ADMIN_PASSWORD=changeme

# Storage
STORAGE_DRIVER=local
UPLOADS_DIR=./uploads

# Rate limiting (optional, default 100)
RATE_LIMIT=100

# Port (optional, default 3000)
PORT=3000
```

Run database migrations and start the server:

```bash
# Development (with file watching)
npm run start:dev

# Production
npm run build
npm run start:prod
```

The server starts on **http://localhost:3000** by default.

### 3. Set up the client

```bash
cd client
npm install
```

Start the development server:

```bash
npm start
```

The client starts on **http://localhost:4200** and proxies API calls to the backend.

### S3 Storage (optional)

To use S3-compatible storage for avatars instead of the local filesystem, add these to the server `.env`:

```env
STORAGE_DRIVER=s3
S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Optional
S3_ENDPOINT=https://your-s3-endpoint.com   # For S3-compatible services (MinIO, R2, etc.)
S3_PUBLIC_URL=https://cdn.example.com       # Public URL base for served files
S3_FORCE_PATH_STYLE=true                     # Required for MinIO and some S3-compatible services
S3_ACL=public-read                           # Object ACL (if bucket policy doesn't enforce)
S3_URL_TTL_SECONDS=3600                      # Presigned URL expiry (when no public URL)
```

When `S3_PUBLIC_URL` is set, returned URLs use that as the base. Otherwise, presigned URLs are generated per request.

## Testing

### Server

```bash
cd server
npm test              # Run all tests
npm run test:cov      # With coverage
npm run test:e2e      # End-to-end tests
```

### Client

```bash
cd client
npx ng test --watch=false --no-progress
```

## API Reference

All endpoints (except auth) require an active session cookie. Mutating requests require a valid `X-CSRF-Token` header.

### Auth

| Method | Endpoint         | Description                  | Rate Limit |
| ------ | ---------------- | ---------------------------- | ---------- |
| POST   | `/auth/register` | Register a new account       | 10/min     |
| POST   | `/auth/login`    | Log in                       | 5/min      |
| GET    | `/auth/session`  | Get current session          | -          |
| POST   | `/auth/logout`   | Destroy session              | -          |

### Users

| Method | Endpoint                       | Description                        |
| ------ | ------------------------------ | ---------------------------------- |
| GET    | `/users/:id`                   | Get user profile by ID             |
| GET    | `/users/:id/check-username`    | Check username availability        |
| POST   | `/users/:id/profile`           | Update profile                     |
| POST   | `/users/:id/avatar`            | Upload avatar image                |
| POST   | `/users/:id/favorites`         | Add anime to favorites             |
| DELETE | `/users/:id/favorites/:animeId`| Remove anime from favorites        |
| GET    | `/users/:id/favorites`         | List user favorites                |
| POST   | `/users/:id/reviews`           | Create a review                    |
| GET    | `/users/:id/reviews`           | List user reviews                  |
| GET    | `/users/kin-count/:characterId`| Get kin count for a character      |

### Follows

| Method | Endpoint               | Description           |
| ------ | ---------------------- | --------------------- |
| POST   | `/follows/:id`         | Follow a user         |
| DELETE | `/follows/:id`         | Unfollow a user       |
| GET    | `/follows/:id/check`   | Check if following    |
| GET    | `/follows/:id/counts`  | Follower/following counts |
| GET    | `/follows/:id/followers` | List followers      |
| GET    | `/follows/:id/following` | List following      |

### Reviews

| Method | Endpoint                  | Description             |
| ------ | ------------------------- | ----------------------- |
| GET    | `/reviews/anime/:animeId` | Get all reviews for anime|

### Groups

| Method | Endpoint                | Description              |
| ------ | ----------------------- | ------------------------ |
| POST   | `/groups`               | Create a group           |
| GET    | `/groups/owner/:ownerId`| List groups by owner     |
| GET    | `/groups/:id`           | Get group by ID          |
| PATCH  | `/groups/:id`           | Update a group           |
| DELETE | `/groups/:id`           | Delete a group           |
| POST   | `/groups/:id/items`     | Add anime to group       |
| DELETE | `/groups/:id/items/:animeId` | Remove anime from group |

### Watchlist

| Method | Endpoint                      | Description              |
| ------ | ----------------------------- | ------------------------ |
| POST   | `/watchlist/:userId`          | Add anime to watchlist   |
| GET    | `/watchlist/:userId`          | Get user watchlist       |
| PATCH  | `/watchlist/:userId/:animeId` | Update watch status      |
| DELETE | `/watchlist/:userId/:animeId` | Remove from watchlist    |

### Admin

| Method | Endpoint                      | Description                    |
| ------ | ----------------------------- | ------------------------------ |
| GET    | `/control/users`              | List pending adult requests    |
| POST   | `/control/users/:id/approve`  | Approve adult content access   |
| POST   | `/control/users/:id/deny`     | Deny adult content access      |

## License

[Apache License 2.0](LICENSE)
