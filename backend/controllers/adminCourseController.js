const Course = require('../models/Course');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// @desc    Get course statistics (Admin)
// @route   GET /api/admin/courses/statistics
// @access  Private/Admin
exports.getCourseStatistics = asyncHandler(async (req, res) => {
  // Get overall statistics (not filtered by search or pagination)
  const totalCourses = await Course.countDocuments({});
  const activeCourses = await Course.countDocuments({ isActive: true });
  const inactiveCourses = await Course.countDocuments({ isActive: false });
  
  res.status(200).json({
    success: true,
    data: {
      statistics: {
        totalCourses,
        activeCourses,
        inactiveCourses
      }
    }
  });
});

// @desc    Get all courses (Admin)
// @route   GET /api/admin/courses
// @access  Private/Admin
exports.getAllCourses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;

  const query = {};
  
  // Add search functionality
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Course.countDocuments(query);

  const courses = await Course.find(query)
    .populate('classId', 'name type')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: courses.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      courses
    }
  });
});

// @desc    Get single course (Admin)
// @route   GET /api/admin/courses/:id
// @access  Private/Admin
exports.getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('classId', 'name type');

  if (!course) {
    throw new ErrorResponse(`Course not found with id of ${req.params.id}`, 404);
  }

  res.status(200).json({
    success: true,
    data: {
      course
    }
  });
});

