# Dvision Academy - Architecture & Codebase Analysis

## 📋 Executive Summary

Dvision Academy is a comprehensive online education platform built with a **Node.js/Express backend** and **React/Vite frontend**. The system supports three user roles (Student, Teacher, Admin) with features including live classes, video recordings, quizzes, subscriptions, and real-time notifications.

---

## 🏗️ System Architecture

### Technology Stack

#### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB (Mongoose 8.0.3)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Real-time**: Socket.io 4.8.1
- **Video SDK**: Agora (agora-token, agora-access-token)
- **Payment**: Razorpay 2.9.2
- **Notifications**: Firebase Admin SDK 12.0.0
- **File Storage**: AWS S3 SDK, Cloudinary
- **Queue/Cache**: Redis 4.6.11
- **Scheduling**: node-cron 4.2.1
- **Email**: Nodemailer 6.9.15

#### Frontend
- **Framework**: React 18.3.1
- **Build Tool**: Vite 7.2.4
- **Routing**: React Router DOM 6.30.2
- **Styling**: Tailwind CSS 4.1.17
- **Video SDK**: agora-rtc-sdk-ng 4.24.1
- **Real-time**: Socket.io Client 4.8.1
- **Notifications**: Firebase 12.6.0
- **Icons**: React Icons 5.5.0

---

## 🔧 Backend Architecture

### Directory Structure
```
backend/
├── config/          # Configuration files (DB, Firebase, Redis, Agora, Razorpay, Cloudinary)
├── controllers/     # Business logic handlers (20+ controllers)
├── middlewares/     # Auth, error handling, file upload
├── models/          # Mongoose schemas (18 models)
├── routes/          # API route definitions
├── services/        # External service integrations
├── utils/           # Helper functions
└── server.js        # Application entry point
```

### Key Backend Components

#### 1. **Authentication System**
- **Location**: `middlewares/auth.js`
- **Method**: JWT-based with role-based access control (RBAC)
- **Token Storage**: Multiple sources supported (Bearer, cookies, headers, query params)
- **Roles**: `student`, `teacher`, `admin`
- **Features**:
  - Token verification with automatic user lookup
  - Active user status checking
  - Role-based authorization middleware
  - Socket.io authentication integration

#### 2. **Database Models** (18 Models)
- **User Models**: `Student`, `Teacher`, `Admin`
- **Content Models**: `Course`, `Subject`, `Class`, `Quiz`, `QuizSubmission`
- **Live Class Models**: `LiveClass`, `Recording`, `Timetable`
- **Communication**: `Doubt`, `Notification`, `NotificationCampaign`
- **Business**: `SubscriptionPlan`, `Payment`
- **Content Management**: `Banner`, `AboutUs`, `Privacy`, `Terms`, `ContactInfo`, `Example`

**Key Relationships**:
- Students → Classes → Subjects → Courses
- Teachers → Subjects (many-to-many via assignments)
- LiveClasses → Timetable → Class/Subject/Teacher
- Payments → SubscriptionPlans → Students
- Doubts → Students/Teachers (bidirectional)

#### 3. **API Routes Structure**
```
/api
├── /student          # Student-specific endpoints
├── /teacher          # Teacher-specific endpoints
├── /admin            # Admin management endpoints
├── /live-classes     # Live class operations
├── /timetables       # Schedule management
├── /quizzes          # Quiz operations
├── /doubts           # Q&A system
├── /notifications    # Push notifications
├── /payment          # Razorpay integration
├── /subscription-plans # Subscription management
├── /banners          # Banner management
├── /about, /privacy, /terms # Content pages
└── /upload           # File uploads
```

#### 4. **Services Layer**

**Agora Service** (`services/agoraService.js`)
- RTC token generation for live classes
- Channel name generation
- Recording token management

**Notification Service** (`services/notificationService.js`)
- Firebase Cloud Messaging integration
- Batch notifications
- Campaign management
- FCM token management

**S3 Service** (`services/s3Service.js`)
- Recording uploads to AWS S3
- Presigned URL generation
- File management

**OTP Service** (`services/otpService.js`)
- Redis-backed OTP storage
- Fallback to in-memory storage
- Rate limiting

