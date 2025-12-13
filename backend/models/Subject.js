const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a subject name'],
      trim: true
    },
    // Link to Class model (for both regular and preparation)
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Please provide a class reference']
    },
    // For backward compatibility and regular classes
    class: {
      type: Number,
      required: function() {
        return !this.classId; // Required if classId not provided (backward compatibility)
      },
      min: 1,
      max: 12
    },
    board: {
      type: String,
      required: function() {
        return !this.classId; // Required if classId not provided (backward compatibility)
      },
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
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
subjectSchema.index({ name: 1, classId: 1 }, { unique: true }); // Unique combination for new structure
subjectSchema.index({ name: 1, class: 1, board: 1 }); // For backward compatibility
subjectSchema.index({ classId: 1 });
subjectSchema.index({ class: 1, board: 1 });
subjectSchema.index({ isActive: 1 });

module.exports = mongoose.model('Subject', subjectSchema);

