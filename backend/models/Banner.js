const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a banner title'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      required: [true, 'Please provide a banner image']
    },
    imagePublicId: {
      type: String // Cloudinary public ID for deletion
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

bannerSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Banner', bannerSchema);

