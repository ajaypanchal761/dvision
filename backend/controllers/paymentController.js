const cashfree = require('../config/cashfree');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Class = require('../models/Class');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const crypto = require('crypto');

// ===== DOUBLE PAYMENT PREVENTION =====
// Check if student is attempting duplicate payment within time window
const checkDoublePayment = async (studentId, planId) => {
  // Look for pending or recently completed payments within 5 minutes
  const recentPaymentWindow = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

  const recentPayment = await Payment.findOne({
    studentId,
    subscriptionPlanId: planId,
    status: { $in: ['pending', 'completed'] },
    createdAt: { $gte: recentPaymentWindow }
  });

  return recentPayment;
};

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

  // ===== DOUBLE PAYMENT PREVENTION =====
  const existingPayment = await checkDoublePayment(studentId, planId);
  if (existingPayment) {
    console.warn(`🔴 Double payment attempt detected for student ${studentId} and plan ${planId}`);
    return next(new ErrorResponse(
      'You already have a pending or recent payment for this plan. Please wait a moment and try again.',
      429 // Too Many Requests
    ));
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
  // IMPORTANT: Cashfree production requires HTTPS URLs only
  console.log('=== ENVIRONMENT URL VARIABLES ===');
  console.log('process.env.FRONTEND_URL (raw):', process.env.FRONTEND_URL);
  console.log('process.env.BACKEND_URL (raw):', process.env.BACKEND_URL);
  console.log('process.env.NODE_ENV:', process.env.NODE_ENV);

  // For PRODUCTION Cashfree, ALWAYS use production domains
  // Do NOT rely on environment variables which might be cached
  const cashfreeEnv = process.env.CF_ENV || 'PROD';
  console.log('Cashfree Environment:', cashfreeEnv);

  let returnUrl;
  let notifyUrl;

  if (cashfreeEnv === 'PROD') {
    // PRODUCTION MODE: Use production domains ONLY
    // Cashfree production DOES NOT accept localhost
    returnUrl = 'https://dvisionacademy.com';
    notifyUrl = 'https://api.dvisionacademy.com/api/payment/webhook';
    console.log('🔴 PRODUCTION MODE DETECTED: Using hardcoded production URLs');
  } else if (cashfreeEnv === 'TEST' || cashfreeEnv === 'SANDBOX') {
    // TEST/SANDBOX MODE: Use environment variables (can be localhost)
    returnUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    notifyUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    notifyUrl = notifyUrl.includes('/api/payment/webhook') ? notifyUrl : `${notifyUrl}/api/payment/webhook`;
    console.log('🟡 TEST/SANDBOX MODE DETECTED: Using environment variables');
  } else {
    // FALLBACK: Use environment variables
    returnUrl = process.env.FRONTEND_URL || 'https://dvisionacademy.com';
    notifyUrl = process.env.BACKEND_URL || 'https://api.dvisionacademy.com/api/payment/webhook';
    console.log('⚪ FALLBACK MODE: Using environment variables with HTTPS defaults');
  }

  // FORCE HTTPS for all modes
  if (returnUrl.startsWith('http://') && cashfreeEnv === 'PROD') {
    console.warn('⚠️  CRITICAL: HTTP detected in PROD mode! Converting to HTTPS');
    returnUrl = returnUrl.replace('http://', 'https://');
  }
  if (notifyUrl.startsWith('http://') && cashfreeEnv === 'PROD') {
    console.warn('⚠️  CRITICAL: HTTP detected in PROD mode! Converting to HTTPS');
    notifyUrl = notifyUrl.replace('http://', 'https://');
  }

  // Ensure notify URL has the webhook path
  if (!notifyUrl.includes('/api/payment/webhook')) {
    if (cashfreeEnv === 'PROD') {
      notifyUrl = 'https://api.dvisionacademy.com/api/payment/webhook';
    } else {
      notifyUrl = `${notifyUrl}/api/payment/webhook`;
    }
  }

  console.log('Final returnUrl:', returnUrl);
  console.log('Final notifyUrl:', notifyUrl);
  console.log('⚠️  VALIDATE: returnUrl should be https://dvisionacademy.com/payment/return?order_id={order_id}');
  console.log('⚠️  VALIDATE: notifyUrl should be https://api.dvisionacademy.com/api/payment/webhook');

  // Add webhook path to notify URL if not present
  if (!notifyUrl.includes('/api/payment/webhook')) {
    notifyUrl = `${notifyUrl}/api/payment/webhook`;
  }

  // Warn if using localhost/http with production Cashfree
  const isLocalhost = returnUrl.includes('localhost') || returnUrl.includes('127.0.0.1');
  if (isLocalhost && cashfreeConfig.environment === 'PROD') {
    console.warn('⚠️  ⚠️  ⚠️  CRITICAL WARNING ⚠️  ⚠️  ⚠️');
    console.warn('Using localhost with Cashfree PRODUCTION API');
    console.warn('');
    console.warn('CASHFREE PRODUCTION DOES NOT SUPPORT LOCALHOST');
    console.warn('');
    console.warn('To fix this, you MUST do ONE of the following:');
    console.warn('');
    console.warn('Option 1: Use NGROK tunneling (RECOMMENDED for local testing)');
    console.warn('  1. Install ngrok: https://ngrok.com/download');
    console.warn('  2. Run: ngrok http 5000');
    console.warn('  3. Update BACKEND_URL and FRONTEND_URL in .env with ngrok URLs');
    console.warn('  4. Add ngrok URL to Cashfree dashboard whitelist');
    console.warn('');
    console.warn('Option 2: Use TEST/SANDBOX mode (RECOMMENDED for quick testing)');
    console.warn('  1. Add TEST credentials to .env:');
    console.warn('     CF_ENV=TEST');
    console.warn('     CF_CLIENT_ID=TEST103954469d9f07939b8254f92d8064459301');
    console.warn('     CF_SECRET=cfsk_ma_test_aee2b63fdbfea01d9eb63072375cdcf4_b99408c6');
    console.warn('  2. This uses Cashfree sandbox - accepts any URL');
    console.warn('');
    console.warn('Option 3: Deploy and test from production domain');
    console.warn('  1. Deploy to: https://dvisionacademy.com');
    console.warn('  2. Requires full production setup');
    console.warn('');
    console.warn('Current Return URL:', returnUrl);
    console.warn('Current Notify URL:', notifyUrl);
    console.warn('');
  }

  console.log('=== BUILDING ORDER DATA ===');
  console.log('Order ID:', orderId);
  console.log('Return URL:', returnUrl);
  console.log('Plan Price:', plan.price);

  // ===== CRITICAL: SAFETY CHECK FOR PRODUCTION =====
  // Cashfree production ONLY accepts production domain URLs
  if (cashfreeEnv === 'PROD') {
    console.log('🔴 PRODUCTION CASHFREE CHECK:');
    console.log('  ✅ returnUrl:', returnUrl);
    console.log('  ✅ notifyUrl:', notifyUrl);

    // Verify production URLs are being used
    if (!returnUrl.includes('dvisionacademy.com')) {
      const errorMsg = `❌ FATAL ERROR: In PROD mode, return URL must be https://dvisionacademy.com/...\n` +
        `Received: ${returnUrl}\n` +
        `Cashfree production only accepts your domain, not localhost or other URLs.`;
      console.error(errorMsg);
      return next(new ErrorResponse(errorMsg, 500));
    }

    if (!notifyUrl.includes('api.dvisionacademy.com')) {
      const errorMsg = `❌ FATAL ERROR: In PROD mode, notify URL must be https://api.dvisionacademy.com/...\n` +
        `Received: ${notifyUrl}\n` +
        `Cashfree production only accepts your domain, not localhost or other URLs.`;
      console.error(errorMsg);
      return next(new ErrorResponse(errorMsg, 500));
    }

    if (!returnUrl.startsWith('https://')) {
      const errorMsg = `❌ FATAL ERROR: Return URL must use HTTPS in PROD mode.\n` +
        `Received: ${returnUrl}`;
      console.error(errorMsg);
      return next(new ErrorResponse(errorMsg, 500));
    }

    if (!notifyUrl.startsWith('https://')) {
      const errorMsg = `❌ FATAL ERROR: Notify URL must use HTTPS in PROD mode.\n` +
        `Received: ${notifyUrl}`;
      console.error(errorMsg);
      return next(new ErrorResponse(errorMsg, 500));
    }

    console.log('✅ All PRODUCTION security checks passed!');
  }

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
    // Idempotent response: if payment already verified, return success
    console.log('Payment already verified for order:', orderId);
    return res.status(200).json({
      success: true,
      message: 'Payment already verified',
      data: {
        paymentId: payment._id,
        status: payment.status
      }
    });
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
        const referralRecord = await ReferralRecord.create({
          agentId: student.referralAgentId,
          studentId: student._id,
          paymentId: payment._id,
          subscriptionPlanId: plan._id,
          amount: payment.amount,
          subscriptionDate: startDate,
          status: 'completed'
        });

        // Send notification to agent about student subscription
        try {
          const Agent = require('../models/Agent');
          const agent = await Agent.findById(student.referralAgentId);

          if (agent && agent.isActive) {
            const notificationService = require('../services/notificationService');
            const notificationTitle = 'Student Subscribed!';
            const notificationBody = `${student.name || 'A student'} has subscribed to ${plan.name} (₹${payment.amount})`;
            const notificationData = {
              type: 'student_subscribed',
              studentId: student._id.toString(),
              studentName: student.name || 'Student',
              paymentId: payment._id.toString(),
              planId: plan._id.toString(),
              planName: plan.name,
              amount: payment.amount,
              referralRecordId: referralRecord._id.toString(),
              url: '/agent/referrals'
            };

            await notificationService.sendToUser(
              agent._id.toString(),
              'agent',
              { title: notificationTitle, body: notificationBody },
              notificationData
            );
            console.log(`✓ Notification sent to agent ${agent.name} for student subscription`);
          }
        } catch (notificationError) {
          console.error('Error sending notification to agent:', notificationError);
          // Don't fail the payment if notification fails
        }
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

    // Send notification to student about successful subscription purchase
    try {
      const notificationService = require('../services/notificationService');
      const planName = plan.name || 'Subscription Plan';
      const notificationTitle = 'Subscription Activated!';
      const notificationBody = `Your subscription for ${planName} has been activated successfully.`;
      const notificationData = {
        type: 'subscription_purchased',
        paymentId: payment._id.toString(),
        planId: plan._id.toString(),
        planName: planName,
        url: '/subscriptions'
      };

      await notificationService.sendToUser(
        studentId.toString(),
        'student',
        { title: notificationTitle, body: notificationBody },
        notificationData
      );
    } catch (notificationError) {
      console.error('Error sending notification to student:', notificationError);
      // Don't fail the request if notification fails
    }

    // Send notification to all admins about new subscription purchase
    try {
      const Admin = require('../models/Admin');
      const notificationService = require('../services/notificationService');

      const admins = await Admin.find({
        isActive: true,
        $or: [
          { 'fcmTokens.app': { $exists: true, $ne: null } },
          { 'fcmTokens.web': { $exists: true, $ne: null } },
          { fcmToken: { $exists: true, $ne: null } }
        ]
      }).select('_id');

      if (admins.length > 0) {
        const studentName = student.name || 'A student';
        const planName = plan.name || 'Subscription Plan';
        const notificationTitle = 'New Subscription Purchase';
        const notificationBody = `${studentName} has purchased ${planName} subscription.`;
        const notificationData = {
          type: 'new_subscription',
          studentId: studentId.toString(),
          studentName: studentName,
          paymentId: payment._id.toString(),
          planId: plan._id.toString(),
          planName: planName,
          amount: payment.amount,
          url: '/admin/payments'
        };

        const adminIds = admins.map(a => a._id.toString());
        await notificationService.sendToMultipleUsers(
          adminIds,
          'admin',
          { title: notificationTitle, body: notificationBody },
          notificationData
        );
      }
    } catch (adminNotificationError) {
      console.error('Error sending notification to admins:', adminNotificationError);
      // Don't fail the request if notification fails
    }

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
  const { status, startDate, endDate, studentId, page = 1, limit = 10, search } = req.query;

  const query = {};
  if (status) query.status = status;
  if (studentId) query.studentId = studentId;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Add search functionality - search in order IDs first
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    query.$or = [
      { cashfreeOrderId: searchRegex },
      { cashfreePaymentId: searchRegex }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  let total = await Payment.countDocuments(query);

  // If search is provided, also search in student fields
  let studentSearchQuery = null;
  if (search) {
    const Student = require('../models/Student');
    const searchRegex = { $regex: search, $options: 'i' };
    const matchingStudents = await Student.find({
      $or: [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex }
      ]
    }).select('_id');
    const studentIds = matchingStudents.map(s => s._id);
    if (studentIds.length > 0) {
      // Combine with existing query
      const studentQuery = { ...query };
      delete studentQuery.$or; // Remove order ID search
      studentQuery.studentId = { $in: studentIds };
      const studentPaymentsCount = await Payment.countDocuments(studentQuery);
      // If we have student matches, update query
      if (studentPaymentsCount > 0) {
        query.$or = [
          ...(query.$or || []),
          { studentId: { $in: studentIds } }
        ];
        total = await Payment.countDocuments(query);
      }
    }
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
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

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
    cashfreePaymentId: payment.cashfreePaymentId || null, // Explicitly include null for pending payments
    subscriptionStartDate: payment.subscriptionStartDate,
    subscriptionEndDate: payment.subscriptionEndDate,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  }));

  res.status(200).json({
    success: true,
    count: payments.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
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

// ====================================================================
// WEBHOOK HANDLER - Cashfree Payment Status Notification (Production)
// ====================================================================
// This endpoint is called by Cashfree to notify about payment success/failure
// IMPORTANT: This webhook is NOT protected by auth middleware
// Security: Uses cryptographic signature verification from Cashfree

// @desc    Webhook handler for Cashfree payment notifications
// @route   POST /api/payment/webhook
// @access  Public (Cashfree server calls this - signature verified)
exports.handlePaymentWebhook = asyncHandler(async (req, res, next) => {
  console.log('\n🔔 === WEBHOOK RECEIVED ===');
  console.log('Webhook Timestamp:', new Date().toISOString());
  console.log('Webhook Body:', JSON.stringify(req.body, null, 2));

  const { data, type } = req.body;

  // Verify webhook signature (mandatory for production security)
  const isValidWebhook = verifyWebhookSignature(req);
  if (!isValidWebhook) {
    console.error('🔴 WEBHOOK SIGNATURE VERIFICATION FAILED');
    console.error('Headers:', req.headers);
    console.error('Body:', req.body);
    // Still return 200 to acknowledge receipt (don't let attacker know signature is invalid)
    return res.status(200).json({
      success: false,
      message: 'Invalid signature',
      acknowledged: true
    });
  }

  console.log('✅ Webhook signature verified successfully');

  // Handle different webhook types
  if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
    return await handlePaymentSuccess(data, res, next);
  } else if (type === 'PAYMENT_FAILURE_WEBHOOK') {
    return await handlePaymentFailure(data, res, next);
  } else if (type === 'PAYMENT_USER_DROPPED') {
    return await handlePaymentDropped(data, res, next);
  } else {
    console.log('⚠️ Unknown webhook type:', type);
    return res.status(200).json({
      success: true,
      message: 'Webhook acknowledged',
      type: type
    });
  }
});

// Verify Cashfree webhook signature
const verifyWebhookSignature = (req) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    if (!signature || !timestamp) {
      console.error('Missing webhook signature or timestamp headers');
      return false;
    }

    const { secretKey } = cashfree.getCashfreeConfig();

    // Use raw body for signature verification (NOT parsed JSON)
    // This is critical - Cashfree signature is calculated on the raw request body
    let rawBody;
    if (req.rawBody instanceof Buffer) {
      rawBody = req.rawBody.toString('utf-8');
    } else if (typeof req.rawBody === 'string') {
      rawBody = req.rawBody;
    } else {
      console.error('Raw body not available for signature verification');
      return false;
    }

    // Cashfree signature format: HMAC-SHA256(timestamp + body, secretKey)
    const payload = `${timestamp}${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('base64');

    console.log('Signature Verification:');
    console.log('  Received:', signature);
    console.log('  Expected:', expectedSignature);
    console.log('  Match:', signature === expectedSignature);

    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error.message);
    return false;
  }
};

// Handle payment success webhook
const handlePaymentSuccess = async (data, res, next) => {
  try {
    console.log('\n✅ === PAYMENT SUCCESS WEBHOOK ===');
    const orderId = data.order.order_id;
    const paymentId = data.payment?.cf_payment_id;
    const paymentStatus = data.payment?.payment_status;

    console.log('Order ID:', orderId);
    console.log('Payment ID:', paymentId);
    console.log('Payment Status:', paymentStatus);

    if (paymentStatus !== 'SUCCESS') {
      console.warn('⚠️ Payment status is not SUCCESS:', paymentStatus);
      return res.status(200).json({
        success: true,
        message: 'Payment status not success, ignoring',
        acknowledged: true
      });
    }

    // Find payment record by order ID
    const payment = await Payment.findOne({ cashfreeOrderId: orderId });

    if (!payment) {
      console.error('Payment record not found for order:', orderId);
      return res.status(200).json({
        success: true,
        message: 'Payment record not found',
        acknowledged: true
      });
    }

    // If already completed, don't process again (idempotency)
    if (payment.status === 'completed') {
      console.log('Payment already completed, skipping duplicate webhook');
      return res.status(200).json({
        success: true,
        message: 'Payment already processed',
        acknowledged: true
      });
    }

    // Verify order status with Cashfree API
    const orderDetails = await cashfree.getOrderDetails(orderId);

    if (orderDetails.order_status !== 'PAID') {
      console.warn('Order status from API is not PAID:', orderDetails.order_status);
      payment.status = 'failed';
      await payment.save();
      return res.status(200).json({
        success: true,
        message: 'Order not in PAID status',
        acknowledged: true
      });
    }

    // Activate subscription for the student
    await activateSubscription(payment, paymentId);

    console.log('✅ Subscription activated via webhook for payment:', orderId);

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      acknowledged: true,
      orderId: orderId
    });
  } catch (error) {
    console.error('Error processing payment success webhook:', error);
    return res.status(200).json({
      success: true,
      message: 'Webhook acknowledged',
      acknowledged: true,
      error: error.message
    });
  }
};

// Handle payment failure webhook
const handlePaymentFailure = async (data, res, next) => {
  try {
    console.log('\n❌ === PAYMENT FAILURE WEBHOOK ===');
    const orderId = data.order.order_id;
    const failureReason = data.payment?.error_details?.error_description || 'Payment failed';

    console.log('Order ID:', orderId);
    console.log('Failure Reason:', failureReason);

    // Find and update payment record
    const payment = await Payment.findOne({ cashfreeOrderId: orderId });

    if (payment) {
      payment.status = 'failed';
      payment.metadata = {
        ...payment.metadata,
        failureReason: failureReason,
        failedAt: new Date().toISOString()
      };
      await payment.save();
      console.log('Payment status updated to failed');
    }

    return res.status(200).json({
      success: true,
      message: 'Payment failure acknowledged',
      acknowledged: true,
      orderId: orderId
    });
  } catch (error) {
    console.error('Error processing payment failure webhook:', error);
    return res.status(200).json({
      success: true,
      message: 'Webhook acknowledged',
      acknowledged: true,
      error: error.message
    });
  }
};

// Handle payment user dropped webhook
const handlePaymentDropped = async (data, res, next) => {
  try {
    console.log('\n⚠️ === PAYMENT USER DROPPED WEBHOOK ===');
    const orderId = data.order.order_id;

    console.log('Order ID:', orderId);
    console.log('User dropped payment (abandoned)');

    // Find and update payment record
    const payment = await Payment.findOne({ cashfreeOrderId: orderId });

    if (payment) {
      payment.status = 'cancelled';
      payment.metadata = {
        ...payment.metadata,
        cancelReason: 'User abandoned payment',
        cancelledAt: new Date().toISOString()
      };
      await payment.save();
      console.log('Payment status updated to cancelled');
    }

    return res.status(200).json({
      success: true,
      message: 'Payment abandonment acknowledged',
      acknowledged: true,
      orderId: orderId
    });
  } catch (error) {
    console.error('Error processing payment dropped webhook:', error);
    return res.status(200).json({
      success: true,
      message: 'Webhook acknowledged',
      acknowledged: true,
      error: error.message
    });
  }
};

// Helper function to activate subscription (reusable logic)
const activateSubscription = async (payment, cashfreePaymentId = null) => {
  const studentId = payment.studentId;
  const plan = await SubscriptionPlan.findById(payment.subscriptionPlanId);

  if (!plan) {
    throw new Error('Subscription plan not found');
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
        endDate.setDate(endDate.getDate() + 7);
      }
      break;
    default:
      endDate.setMonth(endDate.getMonth() + 1);
  }

  // Update payment record
  if (cashfreePaymentId) {
    payment.cashfreePaymentId = cashfreePaymentId;
  }
  payment.status = 'completed';
  payment.subscriptionStartDate = startDate;
  payment.subscriptionEndDate = endDate;

  // Get student
  const student = await Student.findById(studentId);

  // Handle referrals
  if (student.referralAgentId) {
    const ReferralRecord = require('../models/ReferralRecord');
    const existingReferral = await ReferralRecord.findOne({ paymentId: payment._id });

    if (!existingReferral) {
      await ReferralRecord.create({
        agentId: student.referralAgentId,
        studentId: student._id,
        paymentId: payment._id,
        subscriptionPlanId: plan._id,
        amount: payment.amount,
        subscriptionDate: startDate,
        status: 'completed'
      });

      // Notify agent
      try {
        const Agent = require('../models/Agent');
        const agent = await Agent.findById(student.referralAgentId);

        if (agent && agent.isActive) {
          const notificationService = require('../services/notificationService');
          await notificationService.sendToUser(
            agent._id.toString(),
            'agent',
            {
              title: 'Student Subscribed!',
              body: `${student.name || 'A student'} has subscribed to ${plan.name}`
            },
            {
              type: 'student_subscribed',
              studentId: student._id.toString(),
              studentName: student.name,
              paymentId: payment._id.toString(),
              planId: plan._id.toString(),
              amount: payment.amount,
              url: '/agent/referrals'
            }
          );
        }
      } catch (err) {
        console.error('Error notifying agent:', err.message);
      }
    }

    payment.referralAgentId = student.referralAgentId;
  }

  // Update student subscription
  const subscriptionData = {
    planId: plan._id,
    paymentId: payment._id,
    startDate: startDate,
    endDate: endDate,
    type: plan.type || 'regular'
  };

  if (plan.type === 'regular') {
    subscriptionData.board = plan.board;
    subscriptionData.class = plan.classes?.[0];
  } else if (plan.type === 'preparation') {
    subscriptionData.classId = plan.classId?._id || plan.classId;
  }

  if (!student.activeSubscriptions) {
    student.activeSubscriptions = [];
  }
  student.activeSubscriptions.push(subscriptionData);

  student.subscription = {
    status: 'active',
    planId: plan._id,
    startDate: startDate,
    endDate: endDate
  };

  await Promise.all([payment.save(), student.save()]);

  // Send notifications to student and admins
  try {
    const notificationService = require('../services/notificationService');

    // Notify student
    await notificationService.sendToUser(
      studentId.toString(),
      'student',
      {
        title: 'Subscription Activated!',
        body: `Your subscription for ${plan.name} has been activated.`
      },
      {
        type: 'subscription_purchased',
        paymentId: payment._id.toString(),
        planId: plan._id.toString(),
        planName: plan.name,
        url: '/subscriptions'
      }
    );

    // Notify admins
    const Admin = require('../models/Admin');
    const admins = await Admin.find({
      isActive: true,
      $or: [
        { 'fcmTokens.app': { $exists: true, $ne: null } },
        { 'fcmTokens.web': { $exists: true, $ne: null } },
        { fcmToken: { $exists: true, $ne: null } }
      ]
    }).select('_id');

    if (admins.length > 0) {
      const adminIds = admins.map(a => a._id.toString());
      await notificationService.sendToMultipleUsers(
        adminIds,
        'admin',
        {
          title: 'New Subscription Purchase',
          body: `${student.name || 'A student'} has purchased ${plan.name}`
        },
        {
          type: 'new_subscription',
          studentId: student._id.toString(),
          paymentId: payment._id.toString(),
          planName: plan.name,
          amount: payment.amount,
          url: '/admin/payments'
        }
      );
    }
  } catch (err) {
    console.error('Error sending notifications:', err.message);
  }
};

