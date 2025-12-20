const TeacherAttendance = require('../models/TeacherAttendance');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

// Helper to get start-of-day and end-of-day in local time
const getDayRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
};

// Helper to get month range
const getMonthRange = (year, monthIndex) => {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

// @desc    Mark today's attendance as present (Teacher)
// @route   POST /api/teacher/attendance/mark
// @access  Private/Teacher
exports.markTodayAttendance = asyncHandler(async (req, res, next) => {
  if (req.userRole !== 'teacher') {
    return next(new ErrorResponse('Only teachers can mark attendance', 403));
  }

  const teacherId = req.user._id;
  const now = new Date();
  const { start, end } = getDayRange(now);

  // Check if already marked
  const existing = await TeacherAttendance.findOne({
    teacher: teacherId,
    date: { $gte: start, $lte: end },
  });

  if (existing && existing.status === 'present') {
    return res.status(200).json({
      success: true,
      message: 'Attendance already marked for today',
      data: {
        status: existing.status,
        date: existing.date,
      },
    });
  }

  let record;
  if (existing) {
    existing.status = 'present';
    existing.date = start;
    record = await existing.save();
  } else {
    record = await TeacherAttendance.create({
      teacher: teacherId,
      date: start,
      status: 'present',
    });
  }

  res.status(201).json({
    success: true,
    message: 'Attendance marked as present',
    data: {
      status: record.status,
      date: record.date,
    },
  });
});

// @desc    Get today's attendance status (Teacher)
// @route   GET /api/teacher/attendance/today
// @access  Private/Teacher
exports.getTodayAttendanceStatus = asyncHandler(async (req, res, next) => {
  if (req.userRole !== 'teacher') {
    return next(new ErrorResponse('Only teachers can view this attendance', 403));
  }

  const teacherId = req.user._id;
  const now = new Date();
  const { start, end } = getDayRange(now);

  const record = await TeacherAttendance.findOne({
    teacher: teacherId,
    date: { $gte: start, $lte: end },
  });

  res.status(200).json({
    success: true,
    data: {
      status: record ? record.status : 'absent',
      hasRecord: !!record,
      date: start,
    },
  });
});

// @desc    Get my monthly attendance (Teacher)
// @route   GET /api/teacher/attendance
// @access  Private/Teacher
exports.getMyMonthlyAttendance = asyncHandler(async (req, res, next) => {
  if (req.userRole !== 'teacher') {
    return next(new ErrorResponse('Only teachers can view this attendance', 403));
  }

  const teacherId = req.user._id;
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1; // 1-12
  const { start, end } = getMonthRange(year, month - 1);

  const records = await TeacherAttendance.find({
    teacher: teacherId,
    date: { $gte: start, $lte: end },
  }).sort({ date: 1 });

  res.status(200).json({
    success: true,
    data: {
      year,
      month,
      records,
    },
  });
});

// @desc    Get teacher monthly attendance (Admin)
// @route   GET /api/admin/teachers/:id/attendance
// @access  Private/Admin
exports.getTeacherMonthlyAttendanceAdmin = asyncHandler(async (req, res, next) => {
  const teacherId = req.params.id;
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1; // 1-12
  const { start, end } = getMonthRange(year, month - 1);

  const records = await TeacherAttendance.find({
    teacher: teacherId,
    date: { $gte: start, $lte: end },
  })
    .sort({ date: 1 })
    .populate('teacher', 'name phone email');

  res.status(200).json({
    success: true,
    data: {
      year,
      month,
      teacher: records[0]?.teacher || null,
      records,
    },
  });
});

// @desc    Get all teacher attendance records (Admin list view)
// @route   GET /api/admin/teachers/attendance
// @access  Private/Admin
exports.getAllTeacherAttendanceAdmin = asyncHandler(async (req, res, next) => {
  const { date, year, month } = req.query;

  const filter = {};

  if (date) {
    const target = new Date(date);
    const { start, end } = getDayRange(target);
    filter.date = { $gte: start, $lte: end };
  } else if (year || month) {
    const now = new Date();
    const y = parseInt(year, 10) || now.getFullYear();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    const { start, end } = getMonthRange(y, m - 1);
    filter.date = { $gte: start, $lte: end };
  } else {
    // Default: Fetch only today's records
    const now = new Date();
    const { start, end } = getDayRange(now);
    filter.date = { $gte: start, $lte: end };
  }

  const records = await TeacherAttendance.find(filter)
    .sort({ date: -1 })
    .populate('teacher', 'name phone email');

  res.status(200).json({
    success: true,
    data: {
      records,
    },
  });
});


