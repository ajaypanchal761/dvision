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
    // Cashfree identifiers
    cashfreeOrderId: {
      type: String,
      required: function () { return this.paymentMethod === 'cashfree'; },
      unique: true,
      sparse: true
    },
    cashfreePaymentId: {
      type: String,
      sparse: true
    },
    cashfreeSignature: {
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
      default: 'cashfree',
      enum: ['cashfree', 'manual']
    },
    subscriptionStartDate: {
      type: Date
    },
    subscriptionEndDate: {
      type: Date
    },
    // Webhook verification tracking
    webhookProcessed: {
      type: Boolean,
      default: false,
      description: 'Whether payment webhook has been processed'
    },
    webhookProcessedAt: {
      type: Date,
      description: 'Timestamp when webhook was processed'
    },
    verificationMethod: {
      type: String,
      enum: ['webhook', 'return_url', 'api_check'],
      description: 'How payment was verified (webhook is primary)'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      description: 'Additional payment info (failure reason, etc.)'
    },
    referralAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ subscriptionPlanId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ referralAgentId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

