import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getCourseById } from '../data/dummyData';
import { ROUTES } from '../constants/routes';
import BottomNav from '../components/common/BottomNav';

/**
 * Subscription History Page
 * Shows all courses the student has subscribed to
 * Redesigned with new theme
 */
const SubscriptionHistory = () => {
  const navigate = useNavigate();
  const { user, cancelSubscription } = useAuth();

  const subscribedCourses = user?.subscribedCourses || [];

  const courses = subscribedCourses.map(sub => {
    const course = getCourseById(sub.courseId);
    return course ? { ...course, subscription: sub } : null;
  }).filter(Boolean);

  const [showCancelConfirm, setShowCancelConfirm] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr}, ${timeStr}`;
  };

  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  const getPlanName = (plan) => {
    const planNames = {
      '3months': '3 Months',
      '6months': '6 Months',
      '12months': 'Full year'
    };
    return planNames[plan] || plan;
  };

  const generateTransactionId = (courseId, subscribedAt) => {
    // Generate format like #123456 using timestamp
    const timestamp = Date.parse(subscribedAt);
    const suffix = timestamp ? timestamp.toString().slice(-6) : '000000';
    return `#${suffix}`;
  };

  const handleCancelSubscription = (courseId) => {
    setShowCancelConfirm(courseId);
  };

  const confirmCancel = () => {
    if (showCancelConfirm) {
      const result = cancelSubscription(showCancelConfirm);
      if (result.success) {
        alert('Subscription cancelled successfully');
        setShowCancelConfirm(null);
      } else {
        alert(result.message || 'Failed to cancel subscription');
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-xl sm:text-2xl" />
            </button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Subscription History</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 py-6 pb-24">
        {courses.length > 0 ? (
          <div className="space-y-4">
            {courses.map((course) => {
              const expired = isExpired(course.subscription.expiryDate);
              const planName = getPlanName(course.subscription.plan);
              const startDate = formatDate(course.subscription.subscribedAt);
              const endDate = formatDate(course.subscription.expiryDate);
              const purchaseDate = formatDateTime(course.subscription.subscribedAt);
              const transactionId = generateTransactionId(course.id, course.subscription.subscribedAt);
              const planPrice = course.plans?.[course.subscription.plan]?.price || 0;

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-xl p-5 sm:p-6 shadow-lg border border-gray-200"
                >
                  {/* Header with Plan Name and Status */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--app-dark-blue)]">
                      {planName}
                    </h3>
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${expired
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-green-100 text-green-700 border border-green-300'
                      }`}>
                      {expired ? 'Expired' : 'Active'}
                    </span>
                  </div>

                  {/* Subscription Details */}
                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="text-gray-600 font-medium">Amount: </span>
                      <span className="text-gray-800 font-bold">
                        ₹{planPrice.toLocaleString('en-IN')}.00
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600 font-medium">Transaction ID: </span>
                      <span className="text-gray-800 font-bold">
                        {transactionId}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600 font-medium">Start Date: </span>
                      <span className="text-gray-800 font-bold">
                        {startDate}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600 font-medium">End Date: </span>
                      <span className={`font-bold ${expired ? 'text-red-600' : 'text-gray-800'
                        }`}>
                        {endDate}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600 font-medium">Purchase Date: </span>
                      <span className="text-gray-800 font-bold">
                        {purchaseDate}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleCancelSubscription(course.id)}
                      className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors shadow-lg"
                    >
                      Cancel Subscription
                    </button>
                    <button
                      onClick={() => navigate(`/course/${course.id}`)}
                      className="flex-1 bg-[var(--app-dark-blue)] text-white font-bold py-3 rounded-xl hover:bg-[var(--app-dark-blue)]/90 transition-colors shadow-lg"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-xl p-12 border border-gray-200">
            <div className="w-20 h-20 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mb-6">
              <FiClock className="text-[var(--app-dark-blue)] text-4xl" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 text-center">
              No Subscriptions Yet
            </h3>
            <p className="text-gray-500 text-center max-w-md mb-6 text-sm sm:text-base">
              You haven't subscribed to any courses yet. Browse our courses and start learning!
            </p>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="bg-[var(--app-dark-blue)] text-white font-bold px-6 py-3 rounded-xl hover:bg-[var(--app-dark-blue)]/90 transition-colors shadow-lg"
            >
              Browse Courses
            </button>
          </div>
        )}

        {/* Cancel Confirmation Dialog */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Cancel Subscription?
              </h3>
              <p className="text-gray-600 mb-6 text-sm">
                Are you sure you want to cancel this subscription? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(null)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                >
                  No, Keep It
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default SubscriptionHistory;
