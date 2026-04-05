# Gateway Service Summary for Review

## 1. What This Service Does

The gateway service is the single entry point for the whole Smart Mess System backend. It receives all frontend API requests and forwards them to the correct microservice instance.

Its responsibilities are:

- routing requests to auth, menu, response, calculation, waste, dashboard, and recipe services
- balancing traffic across multiple service instances
- exposing a health check endpoint
- logging incoming requests
- returning a fallback response for unknown routes

This service does not store business data itself. It acts as a traffic manager between frontend and microservices.

---

## 2. End-to-End Gateway Data Flow

### What happens when the frontend sends a request

1. The React frontend sends an API request to `http://localhost:5000`.
2. The request reaches the gateway.
3. The gateway checks the route prefix.
4. The gateway forwards the request to the correct service.
5. The selected service processes the request.
6. The response is returned back through the gateway to the frontend.

### Example flows

- `/api/auth/login` -> auth service
- `/api/menu/add` -> menu service
- `/api/response/submit` -> response service
- `/api/calculate/:date` -> calculation service
- `/api/waste/:date` -> calculation service
- `/api/dashboard/:date` -> calculation service
- `/api/recipe/*` -> calculation service

### Why this matters

The frontend only needs one base URL. The gateway hides the internal microservice structure and makes the system easier to scale and manage.

---

## 3. Important Files and What They Do

### Gateway entry point

- [gateway/server.js](gateway/server.js)

### Load balancer helper

- [gateway/load-balancer.js](gateway/load-balancer.js)

### Package configuration

- [gateway/package.json](gateway/package.json)

---

## 4. Startup and Package Setup

### File: [gateway/package.json](gateway/package.json)

This defines the gateway project setup.

### Important dependencies

- `express` for the HTTP server
- `http-proxy-middleware` for request forwarding
- `cors` for frontend access
- `express-rate-limit` for request throttling
- `redis` and `winston` for infrastructure support if needed by the gateway environment

### Main script

- `start` -> `node server.js`
- `dev` -> `nodemon server.js`

### Why it matters

This file shows that the gateway is its own Node service and can be run independently.

---

## 5. Gateway Server Setup

### File: [gateway/server.js](gateway/server.js)

This is the main gateway application file.

### What it does on startup

- creates the Express app
- sets the port to `5000` by default
- creates load balancers for each microservice group
- enables CORS
- logs each request
- defines a health endpoint
- creates proxy middleware for each service path
- adds 404 and error handlers
- starts listening on the port

### Important startup snippet

```js
const app = express();
const PORT = process.env.PORT || 5000;
```

This means the gateway is the main public backend port.

### Load balancers created

```js
const authLB = new LoadBalancer('Auth-Service', [5001, 5011, 5021]);
const menuLB = new LoadBalancer('Menu-Service', [5002, 5012, 5022]);
const responseLB = new LoadBalancer('Response-Service', [5003, 5013, 5023]);
const calcLB = new LoadBalancer('Calculation-Service', [5004, 5014, 5024]);
```

This shows that each service has three instances and the gateway distributes requests across them.

---

## 6. Load Balancer Logic

### File: [gateway/load-balancer.js](gateway/load-balancer.js)

This is a simple round-robin load balancer.

### What it does

- stores the service name
- stores the list of instance ports
- tracks the current index
- returns the next server in rotation
- supports debugging through current index and reset

### Important code

