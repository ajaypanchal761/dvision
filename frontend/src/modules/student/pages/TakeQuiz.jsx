import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiClock, FiBook, FiCheckCircle, FiX, FiAward, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { studentAPI } from '../services/api';
import BottomNav from '../components/common/BottomNav';

const TakeQuiz = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);

  useEffect(() => {
    fetchQuiz();
    checkSubmissionStatus();
  }, [id]);

  const checkSubmissionStatus = async () => {
    try {
      const response = await studentAPI.getSubmissionStatus(id);
      if (response.success && response.data) {
        setHasSubmitted(response.data.hasSubmitted);
        setSubmissionData(response.data.submission);
      }
    } catch (err) {
      console.error('Error checking submission status:', err);
    }
  };

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getQuizById(id);
      if (response.success && response.data?.quiz) {
        const quizData = response.data.quiz;
        
        // Check access based on quiz type and active subscriptions
        let hasAccess = false;
        
        // For regular quizzes: check class and board match with active subscription
        if (quizData.type === 'regular' || (quizData.classNumber && quizData.board)) {
          const hasActiveClassSubscription = user?.activeSubscriptions?.some(sub => {
            return sub.plan?.type === 'regular' && 
                   sub.plan?.board === user?.board && 
                   sub.plan?.classes?.includes(parseInt(user?.class)) &&
                   new Date(sub.endDate) > new Date();
          }) || (user?.subscription?.status === 'active' && 
                 user?.subscription?.plan?.type === 'regular' &&
                 user?.subscription?.plan?.board === user?.board &&
                 user?.subscription?.plan?.classes?.includes(parseInt(user?.class)) &&
                 new Date(user.subscription.endDate) > new Date());
          
          if (quizData.classNumber === user?.class && 
              quizData.board === user?.board && 
              hasActiveClassSubscription) {
            hasAccess = true;
          }
        } 
        // For preparation quizzes: check if student has active subscription for this prep class
        else if (quizData.type === 'preparation' || quizData.classId) {
          const quizClassId = quizData.classId?._id || quizData.classId;
          
          if (quizClassId) {
            const hasActivePrepSubscription = user?.activeSubscriptions?.some(sub => {
              if (sub.plan?.type !== 'preparation' || !sub.plan?.classId) return false;
              
              const subClassId = sub.plan.classId._id || sub.plan.classId;
              return subClassId && 
                     subClassId.toString() === quizClassId.toString() &&
                     new Date(sub.endDate) > new Date();
            });
            
            if (hasActivePrepSubscription) {
              hasAccess = true;
            }
          }
        }
        
        if (!hasAccess) {
          if (quizData.type === 'preparation' || quizData.classId) {
            alert('This quiz is not available. You need an active subscription for this preparation class.');
          } else {
            alert('This quiz is not available for your class and board.');
          }
          navigate('/quizzes');
          return;
        }
        
        setQuiz(quizData);
        const initialAnswers = {};
        quizData.questions?.forEach((_, index) => {
          initialAnswers[index] = null;
        });
        setAnswers(initialAnswers);
      } else {
        alert('Quiz not found');
        navigate('/quizzes');
      }
    } catch (err) {
      console.error('Error fetching quiz:', err);
      // If backend returns 403, show the error message from backend
      if (err.status === 403 || err.message) {
        alert(err.message || 'You do not have access to this quiz.');
      } else {
        alert('Failed to load quiz. Please try again.');
      }
      navigate('/quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setAnswers({
      ...answers,
      [questionIndex]: optionIndex
    });
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const dateStr = deadlineDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const timeStr = deadlineDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return `${dateStr} ${timeStr}`;
  };

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    return now >= deadlineDate;
  };

  const canViewResults = (deadline) => {
    if (!deadline) return false;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const deadlinePlusOneMinute = new Date(deadlineDate.getTime() + 60000);
    return now >= deadlinePlusOneMinute;
  };

  const handleSubmit = async () => {
    const unansweredQuestions = quiz.questions?.filter((_, index) => answers[index] === null || answers[index] === undefined);
    if (unansweredQuestions.length > 0) {
      alert(`Please answer all questions before submitting. You have ${unansweredQuestions.length} unanswered question(s).`);
      return;
    }

    if (quiz.deadline && isDeadlinePassed(quiz.deadline)) {
      alert('The deadline for this quiz has passed. You cannot submit it.');
      return;
    }

    try {
      setSubmitting(true);
      const submissionAnswers = Object.keys(answers).map(qIndex => ({
        questionIndex: parseInt(qIndex),
        selectedOption: answers[qIndex]
      }));

      const response = await studentAPI.submitQuiz(quiz._id, submissionAnswers);
      if (response.success) {
        setHasSubmitted(true);
        setSubmissionData(response.data.submission);
        alert('Quiz submitted successfully!');
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert(err.message || 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const allQuestionsAnswered = quiz?.questions?.every((_, index) => 
    answers[index] !== null && answers[index] !== undefined
  ) || false;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--app-dark-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-base font-medium">Loading quiz...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-4 sm:pb-5 md:pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate('/quizzes')}
                className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
              </button>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">{quiz.name}</h1>
            </div>
            {!hasSubmitted && (
              <button
                onClick={() => navigate('/quizzes')}
                className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <FiX className="text-lg sm:text-xl md:text-2xl" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
        {/* Quiz Info */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4 md:p-5 mb-3 sm:mb-4 border border-gray-200">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-[var(--app-dark-blue)]/10 rounded-lg">
                <FiBook className="text-[var(--app-dark-blue)] text-sm" />
              </div>
              <span className="text-gray-700 font-medium">{quiz.questions?.length || 0} Questions</span>
            </div>
            {quiz.deadline && (
              <div className="flex items-center gap-1.5">
                <FiClock className={`text-sm ${isDeadlinePassed(quiz.deadline) ? 'text-red-500' : 'text-[var(--app-dark-blue)]'}`} />
                <span className={isDeadlinePassed(quiz.deadline) ? 'text-red-600 font-bold' : 'text-gray-700 font-medium'}>
                  Deadline: {formatDeadline(quiz.deadline)}
                  {isDeadlinePassed(quiz.deadline) && ' (Expired)'}
                </span>
              </div>
            )}
          </div>
          {hasSubmitted && quiz && canViewResults(quiz.deadline) && (
            <div className="pt-2 sm:pt-3 border-t border-gray-200">
              <button
                onClick={() => navigate(`/quiz-results/${id}`)}
                className="w-full bg-[var(--app-dark-blue)] hover:bg-[var(--app-dark-blue)]/90 text-white font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
              >
                <FiAward className="text-base sm:text-lg" />
                <span>View Results</span>
              </button>
            </div>
          )}
        </div>

        {/* Already Submitted Message */}
        {hasSubmitted && (
          <div className="bg-blue-50 border-2 border-blue-500 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <FiCheckCircle className="text-blue-600 text-lg sm:text-xl" />
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-blue-800">Quiz Already Submitted</h3>
            </div>
            {submissionData && (
              <div className="mt-2">
                <p className="text-blue-600 text-xs sm:text-sm font-medium">
                  Submitted on: {new Date(submissionData.submittedAt).toLocaleString()}
                </p>
              </div>
            )}
            <p className="text-blue-700 mt-2 text-xs sm:text-sm font-medium">You cannot submit this quiz again.</p>
          </div>
        )}

        {/* Questions */}
        {!hasSubmitted && (
          <div className="space-y-3 sm:space-y-4">
            {quiz.questions?.map((question, qIndex) => (
              <div key={qIndex} className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4 md:p-5 border border-gray-200">
                <div className="mb-2 sm:mb-3">
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 mb-1.5 sm:mb-2">
                    Question {qIndex + 1}
                  </h3>
                  <p className="text-gray-800 text-sm sm:text-base leading-relaxed">{question.question}</p>
                </div>
                
                <div className="space-y-2 sm:space-y-2.5">
                  {question.options?.map((option, oIndex) => (
                    <label
                      key={oIndex}
                      className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all ${
                        answers[qIndex] === oIndex
                          ? 'border-[var(--app-dark-blue)] bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-[var(--app-dark-blue)]/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${qIndex}`}
                        checked={answers[qIndex] === oIndex}
                        onChange={() => handleAnswerSelect(qIndex, oIndex)}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--app-dark-blue)] focus:ring-[var(--app-dark-blue)] cursor-pointer"
                      />
                      <span className="flex-1 text-gray-800 font-medium text-sm sm:text-base">
                        {String.fromCharCode(65 + oIndex)}. {option}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        {!hasSubmitted && (
          <div className="mt-4 sm:mt-5 md:mt-6 bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4 md:p-5 border border-gray-200">
            <button
              onClick={handleSubmit}
              disabled={submitting || !allQuestionsAnswered || (quiz.deadline && isDeadlinePassed(quiz.deadline))}
              className="w-full bg-[var(--app-dark-blue)] hover:bg-[var(--app-dark-blue)]/90 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <FiCheckCircle className="text-base sm:text-lg" />
                  <span>Submit Quiz</span>
                </>
              )}
            </button>
            {!allQuestionsAnswered && (
              <p className="text-orange-600 text-xs sm:text-sm text-center mt-2 font-medium">Please answer all questions to submit</p>
            )}
            {quiz.deadline && isDeadlinePassed(quiz.deadline) && (
              <p className="text-red-600 text-xs sm:text-sm text-center mt-2 font-medium">This quiz deadline has passed</p>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default TakeQuiz;
