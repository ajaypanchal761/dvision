const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  getAllPayments,
  getPaymentStats
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/auth');

// Student routes
router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);
router.get('/history', protect, getPaymentHistory);

// Admin routes
router.get('/admin', protect, authorize('admin', 'super_admin'), getAllPayments);
router.get('/admin/stats', protect, authorize('admin', 'super_admin'), getPaymentStats);

module.exports = router;

