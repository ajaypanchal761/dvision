# Complete Payment Verification Flow - Frontend & Backend Integration

## Overview
The Dvision Academy payment system has two parallel verification paths:
1. **Frontend Verification** (PaymentReturn.jsx) - User redirect handling
2. **Webhook Verification** (handlePaymentWebhook) - Server-to-server confirmation

Both must work together to ensure reliable payment processing.

---

## Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER INITIATES PAYMENT                                       │
│    - Student selects subscription plan                          │
│    - Frontend calls POST /api/payment/create-order              │
│    - Backend returns Cashfree payment URL + orderId             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. PAYMENT GATEWAY (Cashfree)                                   │
│    - User completes payment at Cashfree                         │
│    - Cashfree processes and confirms payment                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     └─────────────────────┬──────────────────────┐
                                           │                      │
                                           ▼                      ▼
                    ┌─────────────────────────┐      ┌──────────────────────┐
                    │ 3A. USER REDIRECT       │      │ 3B. WEBHOOK (async)  │
                    │    (Return URL)         │      │    (Parallel)        │
                    │ Browser redirect with   │      │                      │
                    │ order_id parameter      │      │ Cashfree calls our   │
                    │ to PaymentReturn page   │      │ webhook endpoint     │
                    └────────────┬────────────┘      └──────────┬───────────┘
                                 │                              │
                                 ▼                              ▼
                    ┌──────────────────────────┐    ┌─────────────────────────┐
                    │ Frontend Verification    │    │ Backend Webhook Handler │
                    │ (PaymentReturn.jsx)      │    │ (handlePaymentWebhook)  │
                    │                          │    │                         │
                    │ 1. Get orderId from URL  │    │ 1. Receive raw body     │
                    │ 2. Call verify-payment   │    │ 2. Verify signature     │
                    │ 3. Backend checks        │    │    (HMAC-SHA256)        │
                    │    Cashfree API         │    │ 3. Process payment      │
                    │ 4. Update payment DB    │    │ 4. Activate subscription│
                    │ 5. Activate subscription │    │ 5. Update student DB   │
                    │ 6. Show success page    │    │ 6. Send notifications  │
                    └──────────────┬───────────┘    └──────────┬─────────────┘
                                   │                           │
                                   └───────────────┬───────────┘
                                                   │
                                                   ▼
                    ┌──────────────────────────────────────────┐
                    │ 4. FINAL STATE                           │
                    │ - Payment status: completed              │
                    │ - Student subscription: active           │
                    │ - Student subscription dates set         │
                    │ - Notifications sent (agent/student)     │
                    │ - User redirected to dashboard           │
                    └──────────────────────────────────────────┘
