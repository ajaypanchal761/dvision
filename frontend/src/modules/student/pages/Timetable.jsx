import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiCalendar, FiUser, FiBook } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import { timetableAPI } from '../services/api';
import BottomNav from '../components/common/BottomNav';
import { useAuth } from '../context/AuthContext';

/**
 * Timetable Page
 * Shows student's class timetable
 */
const Timetable = () => {
  const navigate = useNavigate();
  const { hasActiveSubscription } = useAuth();
  const [timetables, setTimetables] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const currentDay = daysOfWeek[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]; // Adjust for Monday = 0

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await timetableAPI.getMyClassTimetable();
        if (response.success && response.data) {
          setTimetables(response.data.timetables || []);
          // Handle both single class (backward compatibility) and multiple classes
          if (response.data.classes && Array.isArray(response.data.classes)) {
            setClasses(response.data.classes);
          } else if (response.data.class) {
            setClasses([response.data.class]);
          } else {
            setClasses([]);
          }
        } else {
          setError('Failed to load timetable');
        }
      } catch (err) {
        console.error('Error fetching timetable:', err);
        setError(err.message || 'Failed to load timetable');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetable();
  }, []);

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTimetablesByDay = (day) => {
    return timetables.filter(t => t.dayOfWeek === day).sort((a, b) => {
      const [aHour, aMin] = a.startTime.split(':').map(Number);
      const [bHour, bMin] = b.startTime.split(':').map(Number);
      return aHour * 60 + aMin - (bHour * 60 + bMin);
    });
  };

  const filteredTimetables = selectedDay 
    ? getTimetablesByDay(selectedDay)
    : timetables.sort((a, b) => {
        const dayOrder = daysOfWeek.indexOf(a.dayOfWeek) - daysOfWeek.indexOf(b.dayOfWeek);
        if (dayOrder !== 0) return dayOrder;
        const [aHour, aMin] = a.startTime.split(':').map(Number);
        const [bHour, bMin] = b.startTime.split(':').map(Number);
        return aHour * 60 + aMin - (bHour * 60 + bMin);
      });

  const getClassDisplay = (classItem) => {
    if (!classItem) return 'N/A';
    if (classItem.type === 'preparation') {
      return classItem.name;
    }
    return `Class ${classItem.class} - ${classItem.board}`;
  };

  return (
    <div className="min-h-screen w-full bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(ROUTES.LIVE_CLASSES || '/live-classes')}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
                My Timetable
              </h1>
              {classes.length > 0 && (
                <p className="text-xs sm:text-sm text-white/90 mt-0.5">
                  {classes.map(cls => getClassDisplay(cls)).join(' • ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        {/* Day Filter */}
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedDay(null)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedDay === null
                  ? 'bg-[var(--app-dark-blue)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Days
            </button>
            {daysOfWeek.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedDay === day
                    ? 'bg-[var(--app-dark-blue)] text-white'
                    : day === currentDay
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {day.substring(0, 3)}
                {day === currentDay && <span className="ml-0.5">•</span>}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[250px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-dark-blue)] mb-2.5"></div>
            <p className="text-gray-500 text-xs sm:text-sm">Loading timetable...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[250px] bg-white rounded-lg sm:rounded-xl p-4 sm:p-5">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-3">
              <FiClock className="text-red-600 text-xl" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1.5">Error Loading Timetable</h3>
            <p className="text-gray-500 text-center text-xs sm:text-sm mb-3">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[var(--app-dark-blue)] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : !hasActiveSubscription ? (
          <div className="flex flex-col items-center justify-center min-h-[250px] bg-white rounded-lg sm:rounded-xl p-4 sm:p-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mb-3">
              <FiCalendar className="text-[var(--app-dark-blue)] text-xl sm:text-2xl" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1.5">
              No Subscription
            </h3>
            <p className="text-gray-500 text-center max-w-md text-xs sm:text-sm mb-4">
              You need an active subscription to access timetable. Please subscribe to a plan to continue learning.
            </p>
            <button
              onClick={() => navigate('/subscription-plans')}
              className="bg-[var(--app-dark-blue)] hover:bg-blue-700 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-xs sm:text-sm md:text-base"
            >
              View Subscription Plans
            </button>
          </div>
        ) : filteredTimetables.length > 0 ? (
          <div className="space-y-3">
            {selectedDay ? (
              // Show single day
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-2.5 sm:mb-3">
                  {selectedDay}
                </h2>
                <div className="space-y-2.5 sm:space-y-3">
                  {filteredTimetables.map((timetable) => (
                    <div
                      key={timetable._id}
                      className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        {timetable.thumbnail && (
                          <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden">
                            <img
                              src={timetable.thumbnail}
                              alt={timetable.subjectId?.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <h3 className="text-sm sm:text-base font-bold text-gray-800">
                              {timetable.subjectId?.name || 'Subject'}
                            </h3>
                            {timetable.topic && (
                              <span className="text-xs text-gray-500">• {timetable.topic}</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <FiClock className="text-[var(--app-dark-blue)] text-xs" />
                              <span>
                                {formatTime(timetable.startTime)} - {formatTime(timetable.endTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <FiUser className="text-[var(--app-dark-blue)] text-xs" />
                              <span>{timetable.teacherId?.name || 'Teacher'}</span>
                            </div>
                            {timetable.classId && (
                              <div className="flex items-center gap-1.5 text-xs text-purple-600">
                                <FiBook className="text-purple-600 text-xs" />
                                <span className="bg-purple-50 px-1.5 py-0.5 rounded text-purple-700 font-medium">
                                  {getClassDisplay(timetable.classId)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Show all days grouped
              daysOfWeek.map((day) => {
                const dayTimetables = getTimetablesByDay(day);
                if (dayTimetables.length === 0) return null;

                return (
                  <div key={day} className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-200">
                    <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-2.5 sm:mb-3 flex items-center gap-1.5">
                      <FiCalendar className="text-[var(--app-dark-blue)] text-sm" />
                      {day}
                      {day === currentDay && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                          Today
                        </span>
                      )}
                    </h2>
                    <div className="space-y-2 sm:space-y-2.5">
                      {dayTimetables.map((timetable) => (
                        <div
                          key={timetable._id}
                          className="bg-gray-50 rounded-lg p-2.5 sm:p-3 border border-gray-100"
                        >
                          <div className="flex items-start gap-2 sm:gap-2.5">
                            {timetable.thumbnail && (
                              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden">
                                <img
                                  src={timetable.thumbnail}
                                  alt={timetable.subjectId?.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <h3 className="text-xs sm:text-sm font-bold text-gray-800">
                                  {timetable.subjectId?.name || 'Subject'}
                                </h3>
                                {timetable.topic && (
                                  <span className="text-xs text-gray-500">• {timetable.topic}</span>
                                )}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <FiClock className="text-[var(--app-dark-blue)] text-xs" />
                                  <span>
                                    {formatTime(timetable.startTime)} - {formatTime(timetable.endTime)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                  <FiUser className="text-[var(--app-dark-blue)] text-xs" />
                                  <span>{timetable.teacherId?.name || 'Teacher'}</span>
                                </div>
                                {timetable.classId && (
                                  <div className="flex items-center gap-1.5 text-xs text-purple-600">
                                    <FiBook className="text-purple-600 text-xs" />
                                    <span className="bg-purple-50 px-1.5 py-0.5 rounded text-purple-700 font-medium">
                                      {getClassDisplay(timetable.classId)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[250px] bg-white rounded-lg sm:rounded-xl p-4 sm:p-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mb-3">
              <FiCalendar className="text-[var(--app-dark-blue)] text-xl sm:text-2xl" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1.5">
              No Timetable Available
            </h3>
            <p className="text-gray-500 text-center max-w-md text-xs sm:text-sm">
              {selectedDay 
                ? `No classes scheduled for ${selectedDay}`
                : 'Your class timetable has not been created yet. Please contact your administrator.'}
            </p>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default Timetable;

