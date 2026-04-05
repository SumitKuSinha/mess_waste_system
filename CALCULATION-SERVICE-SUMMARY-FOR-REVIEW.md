# Calculation Service Summary for Review

## 1. What This Service Does

The calculation service is the analytics and processing engine of the Smart Mess System. It:

- receives response events through RabbitMQ
- calculates ingredient requirements for each date
- stores calculated meal counts and ingredients in MongoDB
- provides admin/staff calculation data through API routes
- computes waste and leftover analytics
- supports dashboard summaries
- runs a daily automatic calculation at 9 PM
- uses Redis to cache calculation and dashboard results

This is the service that turns student meal responses into ingredient totals and waste analytics.

---

## 2. End-to-End Calculation Data Flow

### Real-time response-driven flow

1. Student submits or updates a meal response.
2. Response service stores the response in MongoDB.
3. Response service pushes a message into RabbitMQ queue `meal_queue`.
4. Calculation service consumer receives the message.
5. Consumer calls `runCalculation(date)`.
6. Calculation service fetches all responses for that date.
7. Calculation service fetches the menu for that date.
8. It loads recipe definitions and calculates ingredient quantities.
9. Results are stored in MongoDB.
10. Redis cache is cleared so fresh data is available.
11. Admin dashboard and waste analytics screens show updated values.

### Manual API flow

1. Admin or staff requests calculation for a date.
2. Frontend sends request to gateway.
3. Gateway forwards to calculation service.
4. Calculation service checks cache and database.
5. If not found or `force=true`, it recomputes the calculation.
6. Result is saved and returned.

### Waste/dashboard flow

1. Admin views dashboard or waste report.
2. Calculation service returns computed ingredients, totals, and summaries.
3. Waste data is combined with calculation data in dashboard routes.
4. Frontend displays summary cards, breakdowns, and charts.

### Scheduled flow

1. Every day at 9 PM, a cron job triggers calculation.
2. It computes for today’s date.
3. Results are saved for later dashboard viewing.

---

## 3. Important Files and What They Do

### App bootstrap

- [calculation-service/src/app.js](calculation-service/src/app.js)
- [calculation-service/src/server.js](calculation-service/src/server.js)
- [calculation-service/src/consumer.js](calculation-service/src/consumer.js)

### Calculation logic

- [calculation-service/src/services/calculation.service.js](calculation-service/src/services/calculation.service.js)

### Route handlers

- [calculation-service/src/routes/calculate.routes.js](calculation-service/src/routes/calculate.routes.js)
- [calculation-service/src/routes/waste.routes.js](calculation-service/src/routes/waste.routes.js)
- [calculation-service/src/routes/dashboard.routes.js](calculation-service/src/routes/dashboard.routes.js)
- [calculation-service/src/routes/recipe.routes.js](calculation-service/src/routes/recipe.routes.js)

### Data models

- [calculation-service/src/models/calculation.model.js](calculation-service/src/models/calculation.model.js)
- [calculation-service/src/models/response.model.js](calculation-service/src/models/response.model.js)
- [calculation-service/src/models/menu.model.js](calculation-service/src/models/menu.model.js)
- [calculation-service/src/models/waste.model.js](calculation-service/src/models/waste.model.js)
- [calculation-service/src/models/recipe.model.js](calculation-service/src/models/recipe.model.js)

### Middleware

- [calculation-service/src/middleware/auth.js](calculation-service/src/middleware/auth.js)
- [calculation-service/src/middleware/role.js](calculation-service/src/middleware/role.js)

### Infrastructure

- [calculation-service/src/utils/rabbitmq.js](calculation-service/src/utils/rabbitmq.js)
- [calculation-service/src/config/redis.js](calculation-service/src/config/redis.js)
- [calculation-service/src/utils/logger.js](calculation-service/src/utils/logger.js)

---

## 4. Startup and App Setup

### File: [calculation-service/src/server.js](calculation-service/src/server.js)

This is the main server entry point.

What happens here:

- environment variables are loaded
- RabbitMQ connection is opened first
- Express app starts on `PORT` or `5004`
- a cron job is scheduled for automatic daily calculation at 9 PM
- logs are written using Winston

### File: [calculation-service/src/app.js](calculation-service/src/app.js)

This sets up the HTTP server.

Important middleware:

- `express.json()`
- `express.urlencoded()`
- `cors()`
- `express-rate-limit`
- Redis initialization
- MongoDB connection using `mongoose.connect(process.env.MONGO_URI)`

