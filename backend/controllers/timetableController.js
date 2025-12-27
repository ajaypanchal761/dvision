const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const notificationService = require('../services/notificationService');

// @desc    Get timetable statistics (Admin)
// @route   GET /api/admin/timetables/statistics
// @access  Private/Admin
exports.getTimetableStatistics = asyncHandler(async (req, res) => {
  // Get overall statistics (not filtered by search or pagination)
  const totalTimetables = await Timetable.countDocuments({});
  const activeTimetables = await Timetable.countDocuments({ isActive: true });
  const inactiveTimetables = await Timetable.countDocuments({ isActive: false });

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        totalTimetables,
        activeTimetables,
        inactiveTimetables
      }
    }
  });
});

// @desc    Get all timetables (Admin)
// @route   GET /api/admin/timetables
// @access  Private/Admin
exports.getAllTimetables = asyncHandler(async (req, res) => {
  const { classId, dayOfWeek, teacherId, page = 1, limit = 10, search } = req.query;

  const query = {};
  if (classId) query.classId = classId;
  if (dayOfWeek) query.dayOfWeek = dayOfWeek;
  if (teacherId) query.teacherId = teacherId;

  // By default, show only active timetables unless explicitly filtered
  if (req.query.isActive === undefined) {
    query.isActive = true;
  } else {
    query.isActive = req.query.isActive === 'true';
  }

  // Add search functionality
  if (search) {
    query.$or = [
      { dayOfWeek: { $regex: search.trim(), $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Timetable.countDocuments(query);

  const timetables = await Timetable.find(query)
    .populate('classId', 'type class board name classCode')
    .populate('subjectId', 'name')
    .populate('teacherId', 'name email phone')
    .sort({ dayOfWeek: 1, startTime: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: timetables.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      timetables
    }
  });
});

// @desc    Get timetable by ID
// @route   GET /api/admin/timetables/:id
// @access  Private/Admin
exports.getTimetable = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id)
    .populate('classId', 'type class board name classCode')
    .populate('subjectId', 'name')
    .populate('teacherId', 'name email phone');

  if (!timetable) {
    throw new ErrorResponse(`Timetable not found with id of ${req.params.id}`, 404);
  }

  res.status(200).json({
    success: true,
    data: {
      timetable
    }
  });
});

// @desc    Get timetables for a class (Student/Teacher)
// @route   GET /api/timetables/class/:classId
// @access  Private
exports.getTimetablesByClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { dayOfWeek } = req.query;

  const query = { classId, isActive: true };
  if (dayOfWeek) query.dayOfWeek = dayOfWeek;

  const timetables = await Timetable.find(query)
    .populate('classId', 'type class board name classCode')
    .populate('subjectId', 'name')
    .populate('teacherId', 'name email phone profileImage')
    .sort({ dayOfWeek: 1, startTime: 1 });

  res.status(200).json({
    success: true,
    count: timetables.length,
    data: {
      timetables
    }
  });
});

