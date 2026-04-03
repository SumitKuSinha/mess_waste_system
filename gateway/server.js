const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const LoadBalancer = require('./load-balancer');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== INITIALIZE LOAD BALANCERS =====
// Each service has 3 instances on ports: X000, X010, X020
const authLB = new LoadBalancer('Auth-Service', [5001, 5011, 5021]);
const menuLB = new LoadBalancer('Menu-Service', [5002, 5012, 5022]);
const responseLB = new LoadBalancer('Response-Service', [5003, 5013, 5023]);
const calcLB = new LoadBalancer('Calculation-Service', [5004, 5014, 5024]);

// CORS - Allow all requests
app.use(cors());

// Debug logging
app.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Gateway is running', port: PORT });
});

// ===== SERVICE PROXIES WITH LOAD BALANCING =====

// AUTH SERVICE - Load Balanced across 3 instances
app.use('/api/auth', createProxyMiddleware({
  target: authLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/auth'
  },
  router: (req) => authLB.getNextServer()
}));

// MENU SERVICE - Load Balanced across 3 instances
app.use('/api/menu', createProxyMiddleware({
  target: menuLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/menu'
  },
  router: (req) => menuLB.getNextServer()
}));

// RESPONSE SERVICE - Load Balanced across 3 instances
app.use('/api/response', createProxyMiddleware({
  target: responseLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/response'
  },
  router: (req) => responseLB.getNextServer()
}));

// CALCULATION SERVICE - Load Balanced across 3 instances
app.use('/api/calculate', createProxyMiddleware({
  target: calcLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/calculate'
  },
  router: (req) => calcLB.getNextServer()
}));

app.use('/api/dashboard', createProxyMiddleware({
  target: calcLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/dashboard'
  },
  router: (req) => calcLB.getNextServer()
}));

// WASTE SERVICE - Load Balanced (calculation-service)
app.use('/api/waste', createProxyMiddleware({
  target: calcLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/waste'
  },
  router: (req) => calcLB.getNextServer()
}));

// RECIPE SERVICE - Load Balanced (calculation-service)
app.use('/api/recipe', createProxyMiddleware({
  target: calcLB.getNextServer(),
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/recipe'
  },
  router: (req) => calcLB.getNextServer()
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.url });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Gateway error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 ===================================
🚀 API GATEWAY RUNNING ON PORT ${PORT}
🚀 ===================================

📍 LOAD BALANCED ROUTES:
  [OK] /api/auth        → 5001, 5011, 5021 (3 instances)
  [OK] /api/menu        → 5002, 5012, 5022 (3 instances)
  [OK] /api/response    → 5003, 5013, 5023 (3 instances)
  [OK] /api/calculate   → 5004, 5014, 5024 (3 instances)
  [OK] /api/dashboard   → 5004, 5014, 5024 (3 instances)
  [OK] /api/waste       → 5004, 5014, 5024 (3 instances)
  [OK] /api/recipe      → 5004, 5014, 5024 (3 instances)

⚙️  Load Balancing Algorithm: Round-Robin
🔄 Each request cycles to the next instance

🔗 Access all services via: http://localhost:${PORT}/api/[service]/...
  `);
});

module.exports = app;