const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getAllLiveClasses,
  getAdminLiveClassById,
  getMyLiveClasses,
  getStudentLiveClasses,
  getUpcomingLiveClasses,
  getTeacherClassStatistics,
  createLiveClass,
  getAssignedOptions,
  startLiveClass,
  joinLiveClass,
  endLiveClass,
  sendChatMessage,
  markChatMessagesAsRead,
  toggleHandRaise,
  toggleMute,
  toggleVideo,
  getLiveClass,
  uploadRecording,
  getStudentRecordings,
  getRecording,
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording
} = require('../controllers/liveClassController');
const { protect, authorize } = require('../middlewares/auth');
const { uploadRecording: uploadRecordingMiddleware } = require('../middlewares/upload');

// Public routes (none for live classes)

// Protected routes - All users
router.get('/:id', protect, getLiveClass);
router.post('/:id/join', protect, joinLiveClass);
router.post('/:id/chat', protect, sendChatMessage);
router.put('/:id/chat/mark-read', protect, markChatMessagesAsRead);
router.put('/:id/mute', protect, toggleMute);
router.put('/:id/video', protect, toggleVideo);

// Student routes
router.get('/student/live-classes', protect, authorize('student'), getStudentLiveClasses);
router.get('/student/upcoming', protect, authorize('student'), getUpcomingLiveClasses);
router.put('/:id/hand-raise', protect, authorize('student'), toggleHandRaise);
router.get('/student/recordings', protect, authorize('student'), getStudentRecordings);

// Teacher routes
router.get('/teacher/live-classes', protect, authorize('teacher'), getMyLiveClasses);
router.get('/teacher/statistics', protect, authorize('teacher'), getTeacherClassStatistics);
router.get('/teacher/live-classes/assigned-options', protect, authorize('teacher'), getAssignedOptions);
router.post('/teacher/live-classes', protect, authorize('teacher'), createLiveClass);
router.put('/teacher/live-classes/:id/start', protect, authorize('teacher'), startLiveClass);
router.put('/teacher/live-classes/:id/end', protect, authorize('teacher'), endLiveClass);
// Manual recording control routes
router.post('/teacher/live-classes/:id/recording/start', protect, authorize('teacher'), startRecording);
router.post('/teacher/live-classes/:id/recording/stop', protect, authorize('teacher'), stopRecording);
router.post('/teacher/live-classes/:id/recording/pause', protect, authorize('teacher'), pauseRecording);
router.post('/teacher/live-classes/:id/recording/resume', protect, authorize('teacher'), resumeRecording);
// Upload recording route with error handling
router.post('/teacher/live-classes/:id/upload-recording', protect, authorize('teacher'), (req, res, next) => {
  uploadRecordingMiddleware(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum size is 500MB. Your file is ${(req.file?.size || 0) / (1024 * 1024)}MB.`
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      }
      // Handle other errors
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    next();
  });
}, uploadRecording);

// Admin routes (keep before generic :id to avoid conflicts)
router.get('/admin/live-classes', protect, authorize('admin', 'super_admin'), getAllLiveClasses);
router.get('/admin/live-classes/:id', protect, authorize('admin', 'super_admin'), getAdminLiveClassById);

// Recording routes
router.get('/recordings/:id', protect, getRecording);

module.exports = router;

