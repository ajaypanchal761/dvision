const Student = require('../models/Student');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const otpService = require('../services/otpService');
const generateToken = require('../utils/generateToken');
const { uploadToCloudinary } = require('../config/cloudinary');

// @desc    Check if student exists by phone number
// @route   GET /api/student/check-exists
// @access  Public
exports.checkStudentExists = asyncHandler(async (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    throw new ErrorResponse('Please provide a phone number', 400);
  }

  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    throw new ErrorResponse('Please provide a valid phone number with country code', 400);
  }

  // Check if student exists
  const student = await Student.findOne({ phone });

  res.status(200).json({
    success: true,
    data: {
      exists: !!student,
      phone: phone.replace(/\d(?=\d{4})/g, '*')
    }
  });
});

// @desc    Register student (with all data and send OTP)
// @route   POST /api/student/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  const { phone, name, email, class: studentClass, board, profileImageBase64, referralAgentId, password } = req.body;

  // Also check query parameter for referralAgentId (for URL-based referrals)
  const referralAgentIdFromQuery = req.query.ref || req.query.referralAgentId;
  const finalReferralAgentId = referralAgentId || referralAgentIdFromQuery;

  console.log('STORE_REGISTRATION_DATA payload:', {
    phone,
    name: name || 'NOT PROVIDED',
    email: email || 'NOT PROVIDED',
    studentClass,
    board,
    hasProfileImage: !!profileImageBase64
  });

  if (!phone) {
    throw new ErrorResponse('Please provide a phone number', 400);
  }

  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    throw new ErrorResponse('Please provide a valid phone number with country code', 400);
  }

  // Check if student already exists and is verified
  let student = await Student.findOne({ phone });

  if (student && student.isPhoneVerified) {
    throw new ErrorResponse('Student with this phone number already exists. Please login instead.', 400);
  }

  // Validate required fields for registration
  if (!name || !email || !studentClass || !board) {
    throw new ErrorResponse('Please provide all required fields: name, email, class, and board', 400);
  }

  // Validate password if provided
  if (password) {
    if (password.length < 6) {
      throw new ErrorResponse('Password must be at least 6 characters long', 400);
    }
  }

  // Parse class
  let parsedClass;
  if (studentClass) {
    if (typeof studentClass === 'string') {
      parsedClass = parseInt(studentClass.replace(/th|st|nd|rd/gi, '').trim());
    } else {
      parsedClass = parseInt(studentClass);
    }
  }

  if (studentClass && (isNaN(parsedClass) || parsedClass < 1 || parsedClass > 12)) {
    throw new ErrorResponse('Class must be between 1 and 12', 400);
  }

  if (board && !['CBSE', 'RBSE'].includes(board)) {
    throw new ErrorResponse('Board must be CBSE or RBSE', 400);
  }

  // Handle profile image upload if provided
  let profileImageUrl = null;
  if (profileImageBase64) {
    try {
      const uploadResult = await uploadToCloudinary(profileImageBase64, {
        folder: 'students/profile',
        resource_type: 'image',
        public_id: `profile_${Date.now()}`
      });
      profileImageUrl = uploadResult.url;
      console.log('Profile image uploaded. URL:', profileImageUrl);
    } catch (uploadError) {
      console.error('Profile image upload error:', uploadError);
      // Continue without image if upload fails
    }
  }

  // Prepare student data
  const studentData = {
    phone,
    isPhoneVerified: false, // Will be verified after OTP
    isActive: true
  };

  // Store password temporarily (will be saved during OTP verification)
  // We'll store it in a temporary field or pass it through session
  // For now, we'll store it in the student object but not save it until OTP is verified
  if (password) {
    studentData.password = password; // Will be hashed by pre-save hook
  }

  if (name && typeof name === 'string' && name.trim().length > 0) {
    studentData.name = name.trim();
  }

  if (email) {
    studentData.email = email.toLowerCase().trim();
  }

  if (parsedClass && !isNaN(parsedClass)) {
    studentData.class = parsedClass;
  }

  if (board) {
    studentData.board = board;
  }

  if (profileImageUrl) {
    studentData.profileImage = profileImageUrl;
  }

  // Validate and handle referral agent ID if provided
  if (finalReferralAgentId) {
    const Agent = require('../models/Agent');
    const mongoose = require('mongoose');

    // Validate ObjectId format
    if (mongoose.Types.ObjectId.isValid(finalReferralAgentId)) {
      // Check if agent exists and is active
      const agent = await Agent.findById(finalReferralAgentId);
      if (agent && agent.isActive) {
        // Agent exists and is active - store referral info
        studentData.referralAgentId = agent._id;
        studentData.referredAt = new Date();
        console.log('Referral agent validated and stored:', agent._id);
      } else {
        console.warn('Referral agent not found or inactive:', finalReferralAgentId);
        // Don't throw error - just log warning and continue without referral
      }
    } else {
      console.warn('Invalid referral agent ID format:', finalReferralAgentId);
    }
  }

  // Create or update student
  if (student) {
    // Update existing unverified student
    Object.assign(student, studentData);
    await student.save();
    console.log('Updated existing student registration data:', student._id);
  } else {
    // Create new student
    student = await Student.create(studentData);
    console.log('Created new student registration data:', student._id);
  }

  // Send notification to agent if student was referred
  if (student.referralAgentId) {
    try {
      const notificationService = require('../services/notificationService');
      const Agent = require('../models/Agent');
      const agent = await Agent.findById(student.referralAgentId);

      if (agent && agent.isActive) {
        const notificationTitle = 'New Student Registration!';
        const notificationBody = `${student.name || 'A student'} has registered using your referral link`;
        const notificationData = {
          type: 'student_registered',
          studentId: student._id.toString(),
          studentName: student.name || 'Student',
          studentPhone: student.phone,
          studentClass: student.class,
          studentBoard: student.board,
          url: '/agent/referrals'
        };

        await notificationService.sendToUser(
          agent._id.toString(),
          'agent',
          { title: notificationTitle, body: notificationBody },
          notificationData
        );
        console.log(`✓ Notification sent to agent ${agent.name} for new student registration`);
      }
    } catch (notificationError) {
      console.error('Error sending notification to agent:', notificationError);
      // Don't fail the registration if notification fails
    }
  }

  console.log('Final stored student data:', {
    _id: student._id,
    phone: student.phone,
    name: student.name || 'NOT SET',
    email: student.email || 'NOT SET',
    class: student.class || 'NOT SET',
    board: student.board || 'NOT SET',
    isPhoneVerified: student.isPhoneVerified
  });

  // Send OTP after storing registration data
  const isTestNumber = otpService.isTestNumber(phone);
  const otpResult = await otpService.sendOTP(phone, process.env.TWOFACTOR_TEMPLATE_NAME);

  // Update last OTP sent time
  student.lastOtpSentAt = new Date();
  await student.save();

  // Store resend cooldown (skip for test numbers)
  if (!isTestNumber) {
    await otpService.storeResendCooldown(phone);
  }

  res.status(200).json({
    success: true,
    message: isTestNumber
      ? 'Registration successful. OTP sent (Test Mode - Use OTP: 123456)'
      : 'Registration successful. OTP sent to your phone number',
    data: {
      student: {
        _id: student._id,
        phone: student.phone,
        name: student.name,
        email: student.email,
        class: student.class,
        board: student.board,
        isPhoneVerified: student.isPhoneVerified
      },
      phone: phone.replace(/\d(?=\d{4})/g, '*'),
      expiresIn: `${process.env.OTP_EXPIRY_MINUTES || 5} minutes`,
      isTest: isTestNumber
    }
  });
});

