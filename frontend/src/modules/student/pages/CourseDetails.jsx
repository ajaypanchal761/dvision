import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShare2, FiFileText, FiDownload, FiInfo, FiCalendar, FiLayers } from 'react-icons/fi';
import { studentAPI } from '../services/api';
import { ROUTES } from '../constants/routes';
import Image from '../components/common/Image';
import BottomNav from '../components/common/BottomNav';

// Helper function to get API base URL
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace('/api', '');
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProduction = hostname.includes('dvisionacademy.com');
    if (isProduction) {
      const protocol = window.location.protocol;
      if (hostname.startsWith('www.')) {
        return `${protocol}//api.${hostname.substring(4)}`;
      } else if (!hostname.startsWith('api.')) {
        return `${protocol}//api.${hostname}`;
      } else {
        return `${protocol}//${hostname}`;
      }
    }
  }
  return 'http://localhost:5000';
};

/**
 * Course Details Page
 * Shows detailed course information with chapters and PDFs
 * Redesigned with new theme
 */
const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await studentAPI.getCourseById(id);
        if (response.success && response.data?.course) {
          setCourse(response.data.course);
        } else {
          setError('Course not found');
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setError(err.message || 'Failed to load course details');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchCourse();
    }
  }, [id]);

  const handlePdfView = (pdfUrl) => {
    if (!pdfUrl) return;

    // If already absolute URL, use it
    if (pdfUrl.startsWith('http')) {
      window.open(pdfUrl, '_blank');
      return;
    }

    // If protocol-relative URL (//...), prefix protocol
    if (pdfUrl.startsWith('//')) {
      window.open(`${window.location.protocol}${pdfUrl}`, '_blank');
      return;
    }

    // If url contains the current hostname (but stored with an extra leading slash),
    // extract suffix from hostname occurrence and build correct absolute URL.
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';

      const hostIndex = hostname ? pdfUrl.indexOf(hostname) : -1;
      if (hostIndex !== -1) {
        // e.g. pdfUrl = '/.dvisionacademy.com/api/uploads/..' -> find hostname and keep suffix
        const suffix = pdfUrl.substring(hostIndex + hostname.length) || '';
        const fullUrl = `${protocol}//${hostname}${suffix}`;
        window.open(fullUrl, '_blank');
        return;
      }
    } catch (e) {
      // fallthrough to default behavior
      console.error('Error normalizing pdfUrl', e);
    }

    // Default: relative path like /uploads/..., prefix API base
    const fullUrl = pdfUrl.startsWith('/') ? `${getApiBaseUrl()}${pdfUrl}` : `${getApiBaseUrl()}/${pdfUrl}`;
    window.open(fullUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--app-dark-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-base font-medium">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-800 text-lg font-bold mb-4">
            {error || 'Course not found'}
          </p>
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="bg-gradient-to-r from-[var(--app-dark-blue)] to-[var(--app-teal)] text-white px-8 py-3.5 rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg flex items-center gap-2"
          >
            <FiArrowLeft className="text-lg" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-2 sm:px-3 pt-2 sm:pt-3 pb-2 sm:pb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/my-courses')}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl" />
            </button>
            <button
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiShare2 className="text-lg sm:text-xl" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 sm:pb-24">
        {/* Banner Section */}
        <div className="relative mt-2 sm:mt-3 mb-3 sm:mb-4 overflow-hidden">
          <div className="relative h-32 sm:h-40 md:h-44 w-full">
            <Image
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </div>
        </div>

        {/* Course Details Section */}
        <div className="px-2 sm:px-3 md:px-4 space-y-2.5 sm:space-y-3">
          {/* Course Title */}
          <div className="mt-2 sm:mt-3">
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 leading-tight">
              {course.title}
            </h1>
          </div>

          {/* Board and Class or Preparation Class */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <FiCalendar className="text-[var(--app-dark-blue)] text-sm sm:text-base flex-shrink-0" />
            {course.classId ? (
              <span className="text-purple-700 font-medium text-xs sm:text-sm bg-purple-50 px-2 py-1 rounded">
                {course.classId.name || 'Preparation Class'}
              </span>
            ) : (
              <span className="text-gray-700 font-medium text-xs sm:text-sm">
                {course.board} · Class {course.class}
              </span>
            )}
          </div>

          {/* Subject */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <FiLayers className="text-[var(--app-dark-blue)] text-sm sm:text-base flex-shrink-0" />
            <span className="text-gray-700 font-medium text-xs sm:text-sm">
              Subject: {course.subject}
            </span>
          </div>

          {/* About Section */}
          {course.description && (
            <div className="bg-gradient-to-br from-blue-50 via-[var(--app-dark-blue)]/5 to-[var(--app-teal)]/5 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-[var(--app-dark-blue)]/20 shadow-md">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-2.5">
                <div className="p-1 sm:p-1.5 bg-gradient-to-br from-[var(--app-dark-blue)] to-[var(--app-teal)] rounded-lg shadow-sm flex-shrink-0">
                  <FiInfo className="text-white text-xs sm:text-sm" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">About This Course</h3>
              </div>
              <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                {course.description}
              </p>
            </div>
          )}

          {/* Chapters Section */}
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 flex-wrap">
              <h3 className="font-bold text-gray-900 text-base sm:text-lg">Course Chapters</h3>
              {course.chapters && course.chapters.length > 0 && (
                <span className="px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-[var(--app-dark-blue)]/10 to-[var(--app-teal)]/10 rounded-full text-[var(--app-dark-blue)] text-[10px] sm:text-xs font-semibold border border-[var(--app-dark-blue)]/20">
                  {course.chapters.length} {course.chapters.length === 1 ? 'Chapter' : 'Chapters'}
                </span>
              )}
            </div>

            {!course.chapters || course.chapters.length === 0 ? (
              <div className="text-center py-4 sm:py-6 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiFileText className="text-gray-400 text-xl sm:text-2xl" />
                </div>
                <p className="text-gray-600 text-xs sm:text-sm font-medium">No chapters available for this course yet.</p>
                <p className="text-gray-500 text-[10px] sm:text-xs mt-1">Check back later for updates.</p>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {course.chapters.map((chapter, index) => (
                  <div
                    key={chapter._id || index}
                    className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-2.5 sm:p-3 shadow-md hover:shadow-lg hover:border-[var(--app-dark-blue)]/40 transition-all"
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      {/* Chapter Number */}
                      <div className="flex-shrink-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[var(--app-dark-blue)] to-[var(--app-teal)] rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-white font-bold text-[10px] sm:text-xs">
                            {chapter.chapterNumber || index + 1}
                          </span>
                        </div>
                      </div>

                      {/* Chapter Content */}
                      <div className="flex-1 min-w-0">
                        {/* Chapter Title */}
                        <h4 className="font-bold text-gray-900 text-xs sm:text-sm mb-1.5 leading-tight">
                          {chapter.chapterName}
                        </h4>

                        {/* Chapter Description */}
                        {chapter.chapterDetails && (
                          <p className="text-gray-600 text-[10px] sm:text-xs mb-2.5 leading-relaxed">
                            {chapter.chapterDetails}
                          </p>
                        )}

                        {/* PDF Button */}
                        {chapter.pdfUrl && (
                          <button
                            onClick={() => handlePdfView(chapter.pdfUrl)}
                            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-600 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold text-[10px] sm:text-xs transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1 sm:gap-1.5 w-full sm:w-auto"
                          >
                            <FiFileText className="text-xs" />
                            <span>View PDF</span>
                            <FiDownload className="text-xs" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default CourseDetails;
