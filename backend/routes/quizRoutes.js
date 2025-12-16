const express = require('express');
const router = express.Router();
const {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getTeacherQuizStatistics,
  getStudentQuizStatistics
} = require('../controllers/quizController');
const {
  submitQuiz,
  getSubmissionStatus,
  getMySubmissions,
  getQuizLeaderboard,
  getQuizResults
} = require('../controllers/quizSubmissionController');
const { protect, authorize } = require('../middlewares/auth');

// Admin routes
router.post('/admin/quizzes', protect, authorize('admin', 'super_admin'), createQuiz);
router.get('/admin/quizzes', protect, authorize('admin', 'super_admin'), getAllQuizzes);
router.get('/admin/quizzes/:id', protect, authorize('admin', 'super_admin'), getQuizById);
router.put('/admin/quizzes/:id', protect, authorize('admin', 'super_admin'), updateQuiz);
router.delete('/admin/quizzes/:id', protect, authorize('admin', 'super_admin'), deleteQuiz);
router.get('/admin/quizzes/:id/results', protect, authorize('admin', 'super_admin'), getQuizResults);

// Teacher routes - create and manage quizzes
router.post('/teacher/quizzes', protect, authorize('teacher'), createQuiz);
router.get('/teacher/quizzes', protect, authorize('teacher'), getAllQuizzes);
router.get('/teacher/quizzes/statistics', protect, authorize('teacher'), getTeacherQuizStatistics);
router.get('/teacher/quizzes/:id', protect, authorize('teacher'), getQuizById);
router.put('/teacher/quizzes/:id', protect, authorize('teacher'), updateQuiz);
router.delete('/teacher/quizzes/:id', protect, authorize('teacher'), deleteQuiz);
router.get('/teacher/quizzes/:id/results', protect, authorize('teacher'), getQuizResults);

// Student routes - get quizzes filtered by class and board
router.get('/student/quizzes', protect, authorize('student'), getAllQuizzes);
router.get('/student/quizzes/statistics', protect, authorize('student'), getStudentQuizStatistics);
router.get('/student/quizzes/:id', protect, authorize('student'), getQuizById);
router.post('/student/quizzes/:id/submit', protect, authorize('student'), submitQuiz);
router.get('/student/quizzes/:id/submission-status', protect, authorize('student'), getSubmissionStatus);
router.get('/student/quizzes/:id/leaderboard', protect, authorize('student'), getQuizLeaderboard);
router.get('/student/quiz-submissions', protect, authorize('student'), getMySubmissions);

module.exports = router;

