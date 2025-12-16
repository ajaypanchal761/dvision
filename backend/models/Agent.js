const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    unique: true,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Legacy single FCM token (for backward compatibility)
  fcmToken: {
    type: String
  },
  // Platform-based FCM tokens (app and web)
  fcmTokens: {
    app: {
      type: String,
      default: null
    },
    web: {
      type: String,
      default: null
    }
  },
  lastOtpSentAt: {
    type: Date
  },
  profileImage: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
agentSchema.index({ phone: 1 });
agentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Agent', agentSchema);



