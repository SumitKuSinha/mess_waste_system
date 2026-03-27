const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const menuRoutes = require('./routes/menu.routes');

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
  res.status(200).json({ message: 'Menu Service is healthy' });
});

// Health check endpoint
app.get('/api/menu/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'menu-service' });
});

// Menu routes
app.use('/api/menu', menuRoutes);

module.exports = app;
