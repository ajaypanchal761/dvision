import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiUser
} from 'react-icons/fi';
import BottomNav from '../components/common/BottomNav';

/**
 * Personal Information Page for Teachers
 * Shows teacher's personal details
 * Redesigned with new theme
 */
const PersonalInformation = () => {
  const navigate = useNavigate();
  const [teacherData, setTeacherData] = useState({
    name: '',
    phone: '',
    email: '',
    profileImage: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedData = localStorage.getItem('teacher_data');
    if (storedData) {
      try {
        const teacher = JSON.parse(storedData);
        setTeacherData({
          name: teacher.name || '',
          phone: teacher.phone || '',
          email: teacher.email || '',
          profileImage: teacher.profileImage || null,
        });
      } catch (err) {
        console.error('Error parsing teacher data:', err);
      }
    }
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/teacher/profile')}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-xl sm:text-2xl" />
            </button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Personal Information</h1>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 border-4 border-[var(--app-dark-blue)] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-base font-medium">Loading...</p>
        </div>
      )}

      {/* Profile Picture and Name */}
      {!loading && (
        <>
          <div className="flex flex-col items-center py-6 mt-6">
            {teacherData.profileImage ? (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-[var(--app-dark-blue)] mb-4">
                <img
                  src={teacherData.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[var(--app-dark-blue)] flex items-center justify-center mb-4">
                <FiUser className="text-white text-3xl sm:text-4xl" />
              </div>
            )}
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              {teacherData.name || 'Teacher'}
            </h2>
          </div>
        </>
      )}

      {/* Information Fields */}
      {!loading && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="space-y-5">
              {/* Full Name */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 font-medium">
                  FULL NAME
                </p>
                <p className="text-base text-gray-800 font-bold">
                  {teacherData.name || 'Not Available'}
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 font-medium">
                  MOBILE NUMBER
                </p>
                <p className="text-base text-gray-800 font-bold">
                  {teacherData.phone || 'Not Available'}
                </p>
              </div>

              {/* Email Address */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 font-medium">
                  EMAIL
                </p>
                <p className="text-base text-gray-800 font-bold">
                  {teacherData.email || 'Not Available'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default PersonalInformation;
