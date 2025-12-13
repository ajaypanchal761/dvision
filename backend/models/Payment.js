const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Please provide a student ID']
    },
    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: [true, 'Please provide a subscription plan ID']
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Please provide Razorpay order ID'],
      unique: true
    },
    razorpayPaymentId: {
      type: String,
      sparse: true
    },
    razorpaySignature: {
      type: String,
      sparse: true
    },
    amount: {
      type: Number,
      required: [true, 'Please provide payment amount'],
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      default: 'razorpay'
    },
    subscriptionStartDate: {
      type: Date
    },
    subscriptionEndDate: {
      type: Date
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Indexes
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ subscriptionPlanId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);

