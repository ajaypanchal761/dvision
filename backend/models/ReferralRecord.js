const mongoose = require('mongoose');

const referralRecordSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: [true, 'Please provide an agent ID']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Please provide a student ID']
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: [true, 'Please provide a payment ID']
  },
  subscriptionPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan'
  },
  amount: {
    type: Number,
    required: [true, 'Please provide the subscription amount'],
    min: 0
  },
  subscriptionDate: {
    type: Date,
    required: [true, 'Please provide the subscription date'],
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'paid'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Indexes
referralRecordSchema.index({ agentId: 1 });
referralRecordSchema.index({ studentId: 1 });
referralRecordSchema.index({ subscriptionDate: 1 });
referralRecordSchema.index({ status: 1 });
referralRecordSchema.index({ agentId: 1, subscriptionDate: 1 }); // For month-wise queries

module.exports = mongoose.model('ReferralRecord', referralRecordSchema);



