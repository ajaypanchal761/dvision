import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';
import SubscriptionExpiryModal from './SubscriptionExpiryModal';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * Redirects to subscription plans if user doesn't have active subscription (except on allowed pages)
 * Shows subscription expiry modal if subscription is expired (except on subscription plans page)
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, isSubscriptionExpired, hasActiveSubscription } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--app-teal)] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Pages that don't require subscription (always accessible)
  const allowedPagesWithoutSubscription = [
    ROUTES.DASHBOARD,
    ROUTES.SUBSCRIPTION_PLANS,
    ROUTES.PROFILE,
    '/personal-information',
    '/change-password',
    '/edit-profile',
    ROUTES.NOTIFICATIONS,
    '/refer-and-earn',
    '/delete-account',
    ROUTES.ABOUT_US,
    '/privacy-policy',
    '/terms-and-conditions',
    '/contact-us',
    '/my-subscriptions',
    '/subscription-history'
  ];

  // Check if current path is an allowed page (handles both exact matches and dynamic routes)
  const isOnAllowedPage = allowedPagesWithoutSubscription.some(page => {
    if (location.pathname === page) return true;
    // For dynamic routes, check if path starts with the base path
    if (page.includes(':')) {
      const basePath = page.split(':')[0].replace(/\/$/, '');
      return location.pathname.startsWith(basePath);
    }
    return location.pathname.startsWith(page + '/') || location.pathname.startsWith(page);
  });

  // If user doesn't have active subscription and is trying to access a protected page
  if (!hasActiveSubscription && !isOnAllowedPage) {
    return <Navigate to={ROUTES.SUBSCRIPTION_PLANS} replace />;
  }

  // Check if subscription is expired and user is not on subscription plans page
  const isOnSubscriptionPlansPage = location.pathname === ROUTES.SUBSCRIPTION_PLANS;
  const showExpiryModal = isSubscriptionExpired && !isOnSubscriptionPlansPage;

  // If subscription expired and not on subscription plans page, block navigation
  if (showExpiryModal) {
    return (
      <>
        <SubscriptionExpiryModal isOpen={true} />
        {/* Render children but they won't be accessible due to modal overlay */}
        <div style={{ pointerEvents: 'none', opacity: 0.3 }}>
          {children}
        </div>
      </>
    );
  }

  return children;
};

export default ProtectedRoute;
