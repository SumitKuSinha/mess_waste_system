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
  res.status(200).json({ message: 'Notification Service is healthy' });
});

// Health check endpoint
app.get('/api/notification/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'notification-service' });
});

module.exports = app;
