const Terms = require('../models/Terms');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Helper: seed default terms if none exists
const seedDefaultTerms = async () => {
  const count = await Terms.countDocuments();
  if (count > 0) return null;

  const defaultContent = `
Terms & Conditions

This Mobile Application End User Terms and Conditions and Privacy Policy is a binding agreement between you and DVision Academy. This Agreement governs your use of the application on mobile platforms and devices.

1. License Grant
- You may download, install and use the application for your personal, non-commercial use on a mobile device you own or control.
- You may access content and services made available through the application strictly in accordance with these Terms.

2. License Restrictions
- You must not copy, modify, reverse engineer, or distribute the application.
- You must not remove or alter any copyright or trademark notices.
- You must not use the application in any hazardous or safety-critical environments.

3. Reservation of Rights
All rights, title and interest in and to the application remain with DVision Academy and its licensors.

4. Updates
You agree to install all updates to ensure proper functioning of the application. All updates are considered part of the application and subject to these Terms.

By using the DVision Academy application, you confirm that you have read, understood and agree to be bound by these Terms & Conditions.
`.trim();

  const doc = await Terms.create({
    title: 'Terms & Conditions',
    slug: 'default',
    version: '1.0.0',
    content: defaultContent,
    isActive: true
  });

  return doc;
};

// @desc    Get active terms for app (public)
// @route   GET /api/terms
// @access  Public
exports.getPublicTerms = asyncHandler(async (req, res) => {
  let terms = await Terms.findOne({ slug: 'default', isActive: true }).sort({ createdAt: -1 });

  // Seed default if none
  if (!terms) {
    terms = await seedDefaultTerms();
  }

  res.status(200).json({
    success: true,
    data: {
      terms
    }
  });
});

// @desc    Get all terms versions (admin)
// @route   GET /api/terms/admin
// @access  Private/Admin
exports.getAllTerms = asyncHandler(async (req, res) => {
  let items = await Terms.find().sort({ createdAt: -1 });

  // Seed default if none exists
  if (items.length === 0) {
    const defaultTerms = await seedDefaultTerms();
    if (defaultTerms) {
      items = [defaultTerms];
    }
  }

  res.status(200).json({
    success: true,
    count: items.length,
    data: {
      items
    }
  });
});

// @desc    Create new terms version (admin)
// @route   POST /api/terms
// @access  Private/Admin
exports.createTerms = asyncHandler(async (req, res) => {
  const { title, slug, version, content, isActive } = req.body;

  if (!content) {
    throw new ErrorResponse('Please provide terms & conditions content', 400);
  }

  const terms = await Terms.create({
    title: title || 'Terms & Conditions',
    slug: slug || 'default',
    version: version || '1.0.0',
    content,
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.user?._id
  });

  res.status(201).json({
    success: true,
    message: 'Terms & Conditions created successfully',
    data: {
      terms
    }
  });
});

// @desc    Update terms (admin)
// @route   PUT /api/terms/:id
// @access  Private/Admin
exports.updateTerms = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let terms = await Terms.findById(id);

  if (!terms) {
    throw new ErrorResponse('Terms not found', 404);
  }

  const updatableFields = ['title', 'slug', 'version', 'content', 'isActive'];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      terms[field] = req.body[field];
    }
  });

  await terms.save();

  res.status(200).json({
    success: true,
    message: 'Terms & Conditions updated successfully',
    data: {
      terms
    }
  });
});

// @desc    Delete terms (admin)
// @route   DELETE /api/terms/:id
// @access  Private/Admin
exports.deleteTerms = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const terms = await Terms.findById(id);

  if (!terms) {
    throw new ErrorResponse('Terms not found', 404);
  }

  await terms.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Terms & Conditions deleted successfully'
  });
});


