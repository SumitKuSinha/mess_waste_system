const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
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
  res.status(200).json({ message: 'Staff Service is healthy' });
});

// Health check endpoint
app.get('/api/staff/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'staff-service' });
});

module.exports = app;
