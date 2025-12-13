const express = require('express');
const router = express.Router();
const {
  getPublicTerms,
  getAllTerms,
  createTerms,
  updateTerms,
  deleteTerms
} = require('../controllers/termsController');
const { protect, authorize } = require('../middlewares/auth');

// Public route - students/teachers can view current terms
router.get('/', getPublicTerms);

// Admin routes - manage terms versions
router.get('/admin', protect, authorize('admin', 'super_admin'), getAllTerms);
router.post('/', protect, authorize('admin', 'super_admin'), createTerms);
router.put('/:id', protect, authorize('admin', 'super_admin'), updateTerms);
router.delete('/:id', protect, authorize('admin', 'super_admin'), deleteTerms);

module.exports = router;


