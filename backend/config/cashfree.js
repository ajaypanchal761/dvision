const axios = require('axios');

// Cashfree API configuration (Test + Live using CF_ENV)
// CF_ENV: 'TEST' or 'PROD'
const getCashfreeConfig = () => {
  let env = process.env.CF_ENV || 'TEST'; // TEST or PROD
  let isProd = env === 'PROD';

  // In TEST mode use TEST_CF_*; in PROD use CF_*
  let clientId = isProd ? process.env.CF_CLIENT_ID : process.env.TEST_CF_CLIENT_ID;
  let secretKey = isProd ? process.env.CF_SECRET : process.env.TEST_CF_SECRET;

  // Safety: if env is PROD but credentials look like TEST, fall back to TEST mode
  if (isProd && clientId && clientId.startsWith('TEST')) {
    console.warn('Cashfree credentials look like TEST in PROD env. Falling back to TEST mode.');
    env = 'TEST';
    isProd = false;
    clientId = process.env.TEST_CF_CLIENT_ID || clientId;
    secretKey = process.env.TEST_CF_SECRET || secretKey;
  }

  const environment = env;

  if (!clientId || !secretKey) {
    console.warn('Warning: Cashfree credentials not found in environment variables. Payment features will not work.');
    return null;
  }

  const baseURL = environment === 'PROD'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

  return {
    clientId,
    secretKey,
    environment,
    baseURL,
    headers: {
      'x-client-id': clientId,
      'x-client-secret': secretKey,
      'x-api-version': '2023-08-01',
      'Content-Type': 'application/json'
    }
  };
};

// Create axios instance for Cashfree API
const createCashfreeClient = () => {
  const config = getCashfreeConfig();
  if (!config) {
    return null;
  }

  return axios.create({
    baseURL: config.baseURL,
    headers: config.headers,
    timeout: 30000
  });
};

// Helper function to create order
const createOrder = async (orderData) => {
  const client = createCashfreeClient();
  if (!client) {
    throw new Error('Cashfree client not initialized. Please check your credentials.');
  }

  try {
    // Cashfree API endpoint for creating payment session
    const response = await client.post('/orders', orderData);
    return response.data;
  } catch (error) {
    console.error('Cashfree order creation error:', error.response?.data || error.message);
    throw error;
  }
};

// Helper function to get order details
const getOrderDetails = async (orderId) => {
  const client = createCashfreeClient();
  if (!client) {
    throw new Error('Cashfree client not initialized. Please check your credentials.');
  }

  try {
    const response = await client.get(`/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Cashfree get order error:', error.response?.data || error.message);
    throw error;
  }
};

// Helper function to verify payment signature
const verifyPaymentSignature = (orderId, orderAmount, referenceId, txStatus, paymentSignature) => {
  const config = getCashfreeConfig();
  if (!config) {
    return false;
  }

  // Cashfree signature verification
  const message = `${orderId}${orderAmount}${referenceId}${txStatus}`;
  const crypto = require('crypto');
  const generatedSignature = crypto
    .createHmac('sha256', config.secretKey)
    .update(message)
    .digest('base64');

  return generatedSignature === paymentSignature;
};

module.exports = {
  getCashfreeConfig,
  createCashfreeClient,
  createOrder,
  getOrderDetails,
  verifyPaymentSignature
};

