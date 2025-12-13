const Banner = require('../models/Banner');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Get all banners (Public - only active)
// @route   GET /api/banners
// @access  Public
exports.getPublicBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: banners.length,
    data: {
      banners
    }
  });
});

// @desc    Get all banners (Admin)
// @route   GET /api/admin/banners
// @access  Private/Admin
exports.getAllBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find()
    .sort({ order: 1, createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: banners.length,
    data: {
      banners
    }
  });
});

// @desc    Get single banner (Admin)
// @route   GET /api/admin/banners/:id
// @access  Private/Admin
exports.getBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  
  if (!banner) {
    throw new ErrorResponse('Banner not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: {
      banner
    }
  });
});

// @desc    Create banner (Admin)
// @route   POST /api/admin/banners
// @access  Private/Admin
exports.createBanner = asyncHandler(async (req, res) => {
  const { title, description, imageBase64, link, order, isActive } = req.body;
  
  if (!title || !imageBase64) {
    throw new ErrorResponse('Please provide title and image', 400);
  }
  
  let imageUrl = null;
  let imagePublicId = null;
  
  // Upload image to Cloudinary
  try {
    const uploadResult = await uploadToCloudinary(imageBase64, {
      folder: 'dvision_uploads/banners',
      resource_type: 'image'
    });
    imageUrl = uploadResult.url;
    imagePublicId = uploadResult.public_id;
  } catch (error) {
    console.error('Image upload error:', error);
    throw new ErrorResponse('Failed to upload banner image', 500);
  }
  
  const banner = await Banner.create({
    title,
    description,
    image: imageUrl,
    imagePublicId,
    link,
    order: order || 0,
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.user._id
  });
  
  res.status(201).json({
    success: true,
    message: 'Banner created successfully',
    data: {
      banner
    }
  });
});

// @desc    Update banner (Admin)
// @route   PUT /api/admin/banners/:id
// @access  Private/Admin
exports.updateBanner = asyncHandler(async (req, res) => {
  const { title, description, imageBase64, link, order, isActive } = req.body;
  
  let banner = await Banner.findById(req.params.id);
  
  if (!banner) {
    throw new ErrorResponse('Banner not found', 404);
  }
  
  if (title) banner.title = title;
  if (description !== undefined) banner.description = description;
  if (link !== undefined) banner.link = link;
  if (order !== undefined) banner.order = parseInt(order);
  if (isActive !== undefined) banner.isActive = isActive;
  
  // Handle image update
  if (imageBase64) {
    // Delete old image
    if (banner.imagePublicId) {
      try {
        await deleteFromCloudinary(banner.imagePublicId);
      } catch (error) {
        console.error('Error deleting old image:', error);
      }
    }
    
    // Upload new image
    try {
      const uploadResult = await uploadToCloudinary(imageBase64, {
        folder: 'dvision_uploads/banners',
        resource_type: 'image'
      });
      banner.image = uploadResult.url;
      banner.imagePublicId = uploadResult.public_id;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new ErrorResponse('Failed to upload banner image', 500);
    }
  }
  
  await banner.save();
  
  res.status(200).json({
    success: true,
    message: 'Banner updated successfully',
    data: {
      banner
    }
  });
});

// @desc    Delete banner (Admin)
// @route   DELETE /api/admin/banners/:id
// @access  Private/Admin
exports.deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  
  if (!banner) {
    throw new ErrorResponse('Banner not found', 404);
  }
  
  // Delete image from Cloudinary
  if (banner.imagePublicId) {
    try {
      await deleteFromCloudinary(banner.imagePublicId);
    } catch (error) {
      console.error('Error deleting image:', error);
      // Continue with banner deletion even if image deletion fails
    }
  }
  
  await banner.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Banner deleted successfully'
  });
});

