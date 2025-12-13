const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
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
  subjects: [{
    type: String,
    trim: true,
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  }],
  classes: [{
    type: Number,
    enum: [9, 10, 11, 12]
  }],
  boards: [{
    type: String,
    enum: ['CBSE', 'ICSE', 'State Board']
  }],
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  fcmToken: {
    type: String
  },
  lastOtpSentAt: {
    type: Date
  },
  profileImage: {
    type: String
  },
  bio: {
    type: String
  },
  experience: {
    type: Number // years of experience
  }
}, {
  timestamps: true
});

// Indexes
teacherSchema.index({ phone: 1 });
teacherSchema.index({ isActive: 1 });

module.exports = mongoose.model('Teacher', teacherSchema);

