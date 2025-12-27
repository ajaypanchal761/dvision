const Subject = require('../models/Subject');
const Class = require('../models/Class');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all subjects (Public - for teachers/students)
// @route   GET /api/subjects
// @access  Public
exports.getPublicSubjects = asyncHandler(async (req, res) => {
  const { class: classNumber, board } = req.query;

  let query = { isActive: true };

  // Filter by class and board if provided
  if (classNumber) {
    query.class = parseInt(classNumber);
  }
  if (board) {
    query.board = board;
  }

  const subjects = await Subject.find(query)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: subjects.length,
    data: {
      subjects
    }
  });
});

// @desc    Get subject statistics (Admin)
// @route   GET /api/admin/subjects/statistics
// @access  Private/Admin
exports.getSubjectStatistics = asyncHandler(async (req, res) => {
  // Get overall statistics (not filtered by search or pagination)
  const totalSubjects = await Subject.countDocuments({});
  const activeSubjects = await Subject.countDocuments({ isActive: true });
  const inactiveSubjects = await Subject.countDocuments({ isActive: false });

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        totalSubjects,
        activeSubjects,
        inactiveSubjects
      }
    }
  });
});

// @desc    Get all subjects (Admin)
// @route   GET /api/admin/subjects
// @access  Private/Admin
exports.getAllSubjects = asyncHandler(async (req, res) => {
  const { classId, class: classNumber, board, page = 1, limit = 10, search } = req.query;

  let query = {};

  // Filter by classId if provided (for preparation classes)
  if (classId) {
    query.classId = classId;
  }
  // Filter by class and board if provided (for regular classes)
  else if (classNumber && board) {
    query.class = parseInt(classNumber);
    query.board = board.trim();
  }

  // Add search functionality
  if (search) {
    query.$or = [
      { name: { $regex: search.trim(), $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Subject.countDocuments(query);

  const subjects = await Subject.find(query)
    .populate('classId', 'name class board type classCode')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: subjects.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      subjects
    }
  });
});

// @desc    Get all subjects without pagination (Admin) - for dropdowns/filters
// @route   GET /api/admin/subjects/all
// @access  Private/Admin
exports.getAllSubjectsWithoutPagination = asyncHandler(async (req, res) => {
  const { classId, class: classNumber, board, isActive } = req.query;

  let query = {};

  if (classId) {
    query.classId = classId;
  } else if (classNumber && board) {
    query.class = parseInt(classNumber);
    query.board = board.trim();
  }

  // Allow caller to request active/inactive/all
  if (typeof isActive !== 'undefined') {
    if (String(isActive) === 'true') query.isActive = true;
    else if (String(isActive) === 'false') query.isActive = false;
  }

  const subjects = await Subject.find(query)
    .populate('classId', 'name class board type classCode')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: subjects.length,
    data: {
      subjects
    }
  });
});

// @desc    Get single subject (Admin)
// @route   GET /api/admin/subjects/:id
// @access  Private/Admin
exports.getSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
    .populate('classId', 'name class board type classCode');

  if (!subject) {
    throw new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404);
  }

  res.status(200).json({
    success: true,
    data: {
      subject
    }
  });
});

