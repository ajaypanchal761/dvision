const Doubt = require('../models/Doubt');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const cloudinary = require('cloudinary').v2;
const notificationService = require('../services/notificationService');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

// Configure Cloudinary if available
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Helper function to upload image to Cloudinary
const uploadImageToCloudinary = async (imageBase64) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    // If Cloudinary is not configured, return the base64 string
    // In production, you should always use Cloudinary or another storage service
    return imageBase64;
  }

  try {
    const result = await cloudinary.uploader.upload(imageBase64, {
      folder: 'dvision-academy/doubts',
      resource_type: 'image'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new ErrorResponse('Failed to upload image', 500);
  }
};

// @desc    Create a new doubt
// @route   POST /api/student/doubts
// @access  Private/Student
exports.createDoubt = asyncHandler(async (req, res) => {
  const { teacherId, question, images } = req.body;
  const Payment = require('../models/Payment');

  // Validation
  if (!teacherId || !question || !question.trim()) {
    throw new ErrorResponse('Please provide teacher and question', 400);
  }

  // Get student ID from authenticated user
  const studentId = req.user._id;
  const student = await Student.findById(studentId);

  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }

  // Check if student has active subscription
  const now = new Date();
  const activePayments = await Payment.find({
    studentId: student._id,
    status: 'completed',
    subscriptionEndDate: { $gte: now }
  })
    .populate({
      path: 'subscriptionPlanId',
      select: 'type board classes classId'
    });

  // Also honor activeSubscriptions stored on the student document
  const activeSubsFromArray = (student.activeSubscriptions || []).filter(sub => new Date(sub.endDate) >= now);

  const hasActiveClassSubscription = activePayments.some(payment =>
    payment.subscriptionPlanId &&
    payment.subscriptionPlanId.type === 'regular' &&
    payment.subscriptionPlanId.board === student.board &&
    payment.subscriptionPlanId.classes &&
    payment.subscriptionPlanId.classes.includes(student.class)
  ) || activeSubsFromArray.some(sub =>
    sub.type === 'regular' &&
    sub.board === student.board &&
    sub.class === student.class
  );

  const hasActivePreparationSubscription = activePayments.some(payment =>
    payment.subscriptionPlanId &&
    payment.subscriptionPlanId.type === 'preparation'
  ) || activeSubsFromArray.some(sub => sub.type === 'preparation');

  if (!hasActiveClassSubscription && !hasActivePreparationSubscription) {
    throw new ErrorResponse('You need an active subscription to submit doubts. Please subscribe to a plan.', 403);
  }

  // Validate teacher exists and is active
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new ErrorResponse('Teacher not found', 404);
  }
  if (!teacher.isActive) {
    throw new ErrorResponse('Selected teacher is not active', 400);
  }

  // Upload images if provided
  let imageUrls = [];
  if (images && Array.isArray(images) && images.length > 0) {
    // Upload each image to Cloudinary
    for (const imageBase64 of images) {
      if (imageBase64 && imageBase64.trim()) {
        try {
          const imageUrl = await uploadImageToCloudinary(imageBase64);
          imageUrls.push(imageUrl);
        } catch (error) {
          console.error('Error uploading image:', error);
          // Continue with other images even if one fails
        }
      }
    }
  }

  // Create doubt
  const doubt = await Doubt.create({
    studentId,
    teacherId,
    question: question.trim(),
    images: imageUrls,
    status: 'Pending'
  });

  // Populate student and teacher info for notification
  await doubt.populate('studentId', 'name');
  await doubt.populate('teacherId', 'name');

  // Send notifications to selected teacher and all admins
  try {
    // Get all active admins with FCM tokens (admins receive all doubts)
    const admins = await Admin.find({
      isActive: true,
      $or: [
        { 'fcmTokens.app': { $exists: true, $ne: null } },
        { 'fcmTokens.web': { $exists: true, $ne: null } },
        { fcmToken: { $exists: true, $ne: null } }
      ]
    }).select('_id');

    const adminIds = admins.map(admin => admin._id.toString());
    const teacherIdString = teacher._id.toString();
    const studentName = doubt.studentId?.name || 'A student';

    // Prepare notification for admins
    const adminNotification = {
      title: 'New Doubt Submitted',
      body: `${studentName} has submitted a new doubt`
    };

    const adminNotificationData = {
      type: 'doubt',
      doubtId: doubt._id.toString(),
      studentId: doubt.studentId?._id.toString(),
      studentName: studentName,
      url: '/doubts'
    };

    // Send to admins
    if (adminIds.length > 0) {
      await notificationService.sendToMultipleUsers(
        adminIds,
        'admin',
        adminNotification,
        adminNotificationData
      ).catch(err => {
        console.error('Error sending notification to admins:', err);
      });
    }

    // Prepare notification for teacher
    const teacherNotification = {
      title: 'New Doubt Assigned',
      body: `${studentName} has submitted a doubt for you to answer`
    };

    const teacherNotificationData = {
      type: 'doubt',
      doubtId: doubt._id.toString(),
      studentId: doubt.studentId?._id.toString(),
      studentName: studentName,
      url: '/doubts'
    };

    // Send to selected teacher using sendToUser (handles all FCM token types)
    await notificationService.sendToUser(
      teacherIdString,
      'teacher',
      teacherNotification,
      teacherNotificationData
    ).catch(err => {
      console.error('Error sending notification to teacher:', err);
    });
  } catch (notificationError) {
    // Log error but don't fail the request
    console.error('Error sending notifications for new doubt:', notificationError);
  }

  res.status(201).json({
    success: true,
    message: 'Doubt submitted successfully',
    data: {
      doubt
    }
  });
});

