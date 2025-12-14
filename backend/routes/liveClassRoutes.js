const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getAllLiveClasses,
  getMyLiveClasses,
  getStudentLiveClasses,
  createLiveClass,
  getAssignedOptions,
  startLiveClass,
  joinLiveClass,
  endLiveClass,
  sendChatMessage,
  toggleHandRaise,
  toggleMute,
  toggleVideo,
  getLiveClass,
  uploadRecording,
  getStudentRecordings,
  getRecording
} = require('../controllers/liveClassController');
const { protect, authorize } = require('../middlewares/auth');
const { uploadRecording: uploadRecordingMiddleware } = require('../middlewares/upload');

// Public routes (none for live classes)

// Protected routes - All users
router.get('/:id', protect, getLiveClass);
router.post('/:id/join', protect, joinLiveClass);
router.post('/:id/chat', protect, sendChatMessage);
router.put('/:id/mute', protect, toggleMute);
router.put('/:id/video', protect, toggleVideo);

// Student routes
router.get('/student/live-classes', protect, authorize('student'), getStudentLiveClasses);
router.put('/:id/hand-raise', protect, authorize('student'), toggleHandRaise);
router.get('/student/recordings', protect, authorize('student'), getStudentRecordings);

// Teacher routes
router.get('/teacher/live-classes', protect, authorize('teacher'), getMyLiveClasses);
router.get('/teacher/live-classes/assigned-options', protect, authorize('teacher'), getAssignedOptions);
router.post('/teacher/live-classes', protect, authorize('teacher'), createLiveClass);
router.put('/teacher/live-classes/:id/start', protect, authorize('teacher'), startLiveClass);
router.put('/teacher/live-classes/:id/end', protect, authorize('teacher'), endLiveClass);
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

// Admin routes
router.get('/admin/live-classes', protect, authorize('admin'), getAllLiveClasses);

// Recording routes
router.get('/recordings/:id', protect, getRecording);

module.exports = router;

