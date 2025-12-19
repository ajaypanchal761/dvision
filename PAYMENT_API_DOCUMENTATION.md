# Payment API Documentation

## Base URLs

**Production:**
- Backend: `https://api.dvisionacademy.com`
- Frontend: `https://dvisionacademy.com`
- Webhook: `https://api.dvisionacademy.com/api/payment/webhook`

**Development:**
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

---

## 🔐 Authentication

All student endpoints (except webhook) require:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

Webhook endpoint is **PUBLIC** but uses signature verification instead.

---

## Student Endpoints

### 1. Create Payment Order

**Endpoint**: `POST /api/payment/create-order`  
**Auth**: Required (Student only)  
**Purpose**: Create a Cashfree order for a subscription plan

#### Request

```json
{
  "planId": "507f1f77bcf86cd799439011"
}
```

#### Response (Success)

```json
{
  "success": true,
  "data": {
    "orderId": "order_abc123_1702990343",
    "paymentSessionId": "session_6f4c9d2e8b1a5f3c",
    "amount": 4999,
    "currency": "INR",
    "clientId": "845489211da960c5020dca0980984548",
    "environment": "PROD",
    "paymentId": "507f1f77bcf86cd799439012"
  }
}
```

#### Response (Double Payment)

```json
{
  "success": false,
  "statusCode": 429,
  "message": "You already have a pending or recent payment for this plan. Please wait a moment and try again."
}
```

#### Response (Plan Not Found)

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Subscription plan not found"
}
```

#### Response (Plan Inactive)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "This subscription plan is not available"
}
```

#### Errors

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Please provide a subscription plan ID | Missing planId |
| 400 | You already have a pending or recent payment | Double payment attempt |
| 400 | This subscription plan is not available | Plan inactive |
| 400 | This plan is not available for your board | Student board mismatch |
| 400 | This plan is not available for your class | Student class mismatch |
| 400 | You already have an active subscription | Conflicting subscription |
| 403 | Only students can create payment orders | Non-student user |
| 404 | Subscription plan not found | Invalid planId |
| 500 | Cashfree credentials not configured | Server misconfiguration |

---

### 2. Verify Payment

**Endpoint**: `POST /api/payment/verify-payment`  
**Auth**: Required (Student only)  
**Purpose**: Verify payment and activate subscription

#### Request

```json
{
  "orderId": "order_abc123_1702990343",
  "referenceId": "pay_123456789",
  "paymentSignature": "vN8qw2k/aB+c3d4e5f6g7h8i9...",
  "txStatus": "SUCCESS",
  "orderAmount": 4999
}
```

**Note**: Only `orderId` is required. Other fields are optional.

#### Response (Success)

```json
{
  "success": true,
  "message": "Payment verified and subscription activated successfully",
  "data": {
    "payment": {
      "_id": "507f1f77bcf86cd799439012",
      "amount": 4999,
      "status": "completed",
      "subscriptionStartDate": "2025-12-19T10:00:00Z",
      "subscriptionEndDate": "2025-01-19T10:00:00Z"
    },
    "subscription": {
      "status": "active",
      "planId": "507f1f77bcf86cd799439011",
      "startDate": "2025-12-19T10:00:00Z",
      "endDate": "2025-01-19T10:00:00Z"
    }
  }
}
```

#### Response (Already Verified)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Payment already verified"
}
```

#### Response (Payment Failed)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Payment not completed. Status: CANCELLED"
}
```

#### Errors

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Please provide order ID | Missing orderId |
| 400 | Payment already verified | Duplicate verification |
| 400 | Payment not completed | Order status not PAID |
| 403 | Only students can verify payments | Non-student user |
| 404 | Payment record not found | Invalid orderId |
| 500 | Payment verification failed | Cashfree API error |

---

### 3. Get Payment History

**Endpoint**: `GET /api/payment/history`  
**Auth**: Required (Student only)  
**Purpose**: Get student's payment history

#### Response

```json
{
  "success": true,
  "count": 3,
  "data": {
    "payments": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "cashfreeOrderId": "order_abc123_1702990343",
        "amount": 4999,
        "status": "completed",
        "subscriptionStartDate": "2025-12-19T10:00:00Z",
        "subscriptionEndDate": "2025-01-19T10:00:00Z",
        "subscriptionPlanId": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "Monthly Plan - Class 12 - CBSE",
          "board": "CBSE",
          "duration": "monthly",
          "price": 4999
        },
        "createdAt": "2025-12-19T10:00:00Z"
      }
    ]
  }
}
```

---

## Admin Endpoints

### 1. Get All Payments

**Endpoint**: `GET /api/payment/admin`  
**Auth**: Required (Admin/Super Admin only)  
**Purpose**: Get all student payments with filters

#### Query Parameters

```
?status=completed
&startDate=2025-12-01
&endDate=2025-12-31
&studentId=507f1f77bcf86cd799439001
&page=1
&limit=10
&search=john
```

#### Response

