const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema(
  {
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
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required'],
      index: true
    },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: [true, 'Day of week is required'],
      index: true
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time in HH:MM format']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time in HH:MM format']
    },
    thumbnail: {
      type: String,
      trim: true
    },
    topic: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    notificationSent: {
      type: Boolean,
      default: false
    },
    notificationSentAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
timetableSchema.index({ classId: 1, dayOfWeek: 1, isActive: 1 });
timetableSchema.index({ teacherId: 1, dayOfWeek: 1, isActive: 1 });
timetableSchema.index({ classId: 1, isActive: 1 });
timetableSchema.index({ dayOfWeek: 1, startTime: 1 });

// Prevent duplicate entries for same class, subject, day, and time slot
timetableSchema.index(
  { classId: 1, subjectId: 1, dayOfWeek: 1, startTime: 1 },
  { unique: true }
);

module.exports = mongoose.model('Timetable', timetableSchema);

