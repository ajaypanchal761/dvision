const mongoose = require('mongoose');

const notificationCampaignSchema = new mongoose.Schema(
  {
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
    notificationType: {
      type: String,
      enum: ['students', 'teachers', 'both', 'class'],
      required: [true, 'Notification type is required']
    },
    classNumber: {
      type: Number,
      default: null
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null
    },
    sentAt: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
notificationCampaignSchema.index({ notificationType: 1, createdAt: -1 });
notificationCampaignSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('NotificationCampaign', notificationCampaignSchema);

