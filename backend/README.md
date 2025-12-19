# Dvision Academy Backend

A comprehensive Node.js backend API for an education platform featuring live classes, video recordings, real-time chat, subscription management, and multi-role access (Student, Teacher, Admin).

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [System Flow & Workflows](#system-flow--workflows)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Recording System Flow](#recording-system-flow)
- [Edge Cases & Error Handling](#edge-cases--error-handling)
- [Best Practices](#best-practices)

---

## 🎯 Project Overview

Dvision Academy is a comprehensive online education platform that enables:

- **Students** to attend live classes, access recorded sessions, and manage subscriptions
- **Teachers** to conduct live classes with interactive features (chat, Q&A, hand-raise)
- **Admins** to manage timetables, courses, classes, and monitor system activity

### Key Capabilities

- 📺 **Live Classes** via Agora video SDK
- 🎥 **Recording System** with local storage → S3 upload → playback
- 💬 **Real-time Chat** during live classes with Socket.io
- 💳 **Subscription Management** with Razorpay integration
- 📚 **Course Management** by class and board (CBSE, ICSE, etc.)
- 🔔 **Push Notifications** via Firebase (mobile & web)
- ⚡ **Queue Processing** with Redis for background tasks
- 📦 **File Storage** on AWS S3 for recordings and media

---

## 🏗️ Architecture & Tech Stack

### Core Technologies

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Database** | MongoDB Atlas |
| **File Storage** | AWS S3 |
| **Video SDK** | Agora |
| **Real-time** | Socket.io |
| **Queue** | Redis (BullMQ/Bee-Queue) |
| **Payment** | Cashfree |
| **Notifications** | Firebase Cloud Messaging |
| **File Upload** | Multer + Cloudinary |
| **Email** | Nodemailer (SMTP) |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Student    │  │   Teacher    │  │    Admin     │     │
│  │     App      │  │     App      │  │    Panel     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │      Express.js Backend API         │
          │  ┌──────────────────────────────┐  │
          │  │   REST API + Socket.io        │  │
          │  └──────────────────────────────┘  │
          └───────────┬────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───┐      ┌──────▼──────┐   ┌─────▼─────┐
│MongoDB│      │    Redis    │   │  AWS S3   │
│ Atlas │      │   (Queue)   │   │(Recordings)│
└───────┘      └─────────────┘   └───────────┘
    │
    │
┌───▼──────────────┐
│  External APIs   │
│  ┌────────────┐  │
│  │   Agora    │  │
│  │  Razorpay  │  │
│  │  Firebase  │  │
│  │ Cloudinary │  │
│  └────────────┘  │
└──────────────────┘
```

---

## ✨ Features

### 1. **User Management**
- Multi-role system (Student, Teacher, Admin)
- OTP-based authentication (Mobile number + OTP)
- No password required
- Profile management
- Role-based access control
- Phone number verification

### 2. **Live Classes**
- Agora-powered video conferencing
- Real-time audio/video streaming
- Student mute/unmute controls
- Hand-raise functionality
- Interactive Q&A during class

### 3. **Recording System**
- Automatic recording of live classes
- Local storage during recording
- Background upload to S3
- Automatic local cleanup
- HLS streaming for playback
- Chat replay with recordings

### 4. **Real-time Chat**
- Socket.io-based chat during live classes
- Message persistence
- Chat replay with recordings
- Emoji support
- File sharing (optional)

### 5. **Course Management**
- Courses organized by class (9th, 10th, 11th, 12th)
- Board-based categorization (CBSE, ICSE, State Boards)
- Subject-wise organization
- Chapter-wise content structure

### 6. **Subscription System**
- Razorpay payment integration
- Multiple subscription plans
- Auto-renewal support
- Access control based on subscription status

### 7. **Timetable Management**
- Admin-created class schedules
- Teacher assignment to slots
- Conflict detection
- Calendar view
- **Automatic teacher notifications** when timetable is created
- **Automatic student notifications** when live class starts

### 8. **Notifications**
- Firebase push notifications (Mobile & Web)
- Email notifications (SMTP)
- In-app notifications
- Class reminders
- **Smart notification targeting:**
  - Teachers notified based on timetable (class + board + subject)
  - Students notified based on class + board + subscription status
- Real-time notification delivery

### 9. **File Management**
- Cloudinary for images/media
- AWS S3 for recordings
- Automatic file optimization
- CDN delivery

---

## 📁 Project Structure

```
Dvision Backend/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   ├── cloudinary.js        # Cloudinary configuration
│   │   ├── redis.js             # Redis connection
│   │   ├── agora.js             # Agora SDK setup
│   │   └── razorpay.js          # Razorpay configuration
│   │
│   ├── controllers/
│   │   ├── authController.js    # Authentication (login, register)
│   │   ├── userController.js    # User CRUD operations
│   │   ├── classController.js   # Live class management
│   │   ├── recordingController.js # Recording operations
│   │   ├── courseController.js  # Course management
│   │   ├── subscriptionController.js # Subscription handling
│   │   ├── timetableController.js # Timetable management
│   │   ├── chatController.js    # Chat message handling
│   │   └── paymentController.js # Razorpay webhooks
│   │
│   ├── models/
│   │   ├── User.js              # User schema (Student/Teacher/Admin)
│   │   ├── ClassSession.js      # Live class session schema
│   │   ├── Recording.js         # Recording metadata
│   │   ├── Course.js            # Course schema
│   │   ├── Subscription.js      # Subscription plans & user subscriptions
│   │   ├── Timetable.js        # Class schedule schema
│   │   ├── ChatMessage.js      # Chat message schema
│   │   └── Payment.js           # Payment transaction schema
│   │
│   ├── routes/
│   │   ├── index.js             # Main router
│   │   ├── authRoutes.js        # Authentication routes
│   │   ├── userRoutes.js        # User routes
│   │   ├── classRoutes.js      # Live class routes
│   │   ├── recordingRoutes.js  # Recording routes
│   │   ├── courseRoutes.js     # Course routes
│   │   ├── subscriptionRoutes.js # Subscription routes
│   │   ├── timetableRoutes.js  # Timetable routes
│   │   ├── chatRoutes.js       # Chat routes
│   │   ├── paymentRoutes.js    # Payment webhooks
│   │   ├── uploadRoutes.js     # File upload routes
│   │   └── emailRoutes.js      # Email testing routes
│   │
│   ├── middlewares/
│   │   ├── auth.js              # JWT authentication
│   │   ├── authorize.js        # Role-based authorization
│   │   ├── upload.js           # Multer file upload
│   │   ├── errorHandler.js     # Global error handler
│   │   └── validateSubscription.js # Subscription validation
│   │
│   ├── services/
│   │   ├── agoraService.js      # Agora recording API calls
│   │   ├── s3Service.js         # AWS S3 upload/download
│   │   ├── recordingService.js  # Recording processing logic
│   │   ├── notificationService.js # Firebase notifications
│   │   └── emailService.js     # Email sending service
│   │
│   ├── workers/
│   │   ├── recordingWorker.js   # Redis worker for S3 uploads
│   │   └── notificationWorker.js # Background notification worker
│   │
│   ├── utils/
│   │   ├── asyncHandler.js     # Async error wrapper
│   │   ├── errorResponse.js    # Custom error class
│   │   ├── sendEmail.js        # Email utility
│   │   ├── logger.js           # Logging utility
│   │   └── validators.js       # Input validation helpers
│   │
│   ├── socket/
│   │   ├── socketServer.js     # Socket.io server setup
│   │   ├── chatHandler.js      # Chat event handlers
│   │   └── classHandler.js     # Class event handlers
│   │
│   └── server.js               # Express server entry point
│
├── recordings/                 # Local recording storage (temp)
│   └── {sessionId}/
│       ├── index.m3u8
│       └── *.ts files
│
├── .env                        # Environment variables
├── .env.example                # Environment template
├── .gitignore
├── package.json
└── README.md
```

---

## 🔄 System Flow & Workflows

### 1. **User Registration & Authentication Flow (OTP-Based)**

```
User Enters Mobile Number
    ↓
POST /api/auth/send-otp
Body: { phone: "+91XXXXXXXXXX", role: "student" | "teacher" }
    ↓
Backend:
    - Validate Phone Number Format
    - Generate 6-digit OTP
    - Store OTP in Redis (expires in 5 minutes)
    - Send OTP via SMS (Twilio/MessageBird) or Firebase
    ↓
Return: { success: true, message: "OTP sent" }
    ↓
User Enters OTP
    ↓
POST /api/auth/verify-otp
Body: { phone: "+91XXXXXXXXXX", otp: "123456" }
    ↓
Backend:
    - Verify OTP from Redis
    - Check if User Exists:
      - If EXISTS: Login → Generate JWT Token
      - If NOT EXISTS: Create New User → Generate JWT Token
    ↓
Return: { user, token, isNewUser: true/false }
    ↓
User Logged In / Registered
```

### 2. **Complete Class Creation Flow (Admin → Teacher → Student)**

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1: ADMIN CREATES TIMETABLE         │
└─────────────────────────────────────────────────────────────┘

Admin Logs In → Opens Admin Panel
    ↓
Admin Creates Timetable Slot
    ↓
POST /api/timetable
Body: {
  class: 10,
  board: "CBSE",
  subjectId: ObjectId,
  teacherId: ObjectId,
  dayOfWeek: 1, // Monday
  startTime: "09:00",
  endTime: "10:00"
}
    ↓
Backend:
    - Validate Timetable Data
    - Check for Conflicts
    - Save to MongoDB (Timetable Model)
    ↓
Backend Triggers Notification System:
    - Find All Teachers Matching:
      * Assigned Teacher (teacherId)
      * OR Teachers Teaching Same Subject + Class + Board
    ↓
Send Firebase Push Notification to Teachers:
    {
      title: "New Class Scheduled",
      body: "You have a class scheduled for Class 10 CBSE on Monday at 9:00 AM",
      data: {
        timetableId: "...",
        class: 10,
        board: "CBSE",
        subject: "Math",
        dayOfWeek: 1,
        startTime: "09:00"
      }
    }
    ↓
Notification Sent to Teacher's Mobile App
    ↓
Teacher Receives Notification


┌─────────────────────────────────────────────────────────────┐
│              PHASE 2: TEACHER CREATES LIVE CLASS           │
└─────────────────────────────────────────────────────────────┘

Teacher Opens App → Sees Notification
    ↓
Teacher Views Scheduled Timetable Slots
    ↓
GET /api/timetable/my-schedule
    ↓
Backend Returns:
    - Upcoming Classes
    - Past Classes
    - Today's Schedule
    ↓
Teacher Selects Timetable Slot → Clicks "Start Live Class"
    ↓
POST /api/classes/start
Body: {
  timetableId: ObjectId,
  title: "Algebra - Chapter 2",
  description: "Solving quadratic equations"
}
    ↓
Backend Validates:
    - Teacher's Subscription Active? ✓
    - Timetable Slot Valid? ✓
    - Current Time Matches Slot Time? ✓
    - No Active Class for This Slot? ✓
    ↓
Create ClassSession Document:
    {
      sessionId: "unique_id",
      timetableId: ObjectId,
      teacherId: ObjectId,
      subjectId: ObjectId,
      title: "Algebra - Chapter 2",
      status: "live",
      startTime: new Date(),
      class: 10,
      board: "CBSE"
    }
    ↓
Call Agora Cloud Recording API:
    - Acquire Resource
    - Start Recording
    ↓
Recording Saves to: /recordings/{sessionId}/
    ↓
Initialize Socket.io Room: `class:{sessionId}`
    ↓
Redis: Store Active Session
    ↓
Backend Finds All Students Matching:
    - class: 10
    - board: "CBSE"
    - subscription.status: "active"
    ↓
Send Firebase Push Notification to Students:
    {
      title: "Live Class Started!",
      body: "Algebra - Chapter 2 is now live. Join now!",
      data: {
        sessionId: "...",
        title: "Algebra - Chapter 2",
        teacherName: "Mr. Sharma",
        subject: "Math",
        action: "join_class"
      }
    }
    ↓
Notifications Sent to All Matching Students
    ↓
Return to Teacher: { sessionId, agoraToken, channelName }
    ↓
Teacher Joins Agora Channel


┌─────────────────────────────────────────────────────────────┐
│            PHASE 3: STUDENTS JOIN LIVE CLASS                │
└─────────────────────────────────────────────────────────────┘

Student Receives Push Notification
    ↓
Student Opens App → Sees "Live Class Started" Notification
    ↓
Student Taps Notification → Opens Class Details
    ↓
GET /api/classes/{sessionId}
    ↓
Backend Returns:
    {
      sessionId: "...",
      title: "Algebra - Chapter 2",
      teacherName: "Mr. Sharma",
      status: "live",
      participantsCount: 25,
      startTime: "..."
    }
    ↓
Student Clicks "Join Class"
    ↓
POST /api/classes/{sessionId}/join
    ↓
Backend Validates:
    - Student's Subscription Active? ✓
    - Class Matches Student's Class/Board? ✓
    - Class Still Live? ✓
    ↓
Generate Agora Token (Student Role)
    ↓
Add Student to Participants Array
    ↓
Socket.io: Student Joins Room `class:{sessionId}`
    ↓
Broadcast to Room: "user:joined" (Student Name)
    ↓
Return: { agoraToken, channelName, sessionInfo }
    ↓
Student Joins Agora Channel
    ↓
Live Class in Progress...
```

### 3. **Student Joins Live Class Flow (After Notification)**

```
Student Receives Push Notification
    ↓
Student Opens App → Views Live Classes
    ↓
GET /api/classes/available
    ↓
Backend Checks:
    - Subscription Active? ✓
    - Class Matches Student's Class/Board? ✓
    - Filter by status: "live"
    ↓
Return List of Live Classes
    ↓
Student Selects Class (from notification or list)
    ↓
POST /api/classes/{sessionId}/join
    ↓
Backend Generates Agora Token (Student Role)
    ↓
Add Student to Participants Array
    ↓
Socket.io: Join Room {sessionId}
    ↓
Broadcast: "user:joined" to all participants
    ↓
Return: { agoraToken, channelName, sessionInfo }
    ↓
Student Joins Agora Channel
```

### 4. **Notification Flow Summary**

```
Admin Creates Timetable
    ↓
Backend Finds Matching Teachers
    ↓
Firebase Push Notification → Teachers
    ↓
Teacher Creates Live Class
    ↓
Backend Finds Matching Students (by class + board + subscription)
    ↓
Firebase Push Notification → Students
    ↓
Students Join Live Class
```

**Notification Matching Logic:**

1. **Teacher Notifications (After Timetable Creation):**
   ```javascript
   // Find teachers assigned to this timetable OR teaching same subject
   const teachers = await User.find({
     role: 'teacher',
     $or: [
       { _id: timetable.teacherId },
       { 
         subjects: timetable.subjectId,
         classes: timetable.class,
         boards: timetable.board
       }
     ]
   });
   ```

2. **Student Notifications (After Class Start):**
   ```javascript
   // Find students matching class, board, and active subscription
   const students = await User.find({
     role: 'student',
     class: session.class,
     board: session.board,
     'subscription.status': 'active',
     'subscription.endDate': { $gt: new Date() }
   });
   ```

### 5. **Chat During Live Class Flow**

```
Student Sends Message
    ↓
Socket.io Event: 'chat:message'
    ↓
Backend:
    - Validate User in Session
    - Save to MongoDB (ChatMessage)
    - Cache in Redis (for replay)
    ↓
Broadcast to All in Room
    ↓
All Participants Receive Message
```

### 6. **Recording Processing Flow (End-to-End)**

```
Teacher Ends Class
    ↓
POST /api/classes/{sessionId}/end
    ↓
Backend:
    - Call Agora: Stop Recording
    - Finalize Local Recording
    - Update ClassSession: status = "processing"
    ↓
Create Redis Job:
{
  type: 'UPLOAD_TO_S3',
  sessionId: 'xxx',
  localPath: '/recordings/xxx/',
  destinationS3Path: 'recordings/xxx/'
}
    ↓
[Background Worker Picks Up Job]
    ↓
Worker Process:
    1. Check Local Folder Exists
    2. Convert to MP4 (if needed) via ffmpeg
    3. Upload to S3 (Multipart for large files)
    4. Update MongoDB:
       - ClassSession.recordingUrl = S3_URL
       - ClassSession.status = "uploaded"
    5. Delete Local Files
    6. Send Firebase Notification: "Recording Available"
    ↓
Student Can Now Access Recording
```

### 7. **Subscription & Payment Flow**

```
Student Selects Subscription Plan
    ↓
POST /api/payment/create-order
    ↓
Backend:
    - Create Cashfree Order
    - Store Order in MongoDB
    ↓
Return: { orderId, paymentSessionId, amount, clientId, environment }
    ↓
Student Completes Payment (Cashfree)
    ↓
[Cashfree Webhook] → POST /api/payment/webhook
    ↓
Backend Validates Signature
    ↓
Update Subscription:
    - status = "active"
    - startDate, endDate
    - paymentId
    ↓
Send Confirmation Email + Notification
```

### 8. **Student Views Recording Flow**

```
Student Opens Course → Subject → Chapter
    ↓
GET /api/recordings?class=10&board=CBSE&subject=Math
    ↓
Backend:
    - Check Subscription Active
    - Filter by Class/Board/Subject
    - Return Recordings with Status
    ↓
If status = "processing":
    Return: { status: "processing", message: "Recording being prepared" }
    ↓
If status = "uploaded":
    Return: {
      title, recordingUrl (S3), chatReplay, duration, thumbnail
    }
    ↓
Student Plays Recording (HLS Stream)
```

---

## 🗄️ Database Schema

### User Model

```javascript
{
  _id: ObjectId,
  name: String,
  phone: String (unique, required), // Primary identifier for OTP login
  email: String (optional), // Optional, not required for login
  role: Enum ['student', 'teacher', 'admin'],
  class: Number, // For students: 9, 10, 11, 12
  board: String, // CBSE, ICSE, State Board
  subjects: [ObjectId], // For teachers: subjects they teach
  classes: [Number], // For teachers: classes they teach (9, 10, 11, 12)
  boards: [String], // For teachers: boards they teach (CBSE, ICSE, etc.)
  isActive: Boolean,
  isPhoneVerified: Boolean, // Verified via OTP
  lastOtpSentAt: Date, // Rate limiting for OTP
  subscription: {
    status: Enum ['active', 'expired', 'none'],
    planId: ObjectId,
    startDate: Date,
    endDate: Date
  },
  fcmToken: String, // For push notifications
  createdAt: Date,
  updatedAt: Date
}
```

### OTP Model (Redis/Temporary Storage)

```javascript
// Stored in Redis with key: `otp:{phone}`
{
  phone: String,
  otp: String (6 digits),
  expiresAt: Date, // 5 minutes from creation
  attempts: Number, // Max 3 attempts
  verified: Boolean
}
```

### ClassSession Model

```javascript
{
  _id: ObjectId,
  sessionId: String (unique),
  subjectId: ObjectId,
  teacherId: ObjectId,
  timetableId: ObjectId,
  title: String,
  description: String,
  startTime: Date,
  endTime: Date,
  status: Enum ['scheduled', 'live', 'ended', 'processing', 'uploaded', 'failed'],
  agoraChannelName: String,
  recordingUrl: String, // S3 URL after upload
  localRecordingPath: String, // Temp path
  recordingStatus: Enum ['not_started', 'recording', 'stopped', 'uploading', 'uploaded'],
  participants: [{
    userId: ObjectId,
    joinedAt: Date,
    leftAt: Date
  }],
  chatEnabled: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Recording Model

```javascript
{
  _id: ObjectId,
  sessionId: ObjectId,
  title: String,
  description: String,
  s3Url: String,
  s3Key: String,
  duration: Number, // in seconds
  fileSize: Number, // in bytes
  format: String, // mp4, m3u8
  thumbnailUrl: String,
  status: Enum ['processing', 'uploaded', 'failed'],
  uploadStartedAt: Date,
  uploadCompletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Course Model

```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  class: Number, // 9, 10, 11, 12
  board: String, // CBSE, ICSE, etc.
  subject: String, // Math, Science, etc.
  chapters: [{
    chapterNumber: Number,
    title: String,
    description: String,
    sessions: [ObjectId] // ClassSession IDs
  }],
  thumbnail: String, // Cloudinary URL
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Subscription Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  planId: ObjectId,
  status: Enum ['active', 'expired', 'cancelled'],
  startDate: Date,
  endDate: Date,
  autoRenew: Boolean,
  paymentId: String, // Razorpay payment ID
  orderId: String, // Razorpay order ID
  amount: Number,
  currency: String,
  createdAt: Date,
  updatedAt: Date
}
```

### SubscriptionPlan Model

```javascript
{
  _id: ObjectId,
  name: String, // "Monthly", "Quarterly", "Yearly"
  duration: Number, // in days
  price: Number,
  features: [String],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Timetable Model

```javascript
{
  _id: ObjectId,
  class: Number,
  board: String,
  subjectId: ObjectId,
  teacherId: ObjectId,
  dayOfWeek: Number, // 0-6 (Sunday-Saturday)
  startTime: String, // "09:00"
  endTime: String, // "10:00"
  timezone: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### ChatMessage Model

```javascript
{
  _id: ObjectId,
  sessionId: ObjectId,
  userId: ObjectId,
  userName: String,
  message: String,
  messageType: Enum ['text', 'emoji', 'file'],
  timestamp: Date,
  isReplay: Boolean, // For chat replay with recordings
  createdAt: Date
}
```

### Payment Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  cashfreeOrderId: String, // Cashfree order ID
  cashfreePaymentId: String, // Cashfree payment ID
  amount: Number,
  currency: String,
  status: Enum ['pending', 'completed', 'failed', 'refunded'],
  razorpaySignature: String,
  subscriptionId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🛣️ API Endpoints

### Authentication (OTP-Based)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/send-otp` | Send OTP to mobile number | No |
| POST | `/api/auth/verify-otp` | Verify OTP and login/register | No |
| POST | `/api/auth/resend-otp` | Resend OTP (rate limited) | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| POST | `/api/auth/refresh` | Refresh JWT token | Yes |
| GET | `/api/auth/me` | Get current user | Yes |

### Users

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/users` | Get all users | Yes | Admin |
| GET | `/api/users/:id` | Get user by ID | Yes | Admin |
| PUT | `/api/users/:id` | Update user | Yes | Admin/Self |
| DELETE | `/api/users/:id` | Delete user | Yes | Admin |

### Live Classes

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/classes/start` | Start live class | Yes | Teacher |
| POST | `/api/classes/:sessionId/end` | End live class | Yes | Teacher |
| GET | `/api/classes/available` | Get available classes | Yes | Student |
| POST | `/api/classes/:sessionId/join` | Join live class | Yes | Student |
| GET | `/api/classes/:sessionId` | Get class details | Yes | All |
| GET | `/api/classes` | Get all classes | Yes | Admin |

### Recordings

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/recordings` | Get recordings (filtered) | Yes | Student |
| GET | `/api/recordings/:id` | Get recording details | Yes | Student |
| GET | `/api/recordings/:id/chat` | Get chat replay | Yes | Student |
| POST | `/api/recordings/:id/like` | Like recording | Yes | Student |

### Courses

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/courses` | Get courses (filtered) | Yes | Student |
| GET | `/api/courses/:id` | Get course details | Yes | Student |
| POST | `/api/courses` | Create course | Yes | Admin |
| PUT | `/api/courses/:id` | Update course | Yes | Admin |
| DELETE | `/api/courses/:id` | Delete course | Yes | Admin |

### Subscriptions

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/subscriptions/plans` | Get subscription plans | No | - |
| GET | `/api/subscriptions/my-subscription` | Get my subscription | Yes | Student |
| POST | `/api/subscriptions/create-order` | Create Razorpay order | Yes | Student |
| POST | `/api/subscriptions/cancel` | Cancel subscription | Yes | Student |

### Timetable

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/timetable` | Get timetable | Yes | All |
| GET | `/api/timetable/my-schedule` | Get my schedule (teacher) | Yes | Teacher |
| POST | `/api/timetable` | Create timetable slot | Yes | Admin |
| PUT | `/api/timetable/:id` | Update timetable | Yes | Admin |
| DELETE | `/api/timetable/:id` | Delete timetable | Yes | Admin |
| POST | `/api/timetable/:id/notify-teachers` | Manually notify teachers | Yes | Admin |

### Chat (Socket.io Events)

| Event | Description | Auth |
|-------|-------------|------|
| `chat:message` | Send chat message | Yes |
| `chat:typing` | User typing indicator | Yes |
| `class:hand-raise` | Raise hand for question | Yes |
| `class:mute-toggle` | Mute/unmute audio | Yes |

### Payments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payment/webhook` | Cashfree webhook | No (signed) |
| POST | `/api/payment/create-order` | Create Cashfree order | Yes (Student) |
| POST | `/api/payment/verify` | Verify payment | Yes (Student) |

### File Upload

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/upload/single` | Upload single file | Yes |
| POST | `/api/upload/multiple` | Upload multiple files | Yes |

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
- AWS S3 bucket
- Agora account
- Cashfree account
- Redis server (local or cloud)
- Firebase project

### Step 1: Clone Repository

```bash
git clone https://github.com/Srthk-08/Dvision-Academy-Backend.git
cd Dvision-Academy-Backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://dvisionacademy:dvisionacademy@cluster0.zhfohbt.mongodb.net/?appName=Cluster0

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=denl6ozbj
CLOUDINARY_API_KEY=734143469316573
CLOUDINARY_API_SECRET=fSZQAMcP4SAAw7HqahMEZmh2mss

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=DvisionAcademy9@gmail.com
SMTP_PASS=rjusgixquyxbnson

# Agora
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate
AGORA_CUSTOMER_ID=your_customer_id
AGORA_CUSTOMER_SECRET=your_customer_secret

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your_bucket_name
AWS_S3_RECORDINGS_FOLDER=recordings

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=


# Cashfree Test Credentials (Optional - for testing)
# TEST_CF_CLIENT_ID=your_test_client_id
# TEST_CF_SECRET=your_test_secret_key
# Set CF_ENV=TEST to use test credentials

# Firebase
FIREBASE_SERVER_KEY=your_firebase_server_key
FIREBASE_PROJECT_ID=your_project_id

# OTP Configuration
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_PROVIDER=firebase  # or 'twilio', 'messagebird'

# Recording Settings
RECORDING_STORAGE_PATH=./recordings
RECORDING_MAX_SIZE_GB=5
RECORDING_RETENTION_DAYS=90
```

### Step 4: Start Redis Server

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
redis-server
```

### Step 5: Run the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### Step 6: Start Background Workers

```bash
# In a separate terminal
node src/workers/recordingWorker.js
node src/workers/notificationWorker.js
```

---

## 🔄 Recording System Flow (Detailed)

### Phase 1: Recording Start

1. **Teacher Initiates Class**
   ```
   POST /api/classes/start
   Body: { timetableId, subjectId, title }
   ```

2. **Backend Validations**
   - Check teacher's subscription status
   - Verify timetable slot is valid
   - Check no conflicting session exists

3. **Agora Recording Setup**
   ```javascript
   // Acquire resource
   const resourceId = await agoraService.acquire({
     cname: channelName,
     uid: "0" // Server recording UID
   });

   // Start recording
   const sid = await agoraService.start({
     resourceId,
     cname: channelName,
     storageConfig: {
       vendor: 0, // Agora Cloud Storage
       region: 0, // Auto-select
       bucket: process.env.AGORA_BUCKET,
       accessKey: process.env.AGORA_ACCESS_KEY,
       secretKey: process.env.AGORA_SECRET_KEY
     }
   });
   ```

4. **Local Storage Setup**
   - Create directory: `/recordings/{sessionId}/`
   - Agora saves files locally (if configured)
   - Monitor recording status via webhooks

### Phase 2: During Recording

- **Real-time Monitoring**
  - Agora webhooks notify on recording events
  - Store recording chunks in local directory
  - Update session status in MongoDB

- **Chat Storage**
  - All chat messages saved to MongoDB
  - Cached in Redis for quick replay

### Phase 3: Recording Stop

1. **Teacher Ends Class**
   ```
   POST /api/classes/{sessionId}/end
   ```

2. **Stop Agora Recording**
   ```javascript
   await agoraService.stop({
     resourceId,
     sid,
     cname: channelName
   });
   ```

3. **Finalize Local Recording**
   - Agora finalizes files in local directory
   - Structure:
     ```
     /recordings/{sessionId}/
       ├── index.m3u8
       ├── 0001.ts
       ├── 0002.ts
       └── ...
     ```

4. **Create Redis Job**
   ```javascript
   await redisQueue.add('UPLOAD_TO_S3', {
     sessionId,
     localPath: `/recordings/${sessionId}/`,
     destinationS3Path: `recordings/${sessionId}/`,
     metadata: {
       title,
       teacherId,
       subjectId
     }
   });
   ```

### Phase 4: Background Worker Processing

**Worker Flow:**

```javascript
// src/workers/recordingWorker.js
const worker = new Worker('UPLOAD_TO_S3', async (job) => {
  const { sessionId, localPath, destinationS3Path } = job.data;

  try {
    // 1. Validate local files exist
    if (!fs.existsSync(localPath)) {
      throw new Error('Local recording not found');
    }

    // 2. Convert to MP4 (if needed)
    const mp4Path = await convertToMP4(localPath, sessionId);

    // 3. Upload to S3 (Multipart for large files)
    const s3Url = await s3Service.upload({
      localPath: mp4Path,
      s3Key: `${destinationS3Path}/recording.mp4`,
      contentType: 'video/mp4'
    });

    // 4. Upload HLS files (if using HLS)
    await s3Service.uploadDirectory({
      localPath,
      s3Prefix: destinationS3Path
    });

    // 5. Update MongoDB
    await ClassSession.updateOne(
      { sessionId },
      {
        recordingUrl: s3Url,
        status: 'uploaded',
        recordingStatus: 'uploaded'
      }
    );

    // 6. Delete local files
    await fs.rm(localPath, { recursive: true });

    // 7. Send notification
    await notificationService.send({
      userIds: session.participants,
      title: 'Recording Available',
      body: `Recording for ${session.title} is now available`
    });

    return { success: true, s3Url };
  } catch (error) {
    // Retry logic
    throw error;
  }
});
```

### Phase 5: Student Playback

1. **Student Requests Recording**
   ```
   GET /api/recordings?class=10&board=CBSE&subject=Math
   ```

2. **Backend Returns**
   ```json
   {
     "success": true,
     "data": [
       {
         "_id": "...",
         "title": "Algebra - Chapter 2",
         "recordingUrl": "https://s3.amazonaws.com/.../recording.mp4",
         "thumbnailUrl": "https://cloudinary.com/...",
         "duration": 2700,
         "chatReplay": true,
         "status": "uploaded"
       }
     ]
   }
   ```

3. **Student Plays Recording**
   - Frontend uses video player (Video.js, Plyr, etc.)
   - For HLS: Use HLS.js
   - Chat replay syncs with video timeline

---

## ⚠️ Edge Cases & Error Handling

### Edge Case 1: Server Crashed During Recording

**Problem:** Recording in progress, server restarts.

**Solution:**
```javascript
// On server startup, check Redis for active sessions
const activeSessions = await redis.get('active_sessions');

for (const sessionId of activeSessions) {
  const session = await ClassSession.findById(sessionId);
  
  if (session.status === 'live') {
    // Check Agora status
    const agoraStatus = await agoraService.query({
      resourceId: session.resourceId,
      sid: session.sid
    });
    
    if (agoraStatus.serverResponse.status === 2) { // Recording
      // Resume normally
    } else {
      // Mark as incomplete, notify admin
      await session.updateOne({ status: 'failed' });
    }
  }
}
```

### Edge Case 2: Upload Failed (Network Issue)

**Problem:** S3 upload fails due to network error.

**Solution:**
- Redis job automatically retries (3 attempts)
- Exponential backoff
- If all retries fail, mark as "failed" and alert admin
- Admin can manually trigger re-upload

### Edge Case 3: Local Folder Missing

**Problem:** Worker can't find local recording files.

**Solution:**
```javascript
if (!fs.existsSync(localPath)) {
  // Check if already uploaded
  const session = await ClassSession.findById(sessionId);
  
  if (session.recordingUrl) {
    // Already uploaded, skip
    return { success: true, skipped: true };
  }
  
  // Mark as failed
  await session.updateOne({ status: 'failed' });
  await notificationService.sendAdminAlert({
    message: `Recording ${sessionId} local files missing`
  });
  
  throw new Error('Local recording not found');
}
```

### Edge Case 4: S3 Upload Huge Size (>5GB)

**Problem:** Large recordings timeout on single upload.

**Solution:**
```javascript
// Use multipart upload for files > 100MB
const fileSize = fs.statSync(localPath).size;

if (fileSize > 100 * 1024 * 1024) {
  // Multipart upload
  const upload = await s3Service.multipartUpload({
    localPath,
    s3Key,
    partSize: 100 * 1024 * 1024 // 100MB parts
  });
} else {
  // Single upload
  await s3Service.upload({ localPath, s3Key });
}
```

### Edge Case 5: Student Plays Before Upload Complete

**Problem:** Student requests recording while still uploading.

**Solution:**
```javascript
// API returns processing status
if (session.status === 'processing') {
  return res.json({
    success: true,
    data: {
      ...session,
      status: 'processing',
      message: 'Recording is being prepared. Please check back in a few minutes.'
    }
  });
}
```

### Edge Case 6: Duplicate Upload

**Problem:** Worker tries to upload same recording twice.

**Solution:**
```javascript
// Check if S3 object already exists
const exists = await s3Service.checkExists(s3Key);

if (exists) {
  // Skip upload, just update DB and delete local
  await ClassSession.updateOne(
    { sessionId },
    { recordingUrl: s3Url, status: 'uploaded' }
  );
  await fs.rm(localPath, { recursive: true });
  return { success: true, skipped: true };
}
```

### Edge Case 7: Teacher Ends Class by Killing App

**Problem:** Teacher force-closes app, class doesn't end properly.

**Solution:**
```javascript
// Backend timeout auto-stop after 2 hours
setTimeout(async () => {
  const session = await ClassSession.findById(sessionId);
  
  if (session.status === 'live') {
    // Auto-end class
    await agoraService.stop({ ... });
    await createUploadJob(sessionId);
  }
}, 2 * 60 * 60 * 1000); // 2 hours
```

### Edge Case 8: Subscription Expires During Class

**Problem:** Student's subscription expires mid-class.

**Solution:**
```javascript
// Validate subscription on join
const subscription = await Subscription.findOne({
  userId: studentId,
  status: 'active',
  endDate: { $gt: new Date() }
});

if (!subscription) {
  throw new ErrorResponse('Subscription expired. Please renew to continue.', 403);
}
```

### Edge Case 9: Agora Recording Fails

**Problem:** Agora API returns error during recording start.

**Solution:**
```javascript
try {
  const recording = await agoraService.start({ ... });
} catch (error) {
  // Log error
  logger.error('Agora recording failed', error);
  
  // Update session
  await ClassSession.updateOne(
    { sessionId },
    { status: 'failed', error: error.message }
  );
  
  // Notify teacher
  await notificationService.send({
    userId: teacherId,
    title: 'Recording Failed',
    body: 'Unable to start recording. Please try again.'
  });
  
  // Still allow class to proceed (without recording)
}
```

### Edge Case 10: Redis Queue Full

**Problem:** Too many upload jobs, queue overloaded.

**Solution:**
```javascript
// Implement queue limits
const queue = new Queue('UPLOAD_TO_S3', {
  redis: redisConfig,
  limiter: {
    max: 10, // Max 10 concurrent jobs
    duration: 1000
  }
});

// Monitor queue size
if (await queue.getWaitingCount() > 100) {
  // Alert admin
  await sendAdminAlert('Upload queue is full');
}
```

---

## 🎯 Best Practices

### 1. **Recording Storage**

- ✅ Use HLS (.m3u8) format for better streaming
- ✅ Implement CDN (CloudFront) for fast playback
- ✅ Use S3 lifecycle policies to move old recordings to Glacier
- ✅ Generate thumbnails for video previews
- ✅ Store metadata (duration, size) in MongoDB

### 2. **Security**

- ✅ Validate all Agora tokens server-side
- ✅ Implement rate limiting on API endpoints
- ✅ Use HTTPS for all API calls
- ✅ Sanitize user inputs
- ✅ Implement CORS properly
- ✅ Secure Razorpay webhook signatures

### 3. **Performance**

- ✅ Use Redis caching for frequently accessed data
- ✅ Implement pagination for list endpoints
- ✅ Use database indexes on frequently queried fields
- ✅ Optimize image/video uploads (compress before upload)
- ✅ Use connection pooling for MongoDB

### 4. **Monitoring & Logging**

- ✅ Log all recording operations
- ✅ Monitor Redis queue health
- ✅ Track API response times
- ✅ Set up error alerting (Sentry, etc.)
- ✅ Monitor S3 storage usage

### 5. **Scalability**

- ✅ Use horizontal scaling (multiple server instances)
- ✅ Use Redis for session management (not in-memory)
- ✅ Implement load balancing
- ✅ Use message queues for async operations
- ✅ Consider using AWS MediaConvert for video transcoding

### 6. **Code Quality**

- ✅ Use async/await consistently
- ✅ Implement proper error handling
- ✅ Write unit tests for critical functions
- ✅ Use TypeScript (optional but recommended)
- ✅ Follow RESTful API conventions
- ✅ Document API endpoints (Swagger/OpenAPI)

---

## 📝 Additional Notes

### OTP Authentication Details

**OTP Generation:**
- 6-digit random number
- Stored in Redis with 5-minute expiry
- Rate limited: Max 3 attempts per OTP
- Resend cooldown: 60 seconds

**OTP Flow:**
1. User enters phone number
2. Backend generates OTP
3. OTP sent via SMS (Twilio/MessageBird) or Firebase
4. User enters OTP
5. Backend verifies OTP
6. If user exists → Login, else → Register + Login
7. JWT token returned

**Security:**
- OTP expires in 5 minutes
- Max 3 verification attempts
- Rate limiting on OTP requests
- Phone number format validation
- OTP stored in Redis (not database)

### Notification Targeting Logic

**When Admin Creates Timetable:**
```javascript
// Find teachers to notify
const teachers = await User.find({
  role: 'teacher',
  $or: [
    { _id: timetable.teacherId }, // Assigned teacher
    {
      subjects: timetable.subjectId,
      classes: { $in: [timetable.class] },
      boards: { $in: [timetable.board] }
    }
  ],
  fcmToken: { $exists: true, $ne: null }
});
```

**When Teacher Starts Live Class:**
```javascript
// Find students to notify
const students = await User.find({
  role: 'student',
  class: session.class,
  board: session.board,
  'subscription.status': 'active',
  'subscription.endDate': { $gt: new Date() },
  fcmToken: { $exists: true, $ne: null }
});
```

### WebSocket Events (Socket.io)

**Client → Server:**
- `join:class` - Join class room
- `leave:class` - Leave class room
- `chat:message` - Send chat message
- `chat:typing` - Typing indicator
- `class:hand-raise` - Raise hand
- `class:mute-toggle` - Toggle mute

**Server → Client:**
- `chat:new-message` - New chat message
- `class:user-joined` - User joined class
- `class:user-left` - User left class
- `class:recording-started` - Recording started
- `class:recording-stopped` - Recording stopped
- `notification:new` - New notification

### Agora Integration Points

1. **Token Generation** - Server generates tokens for users
2. **Recording API** - Server controls recording start/stop
3. **Webhooks** - Agora sends events to your webhook endpoint
4. **Channel Management** - Server manages channel permissions

### Razorpay Webhook Events

- `payment.captured` - Payment successful
- `payment.failed` - Payment failed
- `order.paid` - Order completed
- `subscription.activated` - Subscription activated
- `subscription.cancelled` - Subscription cancelled

---

## 🔗 External Resources

- [Agora Documentation](https://docs.agora.io/)
- [Cashfree API Docs](https://docs.cashfree.com/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Socket.io Documentation](https://socket.io/docs/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Redis Documentation](https://redis.io/documentation)

---

## 📄 License

ISC

---

## 👥 Contributors

- Backend Development Team

---

**Last Updated:** 2024
