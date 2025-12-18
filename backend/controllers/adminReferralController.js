const Agent = require('../models/Agent');
const ReferralRecord = require('../models/ReferralRecord');
const Student = require('../models/Student');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create new agent (Admin only)
// @route   POST /api/admin/agents
// @access  Private/Admin
exports.createAgent = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;

  if (!name || !phone) {
    throw new ErrorResponse('Please provide name and phone', 400);
  }

  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    throw new ErrorResponse('Please provide a valid phone number with country code', 400);
  }

  // Check if agent already exists
  const existingAgent = await Agent.findOne({ phone });
  if (existingAgent) {
    throw new ErrorResponse('Agent with this phone number already exists', 400);
  }

  // Create agent with isActive=true by default
  // Note: Bank details and UPI ID can only be added by the agent themselves
  const agent = await Agent.create({
    name,
    phone,
    email: email || undefined,
    isActive: true,
    isPhoneVerified: false // Will be verified on first login
  });

  res.status(201).json({
    success: true,
    message: 'Agent created successfully',
    data: {
      agent: {
        _id: agent._id,
        name: agent.name,
        phone: agent.phone,
        email: agent.email,
        isActive: agent.isActive
      }
    }
  });
});

// @desc    Get all agents with basic stats (Admin)
// @route   GET /api/admin/agents
// @access  Private/Admin
exports.getAllAgents = asyncHandler(async (req, res) => {
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

  const agents = await Agent.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get stats for each agent
  const agentsWithStats = await Promise.all(
    agents.map(async (agent) => {
      const totalReferrals = await Student.countDocuments({
        referralAgentId: agent._id
      });

      const successfulSubscriptions = await ReferralRecord.countDocuments({
        agentId: agent._id,
        status: 'completed'
      });

      return {
        ...agent.toObject(),
        stats: {
          totalReferrals,
          successfulSubscriptions
        }
      };
    })
  );

  const total = await Agent.countDocuments(query);

  res.status(200).json({
    success: true,
    count: agentsWithStats.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      agents: agentsWithStats
    }
  });
});

// @desc    Get single agent with full statistics (Admin)
// @route   GET /api/admin/agents/:id
// @access  Private/Admin
exports.getAgentById = asyncHandler(async (req, res) => {
  const agent = await Agent.findById(req.params.id);

  if (!agent) {
    throw new ErrorResponse('Agent not found', 404);
  }

  // Get full statistics
  const totalReferrals = await Student.countDocuments({
    referralAgentId: agent._id
  });

  const successfulSubscriptions = await ReferralRecord.countDocuments({
    agentId: agent._id,
    status: 'completed'
  });

  const paidReferrals = await ReferralRecord.countDocuments({
    agentId: agent._id,
    status: 'paid'
  });

  const pendingCommissions = await ReferralRecord.countDocuments({
    agentId: agent._id,
    status: 'completed'
  });

  // Get total amount from completed referrals
  const totalAmountResult = await ReferralRecord.aggregate([
    {
      $match: {
        agentId: agent._id,
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

  res.status(200).json({
    success: true,
    data: {
      agent: {
        ...agent.toObject(),
        statistics: {
          totalReferrals,
          successfulSubscriptions,
          paidReferrals,
          pendingCommissions,
          totalAmount
        }
      }
    }
  });
});

// @desc    Update agent (Admin)
// @route   PUT /api/admin/agents/:id
// @access  Private/Admin
exports.updateAgent = asyncHandler(async (req, res) => {
  const { name, phone, email, isActive } = req.body;

  const agent = await Agent.findById(req.params.id);

  if (!agent) {
    throw new ErrorResponse('Agent not found', 404);
  }

  if (name !== undefined) {
    agent.name = name;
  }

  if (phone !== undefined) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new ErrorResponse('Please provide a valid phone number with country code', 400);
    }

    // Check if phone is already taken by another agent
    const existingAgent = await Agent.findOne({ phone, _id: { $ne: agent._id } });
    if (existingAgent) {
      throw new ErrorResponse('Phone number already in use by another agent', 400);
    }

    agent.phone = phone;
  }

  if (email !== undefined) {
    agent.email = email;
  }

  if (isActive !== undefined) {
    agent.isActive = isActive;
  }

  // Note: Bank details and UPI ID can only be updated by the agent themselves, not by admin

  await agent.save();

  res.status(200).json({
    success: true,
    message: 'Agent updated successfully',
    data: {
      agent
    }
  });
});

// @desc    Delete/deactivate agent (Admin)
// @route   DELETE /api/admin/agents/:id
// @access  Private/Admin
exports.deleteAgent = asyncHandler(async (req, res) => {
  const agent = await Agent.findById(req.params.id);

  if (!agent) {
    throw new ErrorResponse('Agent not found', 404);
  }

  // Soft delete - set isActive to false
  agent.isActive = false;
  await agent.save();

  res.status(200).json({
    success: true,
    message: 'Agent deactivated successfully',
    data: {}
  });
});

// @desc    Get month-wise referral data for specific agent (Admin)
// @route   GET /api/admin/agents/:id/referrals
// @access  Private/Admin
exports.getAgentReferrals = asyncHandler(async (req, res) => {
  const { month, year, status } = req.query;
  const agentId = req.params.id;

  const agent = await Agent.findById(agentId);
  if (!agent) {
    throw new ErrorResponse('Agent not found', 404);
  }

  const query = { agentId };

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by month/year
  if (month && year) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    query.subscriptionDate = { $gte: startDate, $lte: endDate };
  }

  const referrals = await ReferralRecord.find(query)
    .populate('studentId', 'name phone email')
    .populate('subscriptionPlanId', 'name')
    .populate('paymentId', 'amount status')
    .sort({ subscriptionDate: -1 });

  // Get month-wise breakdown
  const monthWiseBreakdown = await ReferralRecord.aggregate([
    {
      $match: { agentId }
    },
    {
      $group: {
        _id: {
          year: { $year: '$subscriptionDate' },
          month: { $month: '$subscriptionDate' }
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        paid: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
        }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      agent: {
        _id: agent._id,
        name: agent.name,
        phone: agent.phone
      },
      referrals,
      monthWiseBreakdown: monthWiseBreakdown.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        count: item.count,
        totalAmount: item.totalAmount,
        completed: item.completed,
        paid: item.paid
      }))
    }
  });
});

