const Agent = require('../models/Agent');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const otpService = require('../services/otpService');
const generateToken = require('../utils/generateToken');
const ReferralRecord = require('../models/ReferralRecord');
const Student = require('../models/Student');

// @desc    Check if agent exists and is active
// @route   POST /api/agent/check-exists
// @access  Public
exports.checkAgentExists = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    throw new ErrorResponse('Please provide a phone number', 400);
  }

  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    throw new ErrorResponse('Please provide a valid phone number with country code', 400);
  }

  // Normalize phone number for database lookup
  let normalizedPhone = phone.replace(/^\+/, '');
  let agent = await Agent.findOne({ phone });

  // If not found, try with normalized phone
  if (!agent && normalizedPhone.length > 10) {
    const withoutCountryCode = normalizedPhone.replace(/^(91|1|44|61|971)/, '');
    if (withoutCountryCode !== normalizedPhone) {
      agent = await Agent.findOne({ phone: withoutCountryCode });
    }
  }

  if (!agent) {
    agent = await Agent.findOne({ phone: normalizedPhone });
  }

  if (!agent) {
    return res.status(200).json({
      success: false,
      exists: false,
      message: 'Agent account not found. Contact admin to create your account.'
    });
  }

  if (!agent.isActive) {
    return res.status(200).json({
      success: false,
      exists: true,
      isActive: false,
      message: 'Your agent account has been deactivated. Please contact admin.'
    });
  }

  return res.status(200).json({
    success: true,
    exists: true,
    isActive: true,
    message: 'Agent account found and active'
  });
});

// @desc    Send OTP to agent phone number (only if agent exists and is active)
// @route   POST /api/agent/send-otp
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

  // Normalize phone number for database lookup
  let normalizedPhone = phone.replace(/^\+/, '');
  let agent = await Agent.findOne({ phone });

  // If not found, try with normalized phone
  if (!agent && normalizedPhone.length > 10) {
    const withoutCountryCode = normalizedPhone.replace(/^(91|1|44|61|971)/, '');
    if (withoutCountryCode !== normalizedPhone) {
      agent = await Agent.findOne({ phone: withoutCountryCode });
    }
  }

  if (!agent) {
    agent = await Agent.findOne({ phone: normalizedPhone });
  }

  // Check if agent exists
  if (!agent) {
    throw new ErrorResponse('Agent account not found. Contact admin to create your account.', 404);
  }

  // Check if agent is active
  if (!agent.isActive) {
    throw new ErrorResponse('Your agent account has been deactivated. Please contact admin.', 403);
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

  // Update last OTP sent time
  agent.lastOtpSentAt = new Date();
  await agent.save();

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

// @desc    Verify OTP and login agent
// @route   POST /api/agent/verify-otp
// @access  Public
exports.verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new ErrorResponse('Please provide phone number and OTP', 400);
  }

  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    throw new ErrorResponse('OTP must be a 6-digit number', 400);
  }

  // Verify OTP (will handle test numbers automatically)
  await otpService.verifyOTP(phone, otp);

  // After OTP verification, find agent for login
  // Normalize phone number for database lookup
  let normalizedPhone = phone.replace(/^\+/, '');
  let agent = await Agent.findOne({ phone });

  // If not found, try with normalized phone
  if (!agent && normalizedPhone.length > 10) {
    const withoutCountryCode = normalizedPhone.replace(/^(91|1|44|61|971)/, '');
    if (withoutCountryCode !== normalizedPhone) {
      agent = await Agent.findOne({ phone: withoutCountryCode });
    }
  }

  if (!agent) {
    agent = await Agent.findOne({ phone: normalizedPhone });
  }

  if (!agent) {
    throw new ErrorResponse('Agent account not found. Contact admin to create your account.', 404);
  }

  // Check if agent is active
  if (!agent.isActive) {
    throw new ErrorResponse('Your agent account has been deactivated. Please contact admin.', 403);
  }

  // Agent exists and is active - Login
  agent.isPhoneVerified = true;
  agent.lastOtpSentAt = null;
  await agent.save();

  const token = generateToken(agent._id, 'agent');

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      agent: {
        _id: agent._id,
        name: agent.name,
        phone: agent.phone,
        email: agent.email,
        isPhoneVerified: agent.isPhoneVerified,
        profileImage: agent.profileImage
      },
      token
    }
  });
});