**Schedulers**:
- `timetableScheduler.js` - Sends notifications before classes
- `subscriptionExpiryScheduler.js` - Handles subscription expiration

#### 5. **Real-time Communication**
- **Socket.io** integration in `config/socket.js`
- Features:
  - Live class room management
  - Real-time chat
  - Hand raise functionality
  - Participant tracking
  - Mute/video toggle events

#### 6. **Error Handling**
- Centralized error handler (`middlewares/errorHandler.js`)
- Custom error response class (`utils/errorResponse.js`)
- Async handler wrapper (`utils/asyncHandler.js`)

---

## 🎨 Frontend Architecture

### Directory Structure
```
frontend/
├── src/
│   ├── modules/
│   │   ├── student/      # Student module (35+ pages)
│   │   ├── teacher/      # Teacher module (23+ pages)
│   │   └── admin/        # Admin module (30+ pages)
│   ├── services/         # API service layer
│   └── App.jsx           # Main router
├── public/               # Static assets
└── vite.config.js        # Vite configuration
```

### Key Frontend Components

#### 1. **Module-Based Architecture**
Each module (student/teacher/admin) is self-contained with:
- **Pages**: Route components
- **Components**: Reusable UI components
- **Services**: Module-specific API calls
- **Context**: State management (AuthContext)
- **Utils**: Helper functions
- **Constants**: Route definitions, constants

#### 2. **Routing Structure**
- **Student Routes**: Root paths (`/dashboard`, `/live-classes`, etc.)
- **Admin Routes**: `/admin/*` prefix
- **Teacher Routes**: `/teacher/*` prefix
- **Protected Routes**: Wrapper components for authentication

#### 3. **API Service Layer**
- **Location**: `src/services/api.js`
- **Features**:
  - Centralized API base URL configuration
  - Token management (separate for admin/student)
  - Error handling
  - FormData support
  - Comprehensive API methods for all modules

**Key API Exports**:
- `studentAPI` - Student operations
- `teacherAPI` - Teacher operations
- `adminAPI` - Admin operations
- `liveClassAPI` - Live class operations
- `quizAPI` - Quiz management
- `paymentAPI` - Payment processing
- `notificationAPI` - Notifications
- `timetableAPI` - Schedule management
- And 10+ more specialized APIs

#### 4. **State Management**
- **React Context API** for authentication
- **Local Storage** for token persistence
- **Component-level state** with React hooks

#### 5. **Styling**
- **Tailwind CSS 4.1.17** with custom theme
- **Custom Colors**:
  - `dvision-blue` (primary brand color)
  - `dvision-orange` (accent color)
- **Responsive Design**: Mobile-first approach

#### 6. **Real-time Features**
- Socket.io client integration
- Agora RTC SDK for video/audio
- Firebase messaging for push notifications

---

## 🔐 Security & Authentication

### Backend Security
1. **JWT Authentication**
   - Secret key from environment variables
   - Token expiration handling
   - Multiple token source support

2. **Role-Based Access Control**
   - `protect` middleware for authentication
   - `authorize` middleware for role checking
   - Route-level protection

3. **Input Validation**
   - Express-validator integration
   - Mongoose schema validation
   - Phone number format validation

4. **CORS Configuration**
   - Environment-based origin whitelist
   - Development mode allows all origins
   - Credentials support

### Frontend Security
1. **Token Storage**
   - LocalStorage for tokens
   - Separate tokens for admin/student
   - Automatic token refresh on API calls

2. **Protected Routes**
   - Route-level authentication checks
   - Automatic redirect to login
   - Token validation on mount

---

## 📊 Database Schema Overview

### Core Entities

**Student**
- Phone-based authentication
- Class and board association
- Subscription status tracking
- FCM token for notifications

**Teacher**
- Phone-based authentication
- Subject assignments
- Live class management
- FCM token for notifications

**Admin**
- Email/password authentication
- Full system access
- Content management

**LiveClass**
- Timetable association
- Agora channel management
- Participant tracking
- Chat messages storage
- Recording status

**SubscriptionPlan**
- Board and class filtering
- Pricing and duration
- Active status management

**Payment**
- Razorpay integration
- Order tracking
- Payment verification
- Subscription linking

---

## 🔌 External Integrations

