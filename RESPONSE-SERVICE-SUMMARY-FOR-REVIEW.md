# Response Service Summary for Review

## 1. What This Service Does

The response service is responsible for:

- storing student meal responses
- preventing duplicate submissions for the same date
- enforcing a response time window
- updating responses
- deleting responses
- exposing responses for calculation service consumption
- storing and serving student messages
- sending calculation-trigger messages to RabbitMQ
- caching response and message data in Redis

This service is the communication bridge between student actions and the calculation pipeline.

---

## 2. End-to-End Response Data Flow

### Meal response flow

1. Student selects a date and meal portions in the frontend.
2. Frontend sends a POST request to the gateway.
3. Gateway forwards the request to the response service.
4. `response.routes.js` validates role and time window.
5. The response is stored in MongoDB.
6. Redis cache entries related to that student and date are cleared.
7. A RabbitMQ message is pushed to `meal_queue`.
8. Calculation service consumer reads the message and runs ingredient calculations.
9. Updated calculation and waste data are shown later in admin dashboards.

### Update response flow

1. Student edits a previously submitted response.
2. Response service validates the update.
3. MongoDB record is changed.
4. Response-related caches are invalidated.
5. RabbitMQ receives an `UPDATE_RESPONSE` message.
6. Calculation service can recalculate totals.

### Delete response flow

1. Student deletes their response for a date.
2. Response service removes the record.
3. Cache is cleared.
4. RabbitMQ receives a `DELETE_RESPONSE` message.
5. Calculation service can update the date’s totals.

### Student message flow

1. Student writes a free-form message in the Messages tab.
2. Frontend sends the message to the response service.
3. The service stores it in MongoDB.
4. Student can fetch only their own messages.
5. Admin and staff can fetch all student messages.
6. Message caches are cleared when a new message is submitted.

### Get responses flow

1. Student or calculation service requests responses.
2. Redis is checked first.
3. If cached, data is returned immediately.
4. If not cached, MongoDB is queried.
5. Result is cached for the next request.

---

## 3. Important Files and What They Do

### App bootstrap

- [response-service/src/app.js](response-service/src/app.js)
- [response-service/src/server.js](response-service/src/server.js)

### Main route file

- [response-service/src/routes/response.routes.js](response-service/src/routes/response.routes.js)

### Data models

- [response-service/src/models/response.model.js](response-service/src/models/response.model.js)
- [response-service/src/models/studentMessage.model.js](response-service/src/models/studentMessage.model.js)

### Middleware

- [response-service/src/middleware/auth.js](response-service/src/middleware/auth.js)

### Queue and infrastructure

- [response-service/src/utils/rabbitmq.js](response-service/src/utils/rabbitmq.js)
- [response-service/src/config/redis.js](response-service/src/config/redis.js)
- [response-service/src/utils/logger.js](response-service/src/utils/logger.js)

---

## 4. Startup and App Setup

### File: [response-service/src/server.js](response-service/src/server.js)

This is the entry point for the service.

What happens here:

- loads environment variables
- connects to RabbitMQ
- starts the Express app on `PORT` or `5003`
- logs service startup

### File: [response-service/src/app.js](response-service/src/app.js)

This sets up the HTTP server.

Important parts:

- `express.json()` and `express.urlencoded()` parse body data
- `cors()` allows frontend access
- `express-rate-limit` prevents abuse
- Redis is initialized using `require('./config/redis')`
- MongoDB connection is opened with `mongoose.connect(process.env.MONGO_URI)`
- `/health` and `/api/response/health` endpoints are exposed
- all response routes are mounted under `/api/response`

### Why this matters

This file is the main HTTP setup for the service and is what the gateway sends requests to.

---

## 5. Route File Overview

### File: [response-service/src/routes/response.routes.js](response-service/src/routes/response.routes.js)

This is the most important file in the response service.

It contains:

- student meal response submit logic
- student response history endpoints
- update/delete response endpoints
- calculation queue publishing
- student message submit/read endpoints
- cache operations

### Main endpoints

- `POST /api/response/message/submit`
- `GET /api/response/message/my`
- `GET /api/response/message/all`
- `POST /api/response/submit`
- `GET /api/response/my-all`
- `GET /api/response/my`
- `PUT /api/response/update`
- `GET /api/response/all`
- `DELETE /api/response/delete`

---

## 6. Student Meal Response Logic

### Submit response endpoint