// @desc    Get all doubts for the authenticated student
// @route   GET /api/student/doubts
// @access  Private/Student
exports.getMyDoubts = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { page = 1, limit = 10, search } = req.query;

  const query = { studentId };

  // Add search functionality
  if (search) {
    query.$or = [
      { question: { $regex: search.trim(), $options: 'i' } },
      { answer: { $regex: search.trim(), $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Doubt.countDocuments(query);

  const doubts = await Doubt.find(query)
    .sort({ createdAt: -1 })
    .populate('teacherId', 'name email subjects')
    .select('-__v')
    .skip(skip)
    .limit(parseInt(limit));

  // Populate answeredBy based on answeredByModel (Teacher or Admin)
  // Since we use refPath, we need to populate conditionally for each doubt
  for (const doubt of doubts) {
    if (doubt.answeredBy && doubt.answeredByModel) {
      try {
        if (doubt.answeredByModel === 'Teacher') {
          await doubt.populate({ path: 'answeredBy', select: 'name email', model: 'Teacher' });
        } else if (doubt.answeredByModel === 'Admin') {
          await doubt.populate({ path: 'answeredBy', select: 'name email', model: 'Admin' });
        }
      } catch (populateError) {
        console.error('Error populating answeredBy:', populateError);
        // Continue even if populate fails
      }
    }
  }

  res.status(200).json({
    success: true,
    count: doubts.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      doubts
    }
  });
});

// @desc    Get doubt statistics (Admin)
// @route   GET /api/doubts/statistics
// @access  Private/Admin
exports.getDoubtStatistics = asyncHandler(async (req, res) => {
  // Get overall statistics (not filtered by search or pagination)
  const totalDoubts = await Doubt.countDocuments({});
  const pendingDoubts = await Doubt.countDocuments({ status: 'Pending' });
  const answeredDoubts = await Doubt.countDocuments({ status: 'Answered' });
  const resolvedDoubts = await Doubt.countDocuments({ status: 'Resolved' });

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        totalDoubts,
        pendingDoubts,
        answeredDoubts,
        resolvedDoubts
      }
    }
  });
});

