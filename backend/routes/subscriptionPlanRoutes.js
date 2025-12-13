const express = require('express');
const router = express.Router();
const {
  getAllSubscriptionPlans,
  getSubscriptionPlan,
  getClassesByBoard,
  getPreparationClasses,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getPublicSubscriptionPlans
} = require('../controllers/subscriptionPlanController');
const { protect, authorize } = require('../middlewares/auth');

// Public route (for students to view available plans)
// Optionally protected - if student is authenticated, will check their active subscriptions
router.get('/', getPublicSubscriptionPlans);

// Admin routes
router.get('/admin', protect, authorize('admin', 'super_admin'), getAllSubscriptionPlans);
router.get('/admin/classes/:board', protect, authorize('admin', 'super_admin'), getClassesByBoard);
router.get('/admin/preparation-classes', protect, authorize('admin', 'super_admin'), getPreparationClasses);
router.get('/admin/:id', protect, authorize('admin', 'super_admin'), getSubscriptionPlan);
router.post('/admin', protect, authorize('admin', 'super_admin'), createSubscriptionPlan);
router.put('/admin/:id', protect, authorize('admin', 'super_admin'), updateSubscriptionPlan);
router.delete('/admin/:id', protect, authorize('admin', 'super_admin'), deleteSubscriptionPlan);

module.exports = router;

