const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create a new quiz
// @route   POST /api/admin/quizzes or /api/teacher/quizzes
// @access  Private/Admin or Private/Teacher
exports.createQuiz = asyncHandler(async (req, res) => {
  const { name, type, classNumber, board, classId, subjectId, questions, isActive, deadline } = req.body;
  const Class = require('../models/Class');

  // Validation
  if (!name || !name.trim()) {
    throw new ErrorResponse('Please provide a quiz name', 400);
  }

  // Validate quiz type
  const quizType = type || 'regular';
  if (!['regular', 'preparation'].includes(quizType)) {
    throw new ErrorResponse('Quiz type must be either "regular" or "preparation"', 400);
  }

  if (!subjectId) {
    throw new ErrorResponse('Please provide a subject', 400);
  }

  // Validate subject exists
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new ErrorResponse('Subject not found', 404);
  }

  // Type-specific validation
  if (quizType === 'regular') {
    if (!classNumber || classNumber < 1 || classNumber > 12) {
      throw new ErrorResponse('Please provide a valid class number (1-12) for regular quiz', 400);
    }
    if (!board || !board.trim()) {
      throw new ErrorResponse('Please provide a board for regular quiz', 400);
    }
  } else if (quizType === 'preparation') {
    if (!classId) {
      throw new ErrorResponse('Please provide a preparation class for preparation quiz', 400);
    }
    // Validate preparation class exists
    const prepClass = await Class.findById(classId);
    if (!prepClass || prepClass.type !== 'preparation' || !prepClass.isActive) {
      throw new ErrorResponse('Preparation class not found or inactive', 400);
    }
  }

  // Validate questions
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    throw new ErrorResponse('Please provide at least one question', 400);
  }

  // Validate each question
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.question || !q.question.trim()) {
      throw new ErrorResponse(`Question ${i + 1}: Please provide a question text`, 400);
    }
    if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
      throw new ErrorResponse(`Question ${i + 1}: Please provide exactly 4 options`, 400);
    }
    for (let j = 0; j < q.options.length; j++) {
      if (!q.options[j] || !q.options[j].trim()) {
        throw new ErrorResponse(`Question ${i + 1}, Option ${j + 1}: Please provide option text`, 400);
      }
    }
    if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer > 3) {
      throw new ErrorResponse(`Question ${i + 1}: Please provide a valid correct answer index (0-3)`, 400);
    }
  }

  // Create quiz data
  const quizData = {
    name: name.trim(),
    type: quizType,
    subjectId,
    questions,
    isActive: isActive !== undefined ? isActive : true,
    deadline: deadline || null,
    createdBy: req.user._id
  };

  // Add type-specific fields
  if (quizType === 'regular') {
    quizData.classNumber = classNumber;
    quizData.board = board.trim();

    // Handle classId for regular quiz
    if (classId) {
      // If classId provided, validate it matches
      const checkClass = await Class.findById(classId);
      if (checkClass && checkClass.type === 'regular' &&
        checkClass.class === parseInt(classNumber) &&
        checkClass.board === board.trim()) {
        quizData.classId = classId;
      }
    }

    // If classId not set yet (not provided or invalid), try to find it
    if (!quizData.classId) {
      const regularClass = await Class.findOne({
        type: 'regular',
        class: parseInt(classNumber),
        board: board.trim(),
        isActive: true
      });
      if (regularClass) {
        quizData.classId = regularClass._id;
      }
    }
  } else if (quizType === 'preparation') {
    quizData.classId = classId;
  }

  // Create quiz
  const quiz = await Quiz.create(quizData);

  // Populate subject and classId before sending response
  await quiz.populate('subjectId', 'name');
  if (quiz.classId) {
    await quiz.populate('classId', 'name type');
  }

  res.status(201).json({
    success: true,
    message: 'Quiz created successfully',
    data: {
      quiz
    }
  });
});