```js
getNextServer() {
  const server = `http://localhost:${this.ports[this.currentIndex]}`;
  this.currentIndex = (this.currentIndex + 1) % this.ports.length;
  return server;
}
```

### What round-robin means

If there are three instances, requests go like this:

- first request -> first port
- second request -> second port
- third request -> third port
- fourth request -> first port again

### Why it matters

This helps balance load evenly across multiple copies of the same service.

---

## 7. Proxy Route Mapping

### File: [gateway/server.js](gateway/server.js)

This file uses `http-proxy-middleware` to forward API requests.

### Main routes

#### Auth service

```js
app.use('/api/auth', createProxyMiddleware({
  target: authLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/auth'
  },
  router: (req) => authLB.getNextServer()
}));
```

#### Menu service

```js
app.use('/api/menu', createProxyMiddleware({
  target: menuLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/menu'
  },
  router: (req) => menuLB.getNextServer()
}));
```

#### Response service

```js
app.use('/api/response', createProxyMiddleware({
  target: responseLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/response'
  },
  router: (req) => responseLB.getNextServer()
}));
```

#### Calculation service

```js
app.use('/api/calculate', createProxyMiddleware({
  target: calcLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/calculate'
  },
  router: (req) => calcLB.getNextServer()
}));
```

#### Dashboard

```js
app.use('/api/dashboard', createProxyMiddleware({
  target: calcLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/dashboard'
  },
  router: (req) => calcLB.getNextServer()
}));
```

#### Waste

```js
app.use('/api/waste', createProxyMiddleware({
  target: calcLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/waste'
  },
  router: (req) => calcLB.getNextServer()
}));
```

#### Recipe

```js
app.use('/api/recipe', createProxyMiddleware({
  target: calcLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/recipe'
  },
  router: (req) => calcLB.getNextServer()
}));
```

### Why this matters

This file is the routing brain of the entire backend. It decides which service instance handles each request.

---

## 8. Health and Error Handling

### File: [gateway/server.js](gateway/server.js)

### Health endpoint

```js
app.get('/health', (req, res) => {
  res.json({ status: 'Gateway is running', port: PORT });
});
```

### 404 handler

```js
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.url });
});
```

### Error handler

```js
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Gateway error', message: err.message });
});
```

### Why they matter

- health endpoint confirms gateway is alive
- 404 handler catches unknown routes
- error handler gives a centralized fallback for failed proxy or server issues

---

## 9. Service Routing Summary

### Auth service

- port group: 5001, 5011, 5021
- used for login, signup, and role-based access

### Menu service

- port group: 5002, 5012, 5022
- used for menu CRUD and notifications

### Response service

- port group: 5003, 5013, 5023
- used for student responses and messages

### Calculation service

- port group: 5004, 5014, 5024
- used for ingredient calculations, waste, dashboard, and recipe APIs

### Why this matters

This is the one-sentence architecture explanation you can use:

"The gateway distributes frontend requests to different microservices and balances each service across three instances using round-robin routing."

---

## 10. How the Gateway Connects to the Frontend

### Frontend base URL

The frontend talks to:

- `http://localhost:5000/api/...`

### Example frontend requests

- Student menu fetch -> `/api/menu/:date`
- Student login -> `/api/auth/login`
- Student response submit -> `/api/response/submit`
- Admin calculation view -> `/api/calculate/:date`
- Admin waste dashboard -> `/api/dashboard/:date`
- Staff waste submit -> `/api/waste/add`

### Why it matters

The frontend never has to know which exact backend port is behind the request.

---

## 11. What to Say in Review

### Teacher-friendly explanation

"The gateway is the single public entry point for the backend. It routes requests to the correct microservice and balances traffic across multiple instances of each service using round-robin. It also provides a health endpoint, logs incoming requests, and handles unknown routes or errors centrally."

---

## 12. Review Notes You Can Memorize

- Gateway runs on port 5000 by default.
- It uses `http-proxy-middleware`.
- Each service has 3 instances.
- Routing is round-robin.
- Auth, menu, response, and calculation services are all reached through the gateway.
- Frontend only talks to the gateway, not directly to the service ports.
- Gateway has a health endpoint and centralized error handling.

---

## 13. Best Files to Open for Gateway Review

- [gateway/server.js](gateway/server.js)
- [gateway/load-balancer.js](gateway/load-balancer.js)
- [gateway/package.json](gateway/package.json)

---

## 14. One-Line Gateway Summary

The gateway is the system’s public entry point that forwards frontend requests to the correct microservice and load-balances traffic across multiple service instances using round-robin routing.
