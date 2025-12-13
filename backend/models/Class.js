const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['regular', 'preparation'],
      default: 'regular',
      required: true
    },
    // For regular classes
    class: {
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
    name: {
      type: String,
      required: function() {
        return this.type === 'preparation';
      },
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    // Common fields
    classCode: {
      type: String,
      required: [true, 'Please provide a class code'],
      trim: true,
      unique: true,
      uppercase: true
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
classSchema.index({ class: 1, board: 1 });
classSchema.index({ type: 1 });
classSchema.index({ classCode: 1 });
classSchema.index({ isActive: 1 });

module.exports = mongoose.model('Class', classSchema);