// @desc    Get all doubts (admin/teacher)
// @route   GET /api/doubts
// @access  Private/Admin/Teacher
exports.getAllDoubts = asyncHandler(async (req, res) => {
  const { status, studentId, page = 1, limit = 10, search } = req.query;

  // Build query
  const query = {};
  if (status) {
    query.status = status;
  }
  if (studentId) {
    query.studentId = studentId;
  }

  // Add search functionality
  if (search) {
    query.$or = [
      { question: { $regex: search.trim(), $options: 'i' } },
      { answer: { $regex: search.trim(), $options: 'i' } }
    ];
  }

  // If user is a teacher, show only doubts assigned to them
  const userRole = req.userRole || req.user?.role;
  if (userRole === 'teacher') {
    query.teacherId = req.user._id;
  }
  // If user is admin, show all doubts (no filtering)

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Doubt.countDocuments(query);

  const doubts = await Doubt.find(query)
    .sort({ createdAt: -1 })
    .populate('studentId', 'name email phone')
    .populate('teacherId', 'name email subjects')
    .populate('answeredBy', 'name email')
    .select('-__v')
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: doubts.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      doubts
    }
  });
});

// @desc    Get single doubt by ID
// @route   GET /api/doubts/:id
// @access  Private
exports.getDoubtById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const doubt = await Doubt.findById(id)
    .populate('studentId', 'name email phone')
    .populate('teacherId', 'name email subjects')
    .populate('answeredBy', 'name email')
    .select('-__v');

  if (!doubt) {
    throw new ErrorResponse('Doubt not found', 404);
  }

  // Check if user has access
  const userRole = req.userRole || req.user?.role;
  if (userRole === 'student' && doubt.studentId._id.toString() !== req.user._id.toString()) {
    throw new ErrorResponse('Not authorized to access this doubt', 403);
  }

  // If user is teacher, verify they are the assigned teacher
  if (userRole === 'teacher' && doubt.teacherId._id.toString() !== req.user._id.toString()) {
    throw new ErrorResponse('Not authorized to access this doubt', 403);
  }

  res.status(200).json({
    success: true,
    data: {
      doubt
    }
  });
});

// @desc    Answer a doubt (teacher/admin)
// @route   PUT /api/doubts/:id/answer
// @access  Private/Teacher/Admin
exports.answerDoubt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { answer } = req.body;

  if (!answer || !answer.trim()) {
    throw new ErrorResponse('Please provide an answer', 400);
  }

  const doubt = await Doubt.findById(id);

  if (!doubt) {
    throw new ErrorResponse('Doubt not found', 404);
  }

  // Check if user is teacher or admin
  // Use req.userRole from auth middleware (set from JWT token)
  const userRole = req.userRole || req.user?.role;
  if (userRole !== 'teacher' && userRole !== 'admin' && userRole !== 'super_admin') {
    throw new ErrorResponse('Only teachers and admins can answer doubts', 403);
  }

  // If user is teacher, verify they are the assigned teacher
  if (userRole === 'teacher') {
    if (doubt.teacherId.toString() !== req.user._id.toString()) {
      throw new ErrorResponse('You can only answer doubts assigned to you', 403);
    }
  }

  doubt.answer = answer.trim();
  doubt.status = 'Resolved';
  doubt.answeredBy = req.user._id;
  doubt.answeredByModel = userRole === 'teacher' ? 'Teacher' : 'Admin';
  doubt.answeredAt = new Date();

  await doubt.save();

  // Populate before sending response
  await doubt.populate('studentId', 'name email phone');
  await doubt.populate('teacherId', 'name email subjects');

  // Populate answeredBy based on model type
  if (doubt.answeredByModel === 'Teacher') {
    await doubt.populate('answeredBy', 'name email');
  } else if (doubt.answeredByModel === 'Admin') {
    await doubt.populate('answeredBy', 'name email');
  }

  // Send notification to student
  try {
    const answeredByName = req.user.name || (doubt.answeredBy?.name || 'Someone');
    const userRoleForNotification = req.userRole || req.user?.role;
    const answeredByRole = userRoleForNotification === 'teacher' ? 'Teacher' : 'Admin';

    const notification = {
      title: 'Your Doubt Has Been Answered',
      body: `${answeredByName} (${answeredByRole}) has answered your doubt`
    };

    const notificationData = {
      type: 'doubt_answer',
      doubtId: doubt._id.toString(),
      answeredBy: answeredByName,
      answeredByRole: answeredByRole,
      answeredById: req.user._id.toString(),
      url: '/doubts'
    };

    await notificationService.sendToUser(
      doubt.studentId._id.toString(),
      'student',
      notification,
      notificationData
    ).catch(err => {
      console.error('Error sending notification to student:', err);
    });
  } catch (notificationError) {
    // Log error but don't fail the request
    console.error('Error sending notification for answered doubt:', notificationError);
  }

  res.status(200).json({
    success: true,
    message: 'Doubt answered successfully',
    data: {
      doubt
    }
  });
});

