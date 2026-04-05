# Auth Service Summary for Review

## 1. What This Service Does

The auth service is responsible for:

- signup
- login
- issuing JWT tokens
- protecting routes with token verification
- protecting routes by role
- reading/writing cached auth/profile data in Redis
- connecting the application to MongoDB

It is the identity and access-control layer of the system. Every other service depends on it indirectly because the user object and role come from here.

---

## 2. End-to-End Auth Data Flow

### Signup flow

1. Frontend sends `name`, `email`, `password`, and optional `role`.
2. Request reaches the gateway.
3. Gateway forwards it to the auth service.
4. `signup` checks whether the email already exists.
5. Password is hashed using bcrypt.
6. A new user is saved in MongoDB.
7. JWT token is created with `id` and `role`.
8. Token and user info are returned to frontend.
9. Frontend stores token/user in localStorage and routes to the correct dashboard.

### Login flow

1. Frontend sends `email` and `password`.
2. Request reaches auth service.
3. Auth service fetches the user from MongoDB.
4. Password is compared with bcrypt.
5. JWT token is created if password matches.
6. Token and user info are returned.
7. Frontend stores token/user and continues to dashboard.

### Protected route flow

1. Frontend includes `Authorization: Bearer <token>`.
2. `authMiddleware` verifies the token with `JWT_SECRET`.
3. Decoded payload is placed in `req.user`.
4. Route handler uses `req.user.id` and `req.user.role`.
5. Optional `roleMiddleware` checks whether the role is allowed.
6. If allowed, the response is sent.

### Cache flow

The auth service also uses Redis:

- `/me` caches the profile payload
- `/verify-token` caches decoded token data
- cache keys are cleared when role changes

---

## 3. Important Files and What They Do

### App bootstrap

- [auth-service/src/app.js](auth-service/src/app.js)
- [auth-service/src/server.js](auth-service/src/server.js)

### Routing layer

- [auth-service/src/routes/auth.routes.js](auth-service/src/routes/auth.routes.js)

### Business logic

- [auth-service/src/controllers/auth.controller.js](auth-service/src/controllers/auth.controller.js)

### Data model

- [auth-service/src/models/User.js](auth-service/src/models/User.js)

### Security middleware

- [auth-service/src/middleware/authMiddleware.js](auth-service/src/middleware/authMiddleware.js)
- [auth-service/src/middleware/roleMiddleware.js](auth-service/src/middleware/roleMiddleware.js)

### Infrastructure

- [auth-service/src/config/db.js](auth-service/src/config/db.js)
- [auth-service/src/config/redis.js](auth-service/src/config/redis.js)
- [auth-service/src/utils/logger.js](auth-service/src/utils/logger.js)

---

## 4. Startup and Server Boot

### File: [auth-service/src/server.js](auth-service/src/server.js)

This file starts the auth service.

What happens here:

- loads environment variables
- imports the Express app from `app.js`
- imports the MongoDB connection function
- connects to MongoDB
- starts listening on `PORT` or `5001`
- logs the service start message

This is the entry point for the auth service process.

### File: [auth-service/src/app.js](auth-service/src/app.js)

This is the Express app setup.

Important parts:

- `express.json()` and `express.urlencoded()` parse request bodies
- `cors()` enables cross-origin requests from the frontend
- `express-rate-limit` protects against too many requests
- Redis is initialized by requiring `./config/redis`
- `/health` and `/api/auth/health` endpoints are exposed
- all auth routes are mounted under `/api/auth`

This means endpoints like `/signup` and `/login` become `/api/auth/signup` and `/api/auth/login`.

---

## 5. Auth Routes

### File: [auth-service/src/routes/auth.routes.js](auth-service/src/routes/auth.routes.js)

This file defines the HTTP endpoints for auth.

### Public endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`

### Protected endpoints

- `GET /api/auth/me`
- `GET /api/auth/verify-token`
- `GET /api/auth/admin`
- `GET /api/auth/staff`

### Test/admin utility endpoint

- `POST /api/auth/update-role/:email/:newRole`

### How routes are protected

- `authMiddleware` validates the JWT
- `roleMiddleware` checks whether the role is allowed

### Why this file matters

This file is the access layer of the auth service. It decides which requests are public and which are protected.

---

## 6. Auth Controller Logic

### File: [auth-service/src/controllers/auth.controller.js](auth-service/src/controllers/auth.controller.js)

This is the core business logic for authentication.

### `signup`

Important logic:

- reads `name`, `email`, `password`, `role`
- validates role against `student`, `staff`, `admin`
- defaults role to `student` if invalid or missing
- checks whether the user already exists
- hashes password with bcrypt
- creates the user in MongoDB
- signs JWT with `{ id, role }`
- returns token and sanitized user data

### `login`

Important logic:

- reads `email` and `password`
- finds user by email
- compares password with bcrypt
- creates JWT if password matches
- returns token and user profile

### Why the controller is important

This is where the actual auth rules live:

- duplicate prevention
- password hashing
- token creation
- role selection

If your teacher asks where auth logic is implemented, this is the main answer.

---

## 7. User Model

### File: [auth-service/src/models/User.js](auth-service/src/models/User.js)

The user schema stores:

- `name`
- `email`
- `password`
- `role`

### Schema details

- `email` is unique
- `role` is restricted to `student`, `staff`, `admin`
- timestamps are enabled

### Why it matters

This is the persistent record that the auth service uses for all future login and access control decisions.

---

## 8. Authentication Middleware

