import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiCreditCard } from 'react-icons/fi';
import { ROUTES } from '../../constants/routes';

/**
 * Subscription Expiry Modal
 * Shows when student's subscription has expired
 * Handles both class-based and preparation subscriptions separately
 */
const SubscriptionExpiryModal = ({ isOpen, expiredType = 'both' }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubscribe = () => {
    navigate(ROUTES.SUBSCRIPTION_PLANS);
  };

  const getMessage = () => {
    if (expiredType === 'class') {
      return 'Your class-based subscription has expired. Please purchase a new subscription plan to continue accessing class content.';
    } else if (expiredType === 'preparation') {
      return 'Your preparation class subscription has expired. Please purchase a new subscription plan to continue accessing preparation content.';
    } else {
      return 'Your subscription has expired. Please purchase a new subscription plan to continue accessing all features.';
    }
  };

  const getTitle = () => {
    if (expiredType === 'class') {
      return 'Class Subscription Expired';
    } else if (expiredType === 'preparation') {
      return 'Preparation Subscription Expired';
    } else {
      return 'Subscription Expired';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-[var(--app-white)] rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
        <div className="p-6 sm:p-8">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-[var(--app-orange)]/10 rounded-full mb-4 sm:mb-6">
            <FiAlertCircle className="text-[var(--app-orange)] text-3xl sm:text-4xl" />
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--app-black)] text-center mb-3 sm:mb-4">
            {getTitle()}
          </h2>

          {/* Message */}
          <p className="text-sm sm:text-base text-[var(--app-black)]/70 text-center mb-6 sm:mb-8">
            {getMessage()}
          </p>

          {/* Button */}
          <button
            onClick={handleSubscribe}
            className="w-full bg-[var(--app-orange)] text-[var(--app-white)] font-semibold py-3 sm:py-3.5 rounded-xl hover:bg-[var(--app-orange)]/90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <FiCreditCard className="text-lg" />
            <span>View Subscription Plans</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionExpiryModal;

