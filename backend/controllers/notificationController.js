const notificationService = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Notification = require('../models/Notification');
const NotificationCampaign = require('../models/NotificationCampaign');

// @desc    Send test notification to a token
// @route   POST /api/notifications/test-token
// @access  Private (Admin)
exports.sendTestNotificationToToken = asyncHandler(async (req, res) => {
  const { fcmToken, title, body, data } = req.body;

  if (!fcmToken) {
    throw new ErrorResponse('FCM token is required', 400);
  }

  const notification = {
    title: title || 'Test Notification',
    body: body || 'This is a test notification from Dvision Academy',
  };

  const result = await notificationService.sendToToken(fcmToken, notification, data || {});

  if (result.success) {
    res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      data: result,
    });
  } else {
    res.status(400).json({
      success: false,
      message: result.error || 'Failed to send notification',
      data: result,
    });
  }
});

// @desc    Send test notification to current user
// @route   POST /api/notifications/test-me
// @access  Private
exports.sendTestNotificationToMe = asyncHandler(async (req, res) => {
  const { title, body, data } = req.body;
  
  if (!req.user || !req.user._id) {
    throw new ErrorResponse('User not authenticated', 401);
  }
  
  const userId = req.user._id;
  const userRole = req.userRole;

  // Get user's FCM token
  let user;
  if (userRole === 'student') {
    user = await Student.findById(userId);
  } else if (userRole === 'teacher') {
    user = await Teacher.findById(userId);
  }

  if (!user || !user.fcmToken) {
    throw new ErrorResponse('FCM token not found. Please update your FCM token first.', 400);
  }

  const notification = {
    title: title || 'Test Notification',
    body: body || 'This is a test notification from Dvision Academy',
  };

  const result = await notificationService.sendToToken(user.fcmToken, notification, data || {});

  if (result.success) {
    res.status(200).json({
      success: true,
      message: 'Notification sent successfully to your device',
      data: result,
    });
  } else {
    res.status(400).json({
      success: false,
      message: result.error || 'Failed to send notification',
      data: result,
    });
  }
});

// @desc    Send notification to students by class and board
// @route   POST /api/notifications/students-by-class-board
// @access  Private (Admin)
exports.sendNotificationToStudentsByClassBoard = asyncHandler(async (req, res) => {
  const { class: classNumber, board, title, body, data } = req.body;

  if (!classNumber || !board) {
    throw new ErrorResponse('Class and board are required', 400);
  }

  if (!title || !body) {
    throw new ErrorResponse('Title and body are required', 400);
  }

  const notification = { title, body };

  const result = await notificationService.sendToStudentsByClassBoard(
    classNumber,
    board,
    notification,
    data || {}
  );

  if (result.success) {
    res.status(200).json({
      success: true,
      message: `Notification sent to ${result.successCount} students`,
      data: result,
    });
  } else {
    res.status(400).json({
      success: false,
      message: result.error || 'Failed to send notifications',
      data: result,
    });
  }
});

