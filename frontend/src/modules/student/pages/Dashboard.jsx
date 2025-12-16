import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiUser, FiSearch, FiVideo, FiBook, FiFileText, FiClock, FiCalendar } from 'react-icons/fi';
import { MdMic } from 'react-icons/md';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../context/AuthContext';
import { notificationAPI, studentAPI, liveClassAPI } from '../services/api';
import Image from '../components/common/Image';
import BottomNav from '../components/common/BottomNav';

/**
 * Student Dashboard Page
 * New design matching the provided image
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [allCourses, setAllCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [upcomingLiveClasses, setUpcomingLiveClasses] = useState([]);
  const [currentBannerSlide, setCurrentBannerSlide] = useState(0);
  const [failedBannerImages, setFailedBannerImages] = useState(new Set());

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      if (response.success && response.data?.unreadCount !== undefined) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const pollInterval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(pollInterval);
  }, []);

  // Banner images with text content for carousel
  const bannerData = [
    {
      image: 'https://images.unsplash.com/photo-1509228468512-adae6b112b3e?w=1200&h=600&fit=crop&q=80',
      title: 'Excel in Your Studies',
      subtitle: 'Comprehensive courses designed for CBSE & RBSE students',
      description: 'Learn from expert teachers and master every subject'
    },
    {
      image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&h=600&fit=crop&q=80',
      title: 'Interactive Live Classes',
      subtitle: 'Join real-time sessions with top educators',
      description: 'Ask questions, get instant answers, and learn better'
    },
    {
      image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&h=600&fit=crop&q=80',
      title: 'Practice Makes Perfect',
      subtitle: 'Regular quizzes and assessments to track progress',
      description: 'Test your knowledge and improve with every attempt'
    },
  ];

  // Auto-slide banner
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerSlide((prev) => (prev + 1) % bannerData.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [bannerData.length]);

  // Fetch upcoming live classes
  const fetchUpcomingLiveClasses = async () => {
    try {
      const response = await liveClassAPI.getUpcomingLiveClasses();
      if (response.success && response.data?.liveClasses) {
        setUpcomingLiveClasses(response.data.liveClasses);
      } else {
        setUpcomingLiveClasses([]);
      }
    } catch (err) {
      console.error('Error fetching upcoming live classes:', err);
      setUpcomingLiveClasses([]);
    }
  };

  // Default dummy courses data
  const defaultCourses = [
    {
      id: 'default-1',
      name: 'Mathematics - Class 10',
      thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop',
      description: 'Complete Mathematics course for Class 10',
      subject: 'Mathematics',
      class: 10,
      board: 'CBSE',
      chapters: [],
      status: 'Active',
      lectureCount: 20,
    },
    {
      id: 'default-2',
      name: 'Science - Class 10',
      thumbnail: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=300&fit=crop',
      description: 'Complete Science course for Class 10',
      subject: 'Science',
      class: 10,
      board: 'CBSE',
      chapters: [],
      status: 'Active',
      lectureCount: 15,
    },
    {
      id: 'default-3',
      name: 'English - Class 10',
      thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop',
      description: 'Complete English course for Class 10',
      subject: 'English',
      class: 10,
      board: 'CBSE',
      chapters: [],
      status: 'Active',
      lectureCount: 18,
    },
    {
      id: 'default-4',
      name: 'Social Studies - Class 10',
      thumbnail: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop',
      description: 'Complete Social Studies course for Class 10',
      subject: 'Social Studies',
      class: 10,
      board: 'CBSE',
      chapters: [],
      status: 'Active',
      lectureCount: 12,
    },
  ];

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const response = await studentAPI.getCourses();
        if (response.success && response.data?.courses && response.data.courses.length > 0) {
          const transformedCourses = response.data.courses.map((course) => {
            // Log course data for debugging
            console.log('Course data:', {
              id: course._id,
              title: course.title,
              thumbnail: course.thumbnail,
              hasThumbnail: !!course.thumbnail
            });

            return {
              id: course._id,
              name: course.title,
              thumbnail: course.thumbnail || null, // Ensure thumbnail is set properly
              description: course.description || '',
              subject: course.subject,
              class: course.class,
              board: course.board,
              classId: course.classId, // For preparation classes
              chapters: course.chapters || [],
              status: course.status,
              lectureCount: course.chapters?.length || 0,
            };
          });
          setAllCourses(transformedCourses);
        } else {
          // Show default courses if no data from API
          console.log('No courses from API, showing default courses');
          setAllCourses(defaultCourses);
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        // Show default courses on error
        console.log('Error fetching courses, showing default courses');
        setAllCourses(defaultCourses);
      } finally {
        setLoadingCourses(false);
      }
    };

    if (user) {
      fetchCourses();
      fetchUpcomingLiveClasses();
    }
  }, [user]);

  // Filter courses based on search and category
  const filteredCourses = useMemo(() => {
    let filtered = allCourses;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (course) =>
          course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category (if implemented)
    // For now, we'll show all courses as "Available Courses"

    return filtered;
  }, [allCourses, searchQuery, selectedCategory]);

  // Use all filtered courses instead of just top 6
  const displayCourses = useMemo(() => {
    return filteredCourses;
  }, [filteredCourses]);

  // Check if user has active subscription
  const hasActiveSubscription = useMemo(() => {
    if (!user) return false;

    // Check activeSubscriptions array
    if (user.activeSubscriptions && user.activeSubscriptions.length > 0) {
      const hasActive = user.activeSubscriptions.some(sub => {
        if (sub.endDate) {
          return new Date(sub.endDate) > new Date();
        }
        return sub.status === 'active';
      });
      if (hasActive) return true;
    }

    // Check legacy subscription
    if (user.subscription && user.subscription.status === 'active') {
      if (user.subscription.endDate) {
        return new Date(user.subscription.endDate) > new Date();
      }
      return true;
    }

    return false;
  }, [user]);

  // Category buttons data - Project specific features
  const categories = [
    { id: 'live-classes', name: 'Live Classes', icon: FiVideo, description: 'Join interactive sessions' },
    { id: 'courses', name: 'Courses', icon: FiBook, description: 'Study materials & videos' },
    { id: 'quizzes', name: 'Quizzes', icon: FiFileText, description: 'Test your knowledge' },
  ];

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Sticky Top Bar - Welcome Section */}
      <div className="bg-[var(--app-dark-blue)] text-white fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 md:px-6 pt-6 sm:pt-8 md:pt-10 pb-3 sm:pb-4 md:pb-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(ROUTES.PROFILE)}
              className="hover:opacity-80 transition-opacity focus:outline-none"
            >
              {user?.profileImage ? (
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-white cursor-pointer hover:border-white/80 hover:scale-110 transition-all duration-300 pointer-events-none">
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover pointer-events-none"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center hidden pointer-events-none">
                    <FiUser className="text-white text-base sm:text-lg md:text-xl" />
                  </div>
                </div>
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/30 hover:scale-110 transition-all duration-300 pointer-events-none">
                  <FiUser className="text-white text-base sm:text-lg md:text-xl" />
                </div>
              )}
            </button>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm text-white/80 mb-0.5">Welcome back,</span>
              <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">
                {user?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'Student'}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate(ROUTES.NOTIFICATIONS)}
            className="relative p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <FiBell className="text-white text-lg sm:text-xl md:text-2xl" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse-badge">
                <span className="text-white text-[10px] sm:text-xs font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dark Blue Header */}
      <header className="bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-20 sm:pt-24 md:pt-26 pb-4 sm:pb-6 md:pb-8">
          {/* Main Heading */}
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 md:mb-5 leading-tight animate-slide-in-left">
            Find your favorite Course here!
          </h1>

          {/* Search Bar */}
          <div className="relative mb-3 sm:mb-4">
            <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
              <FiSearch className="text-gray-400 text-sm sm:text-base md:text-lg" />
            </div>
            <input
              type="text"
              placeholder="Search Course"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-md text-sm sm:text-base"
            />
            <button className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors">
              <MdMic className="text-gray-600 text-sm sm:text-base md:text-lg" />
            </button>
          </div>

          {/* Category/Filter Buttons - Half in header, half below */}
          <div className="flex gap-1.5 sm:gap-2 -mb-10 sm:-mb-12 md:-mb-14 relative z-10 justify-center">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    // Navigate to respective pages
                    if (category.id === 'live-classes') {
                      navigate('/live-classes');
                    } else if (category.id === 'courses') {
                      navigate('/my-courses');
                    } else if (category.id === 'quizzes') {
                      navigate('/quizzes');
                    }
                  }}
                  className={`flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-2.5 rounded-lg bg-white border-2 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 w-[22%] sm:w-[24%] max-w-[90px] sm:max-w-[100px] ${selectedCategory === category.id
                      ? 'border-[var(--app-dark-blue)] shadow-lg bg-blue-50'
                      : 'border-gray-200 hover:border-[var(--app-dark-blue)]/30'
                    }`}
                >
                  <div className={`p-1.5 sm:p-2 rounded-full ${selectedCategory === category.id
                      ? 'bg-[var(--app-dark-blue)]'
                      : 'bg-gray-100'
                    }`}>
                    <IconComponent
                      className={`text-xs sm:text-sm md:text-base ${selectedCategory === category.id
                          ? 'text-white'
                          : 'text-gray-600'
                        }`}
                    />
                  </div>
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold ${selectedCategory === category.id
                        ? 'text-[var(--app-dark-blue)]'
                        : 'text-gray-700'
                      }`}
                  >
                    {category.name}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-gray-500 text-center leading-tight">
                    {category.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 pt-16 sm:pt-18 md:pt-20 pb-20 sm:pb-24">

        {/* No Subscription Message */}
        {!hasActiveSubscription && (
          <div className="mb-4 sm:mb-5 md:mb-6 bg-white rounded-lg sm:rounded-xl p-6 sm:p-8 md:p-10 border-2 border-dashed border-gray-300 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiBook className="text-[var(--app-dark-blue)] text-3xl sm:text-4xl" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2 text-center">
              No Subscription
            </h2>
            <p className="text-gray-500 text-center max-w-md mx-auto text-sm sm:text-base mb-6">
              You need an active subscription to access courses, live classes, quizzes, and timetable. Please subscribe to a plan to continue learning.
            </p>
            <button
              onClick={() => navigate('/subscription-plans')}
              className="bg-[var(--app-dark-blue)] hover:bg-blue-700 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              View Subscription Plans
            </button>
          </div>
        )}

        {/* Available Courses Section - Only show if user has active subscription */}
        {hasActiveSubscription && (
          <div className="mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Available Courses</h2>
              <button
                onClick={() => navigate('/my-courses')}
                className="text-xs sm:text-sm text-gray-500 hover:text-[var(--app-dark-blue)] transition-colors"
              >
                See All
              </button>
            </div>

            {/* Course Cards Grid */}
            {loadingCourses ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-dark-blue)]"></div>
                <p className="mt-4 text-gray-600">Loading courses...</p>
              </div>
            ) : displayCourses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">No courses available.</p>
              </div>
            ) : (
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 scrollbar-hide">
                {displayCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer flex-shrink-0 w-[140px] sm:w-[170px] md:w-[200px] animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => {
                      // Only navigate if it's not a default course
                      if (!course.id.startsWith('default-')) {
                        navigate(`/course/${course.id}`);
                      } else {
                        // For default courses, you can show a message or do nothing
                        console.log('Default course clicked:', course.name);
                      }
                    }}
                  >
                    {/* Course Image */}
                    <div className="relative w-full h-28 sm:h-32 md:h-40 overflow-hidden bg-gray-100">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // Hide broken image and show fallback
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-full h-full bg-gradient-to-br from-[var(--app-dark-blue)] to-blue-700 flex items-center justify-center ${course.thumbnail ? 'hidden' : 'flex'}`}
                      >
                        <FiFileText className="text-white text-3xl sm:text-4xl" />
                      </div>
                    </div>

                    {/* Course Info */}
                    <div className="p-2.5 sm:p-3 md:p-4">
                      <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 mb-0.5 sm:mb-1 line-clamp-2">
                        {course.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        Class {course.class}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Banner Carousel Section */}
        <div className="mb-4 sm:mb-5 md:mb-6">
          <div className="relative w-full rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden shadow-lg">
            <div className="relative h-36 sm:h-44 md:h-52 lg:h-64 overflow-hidden">
              {bannerData.map((banner, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentBannerSlide ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                  {/* Banner Image */}
                  <img
                    src={failedBannerImages.has(index)
                      ? 'https://via.placeholder.com/1200x600/1e3a8a/ffffff?text=D%27Vision+Academy'
                      : banner.image}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Prevent infinite loop - only set fallback once per image
                      if (!failedBannerImages.has(index)) {
                        setFailedBannerImages(prev => new Set([...prev, index]));
                        e.target.src = 'https://via.placeholder.com/1200x600/1e3a8a/ffffff?text=D%27Vision+Academy';
                      } else {
                        // If fallback also fails, hide the image to prevent continuous calls
                        e.target.style.display = 'none';
                      }
                    }}
                  />
                  {/* Overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--app-dark-blue)]/85 via-[var(--app-dark-blue)]/70 to-[var(--app-dark-blue)]/40"></div>

                  {/* Banner Text Content */}
                  <div className="absolute inset-0 flex items-center px-4 sm:px-6 md:px-8 lg:px-12">
                    <div className="max-w-2xl animate-slide-in-up">
                      <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-white mb-2 sm:mb-3 leading-tight drop-shadow-lg">
                        {banner.title}
                      </h2>
                      <p className="text-sm sm:text-base md:text-lg text-white font-semibold mb-2 sm:mb-3 drop-shadow-md">
                        {banner.subtitle}
                      </p>
                      <p className="text-xs sm:text-sm md:text-base text-white/95 font-medium drop-shadow-sm">
                        {banner.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination Dots */}
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
              {bannerData.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBannerSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${index === currentBannerSlide
                      ? 'bg-white w-8 shadow-md'
                      : 'bg-white/50 w-2 hover:bg-white/70'
                    }`}
                  aria-label={`Go to banner ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Live Classes Section - Only show if user has active subscription */}
        {hasActiveSubscription && (
          <div className="mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Upcoming Live Classes</h2>
              <button
                onClick={() => navigate('/live-classes')}
                className="text-xs sm:text-sm text-gray-500 hover:text-[var(--app-dark-blue)] transition-colors"
              >
                See All
              </button>
            </div>

            {/* Live Classes Cards - Match LiveClasses page format */}
            {upcomingLiveClasses.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-gray-600 text-sm sm:text-base md:text-lg">No upcoming live classes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingLiveClasses.map((liveClass, index) => {
                  // Format date and time on frontend to ensure correct timezone
                  const scheduledTime = new Date(liveClass.scheduledStartTime);
                  const dateStr = scheduledTime.toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                  const timeStr = scheduledTime.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });

                  return (
                    <div
                      key={liveClass.id || liveClass._id}
                      className={`bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200 ${index % 2 === 0 ? 'animate-slide-in-left' : 'animate-slide-in-right'
                        }`}
                      style={{ animationDelay: `${index * 0.15}s` }}
                      onClick={() => navigate(`/live-class/${liveClass.id || liveClass._id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1.5">
                            {liveClass.title}
                          </h3>
                          <p className="text-gray-600 text-xs sm:text-sm mb-2.5 font-medium">
                            {liveClass.subject || 'Subject'} · {liveClass.teacher || 'Teacher'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <div className="p-1 bg-[var(--app-dark-blue)]/10 rounded-lg">
                                <FiCalendar className="text-[var(--app-dark-blue)] text-xs" />
                              </div>
                              <span className="font-medium">{dateStr}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="p-1 bg-[var(--app-dark-blue)]/10 rounded-lg">
                                <FiClock className="text-[var(--app-dark-blue)] text-xs" />
                              </div>
                              <span className="font-medium">{timeStr}</span>
                            </div>
                          </div>
                        </div>
                        <div className="px-3 py-2 text-xs sm:text-sm text-gray-500 font-medium">
                          Starts Soon
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;
