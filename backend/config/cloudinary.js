const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string|Buffer} filePathOrDataUri - Path to the file on local filesystem or data URI/buffer
 * @param {Object|string} options - Upload options (folder, resource_type, public_id) or folder string
 * @returns {Promise<Object>} - Upload result
 */
const uploadToCloudinary = async (filePathOrDataUri, options = {}) => {
  try {
    // Handle options as either folder string or object
    let folder = 'dvision_uploads';
    let resource_type = 'auto';
    let public_id = null;

    if (typeof options === 'string') {
      // Legacy: options is just folder string
      folder = options;
    } else if (typeof options === 'object') {
      folder = options.folder || folder;
      resource_type = options.resource_type || resource_type;
      public_id = options.public_id || null;
    }

    const uploadOptions = {
      folder: `dvision_uploads/${folder}`,
      resource_type: resource_type,
      transformation: resource_type === 'image' ? [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' }
      ] : undefined
    };

    if (public_id) {
      uploadOptions.public_id = public_id;
    }

    // Check if it's a data URI or file path
    const isDataUri = typeof filePathOrDataUri === 'string' && filePathOrDataUri.startsWith('data:');
    
    let result;
    if (isDataUri) {
      // Upload data URI directly
      result = await cloudinary.uploader.upload(filePathOrDataUri, uploadOptions);
    } else {
      // Upload file path
      result = await cloudinary.uploader.upload(filePathOrDataUri, uploadOptions);
      
      // Delete local file after upload (only if it's a file path)
      const fs = require('fs');
      if (fs.existsSync(filePathOrDataUri)) {
        fs.unlinkSync(filePathOrDataUri);
      }
    }

    return {
      success: true,
      secure_url: result.secure_url,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file to Cloudinary: ' + error.message);
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} public_id - Public ID of the file
 * @param {Object} options - Options including resource_type
 * @returns {Promise<Object>} - Deletion result
 */
const deleteFromCloudinary = async (public_id, options = {}) => {
  try {
    const destroyOptions = {
      resource_type: options.resource_type || 'image'
    };
    const result = await cloudinary.uploader.destroy(public_id, destroyOptions);
    return {
      success: result.result === 'ok',
      message: result.result === 'ok' ? 'File deleted successfully' : 'File not found'
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file from Cloudinary');
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  cloudinary // Export configured cloudinary instance
};


