const ContactInfo = require('../models/ContactInfo');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Helper: seed default contact info if none exists
const seedDefaultContactInfo = async () => {
  const count = await ContactInfo.countDocuments();
  if (count > 0) return null;

  const doc = await ContactInfo.create({
    title: 'Need help? Contact DVision Academy Support',
    subtitle: 'Our team is available to help you with classes, subscriptions, technical issues and more.',
    email: 'support@dvisionacademy.com',
    phone: '+91 98765 43210',
    whatsapp: '+91 98765 43210',
    address: 'DVision Academy, Jaipur, Rajasthan, India',
    supportHours: 'Mon - Sat, 10:00 AM to 7:00 PM',
    additionalNotes: 'For urgent issues related to live classes, please use WhatsApp or call directly.'
  });

  return doc;
};

// @desc    Get contact info for students/teachers (public)
// @route   GET /api/contact
// @access  Public
exports.getPublicContactInfo = asyncHandler(async (req, res) => {
  let items = await ContactInfo.find({ isActive: true }).sort({ createdAt: 1 });

  // Seed default data if empty
  if (!items || items.length === 0) {
    const seeded = await seedDefaultContactInfo();
    items = seeded ? [seeded] : [];
  }

  res.status(200).json({
    success: true,
    data: {
      items
    }
  });
});

// @desc    Get all contact info entries (admin)
// @route   GET /api/contact/admin
// @access  Private/Admin
exports.getAllContactInfo = asyncHandler(async (req, res) => {
  const items = await ContactInfo.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: items.length,
    data: {
      items
    }
  });
});

// @desc    Create contact info entry (admin)
// @route   POST /api/contact
// @access  Private/Admin
exports.createContactInfo = asyncHandler(async (req, res) => {
  const { title, subtitle, email, phone, whatsapp, address, supportHours, additionalNotes, isActive } = req.body;

  if (!email) {
    throw new ErrorResponse('Please provide a support email address', 400);
  }

  const contactInfo = await ContactInfo.create({
    title,
    subtitle,
    email,
    phone,
    whatsapp,
    address,
    supportHours,
    additionalNotes,
    isActive,
    createdBy: req.user?._id
  });

  res.status(201).json({
    success: true,
    message: 'Contact info created successfully',
    data: {
      contactInfo
    }
  });
});

// @desc    Update contact info entry (admin)
// @route   PUT /api/contact/:id
// @access  Private/Admin
exports.updateContactInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let contactInfo = await ContactInfo.findById(id);

  if (!contactInfo) {
    throw new ErrorResponse('Contact info not found', 404);
  }

  const updatableFields = [
    'title',
    'subtitle',
    'email',
    'phone',
    'whatsapp',
    'address',
    'supportHours',
    'additionalNotes',
    'isActive'
  ];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      contactInfo[field] = req.body[field];
    }
  });

  await contactInfo.save();

  res.status(200).json({
    success: true,
    message: 'Contact info updated successfully',
    data: {
      contactInfo
    }
  });
});

// @desc    Delete contact info entry (admin)
// @route   DELETE /api/contact/:id
// @access  Private/Admin
exports.deleteContactInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const contactInfo = await ContactInfo.findById(id);

  if (!contactInfo) {
    throw new ErrorResponse('Contact info not found', 404);
  }

  await contactInfo.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Contact info deleted successfully'
  });
});