```

---

## Part 1: Frontend Verification (PaymentReturn.jsx)

### Flow
```
1. Cashfree Redirect → PaymentReturn?order_id=XXX
2. Extract orderId from URL params
3. Call backend verifyPayment endpoint
4. Backend verifies with Cashfree API
5. Update payment record
6. Activate student subscription
7. Redirect to dashboard
```

### Code Implementation

**File**: `frontend/src/modules/student/pages/PaymentReturn.jsx`

```javascript
useEffect(() => {
  const verifyPayment = async () => {
    // 1. Get orderId from URL query params
    const orderId = searchParams.get('order_id');
    
    // 2. Call backend verification endpoint
    const verifyResponse = await paymentAPI.verifyPayment(
      orderId,
      referenceId,
      paymentSignature,
      txStatus,
      orderAmount
    );

    // 3. If successful, redirect to dashboard
    if (verifyResponse.success) {
      setStatus('success');
      setTimeout(() => navigate(ROUTES.DASHBOARD), 3000);
    }
  };

  verifyPayment();
}, [searchParams]);
```

### Backend Endpoint

**File**: `backend/controllers/paymentController.js` (Lines 561-760)

```javascript
exports.verifyPayment = asyncHandler(async (req, res, next) => {
  const { orderId } = req.body;
  const studentId = req.user._id;

  // 1. Find payment record
  const payment = await Payment.findOne({
    cashfreeOrderId: orderId,
    studentId
  });

  // 2. Verify with Cashfree API
  const orderDetails = await cashfree.getOrderDetails(orderId);
  if (orderDetails.order_status !== 'PAID') {
    payment.status = 'failed';
    await payment.save();
    return next(new ErrorResponse('Payment not completed', 400));
  }

  // 3. Update payment record
  payment.status = 'completed';
  payment.subscriptionStartDate = startDate;
  payment.subscriptionEndDate = endDate;

  // 4. Update student subscription
  student.activeSubscriptions.push(subscriptionData);
  student.subscription = { status: 'active', ... };

  await Promise.all([payment.save(), student.save()]);

  return res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    data: { payment, student }
  });
});
```

---

## Part 2: Webhook Verification (Parallel)

### Flow
```
1. Cashfree sends webhook to https://api.dvisionacademy.com/api/payment/webhook
2. Express middleware extracts raw body (for signature verification)
3. Webhook handler receives request
4. Verify webhook signature using HMAC-SHA256
5. If signature valid, process payment
6. Update payment status in database
7. Activate student subscription
8. Send notifications
```

### Middleware Setup

**File**: `backend/server.js` (Lines 87-98)

```javascript
// Raw body middleware for webhook (BEFORE express.json())
app.post('/api/payment/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    try {
      req.rawBody = req.body;  // Save raw Buffer
      req.body = JSON.parse(req.body.toString());  // Parse to JSON
      next();
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }
);
```

### Webhook Handler

**File**: `backend/controllers/paymentController.js` (Lines 1055-1100)

```javascript
exports.handlePaymentWebhook = asyncHandler(async (req, res, next) => {
  const { data, type } = req.body;

  // 1. Verify signature FIRST (most critical security check)
  const isValidWebhook = verifyWebhookSignature(req);
  if (!isValidWebhook) {
    console.error('🔴 WEBHOOK SIGNATURE VERIFICATION FAILED');
    return res.status(200).json({
      success: false,
      message: 'Invalid signature',
      acknowledged: true
    });
  }

  // 2. Log successful verification
  console.log('✅ Webhook signature verified successfully');

  // 3. Route to appropriate handler
  if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
    return await handlePaymentSuccess(data, res, next);
  } else if (type === 'PAYMENT_FAILURE_WEBHOOK') {
    return await handlePaymentFailure(data, res, next);
  }
});
```

### Signature Verification

**File**: `backend/controllers/paymentController.js` (Lines 1100-1140)

```javascript
const verifyWebhookSignature = (req) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const { secretKey } = cashfree.getCashfreeConfig();

  // CRITICAL: Use raw body, not parsed JSON
  const rawBody = req.rawBody.toString('utf-8');
  
  // Calculate expected signature
  const payload = `${timestamp}${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('base64');

  // Compare signatures
  const isValid = signature === expectedSignature;
  console.log('Signature Verification:');
  console.log('  Received:', signature);
  console.log('  Expected:', expectedSignature);
  console.log('  Match:', isValid);

  return isValid;
};
```

### Process Payment Success

**File**: `backend/controllers/paymentController.js` (Lines 1145-1215)

```javascript
const handlePaymentSuccess = async (data, res, next) => {
  const orderId = data.order.order_id;

  // 1. Check payment status
  if (paymentStatus !== 'SUCCESS') {
    return res.status(200).json({ message: 'Status not SUCCESS' });
  }

  // 2. Find payment record
  const payment = await Payment.findOne({ cashfreeOrderId: orderId });

  // 3. Idempotency check
  if (payment.status === 'completed') {
    return res.status(200).json({ message: 'Already processed' });
  }

  // 4. Double-check with Cashfree API
  const orderDetails = await cashfree.getOrderDetails(orderId);
  if (orderDetails.order_status !== 'PAID') {
    payment.status = 'failed';
    await payment.save();
    return res.status(200).json({ message: 'Order not PAID' });
  }

  // 5. Activate subscription
  await activateSubscription(payment, paymentId);

  return res.status(200).json({
    success: true,
    message: 'Payment processed successfully',
    acknowledged: true
  });
};
```

---

## Part 3: Subscription Activation (Both Paths)

### Common Logic

**File**: `backend/controllers/paymentController.js` (Lines 1306-1450)

Both verification paths converge on the `activateSubscription()` function:

```javascript
const activateSubscription = async (payment, cashfreePaymentId = null) => {
  const studentId = payment.studentId;
  const plan = await SubscriptionPlan.findById(payment.subscriptionPlanId);

  // 1. Calculate subscription end date
  const startDate = new Date();
  let endDate = new Date();
  
  switch (plan.duration) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    // ... other durations
  }

  // 2. Update payment record
  payment.status = 'completed';
  payment.subscriptionStartDate = startDate;
  payment.subscriptionEndDate = endDate;

  // 3. Create referral record (if applicable)
  if (student.referralAgentId) {
    await ReferralRecord.create({
      agentId: student.referralAgentId,
      studentId: student._id,
      paymentId: payment._id,
      // ... other fields
    });
    
    // Notify agent
    await notificationService.sendToUser(agent._id, 'agent', {...});
  }

  // 4. Update student subscription
  student.activeSubscriptions.push({
    planId: plan._id,
    paymentId: payment._id,
    startDate: startDate,
    endDate: endDate,
    type: plan.type
  });

  student.subscription = {
    status: 'active',
    planId: plan._id,
    startDate: startDate,
    endDate: endDate
  };

  // 5. Save both records
  await Promise.all([payment.save(), student.save()]);

  // 6. Send notification to student
  await notificationService.sendToUser(student._id, 'student', {...});
};
```

