# Payment Webhook Setup Guide

## Overview

Your payment system now includes **THREE critical security features**:
1. ✅ **Webhook Verification** - Cashfree notifies server of payment status
2. ✅ **Return URL Verification** - User redirect from payment gateway verification
3. ✅ **Double Payment Prevention** - Blocks duplicate payment attempts

---

## 🔔 1. WEBHOOK VERIFICATION (Primary Method - Production)

### What is it?
When a customer completes payment in Cashfree:
1. User sees success/failure message on Cashfree website
2. Cashfree sends **signed webhook** to your server
3. Your server verifies the signature cryptographically
4. Subscription is activated server-side (even if user doesn't return)

### Security
- Uses **HMAC-SHA256** signature verification
- Webhook includes `x-webhook-signature` header
- Payload = `timestamp + JSON body`
- Only valid signatures are processed

### Production URL
```
https://api.dvisionacademy.com/api/payment/webhook
```

### Cashfree Dashboard Configuration

**⚠️ IMPORTANT: Configure this in Cashfree Dashboard IMMEDIATELY**

1. Go to: https://dashboard.cashfree.com
2. Navigate: **Settings → Webhooks**
3. Click **Add Webhook**
4. Configure:
   - **URL**: `https://api.dvisionacademy.com/api/payment/webhook`
   - **Events**: 
     - ✅ `PAYMENT_SUCCESS_WEBHOOK`
     - ✅ `PAYMENT_FAILURE_WEBHOOK`
     - ✅ `PAYMENT_USER_DROPPED`
   - **Ensure**: Webhook is **ENABLED**
5. Save and test

### Webhook Events Handled

```javascript
// Success - Subscription activated automatically
POST /api/payment/webhook
{
  "type": "PAYMENT_SUCCESS_WEBHOOK",
  "data": {
    "order": {
      "order_id": "order_abc123_1702990343",
      "order_status": "PAID"
    },
    "payment": {
      "cf_payment_id": "12345678",
      "payment_status": "SUCCESS"
    }
  }
}

// Failure - Payment marked as failed
POST /api/payment/webhook
{
  "type": "PAYMENT_FAILURE_WEBHOOK",
  "data": {
    "order": { "order_id": "..." },
    "payment": {
      "error_details": {
        "error_description": "Insufficient funds"
      }
    }
  }
}

// User Abandoned - Payment cancelled
POST /api/payment/webhook
{
  "type": "PAYMENT_USER_DROPPED",
  "data": {
    "order": { "order_id": "..." }
  }
}
```

### Signature Verification

```javascript
// Cashfree webhook headers
x-webhook-signature: "vN8qw2k/aB+c3d4e5f6g7h8i9..."
x-webhook-timestamp: "1702990343"

// Server verifies:
// signature = HMAC-SHA256(timestamp + body, CF_SECRET)
```

---

## 🔄 2. RETURN URL VERIFICATION (Secondary Method - User Redirect)

### What is it?
When user clicks "Back to Website" on Cashfree payment page:
1. Browser redirects to: `https://dvisionacademy.com/payment/return?order_id=...`
2. Frontend calls: `POST /api/payment/verify-payment`
3. Backend verifies with Cashfree API
4. Response: success/failure

### Return URL Configuration

**Already configured in backend** (`createOrder` function):
```javascript
return_url: `https://dvisionacademy.com/payment/return?order_id={order_id}`
```

### Flow

```
1. User completes payment → Cashfree redirects to return_url
2. Frontend receives: order_id, payment_id, signature
3. Frontend calls: paymentAPI.verifyPayment(orderId, ...)
4. Backend queries Cashfree API: GET /orders/{order_id}
5. Response: Payment activated or failed message
```

### Advantages & Disadvantages

| Aspect | Webhook | Return URL |
|--------|---------|-----------|
| **Reliability** | ⭐⭐⭐⭐⭐ (guaranteed) | ⭐⭐⭐ (user dependent) |
| **Security** | ⭐⭐⭐⭐⭐ (signed) | ⭐⭐⭐⭐ (API verified) |
| **Trigger** | Server-side | User-side |
| **If user doesn't return** | ✅ Still works | ❌ Won't verify until retry |

**Best Practice**: Use both - Webhook is primary, Return URL is fallback.

---

## 🚫 3. DOUBLE PAYMENT PREVENTION

### Frontend Check (First Layer)
```javascript
// In SubscriptionPlans.jsx
if (payment_in_progress === 'true' && timeSincePayment < 5 minutes) {
  // Block new payment attempt
  alert('A payment is already in progress. Please wait.');
  return;
}

// Set flag before starting payment
localStorage.setItem('payment_in_progress', 'true');
localStorage.setItem('payment_order_id', orderId);
localStorage.setItem('payment_timestamp', Date.now());
```

### Backend Check (Second Layer)
```javascript
// In paymentController.js - checkDoublePayment()
const recentPayment = await Payment.findOne({
  studentId,
  subscriptionPlanId: planId,
  status: { $in: ['pending', 'completed'] },
  createdAt: { $gte: 5_minutes_ago }
});

if (recentPayment) {
  return 429; // Too Many Requests
}
```

### Database Check (Third Layer)
```javascript
// Payment model has unique index on cashfreeOrderId
// MongoDB prevents duplicate order IDs
```

### Error Handling
```
Status Code: 429 (Too Many Requests)
Message: "You already have a pending payment for this plan. 
          Please wait a moment before trying again."
```

---

## 📋 Database Schema Updates

### Payment Model

```javascript
{
  // ... existing fields ...
  
  // New webhook tracking fields
  webhookProcessed: Boolean,        // Was webhook processed?
  webhookProcessedAt: Date,         // When was it processed?
  verificationMethod: String,       // 'webhook' | 'return_url' | 'api_check'
  
  // Enhanced metadata
  metadata: {
    failureReason: String,          // If payment failed
    failedAt: Date,
    cancelReason: String,           // If payment cancelled
    cancelledAt: Date
  }
}
```

---

## 🧪 Testing the Webhook

### Test with cURL
```bash
curl -X POST https://api.dvisionacademy.com/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: test_signature" \
  -H "x-webhook-timestamp: $(date +%s)" \
  -d '{
    "type": "PAYMENT_SUCCESS_WEBHOOK",
    "data": {
      "order": { "order_id": "test_123", "order_status": "PAID" },
      "payment": { "cf_payment_id": "pay_123", "payment_status": "SUCCESS" }
    }
  }'
