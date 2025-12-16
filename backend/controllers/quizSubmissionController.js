const QuizSubmission = require('../models/QuizSubmission');
const Quiz = require('../models/Quiz');
const Student = require('../models/Student');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Submit a quiz
// @route   POST /api/student/quizzes/:id/submit
// @access  Private/Student
exports.submitQuiz = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { answers } = req.body;
  const studentId = req.user._id;
  const Payment = require('../models/Payment');
  const Class = require('../models/Class');

  // Check if quiz exists
  const quiz = await Quiz.findById(id)
    .populate('classId', 'name type classCode');
  
  if (!quiz) {
    throw new ErrorResponse('Quiz not found', 404);
  }

  // Check if student has already submitted this quiz
  const existingSubmission = await QuizSubmission.findOne({
    studentId,
    quizId: id
  });

  if (existingSubmission) {
    throw new ErrorResponse('You have already submitted this quiz', 400);
  }

  // Validate access based on active subscriptions
  const student = await Student.findById(studentId);
  if (!student) {
    throw new ErrorResponse('Student not found', 404);
  }

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
    const hasActiveClassSubscription = activePayments.some(payment => 
      payment.subscriptionPlanId && 
      payment.subscriptionPlanId.type === 'regular' &&
      payment.subscriptionPlanId.board === student.board &&
      payment.subscriptionPlanId.classes &&
      payment.subscriptionPlanId.classes.includes(student.class)
    ) || activeSubsFromArray.some(sub => 
      sub.type === 'regular' && 
      sub.board === student.board && 
      sub.class === student.class
    );

    if (quiz.classNumber === student.class && quiz.board === student.board && hasActiveClassSubscription) {
      hasAccess = true;
    }
  } 
  // Check if quiz is preparation type
  else if (quiz.type === 'preparation' || quiz.classId) {
    const quizClassId = quiz.classId?._id || quiz.classId;
    
    if (quizClassId) {
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

  // Validate answers
  if (!answers || !Array.isArray(answers)) {
    throw new ErrorResponse('Please provide answers', 400);
  }

  if (answers.length !== quiz.questions.length) {
    throw new ErrorResponse('Please answer all questions', 400);
  }

  // Calculate score
  let score = 0;
  answers.forEach((answer) => {
    const question = quiz.questions[answer.questionIndex];
    if (question && question.correctAnswer === answer.selectedOption) {
      score++;
    }
  });

  // Create submission
  const submission = await QuizSubmission.create({
    studentId,
    quizId: id,
    answers,
    score,
    totalQuestions: quiz.questions.length
  });

  res.status(201).json({
    success: true,
    message: 'Quiz submitted successfully',
    data: {
      submission: {
        _id: submission._id,
        score: submission.score,
        totalQuestions: submission.totalQuestions,
        submittedAt: submission.submittedAt
      }
    }
  });
});

// @desc    Check if student has submitted a quiz
// @route   GET /api/student/quizzes/:id/submission-status
// @access  Private/Student
exports.getSubmissionStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const studentId = req.user._id;

  const submission = await QuizSubmission.findOne({
    studentId,
    quizId: id
  }).select('_id score totalQuestions submittedAt');

  res.status(200).json({
    success: true,
    data: {
      hasSubmitted: !!submission,
      submission: submission || null
    }
  });
});

// @desc    Get all quiz submissions for a student
// @route   GET /api/student/quiz-submissions
// @access  Private/Student
exports.getMySubmissions = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  const submissions = await QuizSubmission.find({ studentId })
    .populate('quizId', 'name subjectId board classNumber')
    .populate('quizId.subjectId', 'name')
    .sort({ submittedAt: -1 })
    .select('-answers -__v');

  res.status(200).json({
    success: true,
    count: submissions.length,
    data: {
      submissions
    }
  });
});

