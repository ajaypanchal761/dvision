const express = require('express');
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  updateFcmToken,
  getAllAdmins,
  getDashboardStatistics
} = require('../controllers/adminController');
const {
  getAllStudents,
  getStudent,
  getStudentStatistics,
  createStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/adminStudentController');
const {
  getAllTeachers,
  getTeacher,
  getTeacherStatistics,
  createTeacher,
  updateTeacher,
  deleteTeacher
} = require('../controllers/adminTeacherController');
const {
  getAllClasses,
  getClass,
  getClassStatistics,
  createClass,
  updateClass,
  deleteClass
} = require('../controllers/adminClassController');
const {
  getAllSubjects,
  getSubject,
  getSubjectStatistics,
  createSubject,
  updateSubject,
  deleteSubject
} = require('../controllers/adminSubjectController');
const {
  getAllCourses,
  getCourse,
  getCourseStatistics,
  createCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/adminCourseController');
const {
  getTeacherMonthlyAttendanceAdmin,
  getAllTeacherAttendanceAdmin,
} = require('../controllers/teacherAttendanceController');
const {
  createAgent,
  getAllAgents,
  getAgentById,
  getAgentStatistics,
  updateAgent,
  deleteAgent,
  getAgentReferrals,
  getAllReferrals,
  updateReferralStatus,
  getReferralStatistics
} = require('../controllers/adminReferralController');
const { getAllLiveClasses, getAdminLiveClassById, getLiveClassStatistics } = require('../controllers/liveClassController');
const { getAdminRecordings, getAdminRecordingById, getRecordingStatistics } = require('../controllers/liveClassController');
const { protect, authorize } = require('../middlewares/auth');
const { uploadCourse } = require('../middlewares/upload');

// Public routes
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.put('/fcm-token', protect, updateFcmToken);

// Admin Dashboard Statistics
router.get('/dashboard/statistics', protect, authorize('admin', 'super_admin'), getDashboardStatistics);

// Admin Student Management Routes
router.get('/students/statistics', protect, authorize('admin', 'super_admin'), getStudentStatistics);
router.get('/students', protect, authorize('admin', 'super_admin'), getAllStudents);
router.get('/students/:id', protect, authorize('admin', 'super_admin'), getStudent);
router.post('/students', protect, authorize('admin', 'super_admin'), createStudent);
router.put('/students/:id', protect, authorize('admin', 'super_admin'), updateStudent);
router.delete('/students/:id', protect, authorize('admin', 'super_admin'), deleteStudent);

// Admin Teacher Management Routes
router.get('/teachers/statistics', protect, authorize('admin', 'super_admin'), getTeacherStatistics);
router.get('/teachers', protect, authorize('admin', 'super_admin'), getAllTeachers);
// Teacher attendance (list + calendar) - keep BEFORE /teachers/:id to avoid route conflict
router.get('/teachers/attendance', protect, authorize('admin', 'super_admin'), getAllTeacherAttendanceAdmin);
router.get('/teachers/:id', protect, authorize('admin', 'super_admin'), getTeacher);
router.post('/teachers', protect, authorize('admin', 'super_admin'), createTeacher);
router.put('/teachers/:id', protect, authorize('admin', 'super_admin'), updateTeacher);
router.delete('/teachers/:id', protect, authorize('admin', 'super_admin'), deleteTeacher);
router.get('/teachers/:id/attendance', protect, authorize('admin', 'super_admin'), getTeacherMonthlyAttendanceAdmin);

// Admin Class Management Routes
router.get('/classes/statistics', protect, authorize('admin', 'super_admin'), getClassStatistics);
router.get('/classes', protect, authorize('admin', 'super_admin'), getAllClasses);
router.get('/classes/:id', protect, authorize('admin', 'super_admin'), getClass);
router.post('/classes', protect, authorize('admin', 'super_admin'), createClass);
router.put('/classes/:id', protect, authorize('admin', 'super_admin'), updateClass);
router.delete('/classes/:id', protect, authorize('admin', 'super_admin'), deleteClass);

// Admin Subject Management Routes
router.get('/subjects/statistics', protect, authorize('admin', 'super_admin'), getSubjectStatistics);
router.get('/subjects', protect, authorize('admin', 'super_admin'), getAllSubjects);
router.get('/subjects/:id', protect, authorize('admin', 'super_admin'), getSubject);
router.post('/subjects', protect, authorize('admin', 'super_admin'), createSubject);
router.put('/subjects/:id', protect, authorize('admin', 'super_admin'), updateSubject);
router.delete('/subjects/:id', protect, authorize('admin', 'super_admin'), deleteSubject);

// Admin Course Management Routes
router.get('/courses/statistics', protect, authorize('admin', 'super_admin'), getCourseStatistics);
router.get('/courses', protect, authorize('admin', 'super_admin'), getAllCourses);
router.get('/courses/:id', protect, authorize('admin', 'super_admin'), getCourse);
router.post('/courses', protect, authorize('admin', 'super_admin'), uploadCourse.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'chapterPdf', maxCount: 20 } // Allow up to 20 PDFs
]), createCourse);
router.put('/courses/:id', protect, authorize('admin', 'super_admin'), uploadCourse.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'chapterPdf', maxCount: 20 }
]), updateCourse);
router.delete('/courses/:id', protect, authorize('admin', 'super_admin'), deleteCourse);

// Admin Agent Management Routes
router.get('/agents/statistics', protect, authorize('admin', 'super_admin'), getAgentStatistics);
router.post('/agents', protect, authorize('admin', 'super_admin'), createAgent);
router.get('/agents', protect, authorize('admin', 'super_admin'), getAllAgents);
// Agent referrals - keep BEFORE /agents/:id to avoid route conflict
router.get('/agents/:id/referrals', protect, authorize('admin', 'super_admin'), getAgentReferrals);
router.get('/agents/:id', protect, authorize('admin', 'super_admin'), getAgentById);
router.put('/agents/:id', protect, authorize('admin', 'super_admin'), updateAgent);
router.delete('/agents/:id', protect, authorize('admin', 'super_admin'), deleteAgent);

// Admin Referral Management Routes
router.get('/referrals', protect, authorize('admin', 'super_admin'), getAllReferrals);
router.put('/referrals/:id/status', protect, authorize('admin', 'super_admin'), updateReferralStatus);
router.get('/referrals/statistics', protect, authorize('admin', 'super_admin'), getReferralStatistics);

// Admin Live Class Routes
router.get('/live-classes/statistics', protect, authorize('admin', 'super_admin'), getLiveClassStatistics);
router.get('/live-classes', protect, authorize('admin', 'super_admin'), getAllLiveClasses);
router.get('/live-classes/:id', protect, authorize('admin', 'super_admin'), getAdminLiveClassById);

// Admin Recording Routes
router.get('/recordings/statistics', protect, authorize('admin', 'super_admin'), getRecordingStatistics);
router.get('/recordings', protect, authorize('admin', 'super_admin'), getAdminRecordings);
router.get('/recordings/:id', protect, authorize('admin', 'super_admin'), getAdminRecordingById);

// Super admin only routes
router.post('/register', protect, authorize('super_admin'), register);
router.get('/', protect, authorize('super_admin'), getAllAdmins);

module.exports = router;

