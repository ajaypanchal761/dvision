const axios = require("axios");
const crypto = require("crypto");

/**
 * Cashfree Production Configuration
 * ---------------------------------
 * ENV REQUIRED:
 * CF_CLIENT_ID=xxxx
 * CF_SECRET=xxxx
 */

const getCashfreeConfig = () => {
  const clientId = process.env.CF_CLIENT_ID;
  const secretKey = process.env.CF_SECRET;

  if (!clientId || !secretKey) {
    console.error("❌ Cashfree production credentials missing");
    throw new Error("Cashfree PROD credentials not found");
  }

  const baseURL = "https://api.cashfree.com/pg";

  console.log("✅ Cashfree running in PRODUCTION mode");
  console.log(`Client ID: ${clientId.slice(0, 8)}****`);
  console.log(`Base URL: ${baseURL}`);

  return {
    clientId,
    secretKey,
    baseURL,
    headers: {
      "x-client-id": clientId,
      "x-client-secret": secretKey,
      "x-api-version": "2023-08-01",
      "Content-Type": "application/json"
    }
  };
};

// Axios Client
const createCashfreeClient = () => {
  const config = getCashfreeConfig();

  return axios.create({
    baseURL: config.baseURL,
    headers: config.headers,
    timeout: 30000
  });
};

// Create Order / Payment Session
const createOrder = async (orderData) => {
  const client = createCashfreeClient();

  try {
    const response = await client.post("/orders", orderData);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Cashfree order creation error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Get Order Details
const getOrderDetails = async (orderId) => {
  const client = createCashfreeClient();

  try {
    const response = await client.get(`/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Cashfree get order error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Verify Payment Signature
const verifyPaymentSignature = (
  orderId,
  orderAmount,
  referenceId,
  txStatus,
  paymentSignature
) => {
  const { secretKey } = getCashfreeConfig();

  const payload = `${orderId}${orderAmount}${referenceId}${txStatus}`;

  const generatedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(payload)
    .digest("base64");

  return generatedSignature === paymentSignature;
};

module.exports = {
  createOrder,
  getOrderDetails,
  verifyPaymentSignature
};
