# Dvision Academy - Developer Quick Reference

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
npm install
# Create .env file with required variables
npm run dev  # Development with nodemon
npm start    # Production
```

### Frontend Setup
```bash
cd frontend
npm install
# Create .env file with VITE_API_BASE_URL
npm run dev  # Development server
npm run build  # Production build
```

---

## 📁 Key File Locations

### Backend
| Purpose | Location |
|---------|----------|
| Server Entry | `backend/server.js` |
| Database Config | `backend/config/database.js` |
| Auth Middleware | `backend/middlewares/auth.js` |
| Routes | `backend/routes/index.js` |
| Models | `backend/models/` |
| Controllers | `backend/controllers/` |
| Services | `backend/services/` |

### Frontend
| Purpose | Location |
|---------|----------|
| Main Router | `frontend/src/App.jsx` |
| Student Module | `frontend/src/modules/student/` |
| Teacher Module | `frontend/src/modules/teacher/` |
| Admin Module | `frontend/src/modules/admin/` |
| API Services | `frontend/src/services/api.js` |
| Tailwind Config | `frontend/tailwind.config.js` |

---

## 🔑 Environment Variables

### Backend (.env)
```env
# Database
MONGODB_URI=mongodb://...

# JWT
JWT_SECRET=your-secret-key

# Agora
AGORA_APP_ID=your-app-id
APP_CERTIFICATE=your-certificate

# Razorpay
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-secret

# AWS S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=your-region
S3_BUCKET_NAME=your-bucket

# Firebase
# (Uses serviceAccountKey.json file)

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🔐 Authentication

### Backend
```javascript
// Protect route
const { protect } = require('./middlewares/auth');
router.get('/protected', protect, controller);

// Role-based access
const { protect, authorize } = require('./middlewares/auth');
router.get('/admin-only', protect, authorize('admin'), controller);
```

### Frontend
```javascript
// Student token
localStorage.getItem('dvision_token');

// Admin token
localStorage.getItem('dvision_admin_token');

// Protected route
<StudentProtectedRoute>
  <YourComponent />
</StudentProtectedRoute>
```

---

## 📡 API Patterns

### Making API Calls (Frontend)
```javascript
import { studentAPI } from '../services/api';

// GET request
const response = await studentAPI.getMe();

// POST request
const response = await studentAPI.register(phone, name, email, class, board);

// With error handling
try {
  const response = await studentAPI.getCourses();
  if (response.success) {
    // Handle success
  }
} catch (error) {
  // Handle error
  console.error(error.message);
}
```

### Creating API Endpoints (Backend)
```javascript
// Route
router.get('/endpoint', protect, controller.getData);

// Controller
exports.getData = asyncHandler(async (req, res, next) => {
  const data = await Model.find();
  res.status(200).json({
    success: true,
    data: data
  });
});
```

---

## 🗄️ Database Models

### Common Models
- `Student` - Student users
- `Teacher` - Teacher users
- `Admin` - Admin users
- `Class` - Class definitions
- `Subject` - Subject definitions
- `Course` - Course content
- `LiveClass` - Live class sessions
- `Quiz` - Quiz definitions
- `SubscriptionPlan` - Subscription plans
- `Payment` - Payment records

### Model Usage
```javascript
const Student = require('../models/Student');

// Create
const student = await Student.create(data);

// Find
const student = await Student.findById(id);

// Update
await Student.findByIdAndUpdate(id, data);

// Delete
await Student.findByIdAndDelete(id);
```

---

## 🎨 Frontend Patterns

### Creating a Page
```jsx
import { useState, useEffect } from 'react';
import { studentAPI } from '../services/api';

function MyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await studentAPI.getMe();
      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return <div>{/* Your UI */}</div>;
}
```

### Using Context
```jsx
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return <div>Hello, {user?.name}</div>;
}
```

---

## 🔌 Socket.io Usage

### Backend
```javascript
const io = req.app.get('io');

// Emit to specific room
io.to(`liveclass_${liveClassId}`).emit('event', data);

// Broadcast to all
io.emit('event', data);
```

### Frontend
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('dvision_token')
  }
});

socket.on('connect', () => {
  console.log('Connected');
});

