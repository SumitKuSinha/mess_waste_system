const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Import routes
const calculateRoutes = require('./routes/calculate.routes');
const wasteRoutes = require('./routes/waste.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

// Rate limiter: 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: 'Too many requests, please try again later'
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ MongoDB connected (Calculation DB)');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(limiter);

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Calculation Service is healthy' });
});

// Health check endpoint
app.get('/api/calculation/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'calculation-service' });
});

// Calculate routes
app.use('/api/calculate', calculateRoutes);

// Waste routes
app.use('/api/waste', wasteRoutes);

// Dashboard routes
app.use('/api/dashboard', dashboardRoutes);

module.exports = app;