// @desc    Update doubt status
// @route   PUT /api/doubts/:id/status
// @access  Private/Admin/Teacher
exports.updateDoubtStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Pending', 'Answered', 'Resolved'].includes(status)) {
    throw new ErrorResponse('Please provide a valid status', 400);
  }

  const doubt = await Doubt.findById(id);

  if (!doubt) {
    throw new ErrorResponse('Doubt not found', 404);
  }

  const oldStatus = doubt.status;
  doubt.status = status;
  if (status === 'Resolved' && !doubt.answeredAt) {
    doubt.answeredAt = new Date();
  }

  await doubt.save();

  await doubt.populate('studentId', 'name email phone');
  await doubt.populate('teacherId', 'name email subjects');

  // Populate answeredBy if exists
  if (doubt.answeredBy && doubt.answeredByModel) {
    if (doubt.answeredByModel === 'Teacher') {
      await doubt.populate({ path: 'answeredBy', select: 'name email', model: 'Teacher' });
    } else if (doubt.answeredByModel === 'Admin') {
      await doubt.populate({ path: 'answeredBy', select: 'name email', model: 'Admin' });
    }
  }

  // Send notification to student when status changes
  if (oldStatus !== status && doubt.studentId) {
    try {
      const userRole = req.userRole || req.user?.role;
      const updatedByName = req.user.name || 'Admin';

      let statusMessage = '';
      switch (status) {
        case 'Answered':
          statusMessage = 'has been answered';
          break;
        case 'Resolved':
          statusMessage = 'has been resolved';
          break;
        case 'Pending':
          statusMessage = 'is now pending';
          break;
        default:
          statusMessage = `status changed to ${status}`;
      }

      const notification = {
        title: 'Doubt Status Updated',
        body: `Your doubt "${doubt.question.substring(0, 50)}${doubt.question.length > 50 ? '...' : ''}" ${statusMessage}`
      };

      const notificationData = {
        type: 'doubt',
        doubtId: doubt._id.toString(),
        status: status,
        updatedBy: updatedByName,
        updatedByRole: userRole,
        url: '/doubts'
      };

      console.log('[DEBUG] Sending status change notification to student:', {
        studentId: doubt.studentId._id.toString(),
        status: status,
        oldStatus: oldStatus,
        updatedBy: updatedByName
      });

      await notificationService.sendToUser(
        doubt.studentId._id.toString(),
        'student',
        notification,
        notificationData
      ).catch(err => {
        console.error('[ERROR] Error sending status change notification to student:', err);
      });
    } catch (notificationError) {
      console.error('[ERROR] Error sending notification for status change:', notificationError);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Doubt status updated successfully',
    data: {
      doubt
    }
  });
});

// @desc    Delete a doubt
// @route   DELETE /api/doubts/:id
// @access  Private/Admin
exports.deleteDoubt = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const doubt = await Doubt.findById(id);

  if (!doubt) {
    throw new ErrorResponse('Doubt not found', 404);
  }

  // Only admin can delete doubts
  const userRole = req.userRole || req.user?.role;
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    throw new ErrorResponse('Not authorized to delete doubts', 403);
  }

  await doubt.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Doubt deleted successfully'
  });
});

