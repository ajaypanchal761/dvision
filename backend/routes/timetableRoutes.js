const express = require('express');
const router = express.Router();
const {
  getAllTimetables,
  getTimetable,
  getTimetableStatistics,
  getTimetablesByClass,
  getMyClassTimetable,
  getMySchedule,
  createTimetable,
  createBulkTimetables,
  updateTimetable,
  deleteTimetable,
  getSubjectsByClass,
  getTeachersBySubject
} = require('../controllers/timetableController');
const { protect, authorize } = require('../middlewares/auth');

// Admin routes
router.get('/admin/statistics', protect, authorize('admin', 'super_admin'), getTimetableStatistics);
router.get('/admin', protect, authorize('admin', 'super_admin'), getAllTimetables);
router.get('/admin/:id', protect, authorize('admin', 'super_admin'), getTimetable);
router.post('/admin', protect, authorize('admin', 'super_admin'), createTimetable);
router.post('/admin/bulk', protect, authorize('admin', 'super_admin'), createBulkTimetables);
router.put('/admin/:id', protect, authorize('admin', 'super_admin'), updateTimetable);
router.delete('/admin/:id', protect, authorize('admin', 'super_admin'), deleteTimetable);
router.get('/admin/subjects/:classId', protect, authorize('admin', 'super_admin'), getSubjectsByClass);
router.get('/admin/teachers/:subjectId', protect, authorize('admin', 'super_admin'), getTeachersBySubject);

// Student routes
router.get('/my-class', protect, authorize('student'), getMyClassTimetable);
router.get('/class/:classId', protect, getTimetablesByClass);

// Teacher routes
router.get('/my-schedule', protect, authorize('teacher'), getMySchedule);

module.exports = router;

