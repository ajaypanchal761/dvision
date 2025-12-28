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
const mongoose = require('mongoose');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

// @desc    Get live class statistics (Admin)
// @route   GET /api/admin/live-classes/statistics
// @access  Private/Admin
exports.getLiveClassStatistics = asyncHandler(async (req, res) => {
  // Get overall statistics (not filtered by search or pagination)
  const totalLiveClasses = await LiveClass.countDocuments({});
  const scheduledClasses = await LiveClass.countDocuments({ status: 'scheduled' });
  const liveClasses = await LiveClass.countDocuments({ status: 'live' });
  const completedClasses = await LiveClass.countDocuments({ status: 'completed' });

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        totalLiveClasses,
        scheduledClasses,
        liveClasses,
        completedClasses
      }
    }
  });
});

// @desc    Get all live classes with filters (Admin)
// @route   GET /api/admin/live-classes
// @access  Private/Admin
exports.getAllLiveClasses = asyncHandler(async (req, res) => {
  const {
    status,
    title,
    teacherName,
    className,
    subjectName,
    date,
    page = 1,
    limit = 10
  } = req.query;

  const match = {};

  if (status) {
    match.status = status;
  }

  // Default to current UTC date if no date provided
  let startDate = null;
  let endDate = null;

  const buildUtcRange = (inputDate) => {
    const year = inputDate.getUTCFullYear();
    const month = inputDate.getUTCMonth();
    const day = inputDate.getUTCDate();
    return {
      start: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
      end: new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0))
    };
  };

  if (date) {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      const { start, end } = buildUtcRange(parsed);
      startDate = start;
      endDate = end;
    }
  }

  if (!startDate || !endDate) {
    const now = new Date();
    const { start, end } = buildUtcRange(now);
    startDate = start;
    endDate = end;
  }

  match.scheduledStartTime = {
    $gte: startDate,
    $lt: endDate
  };

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'teachers',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher'
      }
    },
    { $unwind: '$teacher' },
    {
      $lookup: {
        from: 'classes',
        localField: 'classId',
        foreignField: '_id',
        as: 'class'
      }
    },
    { $unwind: '$class' },
    {
      $lookup: {
        from: 'subjects',
        localField: 'subjectId',
        foreignField: '_id',
        as: 'subject'
      }
    },
    { $unwind: '$subject' },
    {
      $addFields: {
        participants: { $ifNull: ['$participants', []] },
        studentParticipants: {
          $filter: {
            input: { $ifNull: ['$participants', []] },
            as: 'p',
            cond: { $eq: ['$$p.userType', 'Student'] }
          }
        },
        titleLower: { $toLower: '$title' },
        teacherNameLower: { $toLower: '$teacher.name' },
        classNameLower: {
          $toLower: {
            $ifNull: ['$class.name', '$class.class']
          }
        },
        subjectNameLower: { $toLower: '$subject.name' }
      }
    }
  ];

  if (title && title.trim()) {
    pipeline.push({
      $match: {
        titleLower: { $regex: title.trim().toLowerCase(), $options: 'i' }
      }
    });
  }

  if (teacherName && teacherName.trim()) {
    pipeline.push({
      $match: {
        teacherNameLower: { $regex: teacherName.trim().toLowerCase(), $options: 'i' }
      }
    });
  }

  if (className && className.trim()) {
    pipeline.push({
      $match: {
        classNameLower: { $regex: className.trim().toLowerCase(), $options: 'i' }
      }
    });
  }

  if (subjectName && subjectName.trim()) {
    pipeline.push({
      $match: {
        subjectNameLower: { $regex: subjectName.trim().toLowerCase(), $options: 'i' }
      }
    });
  }

  pipeline.push({
    $lookup: {
      from: 'students',
      let: { studentIds: '$studentParticipants.userId' },
      pipeline: [
        {
          $match: {
            $expr: { $in: ['$_id', { $ifNull: ['$$studentIds', []] }] }
          }
        },
        {
          $project: {
            name: 1,
            phone: 1,
            class: 1,
            board: 1
          }
        }
      ],
      as: 'studentDetails'
    }
  });

  pipeline.push({
    $addFields: {
      studentsJoined: {
        $map: {
          input: { $ifNull: ['$studentParticipants', []] },
          as: 'p',
          in: {
            userId: '$$p.userId',
            joinedAt: '$$p.joinedAt',
            leftAt: '$$p.leftAt',
            isMuted: '$$p.isMuted',
            isVideoEnabled: '$$p.isVideoEnabled',
            hasRaisedHand: '$$p.hasRaisedHand',
            student: {
              $first: {
                $filter: {
                  input: '$studentDetails',
                  as: 'stu',
                  cond: { $eq: ['$$stu._id', '$$p.userId'] }
                }
              }
            }
          }
        }
      },
      totalParticipants: { $size: { $ifNull: ['$participants', []] } },
      studentCount: { $size: { $ifNull: ['$studentParticipants', []] } }
    }
  });

  pipeline.push({
    $project: {
      title: 1,
      description: 1,
      status: 1,
      scheduledStartTime: 1,
      actualStartTime: 1,
      endTime: 1,
      duration: 1,
      notificationSent: 1,
      notificationSentAt: 1,
      teacher: {
        _id: '$teacher._id',
        name: '$teacher.name',
        email: '$teacher.email',
        phone: '$teacher.phone',
        profileImage: '$teacher.profileImage'
      },
      class: {
        _id: '$class._id',
        name: '$class.name',
        class: '$class.class',
        board: '$class.board',
        type: '$class.type',
        classCode: '$class.classCode'
      },
      subject: {
        _id: '$subject._id',
        name: '$subject.name'
      },
      studentsJoined: 1,
      studentCount: 1,
      totalParticipants: 1
    }
  });

  pipeline.push({ $sort: { scheduledStartTime: -1 } });

  // Get total count before pagination
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await LiveClass.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  // Add pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: parseInt(limit) });

  const liveClasses = await LiveClass.aggregate(pipeline);

  res.status(200).json({
    success: true,
    count: liveClasses.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      liveClasses
    }
  });
});