// @desc    Get timetables for current student's class (including preparation classes)
// @route   GET /api/timetables/my-class
// @access  Private/Student
exports.getMyClassTimetable = asyncHandler(async (req, res) => {
  const Payment = require('../models/Payment');
  const student = await Student.findById(req.user._id);

  if (!student || !student.class || !student.board) {
    throw new ErrorResponse('Student class or board not found', 404);
  }

  // Check active subscriptions
  const now = new Date();
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

  // Also honor activeSubscriptions saved on the student document (for cases where payments are not stored)
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

  // Get preparation class IDs from active preparation subscriptions
  const preparationClassIds = [
    ...activePayments
      .filter(payment =>
        payment.subscriptionPlanId &&
        payment.subscriptionPlanId.type === 'preparation' &&
        payment.subscriptionPlanId.classId
      )
      .map(payment => payment.subscriptionPlanId.classId._id || payment.subscriptionPlanId.classId),
    ...activeSubsFromArray
      .filter(sub => sub.type === 'preparation' && sub.classId)
      .map(sub => sub.classId._id || sub.classId)
  ].map(id => id.toString());

  const { dayOfWeek } = req.query;
  const allTimetables = [];
  const classes = [];

  // Get regular class timetable
  if (hasActiveClassSubscription) {
    const classItem = await Class.findOne({
      type: 'regular',
      class: student.class,
      board: student.board,
      isActive: true
    });

    if (classItem) {
      const query = { classId: classItem._id, isActive: true };
      if (dayOfWeek) query.dayOfWeek = dayOfWeek;

      const regularTimetables = await Timetable.find(query)
        .populate('classId', 'type class board name classCode')
        .populate('subjectId', 'name')
        .populate('teacherId', 'name email phone profileImage')
        .sort({ dayOfWeek: 1, startTime: 1 });

      allTimetables.push(...regularTimetables);
      classes.push(classItem);
    }
  }

  // Get preparation class timetables
  if (preparationClassIds.length > 0) {
    const prepClasses = await Class.find({
      _id: { $in: preparationClassIds },
      isActive: true
    });

    for (const prepClass of prepClasses) {
      const query = { classId: prepClass._id, isActive: true };
      if (dayOfWeek) query.dayOfWeek = dayOfWeek;

      const prepTimetables = await Timetable.find(query)
        .populate('classId', 'type class board name classCode')
        .populate('subjectId', 'name')
        .populate('teacherId', 'name email phone profileImage')
        .sort({ dayOfWeek: 1, startTime: 1 });

      allTimetables.push(...prepTimetables);
      classes.push(prepClass);
    }
  }

  // Sort all timetables by day and time
  allTimetables.sort((a, b) => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  res.status(200).json({
    success: true,
    count: allTimetables.length,
    data: {
      timetables: allTimetables,
      classes: classes,
      hasActiveClassSubscription,
      hasActivePreparationSubscription: preparationClassIds.length > 0
    }
  });
});

// @desc    Get timetables for current teacher
// @route   GET /api/timetables/my-schedule
// @access  Private/Teacher
exports.getMySchedule = asyncHandler(async (req, res) => {
  const { dayOfWeek } = req.query;
  const query = { teacherId: req.user._id, isActive: true };
  if (dayOfWeek) query.dayOfWeek = dayOfWeek;

  const timetables = await Timetable.find(query)
    .populate('classId', 'type class board name classCode')
    .populate('subjectId', 'name')
    .populate('teacherId', 'name email phone')
    .sort({ dayOfWeek: 1, startTime: 1 });

  res.status(200).json({
    success: true,
    count: timetables.length,
    data: {
      timetables
    }
  });
});

// @desc    Create timetable (Admin)
// @route   POST /api/admin/timetables
// @access  Private/Admin
exports.createTimetable = asyncHandler(async (req, res) => {
  const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, thumbnail, topic } = req.body;

  // Validate required fields
  if (!classId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime) {
    throw new ErrorResponse('Please provide all required fields', 400);
  }

  // Validate class exists
  const classItem = await Class.findById(classId);
  if (!classItem) {
    throw new ErrorResponse('Class not found', 404);
  }

  // Validate subject exists and belongs to class
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new ErrorResponse('Subject not found', 404);
  }
  if (subject.classId.toString() !== classId.toString()) {
    throw new ErrorResponse('Subject does not belong to this class', 400);
  }

  // Validate teacher exists
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new ErrorResponse('Teacher not found', 404);
  }

  // Validate time format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    throw new ErrorResponse('Invalid time format. Use HH:MM format', 400);
  }

  // Validate end time is after start time
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (endMinutes <= startMinutes) {
    throw new ErrorResponse('End time must be after start time', 400);
  }

  // Check if same subject is already scheduled on same day for same course
  const sameSubjectSameDay = await Timetable.findOne({
    classId,
    subjectId,
    dayOfWeek,
    isActive: true
  });

  if (sameSubjectSameDay) {
    throw new ErrorResponse(`Subject is already scheduled on ${dayOfWeek} for this course. A subject can only be scheduled once per day for a course.`, 400);
  }

  // Check for conflicts (same class, same day, overlapping time)
  const conflictingTimetable = await Timetable.findOne({
    classId,
    dayOfWeek,
    isActive: true,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  });

  if (conflictingTimetable) {
    throw new ErrorResponse('Time slot conflicts with existing timetable in this class', 400);
  }

  // Check minimum gap between new class and existing classes in same course (15 minutes)
  const existingTimetables = await Timetable.find({
    classId,
    dayOfWeek,
    isActive: true
  });

  // Reuse startMinutes and endMinutes already calculated above
  const minGap = 15; // 15 minutes minimum gap

  for (const existing of existingTimetables) {
    const [existingStartHour, existingStartMin] = existing.startTime.split(':').map(Number);
    const [existingEndHour, existingEndMin] = existing.endTime.split(':').map(Number);
    const existingStartMinutes = existingStartHour * 60 + existingStartMin;
    const existingEndMinutes = existingEndHour * 60 + existingEndMin;

    // Check if existing class ends and new class starts with less than minGap
    if (existingEndMinutes < startMinutes && (startMinutes - existingEndMinutes) < minGap) {
      throw new ErrorResponse(`Minimum gap of ${minGap} minutes required between classes. There is only ${startMinutes - existingEndMinutes} minutes gap after existing class ending at ${existing.endTime}.`, 400);
    }

    // Check if new class ends and existing class starts with less than minGap
    if (endMinutes < existingStartMinutes && (existingStartMinutes - endMinutes) < minGap) {
      throw new ErrorResponse(`Minimum gap of ${minGap} minutes required between classes. There is only ${existingStartMinutes - endMinutes} minutes gap before existing class starting at ${existing.startTime}.`, 400);
    }
  }

  // Check for teacher conflict (ACROSS ALL COURSES - same teacher, same day, overlapping time)
  const teacherConflict = await Timetable.findOne({
    teacherId,
    dayOfWeek,
    isActive: true,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  }).populate('classId', 'type class board name');

  if (teacherConflict) {
    const conflictClass = teacherConflict.classId;
    const classDisplay = conflictClass.type === 'preparation'
      ? conflictClass.name
      : `Class ${conflictClass.class} - ${conflictClass.board}`;

    throw new ErrorResponse(
      `Teacher is already assigned to ${classDisplay} on ${dayOfWeek} at ${teacherConflict.startTime}. Please choose a different time or teacher.`,
      400
    );
  }

  const timetable = await Timetable.create({
    classId,
    subjectId,
    teacherId,
    dayOfWeek,
    startTime,
    endTime,
    thumbnail,
    topic,
    createdBy: req.user._id
  });

  const populatedTimetable = await Timetable.findById(timetable._id)
    .populate('classId', 'type class board name classCode')
    .populate('subjectId', 'name')
    .populate('teacherId', 'name email phone');

  res.status(201).json({
    success: true,
    data: {
      timetable: populatedTimetable
    }
  });
});

