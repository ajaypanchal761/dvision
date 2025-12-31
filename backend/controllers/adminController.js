const Admin = require('../models/Admin');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const generateToken = require('../utils/generateToken');
const generateResetToken = require('../utils/generateResetToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// @desc    Register admin
// @route   POST /api/admin/register
// @access  Private (Only super_admin can register new admins)
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw new ErrorResponse('Please provide name, email and password', 400);
  }

  // Check if admin exists
  const adminExists = await Admin.findOne({ email });
  if (adminExists) {
    throw new ErrorResponse('Admin already exists with this email', 400);
  }

  // Create admin
  const admin = await Admin.create({
    name,
    email,
    password,
    role: role || 'admin'
  });

  const token = generateToken(admin._id, 'admin');

  res.status(201).json({
    success: true,
    message: 'Admin registered successfully',
    data: {
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      token
    }
  });
});

// @desc    Login admin
// @route   POST /api/admin/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ErrorResponse('Please provide email and password', 400);
  }

  // Find admin and include password
  const admin = await Admin.findOne({ email }).select('+password');

  if (!admin) {
    throw new ErrorResponse('Invalid credentials', 401);
  }

  // Check if admin is active
  if (!admin.isActive) {
    throw new ErrorResponse('Your account has been deactivated', 401);
  }

  // Check password
  const isMatch = await admin.matchPassword(password);

  if (!isMatch) {
    throw new ErrorResponse('Invalid credentials', 401);
  }

  // Update last login
  admin.lastLogin = new Date();
  await admin.save();

  const token = generateToken(admin._id, 'admin');

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin
      },
      token
    }
  });
});

// @desc    Forgot password
// @route   POST /api/admin/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ErrorResponse('Please provide an email address', 400);
  }

  const admin = await Admin.findOne({ email });

  if (!admin) {
    // Don't reveal if email exists or not for security
    return res.status(200).json({
      success: true,
      message: 'If email exists, password reset link has been sent'
    });
  }

  // Generate reset token
  const { resetToken, hashedToken } = generateResetToken();

  // Save hashed token and expiry
  admin.resetPasswordToken = hashedToken;
  admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  await admin.save();

  // Create reset URL - Use ADMIN_FRONTEND_URL specifically for admin panel
  // IMPORTANT: Set ADMIN_FRONTEND_URL in .env file to your admin frontend URL
  // Example: ADMIN_FRONTEND_URL=https://appzetoapp.com/dvision/admin
  // Or for local: ADMIN_FRONTEND_URL=http://localhost:3000
  let adminFrontendUrl = process.env.ADMIN_FRONTEND_URL;

  // If ADMIN_FRONTEND_URL is not set, try to derive from FRONTEND_URL
  if (!adminFrontendUrl) {
    const frontendUrl = process.env.FRONTEND_URL || '';

    // If FRONTEND_URL contains backend paths like /server or /api, remove them
    if (frontendUrl.includes('/server')) {
      adminFrontendUrl = frontendUrl.replace(/\/server.*$/, '') + '/admin';
    } else if (frontendUrl.includes('/api')) {
      adminFrontendUrl = frontendUrl.replace(/\/api.*$/, '') + '/admin';
    } else if (frontendUrl) {
      // If it's already a frontend URL, use it as is
      adminFrontendUrl = frontendUrl;
    } else {
      // Default fallback for local development
      adminFrontendUrl = 'http://localhost:3000';
    }
  }

  // Clean up the URL - remove trailing slashes
  adminFrontendUrl = adminFrontendUrl.replace(/\/+$/, '');

  // Construct reset URL (should be: https://appzetoapp.com/dvision/admin/reset-password/{token})
  const resetUrl = `${adminFrontendUrl}/reset-password/${resetToken}`;

  // Log for debugging
  console.log('Admin Frontend URL:', adminFrontendUrl);
  console.log('Reset URL generated:', resetUrl);

  // Email message
  const message = `
    <h2>Password Reset Request</h2>
    <p>You requested a password reset for your Dvision Academy admin account.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>This link will expire in 10 minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
  `;

  try {
    await sendEmail({
      to: admin.email,
      subject: 'Password Reset Request - Dvision Academy',
      html: message
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Email send error:', error);

    // Reset token fields if email fails
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;
    await admin.save();

    throw new ErrorResponse('Email could not be sent', 500);
  }
});