```json
{
  "success": true,
  "total": 150,
  "page": 1,
  "pages": 15,
  "data": {
    "payments": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "studentId": {
          "_id": "507f1f77bcf86cd799439001",
          "name": "John Doe",
          "phone": "9876543210",
          "email": "john@example.com",
          "class": 12,
          "board": "CBSE"
        },
        "subscriptionPlanId": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "Monthly Plan",
          "board": "CBSE",
          "classes": [10, 11, 12],
          "duration": "monthly",
          "price": 4999
        },
        "amount": 4999,
        "status": "completed",
        "subscriptionStartDate": "2025-12-19T10:00:00Z",
        "subscriptionEndDate": "2025-01-19T10:00:00Z",
        "webhookProcessed": true,
        "verificationMethod": "webhook",
        "createdAt": "2025-12-19T10:00:00Z"
      }
    ],
    "revenue": {
      "total": 749850,
      "totalTransactions": 150
    }
  }
}
```

---

### 2. Get Payment Statistics

**Endpoint**: `GET /api/payment/admin/stats`  
**Auth**: Required (Admin/Super Admin only)  
**Purpose**: Get payment statistics

#### Query Parameters

```
?startDate=2025-12-01
&endDate=2025-12-31
```

#### Response

```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 150,
      "completed": 142,
      "pending": 5,
      "failed": 2,
      "cancelled": 1,
      "totalRevenue": 709858,
      "revenueByStatus": {
        "completed": 709858,
        "pending": 24975
      }
    }
  }
}
```

---

## Webhook Endpoint (Server-Side)

### Webhook Receiver

**Endpoint**: `POST /api/payment/webhook`  
**Auth**: Signature verification (public, not JWT)  
**Purpose**: Receive payment notifications from Cashfree

#### Headers Required

```
x-webhook-signature: vN8qw2k/aB+c3d4e5f6g7h8i9...
x-webhook-timestamp: 1702990343
Content-Type: application/json
```

#### Event 1: Payment Success

Cashfree sends:
```json
{
  "type": "PAYMENT_SUCCESS_WEBHOOK",
  "data": {
    "order": {
      "order_id": "order_abc123_1702990343",
      "order_status": "PAID",
      "order_amount": 4999,
      "order_currency": "INR"
    },
    "payment": {
      "cf_payment_id": "12345678",
      "payment_status": "SUCCESS",
      "payment_method": "upi",
      "payment_amount": 4999
    },
    "customer_details": {
      "customer_id": "507f1f77bcf86cd799439001",
      "customer_name": "John Doe",
      "customer_email": "john@example.com"
    }
  }
}
```

Server responds:
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "acknowledged": true,
  "orderId": "order_abc123_1702990343"
}
```

#### Event 2: Payment Failure

Cashfree sends:
```json
{
  "type": "PAYMENT_FAILURE_WEBHOOK",
  "data": {
    "order": {
      "order_id": "order_abc123_1702990343"
    },
    "payment": {
      "cf_payment_id": "12345678",
      "payment_status": "FAILED",
      "error_details": {
        "error_code": "INSUFFICIENT_FUNDS",
        "error_description": "Insufficient funds in account"
      }
    }
  }
}
```

Server responds:
```json
{
  "success": true,
  "message": "Payment failure acknowledged",
  "acknowledged": true,
  "orderId": "order_abc123_1702990343"
}
```

#### Event 3: User Dropped Payment

Cashfree sends:
```json
{
  "type": "PAYMENT_USER_DROPPED",
  "data": {
    "order": {
      "order_id": "order_abc123_1702990343"
    },
    "payment": null
  }
}
```

Server responds:
```json
{
  "success": true,
  "message": "Payment abandonment acknowledged",
  "acknowledged": true,
  "orderId": "order_abc123_1702990343"
}
```

---

## Frontend API Calls

### Using paymentAPI

```javascript
import { paymentAPI } from '../services/api';

// Create order
const orderResponse = await paymentAPI.createOrder(planId);

// Verify payment
const verifyResponse = await paymentAPI.verifyPayment(
  orderId,
  referenceId,
  paymentSignature,
  txStatus,
  orderAmount
);

// Get payment history
const historyResponse = await paymentAPI.getPaymentHistory();
```

### cURL Examples

#### Create Order

```bash
curl -X POST https://api.dvisionacademy.com/api/payment/create-order \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "507f1f77bcf86cd799439011"
  }'
```

#### Verify Payment

```bash
curl -X POST https://api.dvisionacademy.com/api/payment/verify-payment \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_abc123_1702990343",
    "referenceId": "pay_123456789"
  }'
```

#### Get Payment History

```bash
curl -X GET https://api.dvisionacademy.com/api/payment/history \
  -H "Authorization: Bearer <student_token>"
```

#### Get All Payments (Admin)

```bash
curl -X GET "https://api.dvisionacademy.com/api/payment/admin?status=completed&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

#### Get Payment Stats (Admin)