// @desc    Send notification to multiple users
// @route   POST /api/notifications/multiple-users
// @access  Private (Admin)
exports.sendNotificationToMultipleUsers = asyncHandler(async (req, res) => {
  const { userIds, userType, title, body, data } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ErrorResponse('User IDs array is required', 400);
  }

  if (!userType || !['student', 'teacher', 'admin'].includes(userType)) {
    throw new ErrorResponse('Valid user type (student, teacher, admin) is required', 400);
  }

  if (!title || !body) {
    throw new ErrorResponse('Title and body are required', 400);
  }

  const notification = { title, body };

  const result = await notificationService.sendToMultipleUsers(
    userIds,
    userType,
    notification,
    data || {}
  );

  if (result.success) {
    res.status(200).json({
      success: true,
      message: `Notification sent to ${result.successCount} users`,
      data: result,
    });
  } else {
    res.status(400).json({
      success: false,
      message: result.error || 'Failed to send notifications',
      data: result,
    });
  }
});

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userType = req.userRole;

  // Debug logging
  console.log('getMyNotifications - userId:', userId, 'userId type:', typeof userId, 'userType:', userType);
  console.log('getMyNotifications - userId string:', userId.toString());

  // Check all notifications for this userType to debug
  const allNotificationsForType = await Notification.find({ userType: userType }).limit(5);
  console.log('getMyNotifications - Sample notifications for userType:', userType, 'count:', allNotificationsForType.length);
  if (allNotificationsForType.length > 0) {
    console.log('getMyNotifications - Sample notification userId:', allNotificationsForType[0].userId, 'userId type:', typeof allNotificationsForType[0].userId);
    console.log('getMyNotifications - Sample notification userId string:', allNotificationsForType[0].userId.toString());
    console.log('getMyNotifications - userId match:', userId.toString() === allNotificationsForType[0].userId.toString());
  }

  const notifications = await Notification.find({
    userId: userId,
    userType: userType
  })
    .sort({ createdAt: -1 })
    .limit(100); // Limit to last 100 notifications

  console.log('getMyNotifications - Found notifications:', notifications.length);

  // Also try with string comparison
  const notificationsByString = await Notification.find({
    userId: userId.toString(),
    userType: userType
  })
    .sort({ createdAt: -1 })
    .limit(100);

  console.log('getMyNotifications - Found notifications (string userId):', notificationsByString.length);

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: {
      notifications
    }
  });
});

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userType = req.userRole;

  console.log('[DEBUG] getUnreadCount - userId:', userId.toString(), 'userType:', userType);

  const unreadCount = await Notification.countDocuments({
    userId,
    userType,
    isRead: false
  });

  console.log('[DEBUG] getUnreadCount - Found unread count:', unreadCount);

  res.status(200).json({
    success: true,
    data: {
      unreadCount
    }
  });
});

// @desc    Mark notifications as read
// @route   PUT /api/notifications/mark-read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userType = req.userRole;
  const { notificationIds } = req.body;

  // If specific IDs provided, mark only those as read
  if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
    await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        userId,
        userType
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
  } else {
    // Mark all as read
    await Notification.updateMany(
      {
        userId,
        userType,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
  }

  res.status(200).json({
    success: true,
    message: 'Notifications marked as read'
  });
});

// @desc    Delete notifications
// @route   DELETE /api/notifications
// @access  Private
exports.deleteNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userType = req.userRole;
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new ErrorResponse('Please provide notification IDs to delete', 400);
  }

  const result = await Notification.deleteMany({
    _id: { $in: notificationIds },
    userId,
    userType
  });

  res.status(200).json({
    success: true,
    message: `${result.deletedCount} notification(s) deleted successfully`,
    data: {
      deletedCount: result.deletedCount
    }
  });
});

// @desc    Delete all notifications for current user
// @route   DELETE /api/notifications/all
// @access  Private
exports.deleteAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userType = req.userRole;

  const result = await Notification.deleteMany({
    userId,
    userType
  });

  res.status(200).json({
    success: true,
    message: `All notifications deleted successfully`,
    data: {
      deletedCount: result.deletedCount
    }
  });
});

// @desc    Get filtered students for notifications (by class/board)
// @route   GET /api/admin/notifications/students
// @access  Private (Admin)
exports.getFilteredStudents = asyncHandler(async (req, res) => {
  const { class: classNumber, board } = req.query;

  const query = {
    isActive: true
  };

  if (classNumber) {
    query.class = parseInt(classNumber);
  }

  if (board) {
    query.board = board;
  }

  const students = await Student.find(query)
    .select('_id name phone email class board profileImage')
    .sort({ name: 1 })
    .limit(1000); // Limit to prevent performance issues

  res.status(200).json({
    success: true,
    count: students.length,
    data: {
      students
    }
  });
});

// @desc    Get all teachers for notifications
// @route   GET /api/admin/notifications/teachers
// @access  Private (Admin)
exports.getFilteredTeachers = asyncHandler(async (req, res) => {
  const { class: classNumber } = req.query;

  const query = {
    isActive: true
  };

  // Filter by class if provided
  if (classNumber) {
    const classNum = parseInt(classNumber);
    query.classes = { $in: [classNum] };
  }

  const teachers = await Teacher.find(query)
    .select('_id name phone email profileImage classes')
    .sort({ name: 1 })
    .limit(1000); // Limit to prevent performance issues

  res.status(200).json({
    success: true,
    count: teachers.length,
    data: {
      teachers
    }
  });
});

