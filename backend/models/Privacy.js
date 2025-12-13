const mongoose = require('mongoose');

const privacySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Privacy Policy'
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
      required: [true, 'Please provide privacy policy content']
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

privacySchema.index({ slug: 1, isActive: 1 });

module.exports = mongoose.model('Privacy', privacySchema);