---

## Key Security Features

### 1. Webhook Signature Verification
- **Algorithm**: HMAC-SHA256
- **Secret Key**: CF_SECRET from environment
- **Payload**: `timestamp + rawBody` (no JSON stringification)
- **Headers**: `x-webhook-signature` and `x-webhook-timestamp`

### 2. Idempotency Checks
```javascript
// Frontend verification - prevent duplicate processing
if (payment.status === 'completed') {
  return res.status(400).json({ message: 'Already verified' });
}

// Webhook - prevent duplicate processing
if (payment.status === 'completed') {
  return res.status(200).json({ message: 'Already processed' });
}
```

### 3. API Double-Check
Both paths verify with Cashfree API:
```javascript
const orderDetails = await cashfree.getOrderDetails(orderId);
if (orderDetails.order_status !== 'PAID') {
  // Mark as failed
  payment.status = 'failed';
}
```

### 4. Protected Endpoints
- `/verify-payment` - Protected (auth required)
- `/webhook` - Public (signature-based security)
- `/create-order` - Protected (auth required)

---

## Failure Scenarios & Handling

### Scenario 1: User Closes Payment Window
```
Frontend: No redirect to PaymentReturn
Backend: Webhook may still arrive (Cashfree will send it based on payment result)
Result: Payment may be marked as failed, or webhook will process success
Fix: Webhook is source of truth - it will eventually update the payment status
```

### Scenario 2: Network Interruption During Webhook
```
Frontend: Frontend verification succeeds, updates payment
Backend: Webhook doesn't arrive or fails
Result: Idempotency check prevents duplicate processing
Fix: Payment already marked completed from frontend verification
```

### Scenario 3: Invalid Webhook Signature
```
Frontend: N/A (no signature check in frontend)
Backend: Webhook rejected, logged as invalid
Result: Payment NOT processed, subscription NOT activated
Fix: Check logs for signature mismatch, may indicate wrong secret key
```

### Scenario 4: Duplicate Webhook Reception
```
Frontend: Already completed from frontend verification
Backend: Webhook received twice, idempotency check prevents duplicate
Result: Second webhook is acknowledged but doesn't update DB
Fix: Normal behavior, designed to handle duplicates
```

---

## Environment Configuration

```env
# Production Mode
CF_ENV=PROD

# Cashfree Credentials
CF_CLIENT_ID=your_client_id
CF_SECRET=your_secret_key

# URLs
FRONTEND_URL=https://dvisionacademy.com
BACKEND_URL=https://api.dvisionacademy.com

# Webhook URL (must be HTTPS and publicly accessible)
CASHFREE_WEBHOOK_URL=https://api.dvisionacademy.com/api/payment/webhook
```

---

## Testing Checklist

- [ ] Create order endpoint returns valid Cashfree URL
- [ ] Can complete payment at Cashfree payment gateway
- [ ] Redirected to PaymentReturn with order_id parameter
- [ ] Frontend verification succeeds and shows success page
- [ ] Payment record status changed to 'completed'
- [ ] Student subscription activated with correct dates
- [ ] Webhook arrives and processed (check logs)
- [ ] Signature verification passes
- [ ] Duplicate webhook handled correctly (idempotency)
- [ ] Notifications sent to student and agent
- [ ] Payment history shows completed payment
- [ ] Student can access course content immediately

---

## Monitoring & Debugging

### Check Payment Status
```bash
db.payments.findOne({ cashfreeOrderId: "ORDER_ID" })
```

### Check Student Subscription
```bash
db.students.findOne({ _id: "STUDENT_ID" }, { 
  subscription: 1, 
  activeSubscriptions: 1 
})
```

### Check Webhook Logs
```bash
# Look for signature verification logs
tail -f /var/log/app/backend.log | grep "Signature Verification"

# Look for webhook processing
tail -f /var/log/app/backend.log | grep "PAYMENT_SUCCESS_WEBHOOK"

# Look for errors
tail -f /var/log/app/backend.log | grep -i "error"
```

---

## Summary

The payment system is now production-ready with:
1. ✅ Frontend verification with Cashfree API double-check
2. ✅ Webhook verification with HMAC-SHA256 signature validation
3. ✅ Proper raw body handling for signature verification
4. ✅ Idempotency checks to prevent duplicate processing
5. ✅ Referral tracking and agent notifications
6. ✅ Student subscription activation
7. ✅ Proper error handling and logging

Both verification paths work in parallel to ensure reliable payment processing!
