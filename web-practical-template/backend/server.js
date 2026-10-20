const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// CHANGE HERE: Update route file import if renamed for another entity.
const studentRoutes = require('./routes/studentRoutes');

const app = express();

// Connect to MongoDB (Local Compass or Atlas)
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CHANGE HERE: Update the backend API endpoint (e.g., '/api/books', '/api/employees').
app.use('/api/students', studentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend API is running.' });
});

// Serve the frontend directory statically so http://localhost:5000 opens index.html directly
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Centralized Error-Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.message);
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred. Please try again.'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Backend API and Frontend running at http://localhost:${PORT}`);
  console.log(`[Server] REST Endpoint active at http://localhost:${PORT}/api/students`);
});