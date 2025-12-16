const LiveClass = require('../models/LiveClass');
const Timetable = require('../models/Timetable');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Recording = require('../models/Recording');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const agoraService = require('../services/agoraService');
const agoraRecordingService = require('../services/agoraRecordingService');
const s3Service = require('../services/s3Service');
const notificationService = require('../services/notificationService');
const fs = require('fs');
const path = require('path');

// @desc    Get all live classes (Admin)
// @route   GET /api/admin/live-classes
// @access  Private/Admin
exports.getAllLiveClasses = asyncHandler(async (req, res) => {
  const { status, classId, teacherId } = req.query;

  const query = {};
  if (status) query.status = status;
  if (classId) query.classId = classId;
  if (teacherId) query.teacherId = teacherId;

  const liveClasses = await LiveClass.find(query)
    .populate('timetableId', 'dayOfWeek startTime endTime topic')
    .populate('teacherId', 'name email phone profileImage')
    .populate('classId', 'type class board name classCode')
    .populate('subjectId', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: liveClasses.length,
    data: {
      liveClasses
    }
  });
});

// @desc    Get live classes for teacher
// @route   GET /api/teacher/live-classes
// @access  Private/Teacher
exports.getMyLiveClasses = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const query = { teacherId: req.user._id };
  if (status) query.status = status;

  const liveClasses = await LiveClass.find(query)
    .populate('timetableId', 'dayOfWeek startTime endTime topic')
    .populate('classId', 'type class board name classCode')
    .populate('subjectId', 'name')
    .sort({ scheduledStartTime: -1 });

  res.status(200).json({
    success: true,
    count: liveClasses.length,
    data: {
      liveClasses
    }
  });
});

// @desc    Get live classes for student's class
// @route   GET /api/student/live-classes
// @access  Private/Student
exports.getStudentLiveClasses = asyncHandler(async (req, res) => {
  const Payment = require('../models/Payment');
  const { date, search } = req.query;
  
  console.log('[LiveClass] getStudentLiveClasses called with query params:', { date, search, query: req.query });
  
  const student = await Student.findById(req.user._id);
  
  if (!student || !student.class || !student.board) {
    throw new ErrorResponse('Student class or board not found', 404);
  }

  // Check active subscriptions from both sources
  const now = new Date();
  
  // Get from activeSubscriptions array
  const activeSubsFromArray = (student.activeSubscriptions || []).filter(sub => 
    new Date(sub.endDate) >= now
  );
  
  // Get from Payment records
  const activePayments = await Payment.find({
    studentId: student._id,
    status: 'completed',
    subscriptionEndDate: { $gte: now }
  })
    .populate({
      path: 'subscriptionPlanId',
      select: 'type board classes classId',
      populate: {
        path: 'classId',
        select: '_id name classCode'
      }
    });

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

  // Get preparation class IDs from active preparation subscriptions
  const prepClassIdsFromPayments = activePayments
    .filter(payment => 
      payment.subscriptionPlanId && 
      payment.subscriptionPlanId.type === 'preparation' &&
      payment.subscriptionPlanId.classId
    )
    .map(payment => payment.subscriptionPlanId.classId._id || payment.subscriptionPlanId.classId);
  
  const prepClassIdsFromArray = activeSubsFromArray
    .filter(sub => sub.type === 'preparation' && sub.classId)
    .map(sub => {
      const classId = sub.classId._id || sub.classId;
      return classId ? classId.toString() : null;
    })
    .filter(Boolean);
  
  // Combine and remove duplicates
  const mongoose = require('mongoose');
  const allPrepClassIds = [...new Set([
    ...prepClassIdsFromPayments.map(id => id.toString()),
    ...prepClassIdsFromArray
  ])];
  
  const preparationClassIds = allPrepClassIds
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));

  const allLiveClasses = [];
  const classIds = [];

  // Get regular class live classes
  if (hasActiveClassSubscription) {
    const classItem = await Class.findOne({
      type: 'regular',
      class: student.class,
      board: student.board,
      isActive: true
    });

    if (classItem) {
      classIds.push(classItem._id);
    }
  }

  // Add preparation class IDs
  if (preparationClassIds.length > 0) {
    classIds.push(...preparationClassIds);
  }

  // If no active subscriptions, return empty array
  if (classIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: {
        liveClasses: []
      }
    });
  }

  // Build query for live classes
  const query = {
    classId: { $in: classIds }
  };

  // Filter by date if provided
  if (date) {
    // Parse date string (YYYY-MM-DD) and create UTC date range
    const dateParts = date.split('-');
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(dateParts[2], 10);
      
      // Create UTC date for start of selected day (00:00:00 UTC)
      const selectedDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      // Create UTC date for start of next day (00:00:00 UTC)
      const nextDate = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
      
      console.log('[LiveClass] Date filter:', {
        dateParam: date,
        selectedDateUTC: selectedDate.toISOString(),
        nextDateUTC: nextDate.toISOString(),
        selectedDateLocal: selectedDate.toLocaleString(),
        nextDateLocal: nextDate.toLocaleString()
      });
      
      query.scheduledStartTime = {
        $gte: selectedDate,
        $lt: nextDate
      };
    } else {
      // Fallback: try parsing as ISO string
      const selectedDate = new Date(date);
      if (!isNaN(selectedDate.getTime())) {
        // Convert to UTC start of day
        const year = selectedDate.getUTCFullYear();
        const month = selectedDate.getUTCMonth();
        const day = selectedDate.getUTCDate();
        const startDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
        
        query.scheduledStartTime = {
          $gte: startDate,
          $lt: endDate
        };
      }
    }
  } else {
    // Default: show current date classes (in UTC)
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();
    
    const today = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const tomorrow = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
    
    console.log('[LiveClass] Default date filter (today UTC):', {
      todayUTC: today.toISOString(),
      tomorrowUTC: tomorrow.toISOString(),
      todayLocal: today.toLocaleString(),
      tomorrowLocal: tomorrow.toLocaleString()
    });
    
    query.scheduledStartTime = {
      $gte: today,
      $lt: tomorrow
    };
  }

  // Get live classes for all subscribed classes (all statuses for the date)
  let liveClasses = await LiveClass.find(query)
    .populate('classId', 'type class board name classCode')
    .populate('timetableId', 'dayOfWeek startTime endTime topic')
    .populate('teacherId', 'name email phone profileImage')
    .populate('subjectId', 'name')
    .sort({ scheduledStartTime: 1 });

  // Apply search filter if provided (search is done after date filter)
  if (search && search.trim()) {
    const searchLower = search.toLowerCase().trim();
    console.log('[LiveClass] Applying search filter:', searchLower);
    
    liveClasses = liveClasses.filter(liveClass => {
      const titleMatch = liveClass.title?.toLowerCase().includes(searchLower);
      const subjectMatch = liveClass.subjectId?.name?.toLowerCase().includes(searchLower);
      const teacherMatch = liveClass.teacherId?.name?.toLowerCase().includes(searchLower);
      
      // Also search in date string
      const classDate = new Date(liveClass.scheduledStartTime);
      const dateStr = classDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const dateMatch = dateStr.toLowerCase().includes(searchLower);
      
      return titleMatch || subjectMatch || teacherMatch || dateMatch;
    });
    
    console.log('[LiveClass] Search results count:', liveClasses.length);
  }

  // Determine status for each class and format recording info
  const nowTime = new Date();
  const classesWithStatus = await Promise.all(liveClasses.map(async (liveClass) => {
    const scheduledTime = new Date(liveClass.scheduledStartTime);
    // Calculate end time: use endTime if available, otherwise calculate from scheduledStartTime + duration
    let endTime = null;
    if (liveClass.endTime) {
      endTime = new Date(liveClass.endTime);
    } else if (liveClass.duration && liveClass.duration > 0) {
      endTime = new Date(scheduledTime);
      endTime.setMinutes(endTime.getMinutes() + liveClass.duration);
    }
    
    // Use the actual status from database - don't auto-change based on time
    // Status should only change when teacher explicitly starts/ends the class
    let status = liveClass.status;
    
    // Respect 'ended' status if teacher has explicitly ended the class
    if (liveClass.status === 'ended') {
      status = 'ended';
    }
    // Only auto-update to 'ended' if class is live and end time has passed (fallback)
    // This ensures scheduled classes remain scheduled until teacher starts them
    else if (liveClass.status === 'live' && endTime && nowTime >= endTime) {
      status = 'ended';
    }
    // Keep other statuses as-is (scheduled stays scheduled)

    // Format recording info - also check Recording model for presigned URL
    let recording = null;
    if (liveClass.recording && liveClass.recording.status === 'completed') {
      // Try to find Recording document for this live class to get presigned URL
      let playbackUrl = liveClass.recording.s3Url || liveClass.recording.localPath || null;
      
      // If S3 is configured and we have s3Key, generate presigned URL
      if (s3Service.isConfigured() && liveClass.recording.s3Key) {
        try {
          playbackUrl = await s3Service.getPresignedUrl(liveClass.recording.s3Key, 3600); // 1 hour expiry
        } catch (error) {
          console.error('Error generating presigned URL for live class recording:', error);
          // Fallback to direct URL
          playbackUrl = liveClass.recording.s3Url || liveClass.recording.localPath || null;
        }
      }
      
      recording = {
        ...liveClass.recording.toObject ? liveClass.recording.toObject() : liveClass.recording,
        isAvailable: true,
        playbackUrl: playbackUrl
      };
    } else if (liveClass.recording) {
      recording = {
        ...liveClass.recording.toObject ? liveClass.recording.toObject() : liveClass.recording,
        isAvailable: false,
        playbackUrl: null
      };
    }

    return {
      ...liveClass.toObject(),
      computedStatus: status,
      recording: recording
    };
  }));

  res.status(200).json({
    success: true,
    count: classesWithStatus.length,
    data: {
      liveClasses: classesWithStatus
    }
  });
});