// @desc    Get all quizzes
// @route   GET /api/admin/quizzes or /api/teacher/quizzes or /api/student/quizzes
// @access  Private/Admin or Private/Teacher or Private/Student
exports.getAllQuizzes = asyncHandler(async (req, res) => {
  const { classNumber, board, subjectId, isActive } = req.query;
  const isStudent = req.user.role === 'student';
  const isTeacher = req.user.role === 'teacher';
  const Payment = require('../models/Payment');
  const Class = require('../models/Class');

  // Build query
  const query = {};

  // For students, automatically filter by their class and board, and only active quizzes
  if (isStudent) {
    const Student = require('../models/Student');
    const student = await Student.findById(req.user._id);

    if (!student) {
      throw new ErrorResponse('Student not found', 404);
    }

    query.isActive = true;

    // Check active subscriptions from both sources
    const now = new Date();
    const SubscriptionPlan = require('../models/SubscriptionPlan');

    // Get from activeSubscriptions array
    const activeSubsFromArray = (student.activeSubscriptions || []).filter(sub =>
      new Date(sub.endDate) >= now
    );

    // Get from Payment records
    const activePayments = await Payment.find({
      studentId: student._id,
      status: 'completed',
      subscriptionEndDate: { $gte: now }
    })
      .populate({
        path: 'subscriptionPlanId',
        select: 'type board classes classId',
        populate: {
          path: 'classId',
          select: '_id name classCode'
        }
      });

    // Check if student has valid active REGULAR subscription for their CURRENT class/board
    const normalizedBoard = student.board ? student.board.trim() : student.board;
    const normalizedClass = parseInt(student.class);

    const hasActiveClassSubscription = activePayments.some(payment =>
      payment.subscriptionPlanId &&
      payment.subscriptionPlanId.type === 'regular' &&
      payment.subscriptionPlanId.board === normalizedBoard &&
      payment.subscriptionPlanId.classes &&
      payment.subscriptionPlanId.classes.includes(normalizedClass)
    ) || activeSubsFromArray.some(sub =>
      sub.type === 'regular' &&
      sub.board === normalizedBoard &&
      sub.class === normalizedClass
    );

    // Collect Preparation Plan criteria (Class IDs)
    const prepClassIdsSet = new Set();

    // From Payments
    activePayments.forEach(payment => {
      const plan = payment.subscriptionPlanId;
      if (plan && plan.type === 'preparation' && plan.classId) {
        const id = plan.classId._id || plan.classId;
        if (id) prepClassIdsSet.add(id.toString());
      }
    });

    // From Array Subs
    activeSubsFromArray.forEach(sub => {
      if (sub.type === 'preparation' && sub.classId) {
        const id = sub.classId._id || sub.classId;
        if (id) prepClassIdsSet.add(id.toString());
      }
    });

    const preparationClassIds = Array.from(prepClassIdsSet)
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    // Build queries for both types
    // Note: query already contains { isActive: true }

    // Find the Class ID for the student's regular profile class
    let studentClassId = null;
    if (hasActiveClassSubscription) {
      const studentClassDoc = await Class.findOne({
        type: 'regular',
        class: normalizedClass,
        board: normalizedBoard,
        isActive: true
      });
      if (studentClassDoc) {
        studentClassId = studentClassDoc._id;
      }
    }

    const regularQuery = {
      ...query
    };

    // If student has active sub and we found the class ID
    if (hasActiveClassSubscription && studentClassId) {
      // Match either by specific classId OR (legacy) by board+number if classId is missing
      regularQuery.$or = [
        { classId: studentClassId },
        { classId: { $exists: false }, classNumber: normalizedClass, board: normalizedBoard }
      ];
    } else {
      // Fallback if class ID lookup failed but sub exists (should rely on board/number)
      regularQuery.classNumber = normalizedClass;
      regularQuery.board = normalizedBoard;
    }

    const preparationQuery = {
      ...query,
      classId: { $in: preparationClassIds }
    };

    // Fetch Regular Quizzes ONLY if student has active subscription for their profile class
    let regularQuizzes = [];
    if (hasActiveClassSubscription) {
      regularQuizzes = await Quiz.find(regularQuery)
        .sort({ createdAt: -1 })
        .populate('subjectId', 'name')
        .populate('createdBy', 'name email')
        .select('-__v');
    }

    // Fetch Preparation Quizzes if criteria exist
    let preparationQuizzes = [];
    if (preparationClassIds.length > 0) {
      preparationQuizzes = await Quiz.find(preparationQuery)
        .sort({ createdAt: -1 })
        .populate('subjectId', 'name')
        .populate('classId', 'name classCode')
        .populate('createdBy', 'name email')
        .select('-__v');
    }

    // Combine both types
    let quizzes = [...regularQuizzes, ...preparationQuizzes];

    // Filter by status if requested (for students)
    if (req.query.status && req.query.status !== 'all') {
      const QuizSubmission = require('../models/QuizSubmission');
      const studentId = req.user._id;
      const now = new Date();

      // Get submissions for these quizzes
      const quizIds = quizzes.map(q => q._id);
      const submissions = await QuizSubmission.find({
        studentId: studentId,
        quizId: { $in: quizIds }
      }).select('quizId');

      const submittedQuizIds = new Set(submissions.map(s => s.quizId.toString()));

      quizzes = quizzes.filter(q => {
        const isSubmitted = submittedQuizIds.has(q._id.toString());
        const isExpired = q.deadline && new Date(q.deadline) <= now;

        if (req.query.status === 'submitted') {
          return isSubmitted;
        } else if (req.query.status === 'expired') {
          return !isSubmitted && isExpired;
        } else if (req.query.status === 'available') {
          return !isSubmitted && !isExpired;
        }
        return true;
      });
    }

    // Apply pagination manually since we combined two queries
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = quizzes.length;

    quizzes = quizzes.slice(startIndex, endIndex);

    // For students, remove correct answers from questions
    const quizzesToSend = quizzes.map(quiz => {
      const quizObj = quiz.toObject();
      if (quizObj.questions) {
        quizObj.questions = quizObj.questions.map(q => {
          const { correctAnswer, ...questionWithoutAnswer } = q;
          return questionWithoutAnswer;
        });
      }
      return quizObj;
    });

    return res.status(200).json({
      success: true,
      count: quizzesToSend.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        quizzes: quizzesToSend,
        hasActiveClassSubscription,
        hasActivePreparationSubscription: preparationClassIds.length > 0
      }
    });
  } else {
    // For admins and teachers, use query parameters
    const { page = 1, limit = 10, search } = req.query;

    if (classNumber) {
      query.classNumber = parseInt(classNumber);
    }
    if (board) {
      query.board = board;
    }
    if (subjectId) {
      query.subjectId = subjectId;
    }
    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } }, // Changed title to name as per schema
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filtering
    if (req.query.status) {
      const status = req.query.status;
      const now = new Date();

      if (status === 'active') {
        query.isActive = true;
        query.$or = [
          { deadline: { $exists: false } },
          { deadline: null },
          { deadline: { $gt: now } }
        ];
      } else if (status === 'completed') {
        query.deadline = { $lte: now };
      } else if (status === 'inactive') {
        // Inactive means explicitly set to inactive, regardless of deadline
        query.isActive = false;
      }
    } else if (isActive !== undefined) {
      // Fallback to legacy isActive if status not provided
      query.isActive = isActive === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Quiz.countDocuments(query);

    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .populate('subjectId', 'name')
      .populate('classId', 'name classCode')
      .populate('createdBy', 'name email')
      .select('-__v')
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: quizzes.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: {
        quizzes
      }
    });
  }
});