```js
router.post("/submit", authMiddleware, async (req, res) => {
  const { date, meals } = req.body;
  const studentId = req.user.id;

  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Only students can submit response" });
  }

  const now = new Date();
  const hour = now.getHours();
  if (hour < 9 || hour >= 21) {
    return res.status(403).json({ message: "Responses allowed only between 9 AM and 9 PM" });
  }

  const existing = await Response.findOne({ studentId: req.user.id, date });
  if (existing) {
    return res.status(400).json({ message: "You already submitted response for this date" });
  }

  const response = await Response.create({ studentId, date, meals });
  await deleteCache(`responses:${date}`);
  await deleteCache(`responses:my-all:${studentId}`);
  await deleteCache(`response:my:${studentId}:${date}`);

  sendToQueue({
    type: "NEW_RESPONSE",
    date,
    studentId,
    meals
  });
});
```

### What this code does

- ensures only students can submit
- enforces the 9 AM to 9 PM rule
- prevents duplicate submissions for the same date
- stores the response in MongoDB
- clears cache
- sends RabbitMQ event for calculation service

### Why it matters

This is the core business logic for meal responses.

---

## 7. Update and Delete Response Logic

### Update response

```js
router.put("/update", authMiddleware, async (req, res) => {
  const { date, meals } = req.body;
  const studentId = req.user.id;

  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Only students can update response" });
  }

  const now = new Date();
  const hour = now.getHours();
  if (hour < 9 || hour >= 21) {
    return res.status(403).json({ message: "Responses allowed only between 9 AM and 9 PM" });
  }

  const updated = await Response.findOneAndUpdate(
    { studentId, date },
    { meals },
    { new: true }
  );

  await deleteCache(`response:my:${studentId}:${date}`);
  await deleteCache(`responses:my-all:${studentId}`);
  await deleteCache(`responses:${date}`);

  sendToQueue({
    type: 'UPDATE_RESPONSE',
    date,
    studentId,
    meals
  });
});
```

### Delete response

```js
router.delete("/delete", authMiddleware, async (req, res) => {
  const { date } = req.body;
  const studentId = req.user.id;

  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Only students can delete their response" });
  }

  const deleted = await Response.findOneAndDelete({ studentId, date });

  await deleteCache(`response:my:${studentId}:${date}`);
  await deleteCache(`responses:my-all:${studentId}`);
  await deleteCache(`responses:${date}`);

  sendToQueue({
    type: 'DELETE_RESPONSE',
    date,
    studentId
  });
});
```

### Why these matter

These endpoints keep the data consistent and ensure the calculation service is informed whenever response data changes.

---

## 8. Response Read Logic

### `GET /my-all`

Returns all responses for the current student.

Important behavior:

- checks Redis first
- reads from MongoDB if cache is empty
- caches the full response list for one hour

### `GET /my`

Returns a single response for a specific date.

Important behavior:

- requires `date` in query
- checks Redis first
- caches the response for 24 hours

### `GET /all`

This endpoint is for calculation service access.

Important behavior:

- fetches all responses for a date
- supports `force=true` to bypass cache
- caches the result for 24 hours

### Why this matters

This is the source for both student history screens and calculation service processing.

---

## 9. Student Message Logic

### Submit message endpoint

```js
router.post("/message/submit", authMiddleware, async (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Only students can submit messages" });
  }

  const { message, studentName, studentEmail } = req.body;

  const payload = {
    studentId: req.user.id,
    studentName: String(studentName || "Student").trim(),
    studentEmail: String(studentEmail || "unknown@local").trim(),
    message: String(message).trim(),
  };

  const created = await StudentMessage.create(payload);

  await deleteCache(`student-messages:student:${req.user.id}`);
  await deleteCache("student-messages:admin-staff");
});
```

### Student own messages

```js
router.get("/message/my", authMiddleware, async (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Only students can view this resource" });
  }

  const cacheKey = `student-messages:student:${req.user.id}`;
  const cached = await getCache(cacheKey);

  const messages = await StudentMessage.find({ studentId: req.user.id }).sort({ createdAt: -1 }).lean();
  await setCache(cacheKey, messages, 300);
});
```

### All messages for admin/staff

```js
router.get("/message/all", authMiddleware, async (req, res) => {
  if (!["admin", "staff"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const cacheKey = "student-messages:admin-staff";
  const cached = await getCache(cacheKey);

  const messages = await StudentMessage.find({}).sort({ createdAt: -1 }).limit(200).lean();
  await setCache(cacheKey, messages, 300);
});
```

### Why this matters

This is the feature that lets students communicate directly with admin and staff.

---

## 10. Response Model

### File: [response-service/src/models/response.model.js](response-service/src/models/response.model.js)

This stores meal response data:

- `studentId`
- `date`
- `meals.breakfast`
- `meals.lunch`
- `meals.dinner`

### Important details

- each meal value is restricted to `none`, `half`, `full`
- timestamps are enabled

### Why it matters

This is the base source for all calculation and waste work.

---

## 11. Student Message Model

### File: [response-service/src/models/studentMessage.model.js](response-service/src/models/studentMessage.model.js)

