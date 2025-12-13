const express = require('express');
const router = express.Router();
const {
  getPublicContactInfo,
  getAllContactInfo,
  createContactInfo,
  updateContactInfo,
  deleteContactInfo
} = require('../controllers/contactController');
const { protect, authorize } = require('../middlewares/auth');

// Public route - students/teachers (and anyone) can view contact info
router.get('/', getPublicContactInfo);

// Admin routes - manage contact info entries
router.get('/admin', protect, authorize('admin', 'super_admin'), getAllContactInfo);
router.post('/', protect, authorize('admin', 'super_admin'), createContactInfo);
router.put('/:id', protect, authorize('admin', 'super_admin'), updateContactInfo);
router.delete('/:id', protect, authorize('admin', 'super_admin'), deleteContactInfo);

module.exports = router;