// @desc    Get current agent profile
// @route   GET /api/agent/me
// @access  Private (Agent)
exports.getMe = asyncHandler(async (req, res) => {
  const agent = await Agent.findById(req.user._id);

  if (!agent) {
    throw new ErrorResponse('Agent not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      agent: {
        _id: agent._id,
        name: agent.name,
        phone: agent.phone,
        email: agent.email,
        isPhoneVerified: agent.isPhoneVerified,
        profileImage: agent.profileImage,
        bankDetails: agent.bankDetails,
        upiId: agent.upiId
      }
    }
  });
});

// @desc    Update agent profile (limited fields - email, profile image only)
// @route   PUT /api/agent/me
// @access  Private (Agent)
exports.updateMe = asyncHandler(async (req, res) => {
  const { email, profileImage, bankDetails, upiId } = req.body;

  const agent = await Agent.findById(req.user._id);

  if (!agent) {
    throw new ErrorResponse('Agent not found', 404);
  }

  // Only allow updating email, profileImage, bankDetails, and upiId
  if (email !== undefined) {
    agent.email = email;
  }

  if (profileImage !== undefined) {
    agent.profileImage = profileImage;
  }

  // Update bank details
  if (bankDetails !== undefined) {
    if (bankDetails === null) {
      // Clear bank details - allowed (delete operation)
      agent.bankDetails = undefined;
    } else {
      // Check if agent already has bank details
      const hasExistingBankDetails = agent.bankDetails && 
        (agent.bankDetails.accountHolderName || agent.bankDetails.accountNumber);
      
      // Check if trying to add new bank details (has accountHolderName or accountNumber in request)
      const isAddingNew = (bankDetails.accountHolderName || bankDetails.accountNumber);
      
      // If agent already has bank details and trying to add new one (not update), prevent it
      if (hasExistingBankDetails && isAddingNew) {
        // Check if this is an update (same account number) or a new addition
        const isUpdate = agent.bankDetails.accountNumber && 
                         bankDetails.accountNumber && 
                         agent.bankDetails.accountNumber === bankDetails.accountNumber;
        
        if (!isUpdate) {
          throw new ErrorResponse('You already have bank details. Please delete existing bank details before adding new ones.', 400);
        }
      }

      // Initialize bankDetails if it doesn't exist
      if (!agent.bankDetails) {
        agent.bankDetails = {};
      }
      
      // Update bank details fields
      if (bankDetails.accountHolderName !== undefined) {
        agent.bankDetails.accountHolderName = bankDetails.accountHolderName || undefined;
      }
      if (bankDetails.accountNumber !== undefined) {
        agent.bankDetails.accountNumber = bankDetails.accountNumber || undefined;
      }
      if (bankDetails.ifscCode !== undefined) {
        agent.bankDetails.ifscCode = bankDetails.ifscCode ? bankDetails.ifscCode.toUpperCase() : undefined;
      }
      if (bankDetails.bankName !== undefined) {
        agent.bankDetails.bankName = bankDetails.bankName || undefined;
      }
      if (bankDetails.branchName !== undefined) {
        agent.bankDetails.branchName = bankDetails.branchName || undefined;
      }
    }
  }

  // Update UPI ID
  if (upiId !== undefined) {
    if (upiId === null || upiId === '') {
      agent.upiId = undefined;
    } else {
      // Validate UPI ID format
      if (!/^[\w.-]+@[\w.-]+$/.test(upiId)) {
        throw new ErrorResponse('Please provide a valid UPI ID (e.g., name@paytm)', 400);
      }
      agent.upiId = upiId.toLowerCase();
    }
  }

  await agent.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      agent: {
        _id: agent._id,
        name: agent.name,
        phone: agent.phone,
        email: agent.email,
        isPhoneVerified: agent.isPhoneVerified,
        profileImage: agent.profileImage,
        bankDetails: agent.bankDetails,
        upiId: agent.upiId
      }
    }
  });
});

