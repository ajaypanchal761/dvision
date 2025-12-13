import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiInfo, FiUser } from 'react-icons/fi';
import { getCourseById } from '../data/dummyData';
import { ROUTES } from '../constants/routes';
import BottomNav from '../components/common/BottomNav';
import Image from '../components/common/Image';

/**
 * Teacher Details Page
 * Shows course details with About section and Educators list
 */
const TeacherDetails = () => {
  const { courseId, teacherIndex } = useParams();
  const navigate = useNavigate();

  const course = getCourseById(courseId);
  const teacherIdx = parseInt(teacherIndex || '0', 10);
  const selectedTeacher = course?.teachers?.[teacherIdx];

  if (!course) {
    return (
      <div className="min-h-screen w-full bg-[var(--app-white)] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[var(--app-black)] text-base sm:text-lg md:text-xl mb-3 sm:mb-4">Course not found</p>
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="bg-[var(--app-teal)] text-[var(--app-white)] px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Format class number
  const formatClass = (classNum) => {
    if (typeof classNum === 'string') {
      return classNum;
    }
    const num = parseInt(classNum);
    if (num === 1) return '1st';
    if (num === 2) return '2nd';
    if (num === 3) return '3rd';
    return `${num}th`;
  };

  return (
    <div className="min-h-screen w-full bg-[var(--app-white)] pb-20 sm:pb-24 md:pb-28">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10 rounded-b-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 sm:p-2 md:p-2.5 hover:bg-[var(--app-beige)] rounded-full transition-colors"
          >
            <FiArrowLeft className="text-[var(--app-black)] text-lg sm:text-xl md:text-2xl" />
          </button>
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[var(--app-black)]">Details</h1>
          <div className="w-8 sm:w-10 md:w-12"></div> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6 lg:py-8">
        {/* About Section */}
        <div className="mb-5 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 mb-2.5 sm:mb-3 md:mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FiInfo className="text-blue-600 text-sm sm:text-base md:text-lg" />
            </div>
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[var(--app-black)]">About</h2>
          </div>
          <p className="text-[var(--app-black)] text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed">
            Enroll in this batch to master the {formatClass(course.class)} concepts with your favorite educators & cover the {course.board} term 2 Syllabus in an effective way. so don't leave any effort and crack your exam with the highest marks. Your educators will cover {course.subjects?.slice(0, 5).join(', ')}{course.subjects?.length > 5 ? ' & more' : ''}. The batch will be conducted in English & notes will be available in English after every class.
          </p>
        </div>

        {/* Educator Section - Single Teacher */}
        {selectedTeacher ? (
          <div>
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[var(--app-black)] mb-3 sm:mb-4 md:mb-6">Educator</h2>
            <div className="flex gap-2.5 sm:gap-3 md:gap-4 lg:gap-5">
              {/* Teacher Avatar */}
              <div className="flex-shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-[var(--app-teal)]/20 border-2 border-[var(--app-teal)]/30 flex items-center justify-center overflow-hidden">
                  {selectedTeacher.profileImage ? (
                    <Image
                      src={selectedTeacher.profileImage}
                      alt={selectedTeacher.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FiUser className="text-[var(--app-teal)] text-xl sm:text-2xl md:text-3xl lg:text-4xl" />
                  )}
                </div>
              </div>

              {/* Teacher Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[var(--app-black)] mb-1 sm:mb-1.5 md:mb-2 break-words">
                  {selectedTeacher.name}
                </h3>
                
                {/* Teacher Details */}
                <div className="space-y-0.5 sm:space-y-1 md:space-y-1.5">
                  {selectedTeacher.subject && (
                    <p className="text-xs sm:text-sm md:text-base text-[var(--app-black)]/70 break-words">
                      {selectedTeacher.subject} Educator{selectedTeacher.experience ? ` - ${selectedTeacher.experience}` : ''}
                    </p>
                  )}
                  
                  {selectedTeacher.bio && (
                    <p className="text-xs sm:text-sm md:text-base text-[var(--app-black)]/70 break-words">
                      {selectedTeacher.bio}
                    </p>
                  )}
                  
                  {selectedTeacher.minutesTaught && (
                    <p className="text-xs sm:text-sm md:text-base text-[var(--app-black)]/70 break-words">
                      {selectedTeacher.minutesTaught} minutes taught
                    </p>
                  )}
                  
                  {selectedTeacher.achievements && (
                    <p className="text-xs sm:text-sm md:text-base text-[var(--app-black)]/70 break-words">
                      {selectedTeacher.achievements}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-10">
            <p className="text-[var(--app-black)] text-sm sm:text-base md:text-lg">Teacher not found</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default TeacherDetails;

