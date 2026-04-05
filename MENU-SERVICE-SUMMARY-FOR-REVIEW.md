# Menu Service Summary for Review

## 1. What This Service Does

The menu service is the central menu-management layer of the Smart Mess System. It handles:

- adding menus
- updating menus
- deleting menus
- fetching menus by date
- generating student notifications when menus change
- tracking read/unread notification state
- caching menu and notification data in Redis
- enforcing auth and role-based access for admin-only operations

This service is the source of truth for daily meal menu data.

---

## 2. End-to-End Menu Data Flow

### Add menu flow

1. Admin uses the frontend Menu Management screen.
2. Frontend sends the request to the gateway.
3. Gateway forwards the request to the menu service.
4. `menu.routes.js` validates the payload.
5. Menu data is saved in MongoDB.
6. Redis cache for that date is cleared.
7. A notification is created for students.
8. Students later see the menu and notification in the Student dashboard.

### Update menu flow

1. Admin selects a date and changes menu items.
2. Frontend sends update request.
3. Menu service updates the menu in MongoDB.
4. Redis cache for the date is cleared.
5. A `menu-updated` notification is created.
6. Student dashboard receives the new notification.

### Delete menu flow

1. Admin deletes the menu for a given date.
2. Menu service removes the menu from MongoDB.
3. Redis cache for that date is cleared.
4. A `menu-deleted` notification is created.
5. Students are informed that the menu is removed.

### Fetch menu flow

1. Student or admin requests menu for a date.
2. Service checks Redis cache first.
3. If cached, it returns the cached result.
4. If not cached, it reads from MongoDB.
5. The result is cached in Redis for later requests.

### Notification flow

1. Menu changes create notification records.
2. Student dashboard fetches notifications from `/notifications`.
3. Read/unread state is tracked per user.
4. Students can mark one notification read or mark all as read.

---

## 3. Important Files and What They Do

### App bootstrap

- [menu-service/src/app.js](menu-service/src/app.js)
- [menu-service/src/server.js](menu-service/src/server.js)

### Route logic

- [menu-service/src/routes/menu.routes.js](menu-service/src/routes/menu.routes.js)

### Data models

- [menu-service/src/models/menu.model.js](menu-service/src/models/menu.model.js)
- [menu-service/src/models/notification.model.js](menu-service/src/models/notification.model.js)
- [menu-service/src/models/notification-read.model.js](menu-service/src/models/notification-read.model.js)

### Security middleware

- [menu-service/src/middleware/auth.js](menu-service/src/middleware/auth.js)
- [menu-service/src/middleware/role.js](menu-service/src/middleware/role.js)

### Infrastructure

- [menu-service/src/config/db.js](menu-service/src/config/db.js)
- [menu-service/src/config/redis.js](menu-service/src/config/redis.js)
- [menu-service/src/utils/logger.js](menu-service/src/utils/logger.js)

---

## 4. Service Startup and App Setup

### File: [menu-service/src/server.js](menu-service/src/server.js)

This starts the menu service.

What happens here:

- environment variables are loaded
- MongoDB connection is established
- the Express app is started on `PORT` or `5002`
- startup is logged with Winston

### File: [menu-service/src/app.js](menu-service/src/app.js)

This sets up the Express server.

Important middleware:

- `express.json()`
- `express.urlencoded()`
- `cors()`
- `express-rate-limit`
- Redis initialization via `require('./config/redis')`

Routes exposed:

- `/health`
- `/api/menu/health`
- `/api/menu/*`

### Why this matters

This file is the operational entry point of the menu service and is what allows the gateway to forward requests to it.

---

## 5. Menu Routes

### File: [menu-service/src/routes/menu.routes.js](menu-service/src/routes/menu.routes.js)

This is the most important file in the menu service.

It contains all menu CRUD, notification, and cache logic.

### Main endpoints

- `GET /api/menu/notifications`
- `POST /api/menu/notifications/read-all`
- `POST /api/menu/notifications/:id/read`
- `POST /api/menu/add`
- `GET /api/menu/:date`
- `GET /api/menu/get/:date`
- `PUT /api/menu/update`
- `DELETE /api/menu/delete`

### Why it matters

This file decides how menu data is created, read, updated, deleted, cached, and notified.

---

## 6. Notification Helper Function

### File: [menu-service/src/routes/menu.routes.js](menu-service/src/routes/menu.routes.js)

At the top of the route file, there is a helper function:

```js
const publishMenuNotification = async ({ type, title, message, menuDate, createdBy }) => {
  try {
    await Notification.create({
      type,
      title,
      message,
      menuDate,
      targetRole: "student",
      createdBy: createdBy || "admin"
    });
  } catch (error) {
    console.error("[WARN] Failed to publish menu notification:", error.message);
  }
};
```