// @desc    Send notification to filtered recipients
// @route   POST /api/admin/notifications/send
// @access  Private (Admin)
exports.sendNotificationToFiltered = asyncHandler(async (req, res) => {
  const { recipientType, userIds, class: classNumber, board, title, body, data } = req.body;

  if (!recipientType || !['student', 'teacher'].includes(recipientType)) {
    throw new ErrorResponse('Recipient type must be student or teacher', 400);
  }

  if (!title || !body) {
    throw new ErrorResponse('Title and body are required', 400);
  }

  let userIdsToNotify = [];

  if (recipientType === 'student') {
    // Build query for students
    const query = {
      isActive: true,
      fcmToken: { $exists: true, $ne: null }
    };

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // If specific user IDs provided, use those
      query._id = { $in: userIds };
    } else {
      // Otherwise filter by class/board
      if (classNumber) {
        query.class = parseInt(classNumber);
      }
      if (board) {
        query.board = board;
      }
    }

    const students = await Student.find(query).select('_id');
    userIdsToNotify = students.map(s => s._id.toString());
  } else if (recipientType === 'teacher') {
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // If specific user IDs provided, use those
      userIdsToNotify = userIds;
    } else {
      // Otherwise get all active teachers
      const teachers = await Teacher.find({
        isActive: true,
        fcmToken: { $exists: true, $ne: null }
      }).select('_id');
      userIdsToNotify = teachers.map(t => t._id.toString());
    }
  }

  if (userIdsToNotify.length === 0) {
    throw new ErrorResponse('No recipients found matching the criteria', 400);
  }

  const notification = { title, body };

  const result = await notificationService.sendToMultipleUsers(
    userIdsToNotify,
    recipientType,
    notification,
    data || {}
  );

  if (result.success) {
    res.status(200).json({
      success: true,
      message: `Notification sent to ${result.successCount} ${recipientType}(s)`,
      data: {
        ...result,
        totalRecipients: userIdsToNotify.length
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: result.error || 'Failed to send notifications',
      data: result
    });
  }
});

// @desc    Get notification history (grouped by batches)
// @route   GET /api/admin/notifications/history
// @access  Private (Admin)
exports.getNotificationHistory = asyncHandler(async (req, res) => {
  const { recipientType, limit = 50 } = req.query;

  // Build query
  const query = {};
  if (recipientType && ['student', 'teacher'].includes(recipientType)) {
    query.userType = recipientType;
  }

  // Get all notifications, sorted by creation date
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) * 10) // Get more to group properly
    .lean();

  // Group notifications by title, body, and time window (within 5 minutes)
  const groupedNotifications = {};
  const TIME_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds

  notifications.forEach(notif => {
    const key = `${notif.title}|${notif.body}`;
    const notifTime = new Date(notif.createdAt).getTime();

    if (!groupedNotifications[key]) {
      groupedNotifications[key] = {
        title: notif.title,
        body: notif.body,
        recipientType: notif.userType,
        batches: []
      };
    }

    // Find if this notification belongs to an existing batch (within time window)
    let foundBatch = false;
    for (let batch of groupedNotifications[key].batches) {
      const batchTime = new Date(batch.sentAt).getTime();
      if (Math.abs(notifTime - batchTime) <= TIME_WINDOW) {
        batch.recipientCount += 1;
        foundBatch = true;
        break;
      }
    }

    // If no batch found, create a new one
    if (!foundBatch) {
      groupedNotifications[key].batches.push({
        sentAt: notif.createdAt,
        recipientCount: 1
      });
    }
  });

  // Convert to array and sort batches by sentAt
  const history = Object.values(groupedNotifications)
    .map(group => ({
      ...group,
      batches: group.batches.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
    }))
    .sort((a, b) => {
      const aLatest = new Date(a.batches[0].sentAt);
      const bLatest = new Date(b.batches[0].sentAt);
      return bLatest - aLatest;
    })
    .slice(0, parseInt(limit));

  res.status(200).json({
    success: true,
    count: history.length,
    data: {
      history
    }
  });
});

// @desc    Get all notification campaigns
// @route   GET /api/admin/notifications/campaigns
// @access  Private (Admin)
exports.getAllCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await NotificationCampaign.find()
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email')
    .limit(100);

  res.status(200).json({
    success: true,
    count: campaigns.length,
    data: {
      campaigns
    }
  });
});