// @desc    Get all referrals with filters (Admin)
// @route   GET /api/admin/referrals
// @access  Private/Admin
exports.getAllReferrals = asyncHandler(async (req, res) => {
  const { agentId, month, year, status, page = 1, limit = 20 } = req.query;

  const query = {};

  if (agentId) {
    query.agentId = agentId;
  }

  if (status) {
    query.status = status;
  }

  if (month && year) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    query.subscriptionDate = { $gte: startDate, $lte: endDate };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const referrals = await ReferralRecord.find(query)
    .populate('agentId', 'name phone')
    .populate('studentId', 'name phone email')
    .populate('subscriptionPlanId', 'name')
    .populate('paymentId', 'amount status')
    .sort({ subscriptionDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await ReferralRecord.countDocuments(query);

  res.status(200).json({
    success: true,
    count: referrals.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      referrals
    }
  });
});

// @desc    Update referral status (Admin)
// @route   PUT /api/admin/referrals/:id/status
// @access  Private/Admin
exports.updateReferralStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !['pending', 'completed', 'paid'].includes(status)) {
    throw new ErrorResponse('Please provide a valid status (pending, completed, or paid)', 400);
  }

  const referral = await ReferralRecord.findById(req.params.id);

  if (!referral) {
    throw new ErrorResponse('Referral record not found', 404);
  }

  referral.status = status;
  await referral.save();

  res.status(200).json({
    success: true,
    message: 'Referral status updated successfully',
    data: {
      referral
    }
  });
});

// @desc    Get aggregate referral statistics (Admin)
// @route   GET /api/admin/referrals/statistics
// @access  Private/Admin
exports.getReferralStatistics = asyncHandler(async (req, res) => {
  const { month, year } = req.query;

  const matchQuery = {};

  if (month && year) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    matchQuery.subscriptionDate = { $gte: startDate, $lte: endDate };
  }

  // Total referrals
  const totalReferrals = await ReferralRecord.countDocuments(matchQuery);

  // Total amount
  const totalAmountResult = await ReferralRecord.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

  // Status breakdown
  const statusBreakdown = await ReferralRecord.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  // Top agents
  const topAgents = await ReferralRecord.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$agentId',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  // Populate agent names
  const topAgentsWithNames = await Promise.all(
    topAgents.map(async (item) => {
      const agent = await Agent.findById(item._id);
      return {
        agentId: item._id,
        agentName: agent ? agent.name : 'Unknown',
        count: item.count,
        totalAmount: item.totalAmount
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      totalReferrals,
      totalAmount,
      statusBreakdown,
      topAgents: topAgentsWithNames
    }
  });
});



