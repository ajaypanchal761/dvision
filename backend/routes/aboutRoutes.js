const express = require('express');
const router = express.Router();
const {
  getPublicAboutUs,
  getAllAboutUs,
  createAboutUs,
  updateAboutUs,
  deleteAboutUs
} = require('../controllers/aboutController');
const { protect, authorize } = require('../middlewares/auth');

// Public route
router.get('/', getPublicAboutUs);

// Admin routes
router.get('/admin', protect, authorize('admin', 'super_admin'), getAllAboutUs);
router.post('/', protect, authorize('admin', 'super_admin'), createAboutUs);
router.put('/:id', protect, authorize('admin', 'super_admin'), updateAboutUs);
router.delete('/:id', protect, authorize('admin', 'super_admin'), deleteAboutUs);

module.exports = router;