// @desc    Get single live class with students (Admin)
// @route   GET /api/admin/live-classes/:id
// @access  Private/Admin
exports.getAdminLiveClassById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ErrorResponse('Invalid live class id', 400);
  }

  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: 'teachers',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher'
      }
    },
    { $unwind: '$teacher' },
    {
      $lookup: {
        from: 'classes',
        localField: 'classId',
        foreignField: '_id',
        as: 'class'
      }
    },
    { $unwind: '$class' },
    {
      $lookup: {
        from: 'subjects',
        localField: 'subjectId',
        foreignField: '_id',
        as: 'subject'
      }
    },
    { $unwind: '$subject' },
    {
      $addFields: {
        participants: { $ifNull: ['$participants', []] },
        studentParticipants: {
          $filter: {
            input: { $ifNull: ['$participants', []] },
            as: 'p',
            cond: { $eq: ['$$p.userType', 'Student'] }
          }
        }
      }
    },
    {
      $lookup: {
        from: 'students',
        let: { studentIds: '$studentParticipants.userId' },
        pipeline: [
          {
            $match: {
              $expr: { $in: ['$_id', { $ifNull: ['$$studentIds', []] }] }
            }
          },
          {
            $project: {
              name: 1,
              phone: 1,
              class: 1,
              board: 1
            }
          }
        ],
        as: 'studentDetails'
      }
    },
    {
      $addFields: {
        studentsJoined: {
          $map: {
            input: { $ifNull: ['$studentParticipants', []] },
            as: 'p',
            in: {
              userId: '$$p.userId',
              joinedAt: '$$p.joinedAt',
              leftAt: '$$p.leftAt',
              isMuted: '$$p.isMuted',
              isVideoEnabled: '$$p.isVideoEnabled',
              hasRaisedHand: '$$p.hasRaisedHand',
              student: {
                $first: {
                  $filter: {
                    input: '$studentDetails',
                    as: 'stu',
                    cond: { $eq: ['$$stu._id', '$$p.userId'] }
                  }
                }
              }
            }
          }
        },
        totalParticipants: { $size: { $ifNull: ['$participants', []] } },
        studentCount: { $size: { $ifNull: ['$studentParticipants', []] } }
      }
    },
    {
      $project: {
        title: 1,
        description: 1,
        status: 1,
        scheduledStartTime: 1,
        actualStartTime: 1,
        endTime: 1,
        duration: 1,
        notificationSent: 1,
        notificationSentAt: 1,
        teacher: {
          _id: '$teacher._id',
          name: '$teacher.name',
          email: '$teacher.email',
          phone: '$teacher.phone',
          profileImage: '$teacher.profileImage'
        },
        class: {
          _id: '$class._id',
          name: '$class.name',
          class: '$class.class',
          board: '$class.board',
          type: '$class.type',
          classCode: '$class.classCode'
        },
        subject: {
          _id: '$subject._id',
          name: '$subject.name'
        },
        studentsJoined: 1,
        studentCount: 1,
        totalParticipants: 1,
        participants: 1
      }
    }
  ];

  const results = await LiveClass.aggregate(pipeline);
  const liveClass = results[0];

  if (!liveClass) {
    throw new ErrorResponse('Live class not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      liveClass
    }
  });
});

// @desc    Get recording statistics (Admin)
// @route   GET /api/admin/recordings/statistics
// @access  Private/Admin
exports.getRecordingStatistics = asyncHandler(async (req, res) => {
  // Get overall statistics (not filtered by search or pagination)
  const totalRecordings = await Recording.countDocuments({ isActive: true });
  const processingRecordings = await Recording.countDocuments({ isActive: true, status: 'processing' });
  const completedRecordings = await Recording.countDocuments({ isActive: true, status: 'completed' });
  const failedRecordings = await Recording.countDocuments({ isActive: true, status: 'failed' });

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        totalRecordings,
        processingRecordings,
        completedRecordings,
        failedRecordings
      }
    }
  });
});

// @desc    Get recordings list for admin with filters
// @route   GET /api/admin/recordings
// @access  Private/Admin
exports.getAdminRecordings = asyncHandler(async (req, res) => {
  const { title, teacherName, className, subjectName, status, date, page = 1, limit = 10 } = req.query;

  const match = { isActive: true };
  if (status) match.status = status;

  const buildUtcRange = (inputDate) => {
    const year = inputDate.getUTCFullYear();
    const month = inputDate.getUTCMonth();
    const day = inputDate.getUTCDate();
    return {
      start: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
      end: new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0))
    };
  };

  if (date) {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      const { start, end } = buildUtcRange(parsed);
      match.createdAt = { $gte: start, $lt: end };
    }
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'teachers',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher'
      }
    },
    { $unwind: '$teacher' },
    {
      $lookup: {
        from: 'classes',
        localField: 'classId',
        foreignField: '_id',
        as: 'class'
      }
    },
    { $unwind: '$class' },
    {
      $lookup: {
        from: 'subjects',
        localField: 'subjectId',
        foreignField: '_id',
        as: 'subject'
      }
    },
    { $unwind: '$subject' },
    {
      $addFields: {
        titleLower: { $toLower: '$title' },
        teacherNameLower: { $toLower: '$teacher.name' },
        classNameLower: { $toLower: { $ifNull: ['$class.name', '$class.class'] } },
        subjectNameLower: { $toLower: '$subject.name' }
      }
    }
  ];

  if (title && title.trim()) {
    pipeline.push({ $match: { titleLower: { $regex: title.trim().toLowerCase(), $options: 'i' } } });
  }
  if (teacherName && teacherName.trim()) {
    pipeline.push({ $match: { teacherNameLower: { $regex: teacherName.trim().toLowerCase(), $options: 'i' } } });
  }
  if (className && className.trim()) {
    pipeline.push({ $match: { classNameLower: { $regex: className.trim().toLowerCase(), $options: 'i' } } });
  }
  if (subjectName && subjectName.trim()) {
    pipeline.push({ $match: { subjectNameLower: { $regex: subjectName.trim().toLowerCase(), $options: 'i' } } });
  }

  pipeline.push({
    $project: {
      title: 1,
      description: 1,
      status: 1,
      duration: 1,
      fileSize: 1,
      createdAt: 1,
      uploadedAt: 1,
      localPath: 1,
      s3Url: 1,
      s3Key: 1,
      class: { _id: '$class._id', name: '$class.name', class: '$class.class', board: '$class.board' },
      subject: { _id: '$subject._id', name: '$subject.name' },
      teacher: { _id: '$teacher._id', name: '$teacher.name', email: '$teacher.email', phone: '$teacher.phone' }
    }
  });

  pipeline.push({ $sort: { createdAt: -1 } });

  // Get total count before pagination
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await Recording.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  // Add pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: parseInt(limit) });

  const recordings = await Recording.aggregate(pipeline);

  const withPlayback = await Promise.all(
    recordings.map(async (rec) => {
      let playbackUrl = rec.s3Url || rec.localPath || null;
      if (s3Service.isConfigured() && rec.s3Key) {
        try {
          playbackUrl = await s3Service.getPresignedUrl(rec.s3Key, 3600);
        } catch (err) {
          console.error('Error generating presigned URL for recording', rec._id, err.message || err);
          playbackUrl = rec.s3Url || rec.localPath || null;
        }
      }
      return {
        ...rec,
        playbackUrl
      };
    })
  );

  res.status(200).json({
    success: true,
    count: withPlayback.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      recordings: withPlayback
    }
  });
});