### What it does

- creates a notification record in MongoDB
- marks it for `student` users
- stores the menu date
- keeps track of who created it

### Why it matters

This is how menu changes are converted into student notifications.

---

## 7. Notification Reading Logic

### File: [menu-service/src/routes/menu.routes.js](menu-service/src/routes/menu.routes.js)

The service supports read tracking in two ways:

### `GET /notifications`

- fetches the newest notifications
- checks read receipts for the current user
- if notifications do not exist, it synthesizes them from menu records as a fallback

### `POST /notifications/read-all`

- marks all student-targeted notifications as read for the current user
- updates both notification records and notification-read records

### `POST /notifications/:id/read`

- marks a single notification as read
- supports virtual notifications backed by menu data

### Why this matters

This is how the app supports unread counts, mark-as-read buttons, and the bell badge in the Student dashboard.

---

## 8. Menu CRUD Logic

### Add menu

```js
router.post("/add", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  const { date, breakfast, lunch, dinner } = req.body;
  let items = req.body.items;
  if (!items && (breakfast || lunch || dinner)) {
    items = { breakfast, lunch, dinner };
  }
  const menu = await Menu.create({ date, items });
  await deleteCache(`menu:${date}`);
  await publishMenuNotification({
    type: "menu-added",
    title: "New Menu Added",
    message: `Admin added menu for ${date}. Check the latest meals.`,
    menuDate: date,
    createdBy: req.user?.id
  });
});
```

### Update menu

```js
router.put("/update", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  const { date, breakfast, lunch, dinner } = req.body;
  let items = req.body.items;
  if (!items && (breakfast || lunch || dinner)) {
    items = { breakfast, lunch, dinner };
  }
  const updatedMenu = await Menu.findOneAndUpdate(
    { date },
    { items },
    { new: true }
  );
  await deleteCache(`menu:${date}`);
  await publishMenuNotification({
    type: "menu-updated",
    title: "Menu Updated",
    message: `Admin updated menu for ${date}. Please review your meal options.`,
    menuDate: date,
    createdBy: req.user?.id
  });
});
```

### Delete menu

```js
router.delete("/delete", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  const { date } = req.body;
  const deletedMenu = await Menu.findOneAndDelete({ date });
  await deleteCache(`menu:${date}`);
  await publishMenuNotification({
    type: "menu-deleted",
    title: "Menu Removed",
    message: `Admin removed menu for ${date}. You may need to recheck upcoming meals.`,
    menuDate: date,
    createdBy: req.user?.id
  });
});
```

### Why these are important

These are the core menu management operations. They also show the full lifecycle of a menu in the system:

- create
- update
- delete
- notify
- cache invalidation

---

## 9. Menu Read Logic

### `GET /:date`

```js
router.get("/:date", async (req, res) => {
  const cacheKey = `menu:${req.params.date}`;
  const cachedMenu = await getCache(cacheKey);
  if (cachedMenu) {
    return res.json(cachedMenu);
  }

  const menu = await Menu.findOne({ date: req.params.date });
  const menuData = {
    date: menu.date,
    breakfast: menu.items.breakfast || [],
    lunch: menu.items.lunch || [],
    dinner: menu.items.dinner || []
  };

  await setCache(cacheKey, menuData, 86400);
  res.json(menuData);
});
```

### `GET /get/:date`

This is a compatibility variant that returns the menu under an `items` wrapper.

### Why it matters

The frontend uses the menu by date flow heavily, especially in:

- Student dashboard menu view
- Student response submission screen
- Admin view menu screen
- Staff if needed indirectly for display or calculations

---

## 10. Menu Model

### File: [menu-service/src/models/menu.model.js](menu-service/src/models/menu.model.js)

The menu schema stores:

- `date`
- `items.breakfast`
- `items.lunch`
- `items.dinner`

### Important details

- `date` is unique
- `items` is a grouped object
- timestamps are enabled

### Why it matters

This schema is the persistent menu record used by the whole system.

---

## 11. Notification Models

### File: [menu-service/src/models/notification.model.js](menu-service/src/models/notification.model.js)

Stores notification content such as:

- `type`
- `title`
- `message`
- `menuDate`
- `targetRole`
- `createdBy`
- `isRead`
- `readAt`
- `readByUserId`

### File: [menu-service/src/models/notification-read.model.js](menu-service/src/models/notification-read.model.js)

Stores per-user notification read receipts:

- `userId`
- `notificationKey`
- `readAt`

### Why both exist

The system supports both real notification records and per-user read tracking, which is important for the bell count and mark-read behavior.

---

## 12. Security Middleware

