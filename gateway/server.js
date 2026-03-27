const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 5000;

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

// ===== SERVICE PROXIES =====

// AUTH SERVICE (port 5001)
app.use('/api/auth', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/auth'
  }
}));

// MENU SERVICE (port 5002)
app.use('/api/menu', createProxyMiddleware({
  target: 'http://localhost:5002',
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/menu'
  }
}));

// RESPONSE SERVICE (port 5003)
app.use('/api/response', createProxyMiddleware({
  target: 'http://localhost:5003',
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/response'
  }
}));

// CALCULATION SERVICE (port 5004)
app.use('/api/calculate', createProxyMiddleware({
  target: 'http://localhost:5004',
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/calculate'
  }
}));

app.use('/api/dashboard', createProxyMiddleware({
  target: 'http://localhost:5004',
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/dashboard'
  }
}));

// STAFF SERVICE (port 5005)
app.use('/api/staff', createProxyMiddleware({
  target: 'http://localhost:5005',
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/staff'
  }
}));

// NOTIFICATION SERVICE (port 5006)
app.use('/api/notification', createProxyMiddleware({
  target: 'http://localhost:5006',
  changeOrigin: true,
  pathRewrite: {
    '^': '/api/notification'
  }
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

📍 Routes:
  ✅ /api/auth        → localhost:5001
  ✅ /api/menu        → localhost:5002
  ✅ /api/response    → localhost:5003
  ✅ /api/calculate   → localhost:5004
  ✅ /api/dashboard   → localhost:5004
  ✅ /api/staff       → localhost:5005
  ✅ /api/notification→ localhost:5006

🔗 Access all services via: http://localhost:${PORT}/api/[service]/...
  `);
});

module.exports = app;