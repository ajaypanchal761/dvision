import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { studentAPI } from '../services/api';
import { initializeNotifications, savePendingFcmToken, setupForegroundMessageListener } from '../utils/notifications';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const savedToken = localStorage.getItem('dvision_token');
      const savedUser = localStorage.getItem('dvision_user');
      
      // Check if we're in the middle of a payment flow
      // Use localStorage instead of sessionStorage (persists across redirects)
      const paymentInProgress = localStorage.getItem('payment_in_progress');
      const paymentTimestamp = localStorage.getItem('payment_timestamp');
      const isPaymentReturnPage = window.location.pathname.includes('/payment/return');
      
      // Check if payment flag is still valid (not older than 30 minutes)
      const isPaymentFlagValid = paymentInProgress && paymentTimestamp && 
        (Date.now() - parseInt(paymentTimestamp)) < 30 * 60 * 1000;

      if (savedToken && savedUser) {
        try {
          // If payment is in progress or we're on payment return page, be more lenient with auth checks
          if (isPaymentFlagValid || isPaymentReturnPage) {
            console.log('Payment flow detected - using saved user data without verification', {
              paymentInProgress: isPaymentFlagValid,
              isPaymentReturnPage,
              pathname: window.location.pathname
            });
            try {
              const savedUserData = JSON.parse(savedUser);
              setUser(savedUserData);
              // Still try to verify in background, but don't block on errors
              studentAPI.getMe().then(response => {
                if (response.success) {
                  setUser(response.data.student);
                  localStorage.setItem('dvision_user', JSON.stringify(response.data.student));
                }
              }).catch(err => {
                console.warn('Background auth verification failed during payment flow:', err);
                // Don't clear token during payment flow - keep using saved user data
              });
            } catch (parseError) {
              console.error('Error parsing saved user data:', parseError);
            }
            
            // Initialize notifications
            initializeNotifications();
            setupForegroundMessageListener();
            savePendingFcmToken();
            setIsLoading(false);
            return;
          }
          
          // Normal auth verification (only if not in payment flow)
          // Double-check payment flag hasn't been set during async operation
          const paymentCheck = localStorage.getItem('payment_in_progress');
          const paymentTimestampCheck = localStorage.getItem('payment_timestamp');
          const isPaymentFlagStillValid = paymentCheck && paymentTimestampCheck && 
            (Date.now() - parseInt(paymentTimestampCheck)) < 30 * 60 * 1000;
          
          if (isPaymentFlagStillValid) {
            console.log('Payment flow detected during normal auth - skipping verification');
            try {
              const savedUserData = JSON.parse(savedUser);
              setUser(savedUserData);
            } catch (parseError) {
              console.error('Error parsing saved user data:', parseError);
            }
            initializeNotifications();
            setupForegroundMessageListener();
            savePendingFcmToken();
            setIsLoading(false);
            return;
          }
          
          const response = await studentAPI.getMe();
          if (response.success) {
            setUser(response.data.student);

            // Initialize notifications after user is loaded
            initializeNotifications();
            setupForegroundMessageListener();
            savePendingFcmToken();
          } else {
            // Token invalid, clear storage (only if not in payment flow)
            if (!isPaymentFlagStillValid && !isPaymentReturnPage) {
              localStorage.removeItem('dvision_token');
              localStorage.removeItem('dvision_user');
            } else {
              console.log('Skipping token clear - payment flow active');
              try {
                const savedUserData = JSON.parse(savedUser);
                setUser(savedUserData);
              } catch (parseError) {
                console.error('Error parsing saved user data:', parseError);
              }
            }
          }
        } catch (error) {
          console.error('Error loading user:', error);
          // Only clear token if it's an authentication error (401)
          // Don't clear on network errors or other issues
          if (error.status === 401 || error.message?.includes('Unauthorized')) {
            // Don't clear token if payment is in progress
            if (!isPaymentFlagValid && !isPaymentReturnPage) {
              console.log('Clearing token due to 401 error');
              localStorage.removeItem('dvision_token');
              localStorage.removeItem('dvision_user');
            } else {
              console.log('Skipping token clear during payment flow (401 error)');
              // Use saved user data during payment flow
              try {
                const savedUserData = JSON.parse(savedUser);
                setUser(savedUserData);
              } catch (parseError) {
                console.error('Error parsing saved user data:', parseError);
              }
            }
          } else {
            // For network errors, keep the token and use saved user data
            // This prevents clearing auth during temporary network issues
            try {
              const savedUserData = JSON.parse(savedUser);
              setUser(savedUserData);
            } catch (parseError) {
              console.error('Error parsing saved user data:', parseError);
            }
          }
        }
      } else {
        // Initialize notifications even if not logged in (for permission request)
        initializeNotifications();
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  // Send OTP function
  const sendOTP = useCallback(async (phone) => {
    try {
      const response = await studentAPI.sendOTP(phone);
      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, message: error.message || 'Failed to send OTP' };
    }
  }, []);

  // Verify OTP and login/register
  const verifyOTP = useCallback(async (phone, otp) => {
    try {
      const response = await studentAPI.verifyOTP(phone, otp);

      if (response.success) {
        const { student, token, isNewUser } = response.data;

        // Save token and user
        localStorage.setItem('dvision_token', token);
        localStorage.setItem('dvision_user', JSON.stringify(student));
        setUser(student);

        // Initialize notifications after login/registration
        initializeNotifications();
        setupForegroundMessageListener();
        savePendingFcmToken();

        return {
          success: true,
          user: student,
          isNewUser,
          message: isNewUser ? 'Registration successful' : 'Login successful'
        };
      }

      return { success: false, message: 'OTP verification failed' };
    } catch (error) {
      return { success: false, message: error.message || 'OTP verification failed' };
    }
  }, []);

  // Resend OTP
  const resendOTP = useCallback(async (phone) => {
    try {
      const response = await studentAPI.resendOTP(phone);
      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, message: error.message || 'Failed to resend OTP' };
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('dvision_token');
    localStorage.removeItem('dvision_user');
  }, []);

  // Update user function
  const updateUser = useCallback(async (updatedData) => {
    try {
      const response = await studentAPI.updateProfile(updatedData);
      if (response.success) {
        const updatedStudent = response.data.student;
        setUser(updatedStudent);
        localStorage.setItem('dvision_user', JSON.stringify(updatedStudent));
        return { success: true, user: updatedStudent };
      }
      return { success: false, message: 'Failed to update profile' };
    } catch (error) {
      return { success: false, message: error.message || 'Failed to update profile' };
    }
  }, []);

  // Get current user
  const getCurrentUser = useCallback(async () => {
    try {
      const response = await studentAPI.getMe();
      if (response.success) {
        const student = response.data.student;
        setUser(student);
        localStorage.setItem('dvision_user', JSON.stringify(student));
        return { success: true, user: student };
      }
      return { success: false };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, []);

  // Subscribe to course function (placeholder - will be implemented later)
  const subscribeToCourse = useCallback((courseId, plan) => {
    if (!user) return { success: false, message: 'User not logged in' };
    // TODO: Implement subscription API
    return { success: false, message: 'Subscription feature coming soon' };
  }, [user]);

  // Cancel subscription function (placeholder - will be implemented later)
  const cancelSubscription = useCallback((courseId) => {
    if (!user) return { success: false, message: 'User not logged in' };
    // TODO: Implement cancel subscription API
    return { success: false, message: 'Cancel subscription feature coming soon' };
  }, [user]);

  // Check if subscription is expired (for any type)
  // Only return true if subscription was actually active and then expired
  // Don't show modal for new users who never had a subscription
  const isSubscriptionExpired = useMemo(() => {
    if (!user) return false;

    const now = new Date();

    // Check class-based subscriptions
    if (user.classBasedSubscriptions && user.classBasedSubscriptions.length > 0) {
      const hasExpired = user.classBasedSubscriptions.some(sub => {
        if (sub.endDate) {
          return new Date(sub.endDate) < now;
        }
        return sub.status === 'expired';
      });
      if (hasExpired) return true;
    }

    // Check preparation subscriptions
    if (user.preparationSubscriptions && user.preparationSubscriptions.length > 0) {
      const hasExpired = user.preparationSubscriptions.some(sub => {
        if (sub.endDate) {
          return new Date(sub.endDate) < now;
        }
        return sub.status === 'expired';
      });
      if (hasExpired) return true;
    }

    // Check legacy subscription
    if (user.subscription) {
      if (user.subscription.status === 'expired') return true;
      if (user.subscription.status === 'active' && user.subscription.endDate) {
        const endDate = new Date(user.subscription.endDate);
        return now > endDate;
      }
    }

    // Check activeSubscriptions array (fallback)
    if (user.activeSubscriptions && user.activeSubscriptions.length > 0) {
      const hasExpired = user.activeSubscriptions.some(sub => {
        if (sub.endDate) {
          return new Date(sub.endDate) < now;
        }
        return sub.status === 'expired';
      });
      if (hasExpired) return true;
    }

    return false;
  }, [user]);

  // Check if user has active subscription (any type)
  const hasActiveSubscription = useMemo(() => {
    if (!user) return false;

    const now = new Date();

    // Check class-based subscriptions
    if (user.hasActiveClassSubscription) return true;
    if (user.classBasedSubscriptions && user.classBasedSubscriptions.length > 0) {
      const hasActive = user.classBasedSubscriptions.some(sub => {
        if (sub.endDate) {
          return new Date(sub.endDate) > now;
        }
        return sub.status === 'active';
      });
      if (hasActive) return true;
    }

    // Check preparation subscriptions
    if (user.hasActivePreparationSubscription) return true;
    if (user.preparationSubscriptions && user.preparationSubscriptions.length > 0) {
      const hasActive = user.preparationSubscriptions.some(sub => {
        if (sub.endDate) {
          return new Date(sub.endDate) > now;
        }
        return sub.status === 'active';
      });
      if (hasActive) return true;
    }

    // Check activeSubscriptions array (fallback)
    if (user.activeSubscriptions && user.activeSubscriptions.length > 0) {
      const hasActive = user.activeSubscriptions.some(sub => {
        if (sub.endDate) {
          return new Date(sub.endDate) > now;
        }
        return sub.status === 'active';
      });
      if (hasActive) return true;
    }

    // Check legacy subscription
    if (user.subscription && user.subscription.status === 'active') {
      if (user.subscription.endDate) {
        return new Date(user.subscription.endDate) > now;
      }
      return true;
    }

    return false;
  }, [user]);

  // Check if class-based subscription is expired
  const isClassSubscriptionExpired = useMemo(() => {
    if (!user) return false;
    const now = new Date();

    if (user.classBasedSubscriptions && user.classBasedSubscriptions.length > 0) {
      return user.classBasedSubscriptions.every(sub => {
        if (sub.endDate) {
          return new Date(sub.endDate) < now;
        }
        return sub.status === 'expired';
      });
    }

    return false;
  }, [user]);

  // Check if preparation subscription is expired
  const isPreparationSubscriptionExpired = useMemo(() => {
    if (!user) return false;
    const now = new Date();

    if (user.preparationSubscriptions && user.preparationSubscriptions.length > 0) {
      return user.preparationSubscriptions.every(sub => {
        if (sub.endDate) {
          return new Date(sub.endDate) < now;
        }
        return sub.status === 'expired';
      });
    }

    return false;
  }, [user]);

  const value = useMemo(() => ({
    user,
    isLoading,
    sendOTP,
    verifyOTP,
    resendOTP,
    logout,
    updateUser,
    getCurrentUser,
    subscribeToCourse,
    cancelSubscription,
    isAuthenticated: !!user,
    isSubscriptionExpired,
    hasActiveSubscription,
    isClassSubscriptionExpired,
    isPreparationSubscriptionExpired,
    hasActiveClassSubscription: user?.hasActiveClassSubscription || false,
    hasActivePreparationSubscription: user?.hasActivePreparationSubscription || false
  }), [user, isLoading, sendOTP, verifyOTP, resendOTP, logout, updateUser, getCurrentUser, subscribeToCourse, cancelSubscription, isSubscriptionExpired, hasActiveSubscription, isClassSubscriptionExpired, isPreparationSubscriptionExpired]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