### 1. **Agora Video SDK**
- **Purpose**: Live video/audio streaming
- **Features**: RTC tokens, recording, channel management
- **Configuration**: App ID and Certificate required

### 2. **Razorpay**
- **Purpose**: Payment processing
- **Features**: Order creation, payment verification
- **Configuration**: Key ID and Secret required

### 3. **Firebase**
- **Purpose**: Push notifications
- **Features**: FCM token management, batch notifications
- **Configuration**: Service account key required

### 4. **AWS S3**
- **Purpose**: Recording storage
- **Features**: File upload, presigned URLs
- **Configuration**: Access keys and bucket name required

### 5. **Cloudinary**
- **Purpose**: Image storage
- **Features**: Profile images, banners
- **Configuration**: Cloud name, API key, secret required

### 6. **Redis**
- **Purpose**: OTP storage, caching
- **Features**: Rate limiting, session management
- **Configuration**: Optional (falls back to in-memory)

---

## 🚀 Key Features Implementation

### 1. **Live Classes**
- Agora RTC integration
- Socket.io for real-time features
- Recording capability
- Chat functionality
- Hand raise feature

### 2. **Quiz System**
- Multiple choice questions
- Time-based submissions
- Leaderboard
- Results tracking
- Teacher/Admin quiz creation

### 3. **Subscription Management**
- Razorpay payment integration
- Plan filtering by board/class
- Automatic expiration handling
- Payment history

### 4. **Notification System**
- Firebase push notifications
- In-app notifications
- Campaign management
- Filtered notifications (by class/board)

### 5. **Timetable System**
- Weekly schedule management
- Class-based timetables
- Notification scheduling
- Teacher schedule views

---

## 📝 Development Recommendations

### Backend Improvements

1. **Code Organization**
   - ✅ Well-structured MVC pattern
   - ⚠️ Consider service layer for complex business logic
   - ⚠️ Add request validation middleware

2. **Error Handling**
   - ✅ Centralized error handler
   - ⚠️ Add more specific error types
   - ⚠️ Implement error logging service

3. **Testing**
   - ❌ No test files found
   - 🔴 **CRITICAL**: Add unit tests for controllers
   - 🔴 **CRITICAL**: Add integration tests for API endpoints
   - 🟡 Add E2E tests for critical flows

4. **Documentation**
   - ✅ README exists
   - ⚠️ Add JSDoc comments to functions
   - ⚠️ API documentation (Swagger/OpenAPI)

5. **Performance**
   - ✅ Database indexes in place
   - ⚠️ Add query optimization
   - ⚠️ Implement caching strategy
   - ⚠️ Add rate limiting

6. **Security**
   - ✅ JWT authentication
   - ⚠️ Add request rate limiting
   - ⚠️ Add input sanitization
   - ⚠️ Add helmet.js for security headers
   - ⚠️ Implement CSRF protection

7. **Monitoring**
   - ❌ No logging service
   - 🔴 Add structured logging (Winston/Pino)
   - 🔴 Add error tracking (Sentry)
   - 🟡 Add performance monitoring

### Frontend Improvements

1. **State Management**
   - ⚠️ Consider Redux/Zustand for complex state
   - ⚠️ Add global error boundary
   - ⚠️ Implement loading states management

2. **Code Splitting**
   - ⚠️ Implement route-based code splitting
   - ⚠️ Lazy load heavy components
   - ⚠️ Optimize bundle size

3. **Error Handling**
   - ⚠️ Add global error boundary
   - ⚠️ Improve error messages
   - ⚠️ Add retry mechanisms

4. **Performance**
   - ⚠️ Implement React.memo for expensive components
   - ⚠️ Add virtual scrolling for long lists
   - ⚠️ Optimize image loading
   - ⚠️ Add service worker for offline support

5. **Testing**
   - ❌ No test files found
   - 🔴 Add unit tests (Jest + React Testing Library)
   - 🔴 Add component tests
   - 🟡 Add E2E tests (Playwright/Cypress)

6. **Accessibility**
   - ⚠️ Add ARIA labels
   - ⚠️ Keyboard navigation support
   - ⚠️ Screen reader optimization

