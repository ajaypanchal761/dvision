const express = require('express');
const router = express.Router();
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
router.post('/teacher/live-classes/:id/upload-recording', protect, authorize('teacher'), uploadRecordingMiddleware, uploadRecording);

// Admin routes
router.get('/admin/live-classes', protect, authorize('admin'), getAllLiveClasses);

// Recording routes
router.get('/recordings/:id', protect, getRecording);

module.exports = router;