// @desc    Get upcoming scheduled live classes for student dashboard
// @route   GET /api/live-classes/student/upcoming
// @access  Private/Student
exports.getUpcomingLiveClasses = asyncHandler(async (req, res) => {
  const Payment = require('../models/Payment');
  
  const student = await Student.findById(req.user._id);
  
  if (!student || !student.class || !student.board) {
    throw new ErrorResponse('Student class or board not found', 404);
  }

  // Check active subscriptions from both sources
  const now = new Date();
  
  // Get from activeSubscriptions array
  const activeSubsFromArray = (student.activeSubscriptions || []).filter(sub => 
    new Date(sub.endDate) >= now
  );
  
  // Get from Payment records
  const activePayments = await Payment.find({
    studentId: student._id,
    status: 'completed',
    subscriptionEndDate: { $gte: now }
  })
    .populate({
      path: 'subscriptionPlanId',
      select: 'type board classes classId',
      populate: {
        path: 'classId',
        select: '_id name classCode'
      }
    });

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

  // Get preparation class IDs from active preparation subscriptions
  const prepClassIdsFromPayments = activePayments
    .filter(payment => 
      payment.subscriptionPlanId && 
      payment.subscriptionPlanId.type === 'preparation' &&
      payment.subscriptionPlanId.classId
    )
    .map(payment => payment.subscriptionPlanId.classId._id || payment.subscriptionPlanId.classId);
  
  const prepClassIdsFromArray = activeSubsFromArray
    .filter(sub => sub.type === 'preparation' && sub.classId)
    .map(sub => {
      const classId = sub.classId._id || sub.classId;
      return classId ? classId.toString() : null;
    })
    .filter(Boolean);
  
  // Combine and remove duplicates
  const mongoose = require('mongoose');
  const allPrepClassIds = [...new Set([
    ...prepClassIdsFromPayments.map(id => id.toString()),
    ...prepClassIdsFromArray
  ])];
  
  const preparationClassIds = allPrepClassIds
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));

  const classIds = [];

  // Get regular class live classes
  if (hasActiveClassSubscription) {
    const classItem = await Class.findOne({
      type: 'regular',
      class: student.class,
      board: student.board,
      isActive: true
    });

    if (classItem) {
      classIds.push(classItem._id);
    }
  }

  // Add preparation class IDs
  if (preparationClassIds.length > 0) {
    classIds.push(...preparationClassIds);
  }

  // If no active subscriptions, return empty array
  if (classIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: {
        liveClasses: []
      }
    });
  }

  // Get upcoming scheduled live classes (status = 'scheduled' and scheduledStartTime >= now)
  const query = {
    classId: { $in: classIds },
    status: 'scheduled', // Only scheduled classes
    scheduledStartTime: { $gte: now } // Only future classes
  };

  let liveClasses = await LiveClass.find(query)
    .populate('classId', 'type class board name classCode')
    .populate('teacherId', 'name email phone profileImage')
    .populate('subjectId', 'name')
    .sort({ scheduledStartTime: 1 }) // Sort by scheduled time ascending
    .limit(10); // Limit to 10 upcoming classes

  // Format the response
  const formattedClasses = liveClasses.map(liveClass => {
    const scheduledTime = new Date(liveClass.scheduledStartTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduledDate = new Date(scheduledTime);
    scheduledDate.setHours(0, 0, 0, 0);
    
    // Determine if it's today or tomorrow
    let dateLabel = '';
    const diffTime = scheduledDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      dateLabel = 'Today';
    } else if (diffDays === 1) {
      dateLabel = 'Tomorrow';
    } else {
      dateLabel = scheduledTime.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    // Format time
    const timeStr = scheduledTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return {
      _id: liveClass._id,
      id: liveClass._id.toString(),
      title: liveClass.title,
      teacher: liveClass.teacherId?.name || 'Teacher',
      image: null, // No image in live class model
      time: timeStr,
      date: dateLabel,
      scheduledStartTime: liveClass.scheduledStartTime,
      subject: liveClass.subjectId?.name || 'Subject'
    };
  });

  res.status(200).json({
    success: true,
    count: formattedClasses.length,
    data: {
      liveClasses: formattedClasses
    }
  });
});

