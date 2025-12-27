import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiClock, FiStar } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { subscriptionPlanAPI, paymentAPI, studentAPI } from '../services/api';
import { ROUTES } from '../constants/routes';

/**
 * Subscription Plans Page
 * Shows available subscription plans filtered by student's class and board
 */
const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingPlanId, setProcessingPlanId] = useState(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [selectedDemoPlan, setSelectedDemoPlan] = useState(null);
  const { getCurrentUser } = useAuth();

  // Get user's class and board - ensure they are valid
  const userClass = user?.class;
  const userBoard = user?.board;

  useEffect(() => {
    // Only fetch if user data is available and has class/board
    if (user && userClass && userBoard) {
      fetchPlans();
    } else if (user) {
      // If user is logged in but class/board missing, show error
      setError('Please complete your profile with class and board information');
      setLoading(false);
    }
  }, [user, userClass, userBoard]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate user has class and board
      if (!userClass || !userBoard) {
        setError('Please complete your profile with class and board information');
        setLoading(false);
        return;
      }

      console.log('Fetching subscription plans for:', { board: userBoard, class: userClass });

      const response = await subscriptionPlanAPI.getPlans(userBoard, userClass);

      console.log('Subscription plans response:', response);

      if (response.success && response.data?.subscriptionPlans) {
        const plansData = response.data.subscriptionPlans;
        console.log('Plans fetched successfully:', plansData.length, 'plans');

        // Additional client-side filtering to ensure only matching plans are shown
        const filteredPlans = plansData.filter(plan => {
          if (plan.type === 'regular') {
            // For regular plans, must match board AND class must be in classes array
            return plan.board === userBoard &&
              plan.classes &&
              Array.isArray(plan.classes) &&
              plan.classes.includes(parseInt(userClass));
          } else if (plan.type === 'preparation') {
            // Preparation plans are shown to all students
            return true;
          }
          return false;
        });

        console.log('Filtered plans:', filteredPlans.length, 'plans match student criteria');
        setPlans(filteredPlans);
      } else {
        console.error('Invalid response format:', response);
        setError('Failed to load subscription plans');
      }
    } catch (err) {
      console.error('Error fetching subscription plans:', err);
      setError(err.message || 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getDurationLabel = (duration) => {
    const labels = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      half_yearly: 'Half Yearly',
      yearly: 'Yearly',
      demo: 'Demo'
    };
    return labels[duration] || duration;
  };

  const handleDemoRequestConfirm = async () => {
    if (!selectedDemoPlan) return;

    setProcessingPlanId(selectedDemoPlan._id);
    try {
      await studentAPI.requestDemoPlan(selectedDemoPlan._id, selectedDemoPlan.name);

      // Show success message and close modal
      alert('Your request for the demo plan has been sent successfully! Admin will notify you once activated.');
      setShowDemoModal(false);
      setSelectedDemoPlan(null);
    } catch (err) {
      console.error('Error requesting demo:', err);
      // Basic alert for now, can be improved
      alert(err.message || 'Failed to submit demo request. Please try again.');
    } finally {
      setProcessingPlanId(null);
    }
  };

  const handleSubscribe = async (plan) => {
    console.log('=== SUBSCRIBE BUTTON CLICKED ===');
    console.log('Plan:', plan);
    console.log('User:', user);

    // Handle Demo Plan specific flow
    if (plan.duration === 'demo') {
      setSelectedDemoPlan(plan);
      setShowDemoModal(true);
      return;
    }

    try {
      setProcessingPlanId(plan._id);
      setError('');

      // Check if Cashfree is loaded
      if (!window.Cashfree) {
        console.error('Cashfree script not loaded');
        throw new Error('Payment gateway not available. Please refresh the page.');
      }

      // Check if student already has active subscription that conflicts
      const planType = plan.type || 'regular';
      let hasConflictingSubscription = false;
      let conflictMessage = '';

      if (planType === 'regular') {
        // For regular plans: Check if student has active subscription for their class
        const userBoard = user?.board;
        const userClass = user?.class;

        hasConflictingSubscription = user?.activeSubscriptions?.some(sub => {
          return sub.plan?.type === 'regular' &&
            sub.plan?.board === userBoard &&
            sub.plan?.classes?.includes(parseInt(userClass)) &&
            new Date(sub.endDate) > new Date() &&
            sub.plan?.duration !== 'demo';
        }) || (user?.subscription?.status === 'active' &&
          user?.subscription?.plan?.type === 'regular' &&
          user?.subscription?.plan?.board === userBoard &&
          user?.subscription?.plan?.classes?.includes(parseInt(userClass)) &&
          new Date(user.subscription.endDate) > new Date() &&
          user?.subscription?.plan?.duration !== 'demo');

        if (hasConflictingSubscription) {
          conflictMessage = `You already have an active subscription for ${userBoard} Class ${userClass}. Please wait until your current subscription expires before subscribing to another plan for the same class.`;
        }
      } else if (planType === 'preparation') {
        // For prep plans: Only check if it's the SAME prep class
        const planPrepClassId = plan.classId?._id || plan.classId;

        if (planPrepClassId) {
          hasConflictingSubscription = user?.activeSubscriptions?.some(sub => {
            if (sub.plan?.type !== 'preparation' || !sub.plan?.classId) return false;

            const subPrepClassId = sub.plan.classId._id || sub.plan.classId;
            return subPrepClassId &&
              subPrepClassId.toString() === planPrepClassId.toString() &&
              new Date(sub.endDate) > new Date() &&
              sub.plan?.duration !== 'demo';
          });

          if (hasConflictingSubscription) {
            const prepClassName = plan.classId?.name || 'this preparation class';
            conflictMessage = `You already have an active subscription for ${prepClassName}. Please wait until your current subscription expires before subscribing to another plan for the same preparation class.`;
          }
        }
      }

      if (hasConflictingSubscription) {
        setError(conflictMessage);
        alert(conflictMessage);
        setProcessingPlanId(null);
        return;
      }

      // ===== DOUBLE PAYMENT PREVENTION (Frontend) =====
      // Check if payment is already in progress
      const paymentInProgress = localStorage.getItem('payment_in_progress');
      if (paymentInProgress === 'true') {
        const timeSincePayment = Date.now() - parseInt(localStorage.getItem('payment_timestamp') || 0);
        if (timeSincePayment < 5 * 60 * 1000) { // 5 minutes
          setError('A payment is already in progress. Please complete it or wait a few minutes before trying again.');
          setProcessingPlanId(null);
          alert('A payment is already in progress. Please wait a moment and try again.');
          return;
        } else {
          // Clear old payment flags if older than 5 minutes
          localStorage.removeItem('payment_in_progress');
          localStorage.removeItem('payment_order_id');
          localStorage.removeItem('payment_timestamp');
        }
      }

      console.log('Step 1: Creating Cashfree order for plan:', plan._id);
      // Create Cashfree order
      let orderResponse;
      try {
        orderResponse = await paymentAPI.createOrder(plan._id);
        console.log('Order Response:', orderResponse);
      } catch (apiError) {
        console.error('=== API ERROR DETAILS ===');
        console.error('API Error:', apiError);
        console.error('Error Status:', apiError.status);
        console.error('Error Message:', apiError.message);
        console.error('Error Data:', apiError.data);

        // Handle double payment prevention error (429 Too Many Requests)
        if (apiError.status === 429) {
          const errorMessage = 'You already have a pending payment for this plan. Please wait a moment before trying again.';
          setError(errorMessage);
          setProcessingPlanId(null);
          alert(errorMessage);
          return;
        }

        // Don't clear token or redirect on payment errors - just show error
        // Only throw error to show to user, don't let it propagate to cause auth issues
        const errorMessage = apiError.message || 'Failed to create payment order. Please try again.';
        setError(errorMessage);
        setProcessingPlanId(null);
        alert(errorMessage);
        return; // Exit early, don't continue with payment flow
      }

      if (!orderResponse) {
        console.error('No response received from API');
        throw new Error('No response from server. Please try again.');
      }

      if (!orderResponse.success) {
        console.error('Order creation failed:', orderResponse);
        throw new Error(orderResponse.message || 'Failed to create payment order');
      }

      if (!orderResponse.data) {
        console.error('Order response data missing:', orderResponse);
        throw new Error('Invalid response from server');
      }

      const { orderId, paymentSessionId, amount, currency, clientId, environment } = orderResponse.data;

      if (!orderId || !paymentSessionId || !amount || !clientId) {
        console.error('Missing required payment data:', { orderId, paymentSessionId, amount, clientId });
        throw new Error('Invalid payment data received');
      }

      console.log('Step 2: Checking Cashfree SDK availability...');

      // Check if Cashfree SDK is loaded (check both lowercase and uppercase like vintagebeauty)
      if (!window.Cashfree && !window.cashfree) {
        const errorMsg = 'Cashfree payment gateway is not available. Please refresh the page and try again.';
        console.error(errorMsg);
        setError(errorMsg);
        setProcessingPlanId(null);
        alert(errorMsg);
        return;
      }

      console.log('Step 3: Initializing Cashfree checkout...', { orderId, paymentSessionId, amount, currency, clientId });

      // Store payment flag BEFORE initializing checkout (like vintagebeauty)
      localStorage.setItem('payment_in_progress', 'true');
      localStorage.setItem('payment_order_id', orderId);
      localStorage.setItem('payment_timestamp', Date.now().toString());
      console.log('Payment flags set in localStorage');

      try {
        const CashfreeSDK = window.Cashfree || window.cashfree;

        const cashfree = new CashfreeSDK({
          mode: "production"
        });

        const checkoutOptions = {
          paymentSessionId: paymentSessionId,
          redirectTarget: "_self"
        };

        cashfree.checkout(checkoutOptions)
          .then((result) => {
            if (result.error) {
              localStorage.removeItem("payment_in_progress");
              localStorage.removeItem("payment_order_id");
              localStorage.removeItem("payment_timestamp");
              alert(result.error.message || "Payment failed");
              setProcessingPlanId(null);
              return;
            }

            setProcessingPlanId(null);
          })
          .catch((err) => {
            localStorage.removeItem("payment_in_progress");
            localStorage.removeItem("payment_order_id");
            localStorage.removeItem("payment_timestamp");
            alert(err.message || "Payment failed");
            setProcessingPlanId(null);
          });
      } catch (error) {
        console.error('Error initializing Cashfree checkout:', error);
        // Clear payment flag on error
        localStorage.removeItem('payment_in_progress');
        localStorage.removeItem('payment_order_id');
        localStorage.removeItem('payment_timestamp');
        setError(error.message || 'Failed to initialize payment gateway');
        setProcessingPlanId(null);
        alert(error.message || 'Failed to initialize payment gateway. Please try again.');
      }
    } catch (error) {
      console.error('=== PAYMENT ERROR ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      setError(error.message || 'Failed to initiate payment');
      setProcessingPlanId(null);
      alert(error.message || 'Failed to initiate payment. Please try again.');
    }
  };

  // Group plans by type and duration
  // For regular: group by duration
  // For prep: group by prep class and duration
  const groupedPlans = plans.reduce((acc, plan) => {
    const planType = plan.type || 'regular';
    let key;

    if (planType === 'regular') {
      key = `${planType}_${plan.duration}`;
    } else {
      // For prep plans, group by prep class ID and duration
      const prepClassId = plan.classId?._id || plan.classId || 'unknown';
      key = `${planType}_${prepClassId}_${plan.duration}`;
    }

    if (!acc[key]) {
      acc[key] = {
        type: planType,
        duration: plan.duration,
        prepClassName: planType === 'preparation' ? (plan.classId?.name || 'Preparation Class') : null,
        prepClassId: planType === 'preparation' ? (plan.classId?._id || plan.classId) : null,
        plans: []
      };
    }
    acc[key].plans.push(plan);
    return acc;
  }, {});

  // Sort groups: Regular first, then Preparation, then by duration
  const sortedGroups = Object.values(groupedPlans).sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'regular' ? -1 : 1;
    }
    const durationOrder = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'demo'];
    return durationOrder.indexOf(a.duration) - durationOrder.indexOf(b.duration);
  });

  return (
    <div className="min-h-screen w-full bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
                Subscription Plans
              </h1>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5">
                {userBoard && userClass ? `${userBoard} - Class ${userClass} & Preparation Classes` : 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-5 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--app-orange)] mb-3"></div>
            <p className="text-[var(--app-black)]/70 text-sm">Loading subscription plans...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-red-200 text-center">
            <p className="text-red-600 mb-4 text-sm sm:text-base">{error}</p>
            <button
              onClick={fetchPlans}
              className="bg-gradient-to-r from-[var(--app-dark-blue)] to-[var(--app-dark-blue)]/90 text-white font-bold px-6 py-2.5 rounded-xl hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 text-sm"
            >
              Retry
            </button>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-200">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mb-4">
              <FiClock className="text-[var(--app-dark-blue)] text-2xl sm:text-3xl" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[var(--app-black)] mb-2">
              No Plans Available
            </h3>
            <p className="text-[var(--app-black)]/70 text-center max-w-md text-xs sm:text-sm">
              No subscription plans are currently available for {userBoard} Class {userClass} or preparation classes.
            </p>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {sortedGroups.map((group) => {
              if (group.plans.length === 0) return null;

              const isPreparation = group.type === 'preparation';
              const groupTitle = isPreparation
                ? `${group.prepClassName || 'Preparation Class'} - ${getDurationLabel(group.duration)}`
                : `${getDurationLabel(group.duration)} Plans`;

              return (
                <div key={`${group.type}_${group.prepClassId || 'regular'}_${group.duration}`} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {group.plans.map((plan) => {
                      const hasDiscount = plan.originalPrice && plan.originalPrice > plan.price;
                      const discountPercent = hasDiscount
                        ? Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)
                        : 0;
                      const planType = plan.type || 'regular';
                      const isPrep = planType === 'preparation';

                      // Check if plan is disabled (from backend or client-side check)
                      const isPlanDisabled = plan.isDisabled || false;

                      // For regular plans: Check if student has active subscription for their class
                      let hasActiveSubscriptionForPlan = false;
                      let existingSubscription = null;

                      if (planType === 'regular') {
                        // Check if student has active regular subscription for their class
                        // exclude DEMO plans from blocking new subscriptions
                        hasActiveSubscriptionForPlan = user?.activeSubscriptions?.some(sub => {
                          return sub.plan?.type === 'regular' &&
                            sub.plan?.board === userBoard &&
                            sub.plan?.classes?.includes(parseInt(userClass)) &&
                            new Date(sub.endDate) > new Date() &&
                            sub.plan?.duration !== 'demo';
                        }) || (user?.subscription?.status === 'active' &&
                          user?.subscription?.plan?.type === 'regular' &&
                          user?.subscription?.plan?.board === userBoard &&
                          user?.subscription?.plan?.classes?.includes(parseInt(userClass)) &&
                          new Date(user.subscription.endDate) > new Date() &&
                          user?.subscription?.plan?.duration !== 'demo');

                        existingSubscription = user?.activeSubscriptions?.find(sub => {
                          return sub.plan?.type === 'regular' &&
                            sub.plan?.board === userBoard &&
                            sub.plan?.classes?.includes(parseInt(userClass)) &&
                            new Date(sub.endDate) > new Date() &&
                            sub.plan?.duration !== 'demo';
                        }) || (user?.subscription?.status === 'active' &&
                          user?.subscription?.plan?.type === 'regular' &&
                          user?.subscription?.plan?.board === userBoard &&
                          user?.subscription?.plan?.classes?.includes(parseInt(userClass)) &&
                          new Date(user.subscription.endDate) > new Date() &&
                          user?.subscription?.plan?.duration !== 'demo' ? user.subscription : null);
                      } else if (planType === 'preparation') {
                        // For prep plans: Check if student has active subscription for this specific prep class
                        const prepClassId = plan.classId?._id || plan.classId;
                        hasActiveSubscriptionForPlan = user?.activeSubscriptions?.some(sub => {
                          return sub.plan?.type === 'preparation' &&
                            sub.plan?.classId &&
                            (sub.plan.classId._id?.toString() === prepClassId?.toString() ||
                              sub.plan.classId.toString() === prepClassId?.toString()) &&
                            new Date(sub.endDate) > new Date() &&
                            sub.plan?.duration !== 'demo';
                        });

                        existingSubscription = user?.activeSubscriptions?.find(sub => {
                          return sub.plan?.type === 'preparation' &&
                            sub.plan?.classId &&
                            (sub.plan.classId._id?.toString() === prepClassId?.toString() ||
                              sub.plan.classId.toString() === prepClassId?.toString()) &&
                            new Date(sub.endDate) > new Date() &&
                            sub.plan?.duration !== 'demo';
                        });
                      }

                      const isDisabled = isPlanDisabled || hasActiveSubscriptionForPlan;

                      return (
                        <div
                          key={plan._id}
                          className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-md transition-all duration-300 border relative ${isDisabled
                            ? 'opacity-60 border-gray-300 cursor-not-allowed'
                            : 'hover:shadow-lg hover:border-[var(--app-dark-blue)]/30 border-gray-200'
                            }`}
                        >
                          {/* Discount Badge - Top Right */}
                          {hasDiscount && !isDisabled && (
                            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-md z-10">
                              {discountPercent}% OFF
                            </div>
                          )}

                          {/* Subscribed/Disabled Badge - Top Right */}
                          {isDisabled && (
                            <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-md z-10 flex items-center gap-1">
                              <FiCheck className="text-xs" />
                              {hasActiveSubscriptionForPlan ? 'Already Subscribed' : 'Disabled'}
                            </div>
                          )}

                          {/* Plan Title */}
                          <div className="mb-3">
                            <h3 className="text-base sm:text-lg font-bold text-[var(--app-black)] mb-1">
                              {plan.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-[var(--app-black)]/60">
                              {isPrep
                                ? (plan.classId?.name || 'Preparation Class')
                                : `${userBoard || plan.board} • Class ${userClass || plan.classes?.join(', ')}`
                              }
                            </p>
                          </div>

                          {/* Price Section */}
                          <div className="mb-4">
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span className="text-2xl sm:text-3xl font-bold text-[var(--app-dark-blue)]">
                                {formatCurrency(plan.price)}
                              </span>
                              {hasDiscount && (
                                <span className="text-sm sm:text-base text-gray-400 line-through">
                                  {formatCurrency(plan.originalPrice)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--app-black)]/60">
                              per {
                                group.duration === 'monthly' ? 'month' :
                                  group.duration === 'quarterly' ? '3 months' :
                                    group.duration === 'half_yearly' ? '6 months' :
                                      group.duration === 'demo' ? `${plan.validityDays || 7} days` :
                                        'year'
                              }
                            </p>
                          </div>

                          {/* Subscribe Button */}
                          {isDisabled ? (
                            <div className="w-full">
                              <button
                                disabled
                                className="w-full bg-gray-300 text-white font-bold py-2.5 rounded-lg cursor-not-allowed text-sm"
                              >
                                {hasActiveSubscriptionForPlan ? 'Already Subscribed' : 'Not Available'}
                              </button>
                              {existingSubscription && (
                                <p className="text-xs text-[var(--app-black)]/70 mt-1.5 text-center">
                                  Expires on{' '}
                                  <span className="font-semibold text-[var(--app-dark-blue)]">
                                    {new Date(existingSubscription.endDate || existingSubscription.plan?.endDate || user.subscription.endDate).toLocaleDateString('en-IN', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </p>
                              )}
                              {plan.disabledReason && !hasActiveSubscriptionForPlan && (
                                <p className="text-xs text-red-600 mt-1.5 text-center">
                                  {plan.disabledReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Button clicked for plan:', plan._id);
                                handleSubscribe(plan);
                              }}
                              disabled={processingPlanId === plan._id || isDisabled}
                              className={`w-full font-bold py-2.5 rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm ${plan.duration === 'demo' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gradient-to-r from-[var(--app-dark-blue)] to-[var(--app-teal)] text-white'}`}
                            >
                              {processingPlanId === plan._id ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  {plan.duration === 'demo' ? 'Request Demo Plan' : 'Subscribe Now'}
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Demo Request Modal */}
        {showDemoModal && selectedDemoPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-scale-in relative border border-gray-100">
              <button
                onClick={() => setShowDemoModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                  <div className="absolute inset-0 bg-orange-200 rounded-full animate-ping opacity-20"></div>
                  <FiStar className="text-orange-600 text-3xl relative z-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Request Demo Access</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Get full access to all features for <span className="font-bold text-orange-600">{selectedDemoPlan.validityDays || 7} days</span> absolutely free!
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  How to get started:
                </h4>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                    <span>Click the <span className="font-semibold">Request Access</span> button below</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                    <span>Admin will review and approve your request</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                    <span>You'll get notified once activated!</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleDemoRequestConfirm}
                  disabled={processingPlanId === selectedDemoPlan._id}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-orange-500/30 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm sm:text-base group"
                >
                  {processingPlanId === selectedDemoPlan._id ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending Request...
                    </>
                  ) : (
                    <>
                      Request Access Now
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDemoModal(false)}
                  disabled={processingPlanId === selectedDemoPlan._id}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        {plans.length > 0 && (
          <div className="mt-5 sm:mt-6 bg-gradient-to-r from-[var(--app-dark-blue)]/5 via-[var(--app-teal)]/5 to-[var(--app-dark-blue)]/5 rounded-xl sm:rounded-2xl p-4 sm:p-5 border-2 border-[var(--app-dark-blue)]/10 shadow-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[var(--app-dark-blue)] to-[var(--app-teal)] rounded-lg flex items-center justify-center shadow-md">
                <FiStar className="text-white text-lg sm:text-xl" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-base sm:text-lg text-[var(--app-black)] mb-1.5">
                  Why Subscribe?
                </h4>
                <p className="text-xs sm:text-sm text-[var(--app-black)]/70 leading-relaxed">
                  Get access to all courses, live classes, recorded sessions, and exclusive content for your class, board, and preparation classes.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SubscriptionPlans;

