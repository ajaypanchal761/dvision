const cashfree = require('../config/cashfree');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Class = require('../models/Class');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const crypto = require('crypto');

// @desc    Create Cashfree order for subscription
// @route   POST /api/payment/create-order
// @access  Private (Student)
exports.createOrder = asyncHandler(async (req, res, next) => {
  // Check if user is a student
  if (req.userRole !== 'student') {
    return next(new ErrorResponse('Only students can create payment orders', 403));
  }

  const { planId } = req.body;
  const studentId = req.user._id;

  if (!planId) {
    return next(new ErrorResponse('Please provide a subscription plan ID', 400));
  }

  // Get subscription plan (populate classId for preparation plans)
  console.log('=== CREATE ORDER DEBUG ===');
  console.log('Plan ID:', planId);
  console.log('Student ID:', studentId);

  let plan = await SubscriptionPlan.findById(planId).populate('classId', 'name description classCode type isActive');

  console.log('Plan found:', plan ? 'Yes' : 'No');
  if (plan) {
    console.log('Plan type:', plan.type);
    console.log('Plan name:', plan.name);
    console.log('Plan isActive:', plan.isActive);
    console.log('Plan classId (raw):', plan.classId);
    console.log('Plan classId (populated):', plan.classId ? {
      _id: plan.classId._id,
      name: plan.classId.name,
      type: plan.classId.type
    } : 'null');

    // If prep plan and classId not populated, try to populate it
    if (plan.type === 'preparation' && !plan.classId) {
      const planRaw = await SubscriptionPlan.findById(planId).select('classId').lean();
      if (planRaw && planRaw.classId) {
        const prepClass = await Class.findById(planRaw.classId).select('name description classCode type isActive');
        if (prepClass) {
          plan.classId = prepClass;
          console.log('Manually populated classId:', prepClass.name);
        }
      }
    }
  }

  if (!plan) {
    return next(new ErrorResponse('Subscription plan not found', 404));
  }

  if (!plan.isActive) {
    return next(new ErrorResponse('This subscription plan is not available', 400));
  }

  // Get student
  const student = await Student.findById(studentId);

  // Validate plan based on type
  if (plan.type === 'regular') {
    // For regular plans, check board and class match
    if (student.board !== plan.board) {
      return next(new ErrorResponse('This plan is not available for your board', 400));
    }

    if (!plan.classes || !plan.classes.includes(student.class)) {
      return next(new ErrorResponse('This plan is not available for your class', 400));
    }
  } else if (plan.type === 'preparation') {
    // For preparation plans, any student can subscribe (no board/class restriction)
    // Check if classId exists in database (even if populate failed)
    let classIdValue = plan.classId;

    // If populated classId is null, check raw database value
    if (!classIdValue) {
      const planRaw = await SubscriptionPlan.findById(planId).select('classId').lean();
      classIdValue = planRaw?.classId;
      console.log('Plan classId from raw query:', classIdValue);
    }

    // If classId exists but wasn't populated, populate it now
    if (classIdValue && (!plan.classId || typeof plan.classId === 'string' || plan.classId instanceof mongoose.Types.ObjectId)) {
      try {
        const prepClass = await Class.findById(classIdValue);
        if (prepClass) {
          if (prepClass.type !== 'preparation') {
            console.warn('⚠️ Class is not a preparation class:', {
              classId: prepClass._id,
              classType: prepClass.type
            });
            // Don't block payment, just log warning
          } else {
            // Replace the classId with populated object for later use
            plan.classId = prepClass;
          }
        } else {
          console.warn('⚠️ Preparation class not found in database:', classIdValue);
          console.warn('⚠️ Plan will proceed without class validation. Plan ID:', plan._id);
          // Don't block payment, just log warning - allow payment to proceed
        }
      } catch (err) {
        console.warn('⚠️ Error fetching preparation class:', err.message);
        // Don't block payment, just log warning
      }
    } else if (plan.classId && (!plan.classId.type || plan.classId.type !== 'preparation')) {
      // If populated but wrong type - just log warning, don't block
      console.warn('⚠️ Preparation plan has invalid classId type:', {
        planId: plan._id,
        classId: plan.classId._id,
        classType: plan.classId.type
      });
    }

    // If no classId at all, log warning but allow payment to proceed
    if (!classIdValue) {
      console.warn('⚠️ PREPARATION PLAN WARNING: Missing classId in database');
      console.warn('⚠️ Plan details:', {
        planId: plan._id,
        planName: plan.name,
        planType: plan.type
      });
      console.warn('⚠️ Payment will proceed, but plan should be fixed in admin panel');
      // Don't block payment - allow it to proceed
    }
  }

  console.log('=== PLAN VALIDATION PASSED ===');

  // Check if student already has an active subscription that conflicts
  const now = new Date();

  // Get all active subscriptions from activeSubscriptions array
  const activeSubs = (student.activeSubscriptions || []).filter(sub => {
    return new Date(sub.endDate) >= now;
  });

  // Also check Payment records for active subscriptions
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
        select: '_id name'
      }
    });

  if (plan.type === 'regular') {
    // For regular plans: Only one active subscription per class allowed
    // Check if student has any active regular subscription
    const hasActiveRegular = activeSubs.some(sub => {
      return sub.type === 'regular' &&
        sub.board === plan.board &&
        plan.classes &&
        plan.classes.includes(sub.class);
    });

    // Also check Payment records
    const hasActiveRegularFromPayments = activePayments.some(payment => {
      return payment.subscriptionPlanId &&
        payment.subscriptionPlanId.type === 'regular' &&
        payment.subscriptionPlanId.board === plan.board &&
        payment.subscriptionPlanId.classes &&
        plan.classes &&
        payment.subscriptionPlanId.classes.some(c => plan.classes.includes(c));
    });

    // Also check legacy subscription field
    const legacyActive = student.subscription &&
      student.subscription.status === 'active' &&
      new Date(student.subscription.endDate) >= now;

    if (hasActiveRegular || hasActiveRegularFromPayments || legacyActive) {
      return next(new ErrorResponse(
        `You already have an active subscription for ${plan.board} Class ${plan.classes?.join(', ')}. Please wait until your current subscription expires before subscribing to another plan for the same class.`,
        400
      ));
    }
  } else if (plan.type === 'preparation') {
    // For preparation plans: Only one active subscription per prep class allowed
    // Get prep class ID - handle both populated object and ObjectId
    let prepClassId = null;
    if (plan.classId) {
      prepClassId = plan.classId._id ? plan.classId._id.toString() : plan.classId.toString();
    } else {
      // If not populated, fetch it from the plan
      const planDoc = await SubscriptionPlan.findById(planId).select('classId').lean();
      if (planDoc && planDoc.classId) {
        prepClassId = planDoc.classId.toString();
      }
    }

    console.log('=== PREP PLAN VALIDATION ===');
    console.log('Plan ID:', planId);
    console.log('Plan classId (raw):', plan.classId);
    console.log('Prep Class ID to check:', prepClassId);
    console.log('Active subscriptions from array:', activeSubs.length);
    console.log('Active payments:', activePayments.length);

    if (prepClassId) {
      console.log('Checking active subscriptions for prep class:', prepClassId);
      console.log('Active subs to check:', activeSubs.map(s => ({
        type: s.type,
        classId: s.classId,
        endDate: s.endDate
      })));

      // Check activeSubscriptions array
      const hasActivePrepForClass = activeSubs.some(sub => {
        if (sub.type !== 'preparation' || !sub.classId) {
          console.log('Skipping sub - not prep or no classId:', { type: sub.type, hasClassId: !!sub.classId });
          return false;
        }

        // Handle both ObjectId and string comparisons
        let subClassId = null;
        if (sub.classId && typeof sub.classId === 'object' && sub.classId._id) {
          subClassId = sub.classId._id.toString();
        } else if (sub.classId) {
          subClassId = sub.classId.toString();
        }

        console.log('Comparing sub classId:', subClassId, 'with plan classId:', prepClassId);
        const matches = subClassId && subClassId === prepClassId;
        if (matches) {
          console.log('✓ Found matching prep subscription in activeSubscriptions:', subClassId);
        }
        return matches;
      });

      // Also check Payment records
      console.log('Checking payments for prep class:', prepClassId);
      console.log('Active payments to check:', activePayments.map(p => ({
        planType: p.subscriptionPlanId?.type,
        classId: p.subscriptionPlanId?.classId,
        endDate: p.subscriptionEndDate
      })));

      const hasActivePrepFromPayments = activePayments.some(payment => {
        if (!payment.subscriptionPlanId ||
          payment.subscriptionPlanId.type !== 'preparation' ||
          !payment.subscriptionPlanId.classId) {
          console.log('Skipping payment - not prep or no classId');
          return false;
        }

        let paymentClassId = null;
        if (payment.subscriptionPlanId.classId && typeof payment.subscriptionPlanId.classId === 'object' && payment.subscriptionPlanId.classId._id) {
          paymentClassId = payment.subscriptionPlanId.classId._id.toString();
        } else if (payment.subscriptionPlanId.classId) {
          paymentClassId = payment.subscriptionPlanId.classId.toString();
        }

        console.log('Comparing payment classId:', paymentClassId, 'with plan classId:', prepClassId);
        const matches = paymentClassId && paymentClassId === prepClassId;
        if (matches) {
          console.log('✓ Found matching prep subscription in payments:', paymentClassId);
        }
        return matches;
      });

      console.log('hasActivePrepForClass:', hasActivePrepForClass);
      console.log('hasActivePrepFromPayments:', hasActivePrepFromPayments);

      if (hasActivePrepForClass || hasActivePrepFromPayments) {
        const prepClassName = plan.classId?.name || 'this preparation class';
        return next(new ErrorResponse(
          `You already have an active subscription for ${prepClassName}. Please wait until your current subscription expires before subscribing to another plan for the same preparation class.`,
          400
        ));
      }

      console.log('No conflicting prep subscription found - allowing subscription');
    } else {
      console.warn('⚠️ Prep class ID not found for plan:', planId);
      // Allow subscription if classId is missing (shouldn't happen, but don't block)
    }
  }

  // Check if Cashfree credentials are configured
  console.log('=== CHECKING CASHFREE CONFIG ===');
  const cashfreeConfig = cashfree.getCashfreeConfig();
  if (!cashfreeConfig) {
    console.error('Cashfree config is null - credentials missing');
    return next(new ErrorResponse('Cashfree credentials are not configured. Please contact administrator.', 500));
  }
  console.log('Cashfree config found:', {
    hasClientId: !!cashfreeConfig.clientId,
    hasSecretKey: !!cashfreeConfig.secretKey,
    environment: cashfreeConfig.environment,
    baseURL: cashfreeConfig.baseURL
  });

  // Generate unique order ID for Cashfree
  const timestamp = Date.now();
  const studentIdStr = studentId.toString();
  const studentIdShort = studentIdStr.length > 8 ? studentIdStr.slice(-8) : studentIdStr;
  const orderId = `order_${studentIdShort}_${timestamp}`;

  // Get return URL (frontend URL)
  const returnUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const notifyUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payment/webhook`;

  console.log('=== BUILDING ORDER DATA ===');
  console.log('Order ID:', orderId);
  console.log('Return URL:', returnUrl);
  console.log('Plan Price:', plan.price);

  // Build order data for Cashfree
  const orderData = {
    order_id: orderId,
    order_amount: plan.price,
    order_currency: 'INR',
    order_note: `Subscription: ${plan.name}`,
    customer_details: {
      customer_id: studentId.toString(),
      customer_name: student.name || 'Student',
      customer_email: student.email || '',
      customer_phone: student.phone || ''
    },
    order_meta: {
      return_url: `${returnUrl}/payment/return?order_id={order_id}`,
      notify_url: notifyUrl,
      // Allowed values: cc,dc,ppc,ccc,emi,paypal,upi,nb,app,paylater,applepay
      // Use a common combination: cards (cc,dc) + UPI + net-banking (nb)
      payment_methods: 'cc,dc,upi,nb'
    }
  };

  // Add metadata
  orderData.order_meta.metadata = {
    studentId: studentId.toString(),
    planId: planId.toString(),
    planName: plan.name,
    duration: plan.duration,
    planType: plan.type || 'regular'
  };

  // Add board/class info based on plan type
  if (plan.type === 'regular') {
    orderData.order_meta.metadata.board = plan.board;
    orderData.order_meta.metadata.classes = plan.classes?.join(', ') || '';
  } else if (plan.type === 'preparation') {
    orderData.order_meta.metadata.preparationClass = plan.classId?.toString() || '';
  }

  console.log('=== CALLING CASHFREE API ===');
  console.log('Order Data:', JSON.stringify(orderData, null, 2));

  try {
    const cashfreeOrder = await cashfree.createOrder(orderData);
    console.log('=== CASHFREE ORDER CREATED ===');
    console.log('Cashfree Order Response:', JSON.stringify(cashfreeOrder, null, 2));

    // Create payment record
    const payment = await Payment.create({
      studentId,
      subscriptionPlanId: planId,
      cashfreeOrderId: cashfreeOrder.order_id || orderId,
      amount: plan.price,
      currency: 'INR',
      status: 'pending'
    });

    res.status(200).json({
      success: true,
      data: {
        orderId: cashfreeOrder.order_id || orderId,
        paymentSessionId: cashfreeOrder.payment_session_id,
        amount: cashfreeOrder.order_amount || plan.price,
        currency: cashfreeOrder.order_currency || 'INR',
        clientId: cashfreeConfig.clientId,
        environment: cashfreeConfig.environment || 'PROD',
        paymentId: payment._id
      }
    });
  } catch (error) {
    console.error('Cashfree order creation error:', error);
    // Return more detailed error message
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create payment order';
    return next(new ErrorResponse(errorMessage, 500));
  }
});

// @desc    Verify Cashfree payment and activate subscription
// @route   POST /api/payment/verify-payment
// @access  Private (Student)
exports.verifyPayment = asyncHandler(async (req, res, next) => {
  // Check if user is a student
  if (req.userRole !== 'student') {
    return next(new ErrorResponse('Only students can verify payments', 403));
  }

  const { orderId, referenceId, paymentSignature, txStatus, orderAmount } = req.body;
  const studentId = req.user._id;

  if (!orderId) {
    return next(new ErrorResponse('Please provide order ID', 400));
  }

  // Find payment record
  const payment = await Payment.findOne({
    cashfreeOrderId: orderId,
    studentId
  });

  if (!payment) {
    return next(new ErrorResponse('Payment record not found', 404));
  }

  if (payment.status === 'completed') {
    return next(new ErrorResponse('Payment already verified', 400));
  }

  // Verify payment with Cashfree API (most reliable method)
  try {
    const orderDetails = await cashfree.getOrderDetails(orderId);

    console.log('Cashfree order details:', orderDetails);

    // Check if payment is successful
    if (orderDetails.order_status !== 'PAID') {
      payment.status = 'failed';
      await payment.save();
      return next(new ErrorResponse(`Payment not completed. Status: ${orderDetails.order_status}`, 400));
    }

    // If signature is provided, verify it (optional - Cashfree API status is source of truth)
    if (referenceId && paymentSignature && txStatus) {
      const amount = orderAmount || payment.amount;
      const isValidSignature = cashfree.verifyPaymentSignature(
        orderId,
        amount,
        referenceId,
        txStatus,
        paymentSignature
      );

      if (!isValidSignature) {
        console.warn('Payment signature verification failed, but order is PAID. Proceeding with verification.');
        // Don't fail if signature doesn't match but order is PAID - Cashfree API is source of truth
      }
    }

    // Get subscription plan
    const plan = await SubscriptionPlan.findById(payment.subscriptionPlanId);
    if (!plan) {
      return next(new ErrorResponse('Subscription plan not found', 404));
    }

    // Calculate subscription dates
    const startDate = new Date();
    let endDate = new Date();

    switch (plan.duration) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'half_yearly':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'demo':
        if (plan.validityDays && Number.isInteger(plan.validityDays) && plan.validityDays > 0) {
          endDate.setDate(endDate.getDate() + plan.validityDays);
        } else {
          // Default to 7 days if validityDays not provided
          endDate.setDate(endDate.getDate() + 7);
        }
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    // Update payment record
    if (referenceId) {
      payment.cashfreePaymentId = referenceId;
    }
    if (paymentSignature) {
      payment.cashfreeSignature = paymentSignature;
    }
    // Get payment reference from order details if not provided
    if (!payment.cashfreePaymentId && orderDetails.payment_details?.payment_id) {
      payment.cashfreePaymentId = orderDetails.payment_details.payment_id;
    }
    payment.status = 'completed';
    payment.subscriptionStartDate = startDate;
    payment.subscriptionEndDate = endDate;

    // Update student subscription
    const student = await Student.findById(studentId);

    // If student has referralAgentId, create ReferralRecord and update payment
    if (student.referralAgentId) {
      const ReferralRecord = require('../models/ReferralRecord');

      // Check if referral record already exists for this payment (prevent duplicates)
      const existingReferral = await ReferralRecord.findOne({
        paymentId: payment._id
      });

      if (!existingReferral) {
        // Create referral record
        await ReferralRecord.create({
          agentId: student.referralAgentId,
          studentId: student._id,
          paymentId: payment._id,
          subscriptionPlanId: plan._id,
          amount: payment.amount,
          subscriptionDate: startDate,
          status: 'completed'
        });
      }

      // Update payment with referralAgentId
      payment.referralAgentId = student.referralAgentId;
    }

    // Prepare subscription data for activeSubscriptions array
    const subscriptionData = {
      planId: plan._id,
      paymentId: payment._id,
      startDate: startDate,
      endDate: endDate,
      type: plan.type || 'regular'
    };

    // Add type-specific data
    if (plan.type === 'regular') {
      subscriptionData.board = plan.board;
      subscriptionData.class = plan.classes?.[0]; // Use first class if multiple
    } else if (plan.type === 'preparation') {
      subscriptionData.classId = plan.classId?._id || plan.classId;
    }

    // Add to activeSubscriptions array
    if (!student.activeSubscriptions) {
      student.activeSubscriptions = [];
    }
    student.activeSubscriptions.push(subscriptionData);

    // Also update legacy subscription field for backward compatibility
    // (Keep the most recent active subscription)
    student.subscription = {
      status: 'active',
      planId: plan._id,
      startDate: startDate,
      endDate: endDate
    };

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      data: {
        payment: {
          _id: payment._id,
          amount: payment.amount,
          status: payment.status,
          subscriptionStartDate: payment.subscriptionStartDate,
          subscriptionEndDate: payment.subscriptionEndDate
        },
        subscription: student.subscription
      }
    });
  } catch (error) {
    console.error('Cashfree payment verification error:', error);
    payment.status = 'failed';
    await payment.save();
    const errorMessage = error.response?.data?.message || error.message || 'Payment verification failed';
    return next(new ErrorResponse(errorMessage, 500));
  }
});

// @desc    Get payment history for student
// @route   GET /api/payment/history
// @access  Private (Student)
exports.getPaymentHistory = asyncHandler(async (req, res, next) => {
  // Check if user is a student
  if (req.userRole !== 'student') {
    return next(new ErrorResponse('Only students can view payment history', 403));
  }

  const studentId = req.user._id;

  const payments = await Payment.find({ studentId })
    .populate('subscriptionPlanId', 'name board duration price')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: payments.length,
    data: {
      payments
    }
  });
});

// @desc    Get all transactions (Admin)
// @route   GET /api/admin/payments
// @access  Private (Admin)
exports.getAllPayments = asyncHandler(async (req, res, next) => {
  const { status, startDate, endDate, studentId } = req.query;

  const query = {};
  if (status) query.status = status;
  if (studentId) query.studentId = studentId;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const payments = await Payment.find(query)
    .populate({
      path: 'studentId',
      select: 'name phone email class board'
    })
    .populate({
      path: 'subscriptionPlanId',
      select: 'name type board classes classId duration price originalPrice description features isActive',
      populate: {
        path: 'classId',
        select: 'name description classCode'
      }
    })
    .sort({ createdAt: -1 });

  // Calculate revenue
  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  // Format payments for table display
  const formattedPayments = payments.map(payment => ({
    _id: payment._id,
    student: {
      _id: payment.studentId?._id,
      name: payment.studentId?.name,
      phone: payment.studentId?.phone,
      email: payment.studentId?.email,
      class: payment.studentId?.class,
      board: payment.studentId?.board
    },
    plan: {
      _id: payment.subscriptionPlanId?._id,
      name: payment.subscriptionPlanId?.name,
      type: payment.subscriptionPlanId?.type,
      board: payment.subscriptionPlanId?.board,
      classes: payment.subscriptionPlanId?.classes,
      classId: payment.subscriptionPlanId?.classId,
      duration: payment.subscriptionPlanId?.duration,
      price: payment.subscriptionPlanId?.price,
      originalPrice: payment.subscriptionPlanId?.originalPrice,
      isActive: payment.subscriptionPlanId?.isActive
    },
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    cashfreeOrderId: payment.cashfreeOrderId,
    cashfreePaymentId: payment.cashfreePaymentId,
    subscriptionStartDate: payment.subscriptionStartDate,
    subscriptionEndDate: payment.subscriptionEndDate,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  }));

  res.status(200).json({
    success: true,
    count: payments.length,
    data: {
      payments: formattedPayments,
      revenue: {
        total: totalRevenue,
        totalTransactions: payments.filter(p => p.status === 'completed').length
      }
    }
  });
});

// @desc    Get payment statistics (Admin)
// @route   GET /api/admin/payments/stats
// @access  Private (Admin)
exports.getPaymentStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const payments = await Payment.find(query);

  const stats = {
    total: payments.length,
    completed: payments.filter(p => p.status === 'completed').length,
    pending: payments.filter(p => p.status === 'pending').length,
    failed: payments.filter(p => p.status === 'failed').length,
    cancelled: payments.filter(p => p.status === 'cancelled').length,
    totalRevenue: payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0),
    revenueByStatus: {
      completed: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
      pending: payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0)
    }
  };

  res.status(200).json({
    success: true,
    data: {
      stats
    }
  });
});

