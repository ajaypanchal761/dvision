const Student = require('../models/Student');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Get all students (Admin)
// @route   GET /api/admin/students
// @access  Private/Admin
exports.getAllStudents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, class: classFilter, board, status } = req.query;
  
  const query = {};
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (classFilter) {
    query.class = parseInt(classFilter);
  }
  
  if (board) {
    query.board = board;
  }
  
  if (status) {
    query.isActive = status === 'active';
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const students = await Student.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await Student.countDocuments(query);
  
  res.status(200).json({
    success: true,
    count: students.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      students
    }
  });
});

// @desc    Get single student (Admin)
// @route   GET /api/admin/students/:id
// @access  Private/Admin
exports.getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  
  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: {
      student
    }
  });
});

// @desc    Create student (Admin)
// @route   POST /api/admin/students
// @access  Private/Admin
exports.createStudent = asyncHandler(async (req, res) => {
  const { name, phone, email, class: studentClass, board, isActive, profileImageBase64, subscriptionPlanId } = req.body;
  
  if (!name || !phone || !studentClass || !board) {
    throw new ErrorResponse('Please provide name, phone, class, and board', 400);
  }
  
  // Check if student exists
  const existingStudent = await Student.findOne({ phone });
  if (existingStudent) {
    throw new ErrorResponse('Student with this phone number already exists', 400);
  }
  
  let profileImageUrl = null;
  let profileImagePublicId = null;
  
  // Upload profile image if provided
  if (profileImageBase64) {
    try {
      const uploadResult = await uploadToCloudinary(profileImageBase64, {
        folder: 'dvision_uploads/students',
        resource_type: 'image'
      });
      profileImageUrl = uploadResult.url;
      profileImagePublicId = uploadResult.public_id;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new ErrorResponse('Failed to upload profile image', 500);
    }
  }
  
  // Prepare student data
  const studentData = {
    name,
    phone,
    email,
    class: parseInt(studentClass),
    board,
    isActive: isActive !== undefined ? isActive : true,
    isPhoneVerified: true,
    profileImage: profileImageUrl
  };

  // Handle subscription assignment if provided
  if (subscriptionPlanId) {
    const plan = await SubscriptionPlan.findById(subscriptionPlanId);
    if (!plan) {
      throw new ErrorResponse('Subscription plan not found', 404);
    }

    if (!plan.isActive) {
      throw new ErrorResponse('Cannot assign inactive subscription plan', 400);
    }

    // Calculate subscription dates based on plan duration
    const startDate = new Date();
    let endDate = new Date();

    switch (plan.duration) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    studentData.subscription = {
      status: 'active',
      planId: plan._id,
      startDate: startDate,
      endDate: endDate
    };
  } else {
    // Default subscription status
    studentData.subscription = {
      status: 'none',
      planId: undefined,
      startDate: undefined,
      endDate: undefined
    };
  }

  const student = await Student.create(studentData);
  
  res.status(201).json({
    success: true,
    message: 'Student created successfully',
    data: {
      student
    }
  });
});

// @desc    Update student (Admin)
// @route   PUT /api/admin/students/:id
// @access  Private/Admin
exports.updateStudent = asyncHandler(async (req, res) => {
  const { name, phone, email, class: studentClass, board, isActive, profileImageBase64, subscriptionPlanId, removeSubscription } = req.body;
  
  let student = await Student.findById(req.params.id);
  
  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }

  // Validate required fields if provided
  if (name !== undefined && (!name || !name.trim())) {
    throw new ErrorResponse('Name is required', 400);
  }
  
  if (phone !== undefined && (!phone || !phone.trim())) {
    throw new ErrorResponse('Phone number is required', 400);
  }
  
  if (board !== undefined && (!board || !board.trim())) {
    throw new ErrorResponse('Board is required', 400);
  }
  
  if (studentClass !== undefined && studentClass !== null) {
    const classNum = parseInt(studentClass);
    if (isNaN(classNum) || classNum < 1 || classNum > 12) {
      throw new ErrorResponse('Class must be between 1 and 12', 400);
    }
  }
  
  // Check if phone is being changed and if it's already taken
  if (phone !== undefined) {
    if (phone !== student.phone) {
      const existingStudent = await Student.findOne({ phone });
      if (existingStudent) {
        throw new ErrorResponse('Student with this phone number already exists', 400);
      }
    }
    student.phone = phone;
  }
  
  // Update name if provided
  if (name !== undefined) student.name = name;
  
  // Update email if provided (can be empty string to clear email)
  if (email !== undefined) student.email = email || '';
  
  // Update class if provided
  if (studentClass !== undefined && studentClass !== null) {
    student.class = parseInt(studentClass);
  }
  
  // Update board if provided
  if (board !== undefined) student.board = board;
  
  // Update isActive if provided
  if (isActive !== undefined) student.isActive = isActive;
  
  // Handle profile image update
  if (profileImageBase64) {
    // Delete old image if exists
    if (student.profileImage) {
      try {
        // Extract public_id from URL if possible, or skip deletion
        const urlParts = student.profileImage.split('/');
        const publicIdWithExt = urlParts.slice(-2).join('/').split('.')[0];
        const publicId = `dvision_uploads/students/${publicIdWithExt}`;
        await deleteFromCloudinary(publicId);
      } catch (error) {
        console.error('Error deleting old image:', error);
        // Continue even if deletion fails
      }
    }
    
    // Upload new image
    try {
      const uploadResult = await uploadToCloudinary(profileImageBase64, {
        folder: 'dvision_uploads/students',
        resource_type: 'image'
      });
      student.profileImage = uploadResult.url;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new ErrorResponse('Failed to upload profile image', 500);
    }
  }

  // Handle subscription update
  if (removeSubscription === true || removeSubscription === 'true') {
    // Remove subscription
    student.subscription = {
      status: 'none',
      planId: undefined,
      startDate: undefined,
      endDate: undefined
    };
  } else if (subscriptionPlanId) {
    // Assign or update subscription
    const plan = await SubscriptionPlan.findById(subscriptionPlanId);
    if (!plan) {
      throw new ErrorResponse('Subscription plan not found', 404);
    }

    if (!plan.isActive) {
      throw new ErrorResponse('Cannot assign inactive subscription plan', 400);
    }

    // Calculate subscription dates based on plan duration
    const startDate = new Date();
    let endDate = new Date();

    switch (plan.duration) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    student.subscription = {
      status: 'active',
      planId: plan._id,
      startDate: startDate,
      endDate: endDate
    };
  }
  
  await student.save();
  
  res.status(200).json({
    success: true,
    message: 'Student updated successfully',
    data: {
      student
    }
  });
});

// @desc    Delete student (Admin)
// @route   DELETE /api/admin/students/:id
// @access  Private/Admin
exports.deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  
  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }
  
  // Delete profile image from Cloudinary if exists
  if (student.profileImage) {
    try {
      const urlParts = student.profileImage.split('/');
      const publicIdWithExt = urlParts.slice(-2).join('/').split('.')[0];
      const publicId = `dvision_uploads/students/${publicIdWithExt}`;
      await deleteFromCloudinary(publicId);
    } catch (error) {
      console.error('Error deleting image:', error);
      // Continue with student deletion even if image deletion fails
    }
  }
  
  await student.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Student deleted successfully'
  });
});

