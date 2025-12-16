const express = require('express');
const router = express.Router();
const {
  checkAgentExists,
  sendOTP,
  verifyOTP,
  getMe,
  updateMe,
  getReferralLink,
  getStatistics
} = require('../controllers/agentController');
const { protect } = require('../middlewares/auth');

// Public routes
router.post('/check-exists', checkAgentExists);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Protected routes (require authentication)
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.get('/referral-link', protect, getReferralLink);
router.get('/statistics', protect, getStatistics);

module.exports = router;