// @desc    Login student (with password)
// @route   POST /api/student/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone) {
    throw new ErrorResponse('Please provide a phone number', 400);
  }

  if (!password) {
    throw new ErrorResponse('Please provide a password', 400);
  }

  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    throw new ErrorResponse('Please provide a valid phone number with country code', 400);
  }

  // Check if student exists and include password field
  const student = await Student.findOne({ phone }).select('+password');

  if (!student) {
    throw new ErrorResponse('Student not found. Please register first.', 404);
  }

  // Check if phone is verified
  if (!student.isPhoneVerified) {
    throw new ErrorResponse('Phone number not verified. Please complete registration first.', 400);
  }

  // Check if student has a password set
  if (!student.password) {
    throw new ErrorResponse('Password not set. Please reset your password or contact support.', 400);
  }

  // Check password
  const isPasswordMatch = await student.matchPassword(password);

  if (!isPasswordMatch) {
    throw new ErrorResponse('Invalid phone number or password', 401);
  }

  // Check subscription validity
  if (student.subscription && student.subscription.status === 'active' && student.subscription.endDate) {
    const now = new Date();
    const endDate = new Date(student.subscription.endDate);

    if (now > endDate) {
      // Subscription expired
      student.subscription.status = 'expired';
      await student.save();
    }
  }

  const token = generateToken(student._id, 'student');

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      student: {
        _id: student._id,
        name: student.name,
        phone: student.phone,
        email: student.email,
        class: student.class,
        board: student.board,
        isPhoneVerified: student.isPhoneVerified,
        subscription: student.subscription,
        profileImage: student.profileImage
      },
      token
    }
  });
});

