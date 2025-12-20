const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
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

// Download file (serve local uploads securely or proxy external URL)
router.get(
  '/download',
  asyncHandler(async (req, res) => {
    const { file, url } = req.query;

    // If `file` param provided -> serve local file from uploads directory
    if (file) {
      // Normalize and prevent path traversal
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      // decode in case value is URL encoded
      let normalized = decodeURIComponent(String(file || '')).replace(/^\/+/, '');
      // strip a leading 'uploads/' segment if caller included it
      if (normalized.toLowerCase().startsWith('uploads/')) {
        normalized = normalized.slice('uploads/'.length);
      }
      const filePath = path.join(uploadsDir, normalized);
      const resolved = path.resolve(filePath);

      if (!resolved.startsWith(path.resolve(uploadsDir))) {
        return res.status(400).json({ success: false, message: 'Invalid file path' });
      }

      if (!fs.existsSync(resolved)) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      return res.download(resolved);
    }

    // If `url` param provided -> proxy remote URL and force download
    if (url) {
      try {
        const parsedUrl = new URL(url);
        const filename = path.basename(parsedUrl.pathname) || 'file';

        const response = await axios.get(url, { responseType: 'stream' });
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        return response.data.pipe(res);
      } catch (err) {
        console.error('Error proxying remote file:', err.message || err);
        return res.status(500).json({ success: false, message: 'Failed to download remote file' });
      }
    }

    return res.status(400).json({ success: false, message: 'Provide `file` or `url` query parameter' });
  })
);

module.exports = router;



