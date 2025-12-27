const Class = require('../models/Class');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all classes (Public - for registration)
// @route   GET /api/classes
// @access  Public
exports.getPublicClasses = asyncHandler(async (req, res) => {
  const classes = await Class.find({ isActive: true }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: classes.length,
    data: {
      classes
    }
  });
});

// @desc    Get class statistics (Admin)
// @route   GET /api/admin/classes/statistics
// @access  Private/Admin
exports.getClassStatistics = asyncHandler(async (req, res) => {
  // Get overall statistics (not filtered by search or pagination)
  const totalClasses = await Class.countDocuments({});
  const activeClasses = await Class.countDocuments({ isActive: true });
  const regularClasses = await Class.countDocuments({ type: 'regular' });
  const preparationClasses = await Class.countDocuments({ type: 'preparation' });

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        totalClasses,
        activeClasses,
        regularClasses,
        preparationClasses
      }
    }
  });
});

// @desc    Get all classes without pagination (Admin) - For dropdowns and filters
// @route   GET /api/admin/classes/all
// @access  Private/Admin
exports.getAllClassesWithoutPagination = asyncHandler(async (req, res) => {
  const { type, isActive } = req.query;

  const query = {};

  if (type) query.type = type;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  // Get all classes without pagination
  const classes = await Class.find(query)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: classes.length,
    data: {
      classes
    }
  });
});

// @desc    Get all classes (Admin)
// @route   GET /api/admin/classes
// @access  Private/Admin
exports.getAllClasses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, type, isActive } = req.query;

  const query = {};

  if (type) query.type = type;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  // Add search functionality
  if (search) {
    query.$or = [
      { name: { $regex: search.trim(), $options: 'i' } },
      { classCode: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } },
      { board: { $regex: search.trim(), $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Class.countDocuments(query);

  const classes = await Class.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: classes.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      classes
    }
  });
});

// @desc    Get single class (Admin)
// @route   GET /api/admin/classes/:id
// @access  Private/Admin
exports.getClass = asyncHandler(async (req, res) => {
  const classItem = await Class.findById(req.params.id);

  if (!classItem) {
    throw new ErrorResponse(`Class not found with id of ${req.params.id}`, 404);
  }

  res.status(200).json({
    success: true,
    data: {
      class: classItem
    }
  });
});

// @desc    Create class (Admin)
// @route   POST /api/admin/classes
// @access  Private/Admin
exports.createClass = asyncHandler(async (req, res) => {
  const { type, class: classNumber, board, name, description, classCode, isActive } = req.body;

  console.log('=== Create Class Request ===');
  console.log('Request Body:', req.body);
  console.log('Type:', type);
  console.log('Class:', classNumber);
  console.log('Board:', board);
  console.log('Name:', name);
  console.log('Class Code:', classCode);
  console.log('Is Active:', isActive);
  console.log('===========================');

  const classType = type || 'regular';

  // Validate based on type
  if (classType === 'regular') {
    if (!classNumber || !board || !classCode) {
      throw new ErrorResponse('Please provide class, board, and classCode for regular class', 400);
    }
  } else if (classType === 'preparation') {
    if (!name || !classCode) {
      throw new ErrorResponse('Please provide name and classCode for preparation class', 400);
    }
  } else {
    throw new ErrorResponse('Invalid class type. Must be "regular" or "preparation"', 400);
  }

  // Check if class code already exists
  const existingClass = await Class.findOne({ classCode: classCode.toUpperCase() });
  if (existingClass) {
    throw new ErrorResponse('Class with this class code already exists', 400);
  }

  // For regular classes, check if same class and board combination exists
  if (classType === 'regular') {
    const existingClassBoard = await Class.findOne({
      class: parseInt(classNumber),
      board: board.trim(),
      type: 'regular'
    });
    if (existingClassBoard) {
      throw new ErrorResponse(`Class ${classNumber} with board ${board} already exists`, 400);
    }
  }

  // For preparation classes, check if same name exists
  if (classType === 'preparation') {
    const existingPrepClass = await Class.findOne({
      name: name.trim(),
      type: 'preparation'
    });
    if (existingPrepClass) {
      throw new ErrorResponse(`Preparation class "${name}" already exists`, 400);
    }
  }

  const classData = {
    type: classType,
    classCode: classCode.trim().toUpperCase(),
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.user._id
  };

  if (classType === 'regular') {
    classData.class = parseInt(classNumber);
    classData.board = board.trim();
  } else {
    classData.name = name.trim();
    if (description) {
      classData.description = description.trim();
    }
  }

  const classItem = await Class.create(classData);

  console.log('Class created successfully:', classItem);

  res.status(201).json({
    success: true,
    message: 'Class created successfully',
    data: {
      class: classItem
    }
  });
});

