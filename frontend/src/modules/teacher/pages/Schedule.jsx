import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiCalendar, FiUsers, FiBook } from 'react-icons/fi';
import { timetableAPI } from '../services/api';
import BottomNav from '../components/common/BottomNav';

/**
 * Schedule Page
 * Shows teacher's schedule/timetable
 */
const Schedule = () => {
  const navigate = useNavigate();
  const [timetables, setTimetables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const currentDay = daysOfWeek[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]; // Adjust for Monday = 0

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await timetableAPI.getMySchedule();
        if (response.success && response.data?.timetables) {
          setTimetables(response.data.timetables || []);
        } else {
          setError('Failed to load schedule');
        }
      } catch (err) {
        console.error('Error fetching schedule:', err);
        setError(err.message || 'Failed to load schedule');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
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

  const isClassStartingSoon = (startTime, dayOfWeek) => {
    if (!startTime || dayOfWeek !== currentDay) return false;
    const now = new Date();
    const [hours, minutes] = startTime.split(':').map(Number);
    const classTime = new Date();
    classTime.setHours(hours, minutes, 0, 0);
    const diff = classTime - now;
    // Within 30 minutes
    return diff >= 0 && diff <= 30 * 60 * 1000;
  };

  return (
    <div className="min-h-screen w-full bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/teacher/live-classes')}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
                My Schedule
              </h1>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5">
                View your assigned classes
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        {/* Day Filter */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedDay(null)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
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
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  selectedDay === day
                    ? 'bg-[var(--app-dark-blue)] text-white'
                    : day === currentDay
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {day.substring(0, 3)}
                {day === currentDay && <span className="ml-1">•</span>}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--app-dark-blue)] mb-3"></div>
            <p className="text-gray-500 text-sm">Loading schedule...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-xl p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <FiClock className="text-red-600 text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Error Loading Schedule</h3>
            <p className="text-gray-500 text-center text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[var(--app-dark-blue)] text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : filteredTimetables.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {selectedDay ? (
              // Show single day
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                  {selectedDay}
                </h2>
                <div className="space-y-3">
                  {filteredTimetables.map((timetable) => {
                    const startingSoon = isClassStartingSoon(timetable.startTime, timetable.dayOfWeek);
                    return (
                      <div
                        key={timetable._id}
                        className={`bg-white rounded-xl p-4 sm:p-5 shadow-md border-2 transition-all ${
                          startingSoon 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          {timetable.thumbnail && (
                            <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden">
                              <img
                                src={timetable.thumbnail}
                                alt={timetable.subjectId?.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <h3 className="text-base sm:text-lg font-bold text-gray-800">
                                {timetable.subjectId?.name || 'Subject'}
                              </h3>
                              {startingSoon && (
                                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">
                                  Starting Soon
                                </span>
                              )}
                              {timetable.topic && (
                                <span className="text-xs text-gray-500">• {timetable.topic}</span>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                                <FiBook className="text-[var(--app-dark-blue)]" />
                                <span>{getClassDisplay(timetable.classId)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                                <FiClock className="text-[var(--app-dark-blue)]" />
                                <span>
                                  {formatTime(timetable.startTime)} - {formatTime(timetable.endTime)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Show all days grouped
              daysOfWeek.map((day) => {
                const dayTimetables = getTimetablesByDay(day);
                if (dayTimetables.length === 0) return null;

                return (
                  <div key={day} className="bg-white rounded-xl p-4 sm:p-5 shadow-md border border-gray-200">
                    <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                      <FiCalendar className="text-[var(--app-dark-blue)]" />
                      {day}
                      {day === currentDay && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          Today
                        </span>
                      )}
                    </h2>
                    <div className="space-y-3">
                      {dayTimetables.map((timetable) => {
                        const startingSoon = isClassStartingSoon(timetable.startTime, timetable.dayOfWeek);
                        return (
                          <div
                            key={timetable._id}
                            className={`bg-gray-50 rounded-lg p-3 sm:p-4 border-2 transition-all ${
                              startingSoon 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-gray-100'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {timetable.thumbnail && (
                                <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden">
                                  <img
                                    src={timetable.thumbnail}
                                    alt={timetable.subjectId?.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-sm sm:text-base font-bold text-gray-800">
                                    {timetable.subjectId?.name || 'Subject'}
                                  </h3>
                                  {startingSoon && (
                                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">
                                      Soon
                                    </span>
                                  )}
                                  {timetable.topic && (
                                    <span className="text-xs text-gray-500">• {timetable.topic}</span>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <FiBook className="text-[var(--app-dark-blue)] text-xs" />
                                    <span>{getClassDisplay(timetable.classId)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <FiClock className="text-[var(--app-dark-blue)] text-xs" />
                                    <span>
                                      {formatTime(timetable.startTime)} - {formatTime(timetable.endTime)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-xl p-6 sm:p-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mb-4">
              <FiCalendar className="text-[var(--app-dark-blue)] text-2xl sm:text-3xl" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
              No Schedule Available
            </h3>
            <p className="text-gray-500 text-center max-w-md text-xs sm:text-sm">
              {selectedDay 
                ? `No classes scheduled for ${selectedDay}`
                : 'You have not been assigned to any classes yet. Please contact your administrator.'}
            </p>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default Schedule;