socket.on('event', (data) => {
  // Handle event
});
```

---

## 🎥 Agora Video Integration

### Backend - Generate Token
```javascript
const agoraService = require('./services/agoraService');
const token = agoraService.generateRtcToken(channelName, uid, role);
```

### Frontend - Join Channel
```javascript
import AgoraRTC from 'agora-rtc-sdk-ng';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
await client.join(appId, channelName, token, uid);
```

---

## 💳 Payment Integration (Razorpay)

### Backend
```javascript
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order
const order = await razorpay.orders.create({
  amount: amount * 100, // in paise
  currency: 'INR'
});
```

### Frontend
```javascript
import { paymentAPI } from '../services/api';

// Create order
const response = await paymentAPI.createOrder(planId);

// Verify payment
await paymentAPI.verifyPayment(orderId, paymentId, signature);
```

---

## 🔔 Notifications

### Backend - Send Notification
```javascript
const notificationService = require('./services/notificationService');

await notificationService.sendToToken(fcmToken, {
  title: 'Title',
  body: 'Message'
}, { data: 'value' });
```

### Frontend - Initialize
```javascript
import { initializeNotifications } from '../utils/notifications';

// Initialize Firebase messaging
initializeNotifications();
```

---

## 📝 Common Tasks

### Adding a New API Endpoint

1. **Backend Route** (`routes/yourRoutes.js`)
```javascript
router.get('/new-endpoint', protect, controller.newMethod);
```

2. **Backend Controller** (`controllers/yourController.js`)
```javascript
exports.newMethod = asyncHandler(async (req, res, next) => {
  // Your logic
  res.status(200).json({ success: true, data: result });
});
```

3. **Frontend API** (`services/api.js`)
```javascript
export const yourAPI = {
  newMethod: async () => {
    return apiRequest('/your/new-endpoint', { method: 'GET' });
  }
};
```

4. **Frontend Usage**
```javascript
import { yourAPI } from '../services/api';
const response = await yourAPI.newMethod();
```

### Adding a New Model

1. **Create Model** (`models/YourModel.js`)
```javascript
const mongoose = require('mongoose');

const yourSchema = new mongoose.Schema({
  name: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('YourModel', yourSchema);
```

2. **Use in Controller**
```javascript
const YourModel = require('../models/YourModel');
const data = await YourModel.find();
```

### Adding a New Page

1. **Create Component** (`modules/student/pages/YourPage.jsx`)
```jsx
export default function YourPage() {
  return <div>Your Page</div>;
}
```

2. **Add Route** (`App.jsx`)
```jsx
<Route 
  path="/your-page" 
  element={
    <StudentProtectedRoute>
      <YourPage />
    </StudentProtectedRoute>
  } 
/>
```

---

## 🐛 Debugging Tips

### Backend
- Check `console.log` output in terminal
- Verify environment variables are loaded
- Check MongoDB connection
- Verify JWT token in requests
- Check Socket.io connection logs

### Frontend
- Use React DevTools
- Check browser console
- Verify API calls in Network tab
- Check localStorage for tokens
- Verify environment variables

---

## 📚 Useful Commands

### Backend
```bash
npm run dev          # Start dev server
npm start            # Start production
npm run seed:admin   # Seed admin user
```

### Frontend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

---

## 🔍 Common Issues & Solutions

### Issue: CORS Error
**Solution**: Check `CORS_ORIGIN` in backend `.env` matches frontend URL

### Issue: JWT Token Invalid
**Solution**: Verify `JWT_SECRET` is set and token hasn't expired

### Issue: MongoDB Connection Failed
**Solution**: Check `MONGODB_URI` and network connectivity

### Issue: Agora Token Error
**Solution**: Verify `AGORA_APP_ID` and `APP_CERTIFICATE` are set

### Issue: Payment Verification Failed
**Solution**: Check Razorpay credentials and signature verification

---

## 📖 Additional Resources

- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [Mongoose Docs](https://mongoosejs.com/)
- [Socket.io Docs](https://socket.io/docs/)
- [Agora Docs](https://docs.agora.io/)
- [Razorpay Docs](https://razorpay.com/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

**Last Updated**: $(date)

