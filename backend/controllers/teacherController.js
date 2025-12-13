const Teacher = require('../models/Teacher');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const otpService = require('../services/otpService');
const generateToken = require('../utils/generateToken');

// @desc    Send OTP to teacher phone number
// @route   POST /api/teacher/send-otp
// @access  Public
exports.sendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    throw new ErrorResponse('Please provide a phone number', 400);
  }

  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    throw new ErrorResponse('Please provide a valid phone number with country code', 400);
  }

  // Check if it's a test number
  const isTestNumber = otpService.isTestNumber(phone);

  // Check resend cooldown (skip for test numbers)
  if (!isTestNumber) {
    const canResend = await otpService.canResendOTP(phone);
    if (!canResend) {
      throw new ErrorResponse(
        `Please wait ${process.env.OTP_RESEND_COOLDOWN_SECONDS || 60} seconds before requesting a new OTP`,
        429
      );
    }
  }

  // Send OTP using 2Factor.in (will bypass SMS for test numbers)
  const result = await otpService.sendOTP(phone, process.env.TWOFACTOR_TEMPLATE_NAME);

  // Normalize phone number for database lookup
  let normalizedPhone = phone.replace(/^\+/, ''); // Remove leading +
  let teacher = await Teacher.findOne({ phone });

  // If not found, try with normalized phone (without country code)
  if (!teacher && normalizedPhone.length > 10) {
    // Try removing common country codes (91 for India, 1 for US, etc.)
    const withoutCountryCode = normalizedPhone.replace(/^(91|1|44|61|971)/, '');
    if (withoutCountryCode !== normalizedPhone) {
      teacher = await Teacher.findOne({ phone: withoutCountryCode });
    }
  }

  // If still not found, try with normalized phone as-is
  if (!teacher) {
    teacher = await Teacher.findOne({ phone: normalizedPhone });
  }

  if (teacher) {
    teacher.lastOtpSentAt = new Date();
    await teacher.save();
  }

  // Store resend cooldown (skip for test numbers)
  if (!isTestNumber) {
    await otpService.storeResendCooldown(phone);
  }

  res.status(200).json({
    success: true,
    message: result.message || (isTestNumber 
      ? 'OTP sent successfully (Test Mode - Use OTP: 123456)' 
      : 'OTP sent successfully to your phone number'),
    data: {
      phone: phone.replace(/\d(?=\d{4})/g, '*'),
      expiresIn: `${process.env.OTP_EXPIRY_MINUTES || 5} minutes`,
      isTest: isTestNumber
    }
  });
});

// @desc    Verify OTP and login/register teacher
// @route   POST /api/teacher/verify-otp
// @access  Public
exports.verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp, name } = req.body;

  if (!phone || !otp) {
    throw new ErrorResponse('Please provide phone number and OTP', 400);
  }

  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    throw new ErrorResponse('OTP must be a 6-digit number', 400);
  }

  // Verify OTP (will handle test numbers automatically)
  await otpService.verifyOTP(phone, otp);

  // After OTP verification, find teacher for login
  // Normalize phone number for database lookup
  let normalizedPhone = phone.replace(/^\+/, ''); // Remove leading +
  let teacher = await Teacher.findOne({ phone });

  // If not found, try with normalized phone (without country code)
  if (!teacher && normalizedPhone.length > 10) {
    // Try removing common country codes (91 for India, 1 for US, etc.)
    const withoutCountryCode = normalizedPhone.replace(/^(91|1|44|61|971)/, '');
    if (withoutCountryCode !== normalizedPhone) {
      teacher = await Teacher.findOne({ phone: withoutCountryCode });
    }
  }

  // If still not found, try with normalized phone as-is
  if (!teacher) {
    teacher = await Teacher.findOne({ phone: normalizedPhone });
  }

  if (!teacher) {
    throw new ErrorResponse('Teacher not found. Please contact admin to register your account.', 404);
  }

  // Check if teacher is active
  if (!teacher.isActive) {
    throw new ErrorResponse('Your account has been deactivated. Please contact admin.', 403);
  }

  // Teacher exists and is active - Login
  teacher.isPhoneVerified = true;
  teacher.lastOtpSentAt = null;
  await teacher.save();

  const token = generateToken(teacher._id, 'teacher');

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        phone: teacher.phone,
        email: teacher.email,
        subjects: teacher.subjects,
        classes: teacher.classes,
        boards: teacher.boards,
        isPhoneVerified: teacher.isPhoneVerified,
        profileImage: teacher.profileImage,
        bio: teacher.bio,
        experience: teacher.experience
      },
      token,
      isNewUser: false
    }
  });
});