// @desc    Send OTP to student phone number
// @route   POST /api/student/send-otp
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

  // Update last OTP sent time if student exists
  const student = await Student.findOne({ phone });
  if (student) {
    student.lastOtpSentAt = new Date();
    await student.save();
  }

  // Store resend cooldown (skip for test numbers)
  if (!isTestNumber) {
    await otpService.storeResendCooldown(phone);
  }

  res.status(200).json({
    success: true,
    message: isTestNumber
      ? 'OTP sent successfully (Test Mode - Use OTP: 123456)'
      : 'OTP sent successfully to your phone number',
    data: {
      phone: phone.replace(/\d(?=\d{4})/g, '*'),
      expiresIn: `${process.env.OTP_EXPIRY_MINUTES || 2} minutes`,
      isTest: isTestNumber
    }
  });
});

// Helper function to upload base64 image to Cloudinary
const uploadBase64ToCloudinary = async (base64String) => {
  try {
    // Cloudinary supports direct base64 upload (with or without data URL prefix)
    const result = await cloudinary.uploader.upload(base64String, {
      folder: 'dvision_uploads/students',
      resource_type: 'image',
      public_id: `profile_${Date.now()}`,
    });
    return result.secure_url;
  } catch (error) {
    throw new Error('Failed to upload image: ' + error.message);
  }
};

// @desc    Verify OTP and complete login/registration
// @route   POST /api/student/verify-otp
// @access  Public
exports.verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  console.log('VERIFY_OTP payload:', {
    phone,
    hasOtp: !!otp
  });

  if (!phone || !otp) {
    throw new ErrorResponse('Please provide phone number and OTP', 400);
  }

  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    throw new ErrorResponse('OTP must be a 6-digit number', 400);
  }

  // Verify OTP
  await otpService.verifyOTP(phone, otp);

  // Check if student exists
  const student = await Student.findOne({ phone });

  if (!student) {
    throw new ErrorResponse('Student not found. Please register first.', 404);
  }

  // Mark phone as verified
  const wasUnverified = !student.isPhoneVerified;
  student.isPhoneVerified = true;
  student.lastOtpSentAt = null;

  // Check subscription validity
  if (student.subscription && student.subscription.status === 'active' && student.subscription.endDate) {
    const now = new Date();
    const endDate = new Date(student.subscription.endDate);

    if (now > endDate) {
      // Subscription expired
      student.subscription.status = 'expired';
    }
  }

  await student.save();

  const token = generateToken(student._id, 'student');

  res.status(200).json({
    success: true,
    message: wasUnverified ? 'Account Created Successfully' : 'Login successful',
    data: {
      student: {
        _id: student._id,
        name: student.name,
        phone: student.phone,
        email: student.email,
        class: student.class,
        board: student.board,
        isPhoneVerified: student.isPhoneVerified,
        subscription: student.subscription,
        profileImage: student.profileImage
      },
      token,
      isNewUser: wasUnverified
    }
  });
});