// @desc    Get teacher's assigned classes/subjects/boards for live class creation
// @route   GET /api/teacher/live-classes/assigned-options
// @access  Private/Teacher
exports.getAssignedOptions = asyncHandler(async (req, res) => {
  // Get all timetables assigned to this teacher
  const timetables = await Timetable.find({
    teacherId: req.user._id,
    isActive: true
  })
    .populate('classId', 'type class board name classCode')
    .populate('subjectId', 'name');

  // Extract unique classes
  const classesMap = new Map();
  // Store class-subject combinations for validation
  const classSubjectMap = new Map(); // classId -> Set of subjectIds

  timetables.forEach(timetable => {
    if (timetable.classId && timetable.subjectId) {
      const classId = timetable.classId._id.toString();
      const subjectId = timetable.subjectId._id.toString();
      
      // Store class
      if (!classesMap.has(classId)) {
        classesMap.set(classId, {
          _id: timetable.classId._id,
          type: timetable.classId.type,
          class: timetable.classId.class,
          board: timetable.classId.board,
          name: timetable.classId.name,
          classCode: timetable.classId.classCode
        });
      }
      
      // Store class-subject combination
      if (!classSubjectMap.has(classId)) {
        classSubjectMap.set(classId, new Set());
      }
      classSubjectMap.get(classId).add(subjectId);
    }
  });

  const classes = Array.from(classesMap.values());
  
  // Get all unique subjects (will be filtered on frontend based on selected class)
  const subjectsMap = new Map();
  timetables.forEach(timetable => {
    if (timetable.subjectId) {
      const subjectKey = timetable.subjectId._id.toString();
      if (!subjectsMap.has(subjectKey)) {
        subjectsMap.set(subjectKey, {
          _id: timetable.subjectId._id,
          name: timetable.subjectId.name
        });
      }
    }
  });
  const subjects = Array.from(subjectsMap.values());
  
  // Get unique boards
  const boardsSet = new Set();
  classes.forEach(cls => {
    if (cls.board) {
      boardsSet.add(cls.board);
    }
  });
  const boards = Array.from(boardsSet);

  // Also return class-subject mapping for frontend filtering
  const classSubjectCombinations = {};
  classSubjectMap.forEach((subjectIds, classId) => {
    classSubjectCombinations[classId] = Array.from(subjectIds);
  });

  res.status(200).json({
    success: true,
    data: {
      classes,
      subjects,
      boards,
      classSubjectCombinations // For frontend to filter subjects by class
    }
  });
});

// @desc    Create live class (Teacher) - Can create anytime without timetable
// @route   POST /api/teacher/live-classes
// @access  Private/Teacher
exports.createLiveClass = asyncHandler(async (req, res) => {
  const { classId, subjectId, title, description } = req.body;

  // Validate required fields
  if (!classId || !subjectId) {
    throw new ErrorResponse('Class ID and Subject ID are required', 400);
  }

  // Verify teacher is assigned to this class and subject combination
  const assignedTimetable = await Timetable.findOne({
    teacherId: req.user._id,
    classId: classId,
    subjectId: subjectId,
    isActive: true
  })
    .populate('classId')
    .populate('subjectId');

  if (!assignedTimetable) {
    throw new ErrorResponse('You are not assigned to teach this class/subject combination', 403);
  }

  // Get class and subject details
  const classItem = await Class.findById(classId);
  const subject = await Subject.findById(subjectId);

  if (!classItem || !subject) {
    throw new ErrorResponse('Class or Subject not found', 404);
  }

  // Generate temporary channel name first (will be updated with actual ID after creation)
  const tempChannelName = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Create live class (timetableId is optional now - can be null)
  const liveClass = await LiveClass.create({
    timetableId: assignedTimetable._id, // Optional - for reference
    teacherId: req.user._id,
    classId: classItem._id,
    subjectId: subject._id,
    title: title || `${subject.name} - ${classItem.name || `Class ${classItem.class}`}`,
    description: description || '',
    agoraChannelName: tempChannelName, // Temporary, will be updated
    agoraAppId: process.env.AGORA_APP_ID,
    scheduledStartTime: new Date(), // Set to now since teacher can create anytime
    status: 'scheduled'
  });

  // Generate Agora channel name using live class ID
  const agoraChannelName = agoraService.generateChannelName(liveClass._id.toString());
  
  // Update with actual channel name
  liveClass.agoraChannelName = agoraChannelName;
  await liveClass.save();

  // Add teacher as participant
  liveClass.participants.push({
    userId: req.user._id,
    userType: 'Teacher',
    joinedAt: new Date()
  });

  await liveClass.save();

  // Get enrolled students for this class
  const students = await Student.find({
    class: classItem.class,
    board: classItem.board,
    isActive: true,
    'subscription.status': 'active'
  });

  // Send notifications to students
  if (students.length > 0) {
    const notificationTitle = 'New Live Class Available!';
    const notificationBody = `${subject.name} live class is available. Join now!`;
    const notificationData = {
      type: 'live_class_created',
      liveClassId: liveClass._id.toString(),
      url: '/live-classes'
    };

    for (const student of students) {
      if (student.fcmToken) {
        try {
          await notificationService.sendToUser(
            student._id.toString(),
            'student',
            { title: notificationTitle, body: notificationBody },
            notificationData
          );
        } catch (err) {
          console.error(`Error sending notification to student ${student._id}:`, err);
        }
      }
    }
  }

  // Populate and return
  const populatedLiveClass = await LiveClass.findById(liveClass._id)
    .populate('timetableId', 'dayOfWeek startTime endTime topic')
    .populate('teacherId', 'name email phone profileImage')
    .populate('classId', 'type class board name classCode')
    .populate('subjectId', 'name');

  res.status(201).json({
    success: true,
    data: {
      liveClass: populatedLiveClass
    }
  });
});