// @desc    Reset password
// @route   PUT /api/admin/reset-password/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
  const { resettoken } = req.params;
  const { password } = req.body;

  if (!password) {
    throw new ErrorResponse('Please provide a new password', 400);
  }

  if (password.length < 6) {
    throw new ErrorResponse('Password must be at least 6 characters', 400);
  }

  // Hash the reset token to compare with stored token
  const hashedToken = crypto
    .createHash('sha256')
    .update(resettoken)
    .digest('hex');

  // Find admin with matching token and check expiry
  const admin = await Admin.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!admin) {
    throw new ErrorResponse('Invalid or expired reset token', 400);
  }

  // Set new password
  admin.password = password;
  admin.resetPasswordToken = undefined;
  admin.resetPasswordExpire = undefined;
  await admin.save();

  const token = generateToken(admin._id, 'admin');

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    data: {
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      token
    }
  });
});

// @desc    Get current admin
// @route   GET /api/admin/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.user.id);

  if (!admin) {
    throw new ErrorResponse('Admin not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }
    }
  });
});

// @desc    Update admin profile
// @route   PUT /api/admin/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  const admin = await Admin.findById(req.user.id);

  if (!admin) {
    throw new ErrorResponse('Admin not found', 404);
  }

  if (name) admin.name = name;

  if (email && email !== admin.email) {
    // Check if email already exists
    const emailExists = await Admin.findOne({ email });
    if (emailExists) {
      throw new ErrorResponse('Email already in use', 400);
    }
    admin.email = email;
  }

  await admin.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    }
  });
});

// @desc    Change password
// @route   PUT /api/admin/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ErrorResponse('Please provide current and new password', 400);
  }

  if (newPassword.length < 6) {
    throw new ErrorResponse('New password must be at least 6 characters', 400);
  }

  const admin = await Admin.findById(req.user.id).select('+password');

  if (!admin) {
    throw new ErrorResponse('Admin not found', 404);
  }

  // Check current password
  const isMatch = await admin.matchPassword(currentPassword);

  if (!isMatch) {
    throw new ErrorResponse('Current password is incorrect', 400);
  }

  // Set new password
  admin.password = newPassword;
  await admin.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

// @desc    Update FCM token
// @route   PUT /api/admin/fcm-token
// @access  Private
exports.updateFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;

  const admin = await Admin.findById(req.user.id);

  if (!admin) {
    throw new ErrorResponse('Admin not found', 404);
  }

  admin.fcmToken = fcmToken;
  await admin.save();

  res.status(200).json({
    success: true,
    message: 'FCM token updated successfully'
  });
});

// @desc    Get all admins
// @route   GET /api/admin
// @access  Private (Only super_admin)
exports.getAllAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find().select('-password');

  res.status(200).json({
    success: true,
    count: admins.length,
    data: {
      admins
    }
  });
});