// @desc    Get single notification campaign
// @route   GET /api/admin/notifications/campaigns/:id
// @access  Private (Admin)
exports.getCampaign = asyncHandler(async (req, res) => {
  const campaign = await NotificationCampaign.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!campaign) {
    throw new ErrorResponse('Notification campaign not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      campaign
    }
  });
});

// @desc    Create notification campaign
// @route   POST /api/admin/notifications/campaigns
// @access  Private (Admin)
exports.createCampaign = asyncHandler(async (req, res) => {
  const { title, body, notificationType, classNumber } = req.body;
  const adminId = req.user._id;

  if (!title || !body) {
    throw new ErrorResponse('Title and body are required', 400);
  }

  if (!notificationType || !['students', 'teachers', 'both', 'class'].includes(notificationType)) {
    throw new ErrorResponse('Valid notification type is required (students, teachers, both, or class)', 400);
  }

  // If type is 'class', classNumber is required
  if (notificationType === 'class' && !classNumber) {
    throw new ErrorResponse('Class number is required for class-based notifications', 400);
  }

  const campaign = await NotificationCampaign.create({
    title,
    body,
    notificationType,
    classNumber: notificationType === 'class' ? parseInt(classNumber) : null,
    createdBy: adminId
  });

  // Automatically send notification based on type
  let totalSent = 0;
  const notification = { title: campaign.title, body: campaign.body };

  if (campaign.notificationType === 'students') {
    // Send to all students
    const students = await Student.find({
      isActive: true,
      fcmToken: { $exists: true, $ne: null }
    }).select('_id');
    
    const studentIds = students.map(s => s._id.toString());
    if (studentIds.length > 0) {
      const result = await notificationService.sendToMultipleUsers(
        studentIds,
        'student',
        notification,
        {}
      );
      if (result.success) {
        totalSent = result.successCount || 0;
      }
    }
  } else if (campaign.notificationType === 'teachers') {
    // Send to all teachers
    const teachers = await Teacher.find({
      isActive: true,
      fcmToken: { $exists: true, $ne: null }
    }).select('_id');
    
    const teacherIds = teachers.map(t => t._id.toString());
    if (teacherIds.length > 0) {
      const result = await notificationService.sendToMultipleUsers(
        teacherIds,
        'teacher',
        notification,
        {}
      );
      if (result.success) {
        totalSent = result.successCount || 0;
      }
    }
  } else if (campaign.notificationType === 'both') {
    // Send to all students and teachers
    const students = await Student.find({
      isActive: true,
      fcmToken: { $exists: true, $ne: null }
    }).select('_id');
    
    const teachers = await Teacher.find({
      isActive: true,
      fcmToken: { $exists: true, $ne: null }
    }).select('_id');

    const studentIds = students.map(s => s._id.toString());
    const teacherIds = teachers.map(t => t._id.toString());

    if (studentIds.length > 0) {
      const studentResult = await notificationService.sendToMultipleUsers(
        studentIds,
        'student',
        notification,
        {}
      );
      if (studentResult.success) {
        totalSent += studentResult.successCount || 0;
      }
    }

    if (teacherIds.length > 0) {
      const teacherResult = await notificationService.sendToMultipleUsers(
        teacherIds,
        'teacher',
        notification,
        {}
      );
      if (teacherResult.success) {
        totalSent += teacherResult.successCount || 0;
      }
    }
  } else if (campaign.notificationType === 'class') {
    // Send to students of that class
    if (!campaign.classNumber) {
      throw new ErrorResponse('Class number is required for class-based notifications', 400);
    }

    const students = await Student.find({
      isActive: true,
      class: parseInt(campaign.classNumber),
      fcmToken: { $exists: true, $ne: null }
    }).select('_id');

    const studentIds = students.map(s => s._id.toString());

    if (studentIds.length > 0) {
      const studentResult = await notificationService.sendToMultipleUsers(
        studentIds,
        'student',
        notification,
        {}
      );
      if (studentResult.success) {
        totalSent = studentResult.successCount || 0;
      }
    }
  }

  // Update campaign with sentAt timestamp
  if (totalSent > 0) {
    campaign.sentAt = new Date();
    await campaign.save();
  }

  res.status(201).json({
    success: true,
    message: totalSent > 0 ? `Notification sent to ${totalSent} recipient(s)` : 'Notification created but no recipients found',
    data: {
      campaign,
      sentCount: totalSent
    }
  });
});