// @desc    Create course (Admin)
// @route   POST /api/admin/courses
// @access  Private/Admin
exports.createCourse = asyncHandler(async (req, res) => {
  const { title, type, board, class: classNumber, classId, subject, description, status } = req.body;
  
  // Parse chapters from FormData (it comes as JSON string)
  let chapters = req.body.chapters;
  if (typeof chapters === 'string') {
    try {
      chapters = JSON.parse(chapters);
    } catch (error) {
      console.error('Error parsing chapters JSON:', error);
      throw new ErrorResponse('Invalid chapters format', 400);
    }
  }
  // If chapters is not provided, default to empty array
  if (!chapters) {
    chapters = [];
  }
  
  // Get files from Multer (if uploaded via Multer)
  const thumbnailFile = req.files && req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
  const pdfFiles = req.files && req.files['chapterPdf'] ? req.files['chapterPdf'] : [];

  console.log('=== Create Course Request ===');
  console.log('Request Body:', JSON.stringify({ ...req.body, chapters: chapters?.length || 0 }, null, 2));
  console.log('Title:', title);
  console.log('Type:', type);
  console.log('Board:', board);
  console.log('Class:', classNumber);
  console.log('ClassId:', classId);
  console.log('Subject:', subject);
  console.log('Status:', status);
  console.log('Chapters:', chapters);
  console.log('Chapters Count:', chapters ? chapters.length : 0);
  console.log('Thumbnail File:', thumbnailFile ? thumbnailFile.filename : 'Not provided');
  console.log('PDF Files:', pdfFiles.length);
  console.log('=============================');

  // Validate course type
  const courseType = type || 'regular';
  if (!['regular', 'preparation'].includes(courseType)) {
    throw new ErrorResponse('Course type must be either "regular" or "preparation"', 400);
  }

  // Validate mandatory fields based on type
  if (!title || !subject || !status) {
    throw new ErrorResponse('Please provide title, subject, and status', 400);
  }

  if (courseType === 'regular') {
    if (!board || !classNumber) {
      throw new ErrorResponse('Please provide board and class for regular course', 400);
    }
  } else if (courseType === 'preparation') {
    if (!classId) {
      throw new ErrorResponse('Please provide preparation class for preparation course', 400);
    }
  }

  // Validate thumbnail (either Multer file or base64)
  const thumbnailBase64 = req.body.thumbnailBase64;
  if (!thumbnailFile && !thumbnailBase64) {
    throw new ErrorResponse('Please provide thumbnail', 400);
  }

  // Validate chapters (optional - can be empty array)
  if (!chapters || !Array.isArray(chapters)) {
    throw new ErrorResponse('Chapters must be an array', 400);
  }

  // Validate each chapter if chapters are provided
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    if (!chapter.chapterName) {
      throw new ErrorResponse(`Chapter ${i + 1}: Please provide chapter name`, 400);
    }
    // PDF can come from Multer file, base64, or existing URL
    const hasPdfFile = pdfFiles[i] !== undefined;
    const hasPdfBase64 = chapter.pdfBase64;
    const hasPdfUrl = chapter.pdfUrl;
    if (!hasPdfFile && !hasPdfBase64 && !hasPdfUrl) {
      throw new ErrorResponse(`Chapter ${i + 1}: Please provide PDF file`, 400);
    }
  }

  let subjectExists = null;
  let courseData = {
    title: title.trim(),
    type: courseType,
    subject: subject.trim(),
    description: description ? description.trim() : '',
    status: status,
    createdBy: req.user._id
  };

  if (courseType === 'regular') {
    // Check if class-board combination exists
    const classBoardExists = await Class.findOne({ 
      type: 'regular',
      class: parseInt(classNumber), 
      board: board.trim(),
      isActive: true
    });
    
    if (!classBoardExists) {
      throw new ErrorResponse(`Class ${classNumber} with board ${board} does not exist. Please create the class first.`, 400);
    }

    // Check if subject exists for this class and board
    subjectExists = await Subject.findOne({ 
      name: subject.trim(), 
      class: parseInt(classNumber), 
      board: board.trim(),
      isActive: true
    });
    
    if (!subjectExists) {
      throw new ErrorResponse(`Subject "${subject}" for Class ${classNumber} ${board} does not exist. Please create the subject first.`, 400);
    }

    courseData.board = board.trim();
    courseData.class = parseInt(classNumber);
    courseData.subjectId = subjectExists._id;

    // Check if course with same title, board, class, and subject already exists
    const existingCourse = await Course.findOne({ 
      type: 'regular',
      title: title.trim(), 
      board: board.trim(), 
      class: parseInt(classNumber), 
      subject: subject.trim() 
    });
    
    if (existingCourse) {
      throw new ErrorResponse(`Course with this title for Class ${classNumber} ${board} ${subject} already exists`, 400);
    }
  } else if (courseType === 'preparation') {
    // Check if preparation class exists
    const prepClass = await Class.findById(classId);
    if (!prepClass || prepClass.type !== 'preparation' || !prepClass.isActive) {
      throw new ErrorResponse('Preparation class not found or inactive', 400);
    }

    // For preparation courses, subject might be linked differently
    // Check if subject exists (might be linked to the preparation class)
    subjectExists = await Subject.findOne({ 
      name: subject.trim(),
      isActive: true
    }).populate('classId');
    
    // If subject doesn't exist or doesn't match, we'll still allow it but set subjectId to null
    if (subjectExists) {
      courseData.subjectId = subjectExists._id;
    }

    courseData.classId = classId;

    // Check if course with same title and classId already exists
    const existingCourse = await Course.findOne({ 
      type: 'preparation',
      title: title.trim(), 
      classId: classId,
      subject: subject.trim() 
    });
    
    if (existingCourse) {
      throw new ErrorResponse(`Course with this title for this preparation class and subject already exists`, 400);
    }
  }

  // Upload thumbnail to Cloudinary
  let thumbnailUrl = null;
  let thumbnailFilePath = null;
  
  try {
    if (thumbnailFile) {
      // Upload from Multer saved file (local path)
      thumbnailFilePath = thumbnailFile.path;
      const thumbnailResult = await uploadToCloudinary(thumbnailFilePath, {
        folder: 'dvision_uploads/courses/thumbnails',
        resource_type: 'image'
      });
      thumbnailUrl = thumbnailResult.url;
    } else if (thumbnailBase64) {
      // Upload from base64 (backward compatibility)
      const thumbnailResult = await uploadToCloudinary(thumbnailBase64, {
        folder: 'dvision_uploads/courses/thumbnails',
        resource_type: 'image'
      });
      thumbnailUrl = thumbnailResult.url;
    }
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    // Clean up local file if exists
    if (thumbnailFilePath && fs.existsSync(thumbnailFilePath)) {
      fs.unlinkSync(thumbnailFilePath);
    }
    throw new ErrorResponse('Failed to upload thumbnail', 500);
  }

  // Clean up thumbnail file after Cloudinary upload
  if (thumbnailFilePath && fs.existsSync(thumbnailFilePath)) {
    fs.unlinkSync(thumbnailFilePath);
  }

  // Process chapters: save PDFs locally (chapters are optional)
  const processedChapters = [];
  
  // Only process if chapters are provided
  if (chapters && chapters.length > 0) {
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      let pdfUrl = chapter.pdfUrl; // If already exists (local path)
      let pdfFilePath = null;
      
      try {
        // Priority: Multer file > base64 > existing URL
        if (pdfFiles[i]) {
          // PDF uploaded via Multer (saved locally)
          pdfFilePath = pdfFiles[i].path;
          // Convert absolute path to relative path for serving
          // e.g., /path/to/project/uploads/file.pdf -> /uploads/file.pdf
          const relativePath = pdfFilePath.replace(path.join(__dirname, '../../'), '').replace(/\\/g, '/');
          pdfUrl = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
        } else if (chapter.pdfBase64 && !pdfUrl) {
          // PDF provided as base64 (backward compatibility)
          // Save base64 to local file
          const base64Data = chapter.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const fileName = `dvision-chapter-${uniqueSuffix}.pdf`;
          const filePath = path.join(__dirname, '../../uploads', fileName);
          
          // Ensure uploads directory exists
          const uploadsDir = path.join(__dirname, '../../uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          fs.writeFileSync(filePath, buffer);
          pdfUrl = `/uploads/${fileName}`;
        }
      } catch (error) {
        console.error(`PDF save error for chapter ${i + 1}:`, error);
        // Clean up uploaded files on error
        if (pdfFilePath && fs.existsSync(pdfFilePath)) {
          fs.unlinkSync(pdfFilePath);
        }
        throw new ErrorResponse(`Failed to save PDF for chapter ${i + 1}`, 500);
      }

      processedChapters.push({
        chapterNumber: i + 1,
        chapterName: chapter.chapterName.trim(),
        chapterDetails: chapter.chapterDetails ? chapter.chapterDetails.trim() : '',
        pdfUrl: pdfUrl, // Local path like /uploads/filename.pdf
        pdfFileName: pdfFiles[i] ? pdfFiles[i].originalname : (chapter.pdfFileName || `chapter_${i + 1}.pdf`)
      });
    }
  }

  // Create course
  const course = await Course.create({
    ...courseData,
    thumbnail: thumbnailUrl,
    chapters: processedChapters
  });

  console.log('Course created successfully:', course);

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: {
      course
    }
  });
});