// @desc    Resend OTP
// @route   POST /api/teacher/resend-otp
// @access  Public
exports.resendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    throw new ErrorResponse('Please provide a phone number', 400);
  }

  // Check if it's a test number
  const isTestNumber = otpService.isTestNumber(phone);

  // Check resend cooldown (skip for test numbers)
  if (!isTestNumber) {
    const canResend = await otpService.canResendOTP(phone);
    if (!canResend) {
      const remainingSeconds = process.env.OTP_RESEND_COOLDOWN_SECONDS || 60;
      throw new ErrorResponse(
        `Please wait ${remainingSeconds} seconds before requesting a new OTP`,
        429
      );
    }
  }

  const result = await otpService.sendOTP(phone, process.env.TWOFACTOR_TEMPLATE_NAME);

  // Normalize phone number for database lookup
  let normalizedPhone = phone.replace(/^\+/, ''); // Remove leading +
  let teacher = await Teacher.findOne({ phone });

  // If not found, try with normalized phone (without country code)
  if (!teacher && normalizedPhone.length > 10) {
    // Try removing common country codes (91 for India, 1 for US, etc.)
    const withoutCountryCode = normalizedPhone.replace(/^(91|1|44|61|971)/, '');
    if (withoutCountryCode !== normalizedPhone) {
      teacher = await Teacher.findOne({ phone: withoutCountryCode });
    }
  }

  // If still not found, try with normalized phone as-is
  if (!teacher) {
    teacher = await Teacher.findOne({ phone: normalizedPhone });
  }

  if (teacher) {
    teacher.lastOtpSentAt = new Date();
    await teacher.save();
  }

  // Store resend cooldown (skip for test numbers)
  if (!isTestNumber) {
    await otpService.storeResendCooldown(phone);
  }

  res.status(200).json({
    success: true,
    message: result.message || (isTestNumber 
      ? 'OTP resent successfully (Test Mode - Use OTP: 123456)' 
      : 'OTP resent successfully'),
    data: {
      phone: phone.replace(/\d(?=\d{4})/g, '*'),
      expiresIn: `${process.env.OTP_EXPIRY_MINUTES || 5} minutes`,
      isTest: isTestNumber
    }
  });
});

// @desc    Get current teacher
// @route   GET /api/teacher/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.user.id);

  if (!teacher) {
    throw new ErrorResponse('Teacher not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        phone: teacher.phone,
        email: teacher.email,
        subjects: teacher.subjects,
        classes: teacher.classes,
        boards: teacher.boards,
        isPhoneVerified: teacher.isPhoneVerified,
        profileImage: teacher.profileImage,
        bio: teacher.bio,
        experience: teacher.experience,
        fcmToken: teacher.fcmToken,
        createdAt: teacher.createdAt
      }
    }
  });
});

// @desc    Update teacher profile
// @route   PUT /api/teacher/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email, profileImage, bio, experience, subjects, classes, boards } = req.body;

  const teacher = await Teacher.findById(req.user.id);

  if (!teacher) {
    throw new ErrorResponse('Teacher not found', 404);
  }

  if (name) teacher.name = name;
  if (email) teacher.email = email;
  if (profileImage) teacher.profileImage = profileImage;
  if (bio !== undefined) teacher.bio = bio;
  if (experience !== undefined) teacher.experience = experience;
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
  if (classes) teacher.classes = classes;
  if (boards) teacher.boards = boards;

  await teacher.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        phone: teacher.phone,
        email: teacher.email,
        subjects: teacher.subjects,
        classes: teacher.classes,
        boards: teacher.boards,
        profileImage: teacher.profileImage,
        bio: teacher.bio,
        experience: teacher.experience
      }
    }
  });
});

// @desc    Get all teachers
// @route   GET /api/teacher
// @access  Public
exports.getAllTeachers = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find({ isActive: true })
    .select('name phone email subjects classes boards profileImage bio experience createdAt')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      teachers,
      count: teachers.length
    }
  });
});

// @desc    Update FCM token
// @route   PUT /api/teacher/fcm-token
// @access  Private
exports.updateFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;

  const teacher = await Teacher.findById(req.user.id);

  if (!teacher) {
    throw new ErrorResponse('Teacher not found', 404);
  }

  teacher.fcmToken = fcmToken;
  await teacher.save();

  res.status(200).json({
    success: true,
    message: 'FCM token updated successfully'
  });
});

// @desc    Check if teacher exists by phone number
// @route   GET /api/teacher/check/:phone
// @access  Public
exports.checkTeacherExists = asyncHandler(async (req, res) => {
  let { phone } = req.params;

  if (!phone) {
    throw new ErrorResponse('Please provide a phone number', 400);
  }

  // Decode URL-encoded phone number
  phone = decodeURIComponent(phone);

  // Normalize phone number - try to find teacher with or without country code
  // Remove + and leading country codes (like +91, +1, etc.)
  let normalizedPhone = phone.replace(/^\+/, ''); // Remove leading +
  
  // Try to find teacher with the provided phone number first
  let teacher = await Teacher.findOne({ phone, isActive: true })
    .select('name phone email isActive');

  // If not found, try with normalized phone (without country code)
  if (!teacher && normalizedPhone.length > 10) {
    // Try removing common country codes (91 for India, 1 for US, etc.)
    const withoutCountryCode = normalizedPhone.replace(/^(91|1|44|61|971)/, '');
    if (withoutCountryCode !== normalizedPhone) {
      teacher = await Teacher.findOne({ phone: withoutCountryCode, isActive: true })
        .select('name phone email isActive');
    }
  }

  // If still not found, try with normalized phone as-is (in case it's stored without +)
  if (!teacher) {
    teacher = await Teacher.findOne({ phone: normalizedPhone, isActive: true })
      .select('name phone email isActive');
  }

  if (!teacher) {
    return res.status(200).json({
      success: false,
      message: 'Teacher not registered. Please contact admin to register your account.',
      exists: false
    });
  }

  res.status(200).json({
    success: true,
    message: 'Teacher found',
    exists: true,
    data: {
      teacher: {
        name: teacher.name,
        phone: teacher.phone,
        email: teacher.email
      }
    }
  });
});

