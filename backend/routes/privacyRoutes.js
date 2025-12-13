const express = require('express');
const router = express.Router();
const {
  getPublicPrivacy,
  getAllPrivacy,
  createPrivacy,
  updatePrivacy,
  deletePrivacy
} = require('../controllers/privacyController');
const { protect, authorize } = require('../middlewares/auth');

// Public route - students/teachers can view current privacy policy
router.get('/', getPublicPrivacy);

// Admin routes - manage privacy policy versions
router.get('/admin', protect, authorize('admin', 'super_admin'), getAllPrivacy);
router.post('/', protect, authorize('admin', 'super_admin'), createPrivacy);
router.put('/:id', protect, authorize('admin', 'super_admin'), updatePrivacy);
router.delete('/:id', protect, authorize('admin', 'super_admin'), deletePrivacy);

module.exports = router;


