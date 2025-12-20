const express = require('express');
const router = express.Router();
const {
  checkAgentExists,
  sendOTP,
  verifyOTP,
  getMe,
  updateMe,
  getReferralLink,
  getStatistics,
  updateFcmToken,
  exportStatistics
} = require('../controllers/agentController');
const { protect } = require('../middlewares/auth');

// Public routes
router.post('/check-exists', checkAgentExists);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Protected routes (require authentication)
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/fcm-token', protect, updateFcmToken);
router.get('/referral-link', protect, getReferralLink);
router.get('/statistics', protect, getStatistics);
router.get('/statistics/export', protect, exportStatistics);

module.exports = router;