7. **Type Safety**
   - ❌ No TypeScript
   - 🟡 Consider migrating to TypeScript
   - 🟡 Add PropTypes for components

---

## 🔄 Future Update Considerations

### High Priority

1. **Testing Infrastructure**
   - Set up Jest for backend
   - Set up React Testing Library for frontend
   - Add CI/CD pipeline

2. **Error Monitoring**
   - Integrate Sentry or similar
   - Add structured logging
   - Implement error alerting

3. **API Documentation**
   - Add Swagger/OpenAPI
   - Document all endpoints
   - Add request/response examples

4. **Performance Optimization**
   - Add Redis caching layer
   - Implement database query optimization
   - Add CDN for static assets

5. **Security Hardening**
   - Add rate limiting
   - Implement CSRF protection
   - Add security headers (helmet.js)
   - Regular dependency updates

### Medium Priority

1. **Code Quality**
   - Add ESLint rules
   - Add Prettier configuration
   - Set up pre-commit hooks (Husky)

2. **Type Safety**
   - Consider TypeScript migration
   - Add JSDoc type annotations
   - Use PropTypes in React

3. **Monitoring & Analytics**
   - Add application monitoring
   - Implement analytics tracking
   - Add performance metrics

4. **Documentation**
   - Add inline code documentation
   - Create developer onboarding guide
   - Document deployment process

### Low Priority

1. **Feature Enhancements**
   - Add dark mode
   - Improve mobile responsiveness
   - Add progressive web app features

2. **Developer Experience**
   - Add development scripts
   - Improve error messages
   - Add debugging tools

---

## 📦 Dependencies Overview

### Backend Critical Dependencies
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT handling
- `socket.io` - Real-time communication
- `agora-token` - Video SDK
- `razorpay` - Payment gateway
- `firebase-admin` - Push notifications
- `@aws-sdk/client-s3` - S3 storage
- `redis` - Caching/Queue
- `node-cron` - Scheduled tasks

### Frontend Critical Dependencies
- `react` + `react-dom` - UI framework
- `react-router-dom` - Routing
- `vite` - Build tool
- `tailwindcss` - Styling
- `agora-rtc-sdk-ng` - Video SDK
- `socket.io-client` - Real-time client
- `firebase` - Notifications

---

## 🗂️ File Organization Patterns

### Backend Patterns
- **Controllers**: Handle HTTP requests/responses
- **Models**: Define database schemas
- **Routes**: Define API endpoints
- **Services**: External integrations
- **Middlewares**: Request processing
- **Utils**: Helper functions

### Frontend Patterns
- **Modules**: Feature-based organization
- **Pages**: Route components
- **Components**: Reusable UI elements
- **Services**: API communication
- **Context**: Global state
- **Utils**: Helper functions

---

## 🔍 Code Quality Observations

### Strengths
✅ Clear separation of concerns
✅ Modular architecture
✅ Comprehensive feature set
✅ Good use of middleware
✅ Proper error handling structure
✅ Role-based access control

### Areas for Improvement
⚠️ Missing test coverage
⚠️ Limited documentation in code
⚠️ No type safety (TypeScript)
⚠️ Missing monitoring/logging
⚠️ No API documentation
⚠️ Limited error recovery mechanisms

---

## 📞 Integration Points

### External Services
1. **Agora** - Video streaming
2. **Razorpay** - Payments
3. **Firebase** - Notifications
4. **AWS S3** - File storage
5. **Cloudinary** - Image storage
6. **Redis** - Caching (optional)
7. **MongoDB Atlas** - Database

### Internal Services
1. **Socket.io** - Real-time communication
2. **Cron Jobs** - Scheduled tasks
3. **File Upload** - Multer middleware

---

## 🎯 Conclusion

The Dvision Academy codebase is **well-structured** with a clear separation between frontend and backend. The architecture supports three distinct user roles with comprehensive features. 

**Key Strengths**:
- Modular design
- Comprehensive feature set
- Good use of modern technologies
- Clear code organization

**Critical Improvements Needed**:
- Testing infrastructure
- Error monitoring
- API documentation
- Security hardening
- Performance optimization

This analysis serves as a foundation for future development and maintenance decisions.

---

**Last Updated**: $(date)
**Analysis Version**: 1.0

