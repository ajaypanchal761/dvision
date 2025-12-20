const express = require('express');
const router = express.Router();

// Import route modules
const studentRoutes = require('./studentRoutes');
const teacherRoutes = require('./teacherRoutes');
const adminRoutes = require('./adminRoutes');
const agentRoutes = require('./agentRoutes');
const notificationRoutes = require('./notificationRoutes');
const exampleRoutes = require('./exampleRoutes');
const uploadRoutes = require('./uploadRoutes');
const emailRoutes = require('./emailRoutes');
const contactRoutes = require('./contactRoutes');
const termsRoutes = require('./termsRoutes');
const privacyRoutes = require('./privacyRoutes');
const aboutRoutes = require('./aboutRoutes');
const bannerRoutes = require('./bannerRoutes');
const subscriptionPlanRoutes = require('./subscriptionPlanRoutes');
const paymentRoutes = require('./paymentRoutes');
const doubtRoutes = require('./doubtRoutes');
const quizRoutes = require('./quizRoutes');
const timetableRoutes = require('./timetableRoutes');
const liveClassRoutes = require('./liveClassRoutes');

// Route definitions
router.use('/student', studentRoutes);
router.use('/teacher', teacherRoutes);
router.use('/admin', adminRoutes);
router.use('/agent', agentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/examples', exampleRoutes);
router.use('/upload', uploadRoutes);
// Backwards-compatibility: accept plural '/uploads' as well
router.use('/uploads', uploadRoutes);
router.use('/email', emailRoutes);
router.use('/contact', contactRoutes);
router.use('/terms', termsRoutes);
router.use('/privacy', privacyRoutes);
router.use('/about', aboutRoutes);
router.use('/banners', bannerRoutes);
router.use('/subscription-plans', subscriptionPlanRoutes);
router.use('/payment', paymentRoutes);
router.use('/timetables', timetableRoutes);
router.use('/live-classes', liveClassRoutes);
router.use('/', doubtRoutes);
router.use('/', quizRoutes);

module.exports = router;

