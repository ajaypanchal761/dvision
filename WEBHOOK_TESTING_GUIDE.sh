#!/bin/bash
# Webhook Verification Testing Script
# This script helps verify the webhook implementation

echo "🔍 Webhook Signature Verification Testing Script"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="https://api.dvisionacademy.com"
WEBHOOK_PATH="/api/payment/webhook"
WEBHOOK_URL="${API_URL}${WEBHOOK_PATH}"

echo "📋 Configuration:"
echo "   API URL: $API_URL"
echo "   Webhook Path: $WEBHOOK_PATH"
echo "   Full Webhook URL: $WEBHOOK_URL"
echo ""

# Function to test webhook connectivity
test_webhook_connectivity() {
  echo "🔗 Test 1: Webhook Connectivity"
  echo "Checking if webhook endpoint is accessible..."
  
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{}' \
    "$WEBHOOK_URL")
  
  if [ "$response" == "200" ] || [ "$response" == "400" ]; then
    echo -e "${GREEN}✓${NC} Webhook endpoint is accessible (HTTP $response)"
    return 0
  else
    echo -e "${RED}✗${NC} Webhook endpoint returned HTTP $response"
    return 1
  fi
  echo ""
}

# Function to test signature verification
test_signature_verification() {
  echo "🔐 Test 2: Signature Verification"
  echo "Testing HMAC-SHA256 signature verification..."
  
  # Create test payload
  TIMESTAMP=$(date +%s)
  TEST_BODY='{"data":{"order":{"order_id":"TEST_ORDER_ID"},"payment":{"cf_payment_id":"TEST_PAYMENT_ID","payment_status":"SUCCESS"}},"type":"PAYMENT_SUCCESS_WEBHOOK"}'
  
  # Note: For actual testing, you need CF_SECRET from environment
  # This is just to show the format
  echo "   Timestamp: $TIMESTAMP"
  echo "   Body length: ${#TEST_BODY} bytes"
  echo "   Signature format: HMAC-SHA256(timestamp + rawBody, CF_SECRET)"
  echo ""
  echo -e "${YELLOW}!${NC} Note: Actual signature verification requires valid CF_SECRET"
  echo "   The CF_SECRET must match Cashfree's configured secret for your account"
  echo ""
  
  return 0
}

# Function to test with actual webhook (requires valid payment)
test_webhook_processing() {
  echo "📥 Test 3: Webhook Processing"
  echo "This test requires a valid payment from Cashfree"
  echo ""
  
  # Check if we can query payments
  echo "🗄️ Checking database for recent payments..."
  echo "   Run this command on your MongoDB to find recent payments:"
  echo "   db.payments.find({}).sort({createdAt: -1}).limit(5)"
  echo ""
  
  return 0
}

# Function to check logs
check_logs() {
  echo "📊 Test 4: Check Application Logs"
  echo "To verify webhook processing, check application logs for:"
  echo ""
  echo -e "${YELLOW}Success indicators:${NC}"
  echo "   • '✅ Webhook signature verified successfully'"
  echo "   • 'PAYMENT_SUCCESS_WEBHOOK'"
  echo "   • 'Subscription activated via webhook'"
  echo ""
  echo -e "${RED}Error indicators:${NC}"
  echo "   • 'WEBHOOK SIGNATURE VERIFICATION FAILED'"
  echo "   • 'Raw body not available for signature verification'"
  echo "   • 'Invalid signature' (suggests wrong CF_SECRET)"
  echo ""
  echo "Command to view logs:"
  echo "   tail -f /var/log/app/backend.log | grep -i webhook"
  echo ""
  
  return 0
}

# Function to verify database state
verify_database_state() {
  echo "🗄️ Test 5: Database State Verification"
  echo "After a successful webhook, check the database:"
  echo ""
  echo "1. Check Payment Status:"
  echo "   db.payments.findOne({cashfreeOrderId: 'ORDER_ID'})"
  echo "   Expected: status = 'completed'"
  echo ""
  echo "2. Check Student Subscription:"
  echo "   db.students.findOne({_id: ObjectId('STUDENT_ID')})"
  echo "   Expected: subscription.status = 'active'"
  echo ""
  echo "3. Check Active Subscriptions:"
  echo "   db.students.findOne({_id: ObjectId('STUDENT_ID')}, {activeSubscriptions: 1})"
  echo "   Expected: Array with subscription entry including startDate and endDate"
  echo ""
  
  return 0
}

# Function to test error scenarios
test_error_scenarios() {
  echo "⚠️ Test 6: Error Scenarios"
  echo ""
  
  echo "1. Invalid Signature Test:"
  echo "   curl -X POST $WEBHOOK_URL \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -H 'x-webhook-signature: invalid' \\"
  echo "     -H 'x-webhook-timestamp: $(date +%s)' \\"
  echo "     -d '{\"data\":{}'"
  echo "   Expected: 200 OK with acknowledged: true, success: false"
  echo ""
  
  echo "2. Missing Headers Test:"
  echo "   curl -X POST $WEBHOOK_URL \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d '{\"data\":{}'"
  echo "   Expected: 200 OK with acknowledged: true, success: false"
  echo ""
  
  echo "3. Invalid JSON Test:"
  echo "   curl -X POST $WEBHOOK_URL \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d 'invalid json'"
  echo "   Expected: 400 Bad Request with error: 'Invalid JSON'"
  echo ""
  
  return 0
}

# Function to show environment check
check_environment() {
  echo "🔧 Test 7: Environment Configuration"
  echo "Verify these environment variables are set:"
  echo ""
  
  if [ -z "$CF_ENV" ]; then
    echo -e "${RED}✗${NC} CF_ENV not set (should be 'PROD')"
  else
    echo -e "${GREEN}✓${NC} CF_ENV=$CF_ENV"
  fi
  
  if [ -z "$CF_CLIENT_ID" ]; then
    echo -e "${RED}✗${NC} CF_CLIENT_ID not set"
  else
    echo -e "${GREEN}✓${NC} CF_CLIENT_ID is set"
  fi
  
  if [ -z "$CF_SECRET" ]; then
    echo -e "${RED}✗${NC} CF_SECRET not set (CRITICAL for webhook verification)"
  else
    echo -e "${GREEN}✓${NC} CF_SECRET is set"
  fi
  
  if [ -z "$CASHFREE_WEBHOOK_URL" ]; then
    echo -e "${YELLOW}!${NC} CASHFREE_WEBHOOK_URL not set in env (may be hardcoded)"
  else
    echo -e "${GREEN}✓${NC} CASHFREE_WEBHOOK_URL=$CASHFREE_WEBHOOK_URL"
  fi
  
  echo ""
  return 0
}

# Main execution
main() {
  test_webhook_connectivity
  test_signature_verification
  test_webhook_processing
  check_logs
  verify_database_state
  test_error_scenarios
  check_environment
  
  echo ""
  echo "=================================================="
  echo "✅ Testing guide complete!"
  echo ""
  echo "📝 Next Steps:"
  echo "   1. Verify all environment variables are set"
  echo "   2. Complete a test payment at the payment gateway"
  echo "   3. Check both frontend verification and webhook processing"
  echo "   4. Monitor logs for 'Signature Verification' messages"
  echo "   5. Verify database shows payment as completed"
  echo ""
}

main
