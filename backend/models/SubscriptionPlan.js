const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a plan name'],
      trim: true
    },
    type: {
      type: String,
      enum: ['regular', 'preparation'],
      default: 'regular',
      required: true
    },
    // For regular plans
    board: {
      type: String,
      required: function() {
        return this.type === 'regular';
      },
      enum: ['CBSE', 'RBSE'],
      trim: true
    },
    classes: [{
      type: Number,
      required: function() {
        return this.type === 'regular';
      },
      min: 1,
      max: 12
    }],
    // For preparation plans
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: function() {
        return this.type === 'preparation';
      }
    },
    duration: {
      type: String,
      required: [true, 'Please provide a duration type'],
      enum: ['monthly', 'quarterly', 'half_yearly', 'yearly', 'demo'],
      trim: true
    },
    // For demo plans: custom validity in days (admin decides)
    validityDays: {
      type: Number,
      min: 1,
      required: function() {
        return this.duration === 'demo';
      }
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: 0
    },
    originalPrice: {
      type: Number,
      min: 0
    },
    description: {
      type: String,
      trim: true
    },
    features: [{
      type: String,
      trim: true
    }],
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
subscriptionPlanSchema.index({ type: 1 });
subscriptionPlanSchema.index({ board: 1, duration: 1 });
subscriptionPlanSchema.index({ board: 1, classes: 1 });
subscriptionPlanSchema.index({ classId: 1, duration: 1 });
subscriptionPlanSchema.index({ isActive: 1 });
subscriptionPlanSchema.index({ board: 1, duration: 1, isActive: 1 });
subscriptionPlanSchema.index({ classId: 1, duration: 1, isActive: 1 });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