// @desc    Get dashboard statistics (Admin)
// @route   GET /api/admin/dashboard/statistics
// @access  Private/Admin
exports.getDashboardStatistics = asyncHandler(async (req, res) => {
  const Student = require('../models/Student');
  const Teacher = require('../models/Teacher');
  const Class = require('../models/Class');
  const Subject = require('../models/Subject');
  const Course = require('../models/Course');
  const Quiz = require('../models/Quiz');
  const SubscriptionPlan = require('../models/SubscriptionPlan');
  const Payment = require('../models/Payment');

  // Get all basic statistics in parallel
  const [
    totalStudents,
    activeStudents,
    totalTeachers,
    activeTeachers,
    totalClasses,
    activeClasses,
    totalSubjects,
    totalCourses,
    totalQuizzes,
    totalSubscriptions,
    totalPayments
  ] = await Promise.all([
    Student.countDocuments({}),
    Student.countDocuments({ isActive: true }),
    Teacher.countDocuments({}),
    Teacher.countDocuments({ isActive: true }),
    Class.countDocuments({}),
    Class.countDocuments({ isActive: true }),
    Subject.countDocuments({}),
    Course.countDocuments({}),
    Quiz.countDocuments({}),
    SubscriptionPlan.countDocuments({}),
    Payment.countDocuments({ status: 'completed' })
  ]);

  // Count students with active subscriptions
  const now = new Date();
  const activeSubscriptions = await Student.countDocuments({
    $or: [
      { 'subscription.status': 'active' },
      {
        activeSubscriptions: {
          $elemMatch: {
            endDate: { $gte: now }
          }
        }
      }
    ]
  });

  // Calculate Total Revenue
  const allCompletedPayments = await Payment.find({ status: 'completed' }).select('amount');
  const totalRevenue = allCompletedPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Get Monthly Revenue Trend (Last 6 Months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1); // Start of the month 6 months ago

  const revenueAggregation = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        total: { $sum: "$amount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Format revenue data for charts
  const revenueData = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setDate(1); // Set to 1st of month to avoid issues with 31st dates
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    const found = revenueAggregation.find(r => r._id.year === year && r._id.month === (d.getMonth() + 1));
    revenueData.push({
      name: month,
      revenue: found ? found.total : 0
    });
  }

  // Get Monthly Student Registration Trend (Last 6 Months)
  const studentAggregation = await Student.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Format student data for charts
  const studentData = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setDate(1); // Set to 1st of month to avoid issues with 31st dates
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    const found = studentAggregation.find(r => r._id.year === year && r._id.month === (d.getMonth() + 1));
    studentData.push({
      name: month,
      students: found ? found.count : 0
    });
  }

  // Get Recent Transactions (Last 5)
  const recentTransactions = await Payment.find({ status: 'completed', paymentMethod: { $ne: 'manual' } })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('studentId', 'name')
    .populate('subscriptionPlanId', 'name');

  const formattedTransactions = recentTransactions.map(tx => ({
    id: tx._id,
    studentName: tx.studentId?.name || 'Unknown',
    planName: tx.subscriptionPlanId?.name || 'Unknown',
    amount: tx.amount,
    date: tx.createdAt,
    status: tx.status
  }));

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        // Overview section
        totalStudents,
        activeStudents,
        totalTeachers,
        activeTeachers,
        totalClasses,
        activeClasses,
        activeSubscriptions,
        totalSubscriptions,
        totalRevenue,
        totalPayments,
        // Content overview section
        totalSubjects,
        totalCourses,
        totalQuizzes,
        // Chart data
        revenueData,
        studentData,
        // Recent activity
        recentTransactions: formattedTransactions
      }
    }
  });
});

// @desc    Get subscription history (Admin)
// @route   GET /api/admin/subscription-history
// @access  Private/Admin
exports.getSubscriptionHistory = asyncHandler(async (req, res) => {
  const Payment = require('../models/Payment');
  const { page = 1, limit = 10, search, status, type } = req.query;

  const query = {};

  // Default filter
  const pipeline = [];

  // 1. Initial Match (Status)
  if (status && status !== 'all') {
    pipeline.push({ $match: { status: status } });
  } else if (!status) {
    // Default to show completed if no status specified
    pipeline.push({ $match: { status: 'completed' } });
  }

  // 2. Lookup Student
  pipeline.push({
    $lookup: {
      from: 'students',
      localField: 'studentId',
      foreignField: '_id',
      as: 'student'
    }
  });
  pipeline.push({ $unwind: { path: '$student', preserveNullAndEmptyArrays: true } });

  // 3. Lookup Plan
  pipeline.push({
    $lookup: {
      from: 'subscriptionplans',
      localField: 'subscriptionPlanId',
      foreignField: '_id',
      as: 'plan'
    }
  });
  pipeline.push({ $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } });

  // 4. Apply Search (Name, Phone, Plan Name, Payment IDs)
  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    pipeline.push({
      $match: {
        $or: [
          { 'student.name': searchRegex },
          { 'student.phone': searchRegex },
          { 'plan.name': searchRegex },
          { cashfreeOrderId: searchRegex }
        ]
      }
    });
  }

  // 5. Apply Plan Type Filter
  if (type) {
    pipeline.push({
      $match: {
        'plan.type': type
      }
    });
  }

  // 6. Pagination & Sort
  const sortStage = { $sort: { createdAt: -1 } };

  // Count Total
  const countPipeline = [...pipeline, { $count: 'total' }];

  // Execute Queries
  const [totalResult, results] = await Promise.all([
    Payment.aggregate(countPipeline),
    Payment.aggregate([
      ...pipeline,
      sortStage,
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 1,
          amount: 1,
          status: 1,
          createdAt: 1,
          subscriptionStartDate: 1,
          subscriptionEndDate: 1,
          cashfreeOrderId: 1,
          paymentMethod: 1,
          'student.name': 1,
          'student.phone': 1,
          'student.profileImage': 1,
          'plan.name': 1,
          'plan.type': 1,
          'plan.duration': 1,
          'plan.price': 1
        }
      }
    ])
  ]);

  const total = totalResult.length > 0 ? totalResult[0].total : 0;

  res.status(200).json({
    success: true,
    count: results.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      subscriptions: results
    }
  });
});

