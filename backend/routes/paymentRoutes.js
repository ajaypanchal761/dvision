const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  getAllPayments,
  getPaymentStats,
  handlePaymentWebhook
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/auth');

// Student routes
router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);
router.get('/history', protect, getPaymentHistory);

// Admin routes
router.get('/admin', protect, authorize('admin', 'super_admin'), getAllPayments);
router.get('/admin/stats', protect, authorize('admin', 'super_admin'), getPaymentStats);

// ===== WEBHOOK ENDPOINT (PUBLIC - NOT PROTECTED) =====
// Cashfree calls this endpoint to notify about payment status
// Security: Uses cryptographic signature verification (x-webhook-signature header)
// Note: Raw body middleware is configured at app level in server.js
router.post('/webhook', handlePaymentWebhook);

module.exports = router;

