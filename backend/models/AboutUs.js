const mongoose = require('mongoose');

const aboutUsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'About Us'
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
      required: [true, 'Please provide about us content']
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

aboutUsSchema.index({ slug: 1, isActive: 1 });

module.exports = mongoose.model('AboutUs', aboutUsSchema);