// @desc    Upload profile image
// @route   POST /api/student/upload-profile-image
// @access  Private
exports.uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.path) {
    throw new ErrorResponse('Please upload an image file', 400);
  }

  // req.user is already the Student document from auth middleware
  if (!req.user || !req.user._id) {
    throw new ErrorResponse('Student not authenticated', 401);
  }

  const student = await Student.findById(req.user._id);

  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }

  try {
    // Upload to Cloudinary (local file will be deleted automatically)
    const uploadResult = await uploadToCloudinary(req.file.path, {
      folder: 'students/profile',
      resource_type: 'image',
      public_id: `student_${student._id}_${Date.now()}`
    });

    // Update profile image URL
    student.profileImage = uploadResult.url;
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        profileImage: student.profileImage,
        student: {
          _id: student._id,
          name: student.name,
          phone: student.phone,
          email: student.email,
          class: student.class,
          board: student.board,
          profileImage: student.profileImage
        }
      }
    });
  } catch (uploadError) {
    console.error('Profile image upload error:', uploadError);
    throw new ErrorResponse('Failed to upload profile image', 500);
  }
});

// @desc    Resend OTP
// @route   POST /api/student/resend-otp
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

  const student = await Student.findOne({ phone });
  if (student) {
    student.lastOtpSentAt = new Date();
    await student.save();
  }

  // Store resend cooldown (skip for test numbers)
  if (!isTestNumber) {
    await otpService.storeResendCooldown(phone);
  }

  res.status(200).json({
    success: true,
    message: isTestNumber
      ? 'OTP resent successfully (Test Mode - Use OTP: 123456)'
      : 'OTP resent successfully',
    data: {
      phone: phone.replace(/\d(?=\d{4})/g, '*'),
      expiresIn: `${process.env.OTP_EXPIRY_MINUTES || 2} minutes`,
      isTest: isTestNumber
    }
  });
});

