import React from 'react';
import BottomNav from '../components/common/BottomNav';

/**
 * Attendance Page
 * Redesigned with new theme
 */
const Attendance = () => {
  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Attendance</h1>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 sm:px-6 py-6">
        <div className="bg-white rounded-xl p-6 sm:p-8 md:p-10 shadow-lg border border-gray-200 text-center">
          <p className="text-gray-600 text-base sm:text-lg md:text-xl font-medium">
            Attendance functionality coming soon...
          </p>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default Attendance;
