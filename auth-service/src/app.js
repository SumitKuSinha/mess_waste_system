const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
require('./config/redis'); // Initialize Redis

const authRoutes = require('./routes/auth.routes');

const app = express();

// Rate limiter: 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: 'Too many requests, please try again later'
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(limiter);

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Auth Service is healthy' });
});

// Health check endpoint
app.get('/api/auth/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'auth-service' });
});

// Auth routes
app.use('/api/auth', authRoutes);

module.exports = app;