// @desc    Get current student
// @route   GET /api/student/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const Payment = require('../models/Payment');
  const SubscriptionPlan = require('../models/SubscriptionPlan');

  // req.user is already the Student document from auth middleware
  if (!req.user || !req.user._id) {
    throw new ErrorResponse('Student not authenticated', 401);
  }

  // Get fresh student data from database
  const student = await Student.findById(req.user._id);

  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }

  // Check subscription validity
  if (student.subscription && student.subscription.status === 'active' && student.subscription.endDate) {
    const now = new Date();
    const endDate = new Date(student.subscription.endDate);

    if (now > endDate) {
      // Subscription expired
      student.subscription.status = 'expired';
      await student.save();
    }
  }

  // Get all active subscriptions from activeSubscriptions array and payments
  const now = new Date();

  // Clean up expired subscriptions from activeSubscriptions array
  if (student.activeSubscriptions && student.activeSubscriptions.length > 0) {
    const validSubs = student.activeSubscriptions.filter(sub => new Date(sub.endDate) >= now);
    if (validSubs.length !== student.activeSubscriptions.length) {
      student.activeSubscriptions = validSubs;
      await student.save();
    }
  }

  // Get active subscriptions from activeSubscriptions array (preferred)
  const activeSubsFromArray = (student.activeSubscriptions || []).filter(sub =>
    new Date(sub.endDate) >= now
  );

  // Populate plan details for activeSubscriptions
  const populatedActiveSubs = await Promise.all(
    activeSubsFromArray.map(async (sub) => {
      const plan = await SubscriptionPlan.findById(sub.planId)
        .populate('classId', 'name description classCode')
        .select('name type board classes classId duration price originalPrice description features');

      return {
        _id: sub.paymentId,
        plan: plan,
        startDate: sub.startDate,
        endDate: sub.endDate,
        type: sub.type,
        board: sub.board,
        class: sub.class,
        classId: sub.classId,
        status: 'active'
      };
    })
  );

  // Also get from payments for backward compatibility
  const activePayments = await Payment.find({
    studentId: student._id,
    status: 'completed',
    subscriptionEndDate: { $gte: now }
  })
    .populate({
      path: 'subscriptionPlanId',
      select: 'name type board classes classId duration price originalPrice description features',
      populate: {
        path: 'classId',
        select: 'name description classCode'
      }
    })
    .sort({ subscriptionEndDate: -1 });

  // Combine both sources, prioritizing activeSubscriptions array
  const paymentSubs = activePayments
    .filter(payment => {
      // Only include if not already in activeSubscriptions array
      return !populatedActiveSubs.some(sub => sub._id.toString() === payment._id.toString());
    })
    .map(payment => ({
      _id: payment._id,
      plan: payment.subscriptionPlanId,
      startDate: payment.subscriptionStartDate,
      endDate: payment.subscriptionEndDate,
      amount: payment.amount,
      status: 'active'
    }));

  const allActiveSubscriptions = [...populatedActiveSubs, ...paymentSubs];

  // Separate subscriptions by type
  const classBasedSubscriptions = allActiveSubscriptions.filter(sub =>
    sub.plan && sub.plan.type === 'regular'
  );
  const preparationSubscriptions = allActiveSubscriptions.filter(sub =>
    sub.plan && sub.plan.type === 'preparation'
  );

  // Check for expired subscriptions and mark them
  const expiredSubscriptions = [];
  allActiveSubscriptions.forEach(sub => {
    if (sub.endDate && new Date(sub.endDate) < now) {
      expiredSubscriptions.push(sub._id);
    }
  });

  // Populate current subscription plan if exists
  let currentSubscription = null;
  if (student.subscription && student.subscription.status === 'active' && student.subscription.planId) {
    const plan = await SubscriptionPlan.findById(student.subscription.planId)
      .populate('classId', 'name description classCode')
      .select('name type board classes classId duration price originalPrice description features');

    if (plan) {
      currentSubscription = {
        ...student.subscription.toObject(),
        plan: plan
      };
    }
  }

  // Check subscription access for class-based content
  const hasActiveClassSubscription = classBasedSubscriptions.length > 0 &&
    classBasedSubscriptions.some(sub => new Date(sub.endDate) > now);

  // Check subscription access for preparation content
  const hasActivePreparationSubscription = preparationSubscriptions.length > 0 &&
    preparationSubscriptions.some(sub => new Date(sub.endDate) > now);

  // Always include profileImage in the response so frontend can show avatar
  res.status(200).json({
    success: true,
    data: {
      student: {
        _id: student._id,
        name: student.name,
        phone: student.phone,
        email: student.email,
        class: student.class,
        board: student.board,
        isPhoneVerified: student.isPhoneVerified,
        subscription: currentSubscription || student.subscription,
        activeSubscriptions: allActiveSubscriptions, // All subscriptions for backward compatibility
        classBasedSubscriptions: classBasedSubscriptions, // Only class-based subscriptions
        preparationSubscriptions: preparationSubscriptions, // Only preparation subscriptions
        hasActiveClassSubscription: hasActiveClassSubscription,
        hasActivePreparationSubscription: hasActivePreparationSubscription,
        profileImage: student.profileImage || null,
        fcmToken: student.fcmToken,
        createdAt: student.createdAt
      }
    }
  });
});

