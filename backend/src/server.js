const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const eventRoutes = require('./routes/events');
const contributionRoutes = require('./routes/contributions');
const kittyRoutes = require('./routes/kitty');
const pollRoutes = require('./routes/polls');
const expenseRoutes = require('./routes/expenses');
const galleryRoutes = require('./routes/gallery');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for local testing and cross-origin access
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploaded images statically
// Mapped from `/uploads` HTTP path to `/public/uploads` disk path
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes Mount
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/kitty', kittyRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/reports', reportRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mehfil API is running smoothly.', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    message: 'An internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

app.listen(PORT, () => {
  console.log(`Mehfil V2 API Server running on port ${PORT}`);
});
