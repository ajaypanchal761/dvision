const AboutUs = require('../models/AboutUs');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Helper: seed default about us if none exists
const seedDefaultAboutUs = async () => {
  const count = await AboutUs.countDocuments();
  if (count > 0) return null;

  const defaultContent = `
About DVision Academy

Welcome to DVision Academy - Your Gateway to Quality Education

DVision Academy is a leading online education platform dedicated to providing high-quality learning experiences for students from classes 6 to 12. We offer comprehensive courses aligned with CBSE and RBSE curricula, delivered through innovative teaching methods and cutting-edge technology.

Our Mission

Our mission is to make quality education accessible to every student, regardless of their location or background. We believe in empowering students with knowledge, skills, and confidence to excel in their academic journey and beyond.

What We Offer

1. Live Interactive Classes
   - Real-time classes with experienced teachers
   - Interactive sessions with Q&A and doubt clearing
   - Recorded sessions for revision

2. Comprehensive Course Material
   - Well-structured curriculum for classes 6-12
   - CBSE and RBSE board-specific content
   - Practice tests and assignments

3. Expert Faculty
   - Qualified and experienced teachers
   - Personalized attention and guidance
   - Regular performance tracking

4. Flexible Learning
   - Learn at your own pace
   - Access classes from anywhere
   - Replay recordings anytime

Why Choose DVision Academy?

- Quality Education: We maintain the highest standards in curriculum and teaching
- Experienced Teachers: Our faculty consists of subject matter experts
- Technology-Driven: Modern platform with seamless user experience
- Student Support: Dedicated support team to help you succeed
- Affordable Pricing: Quality education at competitive prices

Our Commitment

At DVision Academy, we are committed to:
- Providing the best learning experience
- Supporting students in achieving their academic goals
- Continuously improving our platform and content
- Maintaining transparency and trust

Join thousands of successful students who have transformed their learning journey with DVision Academy. Start your path to academic excellence today!
`.trim();

  const doc = await AboutUs.create({
    title: 'About Us',
    slug: 'default',
    version: '1.0.0',
    content: defaultContent,
    isActive: true
  });

  return doc;
};

// @desc    Get active about us for app (public)
// @route   GET /api/about
// @access  Public
exports.getPublicAboutUs = asyncHandler(async (req, res) => {
  let aboutUs = await AboutUs.findOne({ slug: 'default', isActive: true }).sort({ createdAt: -1 });

  // Seed default if none
  if (!aboutUs) {
    aboutUs = await seedDefaultAboutUs();
  }

  res.status(200).json({
    success: true,
    data: {
      aboutUs
    }
  });
});

// @desc    Get all about us versions (admin)
// @route   GET /api/about/admin
// @access  Private/Admin
exports.getAllAboutUs = asyncHandler(async (req, res) => {
  let items = await AboutUs.find().sort({ createdAt: -1 });

  // Seed default if none exists
  if (items.length === 0) {
    const defaultAboutUs = await seedDefaultAboutUs();
    if (defaultAboutUs) {
      items = [defaultAboutUs];
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

// @desc    Create new about us version (admin)
// @route   POST /api/about
// @access  Private/Admin
exports.createAboutUs = asyncHandler(async (req, res) => {
  const { title, slug, version, content, isActive } = req.body;

  if (!content) {
    throw new ErrorResponse('Please provide about us content', 400);
  }

  const aboutUs = await AboutUs.create({
    title: title || 'About Us',
    slug: slug || 'default',
    version: version || '1.0.0',
    content,
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    message: 'About Us created successfully',
    data: {
      aboutUs
    }
  });
});

// @desc    Update about us (admin)
// @route   PUT /api/about/:id
// @access  Private/Admin
exports.updateAboutUs = asyncHandler(async (req, res) => {
  const { title, slug, version, content, isActive } = req.body;

  let aboutUs = await AboutUs.findById(req.params.id);

  if (!aboutUs) {
    throw new ErrorResponse('About Us not found', 404);
  }

  if (title !== undefined) aboutUs.title = title;
  if (slug !== undefined) aboutUs.slug = slug;
  if (version !== undefined) aboutUs.version = version;
  if (content !== undefined) aboutUs.content = content;
  if (isActive !== undefined) aboutUs.isActive = isActive;

  await aboutUs.save();

  res.status(200).json({
    success: true,
    message: 'About Us updated successfully',
    data: {
      aboutUs
    }
  });
});

// @desc    Delete about us (admin)
// @route   DELETE /api/about/:id
// @access  Private/Admin
exports.deleteAboutUs = asyncHandler(async (req, res) => {
  const aboutUs = await AboutUs.findById(req.params.id);

  if (!aboutUs) {
    throw new ErrorResponse('About Us not found', 404);
  }

  await aboutUs.deleteOne();

  res.status(200).json({
    success: true,
    message: 'About Us deleted successfully'
  });
});