// @desc    Get single recording with playback URL (Admin)
// @route   GET /api/admin/recordings/:id
// @access  Private/Admin
exports.getAdminRecordingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ErrorResponse('Invalid recording id', 400);
  }

  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(id), isActive: true } },
    {
      $lookup: {
        from: 'teachers',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher'
      }
    },
    { $unwind: '$teacher' },
    {
      $lookup: {
        from: 'classes',
        localField: 'classId',
        foreignField: '_id',
        as: 'class'
      }
    },
    { $unwind: '$class' },
    {
      $lookup: {
        from: 'subjects',
        localField: 'subjectId',
        foreignField: '_id',
        as: 'subject'
      }
    },
    { $unwind: '$subject' },
    {
      $project: {
        title: 1,
        description: 1,
        status: 1,
        duration: 1,
        fileSize: 1,
        createdAt: 1,
        uploadedAt: 1,
        localPath: 1,
        s3Url: 1,
        s3Key: 1,
        class: { _id: '$class._id', name: '$class.name', class: '$class.class', board: '$class.board' },
        subject: { _id: '$subject._id', name: '$subject.name' },
        teacher: { _id: '$teacher._id', name: '$teacher.name', email: '$teacher.email', phone: '$teacher.phone' }
      }
    }
  ];

  const results = await Recording.aggregate(pipeline);
  const recording = results[0];

  if (!recording) {
    throw new ErrorResponse('Recording not found', 404);
  }

  let playbackUrl = recording.s3Url || recording.localPath || null;
  if (s3Service.isConfigured() && recording.s3Key) {
    try {
      playbackUrl = await s3Service.getPresignedUrl(recording.s3Key, 3600);
    } catch (err) {
      console.error('Error generating presigned URL for recording', recording._id, err.message || err);
      playbackUrl = recording.s3Url || recording.localPath || null;
    }
  }

  res.status(200).json({
    success: true,
    data: {
      recording: {
        ...recording,
        playbackUrl
      }
    }
  });
});

