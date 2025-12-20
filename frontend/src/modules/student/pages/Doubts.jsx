import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSearch, FiCalendar, FiClock, FiPlus, FiX, FiChevronDown, FiPaperclip, FiMessageCircle, FiUser, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import BottomNav from '../components/common/BottomNav';
import { doubtAPI, teacherAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Doubts Page
 * Shows user's doubts and allows asking new doubts
 * Redesigned with new theme
 */
const Doubts = () => {
  const navigate = useNavigate();
  const { hasActiveSubscription } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAskDoubtModal, setShowAskDoubtModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [question, setQuestion] = useState('');
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch teachers list
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoadingTeachers(true);
        const response = await teacherAPI.getAllTeachers();

        console.log('Teachers API response:', response);

        if (response && response.success) {
          // Backend already filters active teachers (isActive: true)
          // Handle different possible response structures
          let teachersList = [];
          if (response.data?.teachers && Array.isArray(response.data.teachers)) {
            teachersList = response.data.teachers;
          } else if (Array.isArray(response.data)) {
            teachersList = response.data;
          } else if (Array.isArray(response.teachers)) {
            teachersList = response.teachers;
          }

          // Backend already filters by isActive: true, so we just need to ensure valid teachers
          const validTeachers = Array.isArray(teachersList)
            ? teachersList.filter(t => t && t._id && t.name)
            : [];

          console.log('Teachers fetched from API:', validTeachers.length);
          if (validTeachers.length > 0) {
            console.log('Sample teacher:', validTeachers[0]);
          }

          setTeachers(validTeachers);
        } else {
          console.error('Failed to fetch teachers - invalid response:', response);
          setTeachers([]);
        }
      } catch (error) {
        console.error('Error fetching teachers:', error);
        console.error('Error details:', error.message, error.status);
        // Don't show alert on initial load, just log
        setTeachers([]);
      } finally {
        setLoadingTeachers(false);
      }
    };
    fetchTeachers();
  }, []);

  // Fetch doubts from backend
  useEffect(() => {
    fetchDoubts();
  }, [page]); // Refetch when page changes

  // Debounce search
  useEffect(() => {
    setPage(1);
    const delayDebounceFn = setTimeout(() => {
      fetchDoubts();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchDoubts = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: searchQuery
      };

      const response = await doubtAPI.getMyDoubts(params);
      if (response.success && response.data.doubts) {
        // Format doubts for display
        const formattedDoubts = response.data.doubts.map(doubt => ({
          id: doubt._id,
          question: doubt.question,
          teacher: doubt.teacherId,
          status: doubt.status,
          date: new Date(doubt.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }),
          answer: doubt.answer || null,
          answeredBy: doubt.answeredBy || null,
          images: doubt.images || []
        }));
        setDoubts(formattedDoubts);
        setTotalPages(response.pages || 1);
        setTotalItems(response.total || 0);
      }
    } catch (error) {
      console.error('Error fetching doubts:', error);
      if (!searchQuery) {
        // alert('Failed to load doubts. Please try again.'); // Silent fail on search
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return dateString; // Already in DD-MM-YYYY format
  };

  // Convert image file to base64
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Answered':
        return 'bg-[var(--app-dark-blue)] text-white border-[var(--app-dark-blue)]';
      case 'Resolved':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length + selectedImages.length > 5) {
      alert('You can attach maximum 5 images');
      return;
    }

    const newImages = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setSelectedImages([...selectedImages, ...newImages]);
  };

  const handleRemoveImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    URL.revokeObjectURL(selectedImages[index].preview);
    setSelectedImages(newImages);
  };

  const handleSendDoubt = async () => {
    if (!selectedTeacherId || !question.trim()) {
      alert('Please select a teacher and enter your question');
      return;
    }

    try {
      setSubmitting(true);

      // Convert images to base64
      let imageBase64Array = [];
      if (selectedImages.length > 0) {
        for (const imageObj of selectedImages) {
          try {
            const base64 = await convertImageToBase64(imageObj.file);
            imageBase64Array.push(base64);
          } catch (error) {
            console.error('Error converting image to base64:', error);
          }
        }
      }

      // Prepare doubt data
      const doubtData = {
        teacherId: selectedTeacherId,
        question: question.trim(),
        images: imageBase64Array.length > 0 ? imageBase64Array : undefined
      };

      // Call backend API
      const response = await doubtAPI.createDoubt(doubtData);

      if (response.success) {
        // Close modal and reset form
        setShowAskDoubtModal(false);
        setSelectedTeacherId('');
        setQuestion('');
        selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
        setSelectedImages([]);

        // Refresh doubts list
        await fetchDoubts();

        alert('Doubt submitted successfully!');
      } else {
        throw new Error(response.message || 'Failed to submit doubt');
      }
    } catch (error) {
      console.error('Error submitting doubt:', error);
      alert(error.message || 'Failed to submit doubt. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTeacher = teachers.find(t => t._id === selectedTeacherId);

  return (
    <div className="min-h-screen w-full bg-white">
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
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold animate-slide-in-left">
              Ask Doubt
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 pb-20 sm:pb-24">
        {/* Search Bar */}
        <div className="mb-4 sm:mb-5 md:mb-6 animate-fade-in">
          <div className="relative">
            <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
              <FiSearch className="text-gray-400 text-sm sm:text-base md:text-lg" />
            </div>
            <input
              type="text"
              placeholder="Search doubts by teacher or question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)]/50 shadow-md border-2 border-gray-200 text-sm sm:text-base"
            />
            <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
              <FiCalendar className="text-[var(--app-dark-blue)] text-sm sm:text-base md:text-lg" />
            </div>
          </div>
        </div>

        {/* Doubts List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] py-8 sm:py-10 md:py-12">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-4 border-[var(--app-dark-blue)] border-t-transparent rounded-full animate-spin mb-3 sm:mb-4"></div>
            <p className="text-gray-600 text-sm sm:text-base font-medium">
              Loading doubts...
            </p>
          </div>
        ) : !hasActiveSubscription ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] py-8 sm:py-10 md:py-12">
            <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mb-4 sm:mb-5 md:mb-6">
              <FiMessageCircle className="text-[var(--app-dark-blue)] text-3xl sm:text-4xl" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-1.5 sm:mb-2 text-center">
              No Subscription
            </h2>
            <p className="text-gray-500 text-center max-w-md text-xs sm:text-sm md:text-base px-3 sm:px-4 mb-4">
              You need an active subscription to ask doubts. Please subscribe to a plan to continue learning.
            </p>
            <button
              onClick={() => navigate('/subscription-plans')}
              className="bg-[var(--app-dark-blue)] hover:bg-blue-700 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-xs sm:text-sm md:text-base"
            >
              View Subscription Plans
            </button>
          </div>
        ) : doubts.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {doubts.map((doubt, index) => (
              <div
                key={doubt.id}
                className={`bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 ${index % 2 === 0 ? 'animate-slide-in-left' : 'animate-slide-in-right'
                  }`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Teacher Badge */}
                    {doubt.teacher && (
                      <div className="mb-2 sm:mb-2.5 md:mb-3">
                        <div className="flex items-center gap-2">
                          <FiUser className="text-[var(--app-dark-blue)] text-sm" />
                          <span className="inline-block px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-[var(--app-dark-blue)]/10 text-[var(--app-dark-blue)] border border-[var(--app-dark-blue)]/20">
                            {doubt.teacher.name}
                          </span>
                          {doubt.teacher.subjects && doubt.teacher.subjects.length > 0 && (
                            <span className="text-xs text-gray-500">
                              ({doubt.teacher.subjects.join(', ')})
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Question */}
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 mb-2 sm:mb-2.5 md:mb-3 leading-tight">
                      {doubt.question}
                    </h3>

                    {/* Status and Date */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className={`px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs md:text-sm font-bold border ${getStatusColor(doubt.status)}`}>
                        {doubt.status}
                      </span>
                      <div className="flex items-center gap-1 sm:gap-1.5 text-gray-500 text-xs sm:text-sm">
                        <FiClock className="text-[var(--app-dark-blue)]" />
                        <span className="font-medium">{formatDate(doubt.date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Images on Right Side */}
                  {doubt.images && doubt.images.length > 0 && (
                    <div className="flex-shrink-0">
                      <div className="flex flex-col gap-1.5 sm:gap-2">
                        {doubt.images.slice(0, 3).map((imageUrl, index) => (
                          <div key={index} className="relative">
                            <img
                              src={imageUrl}
                              alt={`Doubt image ${index + 1}`}
                              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                              onClick={() => window.open(imageUrl, '_blank')}
                            />
                          </div>
                        ))}
                        {doubt.images.length > 3 && (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg border-2 border-gray-200 bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                            <span className="text-[10px] sm:text-xs font-bold text-gray-600">
                              +{doubt.images.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Answer Section */}
                {doubt.answer && (
                  <div className="mt-3 sm:mt-3.5 md:mt-4 p-3 sm:p-3.5 md:p-4 bg-blue-50 rounded-lg sm:rounded-xl border border-blue-100">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                      <FiMessageCircle className="text-[var(--app-dark-blue)] text-sm sm:text-base md:text-lg" />
                      <p className="text-xs sm:text-sm font-bold text-[var(--app-dark-blue)]">
                        Answer{doubt.answeredBy && doubt.answeredBy.name ? ` by ${doubt.answeredBy.name}` : ''}:
                      </p>
                    </div>
                    <p className="text-gray-700 text-xs sm:text-sm md:text-base leading-relaxed">
                      {doubt.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[40vh] py-8 sm:py-10 md:py-12 animate-fade-in">
            <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mb-4 sm:mb-5 md:mb-6">
              <FiMessageCircle className="text-[var(--app-dark-blue)] text-3xl sm:text-4xl" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-1.5 sm:mb-2 text-center">
              No doubts yet
            </h2>
            <p className="text-gray-500 text-center max-w-md text-xs sm:text-sm md:text-base px-3 sm:px-4">
              Ask your first doubt to get help from expert teachers
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && doubts.length > 0 && (
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

      {/* Floating Action Button - Only show if user has active subscription */}
      {hasActiveSubscription && (
        <button
          onClick={() => setShowAskDoubtModal(true)}
          className="fixed bottom-24 sm:bottom-28 md:bottom-32 right-3 sm:right-4 md:right-6 bg-[var(--app-dark-blue)] text-white font-bold px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 md:py-3.5 rounded-full shadow-xl hover:bg-[var(--app-dark-blue)]/90 hover:shadow-2xl hover:scale-110 transition-all flex items-center gap-1.5 sm:gap-2 z-40 animate-fade-in"
        >
          <FiPlus className="text-lg sm:text-xl" />
          <span className="text-xs sm:text-sm md:text-base">Ask New Doubt</span>
        </button>
      )}

      {/* Ask New Doubt Modal */}
      {showAskDoubtModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 sm:px-6"
          onClick={() => {
            setShowAskDoubtModal(false);
            setSelectedTeacherId('');
            setQuestion('');
            selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
            setSelectedImages([]);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 md:py-5 border-b border-gray-200 bg-gradient-to-r from-[var(--app-dark-blue)] to-blue-700">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">
                  Ask New Doubt
                </h2>
                <button
                  onClick={() => {
                    setShowAskDoubtModal(false);
                    setSelectedTeacherId('');
                    setQuestion('');
                    selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
                    setSelectedImages([]);
                  }}
                  className="p-1.5 sm:p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                >
                  <FiX className="text-lg sm:text-xl md:text-2xl" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6 space-y-3 sm:space-y-4 md:space-y-5">
              {/* Teacher Selection */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-1.5 sm:mb-2">
                  Select Teacher <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTeacherDropdown(!showTeacherDropdown)}
                    disabled={loadingTeachers}
                    className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl border-2 border-gray-200 bg-white hover:border-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] transition-all text-left shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className={`text-sm sm:text-base font-medium ${selectedTeacherId ? 'text-gray-800' : 'text-gray-400'}`}>
                      {selectedTeacher ? `${selectedTeacher.name}${selectedTeacher.subjects && selectedTeacher.subjects.length > 0 ? ` (${selectedTeacher.subjects.join(', ')})` : ''}` : loadingTeachers ? 'Loading teachers...' : 'Select Teacher'}
                    </span>
                    <FiChevronDown className={`text-gray-400 text-base sm:text-lg md:text-xl transition-transform ${showTeacherDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showTeacherDropdown && !loadingTeachers && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowTeacherDropdown(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-1.5 sm:mt-2 bg-white border-2 border-[var(--app-dark-blue)]/30 rounded-lg sm:rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto">
                        {teachers.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            {loadingTeachers ? 'Loading teachers...' : 'No active teachers available. Please contact admin.'}
                          </div>
                        ) : (
                          teachers.map((teacher) => (
                            <button
                              key={teacher._id}
                              type="button"
                              onClick={() => {
                                setSelectedTeacherId(teacher._id);
                                setShowTeacherDropdown(false);
                              }}
                              className={`w-full flex flex-col items-start gap-1 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 hover:bg-blue-50 transition-colors text-left ${selectedTeacherId === teacher._id ? 'bg-[var(--app-dark-blue)]/10 font-semibold' : ''
                                }`}
                            >
                              <span className={`text-sm sm:text-base ${selectedTeacherId === teacher._id ? 'text-[var(--app-dark-blue)]' : 'text-gray-700'}`}>
                                {teacher.name}
                              </span>
                              {teacher.subjects && teacher.subjects.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  Subjects: {teacher.subjects.join(', ')}
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Question Input */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-1.5 sm:mb-2">
                  Your Question <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows="5"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl border-2 border-gray-200 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-gray-800 resize-none text-sm sm:text-base placeholder-gray-400 shadow-sm"
                  placeholder="Type your question here in detail..."
                  required
                ></textarea>
              </div>

              {/* Attach Image Button */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-1.5 sm:mb-2">
                  Attach Images <span className="text-gray-400 font-normal text-[10px] sm:text-xs">(Optional, Max 5)</span>
                </label>
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl border-2 border-gray-200 bg-white hover:border-[var(--app-dark-blue)] transition-all cursor-pointer shadow-sm"
                >
                  <FiPaperclip className="text-[var(--app-dark-blue)] text-base sm:text-lg md:text-xl" />
                  <span className="text-gray-700 font-medium text-sm sm:text-base">Attach Image(s)</span>
                </label>
                {selectedImages.length > 0 && (
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2 font-medium">
                    {selectedImages.length} image(s) selected
                  </p>
                )}
              </div>

              {/* Image Previews */}
              {selectedImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-16 sm:h-18 md:h-20 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                      >
                        <FiX className="text-[10px] sm:text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 p-4 sm:p-5 md:p-6 pt-3 sm:pt-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setShowAskDoubtModal(false);
                  setSelectedTeacherId('');
                  setQuestion('');
                  selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
                  setSelectedImages([]);
                }}
                className="flex-1 bg-gray-200 text-gray-800 font-bold py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl hover:bg-gray-300 transition-colors text-xs sm:text-sm md:text-base shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSendDoubt();
                }}
                disabled={submitting || !selectedTeacherId || !question.trim()}
                className="flex-1 bg-[var(--app-dark-blue)] text-white font-bold py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl hover:bg-[var(--app-dark-blue)]/90 transition-colors text-xs sm:text-sm md:text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--app-dark-blue)]"
              >
                {submitting ? 'Submitting...' : 'Submit Doubt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default Doubts;
