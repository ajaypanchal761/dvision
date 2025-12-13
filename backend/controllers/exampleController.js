const Example = require('../models/Example');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all examples
// @route   GET /api/examples
// @access  Public
exports.getExamples = asyncHandler(async (req, res) => {
  const examples = await Example.find();
  
  res.status(200).json({
    success: true,
    count: examples.length,
    data: examples
  });
});

// @desc    Get single example
// @route   GET /api/examples/:id
// @access  Public
exports.getExampleById = asyncHandler(async (req, res) => {
  const example = await Example.findById(req.params.id);
  
  if (!example) {
    throw new ErrorResponse('Example not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: example
  });
});

// @desc    Create example
// @route   POST /api/examples
// @access  Public
exports.createExample = asyncHandler(async (req, res) => {
  const example = await Example.create(req.body);
  
  res.status(201).json({
    success: true,
    data: example
  });
});

