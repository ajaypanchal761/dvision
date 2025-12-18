const SubscriptionPlan = require('../models/SubscriptionPlan');
const Class = require('../models/Class');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all subscription plans
// @route   GET /api/admin/subscription-plans
// @access  Private (Admin)
exports.getAllSubscriptionPlans = asyncHandler(async (req, res, next) => {
  const { board, duration, isActive, type, class: classNumber } = req.query;
  
  // Build query
  const query = {};
  if (type) query.type = type;
  if (board) query.board = board;
  if (duration) query.duration = duration;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  
  // Filter by class number for regular plans
  if (classNumber) {
    const classNum = parseInt(classNumber);
    if (!isNaN(classNum)) {
      query.classes = classNum; // MongoDB will match if classNum is in the classes array
      query.type = 'regular'; // Only regular plans have classes array, so ensure type is regular
    }
  }

  const subscriptionPlans = await SubscriptionPlan.find(query)
    .populate('createdBy', 'name email')
    .populate({
      path: 'classId',
      select: 'name class board type classCode description isActive',
      match: { isActive: { $ne: false } } // Only populate if class exists and is active
    })
    .sort({ createdAt: -1 });
  
  // Log any preparation plans with missing classId
  const prepPlansWithMissingClass = subscriptionPlans.filter(plan => 
    plan.type === 'preparation' && !plan.classId
  );
  
  if (prepPlansWithMissingClass.length > 0) {
    console.warn(`⚠️ Found ${prepPlansWithMissingClass.length} preparation plan(s) with missing classId:`, 
      prepPlansWithMissingClass.map(p => ({ id: p._id, name: p.name }))
    );
  }

  res.status(200).json({
    success: true,
    count: subscriptionPlans.length,
    data: {
      subscriptionPlans,
      plans: subscriptionPlans // Also include 'plans' for backward compatibility
    }
  });
});

