const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Staff Service is healthy' });
});

// Health check endpoint
app.get('/api/staff/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'staff-service' });
});

module.exports = app;
