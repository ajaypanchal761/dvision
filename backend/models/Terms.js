const mongoose = require('mongoose');

const termsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Terms & Conditions'
    },
    slug: {
      type: String,
      default: 'default',
      index: true
    },
    version: {
      type: String,
      default: '1.0.0'
    },
    content: {
      type: String,
      required: [true, 'Please provide terms & conditions content']
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

termsSchema.index({ slug: 1, isActive: 1 });

module.exports = mongoose.model('Terms', termsSchema);