// @desc    Get single subscription plan
// @route   GET /api/admin/subscription-plans/:id
// @access  Private (Admin)
exports.getSubscriptionPlan = asyncHandler(async (req, res, next) => {
  const subscriptionPlan = await SubscriptionPlan.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('classId', 'name class board type classCode');

  if (!subscriptionPlan) {
    return next(new ErrorResponse(`Subscription plan not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: {
      subscriptionPlan
    }
  });
});

// @desc    Get classes by board (for creating subscription plans)
// @route   GET /api/admin/subscription-plans/classes/:board
// @access  Private (Admin)
exports.getClassesByBoard = asyncHandler(async (req, res, next) => {
  const { board } = req.params;
  
  if (!['CBSE', 'RBSE'].includes(board)) {
    return next(new ErrorResponse('Invalid board. Must be CBSE or RBSE', 400));
  }

  // Get all regular classes for this board
  const allClasses = await Class.find({ 
    board: board,
    type: 'regular',
    isActive: true 
  })
    .select('_id class board classCode')
    .sort({ class: 1 });

  // Get all existing subscription plans for this board (regular type only)
  const existingPlans = await SubscriptionPlan.find({
    board: board,
    type: 'regular'
  }).select('classes duration');

  // Track which durations exist for each class
  // Structure: { classNum: Set(['monthly', 'quarterly', 'yearly']) }
  const classDurations = {};
  
  existingPlans.forEach(plan => {
    if (plan.classes && Array.isArray(plan.classes) && plan.duration) {
      plan.classes.forEach(classNum => {
        if (!classDurations[classNum]) {
          classDurations[classNum] = new Set();
        }
        classDurations[classNum].add(plan.duration);
      });
    }
  });

  // Filter classes: only exclude if class has all 5 durations (monthly, quarterly, half_yearly, yearly, demo)
  const allDurations = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'demo'];
  const availableClasses = allClasses.map(classItem => {
    const classNum = classItem.class;
    const existingDurations = classDurations[classNum] || new Set();
    
    // Check if class has all 3 durations
    const hasAllDurations = allDurations.every(dur => existingDurations.has(dur));
    
    // If class has all durations, exclude it
    if (hasAllDurations) {
      return null;
    }
    
    // Calculate missing durations
    const missingDurations = allDurations.filter(dur => !existingDurations.has(dur));
    
    return {
      ...classItem.toObject(),
      missingDurations: missingDurations
    };
  }).filter(classItem => classItem !== null);

  res.status(200).json({
    success: true,
    count: availableClasses.length,
    data: {
      classes: availableClasses
    }
  });
});

// @desc    Get preparation classes (for creating subscription plans)
// @route   GET /api/admin/subscription-plans/preparation-classes
// @access  Private (Admin)
exports.getPreparationClasses = asyncHandler(async (req, res, next) => {
  // Get all preparation classes
  const allClasses = await Class.find({ 
    type: 'preparation',
    isActive: true 
  })
    .select('_id name classCode description type')
    .sort({ name: 1 });

  // Get all existing subscription plans for preparation classes
  const existingPlans = await SubscriptionPlan.find({
    type: 'preparation'
  }).select('classId duration');

  // Track which durations exist for each preparation class
  // Structure: { classId: Set(['monthly', 'quarterly', 'yearly']) }
  const classDurations = {};
  
  existingPlans.forEach(plan => {
    if (plan.classId && plan.duration) {
      const classIdStr = plan.classId.toString();
      if (!classDurations[classIdStr]) {
        classDurations[classIdStr] = new Set();
      }
      classDurations[classIdStr].add(plan.duration);
    }
  });

  // Filter classes: only exclude if class has all 5 durations
  const allDurations = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'demo'];
  const availableClasses = allClasses.map(classItem => {
    const classIdStr = classItem._id.toString();
    const existingDurations = classDurations[classIdStr] || new Set();
    
    // Check if class has all 3 durations
    const hasAllDurations = allDurations.every(dur => existingDurations.has(dur));
    
    // If class has all durations, exclude it
    if (hasAllDurations) {
      return null;
    }
    
    // Calculate missing durations
    const missingDurations = allDurations.filter(dur => !existingDurations.has(dur));
    
    return {
      ...classItem.toObject(),
      missingDurations: missingDurations
    };
  }).filter(classItem => classItem !== null);

  res.status(200).json({
    success: true,
    count: availableClasses.length,
    data: {
      classes: availableClasses
    }
  });
});

// @desc    Create subscription plan
// @route   POST /api/admin/subscription-plans
// @access  Private (Admin)
exports.createSubscriptionPlan = asyncHandler(async (req, res, next) => {
  const { type, name, board, classes, classId, duration, price, originalPrice, description, features, isActive, validityDays } = req.body;

  const planType = type || 'regular';

  // Validate duration
  if (!duration || !['monthly', 'quarterly', 'half_yearly', 'yearly', 'demo'].includes(duration)) {
    return next(new ErrorResponse('Invalid duration. Must be monthly, quarterly, half_yearly, yearly, or demo', 400));
  }

  // For demo plans, validate validityDays
  if (duration === 'demo') {
    const { validityDays } = req.body;
    if (!validityDays || !Number.isInteger(validityDays) || validityDays < 1) {
      return next(new ErrorResponse('For demo plans, please provide validityDays (must be a positive integer)', 400));
    }
  }

  // Validate required fields based on type
  // For demo plans, price is optional (can be 0 or free)
  if (!name) {
    return next(new ErrorResponse('Please provide plan name', 400));
  }
  
  // Price is required for all plans except demo (demo can be free/0)
  if (duration !== 'demo' && price === undefined) {
    return next(new ErrorResponse('Please provide price', 400));
  }

  let planData = {
    type: planType,
    name,
    duration,
    price: duration === 'demo' ? (price !== undefined ? price : 0) : price,
    originalPrice: originalPrice || (duration === 'demo' ? (price !== undefined ? price : 0) : price),
    description: description || '',
    features: features || [],
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.user._id
  };

  // Add validityDays for demo plans
  if (duration === 'demo') {
    planData.validityDays = validityDays;
  }

  if (planType === 'regular') {
    // Validate regular plan fields
    if (!board || !classes || !Array.isArray(classes) || classes.length === 0) {
      return next(new ErrorResponse('Please provide board and classes for regular plan', 400));
    }

    if (!['CBSE', 'RBSE'].includes(board)) {
      return next(new ErrorResponse('Invalid board. Must be CBSE or RBSE', 400));
    }

    // Validate classes (should be numbers between 1-12)
    const validClasses = classes.filter(c => Number.isInteger(c) && c >= 1 && c <= 12);
    if (validClasses.length === 0) {
      return next(new ErrorResponse('Please provide valid classes (numbers between 1-12)', 400));
    }

    // Check if classes exist for the given board
    const existingClasses = await Class.find({
      board: board,
      type: 'regular',
      class: { $in: validClasses },
      isActive: true
    });

    if (existingClasses.length !== validClasses.length) {
      return next(new ErrorResponse('Some classes do not exist for the selected board', 400));
    }

    // Check if the specific duration already exists for any of the selected classes
    const existingPlans = await SubscriptionPlan.find({
      board: board,
      type: 'regular',
      duration: duration
    }).select('classes duration');

    // Check if any selected class already has a plan with this specific duration
    const conflictingClasses = [];
    existingPlans.forEach(plan => {
      if (plan.classes && Array.isArray(plan.classes)) {
        plan.classes.forEach(classNum => {
          if (validClasses.includes(classNum) && !conflictingClasses.includes(classNum)) {
            conflictingClasses.push(classNum);
          }
        });
      }
    });

    if (conflictingClasses.length > 0) {
      return next(new ErrorResponse(
        `${duration.charAt(0).toUpperCase() + duration.slice(1)} subscription plan already exists for Class ${conflictingClasses.join(', ')}. Please update the existing plan instead of creating a new one.`,
        400
      ));
    }

    planData.board = board;
    planData.classes = validClasses;
  } else {
    // Validate preparation plan fields
    if (!classId) {
      return next(new ErrorResponse('Please provide classId for preparation plan', 400));
    }

    // Check if preparation class exists
    const prepClass = await Class.findById(classId);
    if (!prepClass || prepClass.type !== 'preparation' || !prepClass.isActive) {
      return next(new ErrorResponse('Invalid or inactive preparation class', 400));
    }

    // Check if the specific duration already exists for this preparation class
    const existingPlan = await SubscriptionPlan.findOne({
      classId: classId,
      type: 'preparation',
      duration: duration
    });

    if (existingPlan) {
      return next(new ErrorResponse(
        `${duration.charAt(0).toUpperCase() + duration.slice(1)} subscription plan already exists for ${prepClass.name}. Please update the existing plan instead of creating a new one.`,
        400
      ));
    }

    planData.classId = classId;
  }

  // Create subscription plan
  const subscriptionPlan = await SubscriptionPlan.create(planData);

  const populatedPlan = await SubscriptionPlan.findById(subscriptionPlan._id)
    .populate('createdBy', 'name email')
    .populate('classId', 'name class board type classCode');

  res.status(201).json({
    success: true,
    data: {
      subscriptionPlan: populatedPlan
    }
  });
});

// @desc    Update subscription plan
// @route   PUT /api/admin/subscription-plans/:id
// @access  Private (Admin)
exports.updateSubscriptionPlan = asyncHandler(async (req, res, next) => {
  let subscriptionPlan = await SubscriptionPlan.findById(req.params.id);

  if (!subscriptionPlan) {
    return next(new ErrorResponse(`Subscription plan not found with id of ${req.params.id}`, 404));
  }

  const { type, name, board, classes, classId, duration, price, originalPrice, description, features, isActive, validityDays } = req.body;
  const planType = type || subscriptionPlan.type;

  // Validate duration if provided
  if (duration && !['monthly', 'quarterly', 'half_yearly', 'yearly', 'demo'].includes(duration)) {
    return next(new ErrorResponse('Invalid duration. Must be monthly, quarterly, half_yearly, yearly, or demo', 400));
  }

  // For demo plans, validate validityDays
  if (duration === 'demo') {
    const { validityDays } = req.body;
    if (!validityDays || !Number.isInteger(validityDays) || validityDays < 1) {
      return next(new ErrorResponse('For demo plans, please provide validityDays (must be a positive integer)', 400));
    }
  }

  // Update type if provided
  if (type && type !== subscriptionPlan.type) {
    subscriptionPlan.type = planType;
    // Clear fields based on type
    if (planType === 'regular') {
      subscriptionPlan.classId = undefined;
    } else {
      subscriptionPlan.board = undefined;
      subscriptionPlan.classes = undefined;
    }
  }

  if (planType === 'regular') {
    // Validate board if provided
    if (board && !['CBSE', 'RBSE'].includes(board)) {
      return next(new ErrorResponse('Invalid board. Must be CBSE or RBSE', 400));
    }

    // Validate classes if provided
    if (classes && Array.isArray(classes)) {
      const validClasses = classes.filter(c => Number.isInteger(c) && c >= 1 && c <= 12);
      if (validClasses.length === 0) {
        return next(new ErrorResponse('Please provide valid classes (numbers between 1-12)', 400));
      }

      // Check if classes exist for the given board
      const boardToCheck = board || subscriptionPlan.board;
      const existingClasses = await Class.find({
        board: boardToCheck,
        type: 'regular',
        class: { $in: validClasses },
        isActive: true
      });

      if (existingClasses.length !== validClasses.length) {
        return next(new ErrorResponse('Some classes do not exist for the selected board', 400));
      }

      subscriptionPlan.classes = validClasses;
    }

    // Update regular plan fields
    if (name !== undefined) subscriptionPlan.name = name;
    if (board !== undefined) subscriptionPlan.board = board;
    if (duration !== undefined) subscriptionPlan.duration = duration;
    if (price !== undefined) {
      // For demo plans, if price is not provided or is 0, set to 0
      subscriptionPlan.price = (duration === 'demo' && (price === undefined || price === null || price === '')) ? 0 : price;
    }
    if (originalPrice !== undefined) {
      subscriptionPlan.originalPrice = originalPrice;
    } else if (duration === 'demo' && price !== undefined) {
      // If originalPrice not provided for demo, use price (or 0)
      subscriptionPlan.originalPrice = (price === undefined || price === null || price === '') ? 0 : price;
    }
    if (description !== undefined) subscriptionPlan.description = description;
    if (features !== undefined) subscriptionPlan.features = features;
    if (isActive !== undefined) subscriptionPlan.isActive = isActive;
  } else {
    // Validate preparation plan fields
    if (classId) {
      const prepClass = await Class.findById(classId);
      if (!prepClass || prepClass.type !== 'preparation' || !prepClass.isActive) {
        return next(new ErrorResponse('Invalid or inactive preparation class', 400));
      }
      subscriptionPlan.classId = classId;
    }

    // Update preparation plan fields
    if (name !== undefined) subscriptionPlan.name = name;
    if (duration !== undefined) subscriptionPlan.duration = duration;
    if (price !== undefined) {
      // For demo plans, if price is not provided or is 0, set to 0
      subscriptionPlan.price = (duration === 'demo' && (price === undefined || price === null || price === '')) ? 0 : price;
    }
    if (originalPrice !== undefined) {
      subscriptionPlan.originalPrice = originalPrice;
    } else if (duration === 'demo' && price !== undefined) {
      // If originalPrice not provided for demo, use price (or 0)
      subscriptionPlan.originalPrice = (price === undefined || price === null || price === '') ? 0 : price;
    }
    if (description !== undefined) subscriptionPlan.description = description;
    if (features !== undefined) subscriptionPlan.features = features;
    if (isActive !== undefined) subscriptionPlan.isActive = isActive;
    
    // Update validityDays for demo plans
    if (duration === 'demo' && validityDays !== undefined) {
      if (!Number.isInteger(validityDays) || validityDays < 1) {
        return next(new ErrorResponse('validityDays must be a positive integer', 400));
      }
      subscriptionPlan.validityDays = validityDays;
    } else if (duration !== 'demo' && duration !== undefined) {
      // Clear validityDays if changing from demo to another duration
      subscriptionPlan.validityDays = undefined;
    }
  }
  
  // Also handle validityDays for regular plans
  if (planType === 'regular') {
    if (duration === 'demo' && validityDays !== undefined) {
      if (!Number.isInteger(validityDays) || validityDays < 1) {
        return next(new ErrorResponse('validityDays must be a positive integer', 400));
      }
      subscriptionPlan.validityDays = validityDays;
    } else if (duration !== 'demo' && duration !== undefined) {
      // Clear validityDays if changing from demo to another duration
      subscriptionPlan.validityDays = undefined;
    }
  }

  await subscriptionPlan.save();

  const populatedPlan = await SubscriptionPlan.findById(subscriptionPlan._id)
    .populate('createdBy', 'name email')
    .populate('classId', 'name class board type classCode');

  res.status(200).json({
    success: true,
    data: {
      subscriptionPlan: populatedPlan
    }
  });
});

// @desc    Delete subscription plan
// @route   DELETE /api/admin/subscription-plans/:id
// @access  Private (Admin)
exports.deleteSubscriptionPlan = asyncHandler(async (req, res, next) => {
  const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);

  if (!subscriptionPlan) {
    return next(new ErrorResponse(`Subscription plan not found with id of ${req.params.id}`, 404));
  }

  await subscriptionPlan.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get public subscription plans (for students)
// @route   GET /api/subscription-plans
// @access  Public (optionally protected for student)
exports.getPublicSubscriptionPlans = asyncHandler(async (req, res, next) => {
  const { board, class: studentClass } = req.query;
  const Student = require('../models/Student');
  const Payment = require('../models/Payment');
  
  console.log('GET_PUBLIC_SUBSCRIPTION_PLANS:', { board, studentClass });
  
  // Get student's active subscriptions if authenticated (optional)
  let studentActiveSubs = [];
  let student = null;
  const now = new Date();
  
  // Try to get student if token is provided (optional auth)
  try {
    if (req.headers.authorization || req.cookies?.token || req.headers['x-auth-token']) {
      const jwt = require('jsonwebtoken');
      const token = req.headers.authorization?.replace('Bearer ', '') || 
                   req.cookies?.token || 
                   req.headers['x-auth-token'];
      
      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role === 'student') {
          student = await Student.findById(decoded.id);
        }
      }
    }
  } catch (err) {
    // Ignore auth errors - route is public
    console.log('Optional auth check failed (expected for public route):', err.message);
  }
  
  if (student) {
      // Get from activeSubscriptions array
      const activeSubsFromArray = (student.activeSubscriptions || []).filter(sub => 
        new Date(sub.endDate) >= now
      );
      
      // Also get from payments
      const activePayments = await Payment.find({
        studentId: student._id,
        status: 'completed',
        subscriptionEndDate: { $gte: now }
      })
        .populate('subscriptionPlanId', 'type board classes classId')
        .select('subscriptionPlanId subscriptionEndDate');
      
      // Combine both sources
      studentActiveSubs = [
        ...activeSubsFromArray.map(sub => ({
          type: sub.type,
          board: sub.board,
          class: sub.class,
          classId: sub.classId,
          endDate: sub.endDate
        })),
        ...activePayments.map(payment => ({
          type: payment.subscriptionPlanId?.type,
          board: payment.subscriptionPlanId?.board,
          class: payment.subscriptionPlanId?.classes?.[0],
          classId: payment.subscriptionPlanId?.classId,
          endDate: payment.subscriptionEndDate
        }))
      ];
  }
  
  // Build query for regular plans - MUST match student's board AND class
  let regularPlans = [];
  
  // Board and class are required for regular plans
  if (board && studentClass) {
    const classNum = parseInt(studentClass);
    if (!isNaN(classNum)) {
      const regularQuery = { 
        isActive: true,
        type: 'regular',
        board: board,
        classes: { $in: [classNum] }, // Check if the student's class is in the plan's classes array
        duration: { $ne: 'demo' } // Exclude demo plans from student view
      };
      
      console.log('Regular Query:', regularQuery);
      regularPlans = await SubscriptionPlan.find(regularQuery)
        .select('name board classes duration price originalPrice description features type')
        .sort({ board: 1, duration: 1, price: 1 });
    } else {
      console.log('Invalid class provided, skipping regular plans');
    }
  } else {
    console.log('Board or class missing, skipping regular plans');
  }

  // Build query for preparation plans (always show all active preparation plans, but exclude demo)
  const preparationQuery = {
    isActive: true,
    type: 'preparation',
    duration: { $ne: 'demo' } // Exclude demo plans from student view
  };

  console.log('Preparation Query:', preparationQuery);

  // Fetch preparation plans
  const preparationPlans = await SubscriptionPlan.find(preparationQuery)
    .populate('classId', 'name description classCode')
    .select('name classId duration price originalPrice description features type')
    .sort({ duration: 1, price: 1 });

  console.log('Regular Plans Found:', regularPlans.length);
  console.log('Preparation Plans Found:', preparationPlans.length);

  // Mark plans as disabled based on active subscriptions
  const plansWithStatus = [...regularPlans, ...preparationPlans].map(plan => {
    const planObj = plan.toObject();
    let isDisabled = false;
    let disabledReason = '';

    if (plan.type === 'regular') {
      // Check if student has active regular subscription for this class
      const hasActiveRegular = studentActiveSubs.some(sub => {
        return sub.type === 'regular' && 
               sub.board === plan.board && 
               plan.classes && 
               plan.classes.includes(sub.class) &&
               new Date(sub.endDate) >= now;
      });
      
      if (hasActiveRegular) {
        isDisabled = true;
        disabledReason = 'You already have an active subscription for this class';
      }
    } else if (plan.type === 'preparation') {
      // Check if student has active prep subscription for this prep class
      const prepClassId = plan.classId?._id || plan.classId;
      if (prepClassId) {
        const hasActivePrep = studentActiveSubs.some(sub => {
          return sub.type === 'preparation' && 
                 sub.classId && 
                 (sub.classId.toString() === prepClassId.toString() || 
                  (sub.classId._id && sub.classId._id.toString() === prepClassId.toString())) &&
                 new Date(sub.endDate) >= now;
        });
        
        if (hasActivePrep) {
          isDisabled = true;
          disabledReason = `You already have an active subscription for ${plan.classId?.name || 'this preparation class'}`;
        }
      }
    }

    return {
      ...planObj,
      isDisabled,
      disabledReason: isDisabled ? disabledReason : undefined
    };
  });

  console.log('Total Plans Returned:', plansWithStatus.length);

  res.status(200).json({
    success: true,
    count: plansWithStatus.length,
    data: {
      subscriptionPlans: plansWithStatus
    }
  });
});

