import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiBook, FiArrowRight, FiAward, FiArrowLeft, FiFileText, FiCheckCircle, FiBarChart2, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { studentAPI } from '../services/api';
import BottomNav from '../components/common/BottomNav';

const Quizzes = () => {
  const navigate = useNavigate();
  const { user, hasActiveSubscription } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissionStatuses, setSubmissionStatuses] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'available', 'submitted', 'expired'
  const [countUpValues, setCountUpValues] = useState({ total: 0, available: 0, submitted: 0, expired: 0 });
  const [quizStats, setQuizStats] = useState({ total: 0, available: 0, submitted: 0, expired: 0 });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    fetchQuizzes();
  }, [page, statusFilter]); // Refetch when page or status changes

  // Debounce search
  useEffect(() => {
    setPage(1);
    const delayDebounceFn = setTimeout(() => {
      fetchQuizzes();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    if (quizzes.length > 0) {
      checkSubmissionStatuses();
    }
  }, [quizzes]);

  // Refresh submission status when page comes into focus (e.g., after submitting quiz)
  useEffect(() => {
    const handleFocus = () => {
      if (quizzes.length > 0) {
        checkSubmissionStatuses();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [quizzes]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm
      };

      const response = await studentAPI.getQuizzes(params);
      if (response.success && response.data?.quizzes) {
        setQuizzes(response.data.quizzes);
        setTotalPages(response.pages || 1);
        setTotalItems(response.total || 0);
      } else {
        setQuizzes([]);
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      if (!searchTerm) { // Silent fail on search
        setQuizzes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizStatistics = async () => {
    try {
      const response = await studentAPI.getQuizStatistics();
      if (response.success && response.data?.statistics) {
        setQuizStats(response.data.statistics);
      }
    } catch (err) {
      console.error('Error fetching quiz statistics:', err);
    }
  };

  const checkSubmissionStatuses = async () => {
    const statuses = {};
    for (const quiz of quizzes) {
      try {
        const response = await studentAPI.getSubmissionStatus(quiz._id);
        if (response.success) {
          statuses[quiz._id] = response.data.hasSubmitted;
        }
      } catch (err) {
        console.error(`Error checking submission status for quiz ${quiz._id}:`, err);
        statuses[quiz._id] = false;
      }
    }
    setSubmissionStatuses(statuses);
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
    const deadlinePlusOneMinute = new Date(deadlineDate.getTime() + 60000);
    return now >= deadlinePlusOneMinute;
  };

  // Client-side filtering removed
  const filteredQuizzes = quizzes;

  // Use statistics from backend, fallback to local calculation if not available
  const displayStats = quizStats.total > 0 ? quizStats : {
    total: quizzes.length,
    available: quizzes.filter(q => {
      const submitted = submissionStatuses[q._id] || false;
      const expired = isDeadlinePassed(q.deadline) && !submitted;
      return !submitted && !expired;
    }).length,
    submitted: quizzes.filter(q => submissionStatuses[q._id]).length,
    expired: quizzes.filter(q => {
      const submitted = submissionStatuses[q._id] || false;
      return isDeadlinePassed(q.deadline) && !submitted;
    }).length,
  };

  // Count-up animation effect - Slow animation
  useEffect(() => {
    if (!loading && quizzes.length > 0 && !hasAnimated.current) {
      hasAnimated.current = true;
      const duration = 20; // Fast animation - 0.02 seconds

      // Get all stats values first
      const total = displayStats.total;
      const available = displayStats.available;
      const submitted = displayStats.submitted;
      const expired = displayStats.expired;

      const animateCount = (targetValue, key) => {
        const startTime = Date.now();
        const startValue = 0;

        const updateCount = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Easing function for smooth animation (ease-out)
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);

          setCountUpValues(prev => ({
            ...prev,
            [key]: currentValue
          }));

          if (progress < 1) {
            requestAnimationFrame(updateCount);
          } else {
            setCountUpValues(prev => ({
              ...prev,
              [key]: targetValue
            }));
          }
        };

        requestAnimationFrame(updateCount);
      };

      // Start all animations at exactly the same time using requestAnimationFrame
      requestAnimationFrame(() => {
        animateCount(total, 'total');
        animateCount(available, 'available');
        animateCount(submitted, 'submitted');
        animateCount(expired, 'expired');
      });
    } else if (!loading && quizzes.length === 0) {
      setCountUpValues({ total: 0, available: 0, submitted: 0, expired: 0 });
      hasAnimated.current = false;
    }
  }, [loading, displayStats.total, displayStats.available, displayStats.submitted, displayStats.expired]);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative animate-fade-in" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-4 sm:pb-6 md:pb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors hover:scale-110"
            >
              <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold animate-slide-in-left">Quizzes</h1>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5 sm:mt-1">Test your knowledge</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 md:pt-6 mb-3 sm:mb-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="group bg-gradient-to-br from-white to-indigo-50 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl p-3 sm:p-4 border border-gray-200 hover:border-indigo-300 transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Total</p>
              <FiFileText className="text-indigo-600 text-base sm:text-lg group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-indigo-600">
              {countUpValues.total}
            </p>
          </div>
          <div className="group bg-gradient-to-br from-white to-blue-50 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl p-3 sm:p-4 border border-gray-200 hover:border-blue-300 transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Available</p>
              <FiCheckCircle className="text-blue-600 text-base sm:text-lg group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-blue-600">
              {countUpValues.available}
            </p>
          </div>
          <div className="group bg-gradient-to-br from-white to-blue-50 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl p-3 sm:p-4 border border-gray-200 hover:border-blue-300 transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Submitted</p>
              <FiBarChart2 className="text-blue-600 text-base sm:text-lg group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-blue-600">
              {countUpValues.submitted}
            </p>
          </div>
          <div className="group bg-gradient-to-br from-white to-gray-50 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl p-3 sm:p-4 border border-gray-200 hover:border-gray-300 transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Expired</p>
              <FiClock className="text-gray-600 text-base sm:text-lg group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-600">
              {countUpValues.expired}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="px-3 sm:px-4 md:px-6 mb-3 sm:mb-4 animate-slide-in-up">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => { setStatusFilter('all'); setPage(1); }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 hover:scale-105 ${statusFilter === 'all'
              ? 'bg-gradient-to-r from-[var(--app-dark-blue)] to-blue-700 text-white shadow-lg'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[var(--app-dark-blue)]/30'
              }`}
          >
            All
          </button>
          <button
            onClick={() => { setStatusFilter('available'); setPage(1); }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 ${statusFilter === 'available'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
              }`}
          >
            Available
          </button>
          <button
            onClick={() => { setStatusFilter('submitted'); setPage(1); }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 ${statusFilter === 'submitted'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
              }`}
          >
            Submitted
          </button>
          <button
            onClick={() => { setStatusFilter('expired'); setPage(1); }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 ${statusFilter === 'expired'
              ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
              }`}
          >
            Expired
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 sm:px-4 md:px-6 mb-3 sm:mb-4 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
            <FiSearch className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search quizzes by name, subject, board, or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 md:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all shadow-sm hover:shadow-md"
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 pb-20 sm:pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] py-8 sm:py-10 md:py-12">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-4 border-[var(--app-dark-blue)] border-t-transparent rounded-full animate-spin mb-3 sm:mb-4"></div>
            <p className="text-gray-600 text-sm sm:text-base font-medium">Loading quizzes...</p>
          </div>
        ) : !hasActiveSubscription ? (
          <div className="bg-gray-50 rounded-xl p-8 sm:p-10 md:p-12 border-2 border-dashed border-gray-300 text-center">
            <FiBook className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2 text-center">
              No Subscription
            </h2>
            <p className="text-gray-500 font-medium text-xs sm:text-sm mb-4">
              You need an active subscription to access quizzes. Please subscribe to a plan to continue learning.
            </p>
            <button
              onClick={() => navigate('/subscription-plans')}
              className="bg-[var(--app-dark-blue)] hover:bg-blue-700 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-xs sm:text-sm md:text-base"
            >
              View Subscription Plans
            </button>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 sm:p-10 md:p-12 border-2 border-dashed border-gray-300 text-center">
            <FiBook className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" />
            <p className="text-gray-500 font-medium text-xs sm:text-sm mb-1">
              {searchTerm ? 'No quizzes found matching your search.' : 'No quizzes available.'}
            </p>
            <p className="text-gray-400 text-[10px] sm:text-xs">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Check back later for new quizzes.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            {filteredQuizzes.map((quiz, index) => {
              const isSubmitted = submissionStatuses[quiz._id] || false;
              const canViewResults = isDeadlinePassed(quiz.deadline);
              const isExpired = isDeadlinePassed(quiz.deadline) && !isSubmitted;

              return (
                <div
                  key={quiz._id}
                  onClick={() => !isSubmitted && !isExpired && navigate(`/quiz/${quiz._id}`)}
                  className={`group relative bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-[var(--app-dark-blue)]/60 hover:border-[var(--app-dark-blue)] transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md shadow-gray-200/50 ${index % 2 === 0 ? 'animate-slide-in-left' : 'animate-slide-in-right'
                    } ${isSubmitted
                      ? 'cursor-default bg-blue-50/20'
                      : isExpired
                        ? 'cursor-default bg-gray-50/20'
                        : 'cursor-pointer bg-white'
                    }`}
                  style={{ animationDelay: `${index * 0.15}s` }}
                >


                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Quiz Title */}
                      <div>
                        <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2 group-hover:text-[var(--app-dark-blue)] transition-colors leading-tight">
                          {quiz.name}
                        </h3>

                        {/* Info Badges Row */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                            <FiFileText className="w-3 h-3 text-gray-600 flex-shrink-0" />
                            <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                              {quiz.subjectId?.name || 'N/A'}
                            </span>
                          </div>

                          {quiz.classId ? (
                            // Preparation class
                            <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg">
                              <span className="text-[10px] sm:text-xs font-medium text-purple-700">
                                {quiz.classId.name || 'Prep Class'}
                              </span>
                            </div>
                          ) : (
                            // Regular class
                            <>
                              <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                                <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                                  Class {quiz.classNumber}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                                <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                                  {quiz.board}
                                </span>
                              </div>
                            </>
                          )}

                          {quiz.questions && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                              <FiFileText className="w-3 h-3 text-gray-600 flex-shrink-0" />
                              <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                                {quiz.questions.length} Q
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Deadline and Status Row */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {quiz.deadline && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                            <FiClock className={`w-3 h-3 ${isExpired ? 'text-red-600' : 'text-gray-600'}`} />
                            <span className={`text-[10px] sm:text-xs font-medium ${isExpired ? 'text-red-700' : 'text-gray-700'}`}>
                              {formatDeadline(quiz.deadline)}
                              {isExpired && ' (Expired)'}
                            </span>
                          </div>
                        )}

                        <div>
                          {isSubmitted ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                              <FiCheckCircle className="w-3 h-3 text-blue-600" />
                              <span className="text-[10px] sm:text-xs font-medium text-blue-700">Submitted</span>
                            </div>
                          ) : isExpired ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                              <FiClock className="w-3 h-3 text-gray-600" />
                              <span className="text-[10px] sm:text-xs font-medium text-gray-700">Expired</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                              <FiCheckCircle className="w-3 h-3 text-blue-600" />
                              <span className="text-[10px] sm:text-xs font-medium text-blue-700">Available</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button or Status Message */}
                      {(isSubmitted || isExpired) && quiz._id && (
                        <div className="mt-2 sm:mt-3">
                          {canViewResults ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (quiz._id) {
                                  navigate(`/quiz-results/${quiz._id}`);
                                }
                              }}
                              className="w-full sm:w-auto bg-gradient-to-r from-[var(--app-dark-blue)] to-blue-700 hover:from-blue-700 hover:to-[var(--app-dark-blue)] text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-xs sm:text-sm h-10 sm:h-11"
                            >
                              <FiAward className="text-sm sm:text-base" />
                              <span>View Results</span>
                            </button>
                          ) : (
                            <div className="w-full bg-amber-50 border-2 border-amber-400 rounded-lg sm:rounded-xl px-4 flex items-center gap-2 sm:gap-3 shadow-md h-10 sm:h-11">
                              <FiClock className="text-amber-600 text-base sm:text-lg flex-shrink-0" />
                              <p className="text-amber-900 font-bold text-sm sm:text-base">
                                Results Pending
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Take Test Button for Available Quizzes */}
                      {!isSubmitted && !isExpired && (
                        <div className="mt-2 sm:mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (quiz._id) {
                                navigate(`/quiz/${quiz._id}`);
                              }
                            }}
                            className="w-full sm:w-auto bg-gradient-to-r from-[var(--app-dark-blue)] to-blue-700 hover:from-blue-700 hover:to-[var(--app-dark-blue)] text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl border border-[var(--app-dark-blue)]/60 hover:border-[var(--app-dark-blue)] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-xs sm:text-sm h-10 sm:h-11"
                          >
                            <FiBook className="text-sm sm:text-base" />
                            <span>Take Test</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredQuizzes.length > 0 && (
          <div className="mt-4 sm:mt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-900">{((page - 1) * limit) + 1}</span> to <span className="font-bold text-gray-900">{Math.min(page * limit, totalItems)}</span> of <span className="font-bold text-gray-900">{totalItems}</span> results
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`p-2 rounded-lg border flex items-center gap-1 transition-all ${page === 1
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-[var(--app-dark-blue)] hover:text-white hover:border-[var(--app-dark-blue)]'
                    }`}
                >
                  <FiChevronLeft className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Previous</span>
                </button>

                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1 rounded-md border border-gray-200">
                    Page {page} of {totalPages}
                  </span>
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`p-2 rounded-lg border flex items-center gap-1 transition-all ${page === totalPages
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-[var(--app-dark-blue)] hover:text-white hover:border-[var(--app-dark-blue)]'
                    }`}
                >
                  <span className="hidden sm:inline font-medium">Next</span>
                  <FiChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Quizzes;