// @desc    Get quiz leaderboard/results
// @route   GET /api/student/quizzes/:id/leaderboard
// @access  Private/Student
exports.getQuizLeaderboard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const studentId = req.user._id;

  // Check if quiz exists
  const quiz = await Quiz.findById(id);
  if (!quiz) {
    throw new ErrorResponse('Quiz not found', 404);
  }

  // Check if deadline has passed (must be at least 1 minute after deadline)
  const now = new Date();
  if (quiz.deadline) {
    const deadlinePlusOneMinute = new Date(quiz.deadline.getTime() + 60000); // Add 1 minute
    if (now < deadlinePlusOneMinute) {
      throw new ErrorResponse('Results will be available after the deadline', 403);
    }
  }

  // Get all submissions for this quiz, sorted by score (descending) and then by submission time (ascending for tie-breaking)
  let allSubmissions = await QuizSubmission.find({ quizId: id })
    .populate('studentId', 'name fullName')
    .sort({ score: -1, submittedAt: 1 })
    .select('studentId score totalQuestions submittedAt');
  
  // Filter out submissions where studentId is null (student might have been deleted)
  allSubmissions = allSubmissions.filter(sub => sub.studentId !== null && sub.studentId !== undefined);

  if (allSubmissions.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        topStudents: [],
        currentStudentSubmission: null,
        totalStudents: 0
      }
    });
  }

  // Helper function to calculate points based on rank
  const calculatePoints = (rank) => {
    switch (rank) {
      case 1:
        return 100; // 1st place: 100 points
      case 2:
        return 75;  // 2nd place: 75 points
      case 3:
        return 50;  // 3rd place: 50 points
      case 4:
        return 25;  // 4th place: 25 points
      case 5:
        return 15;  // 5th place: 15 points
      default:
        return 10;  // 6th place and below: 10 points
    }
  };

  // Assign ranks
  let currentRank = 1;
  const rankedSubmissions = allSubmissions.map((submission, index) => {
    // If this submission has a lower score than previous, increment rank
    if (index > 0 && submission.score < allSubmissions[index - 1].score) {
      currentRank = index + 1;
    }
    const points = calculatePoints(currentRank);
    return {
      ...submission.toObject(),
      rank: currentRank,
      points: points
    };
  });

  // Get top students based on number of submissions
  let topStudents = [];
  if (rankedSubmissions.length === 1) {
    // Only 1 student - show 1st place
    topStudents = [rankedSubmissions[0]];
  } else if (rankedSubmissions.length === 2) {
    // 2 students - show 1st and 2nd
    topStudents = rankedSubmissions.slice(0, 2);
  } else {
    // 3+ students - show top 3
    topStudents = rankedSubmissions.slice(0, 3);
  }

  // Format top students
  const formattedTopStudents = topStudents.map(sub => ({
    rank: sub.rank,
    name: sub.studentId?.name || sub.studentId?.fullName || 'Unknown',
    score: sub.score,
    total: sub.totalQuestions,
    points: sub.points
  }));

  // Get current student's submission
  const currentStudentSubmission = allSubmissions.find(
    sub => sub.studentId && sub.studentId._id && sub.studentId._id.toString() === studentId.toString()
  );

  // Get current student's rank and points
  const currentStudentRanked = rankedSubmissions.find(
    s => s.studentId && s.studentId._id && s.studentId._id.toString() === studentId.toString()
  );

  res.status(200).json({
    success: true,
    data: {
      topStudents: formattedTopStudents,
      currentStudentSubmission: currentStudentSubmission ? {
        score: currentStudentSubmission.score,
        totalQuestions: currentStudentSubmission.totalQuestions,
        submittedAt: currentStudentSubmission.submittedAt,
        rank: currentStudentRanked?.rank || null,
        points: currentStudentRanked?.points || 0
      } : null,
      totalStudents: allSubmissions.length
    }
  });
});