// @desc    Update notification campaign
// @route   PUT /api/admin/notifications/campaigns/:id
// @access  Private (Admin)
exports.updateCampaign = asyncHandler(async (req, res) => {
  const { title, body, notificationType, classNumber } = req.body;

  let campaign = await NotificationCampaign.findById(req.params.id);

  if (!campaign) {
    throw new ErrorResponse('Notification campaign not found', 404);
  }

  // Only allow editing if not sent yet
  if (campaign.sentAt) {
    throw new ErrorResponse('Cannot edit a sent notification campaign', 400);
  }

  if (title) campaign.title = title;
  if (body) campaign.body = body;
  if (notificationType) {
    if (!['students', 'teachers', 'both', 'class'].includes(notificationType)) {
      throw new ErrorResponse('Valid notification type is required (students, teachers, both, or class)', 400);
    }
    campaign.notificationType = notificationType;
  }
  if (notificationType === 'class') {
    if (!classNumber) {
      throw new ErrorResponse('Class number is required for class-based notifications', 400);
    }
    campaign.classNumber = parseInt(classNumber);
  } else {
    campaign.classNumber = null;
  }

  await campaign.save();

  // Automatically send notification if not already sent
  if (!campaign.sentAt) {
    let totalSent = 0;
    const notification = { title: campaign.title, body: campaign.body };

    if (campaign.notificationType === 'students') {
      const students = await Student.find({
        isActive: true,
        fcmToken: { $exists: true, $ne: null }
      }).select('_id');
      
      const studentIds = students.map(s => s._id.toString());
      if (studentIds.length > 0) {
        const result = await notificationService.sendToMultipleUsers(
          studentIds,
          'student',
          notification,
          {}
        );
        if (result.success) {
          totalSent = result.successCount || 0;
        }
      }
    } else if (campaign.notificationType === 'teachers') {
      const teachers = await Teacher.find({
        isActive: true,
        fcmToken: { $exists: true, $ne: null }
      }).select('_id');
      
      const teacherIds = teachers.map(t => t._id.toString());
      if (teacherIds.length > 0) {
        const result = await notificationService.sendToMultipleUsers(
          teacherIds,
          'teacher',
          notification,
          {}
        );
        if (result.success) {
          totalSent = result.successCount || 0;
        }
      }
    } else if (campaign.notificationType === 'both') {
      const students = await Student.find({
        isActive: true,
        fcmToken: { $exists: true, $ne: null }
      }).select('_id');
      
      const teachers = await Teacher.find({
        isActive: true,
        fcmToken: { $exists: true, $ne: null }
      }).select('_id');

      const studentIds = students.map(s => s._id.toString());
      const teacherIds = teachers.map(t => t._id.toString());

      if (studentIds.length > 0) {
        const studentResult = await notificationService.sendToMultipleUsers(
          studentIds,
          'student',
          notification,
          {}
        );
        if (studentResult.success) {
          totalSent += studentResult.successCount || 0;
        }
      }

      if (teacherIds.length > 0) {
        const teacherResult = await notificationService.sendToMultipleUsers(
          teacherIds,
          'teacher',
          notification,
          {}
        );
        if (teacherResult.success) {
          totalSent += teacherResult.successCount || 0;
        }
      }
    } else if (campaign.notificationType === 'class') {
      if (campaign.classNumber) {
        const students = await Student.find({
          isActive: true,
          class: parseInt(campaign.classNumber),
          fcmToken: { $exists: true, $ne: null }
        }).select('_id');

        const studentIds = students.map(s => s._id.toString());

        if (studentIds.length > 0) {
          const studentResult = await notificationService.sendToMultipleUsers(
            studentIds,
            'student',
            notification,
            {}
          );
          if (studentResult.success) {
            totalSent = studentResult.successCount || 0;
          }
        }
      }
    }

    if (totalSent > 0) {
      campaign.sentAt = new Date();
      await campaign.save();
    }
  }

  res.status(200).json({
    success: true,
    message: campaign.sentAt ? 'Notification updated and sent successfully' : 'Notification updated successfully',
    data: {
      campaign
    }
  });
});

// @desc    Delete notification campaign
// @route   DELETE /api/admin/notifications/campaigns/:id
// @access  Private (Admin)
exports.deleteCampaign = asyncHandler(async (req, res) => {
  const campaign = await NotificationCampaign.findById(req.params.id);

  if (!campaign) {
    throw new ErrorResponse('Notification campaign not found', 404);
  }

  await campaign.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Notification campaign deleted successfully'
  });
});

