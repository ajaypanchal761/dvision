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
const { protect } = require('../middlewares/auth');

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

module.exports = router;

