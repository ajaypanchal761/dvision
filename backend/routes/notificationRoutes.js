const express = require('express');
const router = express.Router();
const {
  sendTestNotificationToToken,
  sendTestNotificationToMe,
  sendNotificationToStudentsByClassBoard,
  sendNotificationToMultipleUsers,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotifications,
  deleteAllNotifications,
  getFilteredStudents,
  getFilteredTeachers,
  sendNotificationToFiltered,
  getNotificationHistory,
  getAllCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  removeDuplicateNotifications
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middlewares/auth');

// User notification routes
router.get('/', protect, getMyNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.put('/mark-read', protect, markAsRead);
router.delete('/', protect, deleteNotifications);
router.delete('/all', protect, deleteAllNotifications);

// Test notification to a specific token (Admin only)
router.post('/test-token', protect, authorize('admin', 'super_admin'), sendTestNotificationToToken);

// Test notification to current user
router.post('/test-me', protect, sendTestNotificationToMe);

// Send notification to students by class and board (Admin only)
router.post('/students-by-class-board', protect, authorize('admin', 'super_admin'), sendNotificationToStudentsByClassBoard);

// Send notification to multiple users (Admin only)
router.post('/multiple-users', protect, authorize('admin', 'super_admin'), sendNotificationToMultipleUsers);

// Admin notification management routes
router.get('/admin/students', protect, authorize('admin', 'super_admin'), getFilteredStudents);
router.get('/admin/teachers', protect, authorize('admin', 'super_admin'), getFilteredTeachers);
router.post('/admin/send', protect, authorize('admin', 'super_admin'), sendNotificationToFiltered);
router.get('/admin/history', protect, authorize('admin', 'super_admin'), getNotificationHistory);
router.delete('/admin/duplicates', protect, authorize('admin', 'super_admin'), removeDuplicateNotifications);

// Admin notification campaigns routes
router.get('/admin/campaigns', protect, authorize('admin', 'super_admin'), getAllCampaigns);
router.get('/admin/campaigns/:id', protect, authorize('admin', 'super_admin'), getCampaign);
router.post('/admin/campaigns', protect, authorize('admin', 'super_admin'), createCampaign);
router.put('/admin/campaigns/:id', protect, authorize('admin', 'super_admin'), updateCampaign);
router.delete('/admin/campaigns/:id', protect, authorize('admin', 'super_admin'), deleteCampaign);
router.post('/admin/campaigns/:id/send', protect, authorize('admin', 'super_admin'), sendCampaign);

module.exports = router;

