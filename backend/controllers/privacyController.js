const Privacy = require('../models/Privacy');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Helper: seed default privacy policy if none exists
const seedDefaultPrivacy = async () => {
  const count = await Privacy.countDocuments();
  if (count > 0) return null;

  const defaultContent = `
Privacy Policy

1. Overview
This Privacy Policy describes our policies and procedures on the collection, use and disclosure of your information when you use the DVision Academy services, and tells you about your privacy rights and how the law protects you.
By using the Service, you agree to the collection and use of information in accordance with this Privacy Policy.

2. How We Use Your Information
We use the information we collect to:
- Provide, maintain and improve our services;
- Process your transactions and send you related information;
- Send you technical notices, updates and support messages;
- Respond to your comments, questions and requests;
- Monitor and analyze trends, usage and activities;
- Personalize and improve your experience.

3. Information Sharing
We do not sell, trade or rent your personal information to third parties. We may share your information only:
- With your consent;
- To comply with legal obligations;
- To protect our rights, safety, or property, and that of our users;
- With service providers who assist us in operating our platform.

4. Data Security
We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.

5. Your Rights
You have the right to access, update or delete your personal information at any time. You can also opt out of certain communications from us. To exercise these rights, please contact us through the Contact Us page in the app.

6. Cookies and Tracking
We use cookies and similar tracking technologies to collect and use information about how you use the Service. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent, but some parts of the Service may not function properly without cookies.

7. Children’s Privacy
Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us so we can take appropriate action.

8. Changes to This Policy
We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy in the app and updating the “Last Updated” date. You are advised to review this Privacy Policy periodically for any changes.
`.trim();

  const doc = await Privacy.create({
    title: 'Privacy Policy',
    slug: 'default',
    version: '1.0.0',
    content: defaultContent,
    isActive: true
  });

  return doc;
};

// @desc    Get active privacy policy for app (public)
// @route   GET /api/privacy
// @access  Public
exports.getPublicPrivacy = asyncHandler(async (req, res) => {
  let privacy = await Privacy.findOne({ slug: 'default', isActive: true }).sort({ createdAt: -1 });

  // Seed default if none
  if (!privacy) {
    privacy = await seedDefaultPrivacy();
  }

  res.status(200).json({
    success: true,
    data: {
      privacy
    }
  });
});

// @desc    Get all privacy versions (admin)
// @route   GET /api/privacy/admin
// @access  Private/Admin
exports.getAllPrivacy = asyncHandler(async (req, res) => {
  let items = await Privacy.find().sort({ createdAt: -1 });

  // Seed default if none exists
  if (items.length === 0) {
    const defaultPrivacy = await seedDefaultPrivacy();
    if (defaultPrivacy) {
      items = [defaultPrivacy];
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

// @desc    Create new privacy version (admin)
// @route   POST /api/privacy
// @access  Private/Admin
exports.createPrivacy = asyncHandler(async (req, res) => {
  const { title, slug, version, content, isActive } = req.body;

  if (!content) {
    throw new ErrorResponse('Please provide privacy policy content', 400);
  }

  const privacy = await Privacy.create({
    title: title || 'Privacy Policy',
    slug: slug || 'default',
    version: version || '1.0.0',
    content,
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.user?._id
  });

  res.status(201).json({
    success: true,
    message: 'Privacy Policy created successfully',
    data: {
      privacy
    }
  });
});

// @desc    Update privacy policy (admin)
// @route   PUT /api/privacy/:id
// @access  Private/Admin
exports.updatePrivacy = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let privacy = await Privacy.findById(id);

  if (!privacy) {
    throw new ErrorResponse('Privacy Policy not found', 404);
  }

  const updatableFields = ['title', 'slug', 'version', 'content', 'isActive'];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      privacy[field] = req.body[field];
    }
  });

  await privacy.save();

  res.status(200).json({
    success: true,
    message: 'Privacy Policy updated successfully',
    data: {
      privacy
    }
  });
});

// @desc    Delete privacy policy (admin)
// @route   DELETE /api/privacy/:id
// @access  Private/Admin
exports.deletePrivacy = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const privacy = await Privacy.findById(id);

  if (!privacy) {
    throw new ErrorResponse('Privacy Policy not found', 404);
  }

  await privacy.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Privacy Policy deleted successfully'
  });
});


