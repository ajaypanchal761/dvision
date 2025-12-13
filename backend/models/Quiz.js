const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Please provide a question'],
    trim: true
  },
  options: [{
    type: String,
    required: true,
    trim: true
  }],
  correctAnswer: {
    type: Number,
    required: [true, 'Please provide the correct answer index (0-3)'],
    min: 0,
    max: 3
  }
}, { _id: false });

const quizSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a quiz name'],
      trim: true
    },
    type: {
      type: String,
      enum: ['regular', 'preparation'],
      default: 'regular',
      required: true
    },
    // For regular classes
    classNumber: {
      type: Number,
      required: function() {
        return this.type === 'regular';
      },
      min: 1,
      max: 12
    },
    board: {
      type: String,
      required: function() {
        return this.type === 'regular';
      },
      trim: true
    },
    // For preparation classes
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: function() {
        return this.type === 'preparation';
      }
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Please provide a subject']
    },
    questions: [questionSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    deadline: {
      type: Date,
      default: null // Optional deadline
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
quizSchema.index({ type: 1, classNumber: 1, board: 1, subjectId: 1 });
quizSchema.index({ type: 1, classId: 1, subjectId: 1, isActive: 1 });
quizSchema.index({ isActive: 1, createdAt: -1 });
quizSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Quiz', quizSchema);