### File: [auth-service/src/middleware/authMiddleware.js](auth-service/src/middleware/authMiddleware.js)

This middleware protects routes with JWT verification.

### What it does

1. Reads the `Authorization` header.
2. Checks that a token is present.
3. Handles both plain token and `Bearer <token>` format.
4. Verifies token using `JWT_SECRET`.
5. Stores decoded payload in `req.user`.
6. Calls `next()` if valid.

### Why it matters

Every protected endpoint depends on this middleware. Without it, the service cannot trust the caller.

### Typical result

If token is missing or invalid, the request gets:

- `401 No token`
- `401 Invalid token`

---

## 9. Role Middleware

### File: [auth-service/src/middleware/roleMiddleware.js](auth-service/src/middleware/roleMiddleware.js)

This middleware checks whether the current user role is allowed.

### What it does

1. Reads `req.user.role`.
2. Compares it with the allowed roles passed to the middleware.
3. Blocks request if role is not allowed.
4. Calls `next()` if role is valid.

### Examples in the routes

- admin route: only `admin`
- staff route: `staff` or `admin`

### Why it matters

This is how the app enforces role-based access control.

---

## 10. MongoDB Connection

### File: [auth-service/src/config/db.js](auth-service/src/config/db.js)

This file connects the auth service to MongoDB.

### What it does

- uses `mongoose.connect(process.env.MONGO_URI)`
- logs success
- exits the process if DB connection fails

### Why it matters

Nothing in the auth service works without DB connectivity because users are stored in MongoDB.

---

## 11. Redis Caching

### File: [auth-service/src/config/redis.js](auth-service/src/config/redis.js)

This file creates and manages the Redis client.

### Main functions

- `setCache(key, value, ttl)`
- `getCache(key)`
- `deleteCache(key)`
- `deleteMultipleCache(keys)`

### Used in auth routes

The auth routes cache:

- profile data in `/me`
- token verification data in `/verify-token`

### Cache invalidation

When role is updated, related auth cache entries are deleted so stale data is not reused.

### Why it matters

This improves repeated-read performance and reduces unnecessary DB reads.

---

## 12. Logging

### File: [auth-service/src/utils/logger.js](auth-service/src/utils/logger.js)

This file uses Winston for structured logs.

### Logger setup

- console output with colors
- `logs/app.log`
- `logs/error.log`

### Why it matters

This is useful for debugging login/sign-up problems and server startup issues.

---

## 13. Important API Endpoints

### Public

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/health`
- `GET /health`

### Protected

- `GET /api/auth/me`
- `GET /api/auth/verify-token`
- `GET /api/auth/admin`
- `GET /api/auth/staff`

### Utility/test

- `POST /api/auth/update-role/:email/:newRole`

---

## 14. Exact Code Importance Breakdown

### `signup` and `login`

These are the most important functions because they:

- create tokens
- authenticate users
- initialize the role data used across the whole app

### `authMiddleware`

This is critical because it protects all private routes.

### `roleMiddleware`

This is critical because it separates admin, staff, and student access.

### `User` schema

This is the identity record of the system.

### Redis helper functions

These are important because they improve speed and reduce repeated database work.

### DB connection and server bootstrap

These are important because they make the service actually run.

---

## 15. How Auth Connects to the Rest of the System

The auth service is not isolated. It supports the whole project by providing:

- user identity
- role information
- secure token access

Other services rely on the token and role generated here:

- menu-service uses the user token to know who is requesting menus or notifications
- response-service uses the user token to know which student is submitting a response or message
- staff/admin pages rely on the role to show the correct dashboard

---

## 16. What to Tell the Teacher About Auth Service

You can explain it like this:

"The auth service is the security and identity layer of the system. It handles signup, login, JWT creation, token validation, and role-based route protection. The `signup` and `login` logic is in the controller, the `User` schema stores the account data, `authMiddleware` validates tokens, and `roleMiddleware` controls access to admin and staff routes. Redis is used to cache profile and token-check data, and MongoDB stores the persistent user record."

---

## 17. Review Notes You Can Memorize

- Auth service runs on port 5001 by default.
- JWT payload contains only `id` and `role`.
- Passwords are stored hashed using bcrypt.
- Role defaults to `student` unless explicitly valid.
- Protected routes use `authMiddleware` first, then `roleMiddleware` if role restrictions are needed.
- Redis is used for temporary auth/profile caching.
- MongoDB is used for persistent user storage.

---

## 18. Best Files to Open for Auth Review

- [auth-service/src/server.js](auth-service/src/server.js)
- [auth-service/src/app.js](auth-service/src/app.js)
- [auth-service/src/routes/auth.routes.js](auth-service/src/routes/auth.routes.js)
- [auth-service/src/controllers/auth.controller.js](auth-service/src/controllers/auth.controller.js)
- [auth-service/src/models/User.js](auth-service/src/models/User.js)
- [auth-service/src/middleware/authMiddleware.js](auth-service/src/middleware/authMiddleware.js)
- [auth-service/src/middleware/roleMiddleware.js](auth-service/src/middleware/roleMiddleware.js)
- [auth-service/src/config/db.js](auth-service/src/config/db.js)
- [auth-service/src/config/redis.js](auth-service/src/config/redis.js)
- [auth-service/src/utils/logger.js](auth-service/src/utils/logger.js)

---

## 19. One-Line Auth Summary

The auth service handles signup, login, JWT token generation, token verification, role-based authorization, MongoDB user storage, and Redis caching, and it is the security foundation for the whole Smart Mess System.
