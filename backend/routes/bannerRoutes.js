const express = require('express');
const router = express.Router();
const {
  getPublicBanners,
  getAllBanners,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner
} = require('../controllers/bannerController');
const { protect, authorize } = require('../middlewares/auth');

// Public route
router.get('/', getPublicBanners);

// Admin routes
router.get('/admin', protect, authorize('admin', 'super_admin'), getAllBanners);
router.get('/admin/:id', protect, authorize('admin', 'super_admin'), getBanner);
router.post('/admin', protect, authorize('admin', 'super_admin'), createBanner);
router.put('/admin/:id', protect, authorize('admin', 'super_admin'), updateBanner);
router.delete('/admin/:id', protect, authorize('admin', 'super_admin'), deleteBanner);

module.exports = router;