// @desc    Get live classes for teacher
// @route   GET /api/teacher/live-classes
// @access  Private/Teacher
exports.getMyLiveClasses = asyncHandler(async (req, res) => {
  const { status, date, search } = req.query;

  const query = { teacherId: req.user._id };
  if (status) query.status = status;

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

      console.log('[LiveClass] Teacher date filter:', {
        dateParam: date,
        selectedDateUTC: selectedDate.toISOString(),
        nextDateUTC: nextDate.toISOString()
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

    query.scheduledStartTime = {
      $gte: today,
      $lt: tomorrow
    };
  }

  // Get live classes
  let liveClasses = await LiveClass.find(query)
    .populate('timetableId', 'dayOfWeek startTime endTime topic')
    .populate('classId', 'type class board name classCode')
    .populate('subjectId', 'name')
    .sort({ scheduledStartTime: -1 });

  // Apply search filter if provided
  if (search && search.trim()) {
    const searchLower = search.toLowerCase().trim();
    console.log('[LiveClass] Teacher applying search filter:', searchLower);

    liveClasses = liveClasses.filter(liveClass => {
      const titleMatch = liveClass.title?.toLowerCase().includes(searchLower);
      const subjectMatch = liveClass.subjectId?.name?.toLowerCase().includes(searchLower);

      // Also search in date string
      const classDate = new Date(liveClass.scheduledStartTime);
      const dateStr = classDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const dateMatch = dateStr.toLowerCase().includes(searchLower);

      return titleMatch || subjectMatch || dateMatch;
    });

    console.log('[LiveClass] Teacher search results count:', liveClasses.length);
  }

  res.status(200).json({
    success: true,
    count: liveClasses.length,
    data: {
      liveClasses
    }
  });
});

// @desc    Get class statistics for teacher dashboard
// @route   GET /api/live-classes/teacher/statistics
// @access  Private/Teacher
exports.getTeacherClassStatistics = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;
  const now = new Date();

  // UTC start & end of today
  const startOfDay = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));

  const endOfDay = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23, 59, 59, 999
  ));

  const todayClasses = await LiveClass.find({
    teacherId,
    scheduledStartTime: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  }).select('status scheduledStartTime');

  const totalClasses = todayClasses.length;

  const completed = todayClasses.filter(
    cls => cls.status === 'ended'
  ).length;

  // 🔥 FIX HERE
  const upcoming = todayClasses.filter(
    cls => cls.status === 'scheduled'
  ).length;

  res.status(200).json({
    success: true,
    data: {
      dateUTC: startOfDay.toISOString().split('T')[0],
      statistics: {
        totalClasses,
        completed,
        upcoming
      }
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
    .populate('teacherId', 'name email phone profileImage subjects')
    .populate('subjectId', 'name')
    .sort({ scheduledStartTime: -1 }); // Latest first (descending order)

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

  // Get upcoming scheduled live classes for today only (status = 'scheduled' and scheduled for today)
  // This matches the "Starts Soon" section in Live Classes page for current date
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const day = today.getUTCDate();

  // Create UTC date range for today (start and end of today in UTC)
  const todayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));

  const query = {
    classId: { $in: classIds },
    status: 'scheduled', // Only scheduled classes (not started yet)
    scheduledStartTime: {
      $gte: todayStart,
      $lt: todayEnd
    }
  };

  let liveClasses = await LiveClass.find(query)
    .populate('classId', 'type class board name classCode')
    .populate('teacherId', 'name email phone profileImage subjects')
    .populate('subjectId', 'name')
    .sort({ scheduledStartTime: -1 }) // Latest first (descending order)
    .limit(10); // Limit to 10 upcoming classes

  // Format the response - send raw scheduledStartTime and scheduledEndTime, let frontend format it
  // This ensures timezone is handled correctly on client side
  const formattedClasses = liveClasses.map(liveClass => {
    // Calculate end time: use scheduledEndTime if available, otherwise calculate from scheduledStartTime + duration
    let scheduledEndTime = liveClass.scheduledEndTime;
    if (!scheduledEndTime && liveClass.duration && liveClass.duration > 0) {
      scheduledEndTime = new Date(liveClass.scheduledStartTime);
      scheduledEndTime.setMinutes(scheduledEndTime.getMinutes() + liveClass.duration);
    }

    return {
      _id: liveClass._id,
      id: liveClass._id.toString(),
      title: liveClass.title,
      teacher: liveClass.teacherId?.name || 'Teacher',
      teacherId: liveClass.teacherId?._id || liveClass.teacherId,
      teacherSubjects: liveClass.teacherId?.subjects || [],
      subject: liveClass.subjectId?.name || 'Subject',
      subjectId: liveClass.subjectId?._id || liveClass.subjectId,
      image: null, // No image in live class model
      scheduledStartTime: liveClass.scheduledStartTime, // Send raw date, format on frontend
      scheduledEndTime: scheduledEndTime || null // Send raw date, format on frontend
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
  const { classId, subjectId, title, description, startTime, endTime } = req.body;

  // Validate required fields
  if (!classId || !subjectId) {
    throw new ErrorResponse('Class ID and Subject ID are required', 400);
  }

  // Validate start and end times
  if (!startTime || !endTime) {
    throw new ErrorResponse('Start time and End time are required', 400);
  }

  // Convert startTime and endTime to Date objects
  // startTime and endTime are in format "HH:MM" (assumed to be in IST - UTC+5:30)
  // We need to convert IST time to UTC for storage
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  // Validate time format
  if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
    throw new ErrorResponse('Invalid time format. Please use HH:MM format', 400);
  }

  // Get current date in IST to determine which day the class is scheduled for
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30 = 19800000 ms
  const istNow = new Date(now.getTime() + istOffsetMs);

  // Get today's date components in IST
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const day = istNow.getUTCDate();

  // Create scheduledStartTime: interpret input time as IST, convert to UTC
  // Example: 17:00 IST = 11:30 UTC (17:00 - 5:30)
  // Create date in IST timezone first, then subtract offset to get UTC
  const scheduledStartTimeIST = new Date(Date.UTC(year, month, day, startHours, startMinutes, 0, 0));
  const scheduledStartTime = new Date(scheduledStartTimeIST.getTime() - istOffsetMs);

  // Create scheduledEndTime: interpret input time as IST, convert to UTC
  const scheduledEndTimeIST = new Date(Date.UTC(year, month, day, endHours, endMinutes, 0, 0));
  let scheduledEndTime = new Date(scheduledEndTimeIST.getTime() - istOffsetMs);

  // If end time is before or equal to start time, assume it's next day
  if (scheduledEndTime <= scheduledStartTime) {
    const nextDayIST = new Date(Date.UTC(year, month, day + 1, endHours, endMinutes, 0, 0));
    scheduledEndTime = new Date(nextDayIST.getTime() - istOffsetMs);
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
    scheduledStartTime: scheduledStartTime,
    scheduledEndTime: scheduledEndTime,
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

  // Get teacher name for notification
  const teacher = await Teacher.findById(req.user._id).select('name');
  const teacherName = teacher?.name || 'Teacher';

  // Format start time for notification in IST
  // scheduledStartTime is stored in UTC, convert to IST for display
  // Reuse istOffsetMs already declared above
  const scheduledStartTimeForDisplay = new Date(scheduledStartTime.getTime() + istOffsetMs);
  const hours = scheduledStartTimeForDisplay.getUTCHours();
  const minutes = scheduledStartTimeForDisplay.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const startTimeFormatted = `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;

  // Get enrolled students for this class based on class type
  const Payment = require('../models/Payment');
  // Reuse 'now' variable already declared above for IST calculation
  let students = [];

  if (classItem.type === 'regular') {
    // For regular classes: find students by class and board with active subscriptions
    // First, get all active payments
    const activePayments = await Payment.find({
      status: 'completed',
      subscriptionEndDate: { $gte: now }
    })
      .populate({
        path: 'subscriptionPlanId',
        select: 'type board classes'
      })
      .populate({
        path: 'studentId',
        select: '_id name fcmToken fcmTokens isActive class board'
      });

    // Filter payments for regular plans matching this class and board
    const validPayments = activePayments.filter(payment => {
      if (!payment.subscriptionPlanId || !payment.studentId) return false;
      const plan = payment.subscriptionPlanId;
      const student = payment.studentId;

      return plan.type === 'regular' &&
        plan.board === classItem.board &&
        plan.classes && plan.classes.includes(classItem.class) &&
        student.isActive &&
        student.class === classItem.class &&
        student.board === classItem.board;
    });

    // Get unique student IDs from payments
    const studentIdsFromPayments = [...new Set(validPayments.map(p => p.studentId._id.toString()))];

    // Also check activeSubscriptions array on Student model
    const studentsWithActiveSubs = await Student.find({
      isActive: true,
      class: classItem.class,
      board: classItem.board,
      'activeSubscriptions.type': 'regular',
      'activeSubscriptions.board': classItem.board,
      'activeSubscriptions.class': classItem.class,
      'activeSubscriptions.endDate': { $gte: now }
    }).select('_id');
    const activeSubStudentIds = studentsWithActiveSubs.map(s => s._id.toString());

    // Combine both sources
    const allStudentIds = [...new Set([...studentIdsFromPayments, ...activeSubStudentIds])];

    if (allStudentIds.length > 0) {
      // Get students with FCM tokens
      students = await Student.find({
        _id: { $in: allStudentIds },
        isActive: true,
        $or: [
          { 'fcmTokens.app': { $exists: true, $ne: null } },
          { 'fcmTokens.web': { $exists: true, $ne: null } },
          { fcmToken: { $exists: true, $ne: null } }
        ]
      });
    }
  } else if (classItem.type === 'preparation') {
    // For preparation classes: find students with active subscriptions to this class
    const activePayments = await Payment.find({
      status: 'completed',
      subscriptionEndDate: { $gte: now }
    })
      .populate({
        path: 'subscriptionPlanId',
        select: 'type classId',
        populate: {
          path: 'classId',
          select: '_id'
        }
      })
      .populate({
        path: 'studentId',
        select: '_id name fcmToken fcmTokens isActive'
      });

    // Filter valid payments for this preparation class
    const validPayments = activePayments.filter(payment => {
      if (!payment.subscriptionPlanId || !payment.studentId) return false;
      const plan = payment.subscriptionPlanId;

      return plan.type === 'preparation' &&
        plan.classId &&
        plan.classId._id.toString() === classItem._id.toString() &&
        payment.studentId.isActive;
    });

    const studentIds = [...new Set(validPayments.map(p => p.studentId._id.toString()))];

    // Also check activeSubscriptions array
    const studentsWithActiveSubs = await Student.find({
      isActive: true,
      'activeSubscriptions.classId': classItem._id,
      'activeSubscriptions.endDate': { $gte: now }
    }).select('_id');
    const activeSubStudentIds = studentsWithActiveSubs.map(s => s._id.toString());

    // Combine both sources
    const allStudentIds = [...new Set([...studentIds, ...activeSubStudentIds])];

    if (allStudentIds.length > 0) {
      students = await Student.find({
        _id: { $in: allStudentIds },
        isActive: true,
        $or: [
          { 'fcmTokens.app': { $exists: true, $ne: null } },
          { 'fcmTokens.web': { $exists: true, $ne: null } },
          { fcmToken: { $exists: true, $ne: null } }
        ]
      });
    }
  }

  // Log for debugging
  console.log('[createLiveClass] Found students for notification:', {
    classType: classItem.type,
    classId: classItem._id.toString(),
    className: classItem.name || `Class ${classItem.class}`,
    studentCount: students.length,
    studentIds: students.map(s => s._id.toString())
  });

  // Send notifications to students
  if (students.length > 0) {
    const notificationTitle = 'New Live Class Scheduled!';
    const notificationBody = `${subject.name} class by ${teacherName} starts at ${startTimeFormatted}`;
    const notificationData = {
      type: 'live_class_created',
      liveClassId: liveClass._id.toString(),
      subject: subject.name,
      teacherName: teacherName,
      startTime: scheduledStartTime.toISOString(),
      url: '/live-classes'
    };

    const studentIds = students.map(s => s._id.toString());
    console.log('[createLiveClass] Sending notifications to students:', {
      count: studentIds.length,
      studentIds: studentIds
    });

    try {
      const result = await notificationService.sendToMultipleUsers(
        studentIds,
        'student',
        { title: notificationTitle, body: notificationBody },
        notificationData
      );
      console.log('[createLiveClass] Notification send result:', {
        success: result.success,
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalSaved: result.totalSaved
      });
    } catch (err) {
      console.error('[createLiveClass] Error sending notifications to students:', err);
    }
  } else {
    console.log('[createLiveClass] No students found to notify for class:', {
      classType: classItem.type,
      classId: classItem._id.toString(),
      className: classItem.name || `Class ${classItem.class}`
    });
  }

  // Populate and return
  const populatedLiveClass = await LiveClass.findById(liveClass._id)
    .populate('timetableId', 'dayOfWeek startTime endTime topic')
    .populate('teacherId', 'name email phone profileImage subjects')
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
  const actualStartTime = liveClass.actualStartTime;

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

  // Send notifications to students when teacher starts the class
  try {
    const Payment = require('../models/Payment');
    const now = new Date();
    const classItem = liveClass.classId;
    const subject = liveClass.subjectId;
    const teacher = liveClass.teacherId;
    const teacherName = teacher?.name || 'Teacher';
    const subjectName = subject?.name || 'Subject';

    // Format actual start time for notification in IST
    // actualStartTime is stored in UTC, convert to IST for display
    const istOffsetMs = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const actualStartTimeIST = new Date(actualStartTime.getTime() + istOffsetMs);
    const hours = actualStartTimeIST.getUTCHours();
    const minutes = actualStartTimeIST.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const startTimeFormatted = `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;

    let students = [];

    if (classItem.type === 'regular') {
      // For regular classes: find students by class and board with active subscriptions
      const activePayments = await Payment.find({
        status: 'completed',
        subscriptionEndDate: { $gte: now }
      })
        .populate({
          path: 'subscriptionPlanId',
          select: 'type board classes'
        })
        .populate({
          path: 'studentId',
          select: '_id name fcmToken fcmTokens isActive class board'
        });

      // Filter payments for regular plans matching this class and board
      const validPayments = activePayments.filter(payment => {
        if (!payment.subscriptionPlanId || !payment.studentId) return false;
        const plan = payment.subscriptionPlanId;
        const student = payment.studentId;

        return plan.type === 'regular' &&
          plan.board === classItem.board &&
          plan.classes && plan.classes.includes(classItem.class) &&
          student.isActive &&
          student.class === classItem.class &&
          student.board === classItem.board;
      });

      // Get unique student IDs from payments
      const studentIdsFromPayments = [...new Set(validPayments.map(p => p.studentId._id.toString()))];

      // Also check activeSubscriptions array on Student model
      const studentsWithActiveSubs = await Student.find({
        isActive: true,
        class: classItem.class,
        board: classItem.board,
        'activeSubscriptions.type': 'regular',
        'activeSubscriptions.board': classItem.board,
        'activeSubscriptions.class': classItem.class,
        'activeSubscriptions.endDate': { $gte: now }
      }).select('_id');
      const activeSubStudentIds = studentsWithActiveSubs.map(s => s._id.toString());

      // Combine both sources
      const allStudentIds = [...new Set([...studentIdsFromPayments, ...activeSubStudentIds])];

      if (allStudentIds.length > 0) {
        students = await Student.find({
          _id: { $in: allStudentIds },
          isActive: true,
          $or: [
            { 'fcmTokens.app': { $exists: true, $ne: null } },
            { 'fcmTokens.web': { $exists: true, $ne: null } },
            { fcmToken: { $exists: true, $ne: null } }
          ]
        });
      }
    } else if (classItem.type === 'preparation') {
      // For preparation classes: find students with active subscriptions to this class
      const activePayments = await Payment.find({
        status: 'completed',
        subscriptionEndDate: { $gte: now }
      })
        .populate({
          path: 'subscriptionPlanId',
          select: 'type classId',
          populate: {
            path: 'classId',
            select: '_id'
          }
        })
        .populate({
          path: 'studentId',
          select: '_id name fcmToken fcmTokens isActive'
        });

      // Filter valid payments for this preparation class
      const validPayments = activePayments.filter(payment => {
        if (!payment.subscriptionPlanId || !payment.studentId) return false;
        const plan = payment.subscriptionPlanId;

        return plan.type === 'preparation' &&
          plan.classId &&
          plan.classId._id.toString() === classItem._id.toString() &&
          payment.studentId.isActive;
      });

      const studentIds = [...new Set(validPayments.map(p => p.studentId._id.toString()))];

      // Also check activeSubscriptions array
      const studentsWithActiveSubs = await Student.find({
        isActive: true,
        'activeSubscriptions.classId': classItem._id,
        'activeSubscriptions.endDate': { $gte: now }
      }).select('_id');
      const activeSubStudentIds = studentsWithActiveSubs.map(s => s._id.toString());

      // Combine both sources
      const allStudentIds = [...new Set([...studentIds, ...activeSubStudentIds])];

      if (allStudentIds.length > 0) {
        students = await Student.find({
          _id: { $in: allStudentIds },
          isActive: true,
          $or: [
            { 'fcmTokens.app': { $exists: true, $ne: null } },
            { 'fcmTokens.web': { $exists: true, $ne: null } },
            { fcmToken: { $exists: true, $ne: null } }
          ]
        });
      }
    }

    // Send notifications to students
    if (students.length > 0) {
      const notificationTitle = 'Live Class Started!';
      const notificationBody = `${subjectName} class by ${teacherName} has started at ${startTimeFormatted}. Join now!`;
      const notificationData = {
        type: 'live_class_started',
        liveClassId: liveClass._id.toString(),
        subject: subjectName,
        teacherName: teacherName,
        actualStartTime: actualStartTime.toISOString(),
        url: `/live-class/${liveClass._id.toString()}`
      };

      const studentIds = students.map(s => s._id.toString());
      await notificationService.sendToMultipleUsers(
        studentIds,
        'student',
        { title: notificationTitle, body: notificationBody },
        notificationData
      );
    }
  } catch (notificationError) {
    // Log error but don't fail the request
    console.error('Error sending notifications when class started:', notificationError);
  }

  // Generate Agora token for teacher (use userId as UID)
  const { RtcRole } = require('agora-token');
  const teacherUid = parseInt(req.user._id.toString().slice(-8), 16) || 0; // Use last 8 chars of userId as UID
  const token = agoraService.generateRtcToken(
    liveClass.agoraChannelName,
    teacherUid,
    RtcRole.PUBLISHER
  );

  // Recording is now manual - teacher will start it via separate endpoint
  console.log('[LiveClass] Class started, recording will be manual', {
    liveClassId: liveClass._id.toString(),
    isRecordingEnabled: liveClass.isRecordingEnabled
  });

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
    // Students don't have video enabled, only teachers do
    const isStudent = userRole === 'student';
    participant = {
      userId: userId,
      userType: isStudent ? 'Student' : 'Teacher',
      joinedAt: new Date(),
      isMuted: false,
      isVideoEnabled: !isStudent, // Students: false, Teachers: true
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
  console.log('[Upload Recording] START', { liveClassId: req.params.id, userId: req.user._id });
  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    console.error('[Upload Recording] ERROR: Live class not found', req.params.id);
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
  console.log('[Upload Recording] Updating status to processing', { liveClassId: liveClass._id, fileSize: fileStats.size });
  liveClass.recording.status = 'processing';
  liveClass.recording.localPath = req.file.path;
  liveClass.recording.fileSize = fileStats.size;
  await liveClass.save();

  let convertedPath = null;

  try {
    // 1. Convert/Repair WebM to MP4 using ffmpeg
    // This is CRITICAL for merging segments with overlapping timestamps (0-12s, 0-14s).
    // Transcoding with libx264 forces FFmpeg to rebuild the timeline correctly.
    let uploadPath = req.file.path;
    let convertedPath = null;

    try {
      // Use relative path from backend root to avoid Windows drive/space issues
      const cleanName = `processed_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp4`;
      const relativeInput = path.relative(process.cwd(), req.file.path);
      const relativeOutput = path.join('uploads', 'recordings', cleanName);

      console.log(`[Upload Recording] Repairing Video Timestamps: "${relativeInput}" -> "${relativeOutput}"`);

      await new Promise((resolve, reject) => {
        ffmpeg(relativeInput)
          // Increase probe size to safely read multi-header WebMs
          .inputOptions([
            '-probesize 100M',
            '-analyzeduration 100M'
          ])
          .output(relativeOutput)
          .outputOptions([
            '-c:v libx264',
            '-preset ultrafast',
            '-crf 23',
            '-r 25', // Force 25 frames per second
            // RECONSTRUCT the timeline: frame index / 25
            // This is the most robust way to fix "rejoin" discontinuities and 2s fast-forward issues.
            '-vf', 'setpts=N/(25*TB)',
            '-c:a aac',
            '-b:a 128k',
            // Use aresample to handle audio gaps/overlaps and keep it synced with the new video PTS
            '-af', 'aresample=async=1',
            '-movflags +faststart',
            '-fflags +genpts+igndts',
            '-avoid_negative_ts make_zero',
            '-y'
          ])
          .on('end', () => {
            console.log('[Upload Recording] Repair complete. Video is now linear 25fps.');
            resolve();
          })
          .on('error', (err) => {
            console.error('[Upload Recording] FFmpeg internal error:', err.message);
            reject(err);
          })
          .run();
      });

      // Conversion successful
      uploadPath = path.resolve(process.cwd(), relativeOutput);
      convertedPath = uploadPath;

    } catch (conversionError) {
      console.error('[Upload Recording] FFmpeg Repair FAILED, falling back to raw WebM:', conversionError.message);
      // Fallback is handled by keeping uploadPath as req.file.path
    }

    // 2. Upload to S3 (Hopefully the repaired MP4)
    const { s3Url, s3Key } = await s3Service.uploadRecording(uploadPath, liveClass._id.toString());
    console.log('[Upload Recording] S3 Upload successful:', { s3Url, format: path.extname(uploadPath) });

    // Update live class with S3 info
    liveClass.recording.status = 'completed';
    liveClass.recording.s3Url = s3Url;
    liveClass.recording.s3Key = s3Key;
    liveClass.recording.uploadedAt = new Date();
    liveClass.recording.format = path.extname(uploadPath).substring(1); // 'mp4' or 'webm'
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
      localPath: uploadPath,
      s3Url,
      s3Key,
      status: 'completed',
      duration: req.body.duration ? parseInt(req.body.duration) : (liveClass.duration ? liveClass.duration * 60 : 0),
      fileSize: fs.statSync(uploadPath).size,
      uploadedAt: new Date()
    });

    // Delete local files after successful S3 upload
    try {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      if (convertedPath && fs.existsSync(convertedPath)) fs.unlinkSync(convertedPath);
      console.log(`Deleted local temporary files.`);
    } catch (deleteError) {
      console.error('Error deleting local file:', deleteError);
    }

    console.log('[Upload Recording] ✅ Process finished successfully.');

    res.status(200).json({
      success: true,
      message: 'Recording uploaded and repaired successfully',
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

    // Delete uploaded files on error
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        // mp4 also?
        if (convertedPath && fs.existsSync(convertedPath)) fs.unlinkSync(convertedPath);
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
    .populate('teacherId', 'name email phone profileImage subjects')
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
  let recording = await Recording.findById(req.params.id)
    .populate('teacherId', 'name email phone profileImage subjects')
    .populate('subjectId', 'name')
    .populate('classId', 'type class board name classCode')
    .populate('timetableId', 'dayOfWeek startTime endTime topic')
    .populate('liveClassId', 'actualStartTime endTime');

  // If not found by ID, try finding by liveClassId (for deep linking from LiveClasses)
  if (!recording) {
    recording = await Recording.findOne({ liveClassId: req.params.id })
      .populate('teacherId', 'name email phone profileImage subjects')
      .populate('subjectId', 'name')
      .populate('classId', 'type class board name classCode')
      .populate('timetableId', 'dayOfWeek startTime endTime topic')
      .populate('liveClassId', 'actualStartTime endTime');
  }

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

// @desc    Start recording manually (Teacher)
// @route   POST /api/teacher/live-classes/:id/recording/start
// @access  Private/Teacher
exports.startRecording = asyncHandler(async (req, res) => {
  console.log('[Recording API] Start requested', { liveClassId: req.params.id });
  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    console.error('[Recording API] ERROR: Live class not found', req.params.id);
    throw new ErrorResponse('Live class not found', 404);
  }

  // Verify teacher owns this class
  if (liveClass.teacherId.toString() !== req.user._id.toString()) {
    throw new ErrorResponse('Not authorized to start recording for this class', 403);
  }

  // Check if class is live
  if (liveClass.status !== 'live') {
    throw new ErrorResponse('Class must be live to start recording', 400);
  }

  console.log('[LiveClass] Manual recording started (Client-side)', {
    liveClassId: liveClass._id.toString()
  });

  liveClass.recording = {
    ...liveClass.recording,
    status: 'recording',
    startedAt: new Date(),
    error: null
  };
  await liveClass.save();

  res.status(200).json({
    success: true,
    message: 'Recording started successfully',
    data: {
      recording: liveClass.recording
    }
  });
});

// @desc    Pause recording manually
// @route   POST /api/teacher/live-classes/:id/recording/pause
// @access  Private/Teacher
exports.pauseRecording = asyncHandler(async (req, res) => {
  console.log('[Recording API] Pause requested', { liveClassId: req.params.id });
  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    console.error('[Recording API] ERROR: Live class not found', req.params.id);
    throw new ErrorResponse('Live class not found', 404);
  }

  if (liveClass.recording && liveClass.recording.status === 'recording') {
    console.log('[Recording API] Pausing recording', { liveClassId: req.params.id });
    liveClass.recording.status = 'paused';
    await liveClass.save();
  } else {
    console.warn('[Recording API] WARN: Cannot pause, recording not in "recording" state', {
      currentStatus: liveClass.recording?.status
    });
  }

  res.status(200).json({
    success: true,
    data: {
      recording: liveClass.recording
    }
  });
});

// @desc    Resume recording manually
// @route   POST /api/teacher/live-classes/:id/recording/resume
// @access  Private/Teacher
exports.resumeRecording = asyncHandler(async (req, res) => {
  console.log('[Recording API] Resume requested', { liveClassId: req.params.id });
  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    console.error('[Recording API] ERROR: Live class not found', req.params.id);
    throw new ErrorResponse('Live class not found', 404);
  }

  if (liveClass.recording && liveClass.recording.status === 'paused') {
    console.log('[Recording API] Resuming recording', { liveClassId: req.params.id });
    liveClass.recording.status = 'recording';
    await liveClass.save();
  } else {
    console.warn('[Recording API] WARN: Cannot resume, recording not in "paused" state', {
      currentStatus: liveClass.recording?.status
    });
  }

  res.status(200).json({
    success: true,
    data: {
      recording: liveClass.recording
    }
  });
});

// @desc    Stop recording manually (Teacher)
// @route   POST /api/teacher/live-classes/:id/recording/stop
// @access  Private/Teacher
exports.stopRecording = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);

  if (!liveClass) {
    throw new ErrorResponse('Live class not found', 404);
  }

  // Verify teacher owns this class
  if (liveClass.teacherId.toString() !== req.user._id.toString()) {
    throw new ErrorResponse('Not authorized to stop recording for this class', 403);
  }

  // Check if recording is active
  if (!liveClass.recording || liveClass.recording.status !== 'recording') {
    throw new ErrorResponse('No active recording found', 400);
  }

  // Verify recording has required data
  if (!liveClass.recording.resourceId || !liveClass.recording.sid) {
    throw new ErrorResponse('Recording session data is incomplete', 400);
  }

  // Update status to processing immediately
  liveClass.recording.status = 'processing';
  await liveClass.save();

  // Send response immediately
  res.status(200).json({
    success: true,
    message: 'Recording stopped successfully. Processing will continue in background.',
    data: {
      recording: {
        status: 'processing'
      }
    }
  });

  // Process recording in background (same flow as endLiveClass)
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
        return;
      }

      // Use the same UID that started the recording
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
        return;
      }

      // Extract file list; if missing, try querying a few times
      let fileList = stopRes?.fileList || stopRes?.serverResponse?.fileList;
      if (!fileList) {
        console.log('[Recording] No fileList in stop response, querying Agora...');
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            const queryRes = await agoraRecordingService.query(
              liveClass.recording.resourceId,
              liveClass.recording.sid
            );

            const status = queryRes?.serverResponse?.status;
            console.log('[Recording] Query response status:', status, { attempt });

            if (status === 3) {
              console.error('[Recording] Recording status is error');
              throw new Error('Recording status is error');
            }

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
            if (qErr?.response?.status === 404) {
              console.error('[Recording] Query returned 404', { attempt });
              if (attempt === 5) {
                liveClass.recording = {
                  ...liveClass.recording,
                  status: 'failed',
                  error: 'Recording session not found'
                };
                await liveClass.save();
                return;
              }
              await new Promise(r => setTimeout(r, 10000));
            } else {
              console.warn('[Recording] Query failed', { attempt, error: qErr?.message });
              await new Promise(r => setTimeout(r, 5000));
            }
          }
        }
      }

      if (!fileList) {
        liveClass.recording = {
          ...liveClass.recording,
          status: 'failed',
          error: 'No recording file returned from Agora after multiple queries'
        };
        await liveClass.save();
        console.warn('[LiveClass] Recording failed: no fileUrl', { liveClassId: liveClass._id.toString() });
        return;
      }

      if (typeof fileList === 'string') {
        fileList = fileList.split(',').map(f => f.trim()).filter(Boolean);
      }
      const firstFile = Array.isArray(fileList) && fileList.length > 0 ? fileList[0] : null;
      const fileName = typeof firstFile === 'string' ? firstFile : firstFile?.fileUrl || firstFile?.file_name || firstFile?.fileName || firstFile?.url;

      if (fileName) {
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

        await new Promise(r => setTimeout(r, 20000));

        if (s3Service.isConfigured() && bucket) {
          try {
            let exists = false;
            for (let i = 0; i < 12; i++) {
              exists = await s3Service.objectExists(s3Key);
              if (exists) break;
              await new Promise(r => setTimeout(r, 6000));
            }
            if (exists) {
              await s3Service.downloadToFile(s3Key, localPath);
              downloaded = true;
              console.log('[LiveClass] Local copy downloaded from S3', { liveClassId: liveClass._id.toString(), localPath });
            }
          } catch (s3dlErr) {
            console.warn('[LiveClass] Failed S3 download, will try Agora', s3dlErr?.message);
          }
        }

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

        let finalS3Url = s3Service.isConfigured() ? s3Url : null;
        let finalS3Key = s3Service.isConfigured() ? s3Key : null;
        if (s3Service.isConfigured() && bucket) {
          const exists = await s3Service.objectExists(s3Key).catch(() => false);
          if (!exists && downloaded) {
            const contentType = safeFileName.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp4';
            try {
              const uploaded = await s3Service.uploadFile(localPath, s3Key, contentType);
              finalS3Url = uploaded.s3Url;
              finalS3Key = uploaded.s3Key;
              console.log('[LiveClass] Recording uploaded to S3', { liveClassId: liveClass._id.toString(), finalS3Key });
            } catch (uploadErr) {
              console.error('Failed to upload recording to S3:', uploadErr);
            }
          }
        }

        const stats = fs.statSync(localPath);
        const fileSize = stats.size;

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
          remoteUrl: safeFileName
        };
        await liveClass.save();

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

        if (finalS3Url) {
          try {
            fs.unlinkSync(localPath);
            const dirFiles = fs.readdirSync(recordingsDir);
            if (dirFiles.length === 0) {
              fs.rmdirSync(recordingsDir, { recursive: true });
            }
            console.log('[LiveClass] Local recording cleaned', { liveClassId: liveClass._id.toString() });
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
        console.warn('[LiveClass] Recording failed: no fileUrl', { liveClassId: liveClass._id.toString() });
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
  })();
});

