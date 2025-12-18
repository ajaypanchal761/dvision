const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema(
  {
    timetableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timetable',
      required: [true, 'Timetable ID is required'],
      index: true
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required'],
      index: true
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required'],
      index: true
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject ID is required']
    },
    title: {
      type: String,
      required: [true, 'Class title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    agoraChannelName: {
      type: String,
      required: false, // Will be set after creation
      unique: true,
      sparse: true, // Allow multiple nulls
      index: true
    },
    agoraAppId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'cancelled'],
      default: 'scheduled',
      index: true
    },
    scheduledStartTime: {
      type: Date,
      required: true,
      index: true
    },
    scheduledEndTime: {
      type: Date
    },
    actualStartTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number, // in minutes
      default: 0
    },
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'participants.userType'
        },
        userType: {
          type: String,
          enum: ['Student', 'Teacher']
        },
        joinedAt: {
          type: Date,
          default: Date.now
        },
        leftAt: Date,
        isMuted: {
          type: Boolean,
          default: false
        },
        isVideoEnabled: {
          type: Boolean,
          default: true
        },
        hasRaisedHand: {
          type: Boolean,
          default: false
        }
      }
    ],
    chatMessages: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'chatMessages.userType'
        },
        userType: {
          type: String,
          enum: ['Student', 'Teacher']
        },
        userName: {
          type: String,
          required: true
        },
        message: {
          type: String,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        readBy: [{
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
          },
          readAt: {
            type: Date,
            default: Date.now
          }
        }]
      }
    ],
    recording: {
      status: {
        type: String,
        enum: ['pending', 'recording', 'processing', 'uploading', 'completed', 'failed'],
        default: 'pending'
      },
      resourceId: String,
      sid: String,
      recorderUid: String,
      remoteUrl: String,
      localPath: String,
      s3Url: String,
      s3Key: String,
      duration: Number, // in seconds
      fileSize: Number, // in bytes
      uploadedAt: Date,
      error: String
    },
    isRecordingEnabled: {
      type: Boolean,
      default: true
    },
    notificationSent: {
      type: Boolean,
      default: false
    },
    notificationSentAt: Date
  },
  {
    timestamps: true
  }
);

// Indexes
liveClassSchema.index({ teacherId: 1, status: 1 });
liveClassSchema.index({ classId: 1, status: 1 });
liveClassSchema.index({ status: 1, scheduledStartTime: 1 });
liveClassSchema.index({ 'participants.userId': 1 });

module.exports = mongoose.model('LiveClass', liveClassSchema);