// @desc    Update timetable (Admin)
// @route   PUT /api/admin/timetables/:id
// @access  Private/Admin
exports.updateTimetable = asyncHandler(async (req, res) => {
  let timetable = await Timetable.findById(req.params.id);

  if (!timetable) {
    throw new ErrorResponse(`Timetable not found with id of ${req.params.id}`, 404);
  }

  const { startTime, endTime, thumbnail, topic, isActive, teacherId, dayOfWeek } = req.body;

  // Validate time if provided
  if (startTime || endTime) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const finalStartTime = startTime || timetable.startTime;
    const finalEndTime = endTime || timetable.endTime;

    if (startTime && !timeRegex.test(startTime)) {
      throw new ErrorResponse('Invalid start time format. Use HH:MM format', 400);
    }
    if (endTime && !timeRegex.test(endTime)) {
      throw new ErrorResponse('Invalid end time format. Use HH:MM format', 400);
    }

    // Validate end time is after start time
    const [startHour, startMin] = finalStartTime.split(':').map(Number);
    const [endHour, endMin] = finalEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      throw new ErrorResponse('End time must be after start time', 400);
    }

    // Check for conflicts (excluding current timetable)
    const finalDayOfWeek = dayOfWeek || timetable.dayOfWeek;
    const finalSubjectId = req.body.subjectId || timetable.subjectId;

    // Check if same subject is already scheduled on same day for same course (excluding current)
    if (finalSubjectId) {
      const sameSubjectSameDay = await Timetable.findOne({
        _id: { $ne: timetable._id },
        classId: timetable.classId,
        subjectId: finalSubjectId,
        dayOfWeek: finalDayOfWeek,
        isActive: true
      });

      if (sameSubjectSameDay) {
        throw new ErrorResponse(`Subject is already scheduled on ${finalDayOfWeek} for this course. A subject can only be scheduled once per day for a course.`, 400);
      }
    }

    const conflictingTimetable = await Timetable.findOne({
      _id: { $ne: timetable._id },
      classId: timetable.classId,
      dayOfWeek: finalDayOfWeek,
      isActive: true,
      startTime: { $lt: finalEndTime },
      endTime: { $gt: finalStartTime }
    });

    if (conflictingTimetable) {
      throw new ErrorResponse('Time slot conflicts with existing timetable in this class', 400);
    }

    // Check minimum gap between updated class and existing classes in same course (15 minutes)
    const existingTimetables = await Timetable.find({
      _id: { $ne: timetable._id },
      classId: timetable.classId,
      dayOfWeek: finalDayOfWeek,
      isActive: true
    });

    // Reuse startMinutes and endMinutes already calculated above
    const minGap = 15; // 15 minutes minimum gap

    for (const existing of existingTimetables) {
      const [existingStartHour, existingStartMin] = existing.startTime.split(':').map(Number);
      const [existingEndHour, existingEndMin] = existing.endTime.split(':').map(Number);
      const existingStartMinutes = existingStartHour * 60 + existingStartMin;
      const existingEndMinutes = existingEndHour * 60 + existingEndMin;

      // Check if existing class ends and new class starts with less than minGap
      if (existingEndMinutes < startMinutes && (startMinutes - existingEndMinutes) < minGap) {
        throw new ErrorResponse(`Minimum gap of ${minGap} minutes required between classes. There is only ${startMinutes - existingEndMinutes} minutes gap after existing class ending at ${existing.endTime}.`, 400);
      }

      // Check if new class ends and existing class starts with less than minGap
      if (endMinutes < existingStartMinutes && (existingStartMinutes - endMinutes) < minGap) {
        throw new ErrorResponse(`Minimum gap of ${minGap} minutes required between classes. There is only ${existingStartMinutes - endMinutes} minutes gap before existing class starting at ${existing.startTime}.`, 400);
      }
    }

    // Check for teacher conflict (ACROSS ALL COURSES)
    const finalTeacherId = teacherId || timetable.teacherId;
    const teacherConflict = await Timetable.findOne({
      _id: { $ne: timetable._id },
      teacherId: finalTeacherId,
      dayOfWeek: finalDayOfWeek,
      isActive: true,
      startTime: { $lt: finalEndTime },
      endTime: { $gt: finalStartTime }
    }).populate('classId', 'type class board name');

    if (teacherConflict) {
      const conflictClass = teacherConflict.classId;
      const classDisplay = conflictClass.type === 'preparation'
        ? conflictClass.name
        : `Class ${conflictClass.class} - ${conflictClass.board}`;

      throw new ErrorResponse(
        `Teacher is already assigned to ${classDisplay} on ${finalDayOfWeek} at ${teacherConflict.startTime}. Please choose a different time or teacher.`,
        400
      );
    }
  }

  // Update fields
  if (startTime !== undefined) timetable.startTime = startTime;
  if (endTime !== undefined) timetable.endTime = endTime;
  if (thumbnail !== undefined) timetable.thumbnail = thumbnail;
  if (topic !== undefined) timetable.topic = topic;
  if (isActive !== undefined) timetable.isActive = isActive;

  await timetable.save();

  const populatedTimetable = await Timetable.findById(timetable._id)
    .populate('classId', 'type class board name classCode')
    .populate('subjectId', 'name')
    .populate('teacherId', 'name email phone');

  res.status(200).json({
    success: true,
    data: {
      timetable: populatedTimetable
    }
  });
});