```

### Test with Cashfree Sandbox
1. In `.env`, enable TEST mode:
   ```env
   CF_ENV=TEST  # or SANDBOX
   TEST_CF_CLIENT_ID=your_test_id
   TEST_CF_SECRET=your_test_secret
   ```

2. Use Cashfree's webhook testing tool in dashboard

### Check Webhook Logs
```bash
# Backend logs (Docker/Server)
docker logs -f dvision_backend | grep -i webhook

# Frontend logs (Browser Console)
Open DevTools → Console → Look for "WEBHOOK"
```

---

## 🔐 Environment Variables

Updated `.env`:
```env
# Cashfree
CF_CLIENT_ID=845489211da960c5020dca0980984548
CF_SECRET=cfsk_ma_prod_b7028a3297b6027bdc8bfca6669976a7_9369aabf
CF_ENV=PROD

# URLs
FRONTEND_URL=https://dvisionacademy.com
BACKEND_URL=https://api.dvisionacademy.com
WEBHOOK_URL=https://api.dvisionacademy.com/api/payment/webhook
```

---

## 📊 Payment Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Student clicks "Subscribe"                                   │
│    → Frontend: Check localStorage for payment_in_progress       │
│    → POST /api/payment/create-order                             │
├─────────────────────────────────────────────────────────────────┤
│ 2. Backend creates order                                        │
│    → Check double payment (DB lookup)                           │
│    → Generate unique order_id                                   │
│    → Call Cashfree API → Get paymentSessionId                   │
│    → Create Payment record (status: pending)                    │
│    → Return: orderId, paymentSessionId, amount, clientId        │
├─────────────────────────────────────────────────────────────────┤
│ 3. Frontend initializes Cashfree SDK                            │
│    → Set localStorage: payment_in_progress=true                 │
│    → New CashfreeSDK({ mode: "production" })                    │
│    → cashfree.checkout({ paymentSessionId, redirectTarget })    │
├─────────────────────────────────────────────────────────────────┤
│ 4. User completes payment on Cashfree page                      │
├─────────────────────────────────────────────────────────────────┤
│ 5. PARALLEL VERIFICATION:                                       │
│                                                                  │
│    PATH A: Webhook (Primary - Server-side)                     │
│    ─────────────────────────────────────────                   │
│    ✓ Cashfree sends: POST /api/payment/webhook                 │
│    ✓ Backend verifies signature (x-webhook-signature)           │
│    ✓ Backend calls Cashfree API: GET /orders/{orderId}          │
│    ✓ Backend activates subscription immediately                 │
│    ✓ Notifications sent to student & admins                     │
│                                                                  │
│    PATH B: Return URL (Secondary - User-side)                  │
│    ───────────────────────────────────────────                 │
│    ✓ User redirected to: /payment/return?order_id=...           │
│    ✓ Frontend calls: POST /api/payment/verify-payment           │
│    ✓ Backend queries Cashfree API                               │
│    ✓ If already activated by webhook: returns success           │
│    ✓ If not yet: activates subscription now                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 6. Frontend updates UI                                          │
│    ✓ Clear localStorage: payment_in_progress                    │
│    ✓ Show success/failure message                               │
│    ✓ Refresh user data via getCurrentUser()                     │
│    ✓ Redirect to dashboard                                      │
├─────────────────────────────────────────────────────────────────┤
│ 7. Database state                                               │
│    ✓ Payment: status=completed, webhookProcessed=true           │
│    ✓ Student: activeSubscriptions updated                       │
│    ✓ ReferralRecord: created (if applicable)                    │
│    ✓ Notifications: sent to all stakeholders                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist for Production

- [ ] Add webhook URL to Cashfree dashboard
- [ ] Enable PAYMENT_SUCCESS_WEBHOOK event
- [ ] Enable PAYMENT_FAILURE_WEBHOOK event
- [ ] Enable PAYMENT_USER_DROPPED event
- [ ] Test webhook with sample payload
- [ ] Verify signature verification works
- [ ] Test double payment prevention
- [ ] Verify return URL redirect works
- [ ] Check notification emails sent
- [ ] Monitor server logs for webhook receipts
- [ ] Test with real payment (small amount)
- [ ] Verify subscription activated in database
- [ ] Verify student sees subscription in UI

---

## 🚨 Troubleshooting

### Webhook not received
```
Issue: Cashfree not calling /api/payment/webhook
Fix: 
1. Check Cashfree dashboard - webhook enabled?
2. Check firewall - port 443 open?
3. Check domain - DNS resolves to server?
4. Check logs: docker logs dvision_backend | grep webhook
```

### Signature verification fails
```
Issue: "Webhook signature verification failed"
Fix:
1. Ensure CF_SECRET is correct
2. Check webhook has x-webhook-signature header
3. Check webhook has x-webhook-timestamp header
4. Compare signature in logs with expected signature
```

### Double payment still happening
```
Issue: Multiple payments for same plan
Fix:
1. Check localStorage clearing logic in PaymentReturn.jsx
2. Verify backend checkDoublePayment() is running
3. Check database Payment records for duplicates
```

### Subscription not activated
```
Issue: Payment successful but subscription empty
Fix:
1. Check webhook processed (webhookProcessed=true)
2. Check activeSubscriptions array in Student model
3. Check Payment.subscriptionEndDate is set
4. Check notificationService working
```

---

## 📞 Support

For issues:
1. Check backend logs: `docker logs -f dvision_backend`
2. Check Payment records in MongoDB
3. Contact Cashfree support: https://support.cashfree.com
4. Check Cashfree webhook delivery status in dashboard

---

## References

- [Cashfree Webhooks Documentation](https://docs.cashfree.com/api/v3/webhooks)
- [Cashfree Dashboard](https://dashboard.cashfree.com)
- Your Backend Endpoint: `https://api.dvisionacademy.com/api/payment/webhook`