### File: [menu-service/src/middleware/auth.js](menu-service/src/middleware/auth.js)

This verifies JWT tokens.

What it does:

- reads the `Authorization` header
- extracts Bearer token
- verifies it using `JWT_SECRET`
- stores decoded token in `req.user`

### File: [menu-service/src/middleware/role.js](menu-service/src/middleware/role.js)

This checks the user role.

What it does:

- blocks access if `req.user.role` is not allowed
- returns `403 Access denied` if role is invalid

### Why these matter

Only admin should be able to add, update, or delete menus.

---

## 13. MongoDB Connection

### File: [menu-service/src/config/db.js](menu-service/src/config/db.js)

This connects the menu service to MongoDB.

What it does:

- calls `mongoose.connect(process.env.MONGO_URI)`
- logs success
- exits on failure

### Why it matters

Without the DB connection, the service cannot store or fetch menus or notifications.

---

## 14. Redis Caching

### File: [menu-service/src/config/redis.js](menu-service/src/config/redis.js)

This file creates the Redis client and exposes utility functions.

### Main functions

- `setCache(key, value, ttl)`
- `getCache(key)`
- `deleteCache(key)`
- `deleteMultipleCache(keys)`

### Used in menu routes

- menu by date cache
- notification-related cache behavior

### Why it matters

Redis reduces repeated DB reads and makes menu retrieval faster.

---

## 15. Logging

### File: [menu-service/src/utils/logger.js](menu-service/src/utils/logger.js)

This sets up Winston logging.

### It logs to:

- console
- `logs/app.log`
- `logs/error.log`

### Why it matters

Useful for tracing menu add/update/delete and startup issues.

---

## 16. Important Menu Service Endpoints

### Public

- `GET /api/menu/health`
- `GET /api/menu/:date`
- `GET /api/menu/get/:date`

### Authenticated

- `GET /api/menu/notifications`
- `POST /api/menu/notifications/read-all`
- `POST /api/menu/notifications/:id/read`

### Admin only

- `POST /api/menu/add`
- `PUT /api/menu/update`
- `DELETE /api/menu/delete`

---

## 17. How Menu Service Connects to the Frontend

### Admin panel

When admin adds or updates a menu, the frontend sends the request from:

- [frontend/src/pages/AdminPanel.jsx](frontend/src/pages/AdminPanel.jsx)

### Student dashboard

Students fetch menu and notification data from:

- [frontend/src/pages/StudentDashboard.jsx](frontend/src/pages/StudentDashboard.jsx)

### Data path

Frontend -> Gateway -> Menu service -> MongoDB/Redis -> Back to UI

---

## 18. Important Things to Explain in Review

### Core points

- menu service owns menu data
- it handles notifications when menus change
- it uses Redis cache so repeated menu lookups are faster
- it protects write operations with JWT + role middleware
- it uses MongoDB for permanent storage
- it supports read tracking for notifications

### Teacher-friendly explanation

"The menu service is the admin-controlled data layer for meals. It stores menus by date, serves them to students, creates notifications when menus change, and caches frequently accessed menu data in Redis. Admin-only CRUD is protected by JWT and role middleware."

---

## 19. Review Notes You Can Memorize

- Menu service runs on port 5002 by default.
- `Menu` uses `date` as a unique key.
- Menu items are stored in `breakfast`, `lunch`, and `dinner` arrays.
- Notifications are created whenever a menu is added, updated, or deleted.
- Read/unread state is tracked per user.
- Redis cache is cleared when a menu changes.
- Admin routes are protected by both auth and role checks.

---

## 20. Best Files to Open for Menu Review

- [menu-service/src/server.js](menu-service/src/server.js)
- [menu-service/src/app.js](menu-service/src/app.js)
- [menu-service/src/routes/menu.routes.js](menu-service/src/routes/menu.routes.js)
- [menu-service/src/models/menu.model.js](menu-service/src/models/menu.model.js)
- [menu-service/src/models/notification.model.js](menu-service/src/models/notification.model.js)
- [menu-service/src/models/notification-read.model.js](menu-service/src/models/notification-read.model.js)
- [menu-service/src/middleware/auth.js](menu-service/src/middleware/auth.js)
- [menu-service/src/middleware/role.js](menu-service/src/middleware/role.js)
- [menu-service/src/config/db.js](menu-service/src/config/db.js)
- [menu-service/src/config/redis.js](menu-service/src/config/redis.js)
- [menu-service/src/utils/logger.js](menu-service/src/utils/logger.js)

---

## 21. One-Line Menu Service Summary

The menu service manages menus, notifications, notification read states, role-protected admin CRUD, MongoDB storage, and Redis caching, and it serves as the menu data source for the entire Smart Mess System.
