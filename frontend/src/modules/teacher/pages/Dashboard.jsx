import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiClock, FiCheckCircle, FiCalendar, FiUser, FiVideo, FiBookOpen, FiFileText, FiMessageCircle, FiArrowRight, FiEye } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import BottomNav from '../components/common/BottomNav';
import { teacherAPI, quizAPI, doubtAPI, notificationAPI, teacherAttendanceAPI } from '../services/api';

/**
 * Teacher Dashboard Page
 * Shows teacher information, class statistics, and inspirational quote
 * Redesigned with high quality UI
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [teacherData, setTeacherData] = useState({
    name: 'Teacher',
    profileImage: null,
  });
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState({
    status: 'unknown', // 'present' | 'absent' | 'unknown'
    loading: true,
  });

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setLoading(true);
        const response = await teacherAPI.getMe();
        if (response.success && response.data && response.data.teacher) {
          const teacher = response.data.teacher;
          setTeacherData({
            name: teacher.name || 'Teacher',
            profileImage: teacher.profileImage || null,
          });
        }
      } catch (err) {
        console.error('Error fetching teacher data:', err);
        // Keep default values on error
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
    fetchDashboardData();
    fetchTodayAttendance();
    fetchUnreadCount();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const response = await teacherAttendanceAPI.getToday();
      if (response.success && response.data) {
        setTodayAttendance({
          status: response.data.status || 'absent',
          loading: false,
        });
      } else {
        setTodayAttendance({
          status: 'absent',
          loading: false,
        });
      }
    } catch (err) {
      console.error('Error fetching today attendance:', err);
      setTodayAttendance({
        status: 'absent',
        loading: false,
      });
    }
  };

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

  const fetchDashboardData = async () => {
    try {
      setLoadingStats(true);
      
      // Fetch quizzes
      const quizzesResponse = await quizAPI.getAll();
      if (quizzesResponse.success && quizzesResponse.data?.quizzes) {
        setQuizzes(quizzesResponse.data.quizzes);
      }
      
      // Fetch doubts
      const doubtsResponse = await doubtAPI.getAllDoubts();
      if (doubtsResponse.success && doubtsResponse.data?.doubts) {
        setDoubts(doubtsResponse.data.doubts);
      }
      
      // Fetch live classes from localStorage
      const savedClasses = localStorage.getItem('teacher_live_classes');
      if (savedClasses) {
        const classes = JSON.parse(savedClasses);
        // Filter upcoming classes
        const now = new Date();
        const upcoming = classes.filter(cls => {
          if (!cls.date || !cls.startTime) return false;
          const classDateTime = new Date(`${cls.date}T${cls.startTime}`);
          return classDateTime >= now;
        }).sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateA - dateB;
        }).slice(0, 3);
        setLiveClasses(upcoming);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const classStats = {
    totalClasses: liveClasses.length + (JSON.parse(localStorage.getItem('teacher_live_classes') || '[]').length - liveClasses.length),
    completed: JSON.parse(localStorage.getItem('teacher_live_classes') || '[]').length - liveClasses.length,
    upcoming: liveClasses.length,
  };

  const quizStats = {
    total: quizzes.length,
    active: quizzes.filter(q => {
      if (!q.deadline) return q.isActive;
      return q.isActive && new Date() < new Date(q.deadline);
    }).length,
    completed: quizzes.filter(q => q.deadline && new Date() >= new Date(q.deadline)).length,
  };

  const doubtStats = {
    total: doubts.length,
    pending: doubts.filter(d => d.status === 'pending').length,
    answered: doubts.filter(d => d.status === 'answered').length,
  };

  const recentQuizzes = quizzes
    .sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id))
    .slice(0, 3);

  const pendingDoubts = doubts
    .filter(d => d.status === 'pending')
    .sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id))
    .slice(0, 3);


  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const quote = "Teaching is not about answering questions but about raising questions – opening doors for students in places that they could not imagine.";

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-8 sm:pt-10 md:pt-12 pb-4 sm:pb-6 md:pb-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <button
                onClick={() => navigate(ROUTES.PROFILE)}
                className="hover:opacity-80"
              >
                {teacherData.profileImage ? (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-white cursor-pointer hover:border-white/80 shadow-lg">
                    <img
                      src={teacherData.profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/30 shadow-lg">
                    <FiUser className="text-white text-base sm:text-lg md:text-xl" />
                  </div>
                )}
              </button>
              <div>
                <p className="text-xs sm:text-sm md:text-base text-white/80 mb-0.5">Welcome back,</p>
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">
                  {loading ? 'Loading...' : teacherData.name}
                </h1>
              </div>
            </div>
            <button
              onClick={() => navigate(ROUTES.NOTIFICATIONS)}
              className="relative p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors hover:scale-110"
            >
              <FiBell className="text-white text-lg sm:text-xl md:text-2xl" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="text-white text-[10px] sm:text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Daily Attendance Card */}
      {!todayAttendance.loading && todayAttendance.status !== 'present' && (
        <div className="px-3 sm:px-4 md:px-6 mt-3 sm:mt-4">
          <div className="bg-gradient-to-r from-[var(--app-dark-blue)] to-blue-600 text-white rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg flex items-center justify-between gap-4">
            <div>
              <p className="text-xs sm:text-sm uppercase tracking-wide text-white/70 mb-1">
                Daily Attendance
              </p>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">
                Mark your attendance for today
              </h2>
              <p className="text-xs sm:text-sm text-white/80 mt-1">
                Please mark your presence so the admin can track your daily attendance.
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await teacherAttendanceAPI.markToday();
                  if (res.success) {
                    setTodayAttendance({ status: 'present', loading: false });
                  }
                } catch (err) {
                  console.error('Error marking attendance:', err);
                  alert(err.message || 'Failed to mark attendance. Please try again.');
                }
              }}
              className="flex-shrink-0 bg-white text-[var(--app-dark-blue)] font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-md hover:shadow-lg hover:bg-gray-100 text-xs sm:text-sm transition-all"
            >
              Mark Present
            </button>
          </div>
        </div>
      )}

      {/* Class Statistics Section */}
      <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <h2 className="text-sm sm:text-base md:text-lg font-bold text-[var(--app-black)] mb-2 sm:mb-3 md:mb-4">
          Class Statistics
        </h2>
        <div className="space-y-2 sm:space-y-3">
          {/* Total Classes */}
          <div className="group bg-gradient-to-br from-white to-gray-50 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 shadow-lg hover:shadow-xl border border-gray-200 hover:border-[var(--app-dark-blue)]/30">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-500 text-xs sm:text-sm font-medium mb-1 sm:mb-1.5">
                  Total Classes
                </p>
                <p className={`text-[var(--app-dark-blue)] text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold ${loadingStats ? 'blur-sm opacity-50' : 'blur-0 opacity-100'}`}>
                  {classStats.totalClasses}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-[var(--app-dark-blue)]/20 to-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center shadow-md">
                <FiClock className="text-[var(--app-dark-blue)] text-base sm:text-lg md:text-xl" />
              </div>
            </div>
          </div>

          {/* Completed and Upcoming */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Completed */}
            <div className="group bg-gradient-to-br from-white to-green-50 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 shadow-lg hover:shadow-xl border border-gray-200 hover:border-green-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium mb-1 sm:mb-1.5">
                    Completed
                  </p>
                  <p className={`text-green-600 text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold ${loadingStats ? 'blur-sm opacity-50' : 'blur-0 opacity-100'}`}>
                    {classStats.completed}
                  </p>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center shadow-md">
                  <FiCheckCircle className="text-green-600 text-base sm:text-lg md:text-xl" />
                </div>
              </div>
            </div>

            {/* Upcoming */}
            <div className="group bg-gradient-to-br from-white to-blue-50 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 shadow-lg hover:shadow-xl border border-gray-200 hover:border-blue-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium mb-1 sm:mb-1.5">
                    Upcoming
                  </p>
                  <p className={`text-blue-600 text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold ${loadingStats ? 'blur-sm opacity-50' : 'blur-0 opacity-100'}`}>
                    {classStats.upcoming}
                  </p>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center shadow-md">
                  <FiCalendar className="text-blue-600 text-base sm:text-lg md:text-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Section - Above Inspirational Quote */}
      <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Create Live Class Button */}
          <button
            onClick={() => navigate(ROUTES.CREATE_LIVE_CLASS)}
            className="group relative overflow-hidden bg-gradient-to-r from-[var(--app-dark-blue)] via-[var(--app-dark-blue)] to-blue-700 hover:from-blue-700 hover:via-[var(--app-dark-blue)] hover:to-[var(--app-dark-blue)] text-white px-2.5 sm:px-3 md:px-4 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-lg hover:shadow-2xl flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2"
          >
            <span className="relative z-10 flex items-center gap-1 sm:gap-1.5 md:gap-2">
              <FiVideo className="text-sm sm:text-base md:text-lg" />
              <span>Create Class</span>
            </span>
          </button>

          {/* View Classes Button */}
          <button
            onClick={() => navigate(ROUTES.LIVE_CLASSES)}
            className="group relative overflow-hidden bg-white border-2 border-[var(--app-dark-blue)] text-[var(--app-dark-blue)] px-2.5 sm:px-3 md:px-4 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-lg hover:shadow-xl hover:bg-[var(--app-dark-blue)] hover:text-white flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2"
          >
            <span className="relative z-10 flex items-center gap-1 sm:gap-1.5 md:gap-2">
              <FiBookOpen className="text-sm sm:text-base md:text-lg" />
              <span>My Classes</span>
            </span>
          </button>
        </div>
      </div>

      {/* Quiz Statistics Section */}
      <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 animate-fade-in">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-[var(--app-black)] animate-slide-in-left">
            Quiz Statistics
          </h2>
          <button
            onClick={() => navigate(ROUTES.QUIZZES)}
            className="text-[var(--app-dark-blue)] text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1"
          >
            View All <FiArrowRight className="text-xs" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200">
            <p className="text-gray-500 text-[10px] sm:text-xs font-medium mb-1">Total</p>
            <p className={`text-purple-600 text-lg sm:text-xl md:text-2xl font-extrabold ${loadingStats ? 'blur-sm opacity-50' : 'blur-0 opacity-100'}`}>
              {quizStats.total}
            </p>
          </div>
          <div className="bg-gradient-to-br from-white to-green-50 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200">
            <p className="text-gray-500 text-[10px] sm:text-xs font-medium mb-1">Active</p>
            <p className={`text-green-600 text-lg sm:text-xl md:text-2xl font-extrabold ${loadingStats ? 'blur-sm opacity-50' : 'blur-0 opacity-100'}`}>
              {quizStats.active}
            </p>
          </div>
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200">
            <p className="text-gray-500 text-[10px] sm:text-xs font-medium mb-1">Completed</p>
            <p className={`text-blue-600 text-lg sm:text-xl md:text-2xl font-extrabold ${loadingStats ? 'blur-sm opacity-50' : 'blur-0 opacity-100'}`}>
              {quizStats.completed}
            </p>
          </div>
        </div>
      </div>

      {/* Doubt Statistics Section */}
      <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 animate-fade-in">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-[var(--app-black)] animate-slide-in-left">
            Doubt Statistics
          </h2>
          <button
            onClick={() => navigate(ROUTES.DOUBTS)}
            className="text-[var(--app-dark-blue)] text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1"
          >
            View All <FiArrowRight className="text-xs" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-white to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200">
            <p className="text-gray-500 text-[10px] sm:text-xs font-medium mb-1">Total</p>
            <p className={`text-indigo-600 text-lg sm:text-xl md:text-2xl font-extrabold ${loadingStats ? 'blur-sm opacity-50' : 'blur-0 opacity-100'}`}>
              {doubtStats.total}
            </p>
          </div>
          <div className="bg-gradient-to-br from-white to-orange-50 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200">
            <p className="text-gray-500 text-[10px] sm:text-xs font-medium mb-1">Pending</p>
            <p className={`text-orange-600 text-lg sm:text-xl md:text-2xl font-extrabold ${loadingStats ? 'blur-sm opacity-50' : 'blur-0 opacity-100'}`}>
              {doubtStats.pending}
            </p>
          </div>
          <div className="bg-gradient-to-br from-white to-teal-50 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200">
            <p className="text-gray-500 text-[10px] sm:text-xs font-medium mb-1">Answered</p>
            <p className={`text-teal-600 text-lg sm:text-xl md:text-2xl font-extrabold ${loadingStats ? 'blur-sm opacity-50' : 'blur-0 opacity-100'}`}>
              {doubtStats.answered}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Quizzes Section */}
      {recentQuizzes.length > 0 && (
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-[var(--app-black)]">
              Recent Quizzes
            </h2>
            <button
              onClick={() => navigate(ROUTES.QUIZZES)}
              className="text-[var(--app-dark-blue)] text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1"
            >
              View All <FiArrowRight className="text-xs" />
            </button>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {recentQuizzes.map((quiz) => (
              <div
                key={quiz._id}
                onClick={() => navigate(`/teacher/quizzes/${quiz._id}`)}
                className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200 hover:border-[var(--app-dark-blue)]/30 hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 truncate">
                      {quiz.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-gray-600">
                      <span>{quiz.subjectId?.name || 'N/A'}</span>
                      <span>•</span>
                      <span>Class {quiz.classNumber}</span>
                      <span>•</span>
                      <span>{quiz.board}</span>
                    </div>
                    {quiz.deadline && (
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                        Deadline: {formatDate(quiz.deadline)}
                      </p>
                    )}
                  </div>
                  <FiEye className="text-[var(--app-dark-blue)] text-base sm:text-lg ml-2 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Doubts Section */}
      {pendingDoubts.length > 0 && (
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-[var(--app-black)]">
              Pending Doubts
            </h2>
            <button
              onClick={() => navigate(ROUTES.DOUBTS)}
              className="text-[var(--app-dark-blue)] text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1"
            >
              View All <FiArrowRight className="text-xs" />
            </button>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {pendingDoubts.map((doubt) => (
              <div
                key={doubt._id}
                onClick={() => navigate(ROUTES.DOUBTS)}
                className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-orange-200 hover:border-orange-300 hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] sm:text-xs font-semibold">
                        {doubt.subjectId?.name || 'General'}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        {formatDate(doubt.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-900 line-clamp-2">
                      {doubt.question}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600 mt-1">
                      By: {doubt.studentId?.name || 'Student'}
                    </p>
                  </div>
                  <FiMessageCircle className="text-orange-600 text-base sm:text-lg ml-2 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Live Classes Section */}
      {liveClasses.length > 0 && (
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-[var(--app-black)]">
              Upcoming Live Classes
            </h2>
            <button
              onClick={() => navigate(ROUTES.LIVE_CLASSES)}
              className="text-[var(--app-dark-blue)] text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1"
            >
              View All <FiArrowRight className="text-xs" />
            </button>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {liveClasses.map((cls, index) => (
              <div
                key={index}
                onClick={() => navigate(ROUTES.LIVE_CLASSES)}
                className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-blue-200 hover:border-blue-300 hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1">
                      {cls.title || 'Live Class'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-gray-600">
                      <span>{cls.subject || 'N/A'}</span>
                      <span>•</span>
                      <span>Class {cls.classNumber}</span>
                      <span>•</span>
                      <span>{cls.board}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] sm:text-xs text-gray-500">
                      <FiClock className="text-xs" />
                      <span>{formatDate(cls.date)} at {formatTime(cls.startTime)}</span>
                    </div>
                  </div>
                  <FiVideo className="text-blue-600 text-base sm:text-lg ml-2 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inspirational Quote Section */}
      <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="bg-gradient-to-br from-[var(--app-dark-blue)]/5 via-white to-[var(--app-dark-blue)]/5 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 relative overflow-hidden shadow-lg border border-[var(--app-dark-blue)]/20">
          {/* Decorative Quote Mark */}
          <div className="absolute left-2 sm:left-3 md:left-4 top-2 sm:top-3 md:top-4">
            <span className="text-[var(--app-dark-blue)]/10 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">
              "
            </span>
          </div>
          
          {/* Quote Content */}
          <div className="relative z-10">
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 mb-1.5 sm:mb-2 md:mb-3">
              <div className="w-0.5 sm:w-1 h-5 sm:h-6 md:h-8 bg-gradient-to-b from-[var(--app-dark-blue)] to-blue-400 rounded-full"></div>
              <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-[var(--app-dark-blue)] uppercase tracking-wide">
                Inspirational Quote
              </h3>
            </div>
            <p className="text-gray-700 text-xs sm:text-sm md:text-base lg:text-lg leading-snug sm:leading-relaxed font-medium pl-2 sm:pl-3 md:pl-4">
              {quote}
            </p>
          </div>

          {/* Decorative Elements */}
          <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 w-12 h-12 sm:w-16 sm:h-16 bg-[var(--app-dark-blue)]/5 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 right-4 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 bg-blue-300/10 rounded-full blur-xl"></div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;