// @desc    Update class (Admin)
// @route   PUT /api/admin/classes/:id
// @access  Private/Admin
exports.updateClass = asyncHandler(async (req, res) => {
  let classItem = await Class.findById(req.params.id);

  if (!classItem) {
    throw new ErrorResponse(`Class not found with id of ${req.params.id}`, 404);
  }

  const { type, class: classNumber, board, name, description, classCode, isActive } = req.body;
  const classType = type || classItem.type;

  // If classCode is being updated, check for duplicates
  if (classCode && classCode.toUpperCase() !== classItem.classCode) {
    const existingClass = await Class.findOne({ classCode: classCode.toUpperCase() });
    if (existingClass) {
      throw new ErrorResponse('Class with this class code already exists', 400);
    }
  }

  // For regular classes
  if (classType === 'regular') {
    // If class or board is being updated, check for duplicates
    if ((classNumber || board) &&
      (classNumber !== classItem.class || board !== classItem.board)) {
      const existingClassBoard = await Class.findOne({
        class: classNumber || classItem.class,
        board: board || classItem.board,
        type: 'regular',
        _id: { $ne: req.params.id }
      });
      if (existingClassBoard) {
        throw new ErrorResponse(`Class ${classNumber || classItem.class} with board ${board || classItem.board} already exists`, 400);
      }
    }
  }

  // For preparation classes
  if (classType === 'preparation') {
    // If name is being updated, check for duplicates
    if (name && name.trim() !== classItem.name) {
      const existingPrepClass = await Class.findOne({
        name: name.trim(),
        type: 'preparation',
        _id: { $ne: req.params.id }
      });
      if (existingPrepClass) {
        throw new ErrorResponse(`Preparation class "${name}" already exists`, 400);
      }
    }
  }

  // Update fields
  if (type !== undefined) classItem.type = classType;
  if (classType === 'regular') {
    if (classNumber !== undefined) classItem.class = parseInt(classNumber);
    if (board !== undefined) classItem.board = board.trim();
    // Clear preparation fields
    classItem.name = undefined;
    classItem.description = undefined;
  } else {
    if (name !== undefined) classItem.name = name.trim();
    if (description !== undefined) classItem.description = description.trim();
    // Clear regular fields
    classItem.class = undefined;
    classItem.board = undefined;
  }
  if (classCode !== undefined) classItem.classCode = classCode.toUpperCase();
  if (isActive !== undefined) classItem.isActive = isActive;

  await classItem.save();

  res.status(200).json({
    success: true,
    message: 'Class updated successfully',
    data: {
      class: classItem
    }
  });
});

// @desc    Delete class (Admin)
// @route   DELETE /api/admin/classes/:id
// @access  Private/Admin
exports.deleteClass = asyncHandler(async (req, res) => {
  const classItem = await Class.findById(req.params.id);

  if (!classItem) {
    throw new ErrorResponse(`Class not found with id of ${req.params.id}`, 404);
  }

  await classItem.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Class deleted successfully',
    data: {}
  });
});

