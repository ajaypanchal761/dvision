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
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'https://dvisionacademy.com',
      'https://www.dvisionacademy.com',
      /\.vercel\.app$/
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(null, true); // Allow for now, can restrict later
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'Content-Length',
    'X-File-Name',
    'X-File-Size',
    'X-File-Type'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
}));

// Handle preflight OPTIONS requests explicitly
app.options('*', cors());

// ===== BODY PARSER =====
// Note: For file uploads, multer handles the body parsing, but we still need these for other routes
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

// Increase server timeout for large file uploads (30 minutes)
server.timeout = 30 * 60 * 1000; // 30 minutes in milliseconds
server.keepAliveTimeout = 30 * 60 * 1000; // 30 minutes
server.headersTimeout = 31 * 60 * 1000; // 31 minutes (slightly more than keepAliveTimeout)

const { initializeSocket } = require('./config/socket');
const io = initializeSocket(server);
app.set('io', io);

// 🔥 VERY IMPORTANT FOR CONTABO
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`❤️  Health check at http://localhost:${PORT}/health`);
});

module.exports = { app, server, io };