const express = require('express');
const router = express.Router();
const {
  createDoubt,
  getMyDoubts,
  getAllDoubts,
  getDoubtStatistics,
  getDoubtById,
  answerDoubt,
  updateDoubtStatus,
  deleteDoubt
} = require('../controllers/doubtController');
const { protect, authorize } = require('../middlewares/auth');

// Student routes
router.post('/student/doubts', protect, authorize('student'), createDoubt);
router.get('/student/doubts', protect, authorize('student'), getMyDoubts);

// Admin/Teacher routes
router.get('/doubts/statistics', protect, authorize('admin', 'super_admin'), getDoubtStatistics);
router.get('/doubts', protect, authorize('admin', 'super_admin', 'teacher'), getAllDoubts);
router.get('/doubts/:id', protect, getDoubtById);
router.put('/doubts/:id/answer', protect, authorize('admin', 'super_admin', 'teacher'), answerDoubt);
router.put('/doubts/:id/status', protect, authorize('admin', 'super_admin', 'teacher'), updateDoubtStatus);
router.delete('/doubts/:id', protect, authorize('admin', 'super_admin'), deleteDoubt);

module.exports = router;

