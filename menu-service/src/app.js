const express = require('express');
const cors = require('cors');
require('dotenv').config();

const menuRoutes = require('./routes/menu.routes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

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