// @desc    Get quiz statistics (Admin)
// @route   GET /api/admin/quizzes/statistics
// @access  Private/Admin
exports.getQuizStatistics = asyncHandler(async (req, res) => {
  const Quiz = require('../models/Quiz');

  // Get overall statistics (not filtered by search or pagination)
  const totalQuizzes = await Quiz.countDocuments({});
  const activeQuizzes = await Quiz.countDocuments({ isActive: true });
  const inactiveQuizzes = await Quiz.countDocuments({ isActive: false });

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        totalQuizzes,
        activeQuizzes,
        inactiveQuizzes
      }
    }
  });
});

// @desc    Get single quiz by ID
// @route   GET /api/admin/quizzes/:id or /api/teacher/quizzes/:id or /api/student/quizzes/:id
// @access  Private/Admin or Private/Teacher or Private/Student
exports.getQuizById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isStudent = req.user.role === 'student';

  const quiz = await Quiz.findById(id)
    .populate('subjectId', 'name')
    .populate('classId', 'name type classCode')
    .populate('createdBy', 'name email')
    .select('-__v');

  if (!quiz) {
    throw new ErrorResponse('Quiz not found', 404);
  }

  // For students, validate access based on active subscriptions
  if (isStudent) {
    const Student = require('../models/Student');
    const Payment = require('../models/Payment');
    const student = await Student.findById(req.user._id);

    if (!student) {
      throw new ErrorResponse('Student not found', 404);
    }

    // Check active subscriptions
    const now = new Date();
    const activePayments = await Payment.find({
      studentId: student._id,
      status: 'completed',
      subscriptionEndDate: { $gte: now }
    })
      .populate({
        path: 'subscriptionPlanId',
        select: 'type board classes classId',
        populate: {
          path: 'classId',
          select: '_id name classCode'
        }
      });

    // Also check activeSubscriptions array
    const activeSubsFromArray = (student.activeSubscriptions || []).filter(sub =>
      new Date(sub.endDate) >= now
    );

    let hasAccess = false;

    // Check if quiz is regular type
    if (quiz.type === 'regular' || (quiz.classNumber && quiz.board)) {
      // Check if student has active regular subscription for THIS quiz's class/board
      const hasMatchingSubscription = activePayments.some(payment =>
        payment.subscriptionPlanId &&
        payment.subscriptionPlanId.type === 'regular' &&
        payment.subscriptionPlanId.board === quiz.board &&
        payment.subscriptionPlanId.classes &&
        payment.subscriptionPlanId.classes.includes(quiz.classNumber)
      ) || activeSubsFromArray.some(sub =>
        sub.type === 'regular' &&
        sub.board === quiz.board &&
        sub.class === quiz.classNumber
      );

      if (hasMatchingSubscription) {
        hasAccess = true;
      }
    }
    // Check if quiz is preparation type
    else if (quiz.type === 'preparation' || quiz.classId) {
      const quizClassId = quiz.classId?._id || quiz.classId;

      if (quizClassId) {
        // Check if student has active prep subscription for this prep class
        const hasActivePrepSubscription = activePayments.some(payment => {
          if (!payment.subscriptionPlanId ||
            payment.subscriptionPlanId.type !== 'preparation' ||
            !payment.subscriptionPlanId.classId) {
            return false;
          }

          const paymentClassId = payment.subscriptionPlanId.classId._id ||
            payment.subscriptionPlanId.classId;
          return paymentClassId && paymentClassId.toString() === quizClassId.toString();
        }) || activeSubsFromArray.some(sub => {
          if (sub.type !== 'preparation' || !sub.classId) return false;

          const subClassId = sub.classId._id || sub.classId;
          return subClassId && subClassId.toString() === quizClassId.toString();
        });

        if (hasActivePrepSubscription) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      if (quiz.type === 'preparation' || quiz.classId) {
        throw new ErrorResponse('This quiz is not available. You need an active subscription for this preparation class.', 403);
      } else {
        throw new ErrorResponse('This quiz is not available for your class and board.', 403);
      }
    }

    // Remove correct answers from questions
    const quizObj = quiz.toObject();
    if (quizObj.questions) {
      quizObj.questions = quizObj.questions.map(q => {
        const { correctAnswer, ...questionWithoutAnswer } = q;
        return questionWithoutAnswer;
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        quiz: quizObj
      }
    });
  }

  res.status(200).json({
    success: true,
    data: {
      quiz
    }
  });
});