// @desc    Delete timetable (Admin)
// @route   DELETE /api/admin/timetables/:id
// @access  Private/Admin
exports.deleteTimetable = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findById(req.params.id);

  if (!timetable) {
    throw new ErrorResponse(`Timetable not found with id of ${req.params.id}`, 404);
  }

  await timetable.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get subjects for a class
// @route   GET /api/admin/timetables/subjects/:classId
// @access  Private/Admin
exports.getSubjectsByClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  const subjects = await Subject.find({ classId, isActive: true })
    .select('name')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: subjects.length,
    data: {
      subjects
    }
  });
});

// @desc    Create bulk timetables (Weekly Schedule - Monday to Sunday)
// @route   POST /api/admin/timetables/bulk
// @access  Private/Admin
exports.createBulkTimetables = asyncHandler(async (req, res) => {
  const { classId, weeklySchedule } = req.body;

  // Validate required fields
  if (!classId) {
    throw new ErrorResponse('Class ID is required', 400);
  }

  if (!weeklySchedule || typeof weeklySchedule !== 'object') {
    throw new ErrorResponse('Weekly schedule is required', 400);
  }

  // Validate class exists
  const classItem = await Class.findById(classId);
  if (!classItem) {
    throw new ErrorResponse('Class not found', 404);
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const createdTimetables = [];
  const errors = [];
  const pendingTimetables = []; // Store validated timetables before saving

  // Helper function to check time overlap
  const isTimeOverlapping = (start1, end1, start2, end2) => {
    const [startHour1, startMin1] = start1.split(':').map(Number);
    const [endHour1, endMin1] = end1.split(':').map(Number);
    const [startHour2, startMin2] = start2.split(':').map(Number);
    const [endHour2, endMin2] = end2.split(':').map(Number);

    const startMinutes1 = startHour1 * 60 + startMin1;
    const endMinutes1 = endHour1 * 60 + endMin1;
    const startMinutes2 = startHour2 * 60 + startMin2;
    const endMinutes2 = endHour2 * 60 + endMin2;

    return startMinutes1 < endMinutes2 && endMinutes1 > startMinutes2;
  };

  // Step 1: Validate all classes and collect them
  for (const day of daysOfWeek) {
    const daySchedule = weeklySchedule[day];

    // Skip if no schedule for this day
    if (!daySchedule) {
      continue;
    }

    // Handle both array (multiple classes) and single object (backward compatibility)
    const dayClasses = Array.isArray(daySchedule) ? daySchedule : [daySchedule];

    // Process each class for this day
    for (let classIndex = 0; classIndex < dayClasses.length; classIndex++) {
      const classItem = dayClasses[classIndex];

      // Skip if class is incomplete
      if (!classItem || !classItem.subjectId || !classItem.teacherId || !classItem.startTime || !classItem.endTime) {
        continue;
      }

      const { subjectId, teacherId, startTime, endTime, thumbnail, topic } = classItem;

      try {
        // Validate subject exists and belongs to class
        const subject = await Subject.findById(subjectId);
        if (!subject) {
          errors.push({ day, error: `[${day}] Class ${classIndex + 1}: Subject not found. Please select a valid subject.` });
          continue;
        }
        if (subject.classId.toString() !== classId.toString()) {
          errors.push({ day, error: `[${day}] Class ${classIndex + 1}: Selected subject does not belong to this course. Please select a subject that belongs to this course.` });
          continue;
        }

        // Validate teacher exists
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
          errors.push({ day, error: `[${day}] Class ${classIndex + 1}: Teacher not found. Please select a valid teacher.` });
          continue;
        }

        // Validate time format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
          errors.push({ day, error: `[${day}] Class ${classIndex + 1}: Invalid time format. Please use HH:MM format (e.g., 09:00, 14:30).` });
          continue;
        }

        // Validate end time is after start time
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (endMinutes <= startMinutes) {
          errors.push({ day, error: `[${day}] Class ${classIndex + 1}: End time (${endTime}) must be after start time (${startTime}). Please correct the time.` });
          continue;
        }

        // Check if same subject is already scheduled on same day for same course
        const sameSubjectSameDay = await Timetable.findOne({
          classId,
          subjectId,
          dayOfWeek: day,
          isActive: true
        });

        if (sameSubjectSameDay) {
          errors.push({
            day,
            error: `[${day}] Class ${classIndex + 1}: Subject "${subject.name}" is already scheduled on ${day} for this course. A subject can only be scheduled once per day for a course.`
          });
          continue;
        }

        // Store validated timetable for later conflict checking
        pendingTimetables.push({
          day,
          classIndex: classIndex + 1,
          classId,
          subjectId,
          teacherId,
          startTime,
          endTime,
          thumbnail,
          topic,
          subjectName: subject.name,
          teacherName: teacher.name
        });

      } catch (err) {
        errors.push({ day, error: `Class ${classIndex + 1}: ${err.message || 'Validation failed'}` });
      }
    }
  }

  // Step 2: Check conflicts within the same bulk request (same course, same day, overlapping time)
  for (let i = 0; i < pendingTimetables.length; i++) {
    const current = pendingTimetables[i];

    for (let j = i + 1; j < pendingTimetables.length; j++) {
      const other = pendingTimetables[j];

      // Check if same subject is scheduled multiple times on same day for same course
      if (
        current.classId.toString() === other.classId.toString() &&
        current.subjectId.toString() === other.subjectId.toString() &&
        current.day === other.day
      ) {
        errors.push({
          day: current.day,
          error: `[${current.day}] Class ${current.classIndex} and Class ${other.classIndex}: Subject "${current.subjectName}" cannot be scheduled multiple times on the same day for this course. A subject can only be scheduled once per day.`
        });
        // Mark both as invalid
        current.invalid = true;
        other.invalid = true;
      }

      // Check if same course, same day, overlapping time
      if (
        current.classId.toString() === other.classId.toString() &&
        current.day === other.day &&
        isTimeOverlapping(current.startTime, current.endTime, other.startTime, other.endTime)
      ) {
        errors.push({
          day: current.day,
          error: `[${current.day}] Class ${current.classIndex} (${current.startTime} - ${current.endTime}) conflicts with Class ${other.classIndex} (${other.startTime} - ${other.endTime}). Only one class can be scheduled at the same time for this course. Please change the time for one of these classes.`
        });
        // Mark both as invalid
        current.invalid = true;
        other.invalid = true;
      }

      // Check minimum gap between classes in same course (15 minutes)
      if (
        current.classId.toString() === other.classId.toString() &&
        current.day === other.day
      ) {
        const [currentStartHour, currentStartMin] = current.startTime.split(':').map(Number);
        const [currentEndHour, currentEndMin] = current.endTime.split(':').map(Number);
        const [otherStartHour, otherStartMin] = other.startTime.split(':').map(Number);
        const [otherEndHour, otherEndMin] = other.endTime.split(':').map(Number);

        const currentStartMinutes = currentStartHour * 60 + currentStartMin;
        const currentEndMinutes = currentEndHour * 60 + currentEndMin;
        const otherStartMinutes = otherStartHour * 60 + otherStartMin;
        const otherEndMinutes = otherEndHour * 60 + otherEndMin;

        const minGap = 15; // 15 minutes minimum gap

        // Check if current class ends and other starts (or vice versa) with less than minGap
        if (currentEndMinutes < otherStartMinutes && (otherStartMinutes - currentEndMinutes) < minGap) {
          errors.push({
            day: current.day,
            error: `[${current.day}] Class ${current.classIndex} and Class ${other.classIndex}: Minimum gap of ${minGap} minutes required between classes in the same course. Current gap is ${otherStartMinutes - currentEndMinutes} minutes.`
          });
          current.invalid = true;
          other.invalid = true;
        }

        if (otherEndMinutes < currentStartMinutes && (currentStartMinutes - otherEndMinutes) < minGap) {
          errors.push({
            day: current.day,
            error: `[${current.day}] Class ${current.classIndex} and Class ${other.classIndex}: Minimum gap of ${minGap} minutes required between classes in the same course. Current gap is ${currentStartMinutes - otherEndMinutes} minutes.`
          });
          current.invalid = true;
          other.invalid = true;
        }
      }

      // Check teacher conflict within bulk request (same teacher, same day, overlapping time)
      if (
        current.teacherId.toString() === other.teacherId.toString() &&
        current.day === other.day &&
        isTimeOverlapping(current.startTime, current.endTime, other.startTime, other.endTime)
      ) {
        errors.push({
          day: current.day,
          error: `[${current.day}] Class ${current.classIndex}: Teacher "${current.teacherName}" is already assigned to Class ${other.classIndex} at ${other.startTime} - ${other.endTime}. A teacher cannot attend multiple classes at the same time. Please assign a different teacher or change the time.`
        });
        // Mark both as invalid
        current.invalid = true;
        other.invalid = true;
      }
    }
  }

  // Step 3: Check conflicts with existing timetables in database
  for (const pending of pendingTimetables) {
    if (pending.invalid) {
      continue; // Skip already invalid timetables
    }

    try {
      // Check for conflicts (same class, same day, overlapping time) with existing timetables
      const conflictingTimetable = await Timetable.findOne({
        classId: pending.classId,
        dayOfWeek: pending.day,
        isActive: true,
        startTime: { $lt: pending.endTime },
        endTime: { $gt: pending.startTime }
      });

      if (conflictingTimetable) {
        errors.push({
          day: pending.day,
          error: `[${pending.day}] Class ${pending.classIndex} (${pending.startTime} - ${pending.endTime}) conflicts with an existing timetable in this course. Only one class can be scheduled at the same time for this course. Please change the time or remove the conflicting timetable first.`
        });
        pending.invalid = true;
        continue;
      }

      // Check minimum gap between new class and existing classes in same course (15 minutes)
      const existingTimetables = await Timetable.find({
        classId: pending.classId,
        dayOfWeek: pending.day,
        isActive: true
      });

      const [pendingStartHour, pendingStartMin] = pending.startTime.split(':').map(Number);
      const [pendingEndHour, pendingEndMin] = pending.endTime.split(':').map(Number);
      const pendingStartMinutes = pendingStartHour * 60 + pendingStartMin;
      const pendingEndMinutes = pendingEndHour * 60 + pendingEndMin;
      const minGap = 15; // 15 minutes minimum gap

      for (const existing of existingTimetables) {
        const [existingStartHour, existingStartMin] = existing.startTime.split(':').map(Number);
        const [existingEndHour, existingEndMin] = existing.endTime.split(':').map(Number);
        const existingStartMinutes = existingStartHour * 60 + existingStartMin;
        const existingEndMinutes = existingEndHour * 60 + existingEndMin;

        // Check if existing class ends and new class starts with less than minGap
        if (existingEndMinutes < pendingStartMinutes && (pendingStartMinutes - existingEndMinutes) < minGap) {
          errors.push({
            day: pending.day,
            error: `[${pending.day}] Class ${pending.classIndex}: Minimum gap of ${minGap} minutes required between classes. There is only ${pendingStartMinutes - existingEndMinutes} minutes gap after existing class ending at ${existing.endTime}.`
          });
          pending.invalid = true;
          break;
        }

        // Check if new class ends and existing class starts with less than minGap
        if (pendingEndMinutes < existingStartMinutes && (existingStartMinutes - pendingEndMinutes) < minGap) {
          errors.push({
            day: pending.day,
            error: `[${pending.day}] Class ${pending.classIndex}: Minimum gap of ${minGap} minutes required between classes. There is only ${existingStartMinutes - pendingEndMinutes} minutes gap before existing class starting at ${existing.startTime}.`
          });
          pending.invalid = true;
          break;
        }
      }

      if (pending.invalid) {
        continue;
      }

      // Check for teacher conflict (ACROSS ALL COURSES) with existing timetables
      const teacherConflict = await Timetable.findOne({
        teacherId: pending.teacherId,
        dayOfWeek: pending.day,
        isActive: true,
        startTime: { $lt: pending.endTime },
        endTime: { $gt: pending.startTime }
      }).populate('classId', 'type class board name');

      if (teacherConflict) {
        const conflictClass = teacherConflict.classId;
        const classDisplay = conflictClass.type === 'preparation'
          ? conflictClass.name
          : `Class ${conflictClass.class} - ${conflictClass.board}`;

        errors.push({
          day: pending.day,
          error: `[${pending.day}] Class ${pending.classIndex}: Teacher "${pending.teacherName}" is already assigned to ${classDisplay} at ${teacherConflict.startTime} - ${teacherConflict.endTime}. A teacher cannot attend multiple classes at the same time. Please assign a different teacher or change the time.`
        });
        pending.invalid = true;
        continue;
      }

    } catch (err) {
      errors.push({ day: pending.day, error: `Class ${pending.classIndex}: ${err.message || 'Failed to check conflicts'}` });
      pending.invalid = true;
    }
  }

  // Step 4: Create all valid timetables
  for (const pending of pendingTimetables) {
    if (pending.invalid) {
      continue; // Skip invalid timetables
    }

    try {
      // Create timetable
      const timetable = await Timetable.create({
        classId: pending.classId,
        subjectId: pending.subjectId,
        teacherId: pending.teacherId,
        dayOfWeek: pending.day,
        startTime: pending.startTime,
        endTime: pending.endTime,
        thumbnail: pending.thumbnail,
        topic: pending.topic,
        createdBy: req.user._id
      });

      const populatedTimetable = await Timetable.findById(timetable._id)
        .populate('classId', 'type class board name classCode')
        .populate('subjectId', 'name')
        .populate('teacherId', 'name email phone');

      createdTimetables.push(populatedTimetable);

    } catch (err) {
      errors.push({ day: pending.day, error: `Class ${pending.classIndex}: ${err.message || 'Failed to create timetable'}` });
    }
  }

  // Return results
  if (createdTimetables.length === 0 && errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to create any timetables',
      data: {
        created: 0,
        failed: errors.length,
        errors
      }
    });
  }

  res.status(201).json({
    success: true,
    message: `Successfully created ${createdTimetables.length} timetable(s)`,
    data: {
      timetables: createdTimetables,
      created: createdTimetables.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    }
  });
});

// @desc    Get teachers for a subject
// @route   GET /api/admin/timetables/teachers/:subjectId
// @access  Private/Admin
exports.getTeachersBySubject = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;

  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new ErrorResponse('Subject not found', 404);
  }

  // Find teachers who have this subject name in their subjects array (now strings)
  // Match by subject name (case-insensitive)
  let teachers = await Teacher.find({
    subjects: { $regex: new RegExp(`^${subject.name}$`, 'i') },
    isActive: true
  })
    .select('name email phone profileImage')
    .sort({ name: 1 });

  // If no teachers found with this subject, return all active teachers
  // This allows admins to assign any teacher to a subject even if subjects aren't assigned to teachers yet
  if (teachers.length === 0) {
    teachers = await Teacher.find({
      isActive: true
    })
      .select('name email phone profileImage')
      .sort({ name: 1 });
  }

  res.status(200).json({
    success: true,
    count: teachers.length,
    data: {
      teachers
    }
  });
});