// @desc    Send notification campaign
// @route   POST /api/admin/notifications/campaigns/:id/send
// @access  Private (Admin)
exports.sendCampaign = asyncHandler(async (req, res) => {
  const campaign = await NotificationCampaign.findById(req.params.id);

  if (!campaign) {
    throw new ErrorResponse('Notification campaign not found', 404);
  }

  if (campaign.sentAt) {
    throw new ErrorResponse('Campaign has already been sent', 400);
  }

  let totalSent = 0;
  const notification = { title: campaign.title, body: campaign.body };

  if (campaign.notificationType === 'students') {
    // Send to all students
    const students = await Student.find({
      isActive: true,
      fcmToken: { $exists: true, $ne: null }
    }).select('_id');
    
    const studentIds = students.map(s => s._id.toString());
    if (studentIds.length > 0) {
      const result = await notificationService.sendToMultipleUsers(
        studentIds,
        'student',
        notification,
        {}
      );
      if (result.success) {
        totalSent = result.successCount || 0;
      }
    }
  } else if (campaign.notificationType === 'teachers') {
    // Send to all teachers
    const teachers = await Teacher.find({
      isActive: true,
      fcmToken: { $exists: true, $ne: null }
    }).select('_id');
    
    const teacherIds = teachers.map(t => t._id.toString());
    if (teacherIds.length > 0) {
      const result = await notificationService.sendToMultipleUsers(
        teacherIds,
        'teacher',
        notification,
        {}
      );
      if (result.success) {
        totalSent = result.successCount || 0;
      }
    }
  } else if (campaign.notificationType === 'both') {
    // Send to all students and teachers
    const students = await Student.find({
      isActive: true,
      fcmToken: { $exists: true, $ne: null }
    }).select('_id');
    
    const teachers = await Teacher.find({
      isActive: true,
      fcmToken: { $exists: true, $ne: null }
    }).select('_id');

    const studentIds = students.map(s => s._id.toString());
    const teacherIds = teachers.map(t => t._id.toString());

    if (studentIds.length > 0) {
      const studentResult = await notificationService.sendToMultipleUsers(
        studentIds,
        'student',
        notification,
        {}
      );
      if (studentResult.success) {
        totalSent += studentResult.successCount || 0;
      }
    }

    if (teacherIds.length > 0) {
      const teacherResult = await notificationService.sendToMultipleUsers(
        teacherIds,
        'teacher',
        notification,
        {}
      );
      if (teacherResult.success) {
        totalSent += teacherResult.successCount || 0;
      }
    }
  } else if (campaign.notificationType === 'class') {
    // Send to all students and teachers in a specific class
    if (!campaign.classNumber) {
      throw new ErrorResponse('Class number is required for class-based notifications', 400);
    }

    const students = await Student.find({
      isActive: true,
      class: parseInt(campaign.classNumber),
      fcmToken: { $exists: true, $ne: null }
    }).select('_id');

    const teachers = await Teacher.find({
      isActive: true,
      classes: { $in: [parseInt(campaign.classNumber)] },
      fcmToken: { $exists: true, $ne: null }
    }).select('_id');

    const studentIds = students.map(s => s._id.toString());
    const teacherIds = teachers.map(t => t._id.toString());

    if (studentIds.length > 0) {
      const studentResult = await notificationService.sendToMultipleUsers(
        studentIds,
        'student',
        notification,
        {}
      );
      if (studentResult.success) {
        totalSent += studentResult.successCount || 0;
      }
    }

    if (teacherIds.length > 0) {
      const teacherResult = await notificationService.sendToMultipleUsers(
        teacherIds,
        'teacher',
        notification,
        {}
      );
      if (teacherResult.success) {
        totalSent += teacherResult.successCount || 0;
      }
    }
  }

  if (totalSent === 0) {
    throw new ErrorResponse('No recipients found matching the criteria', 400);
  }

  campaign.sentAt = new Date();
  await campaign.save();

  res.status(200).json({
    success: true,
    message: `Notification sent to ${totalSent} recipient(s)`,
    data: {
      successCount: totalSent,
      totalRecipients: totalSent
    }
  });
});