// @desc    Update quiz
// @route   PUT /api/admin/quizzes/:id or /api/teacher/quizzes/:id
// @access  Private/Admin or Private/Teacher
exports.updateQuiz = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, type, classNumber, board, classId, subjectId, questions, isActive, deadline } = req.body;
  const Class = require('../models/Class');

  const quiz = await Quiz.findById(id);

  if (!quiz) {
    throw new ErrorResponse('Quiz not found', 404);
  }

  // Determine quiz type (use existing if not provided)
  const quizType = type || quiz.type || 'regular';
  if (!['regular', 'preparation'].includes(quizType)) {
    throw new ErrorResponse('Quiz type must be either "regular" or "preparation"', 400);
  }

  // Update fields
  if (name !== undefined) {
    quiz.name = name.trim();
  }
  if (type !== undefined) {
    quiz.type = quizType;
  }

  // Type-specific field updates
  if (quizType === 'regular') {
    if (classNumber !== undefined) {
      if (classNumber < 1 || classNumber > 12) {
        throw new ErrorResponse('Please provide a valid class number (1-12)', 400);
      }
      quiz.classNumber = classNumber;
    }
    if (board !== undefined) {
      quiz.board = board.trim();
    }

    // Handle classId for regular quiz
    if (classId) {
      // Validate provided classId
      const checkClass = await Class.findById(classId);
      if (checkClass && checkClass.type === 'regular' &&
        checkClass.class === (classNumber || quiz.classNumber) &&
        checkClass.board === (board || quiz.board)) {
        quiz.classId = classId;
      }
    } else {
      // If classId not explicitly provided, but class/board might have changed, try to look it up
      // Or if it was missing before
      if ((classNumber || board || !quiz.classId)) {
        const targetClass = classNumber || quiz.classNumber;
        const targetBoard = board || quiz.board;

        const regularClass = await Class.findOne({
          type: 'regular',
          class: targetClass,
          board: targetBoard,
          isActive: true
        });

        if (regularClass) {
          quiz.classId = regularClass._id;
        } else {
          // If we can't find a matching class doc, we might want to clear the old classId 
          // if it no longer matches (though this edge case is rare if referential integrity is good)
          // For now, let's just keep strict: if no class doc found, maybe set classId to undefined? 
          // But existing behavior allowed no classId. Let's stick to setting it if found.
          // If data is inconsistent, maybe better to safeguard.
          // quiz.classId = undefined; // Optional: clear if invalid
        }
      }
    }
  } else if (quizType === 'preparation') {
    if (classId !== undefined) {
      // Validate preparation class exists
      const prepClass = await Class.findById(classId);
      if (!prepClass || prepClass.type !== 'preparation' || !prepClass.isActive) {
        throw new ErrorResponse('Preparation class not found or inactive', 400);
      }
      quiz.classId = classId;
    }
    // Clear regular-specific fields
    quiz.classNumber = undefined;
    quiz.board = undefined;
  }

  if (subjectId !== undefined) {
    // Validate subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw new ErrorResponse('Subject not found', 404);
    }
    quiz.subjectId = subjectId;
  }
  if (questions !== undefined) {
    // Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new ErrorResponse('Please provide at least one question', 400);
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.question.trim()) {
        throw new ErrorResponse(`Question ${i + 1}: Please provide a question text`, 400);
      }
      if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
        throw new ErrorResponse(`Question ${i + 1}: Please provide exactly 4 options`, 400);
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j] || !q.options[j].trim()) {
          throw new ErrorResponse(`Question ${i + 1}, Option ${j + 1}: Please provide option text`, 400);
        }
      }
      if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer > 3) {
        throw new ErrorResponse(`Question ${i + 1}: Please provide a valid correct answer index (0-3)`, 400);
      }
    }
    quiz.questions = questions;
  }
  if (isActive !== undefined) {
    quiz.isActive = isActive;
  }
  if (deadline !== undefined) {
    quiz.deadline = deadline || null;
  }

  await quiz.save();

  // Populate before sending response
  await quiz.populate('subjectId', 'name');
  if (quiz.classId) {
    await quiz.populate('classId', 'name type');
  }
  await quiz.populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Quiz updated successfully',
    data: {
      quiz
    }
  });
});