// @desc    Get agent's referral link
// @route   GET /api/agent/referral-link
// @access  Private (Agent)
exports.getReferralLink = asyncHandler(async (req, res) => {
  const agent = await Agent.findById(req.user._id);

  if (!agent) {
    throw new ErrorResponse('Agent not found', 404);
  }

  if (!agent.isActive) {
    throw new ErrorResponse('Your agent account has been deactivated', 403);
  }

  // Generate referral link
  // Use explicit student app URL if provided, otherwise default to current live site.
  const baseUrl = process.env.STUDENT_APP_URL || 'https://dvisionacademy.com';
  // Allow overriding the registration path; default to /registration which matches the student web route.
  const registrationPath = process.env.STUDENT_REGISTRATION_PATH || '/registration';
  const referralLink = `${baseUrl.replace(/\/$/, '')}${registrationPath}?ref=${agent._id}`;

  // WhatsApp share message
  const whatsappMessage = `Join Dvision Academy! Register here: ${referralLink}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  res.status(200).json({
    success: true,
    data: {
      referralLink,
      whatsappUrl,
      agentId: agent._id
    }
  });
});

// @desc    Get agent's referral statistics
// @route   GET /api/agent/statistics
// @access  Private (Agent)
exports.getStatistics = asyncHandler(async (req, res) => {
  const agent = await Agent.findById(req.user._id);

  if (!agent) {
    throw new ErrorResponse('Agent not found', 404);
  }

  // Students referred by this agent
  const referredStudents = await Student.find({
    referralAgentId: agent._id
  })
    .select('name phone email class board referredAt createdAt')
    .sort({ referredAt: -1, createdAt: -1 })
    .lean();

  const totalReferrals = referredStudents.length;

  // Successful subscriptions (ReferralRecords with status 'completed')
  const successfulSubscriptions = await ReferralRecord.countDocuments({
    agentId: agent._id,
    status: 'completed'
  });

  // Pending commissions (completed but unpaid) – keep as existing behavior
  const pendingCommissions = await ReferralRecord.countDocuments({
    agentId: agent._id,
    status: 'completed'
  });

  // Recent completed referral records (legacy view, for detailed cards)
  const recentReferrals = await ReferralRecord.find({
    agentId: agent._id,
    status: 'completed'
  })
    .populate('studentId', 'name phone email class board')
    .populate('subscriptionPlanId', 'name')
    .sort({ subscriptionDate: -1 })
    .limit(10)
    .select('studentId subscriptionPlanId amount subscriptionDate status')
    .lean();

  // Get month-wise breakdown
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1); // Last 6 months

  const monthWiseData = await ReferralRecord.aggregate([
    {
      $match: {
        agentId: agent._id,
        status: 'completed',
        subscriptionDate: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$subscriptionDate' },
          month: { $month: '$subscriptionDate' }
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    }
  ]);

  // Format month-wise data
  const monthWiseBreakdown = monthWiseData.map(item => ({
    month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
    count: item.count,
    totalAmount: item.totalAmount
  }));

  // Recent referral students (latest 3, regardless of subscription)
  const recentReferralStudents = referredStudents.slice(0, 3).map((s) => ({
    _id: s._id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    class: s.class,
    board: s.board,
    referredAt: s.referredAt || s.createdAt,
    status: 'pending',
  }));

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        totalReferrals,
        successfulSubscriptions,
        pendingCommissions
      },
      monthWiseBreakdown,
      recentReferrals, // completed subscriptions (legacy)
      recentReferralStudents,
      referredStudents
    }
  });
});

// @desc    Update FCM token (supports platform: 'app' or 'web')
// @route   PUT /api/agent/fcm-token
// @access  Private (Agent)
exports.updateFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken, platform = 'web' } = req.body;

  if (!fcmToken) {
    throw new ErrorResponse('Please provide FCM token', 400);
  }

  // Validate platform
  if (platform !== 'app' && platform !== 'web') {
    throw new ErrorResponse('Platform must be either "app" or "web"', 400);
  }

  const agent = await Agent.findById(req.user._id);

  if (!agent) {
    throw new ErrorResponse('Agent not found', 404);
  }

  // Initialize fcmTokens if it doesn't exist
  if (!agent.fcmTokens) {
    agent.fcmTokens = { app: null, web: null };
  }

  // Update platform-specific FCM token
  agent.fcmTokens[platform] = fcmToken;

  // Also update legacy fcmToken for backward compatibility (use app token if available, otherwise web)
  if (platform === 'app') {
    agent.fcmToken = fcmToken;
  } else if (platform === 'web' && !agent.fcmToken) {
    agent.fcmToken = fcmToken;
  }

  await agent.save();

  res.status(200).json({
    success: true,
    message: `FCM token updated successfully for ${platform} platform`,
    data: {
      platform,
      tokenUpdated: true
    }
  });
});