// @desc    Start live class (Teacher)
// @route   PUT /api/teacher/live-classes/:id/start
// @access  Private/Teacher
exports.startLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id)
    .populate('classId')
    .populate('subjectId')
    .populate('teacherId');

  if (!liveClass) {
    throw new ErrorResponse('Live class not found', 404);
  }

  // Verify teacher owns this class
  if (liveClass.teacherId._id.toString() !== req.user._id.toString()) {
    throw new ErrorResponse('Not authorized to start this class', 403);
  }

  if (liveClass.status === 'live') {
    throw new ErrorResponse('Class is already live', 400);
  }

  if (liveClass.status === 'ended' || liveClass.status === 'cancelled') {
    throw new ErrorResponse('Cannot start a class that has ended or been cancelled', 400);
  }

  // Update status
  liveClass.status = 'live';
  liveClass.actualStartTime = new Date();

  console.log('[LiveClass] startLiveClass', {
    liveClassId: liveClass._id.toString(),
    channel: liveClass.agoraChannelName,
    teacherId: req.user._id.toString()
  });

  // Update teacher participant
  const teacherParticipant = liveClass.participants.find(
    p => p.userId.toString() === req.user._id.toString() && p.userType === 'Teacher'
  );
  if (teacherParticipant) {
    teacherParticipant.joinedAt = new Date();
  }

  await liveClass.save();

  // Generate Agora token for teacher (use userId as UID)
  const { RtcRole } = require('agora-token');
  const teacherUid = parseInt(req.user._id.toString().slice(-8), 16) || 0; // Use last 8 chars of userId as UID
  const token = agoraService.generateRtcToken(
    liveClass.agoraChannelName,
    teacherUid,
    RtcRole.PUBLISHER
  );

  // Attempt to start cloud recording (best-effort)
  if (liveClass.isRecordingEnabled && agoraRecordingService && agoraService.isConfigured()) {
    try {
      const acquireRes = await agoraRecordingService.acquire(liveClass.agoraChannelName, teacherUid);
      const resourceId = acquireRes?.resourceId;
      if (resourceId) {
        const startRes = await agoraRecordingService.start(resourceId, liveClass.agoraChannelName, teacherUid, liveClass._id);
        const sid = startRes?.sid;
        console.log('[LiveClass] Recording started', {
          liveClassId: liveClass._id.toString(),
          resourceId,
          sid,
          recorderUid: teacherUid
        });
        liveClass.recording = {
          ...liveClass.recording,
          status: 'recording',
          resourceId,
          sid,
          recorderUid: teacherUid.toString()
        };
        await liveClass.save();
      }
    } catch (recErr) {
      console.error('Failed to start recording:', recErr.message || recErr);
      // Do not block class start if recording fails
      liveClass.recording = {
        ...liveClass.recording,
        status: 'failed',
        error: recErr.message || 'Failed to start recording'
      };
      await liveClass.save();
    }
  }

  res.status(200).json({
    success: true,
    data: {
      liveClass,
      agoraToken: token,
      agoraAppId: liveClass.agoraAppId,
      agoraChannelName: liveClass.agoraChannelName,
      agoraUid: teacherUid // Return UID for frontend
    }
  });
});

// @desc    Join live class (Student/Teacher)
// @route   POST /api/live-classes/:id/join
// @access  Private
exports.joinLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id)
    .populate('classId')
    .populate('subjectId')
    .populate('teacherId');

  if (!liveClass) {
    throw new ErrorResponse('Live class not found', 404);
  }

  if (liveClass.status !== 'live') {
    throw new ErrorResponse('Class is not live', 400);
  }

  const userRole = req.userRole || req.user?.role;
  const userId = req.user._id;

  // Check if user is already a participant (remove duplicates first)
  const userIdStr = userId.toString();
  
  // Remove any duplicate entries for this user
  liveClass.participants = liveClass.participants.filter(
    (p, index, self) => {
      const pUserIdStr = p.userId?.toString() || p.userId;
      // Keep only the first occurrence of this userId
      return self.findIndex(pp => (pp.userId?.toString() || pp.userId) === pUserIdStr) === index;
    }
  );
  
  // Find existing participant
  let participant = liveClass.participants.find(
    p => {
      const pUserIdStr = p.userId?.toString() || p.userId;
      return pUserIdStr === userIdStr;
    }
  );

  if (!participant) {
    // Add new participant
    participant = {
      userId: userId,
      userType: userRole === 'student' ? 'Student' : 'Teacher',
      joinedAt: new Date(),
      isMuted: false,
      isVideoEnabled: true,
      hasRaisedHand: false
    };
    liveClass.participants.push(participant);
    await liveClass.save();
  } else {
    // Update join time if re-joining
    participant.joinedAt = new Date();
    participant.leftAt = undefined;
    await liveClass.save();
  }

  // Generate Agora token (use userId as UID for identification)
  const { RtcRole } = require('agora-token');
  const role = RtcRole.PUBLISHER; // Both teachers and students can publish (camera/mic)
  // Use last 8 characters of userId as UID (convert to number)
  const userUid = parseInt(req.user._id.toString().slice(-8), 16) || 0;
  const token = agoraService.generateRtcToken(
    liveClass.agoraChannelName,
    userUid,
    role
  );

  // Calculate unread message count for this user
  const unreadCount = liveClass.chatMessages.filter(msg => {
    // Message is unread if:
    // 1. It's not from the current user
    // 2. Current user hasn't read it (not in readBy array)
    const msgUserIdStr = msg.userId?.toString() || msg.userId;
    const isOwnMessage = msgUserIdStr === userIdStr;
    if (isOwnMessage) return false; // Own messages are always considered read
    
    const hasRead = msg.readBy && msg.readBy.some(
      read => read.userId?.toString() === userIdStr
    );
    return !hasRead;
  }).length;

  res.status(200).json({
    success: true,
    data: {
      liveClass,
      agoraToken: token,
      agoraAppId: liveClass.agoraAppId,
      agoraChannelName: liveClass.agoraChannelName,
      agoraUid: userUid, // Return UID for frontend
      participant,
      unreadMessageCount: unreadCount
    }
  });
});