// @desc    Delete quiz
// @route   DELETE /api/admin/quizzes/:id or /api/teacher/quizzes/:id
// @access  Private/Admin or Private/Teacher
exports.deleteQuiz = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quiz = await Quiz.findById(id);

  if (!quiz) {
    throw new ErrorResponse('Quiz not found', 404);
  }

  await quiz.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Quiz deleted successfully'
  });
});

// @desc    Get quiz statistics for teacher
// @route   GET /api/teacher/quizzes/statistics
// @access  Private/Teacher
exports.getTeacherQuizStatistics = asyncHandler(async (req, res) => {
  const QuizSubmission = require('../models/QuizSubmission');
  const teacherId = req.user._id;
  const now = new Date();

  // Get all quizzes created by this teacher
  const allQuizzes = await Quiz.find({ createdBy: teacherId });

  // Calculate statistics
  const total = allQuizzes.length;
  const active = allQuizzes.filter(q => q.isActive && (!q.deadline || new Date(q.deadline) > now)).length;
  const completed = allQuizzes.filter(q => q.deadline && new Date(q.deadline) <= now).length;
  const inactive = allQuizzes.filter(q => !q.isActive && (!q.deadline || new Date(q.deadline) > now)).length;

  res.status(200).json({
    success: true,
    data: {
      statistics: {
        total,
        active,
        completed,
        inactive
      }
    }
  });
});

