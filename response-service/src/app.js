const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const mongoose = require('mongoose');

const responseRoutes = require('./routes/response.routes');

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

// DB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected (response-service)"))
  .catch(err => console.log(err));

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Response Service is healthy' });
});

// Health check endpoint
app.get('/api/response/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'response-service' });
});

app.use('/api/response', responseRoutes);

module.exports = app;