// @desc    Update student profile
// @route   PUT /api/student/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email, profileImageBase64 } = req.body;

  // req.user is already the Student document from auth middleware
  if (!req.user || !req.user._id) {
    throw new ErrorResponse('Student not authenticated', 401);
  }

  const student = await Student.findById(req.user._id);

  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }

  if (name) student.name = name;
  if (email) student.email = email;

  // Handle profile image upload if provided
  if (profileImageBase64) {
    try {
      const uploadResult = await uploadToCloudinary(profileImageBase64, {
        folder: 'students/profile',
        resource_type: 'image',
        public_id: `student_${student._id}_${Date.now()}`
      });
      student.profileImage = uploadResult.url;
      console.log('Profile image updated. URL:', student.profileImage);
    } catch (uploadError) {
      console.error('Profile image upload error:', uploadError);
      throw new ErrorResponse('Failed to upload profile image', 500);
    }
  }

  await student.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      student: {
        _id: student._id,
        name: student.name,
        phone: student.phone,
        email: student.email,
        class: student.class,
        board: student.board,
        profileImage: student.profileImage
      }
    }
  });
});

// @desc    Get courses for student (filtered by class and board, and subscription)
// @route   GET /api/student/courses
// @access  Private
exports.getCourses = asyncHandler(async (req, res) => {
  const Course = require('../models/Course');
  const Payment = require('../models/Payment');
  const Class = require('../models/Class');

  // req.user is already the Student document from auth middleware
  if (!req.user || !req.user._id) {
    throw new ErrorResponse('Student not authenticated', 401);
  }

  // Get fresh student data from database
  const student = await Student.findById(req.user._id);

  if (!student) {
    throw new ErrorResponse('Student not found', 404);
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

  // Also honor activeSubscriptions stored on the student record (used when payments are not present)
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
  const prepClassIdsFromPayments = activePayments
    .filter(payment =>
      payment.subscriptionPlanId &&
      payment.subscriptionPlanId.type === 'preparation' &&
      payment.subscriptionPlanId.classId
    )
    .map(payment => payment.subscriptionPlanId.classId._id || payment.subscriptionPlanId.classId);

  const prepClassIdsFromArray = activeSubsFromArray
    .filter(sub => sub.type === 'preparation' && sub.classId)
    .map(sub => sub.classId._id || sub.classId);

  // Merge and de-duplicate preparation class IDs
  const preparationClassIds = [...new Set([
    ...prepClassIdsFromPayments.map(id => id.toString()),
    ...prepClassIdsFromArray.map(id => id.toString())
  ])];

  // Get preparation classes
  const preparationClasses = preparationClassIds.length > 0
    ? await Class.find({ _id: { $in: preparationClassIds }, isActive: true })
    : [];

  // Build query for regular courses (only if student has active class subscription)
  const normalizedBoard = student.board ? student.board.trim() : student.board;
  const normalizedClass = parseInt(student.class);

  const regularCoursesQuery = {
    class: normalizedClass,
    board: normalizedBoard,
    status: 'Active'
  };

  // Get regular courses only if student has active class subscription
  const regularCourses = hasActiveClassSubscription
    ? await Course.find(regularCoursesQuery).sort({ createdAt: -1 })
    : [];

  // Get preparation courses (only if student has active preparation subscription)
  const preparationCourses = preparationClasses.length > 0
    ? await Course.find({
      classId: { $in: preparationClassIds },
      status: 'Active'
    }).sort({ createdAt: -1 })
    : [];

  // Combine both types of courses
  const allCourses = [...regularCourses, ...preparationCourses];

  res.status(200).json({
    success: true,
    count: allCourses.length,
    data: {
      courses: allCourses,
      hasActiveClassSubscription,
      hasActivePreparationSubscription: preparationClassIds.length > 0,
      subscriptionInfo: {
        classBased: hasActiveClassSubscription,
        preparation: preparationClassIds.length > 0,
        preparationClassIds: preparationClassIds
      }
    }
  });
});

// @desc    Get single course by ID (Student)
// @route   GET /api/student/courses/:id
// @access  Private
exports.getCourseById = asyncHandler(async (req, res) => {
  const Course = require('../models/Course');
  const Payment = require('../models/Payment');
  const Class = require('../models/Class');

  // req.user is already the Student document from auth middleware
  if (!req.user || !req.user._id) {
    throw new ErrorResponse('Student not authenticated', 401);
  }

  const student = await Student.findById(req.user._id);

  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }

  const course = await Course.findById(req.params.id)
    .populate('classId', 'name classCode type');

  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  // Check if course is active
  if (course.status !== 'Active') {
    throw new ErrorResponse('Course is not active', 403);
  }

  // Check subscription access
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

  // Also honor activeSubscriptions array (when payments aren't present)
  const activeSubsFromArray = (student.activeSubscriptions || []).filter(sub => new Date(sub.endDate) >= now);

  let hasAccess = false;

  // Check if it's a regular course
  if (course.class && course.board) {
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

    if (course.class === student.class && course.board === student.board && hasActiveClassSubscription) {
      hasAccess = true;
    }
  }

  // Check if it's a preparation course
  if (course.classId) {
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

    const courseClassId = course.classId._id?.toString() || course.classId.toString();
    if (preparationClassIds.some(id => (id._id?.toString() || id.toString()) === courseClassId)) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    throw new ErrorResponse('Course not available. Please check your subscription.', 403);
  }

  // Normalize chapter PDF URLs before returning
  normalizeChapterPdfUrls(course);

  res.status(200).json({
    success: true,
    data: {
      course
    }
  });
});