// @desc    Get quiz statistics for student
// @route   GET /api/student/quizzes/statistics
// @access  Private/Student
exports.getStudentQuizStatistics = asyncHandler(async (req, res) => {
  const QuizSubmission = require('../models/QuizSubmission');
  const Student = require('../models/Student');
  const Payment = require('../models/Payment');
  const Class = require('../models/Class');
  const studentId = req.user._id;
  const now = new Date();

  // Get student data
  const student = await Student.findById(studentId);
  if (!student || !student.class || !student.board) {
    throw new ErrorResponse('Student class or board not found', 404);
  }

  // Check active subscriptions from both sources
  // const now = new Date(); // Aleady defined above
  const SubscriptionPlan = require('../models/SubscriptionPlan');

  // Get from activeSubscriptions array
  const activeSubsFromArray = (student.activeSubscriptions || []).filter(sub =>
    new Date(sub.endDate) >= now
  );

  // Get from Payment records
  const activePayments = await Payment.find({
    studentId: student._id,
    status: 'completed',
    subscriptionEndDate: { $gte: now }
  })
    .populate({
      path: 'subscriptionPlanId',
      select: 'type board classes classId',
      populate: {
        path: 'classId',
        select: '_id name classCode'
      }
    });

  // Check if student has valid active REGULAR subscription for their CURRENT class/board
  const normalizedBoard = student.board ? student.board.trim() : student.board;
  const normalizedClass = parseInt(student.class);

  const hasActiveClassSubscription = activePayments.some(payment =>
    payment.subscriptionPlanId &&
    payment.subscriptionPlanId.type === 'regular' &&
    payment.subscriptionPlanId.board === normalizedBoard &&
    payment.subscriptionPlanId.classes &&
    payment.subscriptionPlanId.classes.includes(normalizedClass)
  ) || activeSubsFromArray.some(sub =>
    sub.type === 'regular' &&
    sub.board === normalizedBoard &&
    sub.class === normalizedClass
  );

  // Collect Preparation Plan criteria (Class IDs)
  const prepClassIdsSet = new Set();

  // From Payments
  activePayments.forEach(payment => {
    const plan = payment.subscriptionPlanId;
    if (plan && plan.type === 'preparation' && plan.classId) {
      const id = plan.classId._id || plan.classId;
      if (id) prepClassIdsSet.add(id.toString());
    }
  });

  // From Array Subs
  activeSubsFromArray.forEach(sub => {
    if (sub.type === 'preparation' && sub.classId) {
      const id = sub.classId._id || sub.classId;
      if (id) prepClassIdsSet.add(id.toString());
    }
  });

  const preparationClassIds = Array.from(prepClassIdsSet)
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));

  // --- Fetch Quizzes ---

  // 1. Regular Quizzes
  let regularQuizzes = [];
  if (hasActiveClassSubscription) {
    // Find Class ID for regular profile
    const studentClassDoc = await Class.findOne({
      type: 'regular',
      class: normalizedClass,
      board: normalizedBoard,
      isActive: true
    });

    const regularQuery = { isActive: true };

    if (studentClassDoc) {
      regularQuery.$or = [
        { classId: studentClassDoc._id },
        { classId: { $exists: false }, classNumber: normalizedClass, board: normalizedBoard }
      ];
    } else {
      regularQuery.classNumber = normalizedClass;
      regularQuery.board = normalizedBoard;
    }

    regularQuizzes = await Quiz.find(regularQuery).select('_id deadline');
  }

  // 2. Preparation Quizzes
  let preparationQuizzes = [];
  if (preparationClassIds.length > 0) {
    preparationQuizzes = await Quiz.find({
      isActive: true,
      classId: { $in: preparationClassIds }
    }).select('_id deadline');
  }

  const allQuizzes = [...regularQuizzes, ...preparationQuizzes];

  // Calculate Statistics
  const total = allQuizzes.length;

  // Get submissions
  const quizIds = allQuizzes.map(q => q._id);
  const submissions = await QuizSubmission.find({
    studentId: student._id,
    quizId: { $in: quizIds }
  }).select('quizId');

  const submittedQuizIds = new Set(submissions.map(s => s.quizId.toString()));

  const submitted = submittedQuizIds.size;

  let expired = 0;
  let available = 0;

  allQuizzes.forEach(q => {
    const isSubmitted = submittedQuizIds.has(q._id.toString());
    if (!isSubmitted) {
      // Check expiry
      if (q.deadline && new Date(q.deadline) <= now) {
        expired++;
      } else {
        available++;
      }
    }
  });


  res.status(200).json({
    success: true,
    data: {
      statistics: {
        total,
        available,
        submitted,
        expired
      }
    }
  });

});

