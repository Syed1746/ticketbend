// src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const app = express();

app.use(cors(), express.json());
app.use('/api/auth', authRoutes);

// Event management routes
const eventRoutes = require('./routes/event.routes');
app.use('/api/events', eventRoutes);

// Global error handler (expand as needed)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
});

module.exports = app;