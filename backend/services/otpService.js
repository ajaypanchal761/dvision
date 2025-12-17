const axios = require('axios');
const ErrorResponse = require('../utils/errorResponse');

class OTPService {
  constructor() {
    this.apiKey = process.env.TWOFACTOR_API_KEY;
    this.baseURL = 'https://2factor.in/API/V1';
    this.otpExpiry = parseInt(process.env.OTP_EXPIRY_MINUTES || '5') * 60; // Convert to seconds
    this.resendCooldown = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60');
    
    // Test numbers that should bypass SMS and use default OTP
    this.testNumbers = new Set([
      '9685974247',
      '6261096283',
      '6264560457',
      '9928193969',
      '7610416911',
      '+919685974247',
      '+916261096283',
      '+916264560457',
      '+919928193969',
      '+917610416911',
      '919685974247',
      '916261096283',
      '916264560457',
      '919928193969',
      '917610416911'
    ]);
    this.testOTP = '123456';
    
    // Custom OTP mapping for specific phone numbers
    // Format: [phone_format, otp]
    // Note: The verification logic normalizes phone numbers and checks both full number and last 10 digits
    this.customOTPs = new Map([
      // Student number 7610416911 - Default OTP: 110211
      ['7610416911', '110211'],        // 10 digits format
      ['917610416911', '110211'],      // With country code 91
      ['+917610416911', '110211']      // With +91 prefix
    ]);
    
    // In-memory storage as fallback when Redis is not available
    this.memoryStore = new Map();
    this.memoryResendStore = new Map();
  }

  /**
   * Check if phone number is a test number
   * @param {string} phone - Phone number
   * @returns {boolean} - True if test number
   */
  isTestNumber(phone) {
    // Normalize phone number (remove + and spaces)
    const normalized = phone.replace(/[\s\+]/g, '');
    
    // Check if it ends with any test number
    for (const testNum of this.testNumbers) {
      const normalizedTest = testNum.replace(/[\s\+]/g, '');
      if (normalized.endsWith(normalizedTest) || normalized === normalizedTest) {
        return true;
      }
    }
    
    // Also check last 10 digits
    const last10 = normalized.slice(-10);
    return ['9685974247', '6261096283', '6264560457', '9928193969', '7610416911'].includes(last10);
  }

  /**
   * Send OTP to phone number using 2Factor.in
   * @param {string} phone - Phone number with country code (e.g., +919876543210)
   * @param {string} templateName - OTP template name from 2Factor.in
   * @returns {Promise<Object>} - Response from 2Factor.in
   */
  async sendOTP(phone, templateName = null) {
    try {
      // Check if it's a test number
      if (this.isTestNumber(phone)) {
        console.log(`[TEST MODE] Bypassing SMS for test number: ${phone}`);
        
        // Normalize phone number to check for custom OTP
        const normalized = phone.replace(/[\s\+]/g, '');
        const last10 = normalized.slice(-10);
        
        // Check if this number has a custom OTP
        let customOTP = null;
        if (this.customOTPs.has(normalized) || this.customOTPs.has(last10)) {
          customOTP = this.customOTPs.get(normalized) || this.customOTPs.get(last10);
          console.log(`[TEST MODE] Custom OTP for ${phone}: ${customOTP}`);
        }
        
        // Store test OTP session (no actual SMS sent)
        const testSessionId = `TEST_${Date.now()}_${phone}`;
        await this.storeOTPSession(phone, testSessionId, true); // true = isTest
        
        return {
          success: true,
          message: customOTP 
            ? `OTP sent successfully (Test Mode - Use OTP: ${customOTP})` 
            : 'OTP sent successfully (Test Mode - Use OTP: 123456)',
          sessionId: testSessionId,
          isTest: true
        };
      }

      // Format phone number (remove + if present, 2Factor.in expects without +)
      const formattedPhone = phone.replace(/^\+/, '');

      // Build URL
      let url = `${this.baseURL}/${this.apiKey}/SMS/${formattedPhone}/AUTOGEN`;
      
      // Add template name if provided
      if (templateName) {
        url = `${this.baseURL}/${this.apiKey}/SMS/${formattedPhone}/AUTOGEN/${templateName}`;
      }

      // Send OTP
      const response = await axios.get(url);

      if (response.data.Status === 'Success') {
        // Store OTP session ID in Redis for verification
        const sessionId = response.data.Details;
        await this.storeOTPSession(phone, sessionId);

        return {
          success: true,
          message: 'OTP sent successfully',
          sessionId: sessionId
        };
      } else {
        throw new ErrorResponse(
          response.data.Details || 'Failed to send OTP',
          400
        );
      }
    } catch (error) {
      console.error('2Factor.in OTP Send Error:', error.response?.data || error.message);
      
      if (error.response?.data) {
        throw new ErrorResponse(
          error.response.data.Details || 'Failed to send OTP. Please try again.',
          400
        );
      }
      
      throw new ErrorResponse('Failed to send OTP. Please try again.', 500);
    }
  }

