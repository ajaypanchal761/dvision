const express = require('express');
const router = express.Router();
const {
  checkStudentExists,
  register,
  login,
  sendOTP,
  verifyOTP,
  resendOTP,
  uploadProfileImage,
  getMe,
  updateProfile,
  updateFcmToken,
  getCourses,
  getCourseById
} = require('../controllers/studentController');
const { getPublicClasses } = require('../controllers/adminClassController');
const { getPublicSubjects } = require('../controllers/adminSubjectController');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Public routes
router.get('/check-exists', checkStudentExists);
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.get('/classes', getPublicClasses);
router.get('/subjects', getPublicSubjects);

// Protected routes
router.get('/me', protect, getMe);
router.get('/courses', protect, getCourses);
router.get('/courses/:id', protect, getCourseById);
router.put('/profile', protect, updateProfile);
router.put('/fcm-token', protect, updateFcmToken);
router.post('/upload-profile-image', protect, upload.single('profileImage'), uploadProfileImage);

module.exports = router;