// Normalize chapter PDF URLs before sending to clients (safety net)
// This helps handle malformed stored URLs like '/.dvisionacademy.com/api/uploads/..'
const normalizeChapterPdfUrls = (courseDoc) => {
  try {
    if (!courseDoc || !courseDoc.chapters) return courseDoc;
    courseDoc.chapters = courseDoc.chapters.map(ch => {
      if (!ch || !ch.pdfUrl) return ch;
      const url = String(ch.pdfUrl);
      // If it already looks absolute (http), leave it
      if (url.startsWith('http') || url.startsWith('//')) return ch;
      // If contains '/uploads/', extract that portion
      const uploadIndex = url.indexOf('/uploads/');
      if (uploadIndex !== -1) {
        ch.pdfUrl = url.substring(uploadIndex);
        return ch;
      }
      // If contains '/api/uploads/', extract '/uploads/...' as well
      const apiUploadIndex = url.indexOf('/api/uploads/');
      if (apiUploadIndex !== -1) {
        const suffix = url.substring(apiUploadIndex + '/api'.length); // keep '/uploads/...'
        ch.pdfUrl = suffix;
        return ch;
      }
      // Otherwise, leave as-is (could be relative like '/uploads/...')
      return ch;
    });
  } catch (e) {
    console.error('Error normalizing chapter pdf urls:', e.message);
  }
  return courseDoc;
};

// @desc    Update FCM token (supports platform: 'app' or 'web')
// @route   PUT /api/student/fcm-token
// @access  Private
exports.updateFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken, platform = 'web' } = req.body;

  if (!fcmToken) {
    throw new ErrorResponse('Please provide FCM token', 400);
  }

  // Validate platform
  if (platform !== 'app' && platform !== 'web') {
    throw new ErrorResponse('Platform must be either "app" or "web"', 400);
  }

  // req.user is already the Student document from auth middleware
  if (!req.user || !req.user._id) {
    throw new ErrorResponse('Student not authenticated', 401);
  }

  // Use req.user directly since it's already the Student document from auth middleware
  const student = req.user;

  // Initialize fcmTokens if it doesn't exist
  if (!student.fcmTokens) {
    student.fcmTokens = { app: null, web: null };
  }

  // Update platform-specific FCM token
  student.fcmTokens[platform] = fcmToken;

  // Also update legacy fcmToken for backward compatibility (use app token if available, otherwise web)
  if (platform === 'app') {
    student.fcmToken = fcmToken;
  } else if (platform === 'web' && !student.fcmToken) {
    student.fcmToken = fcmToken;
  }

  await student.save();

  res.status(200).json({
    success: true,
    message: `FCM token updated successfully for ${platform} platform`,
    data: {
      platform,
      tokenUpdated: true
    }
  });
});

