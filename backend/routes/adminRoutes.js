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
  getAllAdmins
} = require('../controllers/adminController');
const {
  getAllStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/adminStudentController');
const {
  getAllTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher
} = require('../controllers/adminTeacherController');
const {
  getAllClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass
} = require('../controllers/adminClassController');
const {
  getAllSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject
} = require('../controllers/adminSubjectController');
const {
  getAllCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/adminCourseController');
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

// Admin Student Management Routes
router.get('/students', protect, authorize('admin', 'super_admin'), getAllStudents);
router.get('/students/:id', protect, authorize('admin', 'super_admin'), getStudent);
router.post('/students', protect, authorize('admin', 'super_admin'), createStudent);
router.put('/students/:id', protect, authorize('admin', 'super_admin'), updateStudent);
router.delete('/students/:id', protect, authorize('admin', 'super_admin'), deleteStudent);

// Admin Teacher Management Routes
router.get('/teachers', protect, authorize('admin', 'super_admin'), getAllTeachers);
router.get('/teachers/:id', protect, authorize('admin', 'super_admin'), getTeacher);
router.post('/teachers', protect, authorize('admin', 'super_admin'), createTeacher);
router.put('/teachers/:id', protect, authorize('admin', 'super_admin'), updateTeacher);
router.delete('/teachers/:id', protect, authorize('admin', 'super_admin'), deleteTeacher);

// Admin Class Management Routes
router.get('/classes', protect, authorize('admin', 'super_admin'), getAllClasses);
router.get('/classes/:id', protect, authorize('admin', 'super_admin'), getClass);
router.post('/classes', protect, authorize('admin', 'super_admin'), createClass);
router.put('/classes/:id', protect, authorize('admin', 'super_admin'), updateClass);
router.delete('/classes/:id', protect, authorize('admin', 'super_admin'), deleteClass);

// Admin Subject Management Routes
router.get('/subjects', protect, authorize('admin', 'super_admin'), getAllSubjects);
router.get('/subjects/:id', protect, authorize('admin', 'super_admin'), getSubject);
router.post('/subjects', protect, authorize('admin', 'super_admin'), createSubject);
router.put('/subjects/:id', protect, authorize('admin', 'super_admin'), updateSubject);
router.delete('/subjects/:id', protect, authorize('admin', 'super_admin'), deleteSubject);

// Admin Course Management Routes
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

// Super admin only routes
router.post('/register', protect, authorize('super_admin'), register);
router.get('/', protect, authorize('super_admin'), getAllAdmins);

module.exports = router;

