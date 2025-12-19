const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
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
  class: {
    type: Number,
    min: 1,
    max: 12,
    required: [true, 'Please provide a class']
  },
  board: {
    type: String,
    enum: ['CBSE', 'RBSE'],
    required: [true, 'Please provide a board']
  },
  password: {
    type: String,
    select: false // Don't return password by default
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  subscription: {
    status: {
      type: String,
      enum: ['active', 'expired', 'none'],
      default: 'none'
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan'
    },
    startDate: Date,
    endDate: Date
  },
  // Multiple active subscriptions support
  activeSubscriptions: [{
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['regular', 'preparation'],
      required: true
    },
    // For regular plans: board and class
    board: String,
    class: Number,
    // For preparation plans: classId
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    }
  }],
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
  },
  referralAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  },
  referredAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
studentSchema.index({ 'subscription.status': 1 });
studentSchema.index({ class: 1, board: 1 });
studentSchema.index({ 'activeSubscriptions.endDate': 1 });
studentSchema.index({ 'activeSubscriptions.type': 1 });
studentSchema.index({ 'activeSubscriptions.classId': 1 });
studentSchema.index({ referralAgentId: 1 });

// Hash password before saving
studentSchema.pre('save', async function(next) {
  // Only hash password if it's been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  // Hash password with cost of 12
  if (this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to compare password
studentSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Student', studentSchema);

