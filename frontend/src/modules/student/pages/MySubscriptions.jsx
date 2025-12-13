import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiCheck, FiCreditCard } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import BottomNav from '../components/common/BottomNav';

/**
 * My Subscriptions Page
 * Shows all active subscriptions for the student
 */
const MySubscriptions = () => {
  const navigate = useNavigate();
  const { user, getCurrentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        await getCurrentUser();
      } catch (error) {
        console.error('Error loading subscriptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptions();
  }, [getCurrentUser]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Use separate subscriptions from backend if available, otherwise combine
  const classBasedSubscriptions = user?.classBasedSubscriptions || [];
  const preparationSubscriptions = user?.preparationSubscriptions || [];
  
  // Fallback: Combine activeSubscriptions and legacy subscription if separate not available
  const allSubscriptions = [];
  
  if (classBasedSubscriptions.length > 0 || preparationSubscriptions.length > 0) {
    // Use separate subscriptions from backend
    allSubscriptions.push(...classBasedSubscriptions, ...preparationSubscriptions);
  } else {
    // Fallback to old method
    if (user?.activeSubscriptions && user.activeSubscriptions.length > 0) {
      allSubscriptions.push(...user.activeSubscriptions.map(sub => ({
        ...sub,
        source: 'activeSubscriptions'
      })));
    }
    
    if (user?.subscription && user.subscription.status === 'active' && user.subscription.plan) {
      const exists = allSubscriptions.some(sub => 
        sub.plan?._id === user.subscription.plan?._id
      );
      if (!exists) {
        allSubscriptions.push({
          _id: user.subscription.plan?._id || 'legacy',
          plan: user.subscription.plan,
          startDate: user.subscription.startDate,
          endDate: user.subscription.endDate,
          amount: user.subscription.plan?.price || 0,
          status: 'active',
          source: 'legacy'
        });
      }
    }
  }
  
  // Separate by type for display
  const classSubs = allSubscriptions.filter(sub => sub.plan?.type === 'regular');
  const prepSubs = allSubscriptions.filter(sub => sub.plan?.type === 'preparation');

  const isExpiringSoon = (endDate) => {
    if (!endDate) return false;
    const daysRemaining = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysRemaining <= 7 && daysRemaining > 0;
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return 0;
    return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen w-full bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(ROUTES.PROFILE)}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
                My Subscriptions
              </h1>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5">
                View and manage your active subscriptions
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--app-dark-blue)] mb-3"></div>
            <p className="text-[var(--app-black)]/70 text-sm">Loading subscriptions...</p>
          </div>
        ) : allSubscriptions.length > 0 ? (
          <div className="space-y-5 sm:space-y-6">
            {/* Class-Based Subscriptions Section */}
            {classSubs.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-lg sm:text-xl font-bold text-[var(--app-black)] mb-3">
                  Class-Based Subscriptions
                </h2>
                {classSubs.map((subscription) => {
              const plan = subscription.plan;
              const isPreparation = plan?.type === 'preparation';
              const daysRemaining = getDaysRemaining(subscription.endDate);
              const expiringSoon = isExpiringSoon(subscription.endDate);

              return (
                <div
                  key={subscription._id}
                  className="bg-white rounded-xl p-4 sm:p-5 shadow-md border border-gray-200 hover:shadow-lg transition-all"
                >
                  {/* Header with Plan Name and Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-base sm:text-lg font-bold text-[var(--app-black)]">
                          {plan?.name || 'Subscription Plan'}
                        </h3>
                        {isPreparation && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                            Prep
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-[var(--app-black)]/70">
                        {isPreparation 
                          ? (plan?.classId?.name || 'Preparation Class')
                          : `${plan?.board} • Classes ${plan?.classes?.join(', ') || ''}`
                        }
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg whitespace-nowrap">
                      Active
                    </span>
                  </div>

                  {/* Subscription Details */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-[var(--app-black)]/70 flex items-center gap-1.5">
                        <FiClock className="text-[var(--app-dark-blue)] text-sm" />
                        <span>Expires:</span>
                      </span>
                      <span className={`font-semibold ${expiringSoon ? 'text-[var(--app-orange)]' : 'text-[var(--app-black)]'}`}>
                        {subscription.endDate ? formatDate(subscription.endDate) : 'N/A'}
                      </span>
                    </div>
                    
                    {daysRemaining > 0 && (
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-[var(--app-black)]/70">Days Remaining:</span>
                        <span className={`font-semibold ${expiringSoon ? 'text-[var(--app-orange)]' : 'text-[var(--app-black)]'}`}>
                          {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    )}

                    {subscription.startDate && (
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-[var(--app-black)]/70">Start Date:</span>
                        <span className="font-semibold text-[var(--app-black)]">
                          {formatDate(subscription.startDate)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-[var(--app-black)]/70">Amount Paid:</span>
                      <span className="font-semibold text-[var(--app-black)]">
                        {formatCurrency(subscription.amount || plan?.price || 0)}
                      </span>
                    </div>

                    {plan?.duration && (
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-[var(--app-black)]/70">Duration:</span>
                        <span className="font-semibold text-[var(--app-black)] capitalize">
                          {plan.duration}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  {plan?.features && plan.features.length > 0 && (
                    <div className="pt-3 border-t border-gray-200">
                      <h4 className="text-xs sm:text-sm font-semibold text-[var(--app-black)] mb-1.5">
                        Features:
                      </h4>
                      <div className="space-y-1">
                        {plan.features.slice(0, 5).map((feature, index) => (
                          <div key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                            <FiCheck className="text-[var(--app-dark-blue)] text-sm mt-0.5 flex-shrink-0" />
                            <span className="text-[var(--app-black)]/70">{feature}</span>
                          </div>
                        ))}
                        {plan.features.length > 5 && (
                          <p className="text-xs text-[var(--app-black)]/50 pl-5">
                            +{plan.features.length - 5} more features
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Warning if expiring soon */}
                  {expiringSoon && (
                    <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs sm:text-sm text-amber-700 font-medium">
                        ⚠️ Your subscription is expiring soon. Renew to continue access.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
              </div>
            )}

            {/* Preparation Subscriptions Section */}
            {prepSubs.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-lg sm:text-xl font-bold text-[var(--app-black)] mb-3">
                  Preparation Class Subscriptions
                </h2>
                {prepSubs.map((subscription) => {
                  const plan = subscription.plan;
                  const isPreparation = plan?.type === 'preparation';
                  const daysRemaining = getDaysRemaining(subscription.endDate);
                  const expiringSoon = isExpiringSoon(subscription.endDate);

                  return (
                    <div
                      key={subscription._id}
                      className="bg-white rounded-xl p-4 sm:p-5 shadow-md border border-gray-200 hover:shadow-lg transition-all"
                    >
                      {/* Header with Plan Name and Status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-base sm:text-lg font-bold text-[var(--app-black)]">
                              {plan?.name || 'Subscription Plan'}
                            </h3>
                            {isPreparation && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                                Prep
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-[var(--app-black)]/70">
                            {isPreparation 
                              ? (plan?.classId?.name || 'Preparation Class')
                              : `${plan?.board} • Classes ${plan?.classes?.join(', ') || ''}`
                            }
                          </p>
                        </div>
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg whitespace-nowrap">
                          Active
                        </span>
                      </div>

                      {/* Subscription Details */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-[var(--app-black)]/70 flex items-center gap-1.5">
                            <FiClock className="text-[var(--app-dark-blue)] text-sm" />
                            <span>Expires:</span>
                          </span>
                          <span className={`font-semibold ${expiringSoon ? 'text-[var(--app-orange)]' : 'text-[var(--app-black)]'}`}>
                            {subscription.endDate ? formatDate(subscription.endDate) : 'N/A'}
                          </span>
                        </div>
                        
                        {daysRemaining > 0 && (
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-[var(--app-black)]/70">Days Remaining:</span>
                            <span className={`font-semibold ${expiringSoon ? 'text-[var(--app-orange)]' : 'text-[var(--app-black)]'}`}>
                              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        )}

                        {subscription.startDate && (
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-[var(--app-black)]/70">Start Date:</span>
                            <span className="font-semibold text-[var(--app-black)]">
                              {formatDate(subscription.startDate)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-[var(--app-black)]/70">Amount Paid:</span>
                          <span className="font-semibold text-[var(--app-black)]">
                            {formatCurrency(subscription.amount || plan?.price || 0)}
                          </span>
                        </div>

                        {plan?.duration && (
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-[var(--app-black)]/70">Duration:</span>
                            <span className="font-semibold text-[var(--app-black)] capitalize">
                              {plan.duration}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      {plan?.features && plan.features.length > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <h4 className="text-xs sm:text-sm font-semibold text-[var(--app-black)] mb-1.5">
                            Features:
                          </h4>
                          <div className="space-y-1">
                            {plan.features.slice(0, 5).map((feature, index) => (
                              <div key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                                <FiCheck className="text-[var(--app-dark-blue)] text-sm mt-0.5 flex-shrink-0" />
                                <span className="text-[var(--app-black)]/70">{feature}</span>
                              </div>
                            ))}
                            {plan.features.length > 5 && (
                              <p className="text-xs text-[var(--app-black)]/50 pl-5">
                                +{plan.features.length - 5} more features
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Warning if expiring soon */}
                      {expiringSoon && (
                        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs sm:text-sm text-amber-700 font-medium">
                            ⚠️ Your subscription is expiring soon. Renew to continue access.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-200">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mb-4">
              <FiCreditCard className="text-[var(--app-dark-blue)] text-2xl sm:text-3xl" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[var(--app-black)] mb-2">
              No Active Subscriptions
            </h3>
            <p className="text-[var(--app-black)]/70 text-center max-w-md mb-5 text-xs sm:text-sm">
              You don't have any active subscriptions. Browse our subscription plans and start learning!
            </p>
            <button
              onClick={() => navigate(ROUTES.SUBSCRIPTION_PLANS)}
              className="bg-gradient-to-r from-[var(--app-dark-blue)] to-[var(--app-teal)] text-white font-semibold px-5 py-2.5 rounded-xl hover:shadow-lg transition-all text-sm"
            >
              View Subscription Plans
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default MySubscriptions;

