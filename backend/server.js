const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');

const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeFirebase } = require('./config/firebase');
const s3Service = require('./services/s3Service');

// Load env
dotenv.config();

// ===== CONNECT SERVICES =====
connectDB();
connectRedis().catch(() => {});
initializeFirebase();
s3Service.initialize();

// ===== APP INIT =====
const app = express();

// ===== CORS (Vercel + Domain Safe) =====
app.use(cors({
  origin: [
    'https://dvisionacademy.com',
    'https://www.dvisionacademy.com',
    /\.vercel\.app$/
  ],
  credentials: true
}));

// ===== BODY PARSER =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// ===== STATIC FILES =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== ROOT =====
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Dvision Academy Backend API'
  });
});

// ===== HEALTH =====
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is running'
  });
});

// ===== 🔥 API ROUTES (THIS WAS MISSING) =====
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});
// ===== ERROR HANDLER =====
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

// ===== SCHEDULERS =====
require('./services/timetableScheduler').initializeTimetableScheduler();
require('./services/subscriptionExpiryScheduler').initializeSubscriptionExpiryScheduler();

// ===== SERVER + SOCKET =====
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const { initializeSocket } = require('./config/socket');
const io = initializeSocket(server);
app.set('io', io);

// 🔥 VERY IMPORTANT FOR CONTABO
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = { app, server, io };