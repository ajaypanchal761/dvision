const mongoose = require('mongoose');

const contactInfoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Contact Support'
    },
    subtitle: {
      type: String,
      default: 'We are here to help you with any questions about DVision Academy.'
    },
    email: {
      type: String,
      required: [true, 'Please provide a support email address'],
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    whatsapp: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    supportHours: {
      type: String,
      default: 'Mon - Sat, 10:00 AM to 7:00 PM'
    },
    additionalNotes: {
      type: String,
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

contactInfoSchema.index({ isActive: 1, createdAt: 1 });

module.exports = mongoose.model('ContactInfo', contactInfoSchema);


