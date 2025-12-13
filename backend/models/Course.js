const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a course title'],
      trim: true
    },
    type: {
      type: String,
      enum: ['regular', 'preparation'],
      default: 'regular',
      required: true
    },
    // For regular classes
    board: {
      type: String,
      required: function() {
        return this.type === 'regular';
      },
      trim: true
    },
    class: {
      type: Number,
      required: function() {
        return this.type === 'regular';
      },
      min: 1,
      max: 12
    },
    // For preparation classes
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: function() {
        return this.type === 'preparation';
      }
    },
    subject: {
      type: String,
      required: [true, 'Please provide a subject'],
      trim: true
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    },
    description: {
      type: String,
      trim: true
    },
    thumbnail: {
      type: String,
      required: [true, 'Please provide a thumbnail']
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      required: [true, 'Please provide a status'],
      default: 'Active'
    },
    chapters: [{
      chapterNumber: {
        type: Number,
        required: true
      },
      chapterName: {
        type: String,
        required: [true, 'Please provide a chapter name'],
        trim: true
      },
      chapterDetails: {
        type: String,
        trim: true
      },
      pdfUrl: {
        type: String,
        required: [true, 'Please provide a PDF URL']
      },
      pdfFileName: {
        type: String
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
courseSchema.index({ type: 1, board: 1, class: 1, subject: 1 });
courseSchema.index({ type: 1, classId: 1, status: 1 });
courseSchema.index({ status: 1 });
courseSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Course', courseSchema);