// @desc    Create subject (Admin)
// @route   POST /api/admin/subjects
// @access  Private/Admin
exports.createSubject = asyncHandler(async (req, res) => {
  const { name, classId, class: classNumber, board, isActive } = req.body;

  console.log('=== Create Subject Request ===');
  console.log('Request Body:', req.body);
  console.log('Name:', name);
  console.log('ClassId:', classId);
  console.log('Class:', classNumber);
  console.log('Board:', board);
  console.log('Is Active:', isActive);
  console.log('=============================');

  if (!name) {
    throw new ErrorResponse('Please provide subject name', 400);
  }

  let classItem = null;
  let subjectData = {
    name: name.trim(),
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.user._id
  };

  // New approach: using classId (preferred)
  if (classId) {
    classItem = await Class.findById(classId);
    if (!classItem || !classItem.isActive) {
      throw new ErrorResponse('Class not found or inactive', 400);
    }
    subjectData.classId = classId;

    // For backward compatibility, also set class and board if regular class
    if (classItem.type === 'regular') {
      subjectData.class = classItem.class;
      subjectData.board = classItem.board;
    }
  }
  // Old approach: using class and board (backward compatibility)
  else if (classNumber && board) {
    classItem = await Class.findOne({
      class: parseInt(classNumber),
      board: board.trim(),
      type: 'regular',
      isActive: true
    });

    if (!classItem) {
      throw new ErrorResponse(`Class ${classNumber} with board ${board} does not exist. Please create the class first.`, 400);
    }

    subjectData.classId = classItem._id;
    subjectData.class = parseInt(classNumber);
    subjectData.board = board.trim();
  } else {
    throw new ErrorResponse('Please provide either classId or both class and board', 400);
  }

  // Check if subject with same name and classId already exists
  const existingSubject = await Subject.findOne({
    name: name.trim(),
    classId: subjectData.classId
  });

  if (existingSubject) {
    const classDisplay = classItem.type === 'preparation'
      ? classItem.name
      : `Class ${classItem.class} ${classItem.board}`;
    throw new ErrorResponse(`Subject "${name}" for ${classDisplay} already exists`, 400);
  }

  const subject = await Subject.create(subjectData);

  // Populate classId for response
  await subject.populate('classId', 'name class board type');

  console.log('Subject created successfully:', subject);

  res.status(201).json({
    success: true,
    message: 'Subject created successfully',
    data: {
      subject
    }
  });
});

// @desc    Update subject (Admin)
// @route   PUT /api/admin/subjects/:id
// @access  Private/Admin
exports.updateSubject = asyncHandler(async (req, res) => {
  let subject = await Subject.findById(req.params.id)
    .populate('classId');

  if (!subject) {
    throw new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404);
  }

  const { name, classId, class: classNumber, board, isActive } = req.body;

  let classItem = null;
  let newClassId = subject.classId?._id || subject.classId;

  // If classId is being updated
  if (classId && classId.toString() !== newClassId?.toString()) {
    classItem = await Class.findById(classId);
    if (!classItem || !classItem.isActive) {
      throw new ErrorResponse('Class not found or inactive', 400);
    }
    newClassId = classId;
  }
  // If class and board are being updated (backward compatibility)
  else if ((classNumber || board) &&
    (classNumber !== subject.class || board !== subject.board)) {
    const finalClass = classNumber || subject.class;
    const finalBoard = board || subject.board;

    classItem = await Class.findOne({
      class: parseInt(finalClass),
      board: finalBoard.trim(),
      type: 'regular',
      isActive: true
    });

    if (!classItem) {
      throw new ErrorResponse(`Class ${finalClass} with board ${finalBoard} does not exist. Please create the class first.`, 400);
    }
    newClassId = classItem._id;
  } else if (subject.classId) {
    classItem = subject.classId;
  }

  // If name or classId is being updated, check for duplicates
  if ((name || newClassId) &&
    (name !== subject.name || newClassId?.toString() !== subject.classId?.toString())) {
    const finalName = name || subject.name;
    const finalClassId = newClassId || subject.classId?._id || subject.classId;

    const existingSubject = await Subject.findOne({
      name: finalName.trim(),
      classId: finalClassId,
      _id: { $ne: req.params.id }
    });

    if (existingSubject) {
      const classDisplay = classItem?.type === 'preparation'
        ? classItem.name
        : `Class ${classItem?.class || finalClass} ${classItem?.board || finalBoard}`;
      throw new ErrorResponse(`Subject "${finalName}" for ${classDisplay} already exists`, 400);
    }
  }

  // Update fields
  if (name !== undefined) subject.name = name.trim();
  if (newClassId) {
    subject.classId = newClassId;
    // Update class and board for backward compatibility if regular class
    if (classItem && classItem.type === 'regular') {
      subject.class = classItem.class;
      subject.board = classItem.board;
    }
  } else if (classNumber !== undefined) subject.class = parseInt(classNumber);
  if (board !== undefined) subject.board = board.trim();
  if (isActive !== undefined) subject.isActive = isActive;

  await subject.save();
  await subject.populate('classId', 'name class board type classCode');

  res.status(200).json({
    success: true,
    message: 'Subject updated successfully',
    data: {
      subject
    }
  });
});

// @desc    Delete subject (Admin)
// @route   DELETE /api/admin/subjects/:id
// @access  Private/Admin
exports.deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);

  if (!subject) {
    throw new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404);
  }

  await subject.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Subject deleted successfully',
    data: {}
  });
});

