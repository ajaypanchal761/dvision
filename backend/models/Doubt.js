const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Please provide a student ID'],
      index: true
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Please provide a teacher ID'],
      index: true
    },
    question: {
      type: String,
      required: [true, 'Please provide a question'],
      trim: true
    },
    images: [{
      type: String, // URLs to images stored in Cloudinary or file system
      trim: true
    }],
    status: {
      type: String,
      enum: ['Pending', 'Answered', 'Resolved'],
      default: 'Pending',
      index: true
    },
    answer: {
      type: String,
      trim: true,
      default: null
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'answeredByModel', // Can be either Teacher or Admin
      default: null
    },
    answeredByModel: {
      type: String,
      enum: ['Teacher', 'Admin'],
      default: null
    },
    answeredAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
doubtSchema.index({ studentId: 1, createdAt: -1 });
doubtSchema.index({ teacherId: 1, createdAt: -1 });
doubtSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Doubt', doubtSchema);