This stores student messages:

- `studentId`
- `studentName`
- `studentEmail`
- `message`

### Important details

- `studentId` is indexed
- `message` has a maximum length of 1000
- timestamps are enabled

### Why it matters

This is the persistent record of student communication.

---

## 12. RabbitMQ Integration

### File: [response-service/src/utils/rabbitmq.js](response-service/src/utils/rabbitmq.js)

This file connects to RabbitMQ and sends messages to `meal_queue`.

### Main functions

- `connectQueue()`
- `sendToQueue(data)`

### How it works

1. `connectQueue()` connects to RabbitMQ and creates the queue.
2. `sendToQueue()` serializes data as JSON and pushes it to `meal_queue`.

### Why it matters

This is how meal responses trigger asynchronous calculation updates.

---

## 13. Redis Caching

### File: [response-service/src/config/redis.js](response-service/src/config/redis.js)

This file sets up Redis client + helper functions.

### Main functions

- `setCache`
- `getCache`
- `deleteCache`
- `deleteMultipleCache`

### Cache keys used

For responses:

- `responses:${date}`
- `responses:my-all:${studentId}`
- `response:my:${studentId}:${date}`

For messages:

- `student-messages:student:${studentId}`
- `student-messages:admin-staff`

### Why it matters

It reduces database reads and helps repeated dashboard requests load faster.

---

## 14. Auth Middleware

### File: [response-service/src/middleware/auth.js](response-service/src/middleware/auth.js)

This middleware checks the JWT token.

What it does:

- reads Authorization header
- extracts Bearer token
- verifies token with `JWT_SECRET`
- stores decoded data in `req.user`

### Why it matters

All student response and message actions require an authenticated user.

---

## 15. Logging

### File: [response-service/src/utils/logger.js](response-service/src/utils/logger.js)

This sets up Winston logs to:

- console
- `logs/app.log`
- `logs/error.log`

### Why it matters

Useful for debugging response, queue, and caching issues.

---

## 16. Important Response Service Endpoints

### Student response endpoints

- `POST /api/response/submit`
- `PUT /api/response/update`
- `DELETE /api/response/delete`
- `GET /api/response/my`
- `GET /api/response/my-all`
- `GET /api/response/all`

### Student message endpoints

- `POST /api/response/message/submit`
- `GET /api/response/message/my`
- `GET /api/response/message/all`

### Health

- `GET /api/response/health`
- `GET /health`

---

## 17. Frontend Connection

### Student dashboard uses this service for:

- meal submission
- response history
- response editing
- response deletion
- student messages

### Files involved

- [frontend/src/pages/StudentDashboard.jsx](frontend/src/pages/StudentDashboard.jsx)

### Admin and staff use this service for:

- viewing student messages

### Files involved

- [frontend/src/pages/AdminPanel.jsx](frontend/src/pages/AdminPanel.jsx)
- [frontend/src/pages/StaffDashboard.jsx](frontend/src/pages/StaffDashboard.jsx)

### Data path

Frontend -> Gateway -> Response service -> MongoDB / Redis / RabbitMQ -> Calculation service

---

## 18. What to Say in Review

### Teacher-friendly explanation

"The response service is the core student interaction layer. It stores meal responses, enforces time and role rules, prevents duplicate submissions, and sends response events to RabbitMQ so the calculation service can update ingredient usage. It also stores student messages and gives admin/staff access to view them. Redis is used to cache response and message reads for speed."

---

## 19. Review Notes You Can Memorize

- Response service runs on port 5003 by default.
- Meal responses are only allowed from 9 AM to 9 PM.
- Only students can submit, update, or delete responses.
- Duplicate responses for the same date are blocked.
- `meal_queue` is used for asynchronous calculation updates.
- Student messages are also stored in this service.
- Admin/staff can read all student messages.
- Redis is used for response and message caching.

---

## 20. Best Files to Open for Response Review

- [response-service/src/server.js](response-service/src/server.js)
- [response-service/src/app.js](response-service/src/app.js)
- [response-service/src/routes/response.routes.js](response-service/src/routes/response.routes.js)
- [response-service/src/models/response.model.js](response-service/src/models/response.model.js)
- [response-service/src/models/studentMessage.model.js](response-service/src/models/studentMessage.model.js)
- [response-service/src/middleware/auth.js](response-service/src/middleware/auth.js)
- [response-service/src/utils/rabbitmq.js](response-service/src/utils/rabbitmq.js)
- [response-service/src/config/redis.js](response-service/src/config/redis.js)
- [response-service/src/utils/logger.js](response-service/src/utils/logger.js)

---

## 21. One-Line Response Service Summary

The response service stores student meal responses and messages, validates access and time rules, pushes response events to RabbitMQ for calculation updates, and caches reads in Redis for performance.