Routes mounted here:

- `/api/calculate`
- `/api/waste`
- `/api/dashboard`
- `/api/recipe`

### Why this matters

This is the infrastructure shell around the calculation engine. It exposes the API and prepares the queue connection.

---

## 5. RabbitMQ Consumer

### File: [calculation-service/src/consumer.js](calculation-service/src/consumer.js)

This is the asynchronous worker that listens to `meal_queue`.

### What it does

1. Connects to MongoDB.
2. Connects to RabbitMQ.
3. Creates channel and queue.
4. Uses `prefetch(1)` so only one message is processed at a time.
5. Consumes messages from `meal_queue`.
6. Reads the message payload.
7. Calls `runCalculation(data.date)`.
8. Acknowledges the message if successful.
9. Requeues on failure.

### Why it matters

This is the background worker that makes the system event-driven instead of manually recalculating everything on demand.

---

## 6. Calculation Service Core Logic

### File: [calculation-service/src/services/calculation.service.js](calculation-service/src/services/calculation.service.js)

This is the most important file in the service.

### Main function

- `runCalculation(date)`

### What `runCalculation` does

#### Step 1: fetch responses

It calls the response service:

```js
axios.get(`http://localhost:5003/api/response/all?date=${date}&force=true`)
```

This gets all meal responses for the date.

#### Step 2: count meal portions

It loops through responses and counts:

- breakfast full = 1
- breakfast half = 0.5
- lunch full = 1
- lunch half = 0.5
- dinner full = 1
- dinner half = 0.5

This creates meal counts for each meal.

#### Step 3: fetch menu

It calls the menu service:

```js
axios.get(`http://localhost:5002/api/menu/get/${date}`)
```

This gets the menu recipes for breakfast, lunch, and dinner.

#### Step 4: calculate ingredient totals

It loads matching recipe documents from MongoDB and calculates required ingredients.

It applies a `WASTAGE_PERCENT` of 10%, so the system intentionally plans a small buffer.

#### Step 5: save calculation result

It stores the final result in the Calculation model.

#### Step 6: clear cache

It deletes:

- `calculation:${date}`
- `calculation:history`

### Why this file matters

This is the core analytics engine of the whole project.

---

## 7. Important Calculation Code

### Fetch responses from response service

```js
const responseRes = await axios.get(`http://localhost:5003/api/response/all?date=${date}&force=true`, {
  timeout: 5000
});
```

### Fetch menu from menu service

```js
const menuRes = await axios.get(`http://localhost:5002/api/menu/get/${date}`, {
  timeout: 5000
});
```

### Meal counting logic

```js
if (response.meals?.breakfast === 'full') breakfastCount += 1;
else if (response.meals?.breakfast === 'half') breakfastCount += 0.5;
```

This same logic is repeated for lunch and dinner.

### Ingredient calculation logic

```js
const totalQty = ing.qtyPerPerson * breakfastCount;
const finalQty = totalQty + (totalQty * WASTAGE_PERCENT / 100);
```

Then it converts quantity based on ingredient unit.

### Save to MongoDB

```js
const calculationData = await Calculation.findOneAndUpdate(
  { date },
  {
    date,
    breakfast: breakfastCount,
    lunch: lunchCount,
    dinner: dinnerCount,
    totalResponses: responses.length,
    ingredients,
    ingredientUnits,
    updatedAt: new Date()
  },
  { upsert: true, new: true }
);
```

### Why these lines are important

These are the exact lines that transform response data into ingredient totals.

---

## 8. Calculation Routes

### File: [calculation-service/src/routes/calculate.routes.js](calculation-service/src/routes/calculate.routes.js)

This is the main public API for calculations.

### Endpoints

- `GET /api/calculate/history`
- `GET /api/calculate/:date`
- `DELETE /api/calculate/:date`

### `GET /history`

Admin only.

Returns all saved calculations, sorted by date, and caches the history.

### `GET /:date`

Admin and staff can view ingredient calculations for a date.

Behavior:

- checks cache first
- checks DB next
- if not found or `force=true`, runs `runCalculation(date)`
- converts Map fields to plain objects for the frontend
- caches result for 24 hours

### `DELETE /:date`

Admin only.

Deletes a calculation record and clears related cache.

---

## 9. Waste Routes

### File: [calculation-service/src/routes/waste.routes.js](calculation-service/src/routes/waste.routes.js)

This file stores waste data submitted by staff.

### Main endpoint

- `POST /api/waste/add`
- `GET /api/waste/:date`

### Important current mode

The active path is `v2-bin-leftover`.

This means staff submits:

- total waste bin weight
- per-dish leftovers

The service then estimates recipe-level waste and ingredient-level waste proportionally.

### High-level flow

1. Staff submits total bin waste and leftovers.
2. Service loads calculation for that date.
3. Service loads menu and recipe data.
4. Waste is distributed proportionally.
5. Leftovers are also converted to ingredient-level leftover values.
6. Waste record is saved in MongoDB.

### Why it matters

This is the core of the waste analytics feature shown in the Admin dashboard.

---

## 10. Dashboard Routes

### File: [calculation-service/src/routes/dashboard.routes.js](calculation-service/src/routes/dashboard.routes.js)

This route returns combined dashboard analytics for admin.

### Main endpoint

- `GET /api/dashboard/:date`

### What it does

1. Forces fresh calculation for that date.
2. Fetches calculation record.
3. Fetches waste record.
4. Combines calculation, waste, leftover, and recipe waste data.
5. Computes percentages and top waste items.
6. Returns a dashboard-ready JSON object.

### Important outputs

- requiredIngredients
- totalIngredients
- waste
- leftovers
- totalLoss
- surplus
- wastePercentage
- leftoverPercentage
- totalLossPercentage
- summary cards
- top wasted item
- top leftover item
- top loss item
- top wasted recipe

### Why it matters

This is the data source for the Admin dashboard summary, graphs, and breakdown cards.

---

## 11. Recipe Routes

### File: [calculation-service/src/routes/recipe.routes.js](calculation-service/src/routes/recipe.routes.js)

This route manages the recipe definitions that the calculator uses.

### Main endpoints

- `POST /api/recipe/seed`
- `GET /api/recipe/`
- `POST /api/recipe/`

### Default recipe data

The file contains the full fixed recipe list for all meals:

- breakfast items
- lunch items
- dinner items

Each recipe has:

- name
- category
- ingredients

### Why it matters

The entire ingredient calculation depends on these recipes.

---

## 12. Calculation Model

### File: [calculation-service/src/models/calculation.model.js](calculation-service/src/models/calculation.model.js)

This stores saved calculation results.

### Main fields

- `date`
- `breakfast`
- `lunch`
- `dinner`
- `totalResponses`
- `ingredients.breakfast`
- `ingredients.lunch`
- `ingredients.dinner`
- timestamps

### Why it matters

This is the persisted output of the calculation engine.

---

## 13. Response Model

### File: [calculation-service/src/models/response.model.js](calculation-service/src/models/response.model.js)

This is a local copy of the response schema used by the calculation service for reference/consistency.

It contains:

- `studentId`
- `date`
- `meals.breakfast`
- `meals.lunch`
- `meals.dinner`

### Why it matters

This keeps calculation service aligned with the student response structure.

---

## 14. Menu Model

### File: [calculation-service/src/models/menu.model.js](calculation-service/src/models/menu.model.js)

This is a local menu schema reference.

It stores:

- `date`
- `items.breakfast`
- `items.lunch`
- `items.dinner`

### Why it matters

It matches the menu structure used when fetching from the menu service.

---

## 15. Waste Model

### File: [calculation-service/src/models/waste.model.js](calculation-service/src/models/waste.model.js)

This stores waste submissions and derived waste data.

### Main fields

- `date`
- `inputType`
- `waste`
- `recipeWaste`
- `leftovers`
- `totalWasteBin`
- `leftoverIngredients`
- timestamps

### Why it matters

This is used for the waste tracking section in the Admin dashboard.

---

## 16. Recipe Model

### File: [calculation-service/src/models/recipe.model.js](calculation-service/src/models/recipe.model.js)

This stores recipe definitions:

- `name`
- `category`
- `ingredients[]`

Each ingredient has:

- `item`
- `qtyPerPerson`
- `unit`

### Why it matters

This is the basis of ingredient computation.

---

## 17. Security Middleware

### File: [calculation-service/src/middleware/auth.js](calculation-service/src/middleware/auth.js)

Validates JWT token and sets `req.user`.

### File: [calculation-service/src/middleware/role.js](calculation-service/src/middleware/role.js)

Checks whether `req.user.role` is in the required roles list.

### Why they matter

They protect admin-only and staff-only analytics routes.

---

## 18. Redis Caching

### File: [calculation-service/src/config/redis.js](calculation-service/src/config/redis.js)

This file provides:

- `setCache`
- `getCache`
- `deleteCache`
- `deleteMultipleCache`

### Cache keys used

- `calculation:${date}`
- `calculation:history`

### Why it matters

It prevents repeated expensive calculation reads and improves dashboard performance.

---

## 19. Logging

### File: [calculation-service/src/utils/logger.js](calculation-service/src/utils/logger.js)

This is the Winston logger used by the service.

### It logs to:

- console
- `logs/app.log`
- `logs/error.log`

### Why it matters

Useful for debugging calculation runs, queue issues, and scheduler problems.

---

## 20. Important Calculation Service Endpoints

### Calculation

- `GET /api/calculate/history`
- `GET /api/calculate/:date`
- `DELETE /api/calculate/:date`

### Waste

- `POST /api/waste/add`
- `GET /api/waste/:date`

### Dashboard

- `GET /api/dashboard/:date`

### Recipe

- `POST /api/recipe/seed`
- `GET /api/recipe/`
- `POST /api/recipe/`

### Health

- `GET /api/calculation/health`
- `GET /health`

---

## 21. Frontend Connection

### Admin dashboard uses this service for:

- ingredient calculations
- calculation history
- waste summary
- waste breakdown
- graph analytics

### Staff dashboard uses this service for:

- loading expected quantities and menu data
- submitting v2 waste data

### Frontend files involved

- [frontend/src/pages/AdminPanel.jsx](frontend/src/pages/AdminPanel.jsx)
- [frontend/src/pages/StaffDashboard.jsx](frontend/src/pages/StaffDashboard.jsx)

### Data path

Frontend -> Gateway -> Calculation service -> MongoDB / Redis -> Back to UI

---

## 22. What to Say in Review

### Teacher-friendly explanation

"The calculation service is the analytics engine. It consumes meal response events from RabbitMQ, fetches all responses and the menu for a date, uses recipes to compute ingredient quantities, stores the results in MongoDB, and caches outputs in Redis. It also handles dashboard summaries, waste data, and automatic daily recalculations through cron."

---

## 23. Review Notes You Can Memorize

- Calculation service runs on port 5004 by default.
- It uses RabbitMQ queue `meal_queue`.
- It reads responses from response-service and menu from menu-service.
- It calculates breakfast, lunch, and dinner separately.
- It adds a 10% wastage buffer.
- It stores calculation results in MongoDB.
- It uses Redis cache for calculation and history endpoints.
- It runs a cron job every day at 9 PM.
- Waste tracking is based on v2 bin waste + leftovers.

---

## 24. Best Files to Open for Calculation Review

- [calculation-service/src/server.js](calculation-service/src/server.js)
- [calculation-service/src/app.js](calculation-service/src/app.js)
- [calculation-service/src/consumer.js](calculation-service/src/consumer.js)
- [calculation-service/src/services/calculation.service.js](calculation-service/src/services/calculation.service.js)
- [calculation-service/src/routes/calculate.routes.js](calculation-service/src/routes/calculate.routes.js)
- [calculation-service/src/routes/waste.routes.js](calculation-service/src/routes/waste.routes.js)
- [calculation-service/src/routes/dashboard.routes.js](calculation-service/src/routes/dashboard.routes.js)
- [calculation-service/src/routes/recipe.routes.js](calculation-service/src/routes/recipe.routes.js)
- [calculation-service/src/models/calculation.model.js](calculation-service/src/models/calculation.model.js)
- [calculation-service/src/models/waste.model.js](calculation-service/src/models/waste.model.js)
- [calculation-service/src/models/recipe.model.js](calculation-service/src/models/recipe.model.js)
- [calculation-service/src/middleware/auth.js](calculation-service/src/middleware/auth.js)
- [calculation-service/src/middleware/role.js](calculation-service/src/middleware/role.js)
- [calculation-service/src/utils/rabbitmq.js](calculation-service/src/utils/rabbitmq.js)
- [calculation-service/src/config/redis.js](calculation-service/src/config/redis.js)
- [calculation-service/src/utils/logger.js](calculation-service/src/utils/logger.js)

---

## 25. One-Line Calculation Service Summary

The calculation service consumes meal responses from RabbitMQ, computes ingredient requirements using menus and recipes, stores calculation and waste analytics in MongoDB, caches results in Redis, and serves dashboard data for admin review.
