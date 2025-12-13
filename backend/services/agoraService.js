const { RtcTokenBuilder, RtcRole } = require('agora-token');

/**
 * Agora Service for generating tokens and managing live classes
 */
class AgoraService {
  constructor() {
    this.appId = process.env.AGORA_APP_ID;
    this.appCertificate = process.env.APP_CERTIFICATE;
    
    if (!this.appId || !this.appCertificate) {
      console.warn('Agora credentials not configured. Live classes will not work.');
    }
  }

  /**
   * Generate RTC token for joining a channel
   * @param {string} channelName - Agora channel name
   * @param {string} uid - User ID (0 for auto-generated)
   * @param {number} role - RtcRole (PUBLISHER or SUBSCRIBER)
   * @param {number} expirationTimeInSeconds - Token expiration time (default: 24 hours)
   * @returns {string} - RTC token
   */
  generateRtcToken(channelName, uid = 0, role = RtcRole.PUBLISHER, expirationTimeInSeconds = 86400) {
    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora credentials not configured');
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    return token;
  }

  /**
   * Generate channel name for a live class
   * @param {string} liveClassId - Live class MongoDB ID
   * @returns {string} - Unique channel name
   */
  generateChannelName(liveClassId) {
    return `liveclass_${liveClassId.toString()}`;
  }

  /**
   * Validate Agora configuration
   * @returns {boolean} - True if configured
   */
  isConfigured() {
    return !!(this.appId && this.appCertificate);
  }
}

module.exports = new AgoraService();