// @desc    Update course (Admin)
// @route   PUT /api/admin/courses/:id
// @access  Private/Admin
exports.updateCourse = asyncHandler(async (req, res) => {
  let course = await Course.findById(req.params.id);

  if (!course) {
    throw new ErrorResponse(`Course not found with id of ${req.params.id}`, 404);
  }

  const { title, type, board, class: classNumber, classId, subject, description, status } = req.body;
  
  // Parse chapters from FormData (it comes as JSON string)
  let chapters = req.body.chapters;
  if (typeof chapters === 'string') {
    try {
      chapters = JSON.parse(chapters);
    } catch (error) {
      console.error('Error parsing chapters JSON:', error);
      throw new ErrorResponse('Invalid chapters format', 400);
    }
  }
  // If chapters is not provided, keep existing chapters
  if (chapters === undefined || chapters === null) {
    chapters = course.chapters || [];
  }
  
  // Get files from Multer (if uploaded via Multer)
  const thumbnailFile = req.files && req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
  const pdfFiles = req.files && req.files['chapterPdf'] ? req.files['chapterPdf'] : [];
  const thumbnailBase64 = req.body.thumbnailBase64;

  // Determine course type (use existing if not provided)
  const courseType = type || course.type || 'regular';
  if (!['regular', 'preparation'].includes(courseType)) {
    throw new ErrorResponse('Course type must be either "regular" or "preparation"', 400);
  }

  // Handle type change or updates based on type
  if (courseType === 'regular') {
    // Validate required fields for regular course
    const finalBoard = board !== undefined ? board : course.board;
    const finalClass = classNumber !== undefined ? classNumber : course.class;
    
    if (!finalBoard || !finalClass) {
      throw new ErrorResponse('Board and class are required for regular course', 400);
    }

    // If class or board is being updated, check if combination exists
    if ((classNumber || board) && 
        (classNumber !== course.class || board !== course.board)) {
      const classBoardExists = await Class.findOne({ 
        type: 'regular',
        class: parseInt(finalClass), 
        board: finalBoard.trim(),
        isActive: true
      });
      
      if (!classBoardExists) {
        throw new ErrorResponse(`Class ${finalClass} with board ${finalBoard} does not exist. Please create the class first.`, 400);
      }
    }

    // If subject is being updated, check if it exists
    if (subject && subject !== course.subject) {
      const subjectExists = await Subject.findOne({ 
        name: subject.trim(), 
        class: parseInt(finalClass), 
        board: finalBoard.trim(),
        isActive: true
      });
      
      if (!subjectExists) {
        throw new ErrorResponse(`Subject "${subject}" for Class ${finalClass} ${finalBoard} does not exist. Please create the subject first.`, 400);
      }
      course.subjectId = subjectExists._id;
    }

    // Check for duplicate course
    if ((title || board || classNumber || subject) && 
        (title !== course.title || board !== course.board || 
         classNumber !== course.class || subject !== course.subject)) {
      const finalTitle = title || course.title;
      const finalSubject = subject || course.subject;
      
      const existingCourse = await Course.findOne({ 
        type: 'regular',
        title: finalTitle.trim(), 
        board: finalBoard.trim(), 
        class: parseInt(finalClass), 
        subject: finalSubject.trim(),
        _id: { $ne: req.params.id }
      });
      
      if (existingCourse) {
        throw new ErrorResponse(`Course with this title for Class ${finalClass} ${finalBoard} ${finalSubject} already exists`, 400);
      }
    }
  } else if (courseType === 'preparation') {
    // Validate required fields for preparation course
    const finalClassId = classId !== undefined ? classId : course.classId;
    
    if (!finalClassId) {
      throw new ErrorResponse('Preparation class is required for preparation course', 400);
    }

    // If classId is being updated, check if it exists
    if (classId && classId.toString() !== course.classId?.toString()) {
      const prepClass = await Class.findById(classId);
      if (!prepClass || prepClass.type !== 'preparation' || !prepClass.isActive) {
        throw new ErrorResponse('Preparation class not found or inactive', 400);
      }
    }

    // If subject is being updated
    if (subject && subject !== course.subject) {
      const subjectExists = await Subject.findOne({ 
        name: subject.trim(),
        isActive: true
      });
      
      if (subjectExists) {
        course.subjectId = subjectExists._id;
      }
    }

    // Check for duplicate course
    if ((title || classId || subject) && 
        (title !== course.title || classId?.toString() !== course.classId?.toString() || subject !== course.subject)) {
      const finalTitle = title || course.title;
      const finalSubject = subject || course.subject;
      
      const existingCourse = await Course.findOne({ 
        type: 'preparation',
        title: finalTitle.trim(), 
        classId: finalClassId,
        subject: finalSubject.trim(),
        _id: { $ne: req.params.id }
      });
      
      if (existingCourse) {
        throw new ErrorResponse(`Course with this title for this preparation class and subject already exists`, 400);
      }
    }
  }

  // Update thumbnail if provided
  if (thumbnailFile || thumbnailBase64) {
    // Delete old thumbnail from Cloudinary if exists
    if (course.thumbnail) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = course.thumbnail.split('/');
        const publicId = urlParts.slice(-2).join('/').split('.')[0];
        await deleteFromCloudinary(publicId, { resource_type: 'image' });
      } catch (error) {
        console.error('Error deleting old thumbnail:', error);
        // Continue even if deletion fails
      }
    }

    // Upload new thumbnail
    let thumbnailFilePath = null;
    try {
      if (thumbnailFile) {
        // Upload from Multer saved file (local path)
        thumbnailFilePath = thumbnailFile.path;
        const thumbnailResult = await uploadToCloudinary(thumbnailFilePath, {
          folder: 'dvision_uploads/courses/thumbnails',
          resource_type: 'image'
        });
        course.thumbnail = thumbnailResult.url;
      } else if (thumbnailBase64) {
        // Upload from base64 (backward compatibility)
        const thumbnailResult = await uploadToCloudinary(thumbnailBase64, {
          folder: 'dvision_uploads/courses/thumbnails',
          resource_type: 'image'
        });
        course.thumbnail = thumbnailResult.url;
      }
      
      // Clean up local file after Cloudinary upload
      if (thumbnailFilePath && fs.existsSync(thumbnailFilePath)) {
        fs.unlinkSync(thumbnailFilePath);
      }
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      // Clean up local file on error
      if (thumbnailFilePath && fs.existsSync(thumbnailFilePath)) {
        fs.unlinkSync(thumbnailFilePath);
      }
      throw new ErrorResponse('Failed to upload thumbnail', 500);
    }
  }

  // Update chapters if provided (chapters can be empty array)
  if (chapters && Array.isArray(chapters)) {
    // Validate chapters
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      if (!chapter.chapterName) {
        throw new ErrorResponse(`Chapter ${i + 1}: Please provide chapter name`, 400);
      }
      // PDF is required - can be existing (pdfUrl) or new (pdfFile via hasNewPdf flag)
      // Note: pdfFiles array only contains new files, so we check hasNewPdf flag
      const hasPdfFile = chapter.hasNewPdf && pdfFiles && pdfFiles.length > 0;
      const hasPdfBase64 = chapter.pdfBase64;
      const hasPdfUrl = chapter.pdfUrl; // Can be null if PDF was removed
      
      // PDF is required: either existing URL, new file, or base64
      if (!hasPdfFile && !hasPdfBase64 && !hasPdfUrl) {
        throw new ErrorResponse(`Chapter ${i + 1}: Please provide PDF file`, 400);
      }
    }

    // Process chapters: save new PDFs locally or keep existing ones
    const processedChapters = [];
    
    // Track which PDF file index we're at (since not all chapters may have new PDFs)
    let pdfFileIndex = 0;
    
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      let pdfUrl = chapter.pdfUrl || null; // Keep existing PDF URL (can be null if removed)
      let pdfFilePath = null;
      
      // Check if this chapter has a new PDF file
      // pdfFiles array only contains new files, so we need to check if chapter.hasNewPdf flag is set
      const hasNewPdf = chapter.hasNewPdf && pdfFiles.length > pdfFileIndex;
      
      if (hasNewPdf && pdfFiles[pdfFileIndex]) {
        // New PDF uploaded via Multer for this chapter
        pdfFilePath = pdfFiles[pdfFileIndex].path;
        
        // Delete old PDF if exists (local file)
        if (chapter.pdfUrl && !chapter.pdfUrl.startsWith('http')) {
          try {
            const oldFilePath = path.join(__dirname, '../../', chapter.pdfUrl);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
          } catch (error) {
            console.error(`Error deleting old PDF for chapter ${i + 1}:`, error);
          }
        }

        // Save PDF locally (already saved by Multer, just get relative path)
        try {
          // Convert absolute path to relative path for serving
          const relativePath = pdfFilePath.replace(path.join(__dirname, '../../'), '').replace(/\\/g, '/');
          pdfUrl = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
          pdfFileIndex++; // Move to next PDF file
        } catch (error) {
          console.error(`PDF save error for chapter ${i + 1}:`, error);
          // Clean up uploaded files on error
          if (fs.existsSync(pdfFilePath)) {
            fs.unlinkSync(pdfFilePath);
          }
          throw new ErrorResponse(`Failed to save PDF for chapter ${i + 1}`, 500);
        }
      } else if (chapter.pdfBase64) {
        // New PDF provided as base64 (backward compatibility)
        // Delete old PDF if exists (local file)
        if (chapter.pdfUrl && !chapter.pdfUrl.startsWith('http')) {
          try {
            const oldFilePath = path.join(__dirname, '../../', chapter.pdfUrl);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
          } catch (error) {
            console.error(`Error deleting old PDF for chapter ${i + 1}:`, error);
          }
        }

        // Save base64 to local file
        try {
          const base64Data = chapter.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const fileName = `dvision-chapter-${uniqueSuffix}.pdf`;
          const filePath = path.join(__dirname, '../../uploads', fileName);
          
          // Ensure uploads directory exists
          const uploadsDir = path.join(__dirname, '../../uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          fs.writeFileSync(filePath, buffer);
          pdfUrl = `/uploads/${fileName}`;
        } catch (error) {
          console.error(`PDF save error for chapter ${i + 1}:`, error);
          throw new ErrorResponse(`Failed to save PDF for chapter ${i + 1}`, 500);
        }
      }
      // If no new PDF and no existing PDF URL, pdfUrl remains null (PDF was removed)

      // Determine PDF file name
      let pdfFileName = chapter.pdfFileName || `chapter_${i + 1}.pdf`;
      if (hasNewPdf && pdfFileIndex > 0 && pdfFiles[pdfFileIndex - 1]) {
        pdfFileName = pdfFiles[pdfFileIndex - 1].originalname;
      } else if (chapter.pdfUrl && !hasNewPdf) {
        // Keep existing PDF file name from URL if available
        const urlParts = chapter.pdfUrl.split('/');
        pdfFileName = urlParts[urlParts.length - 1] || pdfFileName;
      }

      processedChapters.push({
        chapterNumber: i + 1,
        chapterName: chapter.chapterName.trim(),
        chapterDetails: chapter.chapterDetails ? chapter.chapterDetails.trim() : '',
        pdfUrl: pdfUrl, // Can be null if PDF was removed
        pdfFileName: pdfFileName
      });
    }

    // PDFs are saved locally, no cleanup needed (they stay on disk)

    course.chapters = processedChapters;
  }

  // Update other fields
  if (title !== undefined) course.title = title.trim();
  if (type !== undefined) course.type = courseType;
  if (description !== undefined) course.description = description.trim();
  if (status !== undefined) course.status = status;
  
  // Update type-specific fields
  if (courseType === 'regular') {
    if (board !== undefined) course.board = board.trim();
    if (classNumber !== undefined) course.class = parseInt(classNumber);
    if (subject !== undefined) course.subject = subject.trim();
    // Clear preparation-specific fields
    course.classId = undefined;
  } else if (courseType === 'preparation') {
    if (classId !== undefined) course.classId = classId;
    if (subject !== undefined) course.subject = subject.trim();
    // Clear regular-specific fields
    course.board = undefined;
    course.class = undefined;
  }

  await course.save();

  res.status(200).json({
    success: true,
    message: 'Course updated successfully',
    data: {
      course
    }
  });
});

// @desc    Delete course (Admin)
// @route   DELETE /api/admin/courses/:id
// @access  Private/Admin
exports.deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    throw new ErrorResponse(`Course not found with id of ${req.params.id}`, 404);
  }

  // Delete thumbnail from Cloudinary
  if (course.thumbnail) {
    try {
      const urlParts = course.thumbnail.split('/');
      const publicId = urlParts.slice(-2).join('/').split('.')[0];
      await deleteFromCloudinary(publicId, { resource_type: 'image' });
    } catch (error) {
      console.error('Error deleting thumbnail:', error);
      // Continue even if deletion fails
    }
  }

  // Delete all PDFs from local storage
  if (course.chapters && course.chapters.length > 0) {
    for (const chapter of course.chapters) {
      if (chapter.pdfUrl && !chapter.pdfUrl.startsWith('http')) {
        try {
          const filePath = path.join(__dirname, '../../', chapter.pdfUrl);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          console.error(`Error deleting PDF for chapter ${chapter.chapterNumber}:`, error);
          // Continue even if deletion fails
        }
      }
    }
  }

  await course.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Course deleted successfully',
    data: {}
  });
});

