const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema(
  {
    liveClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LiveClass',
      required: [true, 'Live class ID is required'],
      index: true
    },
    timetableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timetable',
      required: true,
      index: true
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    localPath: {
      type: String,
      // A local path is required only when we did not receive an S3 URL directly
      required: function () {
        return !this.s3Url;
      }
    },
    s3Url: {
      type: String
    },
    s3Key: {
      type: String,
      index: true
    },
    status: {
      type: String,
      enum: ['recording', 'processing', 'uploading', 'completed', 'failed'],
      default: 'recording',
      index: true
    },
    duration: {
      type: Number, // in seconds
      default: 0
    },
    fileSize: {
      type: Number, // in bytes
      default: 0
    },
    thumbnail: {
      type: String
    },
    uploadedAt: {
      type: Date
    },
    error: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
recordingSchema.index({ classId: 1, isActive: 1 });
recordingSchema.index({ teacherId: 1, isActive: 1 });
recordingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Recording', recordingSchema);

