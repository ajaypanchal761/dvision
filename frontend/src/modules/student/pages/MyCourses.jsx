import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlay, FiBook, FiCalendar, FiLayers, FiUsers } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { studentAPI } from '../services/api';
import { ROUTES } from '../constants/routes';
import BottomNav from '../components/common/BottomNav';
import Image from '../components/common/Image';
import sub1Image from '../assets/sub1.jpg';
import sub2Image from '../assets/sub2.jpg';
import sub3Image from '../assets/sub3.jpg';
import sub4Image from '../assets/sub4.jpg';
import sub5Image from '../assets/sub5.jpg';

/**
 * My Courses Page
 * Shows available courses
 * Redesigned with new theme
 */
const MyCourses = () => {
  const navigate = useNavigate();
  const { user, hasActiveSubscription } = useAuth();
  const [allCourses, setAllCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Get user's class and board
  const userClass = user?.class || 10;
  const userBoard = user?.board || 'CBSE';

  // Map subjects to different images
  const getSubjectImage = (subject, index) => {
    const subjectImages = [sub1Image, sub2Image, sub3Image, sub4Image, sub5Image];
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('math') || subjectLower.includes('mathematics')) {
      return sub1Image;
    } else if (subjectLower.includes('science') || subjectLower.includes('physics') || subjectLower.includes('chemistry') || subjectLower.includes('biology')) {
      return sub2Image;
    } else if (subjectLower.includes('english')) {
      return sub3Image;
    } else if (subjectLower.includes('hindi')) {
      return sub4Image;
    } else {
      return subjectImages[index % subjectImages.length];
    }
  };

  // Fetch courses filtered by user's class & board
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const response = await studentAPI.getCourses();
        if (response.success && response.data?.courses) {
          // Transform backend courses to match frontend format
          const transformedCourses = response.data.courses.map((course, index) => ({
            id: course._id,
            name: course.title,
            thumbnail: course.thumbnail,
            description: course.description || '',
            subject: course.subject,
            subjects: [course.subject],
            class: course.class,
            board: course.board,
            classId: course.classId, // For preparation classes
            chapters: course.chapters || [],
            status: course.status,
            teacherName: null
          }));
          setAllCourses(transformedCourses);
        } else {
          setAllCourses([]);
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        setAllCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    if (user) {
      fetchCourses();
    }
  }, [user]);
  
  // Create subject-wise course cards
  const subjectCourses = useMemo(() => {
    const subjectMap = new Map();
    let subjectIndex = 0;
    
    allCourses.forEach((course) => {
      const subjects = course.subjects || (course.subject ? [course.subject] : []);
      
      if (subjects && Array.isArray(subjects) && subjects.length > 0) {
        subjects.forEach((subject) => {
          const key = `${course.id}-${subject}`;
          if (!subjectMap.has(key)) {
            subjectMap.set(key, {
              subject: subject,
              course: course,
              courseId: course.id,
              image: course.thumbnail || getSubjectImage(subject, subjectIndex)
            });
            subjectIndex++;
          }
        });
      }
    });
    
    return Array.from(subjectMap.values());
  }, [allCourses]);

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
              My Courses
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 pb-20 sm:pb-24">
        {/* Course Cards List */}
        <div className="space-y-3 sm:space-y-4 md:space-y-5">
          {loadingCourses ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] py-8 sm:py-10 md:py-12">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-4 border-[var(--app-dark-blue)] border-t-transparent rounded-full animate-spin mb-3 sm:mb-4"></div>
              <p className="text-gray-600 text-sm sm:text-base font-medium">
                Loading courses...
              </p>
            </div>
          ) : !hasActiveSubscription ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] py-8 sm:py-10 md:py-12">
              <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mb-4 sm:mb-5 md:mb-6">
                <FiBook className="text-[var(--app-dark-blue)] text-3xl sm:text-4xl" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-1.5 sm:mb-2 text-center">
                No Subscription
              </h2>
              <p className="text-gray-500 text-center max-w-md text-xs sm:text-sm md:text-base px-3 sm:px-4 mb-4">
                You need an active subscription to access courses. Please subscribe to a plan to continue learning.
              </p>
              <button
                onClick={() => navigate('/subscription-plans')}
                className="bg-[var(--app-dark-blue)] hover:bg-blue-700 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-xs sm:text-sm md:text-base"
              >
                View Subscription Plans
              </button>
            </div>
          ) : subjectCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] py-8 sm:py-10 md:py-12">
              <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mb-4 sm:mb-5 md:mb-6">
                <FiBook className="text-[var(--app-dark-blue)] text-3xl sm:text-4xl" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-1.5 sm:mb-2 text-center">
                No courses available
              </h2>
              <p className="text-gray-500 text-center max-w-md text-xs sm:text-sm md:text-base px-3 sm:px-4">
                No courses available for your subscription. Please check back later.
              </p>
            </div>
          ) : (
            subjectCourses.map((subjectCourse, idx) => {
              const course = subjectCourse.course;
              return (
                <div
                  key={`${subjectCourse.subject}-${idx}`}
                  className={`bg-white rounded-lg sm:rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
                    idx % 2 === 0 ? 'animate-slide-in-left' : 'animate-slide-in-right'
                  }`}
                  style={{ animationDelay: `${idx * 0.15}s` }}
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  {/* Top Banner Section */}
                  <div className="relative h-40 sm:h-48 md:h-56 overflow-hidden">
                    {/* Course Image */}
                    <div className="absolute inset-0">
                      <Image
                        src={course.thumbnail || subjectCourse.image}
                        alt={`${course.name} - ${subjectCourse.subject}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

                    {/* Watch Preview Button */}
                    <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/course/${course.id}`);
                        }}
                        className="bg-white text-[var(--app-dark-blue)] px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-lg font-bold text-xs sm:text-sm"
                      >
                        <FiPlay className="text-sm sm:text-base md:text-lg" />
                        <span>Watch Preview</span>
                      </button>
                    </div>
                  </div>

                  {/* Course Details Section */}
                  <div className="p-3 sm:p-4 md:p-5 bg-white">
                    {/* Course Title */}
                    <h5 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 mb-1.5 sm:mb-2 leading-tight line-clamp-2">
                      {course.name}
                    </h5>

                    {/* Board and Class or Preparation Class */}
                    <div className="mb-2 sm:mb-2.5 md:mb-3">
                      {course.classId ? (
                        <span className="text-xs sm:text-sm font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                          {course.classId.name || 'Preparation Class'}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm font-semibold text-gray-600">
                          {course.board} · Class {course.class}
                        </span>
                      )}
                    </div>

                    {/* Features List */}
                    <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="p-1 sm:p-1.5 bg-[var(--app-dark-blue)]/10 rounded-lg">
                          <FiLayers className="text-[var(--app-dark-blue)] text-xs sm:text-sm" />
                        </div>
                        <span className="text-gray-700 text-xs sm:text-sm font-medium">Chapter-wise full syllabus notes</span>
                      </div>
                    </div>

                    {/* View Schedule Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/course/${course.id}`);
                      }}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-xs sm:text-sm md:text-base"
                    >
                      View full schedule
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default MyCourses;
