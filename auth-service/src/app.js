const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

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