```bash
curl -X GET "https://api.dvisionacademy.com/api/payment/admin/stats" \
  -H "Authorization: Bearer <admin_token>"
```

#### Test Webhook

```bash
curl -X POST https://api.dvisionacademy.com/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: test_signature" \
  -H "x-webhook-timestamp: $(date +%s)" \
  -d '{
    "type": "PAYMENT_SUCCESS_WEBHOOK",
    "data": {
      "order": {
        "order_id": "test_123",
        "order_status": "PAID"
      },
      "payment": {
        "cf_payment_id": "pay_123",
        "payment_status": "SUCCESS"
      }
    }
  }'
```

---

## HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | Operation completed |
| 400 | Bad Request | Invalid input or business logic error |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Double payment or rate limit |
| 500 | Internal Error | Server error |

---

## Error Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "message": "User-friendly error message",
  "data": {
    "errors": [
      {
        "field": "planId",
        "message": "Plan ID is required"
      }
    ]
  }
}
```

---

## Data Models

### Payment Document

```javascript
{
  _id: ObjectId,
  studentId: ObjectId,           // Reference to Student
  subscriptionPlanId: ObjectId,   // Reference to SubscriptionPlan
  cashfreeOrderId: String,        // Unique order ID
  cashfreePaymentId: String,      // Payment reference
  cashfreeSignature: String,      // Signature for verification
  amount: Number,                 // In INR
  currency: String,               // "INR"
  status: String,                 // "pending" | "completed" | "failed" | "cancelled"
  paymentMethod: String,          // "cashfree"
  subscriptionStartDate: Date,    // When subscription starts
  subscriptionEndDate: Date,      // When subscription ends
  webhookProcessed: Boolean,      // Was webhook processed?
  webhookProcessedAt: Date,       // When was it processed?
  verificationMethod: String,     // "webhook" | "return_url" | "api_check"
  metadata: Object,               // Additional data
  referralAgentId: ObjectId,      // Referral agent (if any)
  createdAt: Date,
  updatedAt: Date
}
```

### Payment Flow Statuses

```
PENDING
  ↓
  ├─→ COMPLETED (webhook received and verified)
  ├─→ COMPLETED (user returned and verified)
  ├─→ FAILED (webhook received with failure)
  ├─→ CANCELLED (user abandoned payment)
  └─→ PENDING (no webhook, no return - expires after timeout)
```

---

## Verification Methods

### Webhook (Primary)
- Source: Cashfree server
- Trigger: Automatic, after payment
- Reliability: ⭐⭐⭐⭐⭐
- Requires: Signature verification
- Result: Subscription activated server-side

### Return URL (Fallback)
- Source: User browser
- Trigger: User returns from Cashfree
- Reliability: ⭐⭐⭐
- Requires: API verification with Cashfree
- Result: Subscription activated if not already done

### API Check (Tertiary)
- Source: Admin/system
- Trigger: Manual verification
- Reliability: ⭐⭐⭐⭐⭐
- Requires: Query Cashfree API directly
- Result: Can manually activate subscription

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/create-order` | 5 requests per student | 5 minutes |
| `/verify-payment` | 10 requests per order | 1 hour |
| `/history` | 100 requests | 1 hour |
| Webhook | Unlimited (signature verified) | N/A |

Double payment prevention uses 5-minute sliding window.

---

## Notifications Sent

When subscription is activated:

1. **To Student**
   - Title: "Subscription Activated!"
   - Body: "Your subscription for {planName} has been activated."
   - Type: "subscription_purchased"
   - URL: "/subscriptions"

2. **To Referral Agent** (if applicable)
   - Title: "Student Subscribed!"
   - Body: "{studentName} has subscribed to {planName} (₹{amount})"
   - Type: "student_subscribed"
   - URL: "/agent/referrals"

3. **To All Admins**
   - Title: "New Subscription Purchase"
   - Body: "{studentName} has purchased {planName} subscription"
   - Type: "new_subscription"
   - URL: "/admin/payments"

---

## Testing Guide

### Test Case 1: Successful Payment

```
1. Create order → Get orderId
2. Simulate Cashfree: POST /webhook with success data
3. Verify: Payment.status = "completed"
4. Verify: Student.activeSubscriptions updated
5. Verify: Notifications sent
```

### Test Case 2: Failed Payment

```
1. Create order → Get orderId
2. Simulate Cashfree: POST /webhook with failure data
3. Verify: Payment.status = "failed"
4. Verify: Student.activeSubscriptions NOT updated
```

### Test Case 3: Double Payment

```
1. Create order → Get orderId
2. Immediately create order again with same planId
3. Should get HTTP 429
4. Message: "pending or recent payment"
```

### Test Case 4: Return URL Fallback

```
1. Create order → orderId
2. Don't send webhook
3. Navigate to /payment/return?order_id={orderId}
4. Should verify and show success
```

---

**Version**: 1.0  
**Last Updated**: December 19, 2025  
**Status**: Production Ready ✅