  /**
   * Verify OTP using 2Factor.in
   * @param {string} phone - Phone number
   * @param {string} otp - OTP entered by user
   * @param {string} sessionId - Session ID from sendOTP response
   * @returns {Promise<Object>} - Verification result
   */
  async verifyOTP(phone, otp, sessionId = null) {
    try {
      // Check if it's a test number
      if (this.isTestNumber(phone)) {
        console.log(`[TEST MODE] Verifying OTP for test number: ${phone}`);
        
        // Normalize phone number to check for custom OTP
        const normalized = phone.replace(/[\s\+]/g, '');
        const last10 = normalized.slice(-10);
        
        // Check if this number has a custom OTP
        let expectedOTP = this.testOTP; // Default test OTP
        if (this.customOTPs.has(normalized) || this.customOTPs.has(last10)) {
          expectedOTP = this.customOTPs.get(normalized) || this.customOTPs.get(last10);
          console.log(`[TEST MODE] Using custom OTP for ${phone}: ${expectedOTP}`);
        }
        
        // For test numbers, accept the expected OTP (test OTP or custom OTP)
        if (otp === expectedOTP) {
          // Delete OTP session
          await this.deleteOTPSession(phone);
          
          return {
            success: true,
            message: 'OTP verified successfully (Test Mode)'
          };
        } else {
          // Increment attempt count
          await this.incrementOTPAttempts(phone);
          
          throw new ErrorResponse('Invalid OTP. Please try again.', 400);
        }
      }

      // Format phone number
      const formattedPhone = phone.replace(/^\+/, '');

      // Get session ID from Redis if not provided
      if (!sessionId) {
        sessionId = await this.getOTPSession(phone);
        if (!sessionId) {
          throw new ErrorResponse('OTP session expired. Please request a new OTP.', 400);
        }
      }

      // Verify OTP
      const url = `${this.baseURL}/${this.apiKey}/SMS/VERIFY/${sessionId}/${otp}`;
      const response = await axios.get(url);

      if (response.data.Status === 'Success') {
        // Delete OTP session from Redis
        await this.deleteOTPSession(phone);

        return {
          success: true,
          message: 'OTP verified successfully'
        };
      } else {
        // Increment attempt count
        await this.incrementOTPAttempts(phone);

        throw new ErrorResponse(
          response.data.Details || 'Invalid OTP. Please try again.',
          400
        );
      }
    } catch (error) {
      if (error instanceof ErrorResponse) {
        throw error;
      }

      console.error('2Factor.in OTP Verify Error:', error.response?.data || error.message);
      throw new ErrorResponse('Failed to verify OTP. Please try again.', 500);
    }
  }

  /**
   * Store OTP session in Redis or memory
   * @param {string} phone - Phone number
   * @param {string} sessionId - Session ID from 2Factor.in
   * @param {boolean} isTest - Whether this is a test session
   */
  async storeOTPSession(phone, sessionId, isTest = false) {
    try {
      const sessionData = {
        sessionId,
        phone,
        createdAt: new Date().toISOString(),
        attempts: 0,
        expiresAt: Date.now() + this.otpExpiry * 1000,
        isTest
      };
      this.memoryStore.set(phone, sessionData);
      setTimeout(() => {
        this.memoryStore.delete(phone);
      }, this.otpExpiry * 1000);
    } catch (error) {
      console.error('Store OTP session error:', error);
    }
  }

  /**
   * Get OTP session from Redis or memory
   * @param {string} phone - Phone number
   * @returns {Promise<string|null>} - Session ID or null
   */
  async getOTPSession(phone) {
    try {
      const sessionData = this.memoryStore.get(phone);
      if (sessionData) {
        if (Date.now() > sessionData.expiresAt) {
          this.memoryStore.delete(phone);
          return null;
        }
        return sessionData.sessionId;
      }
      return null;
    } catch (error) {
      console.error('Get OTP session error:', error);
      return null;
    }
  }

  /**
   * Delete OTP session from Redis or memory
   * @param {string} phone - Phone number
   */
  async deleteOTPSession(phone) {
    try {
      this.memoryStore.delete(phone);
    } catch (error) {
      console.error('Delete OTP session error:', error);
      this.memoryStore.delete(phone);
    }
  }

  /**
   * Increment OTP verification attempts
   * @param {string} phone - Phone number
   */
  async incrementOTPAttempts(phone) {
    try {
      const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');
      const sessionData = this.memoryStore.get(phone);
      if (sessionData) {
        sessionData.attempts = (sessionData.attempts || 0) + 1;
        if (sessionData.attempts >= maxAttempts) {
          this.memoryStore.delete(phone);
        }
      }
    } catch (error) {
      console.error('Increment OTP attempts error:', error);
    }
  }

  /**
   * Check if OTP can be resent (cooldown period)
   * @param {string} phone - Phone number
   * @returns {Promise<boolean>} - True if can resend
   */
  async canResendOTP(phone) {
    try {
      const lastSent = this.memoryResendStore.get(phone);
      if (!lastSent) return true;
      const now = Date.now();
      const cooldownMs = this.resendCooldown * 1000;
      return (now - lastSent.timestamp) >= cooldownMs;
    } catch (error) {
      console.error('Resend check error:', error);
      return true; // Allow if error
    }
  }

  /**
   * Store resend cooldown timestamp
   * @param {string} phone - Phone number
   */
  async storeResendCooldown(phone) {
    try {
      const timestamp = Date.now();
      this.memoryResendStore.set(phone, { timestamp });
      setTimeout(() => {
        this.memoryResendStore.delete(phone);
      }, this.resendCooldown * 1000);
    } catch (error) {
      console.error('Store resend cooldown error:', error);
    }
  }
}

module.exports = new OTPService();

