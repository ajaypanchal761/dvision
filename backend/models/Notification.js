const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      index: true
    },
    userType: {
      type: String,
      enum: ['student', 'teacher', 'admin', 'agent'],
      required: [true, 'User type is required']
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    body: {
      type: String,
      required: [true, 'Notification body is required'],
      trim: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date
    },
    type: {
      type: String,
      enum: [
        'info',
        'success',
        'warning',
        'error',
        'course',
        'test',
        'live_class',
        'live_class_created',
        'live_class_started',
        'timetable_class_reminder',
        'subscription_expiry',
        'subscription_expired',
        'subscription_purchased',
        'new_subscription',
        'student_registered',
        'student_subscribed',
        'doubt',
        'doubt_answer',
        'subscription_updated',
        'general'
      ],
      default: 'general'
    },
    fcmMessageId: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries
notificationSchema.index({ userId: 1, userType: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, userType: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

