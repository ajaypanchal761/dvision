import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSearch, FiClock, FiMessageCircle, FiCheckCircle, FiX, FiEdit2, FiUser, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import BottomNav from '../components/common/BottomNav';
import { doubtAPI } from '../services/api';

/**
 * Teacher Doubts Page
 * Shows all doubts and allows answering them
 * Redesigned with new theme
 */
const Doubts = () => {
  const navigate = useNavigate();
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDoubt, setSelectedDoubt] = useState(null);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchDoubts();
  }, [page, statusFilter]); // Refetch when page or status changes

  // Debounce search effect could be added here, currently sticking to manual or effect on string change
  useEffect(() => {
    // Reset page when search changes, but we also want to trigger fetch
    // Ideally we want to fetch when searchTerm changes too
    setPage(1);
    const delayDebounceFn = setTimeout(() => {
      fetchDoubts();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchDoubts = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: searchTerm
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await doubtAPI.getAllDoubts(params);
      if (response.success) {
        setDoubts(response.data.doubts || []);
        setTotalPages(response.pages || 1);
        setTotalItems(response.total || 0);
      }
    } catch (error) {
      console.error('Error fetching doubts:', error);
      // alert('Failed to load doubts. Please try again.'); // Silent fail on search typing
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 border-2 border-orange-300 shadow-sm';
      case 'Answered':
        return 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border-2 border-blue-300 shadow-sm';
      case 'Resolved':
        return 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-2 border-green-300 shadow-sm';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-2 border-gray-300 shadow-sm';
    }
  };

  const handleAnswerClick = (doubt) => {
    setSelectedDoubt(doubt);
    setAnswer(doubt.answer || '');
    setShowAnswerModal(true);
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      alert('Please enter an answer');
      return;
    }

    try {
      setSubmitting(true);
      const response = await doubtAPI.answerDoubt(selectedDoubt._id, answer);
      if (response.success) {
        setShowAnswerModal(false);
        setSelectedDoubt(null);
        setAnswer('');
        await fetchDoubts();
        alert(selectedDoubt?.answer ? 'Answer updated successfully!' : 'Answer submitted successfully!');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert(error.message || (selectedDoubt?.answer ? 'Failed to update answer. Please try again.' : 'Failed to submit answer. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (doubtId, status) => {
    try {
      const response = await doubtAPI.updateDoubtStatus(doubtId, status);
      if (response.success) {
        await fetchDoubts();
        alert('Status updated successfully!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.message || 'Failed to update status. Please try again.');
    }
  };

  // Client-side filtering removed
  const filteredDoubts = doubts;

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative animate-fade-in" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-4 sm:pb-6 md:pb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors hover:scale-110"
            >
              <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold animate-slide-in-left">Doubts</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
        {/* Search and Filter */}
        <div className="mb-4 sm:mb-5 md:mb-6 space-y-3 sm:space-y-4 animate-fade-in">
          <div className="relative">
            <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
              <FiSearch className="text-gray-400 text-sm sm:text-base" />
            </div>
            <input
              type="text"
              placeholder="Search by question or student name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl border-2 border-gray-200 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-sm sm:text-base shadow-sm hover:shadow-md focus:shadow-lg"
            />
          </div>
          <div className="flex gap-1.5 sm:gap-2 md:gap-3 flex-wrap">
            {['all', 'Pending', 'Answered', 'Resolved'].map((status) => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(1); }}
                className={`px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-bold transition-all duration-300 hover:scale-105 ${statusFilter === status
                  ? 'bg-gradient-to-r from-[var(--app-dark-blue)] to-blue-700 text-white shadow-lg hover:shadow-xl scale-105'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-[var(--app-dark-blue)]/30 hover:bg-gray-50 hover:shadow-md'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Doubts List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-[var(--app-dark-blue)] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 text-base font-semibold">Loading doubts...</p>
          </div>
        ) : filteredDoubts.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {filteredDoubts.map((doubt, index) => (
              <div
                key={doubt._id}
                className={`relative bg-gradient-to-br from-white via-white to-gray-50/30 rounded-xl border border-gray-200/80 transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-2 ${index % 2 === 0 ? 'animate-slide-in-left' : 'animate-slide-in-right'
                  }`}
                style={{
                  animationDelay: `${index * 0.15}s`,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(30, 58, 138, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)';
                  e.currentTarget.style.borderColor = 'rgba(30, 58, 138, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                }}
              >
                {/* 3D Top Highlight */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-t-xl pointer-events-none z-10"></div>
                <div className="px-3 sm:px-4 py-3 sm:py-3.5 relative z-0">
                  <div className="flex items-start gap-2 sm:gap-3">
                    {/* Left Side - Content */}
                    <div className="flex-1 min-w-0">
                      {/* Student Name - Top */}
                      {doubt.studentId && (
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[var(--app-dark-blue)] to-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
                            <FiUser className="text-white text-xs sm:text-sm font-bold" />
                          </div>
                          <p className="text-sm sm:text-base font-bold text-gray-800 truncate">
                            {doubt.studentId.name || 'Unknown Student'}
                          </p>
                        </div>
                      )}

                      {/* Date */}
                      <div className="flex items-center gap-1.5 text-gray-500 text-[10px] sm:text-xs mb-1.5">
                        <FiClock className="text-[var(--app-dark-blue)] text-xs" />
                        <span className="font-medium">{formatDate(doubt.createdAt)}</span>
                      </div>

                      {/* Question */}
                      <div className="mb-2">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-800 leading-snug sm:leading-relaxed line-clamp-2">
                          {doubt.question}
                        </h3>
                      </div>

                      {/* Answer Section */}
                      {doubt.answer && (
                        <div className="mb-2 p-2 sm:p-2.5 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-md sm:rounded-lg border border-blue-200">
                          <p className="text-gray-800 text-[10px] sm:text-xs leading-snug sm:leading-relaxed font-medium line-clamp-2">
                            {doubt.answer}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-1.5 sm:gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleAnswerClick(doubt)}
                          className="group relative overflow-hidden flex-1 bg-gradient-to-r from-[var(--app-dark-blue)] via-[var(--app-dark-blue)] to-blue-700 hover:from-blue-700 hover:via-[var(--app-dark-blue)] hover:to-[var(--app-dark-blue)] text-white font-bold py-1.5 sm:py-2 rounded-md sm:rounded-lg transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center gap-1 text-[10px] sm:text-xs"
                        >
                          <span className="relative z-10 flex items-center gap-1">
                            <FiMessageCircle className="text-xs group-hover:scale-110 transition-transform duration-300" />
                            <span>{doubt.answer ? 'Edit' : 'Answer'}</span>
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        </button>
                        <select
                          value={doubt.status}
                          onChange={(e) => handleStatusChange(doubt._id, e.target.value)}
                          className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg border-2 border-gray-200 bg-white text-[10px] sm:text-xs font-bold text-gray-700 focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 cursor-pointer hover:border-[var(--app-dark-blue)]/50 transition-all shadow-sm hover:shadow-md"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Answered">Answered</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                    </div>

                    {/* Right Side - Images */}
                    {doubt.images && doubt.images.length > 0 && (
                      <div className="flex-shrink-0">
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                          {doubt.images.slice(0, 3).map((imageUrl, index) => (
                            <div key={index} className="relative">
                              <img
                                src={imageUrl}
                                alt={`Doubt image ${index + 1}`}
                                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-cover rounded-md sm:rounded-lg border-2 border-gray-200 cursor-pointer hover:scale-105 transition-transform shadow-sm"
                                onClick={() => {
                                  setSelectedImage(imageUrl);
                                  setShowImageModal(true);
                                }}
                              />
                            </div>
                          ))}
                          {doubt.images.length > 3 && (
                            <div
                              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-md sm:rounded-lg border-2 border-gray-200 bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors shadow-sm"
                              onClick={() => {
                                setSelectedImage(doubt.images[3]);
                                setShowImageModal(true);
                              }}
                            >
                              <span className="text-[10px] sm:text-xs font-bold text-gray-600">
                                +{doubt.images.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-[var(--app-dark-blue)]/10 to-blue-50 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <FiMessageCircle className="text-[var(--app-dark-blue)] text-5xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
              {searchTerm ? 'No doubts found' : 'No doubts yet'}
            </h3>
            <p className="text-gray-600 text-base font-medium text-center max-w-md">
              {searchTerm ? 'Try adjusting your search or filters.' : 'When students ask doubts, they will appear here.'}
            </p>
          </div>
        )}
      </main>

      {/* Pagination Controls */}
      {!loading && doubts.length > 0 && (
        <div className="px-3 sm:px-4 md:px-6 mb-20 sm:mb-24">
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

      {/* Answer Modal */}
      {showAnswerModal && selectedDoubt && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-3 sm:px-4"
          onClick={() => {
            setShowAnswerModal(false);
            setSelectedDoubt(null);
            setAnswer('');
          }}
        >
          <div
            className="bg-white rounded-lg sm:rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-y-auto flex-1 px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 pb-2">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-800">
                  {selectedDoubt.answer ? 'Edit Answer' : 'Answer Doubt'}
                </h2>
                <button
                  onClick={() => {
                    setShowAnswerModal(false);
                    setSelectedDoubt(null);
                    setAnswer('');
                  }}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="text-gray-600 text-base sm:text-lg" />
                </button>
              </div>
              <div className="mb-2 sm:mb-3">
                <p className="text-[10px] sm:text-xs text-gray-600 mb-1 font-medium">Question:</p>
                <p className="text-xs sm:text-sm font-bold text-gray-800">{selectedDoubt.question}</p>
              </div>
              {selectedDoubt.answer && (
                <div className="mb-2 sm:mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-blue-700 font-medium mb-0.5">Current Answer:</p>
                  <p className="text-[10px] sm:text-xs text-blue-900">{selectedDoubt.answer}</p>
                </div>
              )}
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 mb-1.5">
                  {selectedDoubt.answer ? 'Update Your Answer' : 'Your Answer'}
                </label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows="6"
                  className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg border-2 border-gray-200 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all resize-none text-xs sm:text-sm"
                  placeholder={selectedDoubt.answer ? "Update your answer here..." : "Enter your answer here..."}
                  autoFocus={selectedDoubt.answer}
                ></textarea>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 p-3 sm:p-4 pt-2 sm:pt-3 border-t border-gray-200 bg-white">
              <button
                onClick={() => {
                  setShowAnswerModal(false);
                  setSelectedDoubt(null);
                  setAnswer('');
                }}
                className="flex-1 bg-white border-2 border-gray-300 text-gray-700 font-semibold sm:font-bold py-2 sm:py-2.5 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || !answer.trim()}
                className="group relative overflow-hidden flex-1 bg-gradient-to-r from-[var(--app-dark-blue)] via-[var(--app-dark-blue)] to-blue-700 hover:from-blue-700 hover:via-[var(--app-dark-blue)] hover:to-[var(--app-dark-blue)] text-white font-semibold sm:font-bold py-2 sm:py-2.5 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                <span className="relative z-10">
                  {submitting
                    ? (selectedDoubt?.answer ? 'Updating...' : 'Submitting...')
                    : (selectedDoubt?.answer ? 'Update Answer' : 'Submit Answer')
                  }
                </span>
                {!submitting && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4"
          onClick={() => {
            setShowImageModal(false);
            setSelectedImage(null);
          }}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => {
                setShowImageModal(false);
                setSelectedImage(null);
              }}
              className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-xl transition-all hover:scale-110"
            >
              <FiX className="text-xl font-bold" />
            </button>
            <img
              src={selectedImage}
              alt="Doubt image"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default Doubts;