// @desc    Get all quiz submissions/results for a quiz (for teachers)
// @route   GET /api/teacher/quizzes/:id/results
// @access  Private/Teacher
exports.getQuizResults = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if quiz exists
  const quiz = await Quiz.findById(id);
  if (!quiz) {
    throw new ErrorResponse('Quiz not found', 404);
  }

  // Get all students eligible for this quiz (same class and board)
  const eligibleStudents = await Student.find({
    class: quiz.classNumber,
    board: quiz.board,
    isActive: true
  }).select('_id name fullName email phone');

  // Get all submissions for this quiz with student details
  let allSubmissions = await QuizSubmission.find({ quizId: id })
    .populate('studentId', 'name fullName email phone')
    .select('studentId answers score totalQuestions submittedAt');
  
  // Filter out submissions where studentId is null
  allSubmissions = allSubmissions.filter(sub => sub.studentId !== null && sub.studentId !== undefined);

  // Create a map of student submissions
  const submissionMap = new Map();
  allSubmissions.forEach(sub => {
    const studentId = sub.studentId._id.toString();
    submissionMap.set(studentId, {
      score: sub.score,
      totalQuestions: sub.totalQuestions,
      submittedAt: sub.submittedAt,
      hasSubmitted: true
    });
  });

  // Create combined list: all eligible students with their scores (0 if not submitted)
  const allStudentsList = eligibleStudents.map(student => {
    const studentId = student._id.toString();
    const submission = submissionMap.get(studentId);
    
    if (submission) {
      // Student submitted
      return {
        _id: student._id,
        studentId: student._id,
        studentName: student.name || student.fullName || 'Unknown',
        studentEmail: student.email || null,
        studentPhone: student.phone || null,
        score: submission.score,
        totalQuestions: submission.totalQuestions,
        submittedAt: submission.submittedAt,
        hasSubmitted: true
      };
    } else {
      // Student didn't submit - 0 marks
      return {
        _id: student._id,
        studentId: student._id,
        studentName: student.name || student.fullName || 'Unknown',
        studentEmail: student.email || null,
        studentPhone: student.phone || null,
        score: 0,
        totalQuestions: quiz.questions.length,
        submittedAt: null,
        hasSubmitted: false
      };
    }
  });

  // Separate submitted and not submitted students
  const submittedStudents = allStudentsList.filter(s => s.hasSubmitted);
  const notSubmittedStudents = allStudentsList.filter(s => !s.hasSubmitted);

  // Sort submitted students by score (descending), then by submission time (ascending for tie-breaking)
  submittedStudents.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // Higher score first
    }
    return new Date(a.submittedAt) - new Date(b.submittedAt);
  });

  // Assign ranks only to submitted students
  let currentRank = 1;
  const rankedSubmittedStudents = submittedStudents.map((student, index) => {
    if (index > 0 && student.score < submittedStudents[index - 1].score) {
      currentRank = index + 1;
    }
    return {
      ...student,
      rank: currentRank
    };
  });

  // Get top students (first and second) - only from submitted
  const topStudents = rankedSubmittedStudents.slice(0, 2);

  // Combine: submitted students (with ranks) first, then not submitted (without ranks)
  const rankedAllStudents = [...rankedSubmittedStudents, ...notSubmittedStudents];

  // Get only submitted students for backward compatibility
  const rankedSubmissions = rankedAllStudents.filter(s => s.hasSubmitted);

  // Check if deadline has passed
  const now = new Date();
  const isDeadlinePassed = quiz.deadline ? now >= quiz.deadline : true;

  // Calculate average score from submitted students only
  const submittedCount = rankedSubmissions.length;
  const averageScore = submittedCount > 0 
    ? (rankedSubmissions.reduce((sum, sub) => sum + sub.score, 0) / submittedCount).toFixed(2)
    : 0;

  res.status(200).json({
    success: true,
    data: {
      quiz: {
        _id: quiz._id,
        name: quiz.name,
        deadline: quiz.deadline,
        isDeadlinePassed,
        totalQuestions: quiz.questions.length,
        classNumber: quiz.classNumber,
        board: quiz.board
      },
      topStudents: topStudents.map(s => ({
        rank: s.rank,
        studentName: s.studentName,
        score: s.score,
        total: s.totalQuestions,
        hasSubmitted: s.hasSubmitted,
        studentEmail: s.studentEmail,
        studentPhone: s.studentPhone,
        submittedAt: s.submittedAt
      })),
      allStudents: rankedAllStudents,
      submissions: rankedSubmissions, // For backward compatibility
      totalSubmissions: submittedCount,
      totalEligibleStudents: eligibleStudents.length,
      averageScore
    }
  });
});

