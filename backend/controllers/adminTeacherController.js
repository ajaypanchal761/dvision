const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Get teacher statistics (Admin)
// @route   GET /api/admin/teachers/statistics
// @access  Private/Admin
exports.getTeacherStatistics = asyncHandler(async (req, res) => {
  // Get overall statistics (not filtered by search or pagination)
  const totalTeachers = await Teacher.countDocuments({});
  const activeTeachers = await Teacher.countDocuments({ isActive: true });
  const inactiveTeachers = await Teacher.countDocuments({ isActive: false });
  
  res.status(200).json({
    success: true,
    data: {
      statistics: {
        totalTeachers,
        activeTeachers,
        inactiveTeachers
      }
    }
  });
});

// @desc    Get all teachers (Admin)
// @route   GET /api/admin/teachers
// @access  Private/Admin
exports.getAllTeachers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status } = req.query;
  
  const query = {};
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (status) {
    query.isActive = status === 'active';
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const teachers = await Teacher.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await Teacher.countDocuments(query);
  
  res.status(200).json({
    success: true,
    count: teachers.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      teachers
    }
  });
});

// @desc    Get single teacher (Admin)
// @route   GET /api/admin/teachers/:id
// @access  Private/Admin
exports.getTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  
  if (!teacher) {
    throw new ErrorResponse('Teacher not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: {
      teacher
    }
  });
});

// @desc    Create teacher (Admin)
// @route   POST /api/admin/teachers
// @access  Private/Admin
exports.createTeacher = asyncHandler(async (req, res) => {
  const { 
    name, 
    phone, 
    email, 
    subjects, 
    classes, 
    boards, 
    isActive, 
    bio, 
    experience,
    profileImageBase64 
  } = req.body;
  
  // Log received data for debugging
  console.log('=== Teacher Creation Request ===');
  console.log('Name:', name);
  console.log('Phone:', phone);
  console.log('Email:', email);
  console.log('Subjects:', subjects);
  console.log('Classes:', classes);
  console.log('Boards:', boards);
  console.log('IsActive:', isActive);
  console.log('Full Request Body:', JSON.stringify(req.body, null, 2));
  console.log('================================');
  
  if (!name || !phone) {
    throw new ErrorResponse('Please provide name and phone', 400);
  }
  
  // Check if teacher exists
  const existingTeacher = await Teacher.findOne({ phone });
  if (existingTeacher) {
    throw new ErrorResponse('Teacher with this phone number already exists', 400);
  }
  
  let profileImageUrl = null;
  
  // Upload profile image if provided
  if (profileImageBase64) {
    try {
      const uploadResult = await uploadToCloudinary(profileImageBase64, {
        folder: 'dvision_uploads/teachers',
        resource_type: 'image'
      });
      profileImageUrl = uploadResult.url;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new ErrorResponse('Failed to upload profile image', 500);
    }
  }
  
  // Validate and process subjects
  let processedSubjects = [];
  if (subjects && Array.isArray(subjects)) {
    // Filter out empty strings and trim
    processedSubjects = subjects
      .filter(subject => subject && typeof subject === 'string' && subject.trim().length > 0)
      .map(subject => subject.trim())
      .slice(0, 2); // Max 2 subjects
    
    if (subjects.length > 2) {
      throw new ErrorResponse('Maximum 2 subjects can be assigned to a teacher', 400);
    }
  }
  
  const teacher = await Teacher.create({
    name,
    phone,
    email,
    subjects: processedSubjects,
    classes: classes || [],
    boards: boards || [],
    isActive: isActive !== undefined ? isActive : true,
    isPhoneVerified: true,
    bio,
    experience: experience ? parseInt(experience) : undefined,
    profileImage: profileImageUrl
  });
  
  res.status(201).json({
    success: true,
    message: 'Teacher created successfully',
    data: {
      teacher
    }
  });
});

// @desc    Update teacher (Admin)
// @route   PUT /api/admin/teachers/:id
// @access  Private/Admin
exports.updateTeacher = asyncHandler(async (req, res) => {
  const { 
    name, 
    phone, 
    email, 
    subjects, 
    classes, 
    boards, 
    isActive, 
    bio, 
    experience,
    profileImageBase64 
  } = req.body;
  
  let teacher = await Teacher.findById(req.params.id);
  
  if (!teacher) {
    throw new ErrorResponse('Teacher not found', 404);
  }
  
  // Check if phone is being changed and if it's already taken
  if (phone && phone !== teacher.phone) {
    const existingTeacher = await Teacher.findOne({ phone });
    if (existingTeacher) {
      throw new ErrorResponse('Teacher with this phone number already exists', 400);
    }
    teacher.phone = phone;
  }
  
  if (name) teacher.name = name;
  if (email) teacher.email = email;
  if (subjects !== undefined) {
    // Validate and process subjects
    if (Array.isArray(subjects)) {
      // Filter out empty strings and trim
      const processedSubjects = subjects
        .filter(subject => subject && typeof subject === 'string' && subject.trim().length > 0)
        .map(subject => subject.trim())
        .slice(0, 2); // Max 2 subjects
      
      if (subjects.length > 2) {
        throw new ErrorResponse('Maximum 2 subjects can be assigned to a teacher', 400);
      }
      
      teacher.subjects = processedSubjects;
    } else {
      teacher.subjects = [];
    }
  }
  if (classes !== undefined) teacher.classes = classes;
  if (boards !== undefined) teacher.boards = boards;
  if (isActive !== undefined) teacher.isActive = isActive;
  if (bio !== undefined) teacher.bio = bio;
  if (experience !== undefined) teacher.experience = parseInt(experience);
  
  // Handle profile image update
  if (profileImageBase64) {
    // Delete old image if exists
    if (teacher.profileImage) {
      try {
        const urlParts = teacher.profileImage.split('/');
        const publicIdWithExt = urlParts.slice(-2).join('/').split('.')[0];
        const publicId = `dvision_uploads/teachers/${publicIdWithExt}`;
        await deleteFromCloudinary(publicId);
      } catch (error) {
        console.error('Error deleting old image:', error);
      }
    }
    
    // Upload new image
    try {
      const uploadResult = await uploadToCloudinary(profileImageBase64, {
        folder: 'dvision_uploads/teachers',
        resource_type: 'image'
      });
      teacher.profileImage = uploadResult.url;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new ErrorResponse('Failed to upload profile image', 500);
    }
  }
  
  await teacher.save();
  
  res.status(200).json({
    success: true,
    message: 'Teacher updated successfully',
    data: {
      teacher
    }
  });
});

// @desc    Delete teacher (Admin)
// @route   DELETE /api/admin/teachers/:id
// @access  Private/Admin
exports.deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  
  if (!teacher) {
    throw new ErrorResponse('Teacher not found', 404);
  }
  
  // Delete profile image from Cloudinary if exists
  if (teacher.profileImage) {
    try {
      const urlParts = teacher.profileImage.split('/');
      const publicIdWithExt = urlParts.slice(-2).join('/').split('.')[0];
      const publicId = `dvision_uploads/teachers/${publicIdWithExt}`;
      await deleteFromCloudinary(publicId);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }
  
  await teacher.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Teacher deleted successfully'
  });
});

