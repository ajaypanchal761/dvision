const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeFirebase } = require('./config/firebase');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Firebase Admin (optional - server will continue without it)
const firebaseInit = initializeFirebase();
if (!firebaseInit) {
  console.warn('⚠ Firebase Admin not initialized. Push notifications will not work.');
  console.warn('   Make sure serviceAccountKey.json exists in the project root.');
}

// Initialize AWS S3 Service (optional - server will continue without it)
const s3Service = require('./services/s3Service');
s3Service.initialize();

// Connect to Redis (optional - OTP service works without it using in-memory storage)
// Redis is optional and will gracefully fall back to in-memory storage if unavailable
connectRedis().then(client => {
  if (client) {
    console.log('✓ Redis connected successfully');
  }
}).catch(err => {
  // Error already handled in connectRedis function
  // Server will continue without Redis
});

// Initialize Express app
const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      process.env.CORS_ORIGIN
    ].filter(Boolean); // Remove undefined values

    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.CORS_ORIGIN === '*') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parsing middleware - Increase limit for base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, './uploads')));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Dvision Academy Backend API',
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', require('./routes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error Handler
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

// Initialize timetable notification scheduler
const { initializeTimetableScheduler } = require('./services/timetableScheduler');
initializeTimetableScheduler();

// Initialize subscription expiry scheduler
const { initializeSubscriptionExpiryScheduler } = require('./services/subscriptionExpiryScheduler');
initializeSubscriptionExpiryScheduler();

// Start HTTP server
const PORT = process.env.PORT || 5000;
const http = require('http');
const server = http.createServer(app);

// Initialize Socket.io
const { initializeSocket } = require('./config/socket');
const io = initializeSocket(server);

// Make io available globally for use in routes/controllers
app.set('io', io);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Socket.io initialized`);
});

module.exports = { app, server, io };