// @desc    End live class (Teacher)
// @route   PUT /api/teacher/live-classes/:id/end
// @access  Private/Teacher
exports.endLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    throw new ErrorResponse('Live class not found', 404);
  }

  // Verify teacher owns this class
  if (liveClass.teacherId.toString() !== req.user._id.toString()) {
    throw new ErrorResponse('Not authorized to end this class', 403);
  }

  if (liveClass.status === 'ended') {
    throw new ErrorResponse('Class is already ended', 400);
  }

  // Calculate duration
  const endTime = new Date();
  const duration = liveClass.actualStartTime
    ? Math.floor((endTime - liveClass.actualStartTime) / 1000 / 60)
    : 0;

  liveClass.status = 'ended';
  liveClass.endTime = endTime;
  liveClass.duration = duration;

  // Update all participants' leftAt
  liveClass.participants.forEach(p => {
    if (!p.leftAt) {
      p.leftAt = endTime;
    }
  });

  await liveClass.save();

  console.log('[LiveClass] endLiveClass', {
    liveClassId: liveClass._id.toString(),
    teacherId: req.user._id.toString(),
    durationMinutes: duration
  });

  // Emit socket event immediately to notify all participants that class has ended
  const io = req.app.get('io');
  if (io) {
    io.to(`live-class-${liveClass._id}`).emit('class-ended', {
      liveClassId: liveClass._id,
      message: 'Class has ended'
    });
    console.log('[LiveClass] Class ended event emitted immediately');
  }

  // Send response immediately - don't wait for recording processing
  res.status(200).json({
    success: true,
    data: {
      liveClass
    }
  });

  // Stop cloud recording and process file (best-effort) - do this in background
  // Don't block the response for recording processing
  if (
    liveClass.isRecordingEnabled &&
    liveClass.recording &&
    liveClass.recording.resourceId &&
    liveClass.recording.sid
  ) {
    // Process recording asynchronously without blocking
    (async () => {
      try {
      // Verify recording was actually started before trying to stop
      if (!liveClass.recording?.resourceId || !liveClass.recording?.sid) {
        console.warn('[LiveClass] Recording not started, skipping stop', {
          liveClassId: liveClass._id.toString(),
          hasResourceId: !!liveClass.recording?.resourceId,
          hasSid: !!liveClass.recording?.sid
        });
        liveClass.recording = {
          ...liveClass.recording,
          status: 'failed',
          error: 'Recording was not started successfully'
        };
        await liveClass.save();
        return; // Exit async function
      }
      
      // Use the same UID that started the recording (required by Agora stop API)
      const recorderUid = liveClass.recording.recorderUid || parseInt(liveClass.teacherId.toString().slice(-8), 16) || 0;

      const stopRes = await agoraRecordingService.stop(
        liveClass.recording.resourceId,
        liveClass.recording.sid,
        liveClass.agoraChannelName,
        recorderUid
      );
      console.log('[LiveClass] Recording stop response', {
        liveClassId: liveClass._id.toString(),
        resourceId: liveClass.recording.resourceId,
        sid: liveClass.recording.sid,
        recorderUid,
        stopRes
      });

      // If Agora explicitly reports no data (e.g., code 435), fail fast
      if (stopRes?.code === 435 || /no recorded data/i.test(stopRes?.reason || '')) {
        liveClass.recording = {
          ...liveClass.recording,
          status: 'failed',
          error: stopRes?.reason || 'No recorded data returned by Agora'
        };
        await liveClass.save();
        console.warn('[LiveClass] Recording failed: no data from Agora', {
          liveClassId: liveClass._id.toString(),
          stopRes
        });
        return; // Exit async function, response already sent
      }

      // Extract file list; if missing, try querying a few times (handles Agora code 65/request not completed)
      let fileList = stopRes?.fileList || stopRes?.serverResponse?.fileList;
      if (!fileList) {
        console.log('[Recording] No fileList in stop response, querying Agora...');
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            const queryRes = await agoraRecordingService.query(
              liveClass.recording.resourceId,
              liveClass.recording.sid
            );
            
            // Check recording status
            const status = queryRes?.serverResponse?.status;
            console.log('[Recording] Query response status:', status, { attempt });
            
            // Status: 0=idle, 1=recording, 2=stopped, 3=error
            if (status === 3) {
              console.error('[Recording] Recording status is error');
              throw new Error('Recording status is error');
            }
            
            // If still recording, wait longer
            if (status === 1) {
              console.log('[Recording] Still recording, waiting...');
              await new Promise(r => setTimeout(r, 5000));
              continue;
            }
            
            fileList = queryRes?.fileList || queryRes?.serverResponse?.fileList;
            if (fileList) {
              console.log('[Recording] Retrieved fileList via query', { attempt, fileList });
              break;
            } else {
              console.log('[Recording] No fileList in query response, waiting...', { attempt });
              await new Promise(r => setTimeout(r, 5000));
            }
          } catch (qErr) {
            // If 404, recording doesn't exist
            if (qErr?.response?.status === 404) {
              console.error('[Recording] Query returned 404 - recording session not found', {
                attempt,
                resourceId: liveClass.recording.resourceId,
                sid: liveClass.recording.sid,
                error: qErr?.message || qErr
              });
              // If it's the last attempt, mark as failed
              if (attempt === 5) {
                liveClass.recording = {
                  ...liveClass.recording,
                  status: 'failed',
                  error: 'Recording session not found. Recording may not have been started successfully.'
                };
                await liveClass.save();
                console.warn('[LiveClass] Recording failed: session not found', { liveClassId: liveClass._id.toString() });
                return; // Exit async function
              }
              // Wait longer before retrying 404
              await new Promise(r => setTimeout(r, 10000));
            } else {
              console.warn('[Recording] Query after missing fileList failed', { attempt, error: qErr?.message || qErr });
              await new Promise(r => setTimeout(r, 5000));
            }
          }
        }
      }

      // If still no fileList, mark failed with detail and return
      if (!fileList) {
        liveClass.recording = {
          ...liveClass.recording,
          status: 'failed',
          error: stopRes?.reason || 'No recording file returned from Agora after multiple queries'
        };
        await liveClass.save();
        console.warn('[LiveClass] Recording failed: no fileUrl', { liveClassId: liveClass._id.toString(), stopRes });
        return; // Exit async function, response already sent
      }
      // fileList can be a string (comma-separated or single name) or array of file objects
      if (typeof fileList === 'string') {
        // When no 3rd party storage, Agora returns file name as string (e.g., *.m3u8)
        fileList = fileList.split(',').map(f => f.trim()).filter(Boolean);
      }
      const firstFile =
        Array.isArray(fileList) && fileList.length > 0
          ? fileList[0]
          : null;

      // Build download URL from Agora cloud if we don't have a direct URL
      const fileName =
        typeof firstFile === 'string'
          ? firstFile
          : firstFile?.fileUrl || firstFile?.file_name || firstFile?.fileName || firstFile?.url;

      if (fileName) {
        // Ensure local folder
        const recordingsDir = path.join(__dirname, '..', 'uploads', 'recordings', liveClass._id.toString());
        if (!fs.existsSync(recordingsDir)) {
          fs.mkdirSync(recordingsDir, { recursive: true });
        }

        const safeFileName = path.basename(fileName) || `recording_${Date.now()}.m3u8`;
        const localPath = path.join(recordingsDir, safeFileName);

        const bucket = process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET;
        const recordFolder = process.env.AWS_S3_RECORDINGS_FOLDER || 'recordings';
        const s3Key = `${recordFolder}/${liveClass._id.toString()}/${safeFileName}`;
        const s3Url = `https://${bucket || ''}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;

        let downloaded = false;

        // Give Agora more time to finalize artifacts to reduce early 404s
        await new Promise(r => setTimeout(r, 20000));

        // First try to pull from S3 if it should already be there (storageConfig direct upload)
        if (s3Service.isConfigured() && bucket) {
          try {
            let exists = false;
            // Poll a bit longer before falling back to Agora (avoid 404 from Agora OSS)
            for (let i = 0; i < 12; i++) {
              exists = await s3Service.objectExists(s3Key);
              if (exists) break;
              await new Promise(r => setTimeout(r, 6000));
            }
            if (exists) {
              await s3Service.downloadToFile(s3Key, localPath);
              downloaded = true;
              console.log('[LiveClass] Local copy downloaded from S3', { liveClassId: liveClass._id.toString(), localPath });
            } else {
              console.warn('[LiveClass] S3 object not found after wait, will try Agora download', { liveClassId: liveClass._id.toString(), s3Key });
            }
          } catch (s3dlErr) {
            console.warn('[LiveClass] Failed S3 download attempt, will try Agora', s3dlErr?.message || s3dlErr);
          }
        }

        // If not downloaded, fetch from Agora
        if (!downloaded) {
          if (firstFile?.fileUrl || firstFile?.url) {
            const directUrl = firstFile.fileUrl || firstFile.url;
            await agoraRecordingService.downloadFile(directUrl, localPath);
          } else {
            await agoraRecordingService.downloadRecordingWithRetry({
              resourceId: liveClass.recording.resourceId,
              sid: liveClass.recording.sid,
              fileName: safeFileName,
              destPath: localPath,
              maxAttempts: 15,
              delayMs: 10000
            });
          }
          downloaded = true;
          console.log('[LiveClass] Recording downloaded from Agora', { liveClassId: liveClass._id.toString(), localPath });
        }

        // Upload to S3 (preserve original filename) if configured and not already present
        let finalS3Url = s3Service.isConfigured() ? s3Url : null;
        let finalS3Key = s3Service.isConfigured() ? s3Key : null;
        let uploadedNow = false;
        if (s3Service.isConfigured() && bucket) {
          const exists = await s3Service.objectExists(s3Key).catch(() => false);
          if (!exists && downloaded) {
            const contentType = safeFileName.endsWith('.m3u8')
              ? 'application/vnd.apple.mpegurl'
              : 'video/mp4';
            try {
              const uploaded = await s3Service.uploadFile(localPath, s3Key, contentType);
              finalS3Url = uploaded.s3Url;
              finalS3Key = uploaded.s3Key;
              uploadedNow = true;
              console.log('[LiveClass] Recording uploaded to S3 (manual)', { liveClassId: liveClass._id.toString(), finalS3Key });
            } catch (uploadErr) {
              console.error('Failed to upload recording to S3:', uploadErr);
            }
          }
        }

        const stats = fs.statSync(localPath);
        const fileSize = stats.size;

        // Update live class recording info
        liveClass.recording = {
          status: finalS3Url ? 'completed' : 'processing',
          localPath,
          s3Url: finalS3Url,
          s3Key: finalS3Key,
          fileSize,
          duration: liveClass.duration ? liveClass.duration * 60 : undefined,
          uploadedAt: finalS3Url ? new Date() : undefined,
          resourceId: liveClass.recording.resourceId,
          sid: liveClass.recording.sid,
          // Keep track of the raw file name returned by Agora for reference
          remoteUrl: safeFileName
        };
        await liveClass.save();

        // Create Recording document
        await Recording.create({
          liveClassId: liveClass._id,
          timetableId: liveClass.timetableId,
          classId: liveClass.classId,
          subjectId: liveClass.subjectId,
          teacherId: liveClass.teacherId,
          title: liveClass.title,
          description: liveClass.description,
          localPath,
          s3Url: finalS3Url,
          s3Key: finalS3Key,
          status: finalS3Url ? 'completed' : 'processing',
          duration: liveClass.duration ? liveClass.duration * 60 : undefined,
          fileSize,
          uploadedAt: finalS3Url ? new Date() : undefined
        });

        // Remove local file after upload
        if (s3Url) {
          try {
            fs.unlinkSync(localPath);
            const dirFiles = fs.readdirSync(recordingsDir);
            if (dirFiles.length === 0) {
              fs.rmdirSync(recordingsDir, { recursive: true });
            }
            console.log('[LiveClass] Local recording cleaned', { liveClassId: liveClass._id.toString(), localPath });
          } catch (cleanupErr) {
            console.warn('Failed to clean up local recording:', cleanupErr);
          }
        }
      } else {
        liveClass.recording = {
          ...liveClass.recording,
          status: 'failed',
          error: 'No recording file returned from Agora'
        };
        await liveClass.save();
        console.warn('[LiveClass] Recording failed: no fileUrl', { liveClassId: liveClass._id.toString(), stopRes });
      }
      } catch (stopErr) {
        console.error('Failed to stop/process recording:', stopErr);
        liveClass.recording = {
          ...liveClass.recording,
          status: 'failed',
          error: stopErr.message || 'Failed to stop recording'
        };
        await liveClass.save();
      }
    })(); // End of async IIFE - process recording in background
  }
});

// @desc    Send chat message
// @route   POST /api/live-classes/:id/chat
// @access  Private
exports.sendChatMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    throw new ErrorResponse('Message is required', 400);
  }

  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    throw new ErrorResponse('Live class not found', 404);
  }

  if (liveClass.status !== 'live') {
    throw new ErrorResponse('Class is not live', 400);
  }

  const userRole = req.userRole || req.user?.role;
  const userName = req.user.name || 'Unknown User';

  // Add chat message with empty readBy array
  liveClass.chatMessages.push({
    userId: req.user._id,
    userType: userRole === 'student' ? 'Student' : 'Teacher',
    userName,
    message: message.trim(),
    timestamp: new Date(),
    readBy: [] // Initialize empty readBy array
  });

  await liveClass.save();

  res.status(200).json({
    success: true,
    data: {
      message: liveClass.chatMessages[liveClass.chatMessages.length - 1]
    }
  });
});

// @desc    Mark chat messages as read
// @route   PUT /api/live-classes/:id/chat/mark-read
// @access  Private
exports.markChatMessagesAsRead = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    throw new ErrorResponse('Live class not found', 404);
  }

  if (liveClass.status !== 'live') {
    throw new ErrorResponse('Class is not live', 400);
  }

  const userId = req.user._id;
  const userIdStr = userId.toString();
  let markedCount = 0;

  // Mark all unread messages as read for this user
  liveClass.chatMessages.forEach(msg => {
    const msgUserIdStr = msg.userId?.toString() || msg.userId;
    const isOwnMessage = msgUserIdStr === userIdStr;
    
    // Skip own messages (they're already considered read)
    if (isOwnMessage) return;

    // Check if already read
    const hasRead = msg.readBy && msg.readBy.some(
      read => read.userId?.toString() === userIdStr
    );

    if (!hasRead) {
      // Add to readBy array if not already there
      if (!msg.readBy) {
        msg.readBy = [];
      }
      msg.readBy.push({
        userId: userId,
        readAt: new Date()
      });
      markedCount++;
    }
  });

  await liveClass.save();

  res.status(200).json({
    success: true,
    data: {
      markedCount,
      unreadCount: 0 // All messages are now read
    }
  });
});

// @desc    Toggle hand raise (Student)
// @route   PUT /api/live-classes/:id/hand-raise
// @access  Private/Student
exports.toggleHandRaise = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    throw new ErrorResponse('Live class not found', 404);
  }

  if (liveClass.status !== 'live') {
    throw new ErrorResponse('Class is not live', 400);
  }

  const participant = liveClass.participants.find(
    p => p.userId.toString() === req.user._id.toString()
  );

  if (!participant) {
    throw new ErrorResponse('You are not a participant in this class', 403);
  }

  participant.hasRaisedHand = !participant.hasRaisedHand;
  await liveClass.save();

  res.status(200).json({
    success: true,
    data: {
      hasRaisedHand: participant.hasRaisedHand
    }
  });
});

// @desc    Toggle mute/unmute
// @route   PUT /api/live-classes/:id/mute
// @access  Private
exports.toggleMute = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    throw new ErrorResponse('Live class not found', 404);
  }

  if (liveClass.status !== 'live') {
    throw new ErrorResponse('Class is not live', 400);
  }

  const participant = liveClass.participants.find(
    p => p.userId.toString() === req.user._id.toString()
  );

  if (!participant) {
    throw new ErrorResponse('You are not a participant in this class', 403);
  }

  participant.isMuted = !participant.isMuted;
  await liveClass.save();

  res.status(200).json({
    success: true,
    data: {
      isMuted: participant.isMuted
    }
  });
});

// @desc    Toggle video
// @route   PUT /api/live-classes/:id/video
// @access  Private
exports.toggleVideo = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    throw new ErrorResponse('Live class not found', 404);
  }

  if (liveClass.status !== 'live') {
    throw new ErrorResponse('Class is not live', 400);
  }

  const participant = liveClass.participants.find(
    p => p.userId.toString() === req.user._id.toString()
  );

  if (!participant) {
    throw new ErrorResponse('You are not a participant in this class', 403);
  }

  participant.isVideoEnabled = !participant.isVideoEnabled;
  await liveClass.save();

  res.status(200).json({
    success: true,
    data: {
      isVideoEnabled: participant.isVideoEnabled
    }
  });
});

// @desc    Get live class details
// @route   GET /api/live-classes/:id
// @access  Private
exports.getLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id)
    .populate('timetableId', 'dayOfWeek startTime endTime topic')
    .populate('teacherId', 'name email phone profileImage')
    .populate('classId', 'type class board name classCode')
    .populate('subjectId', 'name')
    .populate('participants.userId', 'name email phone profileImage');

  if (!liveClass) {
    throw new ErrorResponse('Live class not found', 404);
  }

  // Format recording info with presigned URL if available
  let recordingInfo = null;
  if (liveClass.recording && liveClass.recording.status === 'completed') {
    let playbackUrl = liveClass.recording.s3Url || liveClass.recording.localPath || null;
    
    // If S3 is configured and we have s3Key, generate presigned URL
    if (s3Service.isConfigured() && liveClass.recording.s3Key) {
      try {
        playbackUrl = await s3Service.getPresignedUrl(liveClass.recording.s3Key, 3600); // 1 hour expiry
      } catch (error) {
        console.error('Error generating presigned URL for live class recording:', error);
        // Fallback to direct URL
        playbackUrl = liveClass.recording.s3Url || liveClass.recording.localPath || null;
      }
    }
    
    recordingInfo = {
      ...liveClass.recording.toObject ? liveClass.recording.toObject() : liveClass.recording,
      isAvailable: true,
      playbackUrl: playbackUrl
    };
  } else if (liveClass.recording) {
    recordingInfo = {
      ...liveClass.recording.toObject ? liveClass.recording.toObject() : liveClass.recording,
      isAvailable: false,
      playbackUrl: null
    };
  }

  // Convert to object and update recording
  const liveClassObj = liveClass.toObject();
  if (recordingInfo) {
    liveClassObj.recording = recordingInfo;
  }

  res.status(200).json({
    success: true,
    data: {
      liveClass: liveClassObj
    }
  });
});

// @desc    Upload recording to S3 (from client-side recording)
// @route   POST /api/teacher/live-classes/:id/upload-recording
// @access  Private/Teacher
exports.uploadRecording = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    throw new ErrorResponse('Live class not found', 404);
  }

  // Verify teacher owns this class
  if (liveClass.teacherId.toString() !== req.user._id.toString()) {
    throw new ErrorResponse('Not authorized', 403);
  }

  // Allow upload even if class is still live (for client-side recording)
  if (liveClass.status === 'cancelled') {
    throw new ErrorResponse('Cannot upload recording for cancelled class', 400);
  }

  // Check if file was uploaded
  if (!req.file) {
    throw new ErrorResponse('No recording file provided', 400);
  }

  // Verify the file exists and has content
  if (!fs.existsSync(req.file.path)) {
    console.error('[Upload Recording] ERROR: File not found on disk:', req.file.path);
    return res.status(500).json({
      success: false,
      message: 'File was not saved to disk',
    });
  }

  const fileStats = fs.statSync(req.file.path);
  if (fileStats.size === 0) {
    console.error('[Upload Recording] ERROR: File is empty:', req.file.path);
    fs.unlinkSync(req.file.path); // Delete empty file
    return res.status(400).json({
      success: false,
      message: 'Uploaded file is empty',
    });
  }

  console.log('[Upload Recording] File verified on disk:', {
    path: req.file.path,
    size: fileStats.size,
    sizeInMB: (fileStats.size / (1024 * 1024)).toFixed(2),
  });

  // Update recording status
  liveClass.recording.status = 'uploading';
  liveClass.recording.localPath = req.file.path;
  liveClass.recording.fileSize = fileStats.size;
  await liveClass.save();

  try {
    // Upload to S3
    const { s3Url, s3Key } = await s3Service.uploadRecording(req.file.path, liveClass._id.toString());

    // Update live class with S3 info
    liveClass.recording.status = 'completed';
    liveClass.recording.s3Url = s3Url;
    liveClass.recording.s3Key = s3Key;
    liveClass.recording.uploadedAt = new Date();
    await liveClass.save();

    // Create recording record
    const recording = await Recording.create({
      liveClassId: liveClass._id,
      timetableId: liveClass.timetableId,
      classId: liveClass.classId,
      subjectId: liveClass.subjectId,
      teacherId: liveClass.teacherId,
      title: liveClass.title,
      description: liveClass.description,
      localPath: req.file.path,
      s3Url,
      s3Key,
      status: 'completed',
      duration: liveClass.duration ? liveClass.duration * 60 : 0, // Convert minutes to seconds
      fileSize: fileStats.size,
      uploadedAt: new Date()
    });

    // Delete local file after successful S3 upload
    try {
      fs.unlinkSync(req.file.path);
      console.log(`Deleted local recording file: ${req.file.path}`);
    } catch (deleteError) {
      console.error('Error deleting local file:', deleteError);
      // Don't throw error, S3 upload was successful
    }

    console.log('[Upload Recording] ✅ Recording uploaded and saved successfully:', {
      liveClassId: liveClass._id.toString(),
      s3Url,
      s3Key,
      fileSize: fileStats.size,
    });

    res.status(200).json({
      success: true,
      message: 'Recording uploaded successfully',
      data: {
        recording,
        s3Url,
        s3Key
      }
    });
  } catch (error) {
    // Update status to failed
    liveClass.recording.status = 'failed';
    liveClass.recording.error = error.message;
    await liveClass.save();

    // Delete uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('[Upload Recording] Error deleting file:', unlinkError);
      }
    }

    throw new ErrorResponse(`Failed to upload recording: ${error.message}`, 500);
  }
});

// @desc    Get recordings for student's subscribed classes (regular + preparation)
// @route   GET /api/student/recordings
// @access  Private/Student
exports.getStudentRecordings = asyncHandler(async (req, res) => {
  const Payment = require('../models/Payment');
  const Class = require('../models/Class');
  const student = await Student.findById(req.user._id || req.user.id);
  
  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }

  const now = new Date();
  const activePayments = await Payment.find({
    studentId: student._id,
    status: 'completed',
    subscriptionEndDate: { $gte: now }
  })
    .populate({
      path: 'subscriptionPlanId',
      select: 'type board classes classId',
      populate: { path: 'classId', select: '_id name classCode' }
    });

  const classIds = [];

  // Regular class subscription
  const hasActiveClassSubscription = activePayments.some(payment => 
    payment.subscriptionPlanId && 
    payment.subscriptionPlanId.type === 'regular' &&
    payment.subscriptionPlanId.board === student.board &&
    payment.subscriptionPlanId.classes &&
    payment.subscriptionPlanId.classes.includes(student.class)
  );

  if (hasActiveClassSubscription) {
    const classItem = await Class.findOne({
      type: 'regular',
      class: student.class,
      board: student.board,
      isActive: true
    });
    if (classItem) classIds.push(classItem._id);
  }

  // Preparation classes
  const preparationClassIds = activePayments
    .filter(payment => 
      payment.subscriptionPlanId && 
      payment.subscriptionPlanId.type === 'preparation' && 
      payment.subscriptionPlanId.classId
    )
    .map(payment => payment.subscriptionPlanId.classId._id || payment.subscriptionPlanId.classId);

  classIds.push(...preparationClassIds);

  if (classIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: { recordings: [] }
    });
  }

  const recordings = await Recording.find({
    classId: { $in: classIds },
    status: 'completed',
    isActive: true
  })
    .populate('teacherId', 'name email phone profileImage')
    .populate('subjectId', 'name')
    .populate('timetableId', 'dayOfWeek startTime endTime topic')
    .sort({ createdAt: -1 });

  // Generate presigned URLs for all recordings
  const recordingsWithUrls = await Promise.all(recordings.map(async (recording) => {
    let playbackUrl = recording.s3Url || recording.localPath || null;
    
    // If S3 is configured and we have s3Key, generate presigned URL
    if (s3Service.isConfigured() && recording.s3Key) {
      try {
        playbackUrl = await s3Service.getPresignedUrl(recording.s3Key, 3600); // 1 hour expiry
      } catch (error) {
        console.error('Error generating presigned URL for recording:', error);
        // Fallback to direct URL
        playbackUrl = recording.s3Url || recording.localPath || null;
      }
    }
    
    return {
      ...recording.toObject(),
      playbackUrl: playbackUrl
    };
  }));

  res.status(200).json({
    success: true,
    count: recordingsWithUrls.length,
    data: {
      recordings: recordingsWithUrls
    }
  });
});

// @desc    Get recording by ID
// @route   GET /api/recordings/:id
// @access  Private
exports.getRecording = asyncHandler(async (req, res) => {
  const recording = await Recording.findById(req.params.id)
    .populate('teacherId', 'name email phone profileImage')
    .populate('subjectId', 'name')
    .populate('classId', 'type class board name classCode')
    .populate('timetableId', 'dayOfWeek startTime endTime topic');

  if (!recording) {
    throw new ErrorResponse('Recording not found', 404);
  }

  // Generate presigned URL if S3 is configured
  let playbackUrl = recording.s3Url;
  if (s3Service.isConfigured() && recording.s3Key) {
    try {
      playbackUrl = await s3Service.getPresignedUrl(recording.s3Key, 3600); // 1 hour expiry
    } catch (error) {
      console.error('Error generating presigned URL:', error);
    }
  }

  res.status(200).json({
    success: true,
    data: {
      recording: {
        ...recording.toObject(),
        playbackUrl
      }
    }
  });
});

