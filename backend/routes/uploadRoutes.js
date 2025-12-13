const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const asyncHandler = require('../utils/asyncHandler');
const { uploadToCloudinary } = require('../config/cloudinary');

// Single file upload
router.post(
  '/single',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      // Upload to Cloudinary (local file will be deleted automatically)
      const uploadResult = await uploadToCloudinary(req.file.path, {
        folder: 'uploads',
        resource_type: 'auto'
      });

      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: uploadResult.url,
          public_id: uploadResult.public_id,
          format: uploadResult.format,
          size: uploadResult.bytes,
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file to Cloudinary',
        error: error.message
      });
    }
  })
);

module.exports = router;


