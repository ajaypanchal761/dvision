const express = require('express');
const router = express.Router();
const {
  sendOTP,
  verifyOTP,
  resendOTP,
  getMe,
  updateProfile,
  updateFcmToken,
  getAllTeachers,
  checkTeacherExists
} = require('../controllers/teacherController');
const {
  markTodayAttendance,
  getTodayAttendanceStatus,
  getMyMonthlyAttendance
} = require('../controllers/teacherAttendanceController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', getAllTeachers);
router.get('/check/:phone', checkTeacherExists);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/fcm-token', protect, updateFcmToken);

// Teacher attendance routes
router.post('/attendance/mark', protect, authorize('teacher'), markTodayAttendance);
router.get('/attendance/today', protect, authorize('teacher'), getTodayAttendanceStatus);
router.get('/attendance', protect, authorize('teacher'), getMyMonthlyAttendance);

module.exports = router;

